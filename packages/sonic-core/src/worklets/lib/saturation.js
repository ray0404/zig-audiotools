/**
 * Saturation/Distortion DSP
 * Provides various analog-modeled saturation types.
 */
export class Saturator {
    // Static integer constants for performance
    static get TYPE_TAPE() { return 0; }
    static get TYPE_TUBE() { return 1; }
    static get TYPE_FUZZ() { return 2; }

    constructor() {
        // No state needed for memory-less waveshaping
    }

    /**
     * Process a single sample with saturation.
     *
     * @param {number} input - The input sample (-1.0 to 1.0 nominally, but can be anything)
     * @param {number} drive - Linear gain multiplier (>= 0)
     * @param {number} type - 0 (Tape), 1 (Tube), or 2 (Fuzz)
     * @returns {number} Saturated output
     */
    process(input, drive, type) {
        // Apply drive (linear gain)
        const x = input * drive;

        // Use integer comparison for performance
        // 1: Tube
        if (type === 1) {
            // Asymmetric Transfer Function
            // Positive: Harder knee (tanh)
            // Negative: Softer knee (x / (1 + |x|))
            // This generates even harmonics
            if (x >= 0) {
                return Math.tanh(x);
            } else {
                return x / (1 + Math.abs(x));
            }
        }

        // 2: Fuzz
        if (type === 2) {
            // Hard Clipping
            // Strict clamping at +/- 1.0
            if (x > 1.0) return 1.0;
            if (x < -1.0) return -1.0;
            return x;
        }

        // 0 (Tape) or default
        // Symmetric Soft Clipping
        // Standard tanh saturator
        // Generates odd harmonics
        return Math.tanh(x);
    }
}