import { KWeightingFilter } from './lib/dsp-helpers.js';

class LUFSProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.kFilterL = new KWeightingFilter(sampleRate);
    this.kFilterR = new KWeightingFilter(sampleRate);
    
    // Windows in samples
    // Momentary: 400ms
    this.momentaryWindow = Math.floor(0.400 * sampleRate);
    // Short-term: 3s
    this.shortTermWindow = Math.floor(3.0 * sampleRate);

    // Circular buffers for energy integration
    this.bufferM = new Float32Array(this.momentaryWindow);
    this.bufferS = new Float32Array(this.shortTermWindow);
    this.idxM = 0;
    this.idxS = 0;
    
    // Running sums for efficiency
    this.sumM = 0;
    this.sumS = 0;

    this.framesProcessed = 0;
  }

  process(inputs, outputs) {
    // Pass-through audio
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || input.length === 0) return true;

    // Copy input to output (metering shouldn't affect sound)
    for (let ch = 0; ch < input.length; ch++) {
        output[ch].set(input[ch]);
    }

    const inputL = input[0];
    const inputR = input.length > 1 ? input[1] : input[0]; // Fallback to mono if needed

    for (let i = 0; i < inputL.length; i++) {
        const L = inputL[i];
        const R = inputR[i];

        // 1. K-Weighting
        const kL = this.kFilterL.process(L);
        const kR = this.kFilterR.process(R);

        // 2. Mean Square (Energy)
        // Standard says sum channels? 
        // ITU-R BS.1770-4: z_i = y_i^2 (for each channel), then sum channels with weighting.
        // For stereo: Energy = L^2 + R^2 (assuming standard weighting)
        const energy = (kL * kL) + (kR * kR);

        // 3. Update Momentary Window
        // Remove old value from sum
        this.sumM -= this.bufferM[this.idxM];
        // Add new value
        this.bufferM[this.idxM] = energy;
        this.sumM += energy;
        // Advance index
        this.idxM = (this.idxM + 1) % this.momentaryWindow;

        // 4. Update Short-Term Window
        this.sumS -= this.bufferS[this.idxS];
        this.bufferS[this.idxS] = energy;
        this.sumS += energy;
        this.idxS = (this.idxS + 1) % this.shortTermWindow;
    }

    // Report values periodically (e.g. every ~100ms or 30fps)
    this.framesProcessed += 128;
    if (this.framesProcessed >= 2048) { // Approx 46ms at 44.1k
        // Calculate LUFS
        // 10 * log10(mean_energy) - 0.691
        // mean_energy = sum / window_size
        
        const meanM = this.sumM / this.momentaryWindow;
        const meanS = this.sumS / this.shortTermWindow;

        // Prevent log(0)
        const lufsM = meanM > 1e-9 ? (10 * Math.log10(meanM) - 0.691) : -100;
        const lufsS = meanS > 1e-9 ? (10 * Math.log10(meanS) - 0.691) : -100;

        this.port.postMessage({ 
            type: 'meter', 
            momentary: lufsM, 
            shortTerm: lufsS 
        });
        this.framesProcessed = 0;
    }

    return true;
  }
}

registerProcessor('lufs-processor', LUFSProcessor);
