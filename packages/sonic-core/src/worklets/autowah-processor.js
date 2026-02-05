import { BiquadFilter, EnvelopeFollower } from './lib/dsp-helpers.js';

class AutoWahProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'baseFrequency', defaultValue: 100, minValue: 20, maxValue: 5000 },
            { name: 'sensitivity', defaultValue: 0.5, minValue: 0, maxValue: 10 }, // Gain to Freq
            { name: 'octaves', defaultValue: 4, minValue: 0, maxValue: 8 }, // Range
            { name: 'Q', defaultValue: 2.0, minValue: 0.1, maxValue: 20 },
            { name: 'attack', defaultValue: 0.01, minValue: 0.001, maxValue: 1 },
            { name: 'release', defaultValue: 0.1, minValue: 0.001, maxValue: 1 },
            { name: 'wet', defaultValue: 1.0, minValue: 0, maxValue: 1 }
        ];
    }

    constructor() {
        super();
        this.followers = [];
        this.filters = [];
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        if (!input || !output) return true;

        const baseFreqP = parameters.baseFrequency;
        const sensP = parameters.sensitivity;
        const octP = parameters.octaves;
        const QP = parameters.Q;
        const attP = parameters.attack;
        const relP = parameters.release;
        const wetP = parameters.wet;

        if (this.followers.length < input.length) {
            for (let i = this.followers.length; i < input.length; i++) {
                this.followers.push(new EnvelopeFollower());
                this.filters.push(new BiquadFilter());
            }
        }

        for (let ch = 0; ch < input.length; ch++) {
            const follower = this.followers[ch];
            const filter = this.filters[ch];

            // Const checking optimized out for brevity, reading index 0 or i
            // AudioWorklet usually passes arrays.

            // Update Follower Params (K-rate)
            const att = attP.length === 1 ? attP[0] : attP[0]; // K-rate for ease
            const rel = relP.length === 1 ? relP[0] : relP[0];
            follower.setParams(att, rel, sampleRate);

            const baseFreq = baseFreqP.length === 1 ? baseFreqP[0] : baseFreqP[0];
            const sens = sensP.length === 1 ? sensP[0] : sensP[0];
            const octaves = octP.length === 1 ? octP[0] : octP[0];
            const Q = QP.length === 1 ? QP[0] : QP[0];
            const wet = wetP.length === 1 ? wetP[0] : wetP[0];

            for (let i = 0; i < input[ch].length; i++) {
                const x = input[ch][i];
                
                // 1. Envelope
                const env = follower.process(x);

                // 2. Modulation
                // Logic: cutoff = base * 2^(env * sens * octaves)
                const mod = env * sens * octaves;
                const cutoff = baseFreq * Math.pow(2, mod);
                const safeCutoff = Math.min(cutoff, sampleRate / 2.1);

                // 3. Filter
                // Update filter coefficients per sample for smooth wah
                // (Optimized: Could do Control Rate (every 128 samples) with interpolation 
                // but for "Professional Grade", sample rate modulation is smoother)
                filter.setParams(safeCutoff, 0, Q, sampleRate, 'bandpass'); // Or 'peaking'? Doc says Bandpass or Peaking. Wah is usually BP or LP. AutoWah usually BP.
                
                const wetSig = filter.process(x);
                
                // Mix
                output[ch][i] = x * (1 - wet) + wetSig * wet;
            }
        }
        return true;
    }
}

registerProcessor('autowah-processor', AutoWahProcessor);
