
// --- Helper Classes (Ported from dsp-helpers.js) ---

export class BiquadFilter {
    private x1 = 0; private x2 = 0;
    private y1 = 0; private y2 = 0;
    private b0 = 0; private b1 = 0; private b2 = 0;
    private a1 = 0; private a2 = 0;

    constructor() {
        this.reset();
    }

    reset() {
        this.x1 = 0; this.x2 = 0;
        this.y1 = 0; this.y2 = 0;
    }

    setParams(frequency: number, gain: number, Q: number, sampleRate: number, type: string) {
        const w0 = (2 * Math.PI * frequency) / sampleRate;
        const cosw0 = Math.cos(w0);
        const alpha = Math.sin(w0) / (2 * Q);
        
        const A = Math.pow(10, gain / 40);
        let b0, b1, b2, a0, a1, a2;

        switch (type) {
            case 'lowpass':
                b0 = (1 - cosw0) / 2; b1 = 1 - cosw0; b2 = (1 - cosw0) / 2;
                a0 = 1 + alpha; a1 = -2 * cosw0; a2 = 1 - alpha;
                break;
            case 'highpass':
                b0 = (1 + cosw0) / 2; b1 = -(1 + cosw0); b2 = (1 + cosw0) / 2;
                a0 = 1 + alpha; a1 = -2 * cosw0; a2 = 1 - alpha;
                break;
            case 'peaking':
                b0 = 1 + alpha * A; b1 = -2 * cosw0; b2 = 1 - alpha * A;
                a0 = 1 + alpha / A; a1 = -2 * cosw0; a2 = 1 - alpha / A;
                break;
            case 'lowshelf':
                b0 = A * ((A + 1) - (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha);
                b1 = 2 * A * ((A - 1) - (A + 1) * cosw0);
                b2 = A * ((A + 1) - (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha);
                a0 = (A + 1) + (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha;
                a1 = -2 * ((A - 1) + (A + 1) * cosw0);
                a2 = (A + 1) + (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha;
                break;
            case 'highshelf':
                b0 = A * ((A + 1) + (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha);
                b1 = -2 * A * ((A - 1) + (A + 1) * cosw0);
                b2 = A * ((A + 1) + (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha);
                a0 = (A + 1) - (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha;
                a1 = 2 * ((A - 1) + (A + 1) * cosw0);
                a2 = (A + 1) + (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha;
                break;
            default:
                b0 = 1; b1 = 0; b2 = 0; a0 = 1; a1 = 0; a2 = 0;
        }

        this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
        this.a1 = a1 / a0; this.a2 = a2 / a0;
    }

    process(input: number): number {
        const output = this.b0 * input + this.b1 * this.x1 + this.b2 * this.x2
                     - this.a1 * this.y1 - this.a2 * this.y2;
        this.x2 = this.x1; this.x1 = input;
        this.y2 = this.y1; this.y1 = output;
        return output;
    }
}

// --- Offline Processors ---

export function applyBitCrusher(buffer: Float32Array, bits: number, normFreq: number, mix: number): Float32Array {
    const output = new Float32Array(buffer.length);
    const step = Math.pow(2, bits);
    let phasor = 0;
    let holdL = 0;
    let holdR = 0;

    for (let i = 0; i < buffer.length; i += 2) {
        phasor += normFreq;
        if (phasor >= 1.0) {
            phasor -= 1.0;
            holdL = Math.floor(buffer[i] * step) / step;
            holdR = Math.floor(buffer[i + 1] * step) / step;
        }
        output[i] = holdL * mix + buffer[i] * (1 - mix);
        output[i + 1] = holdR * mix + buffer[i + 1] * (1 - mix);
    }
    return output;
}

export function applySaturation(buffer: Float32Array, drive: number, type: number, outGainDb: number, mix: number): Float32Array {
    const output = new Float32Array(buffer.length);
    const gain = Math.pow(10, outGainDb / 20);
    const driveGain = 1.0 + drive;

    for (let i = 0; i < buffer.length; i++) {
        const x = buffer[i] * driveGain;
        let saturated = 0;

        if (type === 1) { // Tube
            saturated = (x >= 0) ? Math.tanh(x) : x / (1 + Math.abs(x));
        } else if (type === 2) { // Fuzz
            saturated = Math.max(-1, Math.min(1, x));
        } else { // Tape/Default
            saturated = Math.tanh(x);
        }

        const wet = saturated * gain;
        output[i] = buffer[i] * (1 - mix) + wet * mix;
    }
    return output;
}

export function applyParametricEQ(
    buffer: Float32Array, 
    sampleRate: number,
    params: {
        lowFreq: number, lowGain: number,
        midFreq: number, midGain: number, midQ: number,
        highFreq: number, highGain: number
    }
): Float32Array {
    const output = new Float32Array(buffer.length);
    const filtersL = [new BiquadFilter(), new BiquadFilter(), new BiquadFilter()];
    const filtersR = [new BiquadFilter(), new BiquadFilter(), new BiquadFilter()];

    filtersL[0].setParams(params.lowFreq, params.lowGain, 0.707, sampleRate, 'lowshelf');
    filtersL[1].setParams(params.midFreq, params.midGain, params.midQ, sampleRate, 'peaking');
    filtersL[2].setParams(params.highFreq, params.highGain, 0.707, sampleRate, 'highshelf');

    filtersR[0].setParams(params.lowFreq, params.lowGain, 0.707, sampleRate, 'lowshelf');
    filtersR[1].setParams(params.midFreq, params.midGain, params.midQ, sampleRate, 'peaking');
    filtersR[2].setParams(params.highFreq, params.highGain, 0.707, sampleRate, 'highshelf');

    for (let i = 0; i < buffer.length; i += 2) {
        let sL = buffer[i];
        let sR = buffer[i + 1];

        for (let j = 0; j < 3; j++) {
            sL = filtersL[j].process(sL);
            sR = filtersR[j].process(sR);
        }

        output[i] = sL;
        output[i + 1] = sR;
    }
    return output;
}

export function applyCompressor(
    buffer: Float32Array,
    sampleRate: number,
    params: {
        threshold: number, ratio: number, attack: number, release: number, makeupGain: number, mix: number
    }
): Float32Array {
    const output = new Float32Array(buffer.length);
    const makeup = Math.pow(10, params.makeupGain / 20);
    const attCoeff = Math.exp(-1.0 / (Math.max(0.0001, params.attack) * sampleRate));
    const relCoeff = Math.exp(-1.0 / (Math.max(0.001, params.release) * sampleRate));

    let gr = 0; // Current Gain Reduction in dB (linked)

    for (let i = 0; i < buffer.length; i += 2) {
        const sL = buffer[i];
        const sR = buffer[i + 1];

        // Level detection (max of L/R for linked compression)
        const absMax = Math.max(Math.abs(sL), Math.abs(sR));
        const envDb = 20 * Math.log10(absMax + 1e-6);

        let targetGR = 0;
        const overshoot = envDb - params.threshold;
        if (overshoot > 0) {
            targetGR = overshoot * (1 - 1 / Math.max(1, params.ratio));
        }

        // Ballistics
        if (targetGR > gr) {
            gr = attCoeff * gr + (1 - attCoeff) * targetGR;
        } else {
            gr = relCoeff * gr + (1 - relCoeff) * targetGR;
        }

        const gain = Math.pow(10, -gr / 20);
        
        output[i] = sL * (1 - params.mix) + (sL * gain * makeup) * params.mix;
        output[i + 1] = sR * (1 - params.mix) + (sR * gain * makeup) * params.mix;
    }
    return output;
}
