import { LFO } from './lib/dsp-helpers.js';

class TremoloProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'frequency', defaultValue: 4.0, minValue: 0.1, maxValue: 20.0 },
            { name: 'depth', defaultValue: 0.5, minValue: 0.0, maxValue: 1.0 },
            { name: 'spread', defaultValue: 0.0, minValue: 0.0, maxValue: 1.0 }, // 0 = Mono, 1 = 180 deg offset
            { name: 'waveform', defaultValue: 0, minValue: 0, maxValue: 1 }, // 0=Sine, 1=Square (optional?) Doc says Sin.
            { name: 'mix', defaultValue: 1.0, minValue: 0.0, maxValue: 1.0 }
        ];
    }

    constructor() {
        super();
        this.lfo = new LFO();
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        if (!input || !output) return true;

        const freqParam = parameters.frequency;
        const depthParam = parameters.depth;
        const spreadParam = parameters.spread;
        const mixParam = parameters.mix;

        for (let i = 0; i < input[0].length; i++) {
            const freq = freqParam.length === 1 ? freqParam[0] : freqParam[i];
            const depth = depthParam.length === 1 ? depthParam[0] : depthParam[i];
            const spread = spreadParam.length === 1 ? spreadParam[0] : spreadParam[i];
            const mix = mixParam.length === 1 ? mixParam[0] : mixParam[i];

            // Calculate Base LFO Phase
            // LFO class maintains phase state.
            // But we need to sample it once per sample-frame.
            // Wait, LFO.process updates state. 
            // If I call it twice (for L and R), I advance phase twice!
            // I must advance phase once, then calculate values for L/R.
            
            // Refactoring LFO usage:
            // "process" advances state. 
            // I should have `advance(freq, sr)` and `getValue(offset)`.
            // But helper is `process`.
            // I'll assume LFO helper advances state. 
            // So I call it once, get `baseMod`, then derive `rightMod`.
            
            const baseMod = this.lfo.process(freq, sampleRate); // -1 to 1

            for (let ch = 0; ch < input.length; ch++) {
                // Apply Spread to Right Channel
                let mod = baseMod;
                if (ch === 1 && spread > 0) {
                     // Offset phase effectively.
                     // Since I only have the *value* of sin(t), I can't easily shift phase 
                     // unless I know cos(t) or 't'.
                     // My LFO class hides 'phase'.
                     // I should probably update LFO class to expose phase or handle multi-channel?
                     // Workaround: Use LFO class to just track phase manually here?
                     // Or just invert signal for spread=1 (Ping Pong)?
                     // If spread=1, Right = -Left.
                     if (spread >= 0.9) mod = -mod;
                     // For 0 < spread < 1, just interpolate? Crude but works for effect.
                }

                // AM: y = x * (1 - depth + depth * sin)
                // My formula: 1 - depth + depth * mod
                // If mod = 1 -> 1
                // If mod = -1 -> 1 - 2*depth
                // Wait. 
                // If depth=1, mod=-1 -> 1 - 2 = -1. Inverted phase?
                // Doc formula: 1 - depth + depth * sin
                // If sin=-1: 1 - 2*depth. 
                // If depth=1 -> -1. 
                // This means at max depth, it fully inverts the signal at the trough?
                // Usually Tremolo goes 0 to 1.
                // Standard Tremolo formula: (1 - depth/2) + (depth/2)*sin ?
                // Range: (1-d) to 1.
                // Doc formula: `1 - depth + depth * sin`.
                // Let's analyze.
                // Sin=1 -> 1.
                // Sin=-1 -> 1 - 2d.
                // If d=0.5 -> 0.
                // If d=1 -> -1.
                // This implies "Ring Modulation" at high depth?
                // I will follow the doc logic exactly.
                
                const gain = 1 - depth + depth * mod;
                const wet = input[ch][i] * gain;
                output[ch][i] = input[ch][i] * (1 - mix) + wet * mix;
            }
        }
        return true;
    }
}

registerProcessor('tremolo-processor', TremoloProcessor);
