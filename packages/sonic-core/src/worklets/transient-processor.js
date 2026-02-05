import { EnvelopeFollower } from './lib/dsp-helpers.js';

class TransientProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'attackGain', defaultValue: 0, minValue: -24, maxValue: 24 },
      { name: 'sustainGain', defaultValue: 0, minValue: -24, maxValue: 24 },
      { name: 'mix', defaultValue: 1.0, minValue: 0, maxValue: 1 }
    ];
  }

  constructor() {
    super();
    this.channelState = [];
    // Fixed time constants as per blueprint suggestion
    this.fastTime = 0.010; // 10ms
    this.slowTime = 0.100; // 100ms
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !output) return true;

    // Get parameters (supporting a-rate or k-rate, defaulting to index 0)
    const attackGain = parameters.attackGain.length > 1 ? parameters.attackGain : parameters.attackGain[0];
    const sustainGain = parameters.sustainGain.length > 1 ? parameters.sustainGain : parameters.sustainGain[0];
    const mixP = parameters.mix;
    const mix = mixP.length > 1 ? mixP[0] : mixP[0]; // Simple access for now

    // Initialize state for new channels
    if (this.channelState.length < input.length) {
      for (let i = this.channelState.length; i < input.length; i++) {
        const fastEnv = new EnvelopeFollower();
        const slowEnv = new EnvelopeFollower();
        
        // Initialize with sampleRate
        // Note: sampleRate is a global in AudioWorkletGlobalScope
        fastEnv.setParams(this.fastTime, this.fastTime, sampleRate);
        slowEnv.setParams(this.slowTime, this.slowTime, sampleRate);

        this.channelState.push({ fastEnv, slowEnv });
      }
    }

    for (let channel = 0; channel < input.length; channel++) {
      const inputData = input[channel];
      const outputData = output[channel];
      const state = this.channelState[channel];
      
      // We could update env params here if we wanted them automated,
      // but they are fixed for this implementation.

      for (let i = 0; i < inputData.length; i++) {
        const sample = inputData[i];
        
        // 1. Calculate Envelopes
        const fast = state.fastEnv.process(sample);
        const slow = state.slowEnv.process(sample);
        
        // 2. Calculate Delta (Transient detection)
        const delta = fast - slow;
        
        // 3. Determine Gain Factor
        let gainDb = 0;
        
        // Handle k-rate vs a-rate params inside loop if necessary, 
        // but for now assuming k-rate (index 0) or simple access.
        // To be perfectly robust for a-rate:
        const currentAtt = parameters.attackGain.length > 1 ? parameters.attackGain[i] : attackGain;
        const currentSus = parameters.sustainGain.length > 1 ? parameters.sustainGain[i] : sustainGain;

        if (delta > 0) {
            // Transient phase
            // Scale the "transient-ness" (delta) by the attack gain
            // Typically we want a Ratio or just direct scaling. 
            // Simple approach: gain_db = delta * attack_db * scalar
            // Let's use a scalar of 2.0 to make it punchy
            gainDb = delta * currentAtt * 2.0; 
        } else {
            // Sustain phase
            // Delta is negative here. We want to scale the "sustain-ness" (abs(delta))
            // gain_db = abs(delta) * sustain_db * scalar
            gainDb = Math.abs(delta) * currentSus * 2.0;
        }

        // 4. Apply Gain
        // Convert dB to linear: 10^(db/20)
        const linearGain = Math.pow(10, gainDb / 20);
        
        outputData[i] = sample * (1 - mix) + (sample * linearGain) * mix;
      }
    }

    return true;
  }
}

registerProcessor('transient-processor', TransientProcessor);
