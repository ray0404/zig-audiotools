import { AudioWorkletNode, IAudioContext, IOfflineAudioContext, TAudioWorkletNodeConstructor } from "standardized-audio-context";

const AudioWorkletNodeBase = AudioWorkletNode as TAudioWorkletNodeConstructor;

export interface SaturationOptions {
    drive?: number;
    type?: number; // 0: Tape, 1: Tube, 2: Fuzz
    outputGain?: number;
    mix?: number;
}
  
/**
 * Node for the SaturationNode effect.
 * Follows the Trinity Pattern.
 */
export class SaturationNode extends AudioWorkletNodeBase<IAudioContext | IOfflineAudioContext> {
    constructor(context: IAudioContext | IOfflineAudioContext) {
        super(context, 'saturation-processor');
    }

    static get parameterDescriptors() {
        return [
            { name: 'drive', defaultValue: 0.0, minValue: 0.0, maxValue: 10.0 },
            { name: 'type', defaultValue: 1, minValue: 0, maxValue: 2 },
            { name: 'outputGain', defaultValue: 0.0, minValue: -12.0, maxValue: 12.0 },
            { name: 'mix', defaultValue: 1.0, minValue: 0.0, maxValue: 1.0 }
        ];
    }

    /** Updates a module parameter with smoothing. */
  setParam(param: keyof SaturationOptions, value: number) {
        const p = this.parameters.get(param);
        if (p) {
            p.setTargetAtTime(value, this.context.currentTime, 0.01);
        }
    }
}
