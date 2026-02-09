const std = @import("std");
const math = @import("math_utils.zig");
const plosive = @import("plosiveguard.zig");
const voice_isolate = @import("voice_isolate.zig");
const debleed = @import("debleed.zig");
const echovanish = @import("echovanish.zig");

// Force inclusion of modules that export their own functions
comptime {
    _ = @import("spectralmatch.zig");
    _ = @import("smart_level.zig");
    _ = @import("tape_stabilizer.zig");
}

var gpa = std.heap.GeneralPurposeAllocator(.{}){};
const allocator = gpa.allocator();

export fn alloc(len: usize) ?[*]f32 {
    const slice = allocator.alloc(f32, len) catch return null;
    return slice.ptr;
}

export fn free(ptr: [*]f32, len: usize) void {
    const slice = ptr[0..len];
    allocator.free(slice);
}

// --- 1. Loudness Normalization (EBU R128 Style approximation) ---

fn apply_filter(input: []f32, output: []f32) void {
    var x1: f32 = 0;
    var y1: f32 = 0;
    const a1 = -0.995;
    const b0 = 0.9975;
    const b1 = -0.9975;

    for (input, 0..) |sample, i| {
        output[i] = b0 * sample + b1 * x1 - a1 * y1;
        x1 = sample;
        y1 = output[i];
    }
}

export fn process_lufs_normalize(ptr: [*]f32, len: usize, target_lufs: f32) void {
    const data = ptr[0..len];
    const filtered = allocator.alloc(f32, len) catch return;
    defer allocator.free(filtered);

    apply_filter(data, filtered);

    var sum_sq: f32 = 0;
    const vec_len = 4;
    var i: usize = 0;
    const loop_len = len - (len % vec_len);
    
    while (i < loop_len) : (i += vec_len) {
        const v: @Vector(vec_len, f32) = data[i..][0..vec_len].*;
        const v_sq = v * v;
        sum_sq += @reduce(.Add, v_sq);
    }
    while (i < len) : (i += 1) {
        sum_sq += filtered[i] * filtered[i];
    }

    const mean_sq = sum_sq / @as(f32, @floatFromInt(len));
    const rms_db = math.linearToDb(std.math.sqrt(mean_sq));
    const current_lufs = rms_db - 0.691;
    const delta_db = target_lufs - current_lufs;
    const linear_gain = math.dbToLinear(delta_db);

    i = 0;
    while (i < loop_len) : (i += vec_len) {
        var v: @Vector(vec_len, f32) = data[i..][0..vec_len].*;
        const gain_vec: @Vector(vec_len, f32) = @splat(linear_gain);
        v = v * gain_vec;
        data[i..][0..vec_len].* = v;
    }
    while (i < len) : (i += 1) {
        data[i] *= linear_gain;
    }
}

// --- 2. Phase Rotation (All-pass chain) ---

const AllPass = struct {
    x1: f32 = 0,
    y1: f32 = 0,
    c: f32,

    fn process(self: *AllPass, input: f32) f32 {
        const output = self.c * input + self.x1 - self.c * self.y1;
        self.x1 = input;
        self.y1 = output;
        return output;
    }
};

export fn process_phase_rotation(ptr: [*]f32, len: usize) void {
    const data = ptr[0..len];
    var filters = [_]AllPass{
        .{ .c = 0.4 },
        .{ .c = -0.4 },
        .{ .c = 0.6 },
        .{ .c = -0.6 },
    };

    for (data) |*sample| {
        var s = sample.*;
        for (&filters) |*f| {
            s = f.process(s);
        }
        sample.* = s;
    }
}

// --- 3. De-Clipper ---

export fn process_declip(ptr: [*]f32, len: usize, threshold: f32) void {
    const data = ptr[0..len];
    var i: usize = 0;
    while (i < len) {
        if (@abs(data[i]) >= threshold) {
            const start = i;
            var end = i;
            while (end < len and @abs(data[end]) >= threshold) : (end += 1) {}
            if (end - start >= 3) {
                if (start >= 2 and end + 2 < len) {
                    const p0 = data[start - 2];
                    const p1 = data[start - 1];
                    const p2 = data[end];
                    const p3 = data[end + 1];
                    const range = @as(f32, @floatFromInt(end - start + 1));
                    var j: usize = 0;
                    while (j < (end - start)) : (j += 1) {
                        const t = @as(f32, @floatFromInt(j + 1)) / range;
                        data[start + j] = math.cubicHermite(p0, p1, p2, p3, t);
                    }
                }
            }
            i = end;
        } else {
            i += 1;
        }
    }
}

// --- 4. Adaptive Spectral Denoise ---

