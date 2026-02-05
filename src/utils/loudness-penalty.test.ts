import { describe, it, expect } from 'vitest';
import { calculateLoudnessPenalty } from './loudness-penalty';

describe('calculateLoudnessPenalty', () => {
  it('returns 0 penalty when track matches target exactly', () => {
    // Spotify: -14 LUFS, -1.0 dBTP
    const result = calculateLoudnessPenalty({ integratedLufs: -14, truePeak: -1.0 });
    expect(result.spotify).toBe(0);
    // YouTube same as Spotify
    expect(result.youtube).toBe(0);
  });

  it('calculates correct penalty for LUFS violation', () => {
    // Spotify target -14. Track is -10 (4dB too loud).
    // TP is -2.0 (1dB headroom, compliant).
    const result = calculateLoudnessPenalty({ integratedLufs: -10, truePeak: -2.0 });
    // Expected: -14 - (-10) = -4
    expect(result.spotify).toBe(-4);
  });

  it('calculates correct penalty for True Peak violation', () => {
    // Spotify TP limit -1.0. Track is +1.0 (2dB too loud).
    // LUFS is -20 (6dB quiet).
    const result = calculateLoudnessPenalty({ integratedLufs: -20, truePeak: 1.0 });
    // Expected: -1.0 - 1.0 = -2.0
    expect(result.spotify).toBe(-2.0);
  });

  it('applies the stricter of the two penalties (LUFS case)', () => {
    // Spotify: -14 LUFS, -1.0 dBTP
    // Track: -10 LUFS (4dB over), +2.0 dBTP (3dB over)
    // LUFS penalty: -4.0
    // TP penalty: -3.0
    // Stricter (more negative) is -4.0
    const result = calculateLoudnessPenalty({ integratedLufs: -10, truePeak: 2.0 });
    expect(result.spotify).toBe(-4.0);
  });

  it('applies the stricter of the two penalties (TP case)', () => {
    // Spotify: -14 LUFS, -1.0 dBTP
    // Track: -13 LUFS (1dB over), +2.0 dBTP (3dB over)
    // LUFS penalty: -1.0
    // TP penalty: -3.0
    // Stricter (more negative) is -3.0
    const result = calculateLoudnessPenalty({ integratedLufs: -13, truePeak: 2.0 });
    expect(result.spotify).toBe(-3.0);
  });

  it('returns 0 if track is quieter than target', () => {
    // Spotify: -14 LUFS, -1.0 dBTP
    // Track: -20 LUFS, -5.0 dBTP
    const result = calculateLoudnessPenalty({ integratedLufs: -20, truePeak: -5.0 });
    expect(result.spotify).toBe(0);
    expect(result.youtube).toBe(0);
    expect(result.appleMusic).toBe(0);
  });

  it('handles Apple Music specific targets correctly', () => {
    // Apple Music: -16 LUFS, -1.0 dBTP
    // Track: -15 LUFS (1dB over for Apple, compliant for Spotify -14)
    // TP: -2.0 (compliant)
    const result = calculateLoudnessPenalty({ integratedLufs: -15, truePeak: -2.0 });
    expect(result.appleMusic).toBe(-1.0);
    expect(result.spotify).toBe(0);
  });

  it('handles floating point precision reasonably', () => {
     // Just checking it works with decimals
     const result = calculateLoudnessPenalty({ integratedLufs: -13.5, truePeak: -0.5 });
     // Spotify (-14): -14 - (-13.5) = -0.5
     // TP (-1.0): -1.0 - (-0.5) = -0.5
     expect(result.spotify).toBeCloseTo(-0.5);
  });
});
