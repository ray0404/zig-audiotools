/**
 * GainMatch Class
 *
 * Auto-gain logic using RMS comparison.
 * Calculates the gain compensation required to match the loudness of a processed signal (wet)
 * to a reference signal (dry/input).
 */
export class GainMatch {
    /**
     * @param {number} sampleRate - Audio sample rate
     * @param {number} windowSizeMs - Window size for RMS detection in milliseconds (EMA time constant)
     */
    constructor(sampleRate, windowSizeMs = 300) {
        this.sampleRate = sampleRate;

        // Calculate alpha for RMS EMA (detectors)
        // alpha = 1 - exp(-1 / (timeConstant * sampleRate))
        // or more commonly for simple one-pole: exp(-1 / (T * fs))
        // We use exp(-1 / (T * fs)) where T is windowSize in seconds
        const t = Math.max(0.001, windowSizeMs / 1000);
        this.rmsAlpha = Math.exp(-1.0 / (t * sampleRate));

        // Smoothing for the calculated gain (ballistics)
        // Using a fixed time constant of ~100ms to avoid zipper noise
        const smoothT = 0.1;
        this.gainAlpha = Math.exp(-1.0 / (smoothT * sampleRate));

        // State
        this.reset();

        // Epsilon to avoid division by zero
        this.EPSILON = 1e-9;
    }

    /**
     * Resets the internal state of the RMS detectors and current gain.
     */
    reset() {
        this.refSumSquares = 0;
        this.wetSumSquares = 0;
        this.currentGain = 1.0;
    }

    /**
     * Process a pair of samples and calculate compensation gain.
     *
     * @param {number} refSample - The reference (input) sample
     * @param {number} wetSample - The processed (wet) sample
     * @returns {number} The compensation gain factor
     */
    process(refSample, wetSample) {
        // NaN/Infinity Safety
        if (!Number.isFinite(refSample) || !Number.isFinite(wetSample)) {
            return this.currentGain;
        }

        // 1. Update RMS Detectors (EMA of squared samples)
        const refSq = refSample * refSample;
        const wetSq = wetSample * wetSample;

        this.refSumSquares = (this.rmsAlpha * this.refSumSquares) + ((1 - this.rmsAlpha) * refSq);
        this.wetSumSquares = (this.rmsAlpha * this.wetSumSquares) + ((1 - this.rmsAlpha) * wetSq);

        // 2. Calculate RMS
        const refRMS = Math.sqrt(this.refSumSquares);
        const wetRMS = Math.sqrt(this.wetSumSquares);

        // 3. Calculate Target Gain
        let targetGain = 1.0;

        // Avoid boosting noise if reference is silent
        if (refRMS < this.EPSILON) {
            targetGain = 0.0;
        } else if (wetRMS < this.EPSILON) {
            // Wet is silent but ref is not.
            // Ideally gain should be infinite to match ref.
            // But we must cap it to avoid explosion.
            // Let's allow a generous boost but safe. e.g. +60dB (1000x)
            targetGain = 1000.0;
        } else {
            targetGain = refRMS / wetRMS;
        }

        // 4. Smooth the Gain
        this.currentGain = (this.gainAlpha * this.currentGain) + ((1 - this.gainAlpha) * targetGain);

        // Final safety check
        if (!Number.isFinite(this.currentGain)) {
            this.reset();
            return 1.0;
        }

        return this.currentGain;
    }
}
