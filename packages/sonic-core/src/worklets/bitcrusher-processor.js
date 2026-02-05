class BitCrusherProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'bits', defaultValue: 8, minValue: 1, maxValue: 16 },
            { name: 'normFreq', defaultValue: 1.0, minValue: 0.001, maxValue: 1.0 }, // Target Sample Rate (0.0 to 1.0)
            { name: 'mix', defaultValue: 1.0, minValue: 0.0, maxValue: 1.0 } // Optional but good standard
        ];
    }

    constructor() {
        super();
        this.phasor = 0;
        this.lastSample = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        if (!input || !output) return true;

        const bitsParam = parameters.bits;
        const freqParam = parameters.normFreq;
        const mixParam = parameters.mix;

        const isConstBits = bitsParam.length === 1;
        const isConstFreq = freqParam.length === 1;
        const isConstMix = mixParam.length === 1;

        // Channel state needed for Stereo downsampling coherence? 
        // Usually bitcrusher effects are linked or dual mono. 
        // I'll assume linked for the "phasor" (downsample clock) or separate?
        // Separate is safer for true stereo processing.
        // For scaffold, I'll use `this.phasor` (shared) or reset?
        // Let's use local variables if I process one channel, but AudioWorklet handles multi-channel.
        // I should have per-channel state.
        
        // Quick fix: Just process channel 0 logic for phasor and apply to all? 
        // Or maintain array of phasors. 
        // I'll stick to a shared phasor for phase coherence between L/R (stereo image preservation).
        
        let phasor = this.phasor;
        let holdSample = this.lastSample; // Shared hold sample? No, hold sample must be per channel.
        // Okay, I need per-channel hold sample. 
        // But shared phasor (clock).
        
        // Wait, if I have stereo input, the "hold" value is different for L and R.
        // So I need `holdSamples = [0, 0]`.
        if (!this.holdSamples || this.holdSamples.length < input.length) {
            this.holdSamples = new Float32Array(input.length);
        }

        for (let i = 0; i < input[0].length; i++) {
            const normFreq = isConstFreq ? freqParam[0] : freqParam[i];
            const bits = isConstBits ? bitsParam[0] : bitsParam[i];
            const mix = isConstMix ? mixParam[0] : mixParam[i];

            const step = Math.pow(2, bits);
            
            // Advance phasor
            phasor += normFreq;
            
            const shouldUpdate = phasor >= 1.0;
            if (shouldUpdate) {
                phasor -= 1.0;
            }

            for (let ch = 0; ch < input.length; ch++) {
                const inSample = input[ch][i];
                
                if (shouldUpdate) {
                    // Quantize new sample
                    // y = floor(x * steps) / steps
                    this.holdSamples[ch] = Math.floor(inSample * step) / step;
                }
                
                // Output held sample (Downsampled & Quantized)
                const crushed = this.holdSamples[ch];
                
                // Mix
                output[ch][i] = crushed * mix + inSample * (1 - mix);
            }
        }
        
        this.phasor = phasor;
        
        return true;
    }
}

registerProcessor('bitcrusher-processor', BitCrusherProcessor);
