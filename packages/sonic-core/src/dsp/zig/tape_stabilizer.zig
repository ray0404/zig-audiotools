const std = @import("std");
const math = @import("math_utils.zig");
const Yin = @import("pitch_detect.zig").Yin;

// Use a local allocator for this module's internal allocations
var gpa = std.heap.GeneralPurposeAllocator(.{}){};
const allocator = gpa.allocator();

export fn process_tapestabilizer(
    ptr: [*]f32,
    len: usize,
    sample_rate: f32,
    nominal_freq: f32,
    scan_freq_min: f32,
    scan_freq_max: f32,
    correction_amount: f32
) void {
    const input = ptr[0..len];

    // Output buffer
    const output = allocator.alloc(f32, len) catch return;
    defer allocator.free(output);
    @memset(output, 0);

    // 1. Analysis Configuration
    const hop_size: usize = 1024;
    const window_size: usize = 2048;

    if (len < window_size) return;

    const num_frames = (len - window_size) / hop_size + 1;

    const freqs = allocator.alloc(f32, num_frames) catch return;
    defer allocator.free(freqs);

    // 2. Pitch Detection Loop
    var frame_idx: usize = 0;
    var pos: usize = 0;
    while (frame_idx < num_frames) : (pos += hop_size) {
        // Safety check
        if (pos + window_size > len) break;

        const window = input[pos..][0..window_size];
        const detected = Yin.detect(allocator, window, sample_rate, scan_freq_min, scan_freq_max) catch 0.0;

        // Validation: If 0 or wild, use nominal
        if (detected > 0) {
            freqs[frame_idx] = detected;
        } else {
            // Use previous or nominal
            if (frame_idx > 0) {
                freqs[frame_idx] = freqs[frame_idx - 1];
            } else {
                freqs[frame_idx] = nominal_freq;
            }
        }

        frame_idx += 1;
    }

    // 3. Smoothing (Median Filter size 5) to remove glitches
    const smoothed_freqs = allocator.alloc(f32, num_frames) catch return;
    defer allocator.free(smoothed_freqs);
    @memcpy(smoothed_freqs, freqs);

    if (num_frames >= 5) {
        var i: usize = 2;
        while (i < num_frames - 2) : (i += 1) {
            var window = [5]f32{ freqs[i-2], freqs[i-1], freqs[i], freqs[i+1], freqs[i+2] };
            std.sort.block(f32, &window, {}, std.sort.asc(f32));
            smoothed_freqs[i] = window[2];
        }
    }

    // 4. Resampling
    // We construct the output by reading from input at variable speeds.
    // Speed factor S[t] = Measured[t] / Nominal
    // If Measured = 59, Nominal = 60, Speed = 0.983 (Tape ran slow).
    // To correct, we must read FASTER? No.
    // If tape ran slow, the recorded wave is "stretched". We need to "shrink" it (play faster).
    // ReadHead increment = Nominal / Measured.
    // e.g. 60 / 59 = 1.017.

    var write_pos: usize = 0;
    var read_pos: f32 = 0.0;

    // We need to interpolate speed for every sample.
    // Speed is defined at hop points (0, 1024, 2048...)

    while (write_pos < len) : (write_pos += 1) {
        // Determine current speed based on read_pos (approximate location in source tape)
        // or write_pos (location in corrected time).
        // Since the map is derived from the SOURCE (input buffer), the speed variation is mapped to SOURCE position.

        const frame_float = read_pos / @as(f32, @floatFromInt(hop_size));
        const frame_i = @as(usize, @intFromFloat(frame_float));

        var current_freq: f32 = nominal_freq;

        if (frame_i < num_frames - 1) {
            const t = frame_float - @as(f32, @floatFromInt(frame_i));
            // Linear interp of frequency
            current_freq = smoothed_freqs[frame_i] * (1.0 - t) + smoothed_freqs[frame_i + 1] * t;
        } else if (frame_i < num_frames) {
            current_freq = smoothed_freqs[frame_i];
        }

        // Calculate increment
        // If freq is 59 (slow tape), we need to speed up.
        // Increment = Nominal / Measured
        // Clamp to reasonable limits to avoid crazy skipping
        if (current_freq < scan_freq_min * 0.5) current_freq = nominal_freq;

        var increment = nominal_freq / current_freq;

        // Apply correction amount
        if (correction_amount < 1.0) {
            increment = 1.0 + (increment - 1.0) * correction_amount;
        }

        // Perform interpolation
        const r_int = @as(usize, @intFromFloat(read_pos));
        const r_frac = read_pos - @as(f32, @floatFromInt(r_int));

        if (r_int >= 1 and r_int + 2 < len) {
            const y0 = input[r_int - 1];
            const y1 = input[r_int];
            const y2 = input[r_int + 1];
            const y3 = input[r_int + 2];

            output[write_pos] = math.cubicHermite(y0, y1, y2, y3, r_frac);
        } else if (r_int < len) {
            output[write_pos] = input[r_int];
        } else {
            output[write_pos] = 0;
        }

        read_pos += increment;

        // Stop if we read past end
        if (read_pos >= @as(f32, @floatFromInt(len))) break;
    }

    // Copy back results
    // Zero out the rest if we finished early
    if (write_pos < len) {
        @memset(input[write_pos..], 0);
    }
    @memcpy(input[0..write_pos], output[0..write_pos]);
}
