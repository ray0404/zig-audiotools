import { logger } from "@/utils/logger";

/**
 * A strongly-typed wrapper around the AudioWorkletNode.
 * Allows the main thread to communicate with the DSP code.
 */
export class SonicGainNode extends AudioWorkletNode {
  constructor(context: AudioContext) {
    super(context, 'sonic-gain-processor', {
      parameterData: { gain: 0.8 } // Default startup gain
    });

    // Handle messages from the processor (optional)
    this.port.onmessage = (event) => {
      logger.debug(`[SonicGainNode] Message from DSP:`, event.data);
    };
  }

  /**
   * Set the gain value (0.0 to 1.0)
   * @param value
   * @param time optional time to schedule the change
   */
  setGain(value: number, time: number = 0) {
    const gainParam = this.parameters.get('gain');
    if (gainParam) {
      // Use exponential ramp for smooth audio transitions
      // We clamp to a tiny non-zero value because exponentialRampToValueAtTime fails with 0
      const target = Math.max(0.0001, Math.min(1.0, value));
      if (time > 0) {
         gainParam.exponentialRampToValueAtTime(target, time);
      } else {
         gainParam.setValueAtTime(target, this.context.currentTime);
      }
    }
  }
}
