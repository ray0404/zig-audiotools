import { RackModule, RackModuleType } from "../types";

export const createDefaultModule = (type: RackModuleType, id?: string): RackModule => {
    let params: any = {};
    if (type === 'DYNAMIC_EQ') params = { frequency: 1000, gain: 0, Q: 1.0, threshold: -20, ratio: 2, attack: 0.01, release: 0.1 };
    else if (type === 'TRANSIENT_SHAPER') params = { attackGain: 0, sustainGain: 0, mix: 1 };
    else if (type === 'LIMITER') params = { threshold: -0.5, ceiling: -0.1, release: 0.1, lookahead: 5 };
    else if (type === 'MIDSIDE_EQ') params = { midGain: 0, midFreq: 1000, sideGain: 0, sideFreq: 1000 };
    else if (type === 'CAB_SIM') params = { irAssetId: '', mix: 1.0 };
    else if (type === 'SATURATION') params = { drive: 0.0, type: 1, outputGain: 0.0, mix: 1 };
    else if (type === 'DITHERING') params = { bitDepth: 24 };
    else if (type === 'PARAMETRIC_EQ') params = { lowFreq: 100, lowGain: 0, midFreq: 1000, midGain: 0, midQ: 0.707, highFreq: 5000, highGain: 0 };
    else if (type === 'DISTORTION') params = { drive: 1, wet: 1, type: 0, outputGain: 0 };
    else if (type === 'BITCRUSHER') params = { bits: 8, normFreq: 1, mix: 1 };
    else if (type === 'CHORUS') params = { frequency: 1.5, delayTime: 0.03, depth: 0.002, feedback: 0, wet: 0.5 };
    else if (type === 'PHASER') params = { stages: 4, frequency: 0.5, baseFrequency: 1000, octaves: 2, wet: 0.5 };
    else if (type === 'TREMOLO') params = { frequency: 4, depth: 0.5, spread: 0, waveform: 0, mix: 1 };
    else if (type === 'AUTOWAH') params = { baseFrequency: 100, sensitivity: 0.5, octaves: 4, Q: 2, attack: 0.01, release: 0.1, wet: 1 };
    else if (type === 'FEEDBACK_DELAY') params = { delayTime: 0.5, feedback: 0.3, wet: 0.5 };
    else if (type === 'COMPRESSOR') params = { threshold: -24, ratio: 4, attack: 0.01, release: 0.1, knee: 5, makeupGain: 0, mode: 0, mix: 1 };
    else if (type === 'DE_ESSER') params = { frequency: 6000, threshold: -20, ratio: 4, attack: 0.005, release: 0.05, monitor: 0, bypass: 0 };
    else if (type === 'STEREO_IMAGER') params = { lowFreq: 150, highFreq: 2500, widthLow: 0.0, widthMid: 1.0, widthHigh: 1.2, bypass: 0 };
    else if (type === 'MULTIBAND_COMPRESSOR') {
        params = {
            lowFreq: 150, highFreq: 2500,
            threshLow: -24, ratioLow: 4, attLow: 0.01, relLow: 0.1, gainLow: 0,
            threshMid: -24, ratioMid: 4, attMid: 0.01, relMid: 0.1, gainMid: 0,
            threshHigh: -24, ratioHigh: 4, attHigh: 0.01, relHigh: 0.1, gainHigh: 0,
            bypass: 0
        };
    }

    return {
        id: id || crypto.randomUUID(),
        type,
        bypass: false,
        parameters: params
    };
};
