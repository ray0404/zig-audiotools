import { OnePoleAllPass, LFO } from './lib/dsp-helpers.js';

class PhaserProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'stages', defaultValue: 4, minValue: 2, maxValue: 8 }, // Order (Integer)
            { name: 'frequency', defaultValue: 0.5, minValue: 0.1, maxValue: 10 }, // LFO Rate
            { name: 'baseFrequency', defaultValue: 1000, minValue: 50, maxValue: 5000 }, // Center Freq
            { name: 'octaves', defaultValue: 2, minValue: 0, maxValue: 5 }, // Sweep Range
            { name: 'wet', defaultValue: 0.5, minValue: 0, maxValue: 1 }
        ];
    }

    constructor() {
        super();
        this.filters = []; // Array of arrays (channels -> stages)
        this.lfo = new LFO();
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        if (!input || !output) return true;

        const stagesParam = parameters.stages;
        const lfoFreqParam = parameters.frequency;
        const baseFreqParam = parameters.baseFrequency;
        const octavesParam = parameters.octaves;
        const wetParam = parameters.wet;

        // Init State
        if (this.filters.length < input.length) {
            for (let c = this.filters.length; c < input.length; c++) {
                // Max 8 stages support
                const stageFilters = [];
                for (let s = 0; s < 8; s++) stageFilters.push(new OnePoleAllPass());
                this.filters.push(stageFilters);
            }
        }

        // Process LFO once per block (approx) or per sample? 
        // Doc says "Cutoff Frequency ... modulated by LFO".
        // For smooth sweeping, per sample is best.
        
        for (let i = 0; i < input[0].length; i++) {
            const lfoFreq = lfoFreqParam.length === 1 ? lfoFreqParam[0] : lfoFreqParam[i];
            const baseFreq = baseFreqParam.length === 1 ? baseFreqParam[0] : baseFreqParam[i];
            const octaves = octavesParam.length === 1 ? octavesParam[0] : octavesParam[i];
            const stages = stagesParam.length === 1 ? stagesParam[0] : stagesParam[i];
            const wet = wetParam.length === 1 ? wetParam[0] : wetParam[i];

            // 1. Calculate LFO (-1 to 1)
            const lfoOut = this.lfo.process(lfoFreq, sampleRate);
            
            // 2. Modulate Frequency
            // Exponential mapping usually feels better for phaser sweep
            // f = base * 2^(lfo * range)
            const modFreq = baseFreq * Math.pow(2, lfoOut * octaves);
            
            // Clip Freq to Nyquist
            const safeFreq = Math.min(Math.max(modFreq, 20), sampleRate / 2.1);

            // 3. Calculate Alpha
            // a = (tan(pi*f/Sr) - 1) / (tan(pi*f/Sr) + 1)
            const tan = Math.tan(Math.PI * safeFreq / sampleRate);
            const alpha = (tan - 1) / (tan + 1);

            // 4. Process Channels
            for (let ch = 0; ch < input.length; ch++) {
                const inSample = input[ch][i];
                let stageSample = inSample;
                
                // Run through N stages
                // Usually even number of stages (2, 4, 6)
                const numStages = Math.round(stages);
                for (let s = 0; s < numStages; s++) {
                    stageSample = this.filters[ch][s].process(stageSample, alpha);
                }

                // Mix: y = x + wet * (phaser_out - x) ? 
                // Classic Phaser is 50/50 mix for max notch depth.
                // If wet = 0.5, we want 50% Dry, 50% Wet.
                // y = dry * (1-wet) + wet_sig * wet ?
                // For notches, signals must sum.
                output[ch][i] = inSample * (1 - wet) + stageSample * wet;
            }
        }

        return true;
    }
}

registerProcessor('phaser-processor', PhaserProcessor);
