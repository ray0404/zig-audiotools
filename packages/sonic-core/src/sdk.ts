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
      // Note: We must access memory.buffer again in case WASM memory grew during execution
      const outputView = new Float32Array(this.memory.buffer, ptr, channelData.length);
      return new Float32Array(outputView);
    } finally {
      // 5. Cleanup
      free(ptr, channelData.length);
    }
  }

  processDeclip(channelData: Float32Array, threshold: number): Float32Array {
    const { process_declip } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, (ptr, len) => process_declip(ptr, len, threshold));
  }

  processLufsNormalize(channelData: Float32Array, targetLufs: number): Float32Array {
    const { process_lufs_normalize } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, (ptr, len) => process_lufs_normalize(ptr, len, targetLufs));
  }

  processPhaseRotation(channelData: Float32Array): Float32Array {
    const { process_phase_rotation } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, process_phase_rotation);
  }

  processSpectralDenoise(channelData: Float32Array, noiseProfile?: Float32Array): Float32Array {
    if (!this.wasmInstance || !this.memory) {
      throw new Error('SDK not initialized. Call init() first.');
    }
    const { alloc, free, process_spectral_denoise } = this.wasmInstance.exports as any;

    const len = channelData.length;
    const ptr = alloc(len);
    
    // Optional Noise Profile
    let noisePtr = 0;
    const noiseLen = noiseProfile ? noiseProfile.length : 0;
    if (noiseProfile && noiseLen > 0) {
        noisePtr = alloc(noiseLen);
        new Float32Array(this.memory.buffer, noisePtr, noiseLen).set(noiseProfile);
    }

    try {
      // Copy target data
      new Float32Array(this.memory.buffer, ptr, len).set(channelData);

      // Process
      process_spectral_denoise(ptr, len, noisePtr, noiseLen);

      // Read back result
      const outputView = new Float32Array(this.memory.buffer, ptr, len);
      return new Float32Array(outputView);
    } finally {
      free(ptr, len);
      if (noisePtr) {
        free(noisePtr, noiseLen);
      }
    }
  }

  processMonoBass(channelData: Float32Array, sampleRate: number, cutoffFreq: number): Float32Array {
    const { process_mono_bass } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, (ptr, len) => process_mono_bass(ptr, len, sampleRate, cutoffFreq));
  }

  processPlosiveGuard(
    channelData: Float32Array,
    sampleRate: number,
    sensitivity: number,
    strength: number,
    cutoff: number
  ): Float32Array {
    const { process_plosiveguard } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, (ptr, len) =>
      process_plosiveguard(ptr, len, sampleRate, sensitivity, strength, cutoff)
    );
  }

  processVoiceIsolate(channelData: Float32Array, amount: number): Float32Array {
    const { process_voiceisolate } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, (ptr, len) => process_voiceisolate(ptr, len, amount));
  }

  processPsychodynamic(channelData: Float32Array, sampleRate: number, intensity: number, refDb: number): Float32Array {
    const { process_psychodynamic } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, (ptr, len) => process_psychodynamic(ptr, len, sampleRate, intensity, refDb));
  }

  processSmartLevel(channelData: Float32Array, targetLufs: number, maxGainDb: number, gateThresholdDb: number): Float32Array {
    const { process_smartlevel } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, (ptr, len) => process_smartlevel(ptr, len, targetLufs, maxGainDb, gateThresholdDb));
  }

  processDebleed(target: Float32Array, source: Float32Array, sensitivity: number, threshold: number): Float32Array {
    if (!this.wasmInstance || !this.memory) {
      throw new Error('SDK not initialized. Call init() first.');
    }
    const { alloc, free, process_debleed } = this.wasmInstance.exports as any;

    const len = target.length;
    if (source.length !== len) throw new Error('Target and Source length mismatch');

    const ptrTarget = alloc(len);
    const ptrSource = alloc(len);

    try {
      // Copy inputs
      new Float32Array(this.memory.buffer, ptrTarget, len).set(target);
      new Float32Array(this.memory.buffer, ptrSource, len).set(source);

      process_debleed(ptrTarget, ptrSource, len, sensitivity, threshold);

      // Read back result
      const resultView = new Float32Array(this.memory.buffer, ptrTarget, len);
      return new Float32Array(resultView);
    } finally {
      free(ptrTarget, len);
      free(ptrSource, len);
    }
  }

  processTapeStabilizer(
    channelData: Float32Array,
    sampleRate: number,
    nominalFreq: number,
    scanMin: number,
    scanMax: number,
    amount: number
  ): Float32Array {
    const { process_tapestabilizer } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, (ptr, len) =>
      process_tapestabilizer(ptr, len, sampleRate, nominalFreq, scanMin, scanMax, amount)
    );
  }

  spectralMatchAnalyze(channelData: Float32Array): number {
    if (!this.wasmInstance || !this.memory) throw new Error('SDK not initialized');
    const { alloc, free, spectralmatch_analyze_ref } = this.wasmInstance.exports as any;
    const ptr = alloc(channelData.length);
    try {
      new Float32Array(this.memory.buffer, ptr, channelData.length).set(channelData);
      return spectralmatch_analyze_ref(ptr, channelData.length);
    } finally {
      free(ptr, channelData.length);
    }
  }

  spectralMatchFree(analysisPtr: number): void {
    const { spectralmatch_free_analysis } = this.wasmInstance!.exports as any;
    spectralmatch_free_analysis(analysisPtr);
  }

  processSpectralMatch(channelData: Float32Array, analysisPtr: number, amount: number): Float32Array {
    const { process_spectralmatch } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, (ptr, len) => process_spectralmatch(ptr, len, analysisPtr, amount, 0.5));
  }

  processEchoVanish(channelData: Float32Array, sampleRate: number, amount: number, tailMs: number): Float32Array {
    const { process_echovanish } = this.wasmInstance!.exports as any;
    return this.processBuffer(channelData, (ptr, len) => process_echovanish(ptr, len, sampleRate, amount, tailMs));
  }
}