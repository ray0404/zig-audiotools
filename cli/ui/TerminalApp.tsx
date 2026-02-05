import React, { useEffect } from 'react';
import { Box, useInput, useApp } from 'ink';
import { AudioBridge } from '../engine/audio-bridge.js';
import { useTUIStore } from './store.js';

// Import Views
import { MainView } from './views/MainView.js';
import { RackView } from './views/RackView.js';
import { AddModuleView } from './views/AddModuleView.js';
import { ModuleEditView } from './views/ModuleEditView.js';
import { LoadFileView } from './views/LoadFileView.js';
import { ExportView } from './views/ExportView.js';

export const TerminalApp = ({ bridge }: { bridge: AudioBridge }) => {
  const { view, setView, setRack, setPlayback, setMessage, setModuleDescriptors, playback } = useTUIStore();
  const { exit } = useApp();

  // Initial state hydration
  useEffect(() => {
    const syncInitialState = async () => {
      try {
        const [initialRack, initialPlayback, descriptors] = await Promise.all([
          bridge.getRack(),
          bridge.getPlaybackState(),
          bridge.getModuleDescriptors(),
        ]);
        
        setRack(initialRack || []);
        setPlayback(initialPlayback || { isPlaying: false, currentTime: 0, duration: 0 });
        setModuleDescriptors(descriptors || {});

      } catch (e) {
        setMessage('Error connecting to engine.');
      }
    };
    syncInitialState();
  }, [bridge, setRack, setPlayback, setMessage, setModuleDescriptors]);

  // Global Shortcuts
  useInput(async (input, key) => {
      const currentView = useTUIStore.getState().view;
      
      // Strict blocking for views that require full keyboard input
      if (['LOAD_FILE', 'EXPORT'].includes(currentView)) return;

      // For Module Edit, we need to be careful. 
      // If we are just navigating (arrows), shortcuts are fine.
      // But we don't know if user is 'typing' a number.
      // For safety, we block letter keys in MODULE_EDIT, but allow Space (Play/Pause).
      const isInputSensitive = currentView === 'MODULE_EDIT';

      // Play/Pause - Global
      if (input === ' ') {
          await bridge.togglePlay();
          return;
      }

      // Exit (Global-ish, but dangerous if typing)
      if (currentView === 'MAIN' && (input === 'x' || input === 'X')) {
          exit();
          return;
      }

      // Escape to Main
      if (key.escape && currentView !== 'MAIN') {
           setView('MAIN');
           return;
      }

      // --- Shortcuts blocked in sensitive views ---
      if (isInputSensitive) return;

      // Transport
      if (input === 's') { // Stop
          if (playback.isPlaying) await bridge.togglePlay();
          await bridge.seek(0);
      }
      if (input === ',') { // Rewind
          await bridge.seek(Math.max(0, playback.currentTime - 5));
      }
      if (input === '.') { // Forward
          await bridge.seek(Math.min(playback.duration, playback.currentTime + 5));
      }

      // Navigation
      if (input === 'm') {
          setView('RACK');
      }
      if (input === 'f' && currentView === 'MAIN') { // Load File
          setView('LOAD_FILE');
      }
      // Export is 'S' (Shift+s) to avoid conflict with Stop 's'? 
      // Or maybe 'e'. The prompt suggested 's' for Stop.
      if (currentView === 'MAIN' && input === 'S') { // Shift+S for Export
           setView('EXPORT');
      }
  });

  const renderView = () => {
    switch (view) {
      case 'RACK':
        return <RackView bridge={bridge} />;
      case 'ADD_MODULE':
        return <AddModuleView bridge={bridge} />;
      case 'MODULE_EDIT':
        return <ModuleEditView bridge={bridge} />;
      case 'LOAD_FILE':
        return <LoadFileView bridge={bridge} />;
      case 'EXPORT':
        return <ExportView bridge={bridge} />;
      case 'MAIN':
      default:
        return <MainView bridge={bridge} />;
    }
  };

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="cyan" minHeight={15}>
      {renderView()}
    </Box>
  );
};
