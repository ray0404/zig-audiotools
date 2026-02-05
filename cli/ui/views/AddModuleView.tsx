import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { useTUIStore } from '../store.js';
import { AudioBridge } from '../../engine/audio-bridge.js';

export const AddModuleView = ({ bridge }: { bridge: AudioBridge }) => {
  const { setView, moduleDescriptors } = useTUIStore();

  const availableTypes = Object.keys(moduleDescriptors);
  const items = availableTypes.map(t => ({ label: t, value: t }));
  items.push({ label: '< Cancel', value: 'BACK' });
  
  return (
    <Box flexDirection="column">
      <Text bold>Add Module</Text>
      <SelectInput limit={10} items={items} onSelect={async (item) => {
        if (item.value === 'BACK') setView('RACK');
        else {
          await bridge.addModule(item.value);
          setView('RACK');
        }
      }} />
    </Box>
  );
};
