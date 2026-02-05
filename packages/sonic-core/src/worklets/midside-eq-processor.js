import { BiquadFilter } from './lib/dsp-helpers.js';

class MidSideEQProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'midGain', defaultValue: 0, minValue: -15, maxValue: 15 },
      { name: 'midFreq', defaultValue: 1000, minValue: 20, maxValue: 20000 },
      { name: 'sideGain', defaultValue: 0, minValue: -15, maxValue: 15 },
      { name: 'sideFreq', defaultValue: 1000, minValue: 20, maxValue: 20000 },
    ];
  }

  constructor() {
    super();
    // Two independent filter sets for M and S
    this.midFilter = new BiquadFilter();
    this.sideFilter = new BiquadFilter();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !output || input.length < 2) return true; // Need stereo

    // Get parameters
    const midGain = parameters.midGain.length > 1 ? parameters.midGain[0] : parameters.midGain[0];
    const midFreq = parameters.midFreq.length > 1 ? parameters.midFreq[0] : parameters.midFreq[0];
    const sideGain = parameters.sideGain.length > 1 ? parameters.sideGain[0] : parameters.sideGain[0];
    const sideFreq = parameters.sideFreq.length > 1 ? parameters.sideFreq[0] : parameters.sideFreq[0];

    // Update Filters (Peaking type)
    this.midFilter.setParams(midFreq, midGain, 1.0, sampleRate, 'peaking');
    this.sideFilter.setParams(sideFreq, sideGain, 1.0, sampleRate, 'peaking');

    const leftIn = input[0];
    const rightIn = input[1];
    const leftOut = output[0];
    const rightOut = output[1];

    for (let i = 0; i < leftIn.length; i++) {
        const L = leftIn[i];
        const R = rightIn[i];

        // 1. Encode M/S
        const Mid = (L + R) * 0.5;
        const Side = (L - R) * 0.5;

        // 2. Process
        const procMid = this.midFilter.process(Mid);
        const procSide = this.sideFilter.process(Side);

        // 3. Decode L/R
        leftOut[i] = procMid + procSide;
        rightOut[i] = procMid - procSide;
    }

    return true;
  }
}

registerProcessor('midside-eq-processor', MidSideEQProcessor);
