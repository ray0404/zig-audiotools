import React from 'react';
import ReactDOM from 'react-dom/client';
import { useAudioStore, mixerEngine } from './store/useAudioStore';
import { getModuleDescriptors } from '@sonic-core/module-descriptors';

const HeadlessApp = () => {
  return <div data-testid="headless-mount" style={{ display: 'none' }}>Sonic Forge Engine Running</div>;
};

function throttle(func: Function, limit: number, _options?: { leading?: boolean, trailing?: boolean }) {
    let lastFunc: any;
    let lastRan: any;
    return function(this: any) {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    }
}

const SonicForgeBridge = {
  init: async (tuiMode = false) => {
    await useAudioStore.getState().initializeEngine();
    console.log('[Headless] Audio Engine Initialized.');

    if (tuiMode && typeof window.__TUI_DISPATCH__ === 'function') {
      console.log('[Headless] TUI Mode Enabled.');

      const dispatchStateToTUI = () => {
        const state = useAudioStore.getState();
        const activeTrack = state.tracks[state.activeTrackId] || state.master;
        const rack = activeTrack.rack;
        const levels = mixerEngine.getRMSLevel();
        const rackStatus: Record<string, any> = {};
        
        rack.forEach(m => {
            const node = mixerEngine.getModuleNode(m.id) as any;
            if (node && typeof node.getReduction === 'function') {
                rackStatus[m.id] = { reduction: node.getReduction() };
            }
        });

        window.__TUI_DISPATCH__({
          rack: rack,
          playback: {
            isPlaying: state.isPlaying,
            currentTime: state.currentTime,
            duration: activeTrack.sourceDuration || 0,
          },
          metering: {
            input: levels.input,
            output: levels.output,
            gainReduction: 0,
            rack: rackStatus,
          },
        });
      };
      
      const throttledDispatch = throttle(dispatchStateToTUI, 200, { leading: true, trailing: true });
      useAudioStore.subscribe(() => {
        throttledDispatch();
      });
      dispatchStateToTUI();
    }
    return true;
  },

  exportAudio: async () => {
      // Stub
      return { success: false, error: "Offline export unavailable in multi-track mode yet." };
  },

  loadAudio: async (arrayBuffer: ArrayBuffer) => {
    try {
      console.log(`[Headless] Received ArrayBuffer: ${arrayBuffer.byteLength} bytes`);
      const ctx = mixerEngine.context;
      if (!ctx) throw new Error("Audio Context not initialized");

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const state = useAudioStore.getState();
      let trackId = state.activeTrackId;

      if (!trackId || trackId === 'MASTER') {
           useAudioStore.getState().addTrack("Audio 1");
           trackId = useAudioStore.getState().activeTrackId;
      }

      if (trackId && trackId !== 'MASTER') {
           const track = mixerEngine.getTrack(trackId);
           if (track) track.setSource(audioBuffer);
      }

      console.log(`[Headless] Audio Loaded.`);
      return { success: true, duration: audioBuffer.duration };
    } catch (error: any) {
      console.error('[Headless] Load Audio Failed', error);
      return { success: false, error };
    }
  },

  addModule: (type: any) => {
      const state = useAudioStore.getState();
      state.addModule(state.activeTrackId, type);
      return { success: true };
  },

  removeModule: (id: string) => {
      const state = useAudioStore.getState();
      state.removeModule(state.activeTrackId, id);
      return { success: true };
  },

  reorderRack: (startIndex: number, endIndex: number) => {
      const state = useAudioStore.getState();
      state.reorderRack(state.activeTrackId, startIndex, endIndex);
      return { success: true };
  },

  toggleModuleBypass: (id: string) => {
      const state = useAudioStore.getState();
      state.toggleModuleBypass(state.activeTrackId, id);
      return { success: true };
  },

  togglePlay: () => {
      useAudioStore.getState().togglePlay();
      return { success: true };
  },

  setMasterVolume: (val: number) => {
      useAudioStore.getState().setTrackVolume('MASTER', val);
      return { success: true };
  },

  updateParam: (moduleId: string, paramId: string, value: number) => {
    const state = useAudioStore.getState();
    state.updateModuleParam(state.activeTrackId, moduleId, paramId, value);
    return { success: true, value };
  },
  
  seek: (time: number) => {
      useAudioStore.getState().seek(time);
      return { success: true };
  },

  getModuleDescriptors: () => {
    return getModuleDescriptors();
  },

  getRack: () => {
      const state = useAudioStore.getState();
      return state.activeTrackId === 'MASTER' ? state.master.rack : state.tracks[state.activeTrackId]?.rack;
  },

  getPlaybackState: () => {
      const state = useAudioStore.getState();
      const activeTrack = state.tracks[state.activeTrackId] || state.master;
      return { 
          isPlaying: state.isPlaying,
          currentTime: state.currentTime,
          duration: activeTrack.sourceDuration || 0
      };
  },

  getMeteringData: () => {
     const levels = mixerEngine.getRMSLevel();
     const rackStatus: Record<string, any> = {};
     const state = useAudioStore.getState();
     const activeTrack = state.tracks[state.activeTrackId] || state.master;
     const rack = activeTrack.rack;
     
     rack.forEach(m => {
         const node = mixerEngine.getModuleNode(m.id) as any;
         if (node && typeof node.getReduction === 'function') {
             rackStatus[m.id] = { reduction: node.getReduction() };
         }
     });

     return {
       input: levels.input, 
       output: levels.output,
       gainReduction: 0,
       rack: rackStatus
     };
  }
};

declare global {
  interface Window {
    __SONICFORGE_BRIDGE__: typeof SonicForgeBridge;
    __TUI_DISPATCH__: (payload: any) => void;
  }
}

window.__SONICFORGE_BRIDGE__ = SonicForgeBridge;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HeadlessApp />
  </React.StrictMode>
);

console.log('[Headless] React App Mounted');
