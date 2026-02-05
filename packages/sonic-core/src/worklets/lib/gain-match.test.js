import { describe, it, expect } from 'vitest';
import { GainMatch } from './gain-match';

describe('GainMatch', () => {
    it('should initialize with defaults', () => {
        const gm = new GainMatch(44100);
        expect(gm.sampleRate).toBe(44100);
        expect(gm.rmsAlpha).toBeLessThan(1.0);
        expect(gm.rmsAlpha).toBeGreaterThan(0.0);
        expect(gm.currentGain).toBe(1.0);
    });

    it('should initialize with custom window size', () => {
        const gm1 = new GainMatch(44100, 100);
        const gm2 = new GainMatch(44100, 1000);
        // Larger window -> slower decay -> larger alpha (closer to 1)
        expect(gm2.rmsAlpha).toBeGreaterThan(gm1.rmsAlpha);
    });

    it('should calculate unity gain for identical signals', () => {
        const gm = new GainMatch(44100);

        // Feed identical signals for a while to stabilize
        // 1 second of audio
        for (let i = 0; i < 44100; i++) {
            gm.process(0.5, 0.5);
        }

        const gain = gm.process(0.5, 0.5);
        // Should be very close to 1.0
        expect(gain).toBeCloseTo(1.0, 4);
    });

    it('should boost gain when wet signal is quieter', () => {
        const gm = new GainMatch(44100, 10); // Fast RMS window for testing

        // Ref = 1.0, Wet = 0.5. Target gain = 2.0.
        let gain = 1.0;
        // Run for 1 second to allow smoothing (tau=100ms) to settle
        for (let i = 0; i < 44100; i++) {
            gain = gm.process(1.0, 0.5);
        }

        expect(gain).toBeCloseTo(2.0, 1);
    });

    it('should reduce gain when wet signal is louder', () => {
        const gm = new GainMatch(44100, 10);

        // Ref = 0.5, Wet = 1.0. Target gain = 0.5.
        let gain = 1.0;
        for (let i = 0; i < 44100; i++) {
            gain = gm.process(0.5, 1.0);
        }

        expect(gain).toBeCloseTo(0.5, 1);
    });

    it('should handle silence in reference (target gain 0)', () => {
        const gm = new GainMatch(44100);

        // Ref = 0, Wet = 0.5. Target gain -> 0.
        let gain = 1.0;
        for (let i = 0; i < 44100; i++) {
            gain = gm.process(0.0, 0.5);
        }

        expect(gain).toBeLessThan(0.01);
    });

    it('should handle silence in wet (avoid infinity)', () => {
        const gm = new GainMatch(44100);

        // Ref = 0.5, Wet = 0. Target gain -> High but capped/safe.
        let gain = 1.0;
        for (let i = 0; i < 44100; i++) {
            gain = gm.process(0.5, 0.0);
        }

        expect(gain).toBeGreaterThan(1.0);
        expect(gain).not.toBe(Infinity);
        expect(Number.isFinite(gain)).toBe(true);
    });

    it('should handle NaN input gracefully', () => {
        const gm = new GainMatch(44100);
        const initialGain = gm.currentGain;
        const gain = gm.process(NaN, 0.5);
        expect(gain).toBe(initialGain);
    });

    it('should reset state correctly', () => {
        const gm = new GainMatch(44100);
        gm.process(1.0, 0.5);
        expect(gm.currentGain).not.toBe(1.0);
        gm.reset();
        expect(gm.currentGain).toBe(1.0);
        expect(gm.refSumSquares).toBe(0);
        expect(gm.wetSumSquares).toBe(0);
    });
});
