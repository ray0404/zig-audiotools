import { AudioWorkletNode, IAudioContext, IOfflineAudioContext, TAudioWorkletNodeConstructor } from "standardized-audio-context";

const AudioWorkletNodeBase = AudioWorkletNode as TAudioWorkletNodeConstructor;

export interface DitheringOptions {
    bitDepth?: number;
}
  
/**
 * Node for the DitheringNode effect.
 * Follows the Trinity Pattern.
 */
export class DitheringNode extends AudioWorkletNodeBase<IAudioContext | IOfflineAudioContext> {
    constructor(context: IAudioContext | IOfflineAudioContext) {
        super(context, 'dithering-processor');
    }

    static get parameterDescriptors() {
        return [
            { name: 'bitDepth', defaultValue: 24, minValue: 8, maxValue: 32 }
        ];
    }

    /** Updates a module parameter with smoothing. */
  setParam(param: keyof DitheringOptions, value: number) {
        const p = this.parameters.get(param);
        if (p) {
            p.setTargetAtTime(value, this.context.currentTime, 0.01);
        }
    }
}
