
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import decode from 'audio-decode';
import { SonicEngine, PlaybackState, MeteringData, RackModule, RackModuleType } from '@sonic-core/index.js';
import { SonicForgeSDK } from '@sonic-core/sdk.js';
import { getModuleDescriptors } from '@sonic-core/module-descriptors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class NativeEngine implements SonicEngine {
  private sdk: SonicForgeSDK | null = null;
  private rack: RackModule[] = [];
  private sourceBuffer: Float32Array | null = null; // Assuming mono for now or interleaved
  private processedBuffer: Float32Array | null = null;
  private sampleRate: number = 44100;
  private duration: number = 0;
  private isPlaying: boolean = false;
  private currentTime: number = 0;

  constructor(private wasmPath: string) {}

  async init() {
    const wasmBuffer = fs.readFileSync(this.wasmPath);
    this.sdk = new SonicForgeSDK(wasmBuffer);
    await this.sdk.init();
  }

  async getModuleDescriptors() {
    return getModuleDescriptors();
  }

  async loadAudio(buffer: ArrayBuffer | Buffer) {
    const audio = await decode(buffer);
    // audio-decode returns an AudioBuffer-like object
    // We'll take the first channel for simplicity or interleave if stereo
    if (audio.numberOfChannels === 2) {
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
    
    let current = new Float32Array(this.sourceBuffer);
    
    for (const mod of this.rack) {
      if (mod.bypass) continue;
      
      switch (mod.type) {
        case 'LOUDNESS_METER': 
             current = this.sdk.processLufsNormalize(current, mod.parameters.targetLufs || -14);
             break;
        case 'PHASER': // Using as proxy for phase rotation for now if needed, or map correctly
             current = this.sdk.processPhaseRotation(current);
             break;
        case 'BITCRUSHER': // Proxy for De-clip or similar if we want to test
             current = this.sdk.processDeclip(current);
             break;
        // The "Smart Tools" mapping
        // In the TUI, we should probably add specific types for these
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
    this.rack.push({
      id,
      type,
      bypass: false,
      parameters: {} // Should populate with defaults from descriptors
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
    // Here we'd use a wav encoder
    // For now, just a placeholder success
    return true;
  }

  async close() {
    // Cleanup
  }
}
