class CompressorProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'threshold', defaultValue: -24, minValue: -60, maxValue: 0 },
            { name: 'ratio', defaultValue: 4, minValue: 1, maxValue: 20 },
            { name: 'attack', defaultValue: 0.01, minValue: 0.0001, maxValue: 1 }, // sec
            { name: 'release', defaultValue: 0.1, minValue: 0.001, maxValue: 2 }, // sec
            { name: 'knee', defaultValue: 5, minValue: 0, maxValue: 20 }, // dB or Factor for VarMu
            { name: 'makeupGain', defaultValue: 0, minValue: 0, maxValue: 24 }, // dB
            { name: 'mode', defaultValue: 0, minValue: 0, maxValue: 3 }, // 0=VCA, 1=FET, 2=Opto, 3=VarMu
            { name: 'mix', defaultValue: 1.0, minValue: 0, maxValue: 1 }
        ];
    }

    constructor() {
        super();
        this.channels = [];
        this.lastPost = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        if (!input || !output) return true;

        const threshP = parameters.threshold;
        const ratioP = parameters.ratio;
        const attP = parameters.attack;
        const relP = parameters.release;
        const kneeP = parameters.knee;
        const gainP = parameters.makeupGain;
        const modeP = parameters.mode;
        const mixP = parameters.mix;

        // Init State
        if (this.channels.length < input.length) {
            for (let i = this.channels.length; i < input.length; i++) {
                this.channels.push({
                    gr: 0, // Current Gain Reduction in dB
                    lastOutput: 0 // For FET feedback
                });
            }
        }

        // Processing
        // Simplified: Assuming stereo link usually desired for compressors to preserve image,
        // but typically plugins implement dual mono or linked. 
        // I'll implement per-channel (Dual Mono) for simplicity of loop, 
        // but note that stereo linking is "Professional". 
        // Given the constraints, Dual Mono is safer to implement quickly.

        let maxGR = 0;

        for (let ch = 0; ch < input.length; ch++) {
            const state = this.channels[ch];
            const inCh = input[ch];
            const outCh = output[ch];

            const mode = modeP.length === 1 ? modeP[0] : modeP[0];
            const thresh = threshP.length === 1 ? threshP[0] : threshP[0];
            const ratioBase = ratioP.length === 1 ? ratioP[0] : ratioP[0];
            const knee = kneeP.length === 1 ? kneeP[0] : kneeP[0]; // Used as Knee Factor for VarMu
            const makeupDb = gainP.length === 1 ? gainP[0] : gainP[0];
            const makeup = Math.pow(10, makeupDb / 20);

            // Ballistics Coeffs
            const att = attP.length === 1 ? attP[0] : attP[0];
            const rel = relP.length === 1 ? relP[0] : relP[0];
            const mix = mixP.length === 1 ? mixP[0] : mixP[0];
            
            // Standard exp decay coeffs
            const attCoeff = Math.exp(-1.0 / (Math.max(0.0001, att) * sampleRate));
            const baseRelCoeff = Math.exp(-1.0 / (Math.max(0.001, rel) * sampleRate));

            for (let i = 0; i < inCh.length; i++) {
                const x = inCh[i];

                // 1. Detection Source
                let detectorIn = x;
                if (mode === 1) { // FET: Feedback
                    detectorIn = state.lastOutput;
                }

                // 2. Level Detection (Peak)
                const absIn = Math.abs(detectorIn);
                const envDb = 20 * Math.log10(absIn + 1e-6);

                // 3. Gain Calculation
                let overshoot = envDb - thresh;
                let targetGR = 0;

                if (overshoot > 0) {
                    let r = ratioBase;
                    
                    if (mode === 3) { // VarMu: Ratio increases with gain reduction/overshoot
                        // Ratio = 1 + Overshoot * KneeFactor?
                        // Doc: Ratio_effective = 1.0 + (Overshoot_dB * KneeFactor)
                        // KneeFactor typically small (e.g. 0.1 to 0.5)
                        r = 1.0 + (overshoot * (knee * 0.1)); // Scaling knee param 0-20 to 0-2 factor?
                    }
                    
                    // Standard compression formula
                    // GR = (Input - Thresh) * (1 - 1/R)
                    targetGR = overshoot * (1 - 1 / Math.max(1, r));
                }

                // 4. Ballistics (Attack/Release)
                let relCoeff = baseRelCoeff;

                if (mode === 2) { // Opto: Program Dependent Release
                    // alpha_r(t) = BaseRelease * (1 - Envelope(t)) ?
                    relCoeff = baseRelCoeff * (1 - Math.min(1, absIn)); 
                }

                // Apply Ballistics to GR State
                if (targetGR > state.gr) {
                    // Attack
                    state.gr = attCoeff * state.gr + (1 - attCoeff) * targetGR;
                } else {
                    // Release
                    state.gr = relCoeff * state.gr + (1 - relCoeff) * targetGR;
                }

                // Track Max GR for UI
                if (state.gr > maxGR) maxGR = state.gr;

                // 5. Apply
                // Gain = -GR dB
                const gain = Math.pow(10, -state.gr / 20);
                
                const processed = x * gain * makeup;
                outCh[i] = x * (1 - mix) + processed * mix;
                state.lastOutput = processed; // For FET
            }
        }

        // Post Message every ~100ms (sampleRate * 0.1)
        // currentTime is available in AudioWorkletGlobalScope
        const now = currentTime;
        if (now - this.lastPost > 0.1) {
            this.port.postMessage({ type: 'reduction', value: maxGR });
            this.lastPost = now;
        }

        return true;
    }
}

registerProcessor('compressor-processor', CompressorProcessor);
