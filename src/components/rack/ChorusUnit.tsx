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

export const ChorusUnit: React.FC<Props> = ({ module, onRemove, onBypass, onUpdate, dragHandleProps }) => {
  return (
    <ModuleShell
      title="Chorus"
      isBypassed={module.bypass}
      onBypass={onBypass}
      onRemove={onRemove}
      color="text-blue-300"
      dragHandleProps={dragHandleProps}
    >
      <div className="flex gap-4 justify-center">
        <Knob
            label="Rate"
            value={module.parameters.frequency}
            min={0.1}
            max={10}
            unit="Hz"
            onChange={(v) => onUpdate('frequency', v)}
        />
        <Knob
            label="Depth"
            value={module.parameters.depth}
            min={0}
            max={0.01}
            onChange={(v) => onUpdate('depth', v)}
        />
        <Knob
            label="Delay"
            value={module.parameters.delayTime}
            min={0}
            max={0.1}
            unit="s"
            onChange={(v) => onUpdate('delayTime', v)}
        />
        <Knob
            label="Feed"
            value={module.parameters.feedback}
            min={0}
            max={0.95}
            onChange={(v) => onUpdate('feedback', v)}
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
