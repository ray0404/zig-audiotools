import { BiquadFilter, EnvelopeFollower } from './lib/dsp-helpers.js';

class DeEsserProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'frequency', defaultValue: 6000, minValue: 2000, maxValue: 10000 },
            { name: 'threshold', defaultValue: -20, minValue: -60, maxValue: 0 },
            { name: 'ratio', defaultValue: 4, minValue: 1, maxValue: 20 },
            { name: 'attack', defaultValue: 0.005, minValue: 0.001, maxValue: 0.1 }, // Fast attack
            { name: 'release', defaultValue: 0.05, minValue: 0.01, maxValue: 0.5 },
            { name: 'monitor', defaultValue: 0, minValue: 0, maxValue: 1 }, // 0=Off, 1=Listen to Sidechain
            { name: 'bypass', defaultValue: 0, minValue: 0, maxValue: 1 }
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

        // Ensure state exists for each channel
        if (this.channelState.length < input.length) {
            for (let i = this.channelState.length; i < input.length; i++) {
                this.channelState.push({
                    filter: new BiquadFilter(),
                    envelope: new EnvelopeFollower(),
                    gainReduction: 0
                });
            }
        }

        const frequency = parameters.frequency.length > 1 ? parameters.frequency[0] : parameters.frequency[0];
        const threshold = parameters.threshold.length > 1 ? parameters.threshold[0] : parameters.threshold[0];
        const ratio = parameters.ratio.length > 1 ? parameters.ratio[0] : parameters.ratio[0];
        const attack = parameters.attack.length > 1 ? parameters.attack[0] : parameters.attack[0];
        const release = parameters.release.length > 1 ? parameters.release[0] : parameters.release[0];
        const monitor = parameters.monitor.length > 1 ? parameters.monitor[0] : parameters.monitor[0] > 0.5;
        const bypass = parameters.bypass.length > 1 ? parameters.bypass[0] : parameters.bypass[0] > 0.5;

        for (let ch = 0; ch < input.length; ch++) {
            const inputChannel = input[ch];
            const outputChannel = output[ch];
            const state = this.channelState[ch];

            // Update Filter Params (Bandpass for Sibilance)
            // Q is fixed around 1.0 - 2.0 for De-essing usually
            state.filter.setParams(frequency, 0, 2.0, sampleRate, 'bandpass');
            state.envelope.setParams(attack, release, sampleRate);

            for (let i = 0; i < inputChannel.length; i++) {
                const sample = inputChannel[i];

                if (bypass) {
                    outputChannel[i] = sample;
                    continue;
                }

                // 1. Filter Sidechain
                const sidechain = state.filter.process(sample);

                // 2. Envelope Detection
                const env = state.envelope.process(sidechain);
                const envDb = 20 * Math.log10(env + 1e-6);

                // 3. Gain Reduction Logic
                let reductionDb = 0;
                if (envDb > threshold) {
                    reductionDb = (envDb - threshold) * (1 - 1 / ratio);
                }

                // Smooth GR? (Envelope Follower handles ballistics on the *detection*, 
                // but standard compressors apply attack/release to the *gain reduction* signal.
                // Our simple EnvelopeFollower here tracks the *signal level*. 
                // So if signal drops, env drops. 
                // This is a "Feed-forward VCA" topology.
                // Using the envelope directly is fine for a basic de-esser.
                
                const gain = Math.pow(10, -reductionDb / 20);

                if (monitor) {
                    // Output the filtered sidechain so user can tune frequency
                    outputChannel[i] = sidechain;
                } else {
                    // Apply gain reduction to original broadband signal
                    outputChannel[i] = sample * gain;
                }
            }
        }

        return true;
    }
}

registerProcessor('deesser-processor', DeEsserProcessor);
