// This file acts as a central registry for module parameter definitions.
// In a more advanced system, this could be auto-generated from the worklet processors.

export interface ParamDescriptor {
  name: string;
  defaultValue: number;
  minValue: number;
  maxValue: number;
}

export interface ModuleDescriptor {
  type: string;
  params: ParamDescriptor[];
}

const DESCRIPTORS: Record<string, Omit<ModuleDescriptor, 'type'>> = {
  COMPRESSOR: {
    params: [
      { name: 'threshold', defaultValue: -24, minValue: -60, maxValue: 0 },
      { name: 'ratio', defaultValue: 4, minValue: 1, maxValue: 20 },
      { name: 'attack', defaultValue: 0.01, minValue: 0.0001, maxValue: 1 },
      { name: 'release', defaultValue: 0.1, minValue: 0.001, maxValue: 2 },
      { name: 'knee', defaultValue: 5, minValue: 0, maxValue: 20 },
      { name: 'makeupGain', defaultValue: 0, minValue: 0, maxValue: 24 },
      { name: 'mix', defaultValue: 1, minValue: 0, maxValue: 1 },
    ],
  },
  SATURATION: {
    params: [
      { name: 'drive', defaultValue: 0.5, minValue: 0, maxValue: 1 },
      { name: 'outputGain', defaultValue: 0, minValue: -24, maxValue: 24 },
      { name: 'mix', defaultValue: 1, minValue: 0, maxValue: 1 },
    ],
  },
  PARAMETRIC_EQ: {
    params: [
        { name: 'lowFreq', defaultValue: 250, minValue: 20, maxValue: 1000 },
        { name: 'lowGain', defaultValue: 0, minValue: -24, maxValue: 24 },
        { name: 'midFreq', defaultValue: 1000, minValue: 200, maxValue: 5000 },
        { name: 'midGain', defaultValue: 0, minValue: -24, maxValue: 24 },
        { name: 'midQ', defaultValue: 1, minValue: 0.1, maxValue: 10 },
        { name: 'highFreq', defaultValue: 4000, minValue: 2000, maxValue: 20000 },
        { name: 'highGain', defaultValue: 0, minValue: -24, maxValue: 24 },
    ]
  },
  LIMITER: {
      params: [
          { name: 'threshold', defaultValue: -6, minValue: -60, maxValue: 0 },
          { name: 'release', defaultValue: 0.05, minValue: 0.001, maxValue: 2 },
      ]
  },
  TREMOLO: {
      params: [
          { name: 'frequency', defaultValue: 4, minValue: 0.1, maxValue: 20 },
          { name: 'depth', defaultValue: 0.5, minValue: 0, maxValue: 1 },
          { name: 'spread', defaultValue: 0, minValue: -1, maxValue: 1 },
          { name: 'waveform', defaultValue: 0, minValue: 0, maxValue: 3 }, // 0:Sine, 1:Tri, 2:Saw, 3:Square
          { name: 'mix', defaultValue: 1, minValue: 0, maxValue: 1 }
      ]
  },
  BITCRUSHER: {
      params: [
          { name: 'bits', defaultValue: 8, minValue: 1, maxValue: 16 },
          { name: 'normFreq', defaultValue: 1, minValue: 0.01, maxValue: 1 },
          { name: 'mix', defaultValue: 1, minValue: 0, maxValue: 1 }
      ]
  },
  CHORUS: {
      params: [
          { name: 'frequency', defaultValue: 1.5, minValue: 0.1, maxValue: 10 },
          { name: 'delayTime', defaultValue: 0.03, minValue: 0, maxValue: 0.1 },
          { name: 'depth', defaultValue: 0.002, minValue: 0, maxValue: 0.01 },
          { name: 'feedback', defaultValue: 0, minValue: 0, maxValue: 0.95 },
          { name: 'wet', defaultValue: 0.5, minValue: 0, maxValue: 1 }
      ]
  },
  DISTORTION: {
      params: [
          { name: 'drive', defaultValue: 1, minValue: 0, maxValue: 10 }, // Can go higher
          { name: 'wet', defaultValue: 1, minValue: 0, maxValue: 1 },
          { name: 'type', defaultValue: 0, minValue: 0, maxValue: 2 },
          { name: 'outputGain', defaultValue: 0, minValue: -24, maxValue: 24 }
      ]
  },
  FEEDBACK_DELAY: {
      params: [
          { name: 'delayTime', defaultValue: 0.5, minValue: 0, maxValue: 2 },
          { name: 'feedback', defaultValue: 0.3, minValue: 0, maxValue: 0.95 },
          { name: 'wet', defaultValue: 0.5, minValue: 0, maxValue: 1 }
      ]
  },
  AUTOWAH: {
      params: [
          { name: 'baseFrequency', defaultValue: 100, minValue: 20, maxValue: 5000 },
          { name: 'sensitivity', defaultValue: 0.5, minValue: 0, maxValue: 1 },
          { name: 'octaves', defaultValue: 4, minValue: 0, maxValue: 8 },
          { name: 'Q', defaultValue: 2, minValue: 0.1, maxValue: 20 },
          { name: 'attack', defaultValue: 0.01, minValue: 0.001, maxValue: 1 },
          { name: 'release', defaultValue: 0.1, minValue: 0.01, maxValue: 2 },
          { name: 'wet', defaultValue: 1, minValue: 0, maxValue: 1 }
      ]
  },
  PHASER: {
      params: [
          { name: 'stages', defaultValue: 4, minValue: 2, maxValue: 12 },
          { name: 'frequency', defaultValue: 0.5, minValue: 0.1, maxValue: 20 },
          { name: 'baseFrequency', defaultValue: 1000, minValue: 20, maxValue: 5000 },
          { name: 'octaves', defaultValue: 2, minValue: 0, maxValue: 8 },
          { name: 'wet', defaultValue: 0.5, minValue: 0, maxValue: 1 }
      ]
  },
  STEREO_IMAGER: {
      params: [
          { name: 'lowFreq', defaultValue: 150, minValue: 20, maxValue: 1000 },
          { name: 'highFreq', defaultValue: 2500, minValue: 1000, maxValue: 20000 },
          { name: 'widthLow', defaultValue: 0, minValue: 0, maxValue: 2 },
          { name: 'widthMid', defaultValue: 1, minValue: 0, maxValue: 2 },
          { name: 'widthHigh', defaultValue: 1.2, minValue: 0, maxValue: 2 },
          { name: 'bypass', defaultValue: 0, minValue: 0, maxValue: 1 }
      ]
  },
  TRANSIENT_SHAPER: {
      params: [
          { name: 'attackGain', defaultValue: 0, minValue: -24, maxValue: 24 },
          { name: 'sustainGain', defaultValue: 0, minValue: -24, maxValue: 24 },
          { name: 'mix', defaultValue: 1, minValue: 0, maxValue: 1 }
      ]
  },
  MIDSIDE_EQ: {
      params: [
          { name: 'midGain', defaultValue: 0, minValue: -24, maxValue: 24 },
          { name: 'midFreq', defaultValue: 1000, minValue: 20, maxValue: 20000 },
          { name: 'sideGain', defaultValue: 0, minValue: -24, maxValue: 24 },
          { name: 'sideFreq', defaultValue: 1000, minValue: 20, maxValue: 20000 }
      ]
  },
  DYNAMIC_EQ: {
      params: [
        { name: 'frequency', defaultValue: 1000, minValue: 20, maxValue: 20000 },
        { name: 'Q', defaultValue: 1, minValue: 0.1, maxValue: 10 },
        { name: 'gain', defaultValue: 0, minValue: -24, maxValue: 24 },
        { name: 'threshold', defaultValue: -20, minValue: -60, maxValue: 0 },
        { name: 'ratio', defaultValue: 2, minValue: 1, maxValue: 20 },
        { name: 'attack', defaultValue: 0.01, minValue: 0.001, maxValue: 1 },
        { name: 'release', defaultValue: 0.1, minValue: 0.01, maxValue: 2 }
      ]
  },
  DEESSER: {
      params: [
          { name: 'frequency', defaultValue: 6000, minValue: 2000, maxValue: 10000 },
          { name: 'threshold', defaultValue: -20, minValue: -60, maxValue: 0 },
          { name: 'ratio', defaultValue: 4, minValue: 1, maxValue: 20 },
          { name: 'attack', defaultValue: 0.005, minValue: 0.001, maxValue: 0.1 },
          { name: 'release', defaultValue: 0.05, minValue: 0.01, maxValue: 0.5 },
          { name: 'monitor', defaultValue: 0, minValue: 0, maxValue: 1 },
          { name: 'bypass', defaultValue: 0, minValue: 0, maxValue: 1 }
      ]
  },
  MULTIBAND_COMPRESSOR: {
      params: [
          { name: 'lowFreq', defaultValue: 150, minValue: 20, maxValue: 1000 },
          { name: 'highFreq', defaultValue: 2500, minValue: 1000, maxValue: 20000 },
          { name: 'threshLow', defaultValue: -24, minValue: -60, maxValue: 0 },
          { name: 'ratioLow', defaultValue: 4, minValue: 1, maxValue: 20 },
          { name: 'gainLow', defaultValue: 0, minValue: -24, maxValue: 24 },
          { name: 'threshMid', defaultValue: -24, minValue: -60, maxValue: 0 },
          { name: 'ratioMid', defaultValue: 4, minValue: 1, maxValue: 20 },
          { name: 'gainMid', defaultValue: 0, minValue: -24, maxValue: 24 },
          { name: 'threshHigh', defaultValue: -24, minValue: -60, maxValue: 0 },
          { name: 'ratioHigh', defaultValue: 4, minValue: 1, maxValue: 20 },
          { name: 'gainHigh', defaultValue: 0, minValue: -24, maxValue: 24 },
          { name: 'bypass', defaultValue: 0, minValue: 0, maxValue: 1 }
      ]
  }
};

export const getModuleDescriptors = (): Record<string, ModuleDescriptor> => {
    const result: Record<string, ModuleDescriptor> = {};
    for (const type in DESCRIPTORS) {
        result[type] = {
            type,
            ...DESCRIPTORS[type]
        };
    }
    return result;
};

export const getAvailableModuleTypes = (): string[] => {
    return Object.keys(DESCRIPTORS);
};