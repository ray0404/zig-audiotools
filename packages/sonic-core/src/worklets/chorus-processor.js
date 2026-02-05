import { DelayLine, LFO } from './lib/dsp-helpers.js';

class ChorusProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'frequency', defaultValue: 1.5, minValue: 0.1, maxValue: 10.0 }, // LFO Rate
            { name: 'delayTime', defaultValue: 0.03, minValue: 0.0, maxValue: 0.1 }, // Base Delay (s)
            { name: 'depth', defaultValue: 0.002, minValue: 0.0, maxValue: 0.01 }, // Modulation Width (s)
            { name: 'feedback', defaultValue: 0.0, minValue: 0.0, maxValue: 0.95 },
            { name: 'wet', defaultValue: 0.5, minValue: 0.0, maxValue: 1.0 }
        ];
    }

    constructor() {
        super();
        this.delays = [];
        this.lfos = [];
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        if (!input || !output) return true;

        const freqParam = parameters.frequency;
        const delayParam = parameters.delayTime;
        const depthParam = parameters.depth;
        const fbParam = parameters.feedback;
        const wetParam = parameters.wet;

        // Init state
        if (this.delays.length < input.length) {
            for (let i = this.delays.length; i < input.length; i++) {
                this.delays.push(new DelayLine(0.5, sampleRate)); // Max 0.5s
                this.lfos.push(new LFO());
                // Offset LFOs for stereo spread? 
                // Standard Chorus often flips phase or offsets L/R LFOs.
                // I'll add PI/2 offset to Right channel for width.
                if (i === 1) this.lfos[i].phase = Math.PI / 2;
            }
        }

        for (let ch = 0; ch < input.length; ch++) {
            const inputChannel = input[ch];
            const outputChannel = output[ch];
            const delayLine = this.delays[ch];
            const lfo = this.lfos[ch];

            const isConstFreq = freqParam.length === 1;

            for (let i = 0; i < inputChannel.length; i++) {
                const x = inputChannel[i];
                
                const freq = isConstFreq ? freqParam[0] : freqParam[i];
                const baseDelay = delayParam.length === 1 ? delayParam[0] : delayParam[i];
                const depth = depthParam.length === 1 ? depthParam[0] : depthParam[i];
                const fb = fbParam.length === 1 ? fbParam[0] : fbParam[i];
                const wet = wetParam.length === 1 ? wetParam[0] : wetParam[i];

                // Calculate Modulated Delay Time
                // LFO output is -1 to 1. 
                // ModDelay = Base + Depth * sin(wt)
                const lfoOut = lfo.process(freq, sampleRate);
                const modDelaySeconds = baseDelay + (depth * lfoOut);
                
                // Convert to samples
                const modDelaySamples = modDelaySeconds * sampleRate;

                // Read (interpolated)
                const delayedSample = delayLine.read(modDelaySamples);
                
                // Feedback
                const nextInput = x + (delayedSample * fb);
                delayLine.write(nextInput);

                // Mix
                outputChannel[i] = x * (1 - wet) + delayedSample * wet;
            }
        }

        return true;
    }
}

registerProcessor('chorus-processor', ChorusProcessor);
