import { logger } from "@/utils/logger";
import { AudioWorkletNode, IAudioContext, IOfflineAudioContext, TAudioWorkletNodeConstructor } from "standardized-audio-context";

const AudioWorkletNodeBase = AudioWorkletNode as TAudioWorkletNodeConstructor;

/**
 * Node for the DynamicEQNode effect.
 * Follows the Trinity Pattern.
 */
export class DynamicEQNode extends AudioWorkletNodeBase<IAudioContext | IOfflineAudioContext> {
  public currentGainReduction: number = 0;

  constructor(context: IAudioContext | IOfflineAudioContext) {
    super(context, 'dynamic-eq-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2], // Default to stereo
      parameterData: {
        frequency: 1000,
        Q: 1.0,
        gain: 0,
        threshold: -20,
        ratio: 2,
        attack: 0.01,
        release: 0.1
      }
    });

    this.port.onmessage = (event) => {
      if (event.data.type === 'debug') {
        this.currentGainReduction = event.data.gainReduction;
      }
    };
  }

  // Helper to set parameters with automation support
  /** Updates a module parameter with smoothing. */
  setParam(paramName: string, value: number, timeConstant: number = 0) {
    const param = this.parameters.get(paramName);
    if (!param) {
      logger.warn(`[DynamicEQNode] Parameter '${paramName}' not found.`);
      return;
    }

    if (timeConstant > 0) {
      // Smooth transition
      param.setTargetAtTime(value, this.context.currentTime, timeConstant);
    } else {
      // Instant change
      param.setValueAtTime(value, this.context.currentTime);
    }
  }
}
