import { BiquadFilter } from './lib/dsp-helpers.js';

class ParametricEQProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'lowFreq', defaultValue: 100, minValue: 20, maxValue: 1000 },
      { name: 'lowGain', defaultValue: 0, minValue: -24, maxValue: 24 },
      
      { name: 'midFreq', defaultValue: 1000, minValue: 200, maxValue: 5000 },
      { name: 'midGain', defaultValue: 0, minValue: -24, maxValue: 24 },
      { name: 'midQ', defaultValue: 0.707, minValue: 0.1, maxValue: 10 },

      { name: 'highFreq', defaultValue: 5000, minValue: 2000, maxValue: 20000 },
      { name: 'highGain', defaultValue: 0, minValue: -24, maxValue: 24 },
    ];
  }

  constructor() {
    super();
    this.channelState = [];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !output) return true;

    // K-rate parameters (using [0] for simplicity as automation is usually handled by host smoothing or granular enough)
    const lowFreq = parameters.lowFreq[0];
    const lowGain = parameters.lowGain[0];
    
    const midFreq = parameters.midFreq[0];
    const midGain = parameters.midGain[0];
    const midQ = parameters.midQ[0];

    const highFreq = parameters.highFreq[0];
    const highGain = parameters.highGain[0];

    // Initialize channel state if needed
    if (this.channelState.length < input.length) {
      for (let i = this.channelState.length; i < input.length; i++) {
        this.channelState.push({
          lowShelf: new BiquadFilter(),
          midPeak: new BiquadFilter(),
          highShelf: new BiquadFilter()
        });
      }
    }

    // Process each channel
    for (let channel = 0; channel < input.length; channel++) {
        const inputChannel = input[channel];
        const outputChannel = output[channel];
        const state = this.channelState[channel];

        // Update filters (running at K-rate approx for efficiency)
        // Note: For true sample-accurate automation, this should be inside the sample loop.
        // But for standard EQ usage, block-rate update is often acceptable unless fast modulation is needed.
        // Given 'dsp-helpers.js' structure, we update per block here for performance.
        
        // Low Shelf
        state.lowShelf.setParams(lowFreq, lowGain, 0.707, sampleRate, 'lowshelf');
        
        // Mid Peaking
        state.midPeak.setParams(midFreq, midGain, midQ, sampleRate, 'peaking');
        
        // High Shelf
        state.highShelf.setParams(highFreq, highGain, 0.707, sampleRate, 'highshelf');

        for (let i = 0; i < inputChannel.length; i++) {
            let sample = inputChannel[i];
            
            // Series processing
            sample = state.lowShelf.process(sample);
            sample = state.midPeak.process(sample);
            sample = state.highShelf.process(sample);
            
            outputChannel[i] = sample;
        }
    }

    return true;
  }
}

registerProcessor('parametric-eq-processor', ParametricEQProcessor);