export fn process_spectral_denoise(ptr: [*]f32, len: usize, noise_ptr: [*]f32, noise_len: usize) void {
    const data = ptr[0..len];
    const window_size = 2048;
    const hop_size = window_size / 2;
    
    // Allocate buffers
    const fft_buf = allocator.alloc(math.Complex, window_size) catch return;
    defer allocator.free(fft_buf);
    
    const noise_profile = allocator.alloc(f32, window_size / 2) catch return;
    defer allocator.free(noise_profile);
    @memset(noise_profile, 0);

    const window = allocator.alloc(f32, window_size) catch return;
    defer allocator.free(window);
    // Hanning Window
    for (window, 0..) |_, idx| {
        window[idx] = 0.5 * (1.0 - std.math.cos(math.TWO_PI * @as(f32, @floatFromInt(idx)) / @as(f32, @floatFromInt(window_size - 1))));
    }

    // 1. Build Noise Profile
    var profile_ready: bool = false;

    if (noise_len > 0 and noise_ptr != ptr) { // Explicit profile provided
        const noise_data = noise_ptr[0..noise_len];
        var pos: usize = 0;
        var frames_counted: usize = 0;

        while (pos + window_size < noise_len) : (pos += hop_size) {
             for (0..window_size) |k| {
                fft_buf[k] = .{ .re = noise_data[pos + k] * window[k], .im = 0 };
            }
            math.fft_iterative(fft_buf, false);
            
            for (0..window_size/2) |k| {
                noise_profile[k] += fft_buf[k].magnitude();
            }
            frames_counted += 1;
        }

        if (frames_counted > 0) {
            for (0..window_size/2) |k| {
                noise_profile[k] /= @as(f32, @floatFromInt(frames_counted));
            }
            profile_ready = true;
        }
    }

    // 2. Process Audio
    const output_buf = allocator.alloc(f32, len) catch return;
    defer allocator.free(output_buf);
    @memset(output_buf, 0);

    const noise_frames_auto = 5;
    var frames_processed: usize = 0;
    
    var pos: usize = 0;
    while (pos + window_size < len) : (pos += hop_size) {
        for (0..window_size) |k| {
            fft_buf[k] = .{ .re = data[pos + k] * window[k], .im = 0 };
        }
        math.fft_iterative(fft_buf, false);

        // Auto-learn if no profile provided
        if (!profile_ready and frames_processed < noise_frames_auto) {
            for (0..window_size/2) |k| {
                noise_profile[k] += fft_buf[k].magnitude();
            }
            if (frames_processed == noise_frames_auto - 1) {
                for (0..window_size/2) |k| {
                    noise_profile[k] /= @as(f32, @floatFromInt(noise_frames_auto));
                }
                // Don't set profile_ready=true because we want to continue this block logic 
                // actually we can just transition to processing.
                // But in the original code, the first 5 frames are passed through UNPROCESSED (or just windowed/reconstructed).
                // Let's stick to original behavior for auto mode: first 5 frames are essentially "silence" or passed through?
                // Original code: if frames < noise_frames, it accumulates. ELSE it subtracts.
                // This means the first 5 frames are reconstructed WITHOUT subtraction.
            }
            frames_processed += 1;
            
            // Pass through (reconstruct without modification)
            math.fft_iterative(fft_buf, true);
        } else {
            // Apply Denoise
            for (0..window_size/2) |k| {
                const mag = fft_buf[k].magnitude();
                const phase = std.math.atan2(fft_buf[k].im, fft_buf[k].re);
                
                // Spectral Subtraction
                var new_mag = mag - noise_profile[k] * 1.5; // 1.5 is subtraction factor
                if (new_mag < 0) new_mag = 0;
                
                fft_buf[k] = .{ 
                    .re = new_mag * std.math.cos(phase),
                    .im = new_mag * std.math.sin(phase) 
                };
                if (k > 0) {
                     fft_buf[window_size - k] = .{ .re = fft_buf[k].re, .im = -fft_buf[k].im };
                }
            }
            math.fft_iterative(fft_buf, true);
        }

        // Overlap-Add
        for (0..window_size) |k| {
            output_buf[pos + k] += fft_buf[k].re * window[k];
        }
    }
    @memcpy(data, output_buf);
}

// --- 5. Bass Mono-Maker ---

export fn process_mono_bass(ptr: [*]f32, len: usize, sample_rate: f32, freq: f32) void {
    const data = ptr[0..len];
    var lpf_l1 = math.calc_lpf_coeffs(freq, sample_rate);
    var lpf_l2 = lpf_l1;
    var lpf_r1 = math.calc_lpf_coeffs(freq, sample_rate);
    var lpf_r2 = lpf_r1;
    var hpf_l1 = math.calc_hpf_coeffs(freq, sample_rate);
    var hpf_l2 = hpf_l1;
    var hpf_r1 = math.calc_hpf_coeffs(freq, sample_rate);
    var hpf_r2 = hpf_r1;
    var i: usize = 0;
    while (i < len - 1) : (i += 2) {
        const l = data[i];
        const r = data[i+1];
        var low_l = lpf_l1.process(l);
        low_l = lpf_l2.process(low_l);
        var low_r = lpf_r1.process(r);
        low_r = lpf_r2.process(low_r);
        const low_mono = (low_l + low_r) * 0.5;
        var high_l = hpf_l1.process(l);
        high_l = hpf_l2.process(high_l);
        var high_r = hpf_r1.process(r);
        high_r = hpf_r2.process(high_r);
        data[i] = low_mono + high_l;
        data[i+1] = low_mono + high_r;
    }
}

