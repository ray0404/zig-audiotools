/**
 * Client-side bridge for the Offline Processor Worker.
 */

// @ts-ignore - Vite worker import
import ProcessorWorker from './offline-processor.worker?worker';

export type ProcessType = 'NORMALIZE' | 'DC_OFFSET' | 'STRIP_SILENCE' | 'ANALYZE_LUFS' | 'DENOISE' |
                          'LUFS_NORMALIZE' | 'PHASE_ROTATION' | 'DECLIP' | 'SPECTRAL_DENOISE' | 'MONO_BASS';

export interface ProcessResult {
  leftChannel: Float32Array;
  rightChannel: Float32Array;
  metadata?: any;
}

export class OfflineProcessorClient {
  private worker: Worker;
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();

  constructor() {
    this.worker = new ProcessorWorker();
    this.worker.onmessage = (event) => this.handleMessage(event);
  }

  private handleMessage(event: MessageEvent) {
    const { id, success, payload, error } = event.data;
    const request = this.pendingRequests.get(id);

    if (request) {
      if (success) {
        request.resolve(payload);
      } else {
        request.reject(new Error(error));
      }
      this.pendingRequests.delete(id);
    }
  }

  async process(
    type: ProcessType,
    leftChannel: Float32Array,
    rightChannel: Float32Array,
    sampleRate: number,
    params?: any
  ): Promise<ProcessResult> {
    const id = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Transfer the buffers to the worker to avoid copying large data
      this.worker.postMessage({
        id,
        type,
        payload: {
          leftChannel,
          rightChannel,
          sampleRate,
          params
        }
      }, [leftChannel.buffer, rightChannel.buffer]);
    });
  }

  // --- Convenience Methods ---

  /**
   * Normalize audio to a specific target LUFS using Zig WASM.
   */
  async normalizeLoudness(left: Float32Array, right: Float32Array, sampleRate: number, targetLufs: number = -14) {
    return this.process('LUFS_NORMALIZE', left, right, sampleRate, { target: targetLufs });
  }

  /**
   * Fix phase issues using All-Pass filters (Zig WASM).
   * Helps recover headroom.
   */
  async fixPhase(left: Float32Array, right: Float32Array, sampleRate: number) {
     return this.process('PHASE_ROTATION', left, right, sampleRate);
  }

  /**
   * Repair digital clipping using cubic interpolation (Zig WASM).
   */
  async repairClipping(left: Float32Array, right: Float32Array, sampleRate: number) {
      return this.process('DECLIP', left, right, sampleRate);
  }

  /**
   * Adaptive Spectral Denoise (Zig WASM).
   */
  async denoise(left: Float32Array, right: Float32Array, sampleRate: number) {
      return this.process('SPECTRAL_DENOISE', left, right, sampleRate);
  }

  /**
   * Make bass frequencies mono below a cutoff frequency (Zig WASM).
   */
  async monoBass(left: Float32Array, right: Float32Array, sampleRate: number, freq: number = 120) {
      return this.process('MONO_BASS', left, right, sampleRate, { freq });
  }

  terminate() {
    this.worker.terminate();
  }
}

// Singleton instance
export const offlineProcessor = new OfflineProcessorClient();