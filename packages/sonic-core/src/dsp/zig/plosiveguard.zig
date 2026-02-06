const std = @import("std");
const math = @import("math_utils.zig");

pub fn process_plosiveguard(
    ptr: [*]f32,
    len: usize,
    sample_rate: f32,
    sensitivity: f32, // 0.0 to 1.0 (Threshold offset)
    strength: f32,    // 0.0 to 1.0 (Max attenuation depth)
    cutoff: f32       // 80Hz to 200Hz (Crossover freq)
) void {
    const data = ptr[0..len];

    // Filters
    // Linkwitz-Riley 4th order = 2 cascaded Butterworth 2nd order filters
    var lpf1 = math.calc_lpf_coeffs(cutoff, sample_rate);
    var lpf2 = lpf1; // Copy coeffs, new state
    var hpf1 = math.calc_hpf_coeffs(cutoff, sample_rate);
    var hpf2 = hpf1;

    // Detection State
    var low_energy: f32 = 0;
    var high_energy: f32 = 0;
    var prev_low_energy: f32 = 0;

    // Envelope State
    var current_gain: f32 = 1.0;

    // Constants
    // 5ms smoothing for energy detection
    const energy_alpha = 1.0 - std.math.exp(-1.0 / (sample_rate * 0.005));

    // Gain Envelope
    // Attack 2ms (fast reaction to clamp down)
    const att_alpha = 1.0 - std.math.exp(-1.0 / (sample_rate * 0.002));
    // Release 80ms (hold reduction through the plosive body)
    const rel_alpha = 1.0 - std.math.exp(-1.0 / (sample_rate * 0.080));

    // Thresholds
    // Flux threshold: How fast must the low end energy rise?
    // Mapped from sensitivity.
    // High Sensitivity (1.0) -> Low Flux Threshold (Easy trigger)
    // Low Sensitivity (0.0) -> High Flux Threshold (Hard trigger)
    const min_thresh = 0.000001;
    const max_thresh = 0.001;
    const flux_threshold = max_thresh - (sensitivity * (max_thresh - min_thresh));

    // Ratio threshold: Low Energy / High Energy > 12dB (~15.8x power)
    const ratio_threshold: f32 = 15.8;

    // Max attenuation based on strength
    // Strength 1.0 -> -inf dB (multiply by 0) - actually let's cap at -24dB (0.06)
    // Strength 0.0 -> 0 dB (multiply by 1)
    const min_gain_limit = 1.0 - (strength * 0.95); // Can go down to 0.05

    for (data) |*sample| {
        const s = sample.*;

        // 1. Crossover
        // Low Band Path
        var low = lpf1.process(s);
        low = lpf2.process(low);

        // High Band Path
        var high = hpf1.process(s);
        high = hpf2.process(high);

        // 2. Detection
        const low_sq = low * low;
        const high_sq = high * high;

        // Smooth energies (short window RMS approximation)
        low_energy += energy_alpha * (low_sq - low_energy);
        high_energy += energy_alpha * (high_sq - high_energy);

        // Flux: Change in low energy
        const flux = low_energy - prev_low_energy;
        prev_low_energy = low_energy;

        var target_gain: f32 = 1.0;

        // Trigger Condition:
        // 1. Explosive rise in low energy (Flux > Threshold)
        // 2. Dominant low frequency content (Low > High + 12dB)
        if (flux > flux_threshold and low_energy > (high_energy * ratio_threshold)) {
             target_gain = min_gain_limit;
        }

        // 3. Gain Envelope
        if (target_gain < current_gain) {
            // Attack phase
            current_gain += att_alpha * (target_gain - current_gain);
        } else {
            // Release phase
            current_gain += rel_alpha * (target_gain - current_gain);
        }

        // 4. Recombination
        // Only attenuate the low band
        sample.* = (low * current_gain) + high;
    }
}
