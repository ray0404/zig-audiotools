
import { RackModule, RackModuleType } from './types';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export interface MeteringData {
  levels: number[];
  peakLevels: number[];
}

export interface SonicEngine {
  init(): Promise<void>;
  getModuleDescriptors(): Promise<Record<string, any>>;
  loadAudio(buffer: ArrayBuffer | Buffer): Promise<void>;
  updateParam(moduleId: string, paramId: string, value: number): Promise<void>;
  addModule(type: RackModuleType): Promise<void>;
  removeModule(id: string): Promise<void>;
  reorderRack(start: number, end: number): Promise<void>;
  toggleModuleBypass(id: string): Promise<void>;
  togglePlay(): Promise<void>;
  setMasterVolume(val: number): Promise<void>;
  seek(time: number): Promise<void>;
  getRack(): Promise<RackModule[]>;
  getPlaybackState(): Promise<PlaybackState>;
  getMetering(): Promise<MeteringData>;
  exportAudio(outputPath: string): Promise<boolean>;
  close(): Promise<void>;
}
