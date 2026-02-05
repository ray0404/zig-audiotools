import { describe, it, expect } from 'vitest';
import { 
    BiquadFilter, 
    EnvelopeFollower, 
    DelayLine, 
    LFO, 
    KWeightingFilter, 
    OnePoleAllPass 
} from './dsp-helpers';

describe('DSP Helpers Comprehensive', () => {
    describe('DelayLine', () => {
        it('should write and read back samples', () => {
            const delay = new DelayLine(1, 44100);
            delay.write(0.5);
            // Delay of 1 sample
            expect(delay.read(1)).toBe(0.5);
        });

        it('should handle linear interpolation for fractional delays', () => {
            const delay = new DelayLine(1, 10); // small buffer for testing
            // Fill buffer with 0.0, 1.0, 2.0...
            for (let i = 0; i < 10; i++) {
                delay.write(i);
            }
            // writeIndex is now 0 (wrapped)
            // Buffer: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
            
            // Read at delay 1.5
            // readPtr = 0 - 1.5 = -1.5 -> 8.5
            // i = 8, f = 0.5
            // i1 = 8, i2 = 9
            // result = buffer[8]*0.5 + buffer[9]*0.5 = 8*0.5 + 9*0.5 = 8.5
            expect(delay.read(1.5)).toBeCloseTo(8.5);
        });

        it('should handle circular wrapping correctly', () => {
            const delay = new DelayLine(0.1, 100); // 10 samples
            for (let i = 0; i < 15; i++) {
                delay.write(i); // write 0..14
            }
            // buffer: [10, 11, 12, 13, 14, 5, 6, 7, 8, 9]
            // writeIndex = 5
            expect(delay.read(1)).toBe(14);
            expect(delay.read(10)).toBe(5);
        });
    });

    describe('LFO', () => {
        it('should oscillate between -1 and 1', () => {
            const lfo = new LFO();
            const results = [];
            for (let i = 0; i < 100; i++) {
                results.push(lfo.process(100, 44100));
            }
            results.forEach(val => {
                expect(val).toBeGreaterThanOrEqual(-1.0000000001);
                expect(val).toBeLessThanOrEqual(1.0000000001);
            });
        });

        it('should complete a cycle at the expected frequency', () => {
            const sampleRate = 1000;
            const freq = 10; // 10 Hz
            const lfo = new LFO();
            // 1 cycle = 100 samples
            
            // Phase 0
            expect(lfo.process(freq, sampleRate)).toBeCloseTo(Math.sin(2 * Math.PI * freq / sampleRate));
            
            // Advance nearly a full cycle
            for (let i = 0; i < 98; i++) lfo.process(freq, sampleRate);
            
            const lastVal = lfo.process(freq, sampleRate);
            expect(lastVal).toBeCloseTo(0, 1); // Should be near zero again
        });
    });

    describe('KWeightingFilter', () => {
        it('should process without error', () => {
            const filter = new KWeightingFilter(44100);
            const out = filter.process(0.1);
            expect(out).not.toBeNaN();
            expect(typeof out).toBe('number');
        });
    });

    describe('OnePoleAllPass', () => {
        it('should maintain unit gain', () => {
            const ap = new OnePoleAllPass();
            const alpha = 0.5;
            let energy = 0;
            for (let i = 0; i < 1000; i++) {
                const input = Math.random() * 2 - 1;
                const output = ap.process(input, alpha);
                energy += (output * output) - (input * input);
            }
            // All-pass filter should preserve energy over time (long term)
            // but short term it might vary. 
            // Better check: it shouldn't explode.
            expect(energy / 1000).toBeCloseTo(0, 1);
        });
    });
});
