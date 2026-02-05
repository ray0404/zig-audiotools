export interface AudioStats {
  integratedLufs: number;
  truePeak: number;
}

export interface LoudnessPenaltyReport {
  spotify: number;
  youtube: number;
  appleMusic: number;
}

const PLATFORMS = {
  spotify: { lufs: -14, tp: -1.0 },
  youtube: { lufs: -14, tp: -1.0 },
  appleMusic: { lufs: -16, tp: -1.0 },
} as const;

/**
 * Calculates the loudness penalty (gain reduction) for major streaming platforms.
 *
 * The penalty is the gain reduction required to satisfy the stricter of the two constraints
 * (LUFS or True Peak).
 *
 * Formula: Math.min(TargetLUFS - IntegratedLUFS, LimitTP - TruePeak, 0)
 *
 * @param stats Object containing integrated LUFS and True Peak values.
 * @returns A report object containing the penalty (in dB) for each platform. Values are negative or 0.
 */
export function calculateLoudnessPenalty(stats: AudioStats): LoudnessPenaltyReport {
  const calculateForPlatform = (targetLufs: number, limitTp: number): number => {
    const lufsPenalty = targetLufs - stats.integratedLufs;
    const tpPenalty = limitTp - stats.truePeak;

    // We want the stricter penalty (most negative value), but capped at 0 (no boost).
    return Math.min(lufsPenalty, tpPenalty, 0);
  };

  return {
    spotify: calculateForPlatform(PLATFORMS.spotify.lufs, PLATFORMS.spotify.tp),
    youtube: calculateForPlatform(PLATFORMS.youtube.lufs, PLATFORMS.youtube.tp),
    appleMusic: calculateForPlatform(PLATFORMS.appleMusic.lufs, PLATFORMS.appleMusic.tp),
  };
}
