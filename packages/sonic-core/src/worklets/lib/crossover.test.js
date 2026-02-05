
import { describe, it, expect } from 'vitest';
import { LinkwitzRiley4 } from './crossover.js';

describe('LinkwitzRiley4 Crossover', () => {
    const sampleRate = 48000;
    const cutoff = 1000;

    it('should initialize with correct parameters', () => {
        const lr4 = new LinkwitzRiley4(sampleRate, cutoff);
        expect(lr4.sampleRate).toBe(sampleRate);
        expect(lr4.cutoffFrequency).toBe(cutoff);
        expect(lr4.lp1).toBeDefined();
        expect(lr4.lp2).toBeDefined();
        expect(lr4.hp1).toBeDefined();
        expect(lr4.hp2).toBeDefined();
    });

    it('should process audio and return low and high bands', () => {
        const lr4 = new LinkwitzRiley4(sampleRate, cutoff);
        const output = lr4.process(0.5);
        expect(output).toHaveProperty('low');
        expect(output).toHaveProperty('high');
        expect(typeof output.low).toBe('number');
        expect(typeof output.high).toBe('number');
        expect(output.low).not.toBeNaN();
        expect(output.high).not.toBeNaN();
    });

    it('should update cutoff frequency', () => {
        const lr4 = new LinkwitzRiley4(sampleRate, cutoff);
        const newCutoff = 2000;
        lr4.setCutoff(newCutoff);
        expect(lr4.cutoffFrequency).toBe(newCutoff);
        // We assume updateFilters is called. Checking functional behavior would be better but this checks state.
    });

    it('should attenuate high frequencies in the low band', () => {
        const lr4 = new LinkwitzRiley4(sampleRate, cutoff);

        // Stabilize filters
        for(let i=0; i<100; i++) lr4.process(0);

        // Send high freq signal (well above cutoff)
        // 10kHz sine wave
        const freq = 10000;
        let maxLow = 0;
        for (let i = 0; i < 1000; i++) {
            const t = i / sampleRate;
            const input = Math.sin(2 * Math.PI * freq * t);
            const { low } = lr4.process(input);
            maxLow = Math.max(maxLow, Math.abs(low));
        }

        // Expect significant attenuation
        expect(maxLow).toBeLessThan(0.1);
    });

    it('should attenuate low frequencies in the high band', () => {
        const lr4 = new LinkwitzRiley4(sampleRate, cutoff);

        // Stabilize filters
        for(let i=0; i<100; i++) lr4.process(0);

        // Send low freq signal (well below cutoff)
        // 100Hz sine wave
        const freq = 100;
        let maxHigh = 0;
        for (let i = 0; i < 1000; i++) {
            const t = i / sampleRate;
            const input = Math.sin(2 * Math.PI * freq * t);
            const { high } = lr4.process(input);
            maxHigh = Math.max(maxHigh, Math.abs(high));
        }

        // Expect significant attenuation
        expect(maxHigh).toBeLessThan(0.1);
    });

    it('should have -6dB gain at cutoff frequency for both bands', () => {
        const lr4 = new LinkwitzRiley4(sampleRate, cutoff);

        // Stabilize
        for(let i=0; i<1000; i++) lr4.process(0);

        // Sine wave at cutoff frequency
        let maxLow = 0;
        let maxHigh = 0;
        // Run long enough to settle (step response of 4th order filter takes a bit)
        for (let i = 0; i < 48000; i++) {
            const t = i / sampleRate;
            const input = Math.sin(2 * Math.PI * cutoff * t);
            const { low, high } = lr4.process(input);

            // Measure steady state amplitude near end
            if (i > 40000) {
                maxLow = Math.max(maxLow, Math.abs(low));
                maxHigh = Math.max(maxHigh, Math.abs(high));
            }
        }

        // -6dB is amplitude 0.5
        // Allow some tolerance for discrete time implementation / biquad approx
        expect(maxLow).toBeCloseTo(0.5, 1);
        expect(maxHigh).toBeCloseTo(0.5, 1);
    });

    it('should sum to unity magnitude (approximately) across spectrum', () => {
         const lr4 = new LinkwitzRiley4(sampleRate, cutoff);

         // Use white noise
         // Note: Phase cancellation is key for LR filters.
         // LR4 sums to flat amplitude response: |H_low(w) + H_high(w)| = 1
         // (Specifically, they are in phase at all frequencies, so magnitudes add up)

         // Let's test at a few specific frequencies
         const frequencies = [100, 500, 1000, 2000, 10000];

         frequencies.forEach(f => {
             const lr = new LinkwitzRiley4(sampleRate, cutoff);
             // Settle
             for(let i=0; i<1000; i++) lr.process(0);

             let maxSum = 0;
             for(let i=0; i<sampleRate; i++) { // 1 second
                const t = i/sampleRate;
                const input = Math.sin(2 * Math.PI * f * t);
                const { low, high } = lr.process(input);
                if (i > sampleRate - 1000) {
                    // Sum the signals
                    const sum = low + high;
                    maxSum = Math.max(maxSum, Math.abs(sum));
                }
             }

             expect(maxSum).toBeCloseTo(1.0, 1);
         });
    });
});
