import { AudioWorkletNode, IAudioContext, IOfflineAudioContext, TAudioWorkletNodeConstructor } from "standardized-audio-context";

const AudioWorkletNodeBase = AudioWorkletNode as TAudioWorkletNodeConstructor;

/**
 * Node for the DeEsserNode effect.
 * Follows the Trinity Pattern.
 */
export class DeEsserNode extends AudioWorkletNodeBase<IAudioContext | IOfflineAudioContext> {
    constructor(context: IAudioContext | IOfflineAudioContext) {
        super(context, 'deesser-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            parameterData: {
                frequency: 6000,
                threshold: -20,
                ratio: 4,
                attack: 0.005,
                release: 0.05,
                monitor: 0,
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
