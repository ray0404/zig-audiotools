import { BiquadFilter, EnvelopeFollower } from './lib/dsp-helpers.js';

class DynamicEQProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'frequency', defaultValue: 1000, minValue: 20, maxValue: 20000 },
      { name: 'Q', defaultValue: 1.0, minValue: 0.1, maxValue: 100 },
      { name: 'gain', defaultValue: 0, minValue: -40, maxValue: 40 }, 
      { name: 'threshold', defaultValue: -20, minValue: -100, maxValue: 0 },
      { name: 'ratio', defaultValue: 1, minValue: 1, maxValue: 20 },
      { name: 'attack', defaultValue: 0.01, minValue: 0.001, maxValue: 1 },
      { name: 'release', defaultValue: 0.1, minValue: 0.001, maxValue: 1 }
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

    // Parameter smoothing is handled by the host automation usually, 
    // but here we grab the array or single value.
    // For simplicity, we grab index 0 (k-rate for most, unless automated)
    // To support a-rate, we'd loop i.
    const freq = parameters.frequency.length > 1 ? parameters.frequency : parameters.frequency[0];
    const Q = parameters.Q.length > 1 ? parameters.Q : parameters.Q[0];
    const staticGain = parameters.gain.length > 1 ? parameters.gain : parameters.gain[0];
    const thresh = parameters.threshold.length > 1 ? parameters.threshold : parameters.threshold[0];
    const ratio = parameters.ratio.length > 1 ? parameters.ratio : parameters.ratio[0];
    const att = parameters.attack.length > 1 ? parameters.attack : parameters.attack[0];
    const rel = parameters.release.length > 1 ? parameters.release : parameters.release[0];

    // Determine if params are static (k-rate) or dynamic (a-rate)
    const isFreqStatic = typeof freq === 'number';
    const isQStatic = typeof Q === 'number';

    // Initialize state for new channels
    if (this.channelState.length < input.length) {
      for (let i = this.channelState.length; i < input.length; i++) {
        this.channelState.push({
          scFilter: new BiquadFilter(),
          mainFilter: new BiquadFilter(),
          envFollower: new EnvelopeFollower()
        });
      }
    }

    let maxGainReduction = 0;

    for (let channel = 0; channel < input.length; channel++) {
      const inputData = input[channel];
      const outputData = output[channel];
      const state = this.channelState[channel];
      
      // Update envelope params (k-rate optimized)
      state.envFollower.setParams(att, rel, sampleRate);

      // Optimization: If Frequency and Q are static, update base math ONCE per block
      if (isFreqStatic && isQStatic) {
          state.scFilter.updateBase(freq, Q, sampleRate, 'bandpass');
          state.scFilter.setGain(0); // SC doesn't need gain
          
          state.mainFilter.updateBase(freq, Q, sampleRate, 'peaking');
      }

      for (let i = 0; i < inputData.length; i++) {
        const sample = inputData[i];
        
        // 1. Sidechain Path
        // If parameters are a-rate, we must update base every sample
        if (!isFreqStatic || !isQStatic) {
            state.scFilter.updateBase(
                isFreqStatic ? freq : freq[i],
                isQStatic ? Q : Q[i],
                sampleRate,
                'bandpass'
            );
            state.scFilter.setGain(0);
        }

        const scSample = state.scFilter.process(sample);
        
        // Detect Envelope
        const envLevel = state.envFollower.process(scSample);
        const envDb = 20 * Math.log10(envLevel + 1e-6); // Convert to dB
        
        // Calculate Gain Reduction
        // If env > threshold, reduce gain
        let gainReduction = 0;
        if (envDb > thresh) {
             gainReduction = (envDb - thresh) * (1 - 1/ratio);
        }
        
        // Track max GR for UI visualization
        if (gainReduction > maxGainReduction) maxGainReduction = gainReduction;
        
        // 2. Main Path
        // Modulate gain: TargetGain = StaticGain - GainReduction
        const dynamicGain = staticGain - gainReduction;
        
        // Update main filter
        // If parameters are a-rate, we need to update base. 
        // If k-rate, it was done outside loop.
        if (!isFreqStatic || !isQStatic) {
            state.mainFilter.updateBase(
                isFreqStatic ? freq : freq[i],
                isQStatic ? Q : Q[i],
                sampleRate, 
                'peaking'
            );
        }
        
        // ALWAYS update gain (this is the "Dynamic" part)
        state.mainFilter.setGain(dynamicGain);
        
        outputData[i] = state.mainFilter.process(sample);
      }
    }

    // Debug / Visualization Message
    this.framesProcessed++;
    if (this.framesProcessed >= 60) {
      this.port.postMessage({ type: 'debug', gainReduction: maxGainReduction });
      this.framesProcessed = 0;
    }

    return true;
  }
}

registerProcessor('dynamic-eq-processor', DynamicEQProcessor);
