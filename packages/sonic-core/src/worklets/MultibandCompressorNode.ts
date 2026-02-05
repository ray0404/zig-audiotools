import { AudioWorkletNode, IAudioContext, IOfflineAudioContext, TAudioWorkletNodeConstructor } from "standardized-audio-context";

const AudioWorkletNodeBase = AudioWorkletNode as TAudioWorkletNodeConstructor;

/**
 * Node for the MultibandCompressorNode effect.
 * Follows the Trinity Pattern.
 */
export class MultibandCompressorNode extends AudioWorkletNodeBase<IAudioContext | IOfflineAudioContext> {
    constructor(context: IAudioContext | IOfflineAudioContext) {
        super(context, 'multiband-compressor-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            parameterData: {
                lowFreq: 150,
                highFreq: 2500,
                
                threshLow: -24, ratioLow: 4, attLow: 0.01, relLow: 0.1, gainLow: 0,
                threshMid: -24, ratioMid: 4, attMid: 0.01, relMid: 0.1, gainMid: 0,
                threshHigh: -24, ratioHigh: 4, attHigh: 0.01, relHigh: 0.1, gainHigh: 0,
                
                bypass: 0
            }
        });
    }

    /** Updates a module parameter with smoothing. */
  setParam(param: string, value: number) {
        const p = this.parameters.get(param);
        if (p) p.setTargetAtTime(value, this.context.currentTime, 0.01);
    }
}
