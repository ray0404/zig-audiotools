/**
 * Sonic Forge - Offline Audio Processor Worker
 * Handles heavy DSP tasks in a background thread.
 * Now enhanced with Zig WASM for high-performance processing.
 */

interface ProcessorMessage {
  id: string;
  type: 'NORMALIZE' | 'DC_OFFSET' | 'STRIP_SILENCE' | 'ANALYZE_LUFS' | 'DENOISE' | 
        'LUFS_NORMALIZE' | 'PHASE_ROTATION' | 'DECLIP' | 'SPECTRAL_DENOISE' | 'MONO_BASS';
  payload: {
    leftChannel: Float32Array;
    rightChannel: Float32Array;
    sampleRate: number;
    params?: any;
  };
}

// --- WASM Bridge ---

let wasmInstance: WebAssembly.Instance | null = null;
let wasmReadyPromise: Promise<void> | null = null;

async function initWasm() {
    if (wasmInstance) return;
    try {
        // In a worker, paths are relative to the worker script or need absolute path.
        // Assuming /wasm/dsp.wasm is served at root.
        const response = await fetch('/wasm/dsp.wasm');
        const bytes = await response.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(bytes, {
             env: {}
        });
        wasmInstance = instance;
    } catch (e) {
        console.error("Failed to load WASM module:", e);
        throw e;
    }
}

wasmReadyPromise = initWasm();

class WasmBridge {
    private get exports() {
        if (!wasmInstance) throw new Error("WASM not initialized");
        return wasmInstance.exports as any;
    }

    private get memory() {
        return this.exports.memory as WebAssembly.Memory;
    }

    alloc(len: number): number {
        return this.exports.alloc(len);
    }

    free(ptr: number, len: number) {
        this.exports.free(ptr, len);
    }

    processInPlace(data: Float32Array, processFn: (ptr: number, len: number, ...args: any[]) => void, ...args: any[]) {
        const len = data.length;
        const ptr = this.alloc(len * 4); // 4 bytes per float
        if (ptr === 0) throw new Error("WASM allocation failed");

        try {
            // Copy data to WASM memory
            const wasmView = new Float32Array(this.memory.buffer, ptr, len);
            wasmView.set(data);

            // Execute
            processFn(ptr, len, ...args);

            // Copy back
            // Re-acquire view as memory might have grown (though standard alloc usually doesn't trigger grow in valid range instantly, but good practice)
             const resView = new Float32Array(this.memory.buffer, ptr, len);
             data.set(resView);
        } finally {
            this.free(ptr, len * 4);
        }
    }

    // Process stereo channels independently (dual mono effect)
    processStereo(left: Float32Array, right: Float32Array, fnName: string, ...args: any[]) {
        const process = this.exports[fnName];
        if (!process) throw new Error(`WASM function ${fnName} not found`);

        this.processInPlace(left, process, ...args);
        this.processInPlace(right, process, ...args);
    }
    
    // Process stereo interleaved (for Mono Maker)
    processInterleaved(left: Float32Array, right: Float32Array, fnName: string, ...args: any[]) {
        const process = this.exports[fnName];
        if (!process) throw new Error(`WASM function ${fnName} not found`);

        const len = left.length;
        const totalLen = len * 2;
        const ptr = this.alloc(totalLen * 4);
        if (ptr === 0) throw new Error("WASM allocation failed");

        try {
            const mem = new Float32Array(this.memory.buffer, ptr, totalLen);
            // Interleave
            for (let i = 0; i < len; i++) {
                mem[i * 2] = left[i];
                mem[i * 2 + 1] = right[i];
            }

            process(ptr, totalLen, ...args);

            // De-interleave
            const resMem = new Float32Array(this.memory.buffer, ptr, totalLen);
            for (let i = 0; i < len; i++) {
                left[i] = resMem[i * 2];
                right[i] = resMem[i * 2 + 1];
            }
        } finally {
             this.free(ptr, totalLen * 4);
        }
    }
}

