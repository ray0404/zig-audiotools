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

export const BitCrusherUnit: React.FC<Props> = ({ module, onRemove, onBypass, onUpdate, dragHandleProps }) => {
  return (
    <ModuleShell
      title="BitCrusher"
      isBypassed={module.bypass}
      onBypass={onBypass}
      onRemove={onRemove}
      color="text-yellow-500"
      dragHandleProps={dragHandleProps}
    >
      <div className="flex gap-4 justify-center">
        <Knob
            label="Bits"
            value={module.parameters.bits}
            min={1}
            max={16}
            step={1}
            onChange={(v) => onUpdate('bits', v)}
        />
        <Knob
            label="Freq"
            value={module.parameters.normFreq}
            min={0.001}
            max={1}
            onChange={(v) => onUpdate('normFreq', v)}
        />
         <Knob
            label="Mix"
            value={module.parameters.mix}
            min={0}
            max={1}
            onChange={(v) => onUpdate('mix', v)}
        />
      </div>
    </ModuleShell>
  );
};
