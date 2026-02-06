const std = @import("std");
const math = @import("math_utils.zig");

// Re-implementing the filter logic from main.zig for consistency
// Ideally this would be shared, but copying is safer than refactoring main.zig right now.
const FilterState = struct {
    x1: f32 = 0,
    y1: f32 = 0,

    // Coefficients for ~38Hz HPF at 48kHz
    // a1 = -0.995, b0 = 0.9975, b1 = -0.9975
    const a1: f32 = -0.995;
    const b0: f32 = 0.9975;
    const b1: f32 = -0.9975;

    pub fn process(self: *FilterState, input: f32) f32 {
        const output = b0 * input + b1 * self.x1 - a1 * self.y1;
        self.x1 = input;
        self.y1 = output;
        return output;
    }
};

pub export fn process_smartlevel(
    ptr: [*]f32,
    len: usize,
    target_lufs: f32,
    max_gain_db: f32, // +/- limit
    gate_threshold_db: f32 // -50dB
) void {
    const data = ptr[0..len];

    // We need an allocator for the sliding window buffer
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // 1. Sliding Window RMS Setup
    // Window 300ms @ 48kHz = 14400 samples
    // We assume 48kHz as per other parts of the system.
    const sample_rate: f32 = 48000.0;
    const window_size: usize = @intFromFloat(0.3 * sample_rate);

    // Buffer to store squared history for sliding window
    const history = allocator.alloc(f32, window_size) catch return;
    defer allocator.free(history);
    @memset(history, 0);

    var history_idx: usize = 0;
    var sum_sq: f32 = 0;

    // Filter state for K-weighting approx
    var filter = FilterState{};

    // Gain smoothing state
    var current_gain_db: f32 = 0;
    var last_raw_gain_db: f32 = 0; // For gating

    // Coefficients for smoothing
    // Attack 500ms (Rise), Release 1000ms (Fall)
    // alpha = 1 / (time * fs) approx for simple one-pole?
    // Or alpha = 1 - exp(-1 / (time * fs))
    // Let's use alpha = 1 / (N + 1) for moving average equivalent, or just standard exp decay.
    // alpha = dt / (tau + dt). dt = 1/fs. alpha = 1 / (tau * fs + 1).
    const attack_tau_samples = 0.5 * sample_rate;
    const release_tau_samples = 1.0 * sample_rate;

    const alpha_attack = 1.0 / (attack_tau_samples + 1.0);
    const alpha_release = 1.0 / (release_tau_samples + 1.0);

    for (data) |*sample| {
        const input_sample = sample.*;

        // A. Level Detection
        // 1. Filter (High pass / Weighting)
        // We use the filtered value ONLY for detection, not for output (unless we want to color the sound?)
        // Blueprint says: "Apply High-shelf... before RMS".
        // Usually sidechain is filtered.
        const filtered_sample = filter.process(input_sample);

        // 2. Sliding RMS
        const sq = filtered_sample * filtered_sample;
        const old_sq = history[history_idx];

        sum_sq = sum_sq + sq - old_sq;
        // Float precision fix: sum_sq can drift or go negative slightly due to errors
        if (sum_sq < 0) sum_sq = 0;

        history[history_idx] = sq;
        history_idx = (history_idx + 1) % window_size;

        const mean_sq = sum_sq / @as(f32, @floatFromInt(window_size));
        const rms = std.math.sqrt(mean_sq);
        const rms_db = math.linearToDb(rms);

        // B. Gain Computer
        // Target = -16 LUFS (approx RMS dB)
        // RawGain = Target - CurrentRMS
        var raw_gain_db = target_lufs - rms_db;

        // Gate
        // If CurrentRMS < SilenceThreshold, freeze gain.
        // rms_db is approx LUFS.
        if (rms_db < gate_threshold_db) {
            raw_gain_db = last_raw_gain_db;
        } else {
            // Clamping
            if (raw_gain_db > max_gain_db) raw_gain_db = max_gain_db;
            if (raw_gain_db < -max_gain_db) raw_gain_db = -max_gain_db;
            last_raw_gain_db = raw_gain_db;
        }

        // C. Inertia (Smoothing)
        // If raw_gain > current_gain (Gain Rising), use Attack?
        // Blueprint: "Attack: 500ms (Rise time)".
        var alpha: f32 = 0;
        if (raw_gain_db > current_gain_db) {
            alpha = alpha_attack;
        } else {
            alpha = alpha_release;
        }

        current_gain_db = current_gain_db + alpha * (raw_gain_db - current_gain_db);

        // D. Application
        const linear_gain = math.dbToLinear(current_gain_db);
        sample.* = input_sample * linear_gain;
    }
}
