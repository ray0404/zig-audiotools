const std = @import("std");

pub const Yin = struct {
    pub fn detect(allocator: std.mem.Allocator, input: []const f32, sample_rate: f32, min_freq: f32, max_freq: f32) !f32 {
        const n = input.len;
        const min_period = @as(usize, @intFromFloat(sample_rate / max_freq));
        const max_period = @as(usize, @intFromFloat(sample_rate / min_freq));

        if (max_period >= n / 2) {
            return 0.0;
        }

        const w = n / 2;

        const full_diff_buf = try allocator.alloc(f32, max_period + 2);
        defer allocator.free(full_diff_buf);

        // 1. Difference Function
        var tau: usize = 0;
        while (tau <= max_period) : (tau += 1) {
            if (tau == 0) {
                full_diff_buf[tau] = 0; // Not used really
                continue;
            }
            var sum: f32 = 0;
            var j: usize = 0;
            while (j < w) : (j += 1) {
                const delta = input[j] - input[j + tau];
                sum += delta * delta;
            }
            full_diff_buf[tau] = sum;
        }

        // 2. Cumulative Mean Normalized Difference
        full_diff_buf[0] = 1;
        var running_sum: f32 = 0;
        tau = 1;
        while (tau <= max_period) : (tau += 1) {
            running_sum += full_diff_buf[tau];
            if (running_sum == 0) {
                 full_diff_buf[tau] = 1;
            } else {
                 full_diff_buf[tau] *= @as(f32, @floatFromInt(tau)) / running_sum;
            }
        }

        // 3. Absolute Threshold
        var best_tau: usize = 0;
        const threshold: f32 = 0.15;

        tau = min_period;
        while (tau < max_period) : (tau += 1) {
            if (full_diff_buf[tau] < threshold) {
                while (tau + 1 < max_period and full_diff_buf[tau + 1] < full_diff_buf[tau]) {
                    tau += 1;
                }
                best_tau = tau;
                break;
            }
        }

        if (best_tau == 0) {
             var min_val: f32 = 1000.0;
             tau = min_period;
             while (tau <= max_period) : (tau += 1) {
                 if (full_diff_buf[tau] < min_val) {
                     min_val = full_diff_buf[tau];
                     best_tau = tau;
                 }
             }
        }

        if (best_tau == 0) return 0.0;

        // 4. Parabolic Interpolation
        var refined_tau = @as(f32, @floatFromInt(best_tau));

        if (best_tau > 0 and best_tau < max_period) {
            const s0 = full_diff_buf[best_tau - 1];
            const s1 = full_diff_buf[best_tau];
            const s2 = full_diff_buf[best_tau + 1];

            if (2.0 * s1 - s2 - s0 != 0) {
                const adjustment = (s2 - s0) / (2.0 * (2.0 * s1 - s2 - s0));
                refined_tau += adjustment;
            }
        }

        return sample_rate / refined_tau;
    }
};