// --- Wrappers for other modules ---

export fn process_plosiveguard(
    ptr: [*]f32,
    len: usize,
    sample_rate: f32,
    sensitivity: f32,
    strength: f32,
    cutoff: f32
) void {
    plosive.process_plosiveguard(ptr, len, sample_rate, sensitivity, strength, cutoff);
}

export fn process_voiceisolate(ptr: [*]f32, len: usize, amount: f32) void {
    voice_isolate.process_voiceisolate(ptr, len, amount);
}

export fn process_psychodynamic(
    ptr: [*]f32,
    len: usize,
    sample_rate: f32,
    intensity: f32,
    ref_db: f32
) void {
    const data = ptr[0..len];
    var low_shelf = math.calc_low_shelf_coeffs(100.0, sample_rate, 0.0);
    var mid_bell = math.calc_peaking_coeffs(2500.0, sample_rate, 0.0, 1.0);
    var high_shelf = math.calc_high_shelf_coeffs(10000.0, sample_rate, 0.0);
    var rms_energy: f32 = 0.0;
    const attack_ms: f32 = 100.0;
    const release_ms: f32 = 500.0;
    const att_coeff = 1.0 - std.math.exp(-1.0 / (attack_ms * 0.001 * sample_rate));
    const rel_coeff = 1.0 - std.math.exp(-1.0 / (release_ms * 0.001 * sample_rate));
    const block_size = 64;
    var i: usize = 0;
    while (i < len) {
        const current_block_size = @min(block_size, len - i);
        const current_db = math.linearToDb(std.math.sqrt(rms_energy));
        var deficit = (ref_db - current_db) * intensity;
        if (deficit > 20.0) deficit = 20.0;
        if (deficit < -20.0) deficit = -20.0;
        const gain_low = deficit * 0.4;
        const gain_high = deficit * 0.2;
        const gain_mid = -deficit * 0.1;
        const ls_state = .{ .x1 = low_shelf.x1, .x2 = low_shelf.x2, .y1 = low_shelf.y1, .y2 = low_shelf.y2 };
        low_shelf = math.calc_low_shelf_coeffs(100.0, sample_rate, gain_low);
        low_shelf.x1 = ls_state.x1; low_shelf.x2 = ls_state.x2; low_shelf.y1 = ls_state.y1; low_shelf.y2 = ls_state.y2;
        const mb_state = .{ .x1 = mid_bell.x1, .x2 = mid_bell.x2, .y1 = mid_bell.y1, .y2 = mid_bell.y2 };
        mid_bell = math.calc_peaking_coeffs(2500.0, sample_rate, gain_mid, 1.0);
        mid_bell.x1 = mb_state.x1; mid_bell.x2 = mb_state.x2; mid_bell.y1 = mb_state.y1; mid_bell.y2 = mb_state.y2;
        const hs_state = .{ .x1 = high_shelf.x1, .x2 = high_shelf.x2, .y1 = high_shelf.y1, .y2 = high_shelf.y2 };
        high_shelf = math.calc_high_shelf_coeffs(10000.0, sample_rate, gain_high);
        high_shelf.x1 = hs_state.x1; high_shelf.x2 = hs_state.x2; high_shelf.y1 = hs_state.y1; high_shelf.y2 = hs_state.y2;
        var j: usize = 0;
        while (j < current_block_size) : (j += 1) {
            var sample = data[i + j];
            const sq = sample * sample;
            const coeff = if (sq > rms_energy) att_coeff else rel_coeff;
            rms_energy = rms_energy + coeff * (sq - rms_energy);
            if (rms_energy < 0.0000001) rms_energy = 0.0000001;
            sample = low_shelf.process(sample);
            sample = mid_bell.process(sample);
            sample = high_shelf.process(sample);
            data[i + j] = sample;
        }
        i += current_block_size;
    }
}

export fn process_debleed(ptr_target: [*]f32, ptr_source: [*]f32, len: usize, sensitivity: f32, threshold: f32) void {
    const target = ptr_target[0..len];
    const source = ptr_source[0..len];
    debleed.process(allocator, target, source, sensitivity, threshold) catch {};
}

export fn process_echovanish(ptr: [*]f32, len: usize, sample_rate: f32, reduction_amount: f32, tail_length_ms: f32) void {
    echovanish.process_echovanish(ptr, len, sample_rate, reduction_amount, tail_length_ms);
}
