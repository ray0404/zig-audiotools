export type RackModuleType = 'DYNAMIC_EQ' | 'TRANSIENT_SHAPER' | 'LIMITER' | 'MIDSIDE_EQ' | 'CAB_SIM' | 'LOUDNESS_METER' | 'SATURATION' | 'DITHERING' | 'PARAMETRIC_EQ' | 'DISTORTION' | 'BITCRUSHER' | 'CHORUS' | 'PHASER' | 'TREMOLO' | 'AUTOWAH' | 'FEEDBACK_DELAY' | 'COMPRESSOR' | 'DE_ESSER' | 'STEREO_IMAGER' | 'MULTIBAND_COMPRESSOR';

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
