import { AudioWorkletNode, IAudioContext, IOfflineAudioContext, TAudioWorkletNodeConstructor } from "standardized-audio-context";
import { logger } from "@/utils/logger";

export interface ParametricEQOptions {
    lowFreq: number;
    lowGain: number;
    midFreq: number;
    midGain: number;
    midQ: number;
    highFreq: number;
    highGain: number;
}

const AudioWorkletNodeBase = AudioWorkletNode as TAudioWorkletNodeConstructor;

/**
 * Node for the ParametricEQNode effect.
 * Follows the Trinity Pattern.
 */
export class ParametricEQNode extends AudioWorkletNodeBase<IAudioContext | IOfflineAudioContext> {
    constructor(context: IAudioContext | IOfflineAudioContext) {
        super(context, 'parametric-eq-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [2],
            parameterData: {
                lowFreq: 100,
                lowGain: 0,
                midFreq: 1000,
                midGain: 0,
                midQ: 0.707,
                highFreq: 5000,
                highGain: 0
            }
        });
    }

    /** Updates a module parameter with smoothing. */
  setParam(paramName: string, value: number, timeConstant: number = 0.01) {
        const param = this.parameters.get(paramName);
        if (!param) {
            logger.warn(`[ParametricEQNode] Parameter '${paramName}' not found.`);
            return;
        }

        if (timeConstant > 0) {
            param.setTargetAtTime(value, this.context.currentTime, timeConstant);
        } else {
            param.setValueAtTime(value, this.context.currentTime);
        }
    }
}