import React from 'react';
import { ModuleShell } from '../ui/ModuleShell';
import { Knob } from '../ui/Knob';
import { RackModule } from '@/store/useAudioStore';

interface SaturationUnitProps {
  module: RackModule;
  onRemove: () => void;
  onBypass: () => void;
  onUpdate: (param: string, value: any) => void;
  dragHandleProps?: any;
}

export const SaturationUnit: React.FC<SaturationUnitProps> = ({
  module,
  onRemove,
  onBypass,
  onUpdate,
  dragHandleProps
}) => {
  const { parameters, bypass } = module;

  return (
    <ModuleShell
      title="Analog Saturation"
      color="text-orange-400"
      onRemove={onRemove}
      onBypass={onBypass}
      isBypassed={bypass}
      dragHandleProps={dragHandleProps}
    >
      <div className="flex items-center justify-around gap-4">
        {/* Drive Knob */}
        <Knob
          label="Drive"
          value={parameters.drive}
          min={0}
          max={10}
          step={0.1}
          onChange={(v: number) => onUpdate('drive', v)}
        />

        {/* Type Selection */}
        <div className="flex flex-col gap-2 p-2 bg-slate-950/50 rounded-lg border border-slate-800">
          <span className="text-[9px] text-slate-500 font-bold uppercase text-center tracking-wider">Mode</span>
          <div className="flex flex-col gap-1">
             {[
               { label: 'Tape', value: 0 },
               { label: 'Tube', value: 1 },
               { label: 'Fuzz', value: 2 }
             ].map((mode) => (
               <button
                 key={mode.label}
                 onClick={() => onUpdate('type', mode.value)}
                 className={`
                    px-3 py-1 text-[10px] rounded uppercase font-bold transition-all
                    ${parameters.type === mode.value 
                        ? 'bg-orange-500 text-slate-900 shadow-[0_0_8px_rgba(249,115,22,0.4)]' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
                 `}
               >
                 {mode.label}
               </button>
             ))}
          </div>
        </div>

        {/* Output Gain Knob */}
        <Knob
          label="Out Gain"
          unit="dB"
          value={parameters.outputGain}
          min={-12}
          max={12}
          step={0.1}
          onChange={(v: number) => onUpdate('outputGain', v)}
        />

        {/* Mix Knob */}
        <Knob
          label="Mix"
          value={parameters.mix ?? 1}
          min={0}
          max={1}
          step={0.01}
          onChange={(v: number) => onUpdate('mix', v)}
        />
      </div>
    </ModuleShell>
  );
};
