import React from 'react';
import { Box, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import { MeterBar } from '../components/MeterBar.js';
import { useTUIStore } from '../store.js';
import { AudioBridge } from '../../engine/audio-bridge.js';

export const MainView = ({ bridge }: { bridge: AudioBridge }) => {
  const { exit } = useApp();
  const { playback, metering, message, setView } = useTUIStore();

  const items = [
    { label: '[m] Manage Rack', value: 'RACK' },
    { label: '[f] Load Audio File', value: 'LOAD_FILE' },
    { label: playback.isPlaying ? '|| Pause [Space]' : '> Play [Space]', value: 'TOGGLE_PLAY' },
    { label: '[s] Stop', value: 'STOP' },
    { label: '[,] Rewind (5s)', value: 'REWIND' },
    { label: '[.] Forward (5s)', value: 'FORWARD' },
    { label: '[Shift+S] Export Audio', value: 'EXPORT' },
    { label: '[x] Exit', value: 'EXIT' }
  ];

  const handleSelect = async (item: any) => {
    if (item.value === 'EXIT') exit();
    else if (item.value === 'TOGGLE_PLAY') {
      await bridge.togglePlay();
    }
    else if (item.value === 'STOP') {
      if (playback.isPlaying) await bridge.togglePlay();
      await bridge.seek(0);
    }
    else if (item.value === 'REWIND') {
      await bridge.seek(Math.max(0, playback.currentTime - 5));
    }
    else if (item.value === 'FORWARD') {
      await bridge.seek(Math.min(playback.duration, playback.currentTime + 5));
    }
    else {
      setView(item.value);
    }
  };

  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>Sonic Forge TUI</Text>
      <Box marginY={1}>
        <MeterBar label="IN " value={metering.input} />
        <MeterBar label="OUT" value={metering.output} />
      </Box>
      <Text>Time: {playback.currentTime.toFixed(2)}s / {playback.duration.toFixed(2)}s</Text>
      {message && <Text color="green" bold>{message}</Text>}
      <Box marginTop={1}>
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>
    </Box>
  );
};