
export class SonicForgeSDK {
  private wasmInstance: WebAssembly.Instance | null = null;
  private memory: WebAssembly.Memory | null = null;

  constructor(private wasmBinary: ArrayBuffer) {}

  async init() {
    const module = await WebAssembly.compile(this.wasmBinary);
    this.wasmInstance = await WebAssembly.instantiate(module, {
      env: {
        print: (ptr: number, len: number) => {
          const view = new Uint8Array(this.memory!.buffer, ptr, len);
          const decoder = new TextDecoder();
          console.log(decoder.decode(view));
        },
      }
    });
    this.memory = this.wasmInstance.exports.memory as WebAssembly.Memory;
  }

  /**
   * Universal processing wrapper for Zig DSP functions.
   * Handles allocation, memory copy, execution, and cleanup.
   */
  private processBuffer(
    channelData: Float32Array,
    processFn: (ptr: number, len: number, ...args: any[]) => void,
    ...extraArgs: any[]
  ): Float32Array {
    if (!this.wasmInstance || !this.memory) {
      throw new Error('SDK not initialized. Call init() first.');
    }

    const { alloc, free } = this.wasmInstance.exports as any;
    
    // 1. Allocate memory in WASM
    const ptr = alloc(channelData.length);
    
    try {
      // 2. Copy data to WASM
      const wasmSlice = new Float32Array(this.memory.buffer, ptr, channelData.length);
      wasmSlice.set(channelData);

      // 3. Process
      processFn(ptr, channelData.length, ...extraArgs);

      // 4. Return processed data (copying out of WASM memory)
      // Must recreate view because memory might have grown during processing
      const resultSlice = new Float32Array(this.memory.buffer, ptr, channelData.length);
      return new Float32Array(resultSlice);
    } finally {
      // 5. Cleanup
      free(ptr, channelData.length);
    }
  }

  processDeclip(channelData: Float32Array): Float32Array {
    const { process_declip } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, process_declip);
  }

  processLufsNormalize(channelData: Float32Array, targetLufs: number): Float32Array {
    const { process_lufs_normalize } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, (ptr, len) => process_lufs_normalize(ptr, len, targetLufs));
  }

  processPhaseRotation(channelData: Float32Array): Float32Array {
    const { process_phase_rotation } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, process_phase_rotation);
  }

  processSpectralDenoise(channelData: Float32Array): Float32Array {
    const { process_spectral_denoise } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, process_spectral_denoise);
  }

  processMonoBass(channelData: Float32Array, sampleRate: number, cutoffFreq: number): Float32Array {
    const { process_mono_bass } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, (ptr, len) => process_mono_bass(ptr, len, sampleRate, cutoffFreq));
  }

  analyzeReference(channelData: Float32Array): number {
    if (!this.wasmInstance || !this.memory) throw new Error('SDK not initialized');
    const { alloc, free, spectralmatch_analyze_ref } = this.wasmInstance.exports as any;

    const ptr = alloc(channelData.length);
    try {
      const wasmSlice = new Float32Array(this.memory.buffer, ptr, channelData.length);
      wasmSlice.set(channelData);
      return spectralmatch_analyze_ref(ptr, channelData.length);
    } finally {
      free(ptr, channelData.length);
    }
  }

  freeAnalysis(ptr: number) {
    if (!this.wasmInstance) return;
    const { spectralmatch_free_analysis } = this.wasmInstance.exports as any;
    spectralmatch_free_analysis(ptr);
  }

  processSpectralMatch(channelData: Float32Array, refPtr: number, amount: number, smooth: number): Float32Array {
    const { process_spectralmatch } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, (ptr, len) => process_spectralmatch(ptr, len, refPtr, amount, smooth));
  }
}
