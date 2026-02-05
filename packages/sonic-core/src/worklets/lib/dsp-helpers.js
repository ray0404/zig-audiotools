/**
 * Shared DSP Library for AudioWorklets
 * Pure JS implementation of common DSP components.
 */

/**
 * Standard RBJ Biquad Filter implementation.
 */
export class BiquadFilter {
    constructor() {
        this.reset();
        this.cache = { w0: 0, cosw0: 0, alpha: 0, type: 'lowpass' };
        // Default to safe values
        this.setParams(1000, 0, 1.0, 44100, 'lowpass');
    }

    /**
     * Resets the filter state (delay lines).
     */
    reset() {
        this.x1 = 0; this.x2 = 0;
        this.y1 = 0; this.y2 = 0;
        this.b0 = 0; this.b1 = 0; this.b2 = 0;
        this.a1 = 0; this.a2 = 0;
    }

    /**
     * Sets the filter parameters and updates coefficients.
     * @param {number} frequency - Cutoff or center frequency in Hz.
     * @param {number} gain - Gain in dB (for peaking/shelving filters).
     * @param {number} Q - Quality factor.
     * @param {number} sampleRate - System sample rate.
     * @param {string} type - Filter type ('lowpass', 'highpass', etc.).
     */
    setParams(frequency, gain, Q, sampleRate, type) {
        this.updateBase(frequency, Q, sampleRate, type);
        this.setGain(gain);
    }

    /**
     * Updates common intermediate variables based on frequency and Q.
     */
    updateBase(frequency, Q, sampleRate, type) {
        const w0 = (2 * Math.PI * frequency) / sampleRate;
        this.cache.w0 = w0;
        this.cache.cosw0 = Math.cos(w0);
        this.cache.alpha = Math.sin(w0) / (2 * Q);
        this.cache.type = type;
    }

