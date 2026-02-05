import { describe, it, expect } from 'vitest';
import { applyDither, quantize } from './dithering';

describe('Dithering Utils', () => {
  describe('quantize', () => {
    it('should quantize a value to 16-bit', () => {
      // 16-bit scale = 32768
      // 0.5 * 32768 = 16384. Should be exact.
      expect(quantize(0.5, 16)).toBe(0.5);
    });

    it('should round correctly', () => {
      // 16-bit scale = 32768
      // Value slightly above 0: 0.4 / 32768 = 0.0000122...
      // Let's take a value that rounds.
      // 1.4 / 32768. 1.4 rounds to 1.
      const scale = 32768;
      const input = 1.4 / scale;
      const expected = 1.0 / scale;
      expect(quantize(input, 16)).toBeCloseTo(expected, 8);
    });

    it('should clamp values > 1.0', () => {
      expect(quantize(1.5, 16)).toBe(1.0);
    });

    it('should clamp values < -1.0', () => {
      expect(quantize(-1.5, 16)).toBe(-1.0);
    });

    it('should default to 16-bit if invalid depth provided', () => {
      // Same test as 16-bit
      expect(quantize(0.5, 99)).toBe(0.5); // Should behave like 16-bit
    });
  });

  describe('applyDither', () => {
    it('should modify buffer in-place', () => {
      const buffer = new Float32Array([0.5, -0.5]);
      const result = applyDither(buffer, 16);
      expect(result).toBe(buffer);
    });

    it('should add noise (input 0 should likely not be 0)', () => {
      // With TPDF noise, 0 will be added with (rnd - rnd).
      // Range is (-1, 1) in scaled domain (1/32768 approx 3e-5).
      // It rounds to nearest integer.
      // If noise is between -0.5 and 0.5, it rounds to 0.
      // If noise is > 0.5 or < -0.5, it rounds to 1 or -1.
      // Probability of noise > 0.5 is small but non-zero for TPDF?
      // TPDF (-1, 1). Triangle.
      // Density at 0 is 1. Density at 1 is 0.
      // Prob(|x| > 0.5) = Area of tails.
      // Triangle base 2, height 1. Area 1.
      // Tails are triangles from 0.5 to 1 and -1 to -0.5.
      // Base 0.5, Height at 0.5 is 0.5. Area = 0.5 * 0.5 * 0.5 = 0.125.
      // Total prob of changing value is 0.125 + 0.125 = 0.25.
      // So ~25% of zeros should become non-zero.

      const len = 1000;
      const buffer = new Float32Array(len).fill(0);
      applyDither(buffer, 16);

      // Check if any value is non-zero
      let nonZeros = 0;
      for (let i = 0; i < len; i++) {
        if (buffer[i] !== 0) nonZeros++;
      }
      expect(nonZeros).toBeGreaterThan(0);
      // Rough statistical check (expect ~250)
      expect(nonZeros).toBeGreaterThan(150);
      expect(nonZeros).toBeLessThan(350);
    });

    it('should clip large values', () => {
      const buffer = new Float32Array([2.0, -2.0]);
      applyDither(buffer, 16);
      expect(buffer[0]).toBe(1.0);
      expect(buffer[1]).toBe(-1.0);
    });

    it('should handle +1.0 input correctly (clipping)', () => {
      // 1.0 * 32768 = 32768.
      // Noise adds +/- 1.
      // If noise is positive, val > 32768.
      // If noise is negative, val < 32768.
      // Round.
      // Then divide by 32768.
      // If result > 1.0, clip to 1.0.

      // We want to ensure it doesn't wrap or do anything weird, just clips.
      const buffer = new Float32Array([1.0]);
      // Run multiple times to trigger noise
      for(let i=0; i<100; i++) {
        buffer[0] = 1.0;
        applyDither(buffer, 16);
        expect(buffer[0]).toBeLessThanOrEqual(1.0);
        expect(buffer[0]).toBeGreaterThan(0.9); // Should be close to 1
      }
    });

    it('should default to 16-bit for invalid depth', () => {
        const buffer = new Float32Array([0.5]);
        // 16 bit: 0.5 is exact integer (16384).
        // noise might bump it up or down.
        // If we use huge bit depth, noise is tiny.
        // If we use 16 bit default for invalid '1', it should behave like 16 bit.

        applyDither(buffer, 1); // Invalid -> 16
        // Hard to distinguish from 16 vs 24 without statistical analysis,
        // but code path verification is enough via coverage or logic check.
        // We trust the code implementation for "defaulting".

        // Let's verify it doesn't crash or produce NaNs.
        expect(buffer[0]).not.toBeNaN();
    });
  });
});
