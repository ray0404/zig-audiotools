import { LinkwitzRiley4 } from './lib/crossover.js';

class StereoImagerProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'lowFreq', defaultValue: 150, minValue: 20, maxValue: 1000 },
            { name: 'highFreq', defaultValue: 2500, minValue: 1000, maxValue: 10000 },
            { name: 'widthLow', defaultValue: 0.0, minValue: 0.0, maxValue: 2.0 },
            { name: 'widthMid', defaultValue: 1.0, minValue: 0.0, maxValue: 2.0 },
            { name: 'widthHigh', defaultValue: 1.2, minValue: 0.0, maxValue: 2.0 },
            { name: 'bypass', defaultValue: 0, minValue: 0, maxValue: 1 }
        ];
    }

    constructor() {
        super();
        this.channelState = [];
    }

    process(inputs, outputs, parameters) {
        // Defensive check for audio engine readiness
        if (!inputs || !inputs[0] || !outputs || !outputs[0]) return true;

        const input = inputs[0];
        const output = outputs[0];
        
        // Handle empty input (disconnected node)
        if (input.length === 0) return true;

        try {
            const bypass = parameters.bypass && parameters.bypass.length > 0 ? parameters.bypass[0] : 0;
            
            if (bypass > 0.5) {
                for (let ch = 0; ch < input.length; ch++) {
                    // Safety: ensure output channel exists and input has data
                    if (output[ch] && input[ch]) {
                        output[ch].set(input[ch]);
                    }
                }
                return true;
            }

            // Initialize crossover state per channel if needed
            if (this.channelState.length < input.length) {
                for (let i = this.channelState.length; i < input.length; i++) {
                    this.channelState.push({
                        xover1: new LinkwitzRiley4(sampleRate, 150),
                        xover2: new LinkwitzRiley4(sampleRate, 2500)
                    });
                }
            }

            // Parameter safety checks
            const lowFreq = parameters.lowFreq && parameters.lowFreq.length > 0 ? parameters.lowFreq[0] : 150;
            const highFreq = parameters.highFreq && parameters.highFreq.length > 0 ? parameters.highFreq[0] : 2500;
            
            // Ensure frequencies are valid and non-overlapping/inverted if logic requires, 
            // though the crossover itself is independent. 
            // We just ensure they are finite.
            if (!Number.isFinite(lowFreq) || !Number.isFinite(highFreq)) return true;

            const widthLow = parameters.widthLow && parameters.widthLow.length > 0 ? parameters.widthLow[0] : 1.0;
            const widthMid = parameters.widthMid && parameters.widthMid.length > 0 ? parameters.widthMid[0] : 1.0;
            const widthHigh = parameters.widthHigh && parameters.widthHigh.length > 0 ? parameters.widthHigh[0] : 1.0;

            const L = input[0];
            const R = input[1];
            const outL = output[0];
            const outR = output[1];

            // Safety for Mono inputs
            if (!R || !outR) {
                if (outL && L) outL.set(L);
                return true;
            }

            const stateL = this.channelState[0];
            const stateR = this.channelState[1];

            // Update Cutoffs safely
            if (stateL.xover1.cutoffFrequency !== lowFreq) {
                stateL.xover1.setCutoff(lowFreq);
                stateR.xover1.setCutoff(lowFreq);
            }
            if (stateL.xover2.cutoffFrequency !== highFreq) {
                stateL.xover2.setCutoff(highFreq);
                stateR.xover2.setCutoff(highFreq);
            }

            // Process loop
            const len = L.length;
            for (let i = 0; i < len; i++) {
                const lIn = L[i];
                const rIn = R[i];

                // 1. Split Bands
                const splitL1 = stateL.xover1.process(lIn); // low, high (midhigh)
                const splitR1 = stateR.xover1.process(rIn);

                const splitL2 = stateL.xover2.process(splitL1.high); // low (mid), high
                const splitR2 = stateR.xover2.process(splitR1.high);

                const lLow = splitL1.low;
                const rLow = splitR1.low;

                const lMid = splitL2.low;
                const rMid = splitR2.low;

                const lHigh = splitL2.high;
                const rHigh = splitR2.high;

                // 2. M/S Processing per Band
                // Inline helper for performance and safety
                // Band 1
                const m1 = (lLow + rLow) * 0.5;
                const s1 = (lLow - rLow) * 0.5 * widthLow;
                
                // Band 2
                const m2 = (lMid + rMid) * 0.5;
                const s2 = (lMid - rMid) * 0.5 * widthMid;

                // Band 3
                const m3 = (lHigh + rHigh) * 0.5;
                const s3 = (lHigh - rHigh) * 0.5 * widthHigh;

                // 3. Summation
                outL[i] = (m1 + s1) + (m2 + s2) + (m3 + s3);
                outR[i] = (m1 - s1) + (m2 - s2) + (m3 - s3);
            }
        } catch (e) {
            // If anything explodes, try to bypass safely or silence
            // console.error(e); // Can't log in worklet easily
            return true;
        }

        return true;
    }
}

registerProcessor('stereo-imager-processor', StereoImagerProcessor);