    /**
     * Calculates filter coefficients based on gain.
     * @param {number} gain - Gain in dB.
     */
    setGain(gain) {
        const A = Math.pow(10, gain / 40);
        const { cosw0, alpha, type } = this.cache;
        
        let b0, b1, b2, a0, a1, a2;

        switch (type) {
            case 'lowpass':
                b0 = (1 - cosw0) / 2;
                b1 = 1 - cosw0;
                b2 = (1 - cosw0) / 2;
                a0 = 1 + alpha;
                a1 = -2 * cosw0;
                a2 = 1 - alpha;
                break;
            case 'highpass':
                b0 = (1 + cosw0) / 2;
                b1 = -(1 + cosw0);
                b2 = (1 + cosw0) / 2;
                a0 = 1 + alpha;
                a1 = -2 * cosw0;
                a2 = 1 - alpha;
                break;
            case 'bandpass':
                b0 = alpha;
                b1 = 0;
                b2 = -alpha;
                a0 = 1 + alpha;
                a1 = -2 * cosw0;
                a2 = 1 - alpha;
                break;
            case 'peaking':
                b0 = 1 + alpha * A;
                b1 = -2 * cosw0;
                b2 = 1 - alpha * A;
                a0 = 1 + alpha / A;
                a1 = -2 * cosw0;
                a2 = 1 - alpha / A;
                break;
            case 'lowshelf':
                b0 = A * ((A + 1) - (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha);
                b1 = 2 * A * ((A - 1) - (A + 1) * cosw0);
                b2 = A * ((A + 1) - (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha);
                a0 = (A + 1) + (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha;
                a1 = -2 * ((A - 1) + (A + 1) * cosw0);
                a2 = (A + 1) + (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha;
                break;
            case 'highshelf':
                b0 = A * ((A + 1) + (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha);
                b1 = -2 * A * ((A - 1) + (A + 1) * cosw0);
                b2 = A * ((A + 1) + (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha);
                a0 = (A + 1) - (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha;
                a1 = 2 * ((A - 1) - (A + 1) * cosw0);
                a2 = (A + 1) - (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha;
                break;
            default:
                b0=1; b1=0; b2=0; a0=1; a1=0; a2=0;
        }

        // Normalize
        this.b0 = b0 / a0;
        this.b1 = b1 / a0;
        this.b2 = b2 / a0;
        this.a1 = a1 / a0;
        this.a2 = a2 / a0;
    }

    /**
     * Processes a single input sample.
     * @param {number} input - Input sample.
     * @returns {number} Filtered output sample.
     */
    process(input) {
        const output = this.b0 * input + this.b1 * this.x1 + this.b2 * this.x2
                     - this.a1 * this.y1 - this.a2 * this.y2;
        
        // Safety Check for NaN or Infinity
        if (!Number.isFinite(output)) {
            this.reset();
            return 0;
        }

        this.x2 = this.x1;
        this.x1 = input;
        this.y2 = this.y1;
        this.y1 = output;

        return output;
    }
}

/**
 * K-Weighting Filter for LUFS Metering (ITU-R BS.1770-4)
 * Consists of a pre-filter (high shelf) and a RLB filter (high pass).
 */
export class KWeightingFilter {
    /**
     * @param {number} sampleRate - System sample rate.
     */
    constructor(sampleRate) {
        this.preFilter = new BiquadFilter();
        this.rlbFilter = new BiquadFilter();
        
        // Stage 1: High Shelf (+4dB @ ~1500Hz)
        this.preFilter.setParams(1500, 4, 0.707, sampleRate, 'highshelf');

        // Stage 2: High Pass (Cutoff @ ~100Hz)
        this.rlbFilter.setParams(100, 0, 1.0, sampleRate, 'highpass');
    }

    /**
     * Processes a single input sample through the K-Weighting stages.
     * @param {number} input - Input sample.
     * @returns {number} Filtered output sample.
     */
    process(input) {
        // Series processing
        const stage1 = this.preFilter.process(input);
        const stage2 = this.rlbFilter.process(stage1);
        return stage2;
    }
}

/**
 * Simple envelope follower with independent attack and release times.
 */
export class EnvelopeFollower {
    constructor() {
        this.envelope = 0;
        this.attCoeff = 0;
        this.relCoeff = 0;
        this.setParams(0.01, 0.1, 44100); // Default 10ms attack, 100ms release
    }

    /**
     * Sets the attack and release times.
     * @param {number} attackTime - Attack time in seconds.
     * @param {number} releaseTime - Release time in seconds.
     * @param {number} sampleRate - System sample rate.
     */
    setParams(attackTime, releaseTime, sampleRate) {
        const tAtt = Math.max(0.001, attackTime);
        const tRel = Math.max(0.001, releaseTime);

        // Simple one-pole coefficient
        this.attCoeff = Math.exp(-1.0 / (tAtt * sampleRate));
        this.relCoeff = Math.exp(-1.0 / (tRel * sampleRate));
    }

    /**
     * Processes a single input sample and returns current envelope level.
     * @param {number} input - Input sample.
     * @returns {number} Current envelope level.
     */
    process(input) {
        const absInput = Math.abs(input);
        
        // Attack phase: Input > Envelope
        if (absInput > this.envelope) {
            this.envelope = this.attCoeff * this.envelope + (1 - this.attCoeff) * absInput;
        } 
        // Release phase
        else {
            this.envelope = this.relCoeff * this.envelope + (1 - this.relCoeff) * absInput;
        }

        return this.envelope;
    }
}

/**
 * Circular buffer delay line with linear interpolation.
 */
export class DelayLine {
    /**
     * @param {number} maxDelaySeconds - Maximum delay time.
     * @param {number} sampleRate - System sample rate.
     */
    constructor(maxDelaySeconds, sampleRate) {
        this.size = Math.ceil(maxDelaySeconds * sampleRate);
        this.buffer = new Float32Array(this.size);
        this.writeIndex = 0;
    }

    /**
     * Writes a sample into the delay buffer.
     * @param {number} input - Input sample.
     */
    write(input) {
        this.buffer[this.writeIndex] = input;
        this.writeIndex = (this.writeIndex + 1) % this.size;
    }

    /**
     * Reads a delayed sample using linear interpolation.
     * @param {number} delaySamples - Delay time in samples (can be fractional).
     * @returns {number} Delayed sample.
     */
    read(delaySamples) {
        // Calculate read index
        let readPtr = this.writeIndex - delaySamples;
        while (readPtr < 0) readPtr += this.size;

        const i = Math.floor(readPtr);
        const f = readPtr - i; // Fractional part

        const i1 = i % this.size;
        const i2 = (i + 1) % this.size;

        const s1 = this.buffer[i1];
        const s2 = this.buffer[i2];

        // Linear interpolation: y = s1 + f * (s2 - s1)
        return s1 + f * (s2 - s1);
    }
}

/**
 * Basic sine-wave LFO.
 */
export class LFO {
    constructor() {
        this.phase = 0;
    }

    /**
     * Processes LFO and returns current sine value.
     * @param {number} frequency - LFO frequency in Hz.
     * @param {number} sampleRate - System sample rate.
     * @returns {number} Current LFO value [-1, 1].
     */
    process(frequency, sampleRate) {
        // Increment phase
        this.phase += (2 * Math.PI * frequency) / sampleRate;
        if (this.phase > 2 * Math.PI) this.phase -= 2 * Math.PI;
        
        return Math.sin(this.phase);
    }
}

/**
 * One-pole all-pass filter.
 */
export class OnePoleAllPass {
    constructor() {
        this.x1 = 0;
        this.y1 = 0;
    }

    /**
     * Processes a sample through the all-pass filter.
     * @param {number} input - Input sample.
     * @param {number} alpha - Filter coefficient.
     * @returns {number} Filtered output.
     */
    process(input, alpha) {
        // Standard one-pole all-pass filter:
        // y[n] = alpha * x[n] + x[n-1] - alpha * y[n-1]
        const output = alpha * input + this.x1 - alpha * this.y1;
        
        this.x1 = input;
        this.y1 = output;
        
        return output;
    }
}

