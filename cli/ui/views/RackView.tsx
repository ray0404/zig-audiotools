import React from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { useTUIStore } from '../store.js';
import { AudioBridge } from '../../engine/audio-bridge.js';

export const RackView = ({ bridge }: { bridge: AudioBridge }) => {
  const { rack, metering, setView, setSelectedModuleId } = useTUIStore();
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const rackMetering = metering.rack;

  const items = rack.map(m => {
      let label = `${m.bypass ? '[-]' : '[*]'} ${m.type} ${m.bypass ? '(Bypassed)' : ''}`;
      const meter = rackMetering[m.id];
      if (meter && meter.reduction > 0.1) {
          const len = Math.min(10, Math.round(meter.reduction / 2));
          const bar = '█'.repeat(len);
          label += `  GR:[${bar}] -${meter.reduction.toFixed(1)}dB`;
      }
      return { label, value: m.id };
  });
  items.push({ label: '+ Add Module', value: 'ADD' });
  items.push({ label: '< Back', value: 'BACK' });

  useInput(async (input) => {
      if (useTUIStore.getState().view !== 'RACK') return;
      if (highlightedIndex >= rack.length) return; 
      const selectedId = items[highlightedIndex]?.value;
      if (!selectedId || selectedId === 'ADD' || selectedId === 'BACK') return;

      if (input === 'b') {
          await bridge.toggleModuleBypass(selectedId);
      }
      if (input === 'u' || input === 'U') {
          if (highlightedIndex > 0) {
               await bridge.reorderRack(highlightedIndex, highlightedIndex - 1);
          }
      }
      if (input === 'd' || input === 'D') {
          if (highlightedIndex < rack.length - 1) {
               await bridge.reorderRack(highlightedIndex, highlightedIndex + 1);
          }
      }
  });

  return (
    <Box flexDirection="column">
      <Text bold>Effects Rack</Text>
      <Text dimColor>Controls: [Enter] Edit, [b] Bypass, [u] Move Up, [d] Move Down</Text>
      <SelectInput 
          items={items} 
          onHighlight={(item) => setHighlightedIndex(items.findIndex(i => i.value === item.value))}
          onSelect={(item) => {
            if (item.value === 'BACK') setView('MAIN');
            else if (item.value === 'ADD') setView('ADD_MODULE');
            else {
              setSelectedModuleId(item.value);
              setView('MODULE_EDIT');
            }
          }} 
      />
    </Box>
  );
};
