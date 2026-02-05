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

export const TremoloUnit: React.FC<Props> = ({ module, onRemove, onBypass, onUpdate, dragHandleProps }) => {
  return (
    <ModuleShell
      title="Tremolo"
      isBypassed={module.bypass}
      onBypass={onBypass}
      onRemove={onRemove}
      color="text-indigo-400"
      dragHandleProps={dragHandleProps}
    >
      <div className="flex gap-4 justify-center">
        <Knob
            label="Rate"
            value={module.parameters.frequency}
            min={0.1}
            max={20}
            unit="Hz"
            onChange={(v) => onUpdate('frequency', v)}
        />
        <Knob
            label="Depth"
            value={module.parameters.depth}
            min={0}
            max={1}
            onChange={(v) => onUpdate('depth', v)}
        />
        <Knob
            label="Spread"
            value={module.parameters.spread}
            min={0}
            max={1}
            onChange={(v) => onUpdate('spread', v)}
        />
        <Knob
            label="Mix"
            value={module.parameters.mix ?? 1}
            min={0}
            max={1}
            onChange={(v) => onUpdate('mix', v)}
        />
      </div>
    </ModuleShell>
  );
};