const wasmBridge = new WasmBridge();

self.onmessage = async (event: MessageEvent<ProcessorMessage>) => {
  const { id, type, payload } = event.data;
  const { leftChannel, rightChannel, sampleRate, params } = payload;

  try {
    await wasmReadyPromise;

    let result: { left: Float32Array; right: Float32Array; metadata?: any };

    switch (type) {
      // --- JS Native ---
      case 'NORMALIZE':
        result = processNormalize(leftChannel, rightChannel, params?.target || -0.1);
        break;
      case 'DC_OFFSET':
        result = processDCOffset(leftChannel, rightChannel);
        break;
      case 'STRIP_SILENCE':
        result = processStripSilence(leftChannel, rightChannel, sampleRate, params?.threshold || -60, params?.minDuration || 0.1);
        break;
      case 'DENOISE':
        result = processDenoise(leftChannel, rightChannel, sampleRate);
        break;

      // --- WASM Powered ---
      case 'LUFS_NORMALIZE':
        // process_lufs_normalize(ptr, len, target_lufs)
        wasmBridge.processStereo(leftChannel, rightChannel, 'process_lufs_normalize', params?.target || -14.0);
        result = { left: leftChannel, right: rightChannel };
        break;
      
      case 'PHASE_ROTATION':
        // process_phase_rotation(ptr, len)
        wasmBridge.processStereo(leftChannel, rightChannel, 'process_phase_rotation');
        result = { left: leftChannel, right: rightChannel };
        break;

      case 'DECLIP':
        // process_declip(ptr, len)
        wasmBridge.processStereo(leftChannel, rightChannel, 'process_declip');
        result = { left: leftChannel, right: rightChannel };
        break;

      case 'SPECTRAL_DENOISE':
         // process_spectral_denoise(ptr, len)
         wasmBridge.processStereo(leftChannel, rightChannel, 'process_spectral_denoise');
         result = { left: leftChannel, right: rightChannel };
         break;

      case 'MONO_BASS':
        // process_mono_bass(ptr, len, freq)
        // Uses Interleaved processing
        wasmBridge.processInterleaved(leftChannel, rightChannel, 'process_mono_bass', params?.freq || 120.0);
        result = { left: leftChannel, right: rightChannel };
        break;

      default:
        throw new Error(`Unknown process type: ${type}`);
    }

    // Return the result and transfer the buffers back
    self.postMessage({
      id,
      success: true,
      payload: {
        leftChannel: result.left,
        rightChannel: result.right,
        metadata: result.metadata
      }
    }, [result.left.buffer, result.right.buffer] as any);

  } catch (error: any) {
    console.error("Worker Error:", error);
    self.postMessage({
      id,
      success: false,
      error: error.message
    });
  }
};

/**
 * Normalization Algorithm
 */
function processNormalize(left: Float32Array, right: Float32Array, targetDb: number) {
  let maxPeak = 0;

  // Find peak across both channels
  for (let i = 0; i < left.length; i++) {
    const absL = Math.abs(left[i]);
    const absR = Math.abs(right[i]);
    if (absL > maxPeak) maxPeak = absL;
    if (absR > maxPeak) maxPeak = absR;
  }

  if (maxPeak === 0) return { left, right };

  const targetLinear = Math.pow(10, targetDb / 20);
  const gain = targetLinear / maxPeak;

  // Apply gain
  for (let i = 0; i < left.length; i++) {
    left[i] *= gain;
    right[i] *= gain;
  }

  return { 
    left, 
    right, 
    metadata: { peakBefore: 20 * Math.log10(maxPeak), gainApplied: 20 * Math.log10(gain) } 
  };
}

/**
 * DC Offset Removal
 */
