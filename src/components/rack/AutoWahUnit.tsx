import React from 'react';
import { ModuleShell } from '../ui/ModuleShell';
import { Knob } from '../ui/Knob';
import { RackModule } from '@/store/useAudioStore';

interface Props {
  module: RackModule;
  onRemove: () => void;
  onBypass: () => void;
  onUpdate: (param: string, value: any) => void;
  dragHandleProps?: any;
}

export const AutoWahUnit: React.FC<Props> = ({ module, onRemove, onBypass, onUpdate, dragHandleProps }) => {
  return (
    <ModuleShell
      title="AutoWah"
      isBypassed={module.bypass}
      onBypass={onBypass}
      onRemove={onRemove}
      color="text-green-400"
      dragHandleProps={dragHandleProps}
    >
      <div className="flex gap-4 justify-center">
        <Knob
            label="Base"
            value={module.parameters.baseFrequency}
            min={20}
            max={5000}
            unit="Hz"
            onChange={(v) => onUpdate('baseFrequency', v)}
        />
        <Knob
            label="Sens"
            value={module.parameters.sensitivity}
            min={0}
            max={10}
            onChange={(v) => onUpdate('sensitivity', v)}
        />
        <Knob
            label="Range"
            value={module.parameters.octaves}
            min={0}
            max={8}
            onChange={(v) => onUpdate('octaves', v)}
        />
        <Knob
            label="Q"
            value={module.parameters.Q}
            min={0.1}
            max={20}
            onChange={(v) => onUpdate('Q', v)}
        />
        <Knob
            label="Mix"
            value={module.parameters.wet}
            min={0}
            max={1}
            onChange={(v) => onUpdate('wet', v)}
        />
      </div>
    </ModuleShell>
  );
};
