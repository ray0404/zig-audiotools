import React from 'react';
import { ModuleShell } from '../ui/ModuleShell';
import { Knob } from '../ui/Knob';
import { RackModule } from '@/store/useAudioStore';
import { clsx } from 'clsx';

interface Props {
  module: RackModule;
  onRemove: () => void;
  onBypass: () => void;
  onUpdate: (param: string, value: any) => void;
  dragHandleProps?: any;
}

export const PhaserUnit: React.FC<Props> = ({ module, onRemove, onBypass, onUpdate, dragHandleProps }) => {
  const stages = [2, 4, 6, 8];

  return (
    <ModuleShell
      title="Phaser"
      isBypassed={module.bypass}
      onBypass={onBypass}
      onRemove={onRemove}
      color="text-purple-400"
      dragHandleProps={dragHandleProps}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 justify-center">
            <Knob
                label="Rate"
                value={module.parameters.frequency}
                min={0.1}
                max={10}
                unit="Hz"
                onChange={(v) => onUpdate('frequency', v)}
            />
            <Knob
                label="Base"
                value={module.parameters.baseFrequency}
                min={50}
                max={5000}
                unit="Hz"
                onChange={(v) => onUpdate('baseFrequency', v)}
            />
            <Knob
                label="Range"
                value={module.parameters.octaves}
                min={0}
                max={5}
                onChange={(v) => onUpdate('octaves', v)}
            />
            <Knob
                label="Mix"
                value={module.parameters.wet}
                min={0}
                max={1}
                onChange={(v) => onUpdate('wet', v)}
            />
        </div>

        {/* Stages Selector */}
        <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Stages</span>
            <div className="flex bg-slate-950/50 rounded p-0.5 border border-slate-800">
                {stages.map((val) => (
                    <button
                        key={val}
                        onClick={() => onUpdate('stages', val)}
                        className={clsx(
                            "px-3 py-1 text-[9px] font-bold rounded transition-all",
                            Math.round(module.parameters.stages) === val
                                ? "bg-purple-500 text-slate-950 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                        )}
                    >
                        {val}
                    </button>
                ))}
            </div>
        </div>
      </div>
    </ModuleShell>
  );
};