import { DelayLine } from './lib/dsp-helpers.js';

class FeedbackDelayProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'delayTime', defaultValue: 0.5, minValue: 0.0, maxValue: 2.0 }, // Max 2s
            { name: 'feedback', defaultValue: 0.3, minValue: 0.0, maxValue: 0.95 },
            { name: 'wet', defaultValue: 0.5, minValue: 0.0, maxValue: 1.0 }
        ];
    }

    constructor() {
        super();
        this.delays = [];
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        if (!input || !output) return true;

        const delayTimeP = parameters.delayTime;
        const fbP = parameters.feedback;
        const wetP = parameters.wet;

        if (this.delays.length < input.length) {
            for (let i = this.delays.length; i < input.length; i++) {
                this.delays.push(new DelayLine(2.0, sampleRate));
            }
        }

        for (let ch = 0; ch < input.length; ch++) {
            const delayLine = this.delays[ch];

            for (let i = 0; i < input[ch].length; i++) {
                const x = input[ch][i];
                const dt = delayTimeP.length === 1 ? delayTimeP[0] : delayTimeP[i];
                const fb = fbP.length === 1 ? fbP[0] : fbP[i];
                const wet = wetP.length === 1 ? wetP[0] : wetP[i];

                // Read Output first
                // delayTime in seconds -> samples
                const delaySamples = dt * sampleRate;
                const wetSig = delayLine.read(delaySamples); // Use interpolated read for smooth changes

                // Feedback Path
                // Write = Input + Delayed * Feedback
                const toBuffer = x + wetSig * fb;
                delayLine.write(toBuffer);

                // Mix
                output[ch][i] = x * (1 - wet) + wetSig * wet;
            }
        }
        return true;
    }
}

registerProcessor('feedback-delay-processor', FeedbackDelayProcessor);
