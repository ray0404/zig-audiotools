export type RackModuleType = 'DYNAMIC_EQ' | 'TRANSIENT_SHAPER' | 'LIMITER' | 'MIDSIDE_EQ' | 'CAB_SIM' | 'LOUDNESS_METER' | 'SATURATION' | 'DITHERING' | 'PARAMETRIC_EQ' | 'DISTORTION' | 'BITCRUSHER' | 'CHORUS' | 'PHASER' | 'TREMOLO' | 'AUTOWAH' | 'FEEDBACK_DELAY' | 'COMPRESSOR' | 'DE_ESSER' | 'STEREO_IMAGER' | 'MULTIBAND_COMPRESSOR' |
  'DE_CLIP' | 'PHASE_ROTATION' | 'SPECTRAL_DENOISE' | 'MONO_BASS' | 'PLOSIVE_GUARD' | 'VOICE_ISOLATE' | 'SMART_LEVEL' | 'DE_BLEED' | 'TAPE_STABILIZER' | 'ECHO_VANISH';

export interface RackModule {
  id: string;
  type: RackModuleType;
  bypass: boolean;
  parameters: Record<string, any>;
}

export interface TrackState {
  id: string;
  name: string;
  color: string;
  volume: number;
  pan: number;
  isMuted: boolean;
  isSoloed: boolean;
  rack: RackModule[];
  sends: Record<string, number>;
  sourceDuration: number;
  sourceName?: string;
}

export interface AudioAnalysis {
  loudness: {
      integrated: number;     // LUFS (Target -14)
      shortTermMax: number;   // LUFS
      momentaryMax: number;   // LUFS
      range: number;          // LRA (Target < 8-12 for modern styles)
  };
  dynamics: {
      truePeak: number;       // dBTP
      rms: number;            // dB
      crestFactor: number;    // dB (Micro-dynamics)
  };
  stereo: {
      correlation: number;    // -1 to +1
      width: number;          // 0 (Mono) to 1 (Sides only)
      balance: number;        // -1 (L) to +1 (R)
  };
  spectral: {
      low: number;            // < 250Hz ratio
      mid: number;            // 250Hz - 4kHz ratio
      high: number;           // > 4kHz ratio
      dcOffset: number;       // DC amplitude
  };
}
