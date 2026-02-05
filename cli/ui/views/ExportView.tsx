import React from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useTUIStore } from '../store.js';
import { AudioBridge } from '../../engine/audio-bridge.js';
import path from 'path';

const InputListener = ({ onEsc }: { onEsc: () => void }) => {
  useInput((_, key) => {
    if (key.escape) onEsc();
  });
  return null;
};

export const ExportView = ({ bridge }: { bridge: AudioBridge }) => {
  const { isExporting, setIsExporting, message, setMessage, setView } = useTUIStore();
  const [exportPath, setExportPath] = React.useState('output.wav');

  const handleSubmit = async (pathStr: string) => {
      setIsExporting(true);
      setMessage('Rendering offline... please wait.');
      try {
          const target = path.isAbsolute(pathStr) ? pathStr : path.resolve(process.cwd(), pathStr);
          await bridge.exportAudio(target);
          setMessage(`Success! Saved to: ${target}`, 2500);
          setView('MAIN');
      } catch (e: any) {
          setMessage(`Export Error: ${e.message}`);
      } finally {
          setIsExporting(false);
      }
  };

  return (
    <Box flexDirection="column">
      <Text bold>Export Filename (WAV):</Text>
      <Box borderStyle="round" borderColor="gray">
        <TextInput 
          value={exportPath} 
          onChange={setExportPath} 
          onSubmit={handleSubmit}
        />
      </Box>
      {isExporting ? (
           <Box><Spinner type="dots" /><Text> Rendering... This may take a moment.</Text></Box>
      ) : (
           <Text color="gray">Press Enter to render & save, Esc to cancel</Text>
      )}
      {message && !isExporting && <Text color={message.startsWith('Error') ? 'red' : 'green'}>{message}</Text>}
      {!isExporting && <InputListener onEsc={() => setView('MAIN')} />}
    </Box>
  );
};
