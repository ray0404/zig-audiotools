const std = @import("std");
const math = @import("math_utils.zig");

pub fn process(allocator: std.mem.Allocator, target: []f32, source: []f32, sensitivity: f32, threshold_db: f32) !void {
    const len = target.len;
    if (source.len != len) return;

    const window_size = 2048;
    const hop_size = window_size / 2;

    // Buffers
    const fft_target = try allocator.alloc(math.Complex, window_size);
    defer allocator.free(fft_target);

    const fft_source = try allocator.alloc(math.Complex, window_size);
    defer allocator.free(fft_source);

    const output_buf = try allocator.alloc(f32, len);
    defer allocator.free(output_buf);
    @memset(output_buf, 0);

    const window = try allocator.alloc(f32, window_size);
    defer allocator.free(window);

    // Hanning window (Synthesis of Hanning analysis + Hanning synthesis = constant for 50% overlap)
    for (window, 0..) |_, idx| {
        window[idx] = 0.5 * (1.0 - std.math.cos(math.TWO_PI * @as(f32, @floatFromInt(idx)) / @as(f32, @floatFromInt(window_size - 1))));
    }

    const threshold_linear = math.dbToLinear(threshold_db);

    var pos: usize = 0;
    while (pos + window_size <= len) : (pos += hop_size) {
        // 1. Prepare frames
        for (0..window_size) |k| {
            fft_target[k] = .{ .re = target[pos + k] * window[k], .im = 0 };
            fft_source[k] = .{ .re = source[pos + k] * window[k], .im = 0 };
        }

        // 2. FFT
        math.fft_iterative(fft_target, false);
        math.fft_iterative(fft_source, false);

        // 3. Process Logic
        // RMS of current frame (time domain would be better but we have access to windowed chunks here)
        // Let's approximate RMS from the windowed chunk in time domain *before* FFT?
        // Actually we have the data in `target[pos+k]`.
        // But `target` is modified in place? No, we write to `output_buf`. `target` is read-only for analysis logic.

        var sum_sq_a: f32 = 0;
        var sum_sq_b: f32 = 0;
        // Check raw samples for RMS (ignoring window effect for gate logic roughly)
        for (0..window_size) |k| {
            const val_a = target[pos+k];
            const val_b = source[pos+k];
            sum_sq_a += val_a * val_a;
            sum_sq_b += val_b * val_b;
        }
        const rms_a = std.math.sqrt(sum_sq_a / @as(f32, @floatFromInt(window_size)));
        const rms_b = std.math.sqrt(sum_sq_b / @as(f32, @floatFromInt(window_size)));

        const active_b = rms_b > threshold_linear;
        const dominant_b = rms_b > (rms_a * 1.5); // +3.5dB approx, stricter than 6dB

        if (active_b and dominant_b) {
            // Apply Spectral Subtraction
            for (0..(window_size/2 + 1)) |k| {
                const mag_a = fft_target[k].magnitude();
                const mag_b = fft_source[k].magnitude();
                const phase_a = std.math.atan2(fft_target[k].im, fft_target[k].re);

                // Estimate bleed magnitude
                const bleed_est = mag_b * 0.3; // BleedFactor

                // Subtract
                var new_mag_a = mag_a - (bleed_est * sensitivity);
                if (new_mag_a < 0) new_mag_a = 0;

                fft_target[k] = .{
                    .re = new_mag_a * std.math.cos(phase_a),
                    .im = new_mag_a * std.math.sin(phase_a)
                };

                // Symmetric
                if (k > 0 and k < window_size/2) {
                     fft_target[window_size - k] = .{ .re = fft_target[k].re, .im = -fft_target[k].im };
                }
            }
        }

        // 4. IFFT
        math.fft_iterative(fft_target, true);

        // 5. Overlap-Add
        for (0..window_size) |k| {
            output_buf[pos + k] += fft_target[k].re * window[k];
        }
    }

    @memcpy(target, output_buf);
}
