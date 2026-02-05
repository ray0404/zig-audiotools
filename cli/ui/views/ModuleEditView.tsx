import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTUIStore } from '../store.js';
import { AudioBridge } from '../../engine/audio-bridge.js';

export const ModuleEditView = ({ bridge }: { bridge: AudioBridge }) => {
  const { rack, selectedModuleId, setView, moduleDescriptors, metering } = useTUIStore();
  const module = rack.find(m => m.id === selectedModuleId);
  const meter = metering.rack[module?.id || ''];
  
  const [selectedParamIdx, setSelectedParamIdx] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  if (!module) {
    return <Text>Module not found. Press Esc to go back.</Text>;
  }
  
  const descriptor = moduleDescriptors[module.type];
  const params = Object.keys(module.parameters);

  const getParamRange = (paramName: string) => {
    const paramDescriptor = descriptor?.params.find(p => p.name === paramName);
    return {
      min: paramDescriptor?.minValue ?? -1000,
      max: paramDescriptor?.maxValue ?? 1000,
    };
  };

  const onDelete = async () => {
    await bridge.removeModule(module.id);
    setView('RACK');
  };

  useInput(async (input, key) => {
    if (useTUIStore.getState().view !== 'MODULE_EDIT') return;

    // --- Editing Mode ---
    if (isEditing) {
        if (key.escape) {
            setIsEditing(false);
            return;
        }
        if (key.return) {
            const val = parseFloat(editValue);
            if (!isNaN(val)) {
                const currentParam = params[selectedParamIdx];
                const range = getParamRange(currentParam);
                const clamped = Math.max(range.min, Math.min(range.max, val));
                bridge.updateParam(module.id, currentParam, clamped).catch(() => {});
            }
            setIsEditing(false);
            return;
        }
        if (key.backspace || key.delete) {
            setEditValue(prev => prev.slice(0, -1));
            return;
        }
        // Allow basic numeric input
        if (/^[0-9.-]$/.test(input)) {
            setEditValue(prev => prev + input);
        }
        return;
    }

    // --- Navigation Mode ---
    if (key.escape) { setView('RACK'); return; }
    
    if (key.upArrow) setSelectedParamIdx(prev => Math.max(0, prev - 1));
    if (key.downArrow) setSelectedParamIdx(prev => Math.min(params.length, prev + 1));

    const currentParam = params[selectedParamIdx];
    
    if (currentParam) {
        // Enter Editing Mode
        if (key.return) {
            setIsEditing(true);
            setEditValue(module.parameters[currentParam].toString());
            return;
        }

        // Adjust Values with Arrows
        const val = module.parameters[currentParam];
        const range = getParamRange(currentParam);

        let step = 1;
        if (currentParam.toLowerCase().includes('gain')) step = 0.5;
        if (currentParam.toLowerCase().includes('threshold')) step = 1;
        if (currentParam.toLowerCase().includes('ratio')) step = 0.5;
        if (currentParam.toLowerCase().includes('attack') || currentParam.toLowerCase().includes('release')) step = 0.01;
        if (currentParam.toLowerCase().includes('freq')) step = 10;
        if (currentParam.toLowerCase().includes('mix') || currentParam.toLowerCase().includes('wet')) step = 0.05;
        
        if (key.shift) step *= 0.1;
        if (key.ctrl) step *= 5.0;

        let newVal = val;
        if (key.leftArrow) newVal -= step;
        if (key.rightArrow) newVal += step;

        newVal = Math.max(range.min, Math.min(range.max, newVal));

        if (newVal !== val) {
            bridge.updateParam(module.id, currentParam, newVal).catch(() => {});
        }
    } else {
        // Delete Button
        if (key.return && selectedParamIdx === params.length) {
             onDelete();
        }
    }
    
    if (input === 'b') {
        bridge.toggleModuleBypass(module.id).catch(() => {});
    }
  });

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text bold underline color={module.bypass ? 'gray' : 'yellow'}>
            {module.type} {module.bypass ? '(BYPASSED)' : ''}
        </Text>
        {meter && meter.reduction > 0 && (
            <Text color="red">
                GR: -{meter.reduction.toFixed(1)} dB {'█'.repeat(Math.min(10, Math.round(meter.reduction / 2)))}
            </Text>
        )}
      </Box>

      <Box flexDirection="column" marginY={1}>
         {params.map((p, i) => (
             <Box key={p}>
                 <Text color={i === selectedParamIdx ? (isEditing ? 'cyan' : 'green') : 'white'}>
                    {i === selectedParamIdx ? '> ' : '  '}
                    {p}: {
                        (i === selectedParamIdx && isEditing) 
                        ? <Text backgroundColor="blue" color="white"> {editValue} </Text>
                        : (typeof module.parameters[p] === 'number' ? module.parameters[p].toFixed(2) : module.parameters[p])
                    }
                 </Text>
             </Box>
         ))}
         <Box marginTop={1}>
             <Text color={selectedParamIdx === params.length ? 'red' : 'gray'}>
                {selectedParamIdx === params.length ? '> ' : '  '}
                [DELETE MODULE]
             </Text>
         </Box>
      </Box>
      <Text dimColor>
        {isEditing 
            ? 'Type value. Enter to confirm. Esc to cancel.' 
            : "Use Up/Down to select, Left/Right to adjust. Enter to Type. 'b' to bypass. Esc to back."}
      </Text>
    </Box>
  );
};
