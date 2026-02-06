
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import decode from 'audio-decode';
import { SonicEngine, PlaybackState, MeteringData, RackModule, RackModuleType } from '../../packages/sonic-core/src/index.js';
import { SonicForgeSDK } from '../../packages/sonic-core/src/sdk.js';
import { getModuleDescriptors } from '../../packages/sonic-core/src/module-descriptors.js';
import { encodeWAV } from '../../src/utils/wav-export.js';
import * as OfflineDSP from '../../packages/sonic-core/src/core/offline-processors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class NativeEngine implements SonicEngine {
  private sdk: SonicForgeSDK | null = null;
  private rack: RackModule[] = [];
  private sourceBuffer: Float32Array | null = null; // Assuming mono for now or interleaved
  private processedBuffer: Float32Array | null = null;
  private numChannels: number = 1;
  private sampleRate: number = 44100;
  private duration: number = 0;
  private isPlaying: boolean = false;
  private currentTime: number = 0;

  constructor(private wasmPath: string) {}

  async init() {
    const wasmBuffer = fs.readFileSync(this.wasmPath);
    const arrayBuffer = wasmBuffer.buffer.slice(
      wasmBuffer.byteOffset, 
      wasmBuffer.byteOffset + wasmBuffer.byteLength
    ) as ArrayBuffer;
    this.sdk = new SonicForgeSDK(arrayBuffer);
    await this.sdk.init();
  }

  async getModuleDescriptors() {
    return getModuleDescriptors();
  }

  async loadAudio(buffer: ArrayBuffer | Buffer) {
    const audio = await decode(buffer);
    // audio-decode returns an AudioBuffer-like object
    // We'll take the first channel for simplicity or interleave if stereo
    this.numChannels = audio.numberOfChannels;
    if (this.numChannels === 2) {
        this.sourceBuffer = this.interleave(audio.getChannelData(0), audio.getChannelData(1));
    } else {
        this.sourceBuffer = audio.getChannelData(0);
    }
    this.sampleRate = audio.sampleRate;
    this.duration = audio.duration;
    this.processedBuffer = new Float32Array(this.sourceBuffer);
    this.applyRack();
  }

  private interleave(l: Float32Array, r: Float32Array): Float32Array {
    const result = new Float32Array(l.length + r.length);
    for (let i = 0; i < l.length; i++) {
      result[i * 2] = l[i];
      result[i * 2 + 1] = r[i];
    }
    return result;
  }

  private applyRack() {
    if (!this.sourceBuffer || !this.sdk) return;
    
    let current: any = new Float32Array(this.sourceBuffer);
    
    for (const mod of this.rack) {
      if (mod.bypass) continue;
      
      switch (mod.type) {
        case 'LOUDNESS_METER': 
             current = this.sdk.processLufsNormalize(current, mod.parameters.targetLufs || -14);
             break;
        case 'DE_CLIP':
             current = this.sdk.processDeclip(current);
             break;
        case 'PHASE_ROTATION':
             current = this.sdk.processPhaseRotation(current);
             break;
        case 'SPECTRAL_DENOISE':
             current = this.sdk.processSpectralDenoise(current);
             break;
        case 'MONO_BASS':
             current = this.sdk.processMonoBass(current, this.sampleRate, mod.parameters.frequency || 120);
             break;
        case 'PLOSIVE_GUARD':
             current = this.sdk.processPlosiveGuard(
               current, 
               this.sampleRate, 
               mod.parameters.sensitivity || 0.5, 
               mod.parameters.strength || 0.5, 
               mod.parameters.cutoff || 200
             );
             break;
        case 'VOICE_ISOLATE':
             current = this.sdk.processVoiceIsolate(current, mod.parameters.amount || 0.5);
             break;
        case 'SMART_LEVEL':
             current = this.sdk.processSmartLevel(
               current, 
               mod.parameters.targetLufs || -14, 
               mod.parameters.maxGainDb || 12, 
               mod.parameters.gateThresholdDb || -60
             );
             break;
        case 'TAPE_STABILIZER':
             current = this.sdk.processTapeStabilizer(
               current, 
               this.sampleRate, 
               mod.parameters.nominalFreq || 3150, 
               mod.parameters.scanMin || 3000, 
               mod.parameters.scanMax || 3300, 
               mod.parameters.amount || 0.5
             );
             break;
        case 'ECHO_VANISH':
             current = this.sdk.processEchoVanish(
               current, 
               this.sampleRate, 
               mod.parameters.amount || 0.5, 
               mod.parameters.tailMs || 500
             );
             break;
        case 'BITCRUSHER':
             current = OfflineDSP.applyBitCrusher(
               current, 
               mod.parameters.bits || 8, 
               mod.parameters.normFreq || 1, 
               mod.parameters.mix || 1
             );
             break;
        case 'SATURATION':
             current = OfflineDSP.applySaturation(
               current, 
               mod.parameters.drive || 0, 
               mod.parameters.type || 1, 
               mod.parameters.outputGain || 0, 
               mod.parameters.mix || 1
             );
             break;
        case 'PARAMETRIC_EQ':
             current = OfflineDSP.applyParametricEQ(current, this.sampleRate, {
                lowFreq: mod.parameters.lowFreq || 100,
                lowGain: mod.parameters.lowGain || 0,
                midFreq: mod.parameters.midFreq || 1000,
                midGain: mod.parameters.midGain || 0,
                midQ: mod.parameters.midQ || 0.707,
                highFreq: mod.parameters.highFreq || 5000,
                highGain: mod.parameters.highGain || 0,
             });
             break;
        case 'COMPRESSOR':
             current = OfflineDSP.applyCompressor(current, this.sampleRate, {
                threshold: mod.parameters.threshold || -24,
                ratio: mod.parameters.ratio || 4,
                attack: mod.parameters.attack || 0.01,
                release: mod.parameters.release || 0.1,
                makeupGain: mod.parameters.makeupGain || 0,
                mix: mod.parameters.mix || 1
             });
             break;
        // For modules that are NOT Zig-based yet in the CLI, we skip or add placeholders
      }
    }
    
    this.processedBuffer = current;
  }

  async updateParam(moduleId: string, paramId: string, value: number) {
    const mod = this.rack.find(m => m.id === moduleId);
    if (mod) {
      mod.parameters[paramId] = value;
      this.applyRack();
    }
  }

  async addModule(type: RackModuleType) {
    const id = Math.random().toString(36).substr(2, 9);
    const descriptors = getModuleDescriptors();
    const descriptor = descriptors[type];
    const parameters: Record<string, any> = {};
    
    if (descriptor) {
      for (const p of descriptor.params) {
        parameters[p.name] = p.defaultValue;
      }
    }

    this.rack.push({
      id,
      type,
      bypass: false,
      parameters
    });
    this.applyRack();
  }

  async removeModule(id: string) {
    this.rack = this.rack.filter(m => m.id !== id);
    this.applyRack();
  }

  async reorderRack(start: number, end: number) {
    const [removed] = this.rack.splice(start, 1);
    this.rack.splice(end, 0, removed);
    this.applyRack();
  }

  async toggleModuleBypass(id: string) {
    const mod = this.rack.find(m => m.id === id);
    if (mod) {
      mod.bypass = !mod.bypass;
      this.applyRack();
    }
  }

  async togglePlay() {
    this.isPlaying = !this.isPlaying;
    // Real playback in TUI would need a library like 'node-speaker'
  }

  async setMasterVolume(val: number) {
    // TODO
  }

  async seek(time: number) {
    this.currentTime = time;
  }

  async getRack() {
    return this.rack;
  }

  async getPlaybackState(): Promise<PlaybackState> {
    return {
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration
    };
  }

  async getMetering(): Promise<MeteringData> {
    return {
      levels: [0, 0],
      peakLevels: [0, 0]
    };
  }

  async exportAudio(outputPath: string): Promise<boolean> {
    if (!this.processedBuffer) return false;
    
    try {
      const wavBuffer = encodeWAV(
        this.processedBuffer, 
        this.numChannels, 
        this.sampleRate, 
        this.numChannels === 2 ? 1 : 1, // Format 1 is PCM
        16 // Default to 16-bit for now
      );
      
      fs.writeFileSync(outputPath, Buffer.from(wavBuffer));
      return true;
    } catch (e) {
      console.error('Export error:', e);
      return false;
    }
  }

  async close() {
    // Cleanup
  }
}
