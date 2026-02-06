const std = @import("std");
const math = @import("math_utils.zig");
const plosive = @import("plosiveguard.zig");
const voice_isolate = @import("voice_isolate.zig");
const debleed = @import("debleed.zig");
const stabilizer = @import("tape_stabilizer.zig");
const spectralmatch = @import("spectralmatch.zig");
const echovanish = @import("echovanish.zig");

comptime {
    _ = spectralmatch;
}

// Import SmartLevel module to ensure its exported functions are included
pub usingnamespace @import("smart_level.zig");

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

// K-weighting filter coefficients (approximate)
// High shelf: gain 4dB, fc 1500Hz (simplified pre-computed 48kHz)
// High pass: fc 38Hz
// For simplicity in this blueprint context, we will use a simple RMS-based normalization
// but with a basic weighting filter.

fn apply_filter(input: []f32, output: []f32) void {
    // Simple high-pass at ~38Hz
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
    
    // We need a temporary buffer for filtering
    const filtered = allocator.alloc(f32, len) catch return; // Fail silently in export?
    defer allocator.free(filtered);

    apply_filter(data, filtered);

    var sum_sq: f32 = 0;
    
    // SIMD optimization using @Vector
    const vec_len = 4;
    var i: usize = 0;
    const loop_len = len - (len % vec_len);
    
    while (i < loop_len) : (i += vec_len) {
        const v: @Vector(vec_len, f32) = data[i..][0..vec_len].*;
        const v_sq = v * v;
        sum_sq += @reduce(.Add, v_sq);
    }
    // Handle remainder
    while (i < len) : (i += 1) {
        sum_sq += filtered[i] * filtered[i];
    }

    const mean_sq = sum_sq / @as(f32, @floatFromInt(len));
    const rms_db = math.linearToDb(std.math.sqrt(mean_sq));
    
    // Approximation: K-weighted RMS is roughly LUFS
    const current_lufs = rms_db - 0.691; // K-weighting offset approx

    const delta_db = target_lufs - current_lufs;
    const linear_gain = math.dbToLinear(delta_db);

    // Apply gain
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
        // y[n] = c * x[n] + x[n-1] - c * y[n-1]
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

export fn process_declip(ptr: [*]f32, len: usize) void {
    const data = ptr[0..len];
    const threshold: f32 = 0.999;
    
    var i: usize = 0;
    while (i < len) {
        if (@abs(data[i]) >= threshold) {
            // Found start of clipping
            const start = i;
            var end = i;
            while (end < len and @abs(data[end]) >= threshold) : (end += 1) {}
            
            // Check if it's a sequence of 3+ samples
            if (end - start >= 3) {
                // Determine indices for interpolation
                // Need 2 points before and 2 after
                if (start >= 2 and end + 2 < len) {
                    const p0 = data[start - 2];
                    const p1 = data[start - 1];
                    const p2 = data[end];
                    const p3 = data[end + 1];

                    // Interpolate range [start, end - 1]
                    const range = @as(f32, @floatFromInt(end - start + 1));
                    
                    var j: usize = 0;
                    while (j < (end - start)) : (j += 1) {
                        const t = @as(f32, @floatFromInt(j + 1)) / range;
                        // Cubic Hermite Spline (Catmull-Rom)
                        // Simplified
                        const t2 = t * t;
                        const t3 = t2 * t;
                        
                        // Catmull-Rom logic
                        const v0 = p1;
                        const v1 = p2;
                        const t0 = 0.5 * (p2 - p0);
                        const t1 = 0.5 * (p3 - p1);

                        const h1 = 2*t3 - 3*t2 + 1;
                        const h2 = -2*t3 + 3*t2;
                        const h3 = t3 - 2*t2 + t;
                        const h4 = t3 - t2;

                        data[start + j] = h1*v0 + h2*v1 + h3*t0 + h4*t1;
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

export fn process_spectral_denoise(ptr: [*]f32, len: usize) void {
    const data = ptr[0..len];
    const window_size = 2048;
    const hop_size = window_size / 2;
    
    // Allocate complex buffers
    const fft_buf = allocator.alloc(math.Complex, window_size) catch return;
    defer allocator.free(fft_buf);
    
    const noise_profile = allocator.alloc(f32, window_size / 2) catch return;
    defer allocator.free(noise_profile);
    @memset(noise_profile, 0);

    // 1. Analyze noise profile (first 100ms approx 5 frames at 48k)
    // Actually we will just use the first 5 frames
    const noise_frames = 5;
    var frames_processed: usize = 0;

    // We need overlap-add buffer
    // For simplicity, we'll do a destructive processing on 'data' assuming overlap-add is handled or we do a simple version.
    // Doing proper STFT overlap-add in place is complex.
    // We will do a simplification: Process in blocks, windowing, spectral subtract, overlap-add.
    // Since we can't easily resize 'data', we'll modify in place but this requires a copy.
    
    // Let's create a full copy for output to handle overlap add
    const output_buf = allocator.alloc(f32, len) catch return;
    defer allocator.free(output_buf);
    @memset(output_buf, 0);

    // Hanning window
    const window = allocator.alloc(f32, window_size) catch return;
    defer allocator.free(window);
    for (window, 0..) |_, idx| {
        window[idx] = 0.5 * (1.0 - std.math.cos(math.TWO_PI * @as(f32, @floatFromInt(idx)) / @as(f32, @floatFromInt(window_size - 1))));
    }

    var pos: usize = 0;
    while (pos + window_size < len) : (pos += hop_size) {
        // Prepare frame
        for (0..window_size) |k| {
            fft_buf[k] = .{ .re = data[pos + k] * window[k], .im = 0 };
        }

        math.fft_iterative(fft_buf, false);

        // Compute magnitude
        if (frames_processed < noise_frames) {
            // Accumulate noise profile
            for (0..window_size/2) |k| {
                noise_profile[k] += fft_buf[k].magnitude();
            }
            if (frames_processed == noise_frames - 1) {
                // Average
                for (0..window_size/2) |k| {
                    noise_profile[k] /= @as(f32, @floatFromInt(noise_frames));
                }
            }
            frames_processed += 1;
        } else {
            // Spectral subtraction
            for (0..window_size/2) |k| {
                const mag = fft_buf[k].magnitude();
                const phase = std.math.atan2(fft_buf[k].im, fft_buf[k].re);
                
                var new_mag = mag - noise_profile[k] * 1.5; // Over-subtraction factor
                if (new_mag < 0) new_mag = 0;
                
                fft_buf[k] = .{ 
                    .re = new_mag * std.math.cos(phase),
                    .im = new_mag * std.math.sin(phase) 
                };
                // Symmetric part
                if (k > 0) {
                     fft_buf[window_size - k] = .{ .re = fft_buf[k].re, .im = -fft_buf[k].im };
                }
            }
        }

        math.fft_iterative(fft_buf, true); // Inverse

        // Overlap-add
        for (0..window_size) |k| {
            output_buf[pos + k] += fft_buf[k].re * window[k]; // Apply window again
        }
    }
    
    // Copy back
    @memcpy(data, output_buf);
}

// --- 5. Bass Mono-Maker ---
// Linkwitz-Riley 4th order LPF/HPF
// Cascaded Butterworth 2nd order

// Since we process L and R separately but the buffer is likely interleaved or mono?
// The prompt implies a single buffer `process_mono_bass`.
// If it's stereo interleaved, we need to know channels.
// Assuming this is a MONO processor for now or applying to a single channel doesn't make sense for "Mono Maker" which implies summing L+R.
// The blueprint says: "Take LPF output (Left and Right) and average them".
// So the input MUST be stereo interleaved or split. 
// Given the signature `ptr: [*]f32, len: usize`, it's likely a single channel or interleaved.
// Web Audio AudioBuffers usually provide split channels (getChannelData(0), getChannelData(1)).
// If this function is called once per channel, we can't sum L+R.
// So we probably need to pass BOTH channels or Interleaved.
// Let's assume Interleaved [L, R, L, R...] for this specific function or that we pass two pointers.
// To keep it simple and compatible with the single pointer signature of others:
// We will assume the buffer passed is Interleaved Stereo.
// If it's mono, this effect does nothing useful (LPF + HPF = Original).

export fn process_mono_bass(ptr: [*]f32, len: usize, sample_rate: f32, freq: f32) void {
    const data = ptr[0..len];
    
    // 2 cascaded Butterworths = Linkwitz-Riley 4th order
    var lpf_l1 = math.calc_lpf_coeffs(freq, sample_rate);
    var lpf_l2 = lpf_l1; // Copy coeffs, separate state
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

        // LPF path
        var low_l = lpf_l1.process(l);
        low_l = lpf_l2.process(low_l);

        var low_r = lpf_r1.process(r);
        low_r = lpf_r2.process(low_r);

        // Sum low end (Mono)
        const low_mono = (low_l + low_r) * 0.5;

        // HPF path
        var high_l = hpf_l1.process(l);
        high_l = hpf_l2.process(high_l);
        
        var high_r = hpf_r1.process(r);
        high_r = hpf_r2.process(high_r);

        // Recombine
        data[i] = low_mono + high_l;
        data[i+1] = low_mono + high_r;
    }
}

// --- 6. Plosive Guard ---

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

// --- 7. Voice Isolate ---
export fn process_voiceisolate(ptr: [*]f32, len: usize, amount: f32) void {
    voice_isolate.process_voiceisolate(ptr, len, amount);
}

// --- 8. PsychoDynamic EQ ---

export fn process_psychodynamic(
    ptr: [*]f32,
    len: usize,
    sample_rate: f32,
    intensity: f32,
    ref_db: f32
) void {
    const data = ptr[0..len];

    // Filter states
    var low_shelf = math.calc_low_shelf_coeffs(100.0, sample_rate, 0.0);
    var mid_bell = math.calc_peaking_coeffs(2500.0, sample_rate, 0.0, 1.0);
    var high_shelf = math.calc_high_shelf_coeffs(10000.0, sample_rate, 0.0);

    // Dynamic state
    var rms_energy: f32 = 0.0;
    const attack_ms: f32 = 100.0;
    const release_ms: f32 = 500.0;

    // Simple 1-pole coeff for envelope
    // t = 1 - exp(-1 / (time * fs))
    const att_coeff = 1.0 - std.math.exp(-1.0 / (attack_ms * 0.001 * sample_rate));
    const rel_coeff = 1.0 - std.math.exp(-1.0 / (release_ms * 0.001 * sample_rate));

    const block_size = 64;
    var i: usize = 0;

    while (i < len) {
        // Calculate block size for this iteration
        const current_block_size = @min(block_size, len - i);

        // 1. Calculate RMS for this block to estimate loudness
        // (Or we can run the envelope follower sample by sample, which is smoother)
        // Let's run a simple squared envelope follower sample by sample for accurate deficit,
        // but update coeffs only once per block.

        // For the gain calculation, we use the RMS of the PREVIOUS block or current smoothed value.
        // Let's use the current smoothed energy.

        // Convert smoothed energy to dB
        const current_db = math.linearToDb(std.math.sqrt(rms_energy));
        var deficit = ref_db - current_db;

        // Intensity scaling
        deficit *= intensity;

        // Clamp deficit to reasonable bounds (e.g. +/- 20dB) to prevent explosion
        if (deficit > 20.0) deficit = 20.0;
        if (deficit < -20.0) deficit = -20.0;

        // Calculate gains
        const gain_low = deficit * 0.4;
        const gain_high = deficit * 0.2;
        const gain_mid = -deficit * 0.1;

        // Update filters
        // Preserve state (x1, x2, y1, y2)
        const ls_state = .{ .x1 = low_shelf.x1, .x2 = low_shelf.x2, .y1 = low_shelf.y1, .y2 = low_shelf.y2 };
        low_shelf = math.calc_low_shelf_coeffs(100.0, sample_rate, gain_low);
        low_shelf.x1 = ls_state.x1; low_shelf.x2 = ls_state.x2; low_shelf.y1 = ls_state.y1; low_shelf.y2 = ls_state.y2;

        const mb_state = .{ .x1 = mid_bell.x1, .x2 = mid_bell.x2, .y1 = mid_bell.y1, .y2 = mid_bell.y2 };
        mid_bell = math.calc_peaking_coeffs(2500.0, sample_rate, gain_mid, 1.0);
        mid_bell.x1 = mb_state.x1; mid_bell.x2 = mb_state.x2; mid_bell.y1 = mb_state.y1; mid_bell.y2 = mb_state.y2;

        const hs_state = .{ .x1 = high_shelf.x1, .x2 = high_shelf.x2, .y1 = high_shelf.y1, .y2 = high_shelf.y2 };
        high_shelf = math.calc_high_shelf_coeffs(10000.0, sample_rate, gain_high);
        high_shelf.x1 = hs_state.x1; high_shelf.x2 = hs_state.x2; high_shelf.y1 = hs_state.y1; high_shelf.y2 = hs_state.y2;

        // Process block
        var j: usize = 0;
        while (j < current_block_size) : (j += 1) {
            var sample = data[i + j];
            const sq = sample * sample;

            // Update envelope
            // If signal is higher than envelope, use attack, else release
            const coeff = if (sq > rms_energy) att_coeff else rel_coeff;
            rms_energy = rms_energy + coeff * (sq - rms_energy);

            // Prevent underflow
            if (rms_energy < 0.0000001) rms_energy = 0.0000001;

            // Apply filters in series
            sample = low_shelf.process(sample);
            sample = mid_bell.process(sample);
            sample = high_shelf.process(sample);

            data[i + j] = sample;
        }

        i += current_block_size;
    }
}

// --- 9. DeBleed Lite ---

export fn process_debleed(ptr_target: [*]f32, ptr_source: [*]f32, len: usize, sensitivity: f32, threshold: f32) void {
    const target = ptr_target[0..len];
    const source = ptr_source[0..len];
    debleed.process(allocator, target, source, sensitivity, threshold) catch |err| {
        // Ignore allocation errors for now in WASM context (or log if possible)
        _ = err;
    };
}

// --- 10. Tape Stabilizer ---

export fn process_tapestabilizer(
    ptr: [*]f32,
    len: usize,
    sample_rate: f32,
    nominal_freq: f32,
    scan_freq_min: f32,
    scan_freq_max: f32,
    correction_amount: f32
) void {
    stabilizer.process_tapestabilizer(ptr, len, sample_rate, nominal_freq, scan_freq_min, scan_freq_max, correction_amount);
}

// --- 11. Echo Vanish (De-Reverb) ---

export fn process_echovanish(ptr: [*]f32, len: usize, sample_rate: f32, reduction_amount: f32, tail_length_ms: f32) void {
    echovanish.process_echovanish(ptr, len, sample_rate, reduction_amount, tail_length_ms);
}