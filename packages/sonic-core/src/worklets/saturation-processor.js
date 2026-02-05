import { Saturator } from './lib/saturation.js';

class SaturationProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.saturator = new Saturator();
  }

  static get parameterDescriptors() {
    return [
      { name: 'drive', defaultValue: 0.0, minValue: 0.0, maxValue: 10.0 },
      { name: 'type', defaultValue: 1, minValue: 0, maxValue: 2 }, // 0: Tape, 1: Tube, 2: Fuzz
      { name: 'outputGain', defaultValue: 0.0, minValue: -12.0, maxValue: 12.0 },
      { name: 'mix', defaultValue: 1.0, minValue: 0.0, maxValue: 1.0 }
    ];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const drive = parameters.drive;
    const typeParam = parameters.type;
    const outGain = parameters.outputGain;
    const mixParam = parameters.mix;

    if (!input || !input[0] || !output) return true;

    const channelCount = input.length;

    for (let channel = 0; channel < channelCount; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      const length = inputChannel.length;

      const isDriveConst = drive.length === 1;
      const isTypeConst = typeParam.length === 1;
      const isGainConst = outGain.length === 1;
      const isMixConst = mixParam.length === 1;

      // Initialize base variables
      let currentDrive = drive[0];
      let currentGainDb = outGain[0];
      let currentMix = mixParam[0];
      let currentTypeInt = 1; // Default to Tube (1)

      // Pre-calculate constants outside the loop
      let linearGain = 1.0;
      if (isGainConst) {
        linearGain = Math.pow(10, currentGainDb / 20);
      }

      if (isTypeConst) {
         currentTypeInt = Math.round(typeParam[0]);
      }

      for (let i = 0; i < length; i++) {
        // Update per-sample parameters if not constant
        if (!isDriveConst) currentDrive = drive[i];
        if (!isMixConst) currentMix = mixParam[i];
        
        if (!isGainConst) {
           currentGainDb = outGain[i];
           // Only calculate pow inside loop if gain is changing
           linearGain = Math.pow(10, currentGainDb / 20);
        }

        if (!isTypeConst) {
            currentTypeInt = Math.round(typeParam[i]);
        }

        // Apply input gain (Drive)
        // Saturator.process(input, drive, type)
        // We pass 1.0 + currentDrive so that drive 0.0 = unity gain.
        const saturated = this.saturator.process(inputChannel[i], 1.0 + currentDrive, currentTypeInt);

        const wet = saturated * linearGain;
        outputChannel[i] = inputChannel[i] * (1 - currentMix) + wet * currentMix;
      }
    }

    return true;
  }
}

registerProcessor('saturation-processor', SaturationProcessor);