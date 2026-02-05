import { DelayLine, EnvelopeFollower } from './lib/dsp-helpers.js';

class LimiterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -0.5, minValue: -60, maxValue: 0 },
      { name: 'ceiling', defaultValue: -0.1, minValue: -20, maxValue: 0 },
      { name: 'release', defaultValue: 0.1, minValue: 0.001, maxValue: 1 },
      { name: 'lookahead', defaultValue: 5, minValue: 0, maxValue: 20 } // ms
    ];
  }

  constructor() {
    super();
    this.channelState = [];
    this.framesProcessed = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !output) return true;

    // Get parameters
    const thresholdDb = parameters.threshold.length > 1 ? parameters.threshold[0] : parameters.threshold[0];
    const ceilingDb = parameters.ceiling.length > 1 ? parameters.ceiling[0] : parameters.ceiling[0];
    const releaseTime = parameters.release.length > 1 ? parameters.release[0] : parameters.release[0];
    const lookaheadMs = parameters.lookahead.length > 1 ? parameters.lookahead[0] : parameters.lookahead[0];

    // Initialize state
    if (this.channelState.length < input.length) {
      for (let i = this.channelState.length; i < input.length; i++) {
        this.channelState.push({
          delay: new DelayLine(0.050, sampleRate), // Max 50ms buffer
          env: new EnvelopeFollower()
        });
      }
    }

    const thresholdLinear = Math.pow(10, thresholdDb / 20);
    const ceilingLinear = Math.pow(10, ceilingDb / 20);
    
    // Lookahead in samples
    const lookaheadSamples = Math.floor((lookaheadMs / 1000) * sampleRate);
    
    // Attack is usually very fast for limiters
    const attackTime = 0.001; 

    let maxGainReduction = 0;

    for (let channel = 0; channel < input.length; channel++) {
      const inputData = input[channel];
      const outputData = output[channel];
      const state = this.channelState[channel];
      
      // Update envelope params
      state.env.setParams(attackTime, releaseTime, sampleRate);

      for (let i = 0; i < inputData.length; i++) {
        const sample = inputData[i];

        // 1. Write current sample to delay line (for audio path)
        state.delay.write(sample);

        // 2. Sidechain Analysis (Lookahead path)
        // We analyze the *current* sample (which is "future" compared to the delayed output)
        // Check amplitude
        const absInput = Math.abs(sample);
        
        // 3. Envelope Follower (Detect Peak)
        // We want to detect if the *future* signal exceeds threshold
        // But we actually want the gain reduction to apply *when that signal arrives* at output.
        // Standard Lookahead Limiter:
        //  - Delay Audio by N
        //  - Analyze Input (Lookahead)
        //  - If Input > Threshold, ramp down gain.
        //  - Because we are analyzing "N" samples early, the gain reduction envelope has time to attack *before* the peak hits the output.
        //  - This implies we might need to delay the *envelope* control signal relative to the audio?
        //  - Actually, simpler:
        //    Input -> Delay -> Output
        //    Input -> Envelope -> GR Calculation -> Multiply Output
        
        const envLevel = state.env.process(sample);
        
        // Calculate required gain to stay under threshold
        let targetGain = 1.0;
        if (envLevel > thresholdLinear) {
            targetGain = thresholdLinear / envLevel;
        }
        
        // We can apply Ceiling here too:
        // Final Output = Sample * Gain * (Ceiling / Threshold) ?
        // Usually: Limiter clamps to Threshold, then Post-Gain boosts/cuts to Ceiling.
        // If Threshold = -10dB, Ceiling = -1dB. We limit to -10, then add +9dB makeup.
        // Here, let's keep it simple: "Limit to Threshold". Then apply makeup gain to match Ceiling?
        // Or "Ceiling" IS the threshold, and "Threshold" is just the input gain drive?
        // The Blueprint says: "If amplitude > threshold, calculate reduction."
        // Let's assume standard behavior: Limit peaks to 'Ceiling'.
        // 'Threshold' in many limiters (like L2) acts as "Input Drive" + "Limit at Ceiling".
        // But here, let's stick to the prompt's likely intent: 
        // "Threshold": The level above which we compress.
        // "Ceiling": The absolute max output level.
        
        // Let's implement: Compress anything above Threshold.
        // AND Clamp the max output to Ceiling.
        // This is tricky in one go.
        // Simplified Logic:
        // Target Gain reduces signal so it doesn't exceed 'Threshold'.
        // Then we can apply a fixed Makeup Gain or just output that.
        // Let's just implement Hard Limiting to 'Threshold' for now using the envelope.
        
        // Refined Logic based on "standard" lookahead limiter:
        // The gain reduction signal follows the envelope of the input.
        // If input peaks, we want gain to dip.
        
        // Current Gain Reduction for this sample
        let gain = 1.0;
        if (envLevel > thresholdLinear) {
            gain = thresholdLinear / envLevel;
        }

        // Apply Ceiling?
        // If we limit to Threshold, the peak is now at Threshold.
        // If Ceiling != Threshold, we apply makeup.
        // makeUp = ceiling / threshold
        const makeUp = ceilingLinear / thresholdLinear;
        gain *= makeUp;

        // 4. Read from Delay Line
        const delayedSample = state.delay.read(lookaheadSamples);

        // 5. Apply Gain to Delayed Signal
        // Note: In a true lookahead, the gain signal derived from input[t] is applied to delay[t].
        // This aligns the "Detection" of the peak at t with the "Processing" of the peak at t (which happens N samples later).
        // Wait. If we analyze input[t], and find a peak, we want the gain to be low *when that peak exits the delay line*.
        // So we actually need to Delay the Audio, but apply the Gain derived from Input *now*?
        // No, if we apply gain *now* to the delayed signal (which is old audio), we are compressing the *old* audio based on *future* peaks.
        // This is exactly what we want! We duck the volume *before* the loud hit comes out of the delay line.
        
        outputData[i] = delayedSample * gain;

        // Track max GR for UI (dB)
        // Gain 1.0 = 0dB reduction. Gain 0.5 = -6dB reduction.
        // We want positive number representing reduction amount.
        // gr_db = -20log(gain)
        // If gain is > 1 (makeup), GR is negative? 
        // Let's just track the raw gain factor for the "Limiting" part (before makeup)
        // limitingGain = (env > thresh) ? thresh/env : 1.0
        let limitingGain = (envLevel > thresholdLinear) ? (thresholdLinear / envLevel) : 1.0;
        let gr = -20 * Math.log10(limitingGain); 
        if (gr > maxGainReduction) maxGainReduction = gr;
      }
    }

    // Debug / Visualization
    this.framesProcessed++;
    if (this.framesProcessed >= 60) {
      this.port.postMessage({ type: 'debug', gainReduction: maxGainReduction });
      this.framesProcessed = 0;
    }

    return true;
  }
}

registerProcessor('limiter-processor', LimiterProcessor);
