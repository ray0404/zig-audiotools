import { AudioWorkletNode, IAudioContext, IOfflineAudioContext, TAudioWorkletNodeConstructor } from "standardized-audio-context";

const AudioWorkletNodeBase = AudioWorkletNode as TAudioWorkletNodeConstructor;

/**
 * Node for the TransientShaperNode effect.
 * Follows the Trinity Pattern.
 */
export class TransientShaperNode extends AudioWorkletNodeBase<IAudioContext | IOfflineAudioContext> {
    constructor(context: IAudioContext | IOfflineAudioContext) {
        super(context, 'transient-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            parameterData: {
                attackGain: 0,
                sustainGain: 0,
                mix: 1
            },
        });
    }

    /** Updates a module parameter with smoothing. */
  setParam(param: 'attackGain' | 'sustainGain' | 'mix', value: number) {
        const paramNode = this.parameters.get(param);
        if (paramNode) {
            paramNode.setTargetAtTime(value, this.context.currentTime, 0.01);
        }
    }
}
