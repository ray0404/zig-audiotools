import React from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useTUIStore } from '../store.js';
import { AudioBridge } from '../../engine/audio-bridge.js';
import fs from 'fs';
import path from 'path';

const InputListener = ({ onEsc }: { onEsc: () => void }) => {
  useInput((_, key) => {
    if (key.escape) onEsc();
  });
  return null;
};

export const LoadFileView = ({ bridge }: { bridge: AudioBridge }) => {
  const { message, setMessage, setView } = useTUIStore();
  const [filePath, setFilePath] = React.useState('');

  const handleSubmit = async (pathStr: string) => {
    setMessage('Loading...');
    try {
      if (!fs.existsSync(pathStr)) throw new Error('File not found');
      const buffer = fs.readFileSync(pathStr);
      await bridge.loadAudio(buffer);
      setMessage(`Loaded: ${path.basename(pathStr)}`, 1500);
      setView('MAIN');
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    }
  };

  return (
    <Box flexDirection="column">
      <Text bold>Enter absolute path to audio file:</Text>
      <Box borderStyle="round" borderColor="gray">
        <TextInput 
          value={filePath} 
          onChange={setFilePath} 
          onSubmit={handleSubmit} 
        />
      </Box>
      <Text color="gray">Press Enter to load, Esc to cancel</Text>
      {message && <Text color={message.startsWith('Error') ? 'red' : 'green'}>{message}</Text>}
      <InputListener onEsc={() => setView('MAIN')} />
    </Box>
  );
};
