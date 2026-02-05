// Basic Gain Processor to demonstrate AudioWorklet structure
// This code runs on the audio thread.

class SonicGainProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'gain',
        defaultValue: 1.0,
        minValue: 0.0,
        maxValue: 1.0,
      },
    ];
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const input = inputs[0];
    const gain = parameters.gain;

    for (let channel = 0; channel < output.length; ++channel) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];

      // If no input, silence
      if (!inputChannel) {
          continue;
      }

      if (gain.length === 1) {
        // Simple case: gain is constant for the block
        for (let i = 0; i < outputChannel.length; ++i) {
          outputChannel[i] = inputChannel[i] * gain[0];
        }
      } else {
        // Automation case: gain changes per sample
        for (let i = 0; i < outputChannel.length; ++i) {
          outputChannel[i] = inputChannel[i] * gain[i];
        }
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('sonic-gain-processor', SonicGainProcessor);
