import { describe, it, expect } from 'vitest';
import { Saturator } from './saturation.js';

describe('Saturator DSP', () => {
    const saturator = new Saturator();

    it('should pass through silence correctly', () => {
        expect(saturator.process(0, 1.0, Saturator.TYPE_TAPE)).toBe(0);
        expect(saturator.process(0, 1.0, Saturator.TYPE_TUBE)).toBe(0);
        expect(saturator.process(0, 1.0, Saturator.TYPE_FUZZ)).toBe(0);
    });

    it('should implement Tape saturation (tanh)', () => {
        // Tape is type 0
        const input = 0.5;
        // Saturator.process(input, drive, ...) does `x = input * drive`.
        const expected = Math.tanh(input);
        expect(saturator.process(input, 1.0, Saturator.TYPE_TAPE)).toBeCloseTo(expected);
    });

    it('should implement Tube saturation (asymmetric)', () => {
        // Tube is type 1
        // Positive input -> tanh
        expect(saturator.process(0.5, 1.0, Saturator.TYPE_TUBE)).toBeCloseTo(Math.tanh(0.5));

        // Negative input -> x / (1 + |x|)
        const negInput = -0.5;
        const expected = negInput / (1 + Math.abs(negInput));
        expect(saturator.process(negInput, 1.0, Saturator.TYPE_TUBE)).toBeCloseTo(expected);
    });

    it('should implement Fuzz saturation (hard clipping)', () => {
        // Fuzz is type 2
        // Within range
        expect(saturator.process(0.5, 1.0, Saturator.TYPE_FUZZ)).toBe(0.5);

        // Clipping
        expect(saturator.process(1.5, 1.0, Saturator.TYPE_FUZZ)).toBe(1.0);
        expect(saturator.process(-1.5, 1.0, Saturator.TYPE_FUZZ)).toBe(-1.0);
    });

    it('should apply drive correctly', () => {
        // With drive=2.0, input 0.5 becomes 1.0
        // Tape (type 0) at 1.0 -> tanh(1.0)
        expect(saturator.process(0.5, 2.0, Saturator.TYPE_TAPE)).toBeCloseTo(Math.tanh(1.0));
    });

    it('should fallback to Tape for unknown types', () => {
        expect(saturator.process(0.5, 1.0, 99)).toBeCloseTo(Math.tanh(0.5));
    });
});
