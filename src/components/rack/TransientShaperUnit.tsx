import React from 'react';
import { RackModule } from '@/store/useAudioStore';
import { ModuleShell } from '@/components/ui/ModuleShell';
import { Knob } from '@/components/ui/Knob';

interface TransientShaperUnitProps {
  module: RackModule;
  onRemove: () => void;
  onBypass: () => void;
  onUpdate: (param: string, value: number) => void;
  dragHandleProps?: any;
}

export const TransientShaperUnit: React.FC<TransientShaperUnitProps> = ({ module, onRemove, onBypass, onUpdate, dragHandleProps }) => {
  return (
    <ModuleShell
        title="Transient Shaper"
        color="text-purple-400"
        onBypass={onBypass}
        onRemove={onRemove}
        isBypassed={module.bypass}
        dragHandleProps={dragHandleProps}
    >
      <div className="flex gap-8 justify-center p-4">
         <Knob
            label="Attack" unit="dB"
            value={module.parameters.attackGain} min={-24} max={24}
            onChange={(v) => onUpdate('attackGain', v)}
         />
         <div className="w-px h-12 bg-slate-700"></div>
         <Knob
            label="Sustain" unit="dB"
            value={module.parameters.sustainGain} min={-24} max={24}
            onChange={(v) => onUpdate('sustainGain', v)}
         />
         <div className="w-px h-12 bg-slate-700"></div>
         <Knob
            label="Mix"
            value={module.parameters.mix ?? 1} min={0} max={1}
            onChange={(v) => onUpdate('mix', v)}
         />
      </div>
    </ModuleShell>
  );
};
