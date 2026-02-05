import { LinkwitzRiley4 } from './lib/crossover.js';

// Internal VCA Class to handle per-band compression logic
class VCA {
    constructor(sampleRate) {
        this.sampleRate = sampleRate;
        this.gr = 0; // Gain Reduction state (dB)
    }

    process(sample, thresh, ratio, attack, release, makeup) {
        // 1. Level Detection
        const absIn = Math.abs(sample);
        const envDb = 20 * Math.log10(absIn + 1e-6);

        // 2. Gain Calculation
        const overshoot = envDb - thresh;
        let targetGR = 0;

        if (overshoot > 0) {
            targetGR = overshoot * (1 - 1 / Math.max(1, ratio));
        }

        // 3. Ballistics
        const attCoeff = Math.exp(-1.0 / (Math.max(0.0001, attack) * this.sampleRate));
        const relCoeff = Math.exp(-1.0 / (Math.max(0.001, release) * this.sampleRate));

        if (targetGR > this.gr) {
            this.gr = attCoeff * this.gr + (1 - attCoeff) * targetGR;
        } else {
            this.gr = relCoeff * this.gr + (1 - relCoeff) * targetGR;
        }

        // 4. Apply
        const gain = Math.pow(10, -this.gr / 20);
        const mk = Math.pow(10, makeup / 20);
        
        return { output: sample * gain * mk, reduction: this.gr };
    }
}

class MultibandCompressorProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'lowFreq', defaultValue: 150, minValue: 20, maxValue: 1000 },
            { name: 'highFreq', defaultValue: 2500, minValue: 1000, maxValue: 10000 },
            
            // Low Band
            { name: 'threshLow', defaultValue: -24, minValue: -60, maxValue: 0 },
            { name: 'ratioLow', defaultValue: 4, minValue: 1, maxValue: 20 },
            { name: 'attLow', defaultValue: 0.01, minValue: 0.0001, maxValue: 1 },
            { name: 'relLow', defaultValue: 0.1, minValue: 0.001, maxValue: 2 },
            { name: 'gainLow', defaultValue: 0, minValue: 0, maxValue: 24 },

            // Mid Band
            { name: 'threshMid', defaultValue: -24, minValue: -60, maxValue: 0 },
            { name: 'ratioMid', defaultValue: 4, minValue: 1, maxValue: 20 },
            { name: 'attMid', defaultValue: 0.01, minValue: 0.0001, maxValue: 1 },
            { name: 'relMid', defaultValue: 0.1, minValue: 0.001, maxValue: 2 },
            { name: 'gainMid', defaultValue: 0, minValue: 0, maxValue: 24 },

            // High Band
            { name: 'threshHigh', defaultValue: -24, minValue: -60, maxValue: 0 },
            { name: 'ratioHigh', defaultValue: 4, minValue: 1, maxValue: 20 },
            { name: 'attHigh', defaultValue: 0.01, minValue: 0.0001, maxValue: 1 },
            { name: 'relHigh', defaultValue: 0.1, minValue: 0.001, maxValue: 2 },
            { name: 'gainHigh', defaultValue: 0, minValue: 0, maxValue: 24 },

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

        const bypass = parameters.bypass[0];
        if (bypass > 0.5) {
            for (let ch = 0; ch < input.length; ch++) output[ch].set(input[ch]);
            return true;
        }

        // Init State (Stereo)
        if (this.channelState.length < input.length) {
            for (let i = this.channelState.length; i < input.length; i++) {
                this.channelState.push({
                    xover1: new LinkwitzRiley4(sampleRate, 150),
                    xover2: new LinkwitzRiley4(sampleRate, 2500),
                    vcaLow: new VCA(sampleRate),
                    vcaMid: new VCA(sampleRate),
                    vcaHigh: new VCA(sampleRate)
                });
            }
        }

        // Params (Optimized: read index 0)
        const lowFreq = parameters.lowFreq[0];
        const highFreq = parameters.highFreq[0];

        // Low
        const tL = parameters.threshLow[0];
        const rL = parameters.ratioLow[0];
        const aL = parameters.attLow[0];
        const reL = parameters.relLow[0];
        const gL = parameters.gainLow[0];

        // Mid
        const tM = parameters.threshMid[0];
        const rM = parameters.ratioMid[0];
        const aM = parameters.attMid[0];
        const reM = parameters.relMid[0];
        const gM = parameters.gainMid[0];

        // High
        const tH = parameters.threshHigh[0];
        const rH = parameters.ratioHigh[0];
        const aH = parameters.attHigh[0];
        const reH = parameters.relHigh[0];
        const gH = parameters.gainHigh[0];

        for (let ch = 0; ch < input.length; ch++) {
            const inCh = input[ch];
            const outCh = output[ch];
            const state = this.channelState[ch];

            // Update Crossovers
            if (state.xover1.cutoffFrequency !== lowFreq) state.xover1.setCutoff(lowFreq);
            if (state.xover2.cutoffFrequency !== highFreq) state.xover2.setCutoff(highFreq);

            for (let i = 0; i < inCh.length; i++) {
                const sample = inCh[i];

                // 1. Split
                const s1 = state.xover1.process(sample);
                const s2 = state.xover2.process(s1.high);

                const bandLow = s1.low;
                const bandMid = s2.low;
                const bandHigh = s2.high;

                // 2. Compress
                const resLow = state.vcaLow.process(bandLow, tL, rL, aL, reL, gL);
                const resMid = state.vcaMid.process(bandMid, tM, rM, aM, reM, gM);
                const resHigh = state.vcaHigh.process(bandHigh, tH, rH, aH, reH, gH);

                // 3. Sum
                outCh[i] = resLow.output + resMid.output + resHigh.output;
            }
        }

        return true;
    }
}

registerProcessor('multiband-compressor-processor', MultibandCompressorProcessor);
