import { AudioWorkletNode, IAudioContext, IOfflineAudioContext, TAudioWorkletNodeConstructor } from "standardized-audio-context";

const AudioWorkletNodeBase = AudioWorkletNode as TAudioWorkletNodeConstructor;

/**
 * Node for the StereoImagerNode effect.
 * Follows the Trinity Pattern.
 */
export class StereoImagerNode extends AudioWorkletNodeBase<IAudioContext | IOfflineAudioContext> {
    constructor(context: IAudioContext | IOfflineAudioContext) {
        super(context, 'stereo-imager-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            parameterData: {
                lowFreq: 150,
                highFreq: 2500,
                widthLow: 0.0,
                widthMid: 1.0,
                widthHigh: 1.2,
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