function processDCOffset(left: Float32Array, right: Float32Array) {
  let sumL = 0;
  let sumR = 0;

  for (let i = 0; i < left.length; i++) {
    sumL += left[i];
    sumR += right[i];
  }

  const offsetL = sumL / left.length;
  const offsetR = sumR / right.length;

  for (let i = 0; i < left.length; i++) {
    left[i] -= offsetL;
    right[i] -= offsetR;
  }

  return { 
    left, 
    right, 
    metadata: { offsetL, offsetR } 
  };
}

/**
 * Strip Silence (Simple Gate)
 */
function processStripSilence(left: Float32Array, right: Float32Array, sampleRate: number, thresholdDb: number, minDurationSec: number) {
  const threshold = Math.pow(10, thresholdDb / 20);
  const minSamples = minDurationSec * sampleRate;
  
  // Create a mask where 1 = keep, 0 = silence
  const mask = new Float32Array(left.length).fill(1);
  let silenceStart = -1;

  for (let i = 0; i < left.length; i++) {
    const amp = (Math.abs(left[i]) + Math.abs(right[i])) / 2;
    
    if (amp < threshold) {
      if (silenceStart === -1) silenceStart = i;
    } else {
      if (silenceStart !== -1) {
        // End of silence
        const duration = i - silenceStart;
        if (duration > minSamples) {
          // It was long enough, mark as silence
          for (let j = silenceStart; j < i; j++) mask[j] = 0;
        }
        silenceStart = -1;
      }
    }
  }

  // Handle trailing silence
  if (silenceStart !== -1) {
    const duration = left.length - silenceStart;
    if (duration > minSamples) {
      for (let j = silenceStart; j < left.length; j++) mask[j] = 0;
    }
  }

  // Apply mask
  for (let i = 0; i < left.length; i++) {
    left[i] *= mask[i];
    right[i] *= mask[i];
  }

  return {
    left,
    right,
    metadata: { thresholdDb }
  };
}

/**
 * Smart Denoise (Rumble + Hiss Filter)
 */
function processDenoise(left: Float32Array, right: Float32Array, sampleRate: number) {
  // 1. Remove Rumble: High-Pass @ 80Hz, Q=0.707
  const hpFilter = createBiQuadFilter('highpass', 80, sampleRate, 0.707);
  
  // 2. Remove Ultra-High Hiss: Low-Pass @ 18000Hz, Q=0.707
  const lpFilter = createBiQuadFilter('lowpass', 18000, sampleRate, 0.707);

  // Apply filters in series
  applyFilter(left, hpFilter);
  applyFilter(right, hpFilter);
  
  // Reset state for next filter (or create new ones)
  applyFilter(left, lpFilter);
  applyFilter(right, lpFilter);

  return { left, right };
}

// --- Filter Utils ---

interface BiQuadCoeffs {
  a0: number; a1: number; a2: number;
  b0: number; b1: number; b2: number;
}

function createBiQuadFilter(type: 'lowpass' | 'highpass', freq: number, sampleRate: number, q: number): BiQuadCoeffs {
  const w0 = 2 * Math.PI * freq / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const cosW0 = Math.cos(w0);

  let b0 = 0, b1 = 0, b2 = 0, a0 = 0, a1 = 0, a2 = 0;

  if (type === 'lowpass') {
    b0 = (1 - cosW0) / 2;
    b1 = 1 - cosW0;
    b2 = (1 - cosW0) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cosW0;
    a2 = 1 - alpha;
  } else if (type === 'highpass') {
    b0 = (1 + cosW0) / 2;
    b1 = -(1 + cosW0);
    b2 = (1 + cosW0) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cosW0;
    a2 = 1 - alpha;
  }

  return { a0, a1, a2, b0, b1, b2 };
}

function applyFilter(data: Float32Array, coeffs: BiQuadCoeffs) {
  const { b0, b1, b2, a0, a1, a2 } = coeffs;
  
  // Normalize by a0
  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  for (let i = 0; i < data.length; i++) {
    const x = data[i];
    const y = nb0 * x + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    
    data[i] = y;
    
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
}