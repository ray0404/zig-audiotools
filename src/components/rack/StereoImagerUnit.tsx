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

export const StereoImagerUnit: React.FC<Props> = ({ module, onRemove, onBypass, onUpdate, dragHandleProps }) => {
  return (
    <ModuleShell
      title="Multiband Imager"
      isBypassed={module.bypass}
      onBypass={onBypass}
      onRemove={onRemove}
      color="text-cyan-400"
      dragHandleProps={dragHandleProps}
    >
      <div className="flex flex-col gap-2">
        {/* Crossovers */}
        <div className="flex justify-center gap-4 text-[10px] text-slate-500">
            <div className="flex flex-col items-center">
                <span>Low X-Over</span>
                <input 
                    type="number" 
                    className="w-12 bg-slate-900 border border-slate-700 rounded px-1 text-center text-cyan-400"
                    value={module.parameters.lowFreq}
                    onChange={(e) => onUpdate('lowFreq', Number(e.target.value))}
                />
            </div>
            <div className="flex flex-col items-center">
                <span>High X-Over</span>
                <input 
                    type="number" 
                    className="w-12 bg-slate-900 border border-slate-700 rounded px-1 text-center text-cyan-400"
                    value={module.parameters.highFreq}
                    onChange={(e) => onUpdate('highFreq', Number(e.target.value))}
                />
            </div>
        </div>

        {/* Width Knobs */}
        <div className="flex justify-center gap-4">
            <Knob
                label="Low Width"
                value={module.parameters.widthLow}
                min={0}
                max={2}
                step={0.01}
                onChange={(v) => onUpdate('widthLow', v)}
            />
            <Knob
                label="Mid Width"
                value={module.parameters.widthMid}
                min={0}
                max={2}
                step={0.01}
                onChange={(v) => onUpdate('widthMid', v)}
            />
            <Knob
                label="High Width"
                value={module.parameters.widthHigh}
                min={0}
                max={2}
                step={0.01}
                onChange={(v) => onUpdate('widthHigh', v)}
            />
        </div>
      </div>
    </ModuleShell>
  );
};
