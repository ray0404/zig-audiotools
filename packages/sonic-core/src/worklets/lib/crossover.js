import { BiquadFilter } from './dsp-helpers.js';

/**
 * Linkwitz-Riley 4th Order Crossover
 *
 * Consists of two 2nd-order Butterworth filters cascaded for each band.
 * - Lowpass: 2x Butterworth Lowpass (Q=0.7071)
 * - Highpass: 2x Butterworth Highpass (Q=0.7071)
 *
 * At the cutoff frequency, both bands are at -6dB and sum to unity gain (0dB)
 * with perfect phase alignment.
 */
export class LinkwitzRiley4 {
    /**
     * @param {number} sampleRate - System sample rate.
     * @param {number} cutoffFrequency - Crossover frequency in Hz.
     */
    constructor(sampleRate, cutoffFrequency) {
        this.sampleRate = sampleRate;
        this.cutoffFrequency = cutoffFrequency;

        // Initialize filters
        // Low band chain
        this.lp1 = new BiquadFilter();
        this.lp2 = new BiquadFilter();

        // High band chain
        this.hp1 = new BiquadFilter();
        this.hp2 = new BiquadFilter();

        this.updateFilters();
    }

    /**
     * Updates the filter coefficients based on the current cutoff frequency.
     */
    updateFilters() {
        const Q = Math.SQRT1_2; // 1/sqrt(2) approx 0.70710678

        // Update Lowpass filters
        this.lp1.setParams(this.cutoffFrequency, 0, Q, this.sampleRate, 'lowpass');
        this.lp2.setParams(this.cutoffFrequency, 0, Q, this.sampleRate, 'lowpass');

        // Update Highpass filters
        this.hp1.setParams(this.cutoffFrequency, 0, Q, this.sampleRate, 'highpass');
        this.hp2.setParams(this.cutoffFrequency, 0, Q, this.sampleRate, 'highpass');
    }

    /**
     * Set a new cutoff frequency and update coefficients.
     * @param {number} frequency - New cutoff frequency in Hz.
     */
    setCutoff(frequency) {
        this.cutoffFrequency = frequency;
        this.updateFilters();
    }

    /**
     * Process a single sample through the crossover bands.
     * @param {number} input - Input sample.
     * @returns {{low: number, high: number}} Low and High band output samples.
     */
    process(input) {
        // Process Low Band: Input -> LP1 -> LP2
        const lowIntermediate = this.lp1.process(input);
        const low = this.lp2.process(lowIntermediate);

        // Process High Band: Input -> HP1 -> HP2
        const highIntermediate = this.hp1.process(input);
        const high = this.hp2.process(highIntermediate);

        return { low, high };
    }
}
