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

export const DistortionUnit: React.FC<Props> = ({ module, onRemove, onBypass, onUpdate, dragHandleProps }) => {
  const types = ['Tanh', 'Atan', 'Cubic'];

  return (
    <ModuleShell
      title="Distortion"
      isBypassed={module.bypass}
      onBypass={onBypass}
      onRemove={onRemove}
      color="text-red-500"
      dragHandleProps={dragHandleProps}
    >
      <div className="flex flex-col gap-3">
        <div className="flex gap-4 justify-center">
            <Knob
                label="Drive"
                value={module.parameters.drive}
                min={1}
                max={100}
                onChange={(v) => onUpdate('drive', v)}
            />
            <Knob
                label="Mix"
                value={module.parameters.wet}
                min={0}
                max={1}
                onChange={(v) => onUpdate('wet', v)}
            />
            <Knob
                label="Out"
                value={module.parameters.outputGain}
                min={-24}
                max={24}
                unit="dB"
                onChange={(v) => onUpdate('outputGain', v)}
            />
        </div>

        {/* Type Selector */}
        <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Type</span>
            <div className="flex bg-slate-950/50 rounded p-0.5 border border-slate-800">
                {types.map((label, idx) => (
                    <button
                        key={label}
                        onClick={() => onUpdate('type', idx)}
                        className={clsx(
                            "px-3 py-1 text-[9px] font-bold rounded transition-all",
                            Math.round(module.parameters.type) === idx
                                ? "bg-red-500 text-slate-950 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
      </div>
    </ModuleShell>
  );
};