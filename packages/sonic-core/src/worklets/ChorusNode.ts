import { AudioWorkletNode, IAudioContext, IOfflineAudioContext, TAudioWorkletNodeConstructor } from "standardized-audio-context";

const AudioWorkletNodeBase = AudioWorkletNode as TAudioWorkletNodeConstructor;

/**
 * Node for the ChorusNode effect.
 * Follows the Trinity Pattern.
 */
export class ChorusNode extends AudioWorkletNodeBase<IAudioContext | IOfflineAudioContext> {
    constructor(context: IAudioContext | IOfflineAudioContext) {
        super(context, 'chorus-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            parameterData: { frequency: 1.5, delayTime: 0.03, depth: 0.002, feedback: 0, wet: 0.5 }
        });
    }
    /** Updates a module parameter with smoothing. */
  setParam(param: string, value: number) {
        const p = this.parameters.get(param);
        if (p) p.setTargetAtTime(value, this.context.currentTime, 0.01);
    }
}
