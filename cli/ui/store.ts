import { create } from 'zustand';

// --- Types ---
export type View = 'MAIN' | 'RACK' | 'ADD_MODULE' | 'MODULE_EDIT' | 'LOAD_FILE' | 'EXPORT';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export interface MeteringState {
  input: number;
  output: number;
  gainReduction: number;
  rack: Record<string, any>;
}

export interface ModuleDescriptor {
  type: string;
  params: {
    name: string;
    defaultValue: number;
    minValue: number;
    maxValue: number;
  }[];
}

export interface TUIState {
  view: View;
  rack: any[];
  playback: PlaybackState;
  metering: MeteringState;
  selectedModuleId: string | null;
  message: string;
  isExporting: boolean;
  moduleDescriptors: Record<string, ModuleDescriptor>;
  
  // Actions
  setView: (view: View) => void;
  setRack: (rack: any[]) => void;
  setPlayback: (playback: PlaybackState) => void;
  setMetering: (metering: MeteringState) => void;
  setSelectedModuleId: (id: string | null) => void;
  setMessage: (message: string, duration?: number) => void;
  setIsExporting: (isExporting: boolean) => void;
  setModuleDescriptors: (descriptors: Record<string, ModuleDescriptor>) => void;
}

export const useTUIStore = create<TUIState>((set, get) => ({
  // --- State ---
  view: 'MAIN',
  rack: [],
  playback: { isPlaying: false, currentTime: 0, duration: 0 },
  metering: { input: -60, output: -60, gainReduction: 0, rack: {} },
  selectedModuleId: null,
  message: '',
  isExporting: false,
  moduleDescriptors: {},

  // --- Actions ---
  setView: (view) => set({ view }),
  setRack: (rack) => set({ rack }),
  setPlayback: (playback) => set({ playback }),
  setMetering: (metering) => set({ metering }),
  setSelectedModuleId: (id) => set({ selectedModuleId: id }),
  setMessage: (message, duration) => {
    set({ message });
    if (duration) {
      setTimeout(() => {
        if (get().message === message) {
          set({ message: '' });
        }
      }, duration);
    }
  },
  setIsExporting: (isExporting) => set({ isExporting }),
  setModuleDescriptors: (descriptors) => set({ moduleDescriptors: descriptors }),
}));
