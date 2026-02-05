import React from 'react';
import { ModuleShell } from '../ui/ModuleShell';
import { Knob } from '../ui/Knob';
import { RackModule } from '@/store/useAudioStore';
import { Ear } from 'lucide-react'; // Icon for monitor

interface Props {
  module: RackModule;
  onRemove: () => void;
  onBypass: () => void;
  onUpdate: (param: string, value: any) => void;
  dragHandleProps?: any;
}

export const DeEsserUnit: React.FC<Props> = ({ module, onRemove, onBypass, onUpdate, dragHandleProps }) => {
  const isMonitor = module.parameters.monitor > 0.5;

  return (
    <ModuleShell
      title="De-Esser"
      isBypassed={module.bypass}
      onBypass={onBypass}
      onRemove={onRemove}
      color="text-yellow-400"
      dragHandleProps={dragHandleProps}
    >
      <div className="flex flex-col gap-3">
        <div className="flex justify-center gap-4">
            <Knob
                label="Freq"
                value={module.parameters.frequency}
                min={2000}
                max={10000}
                unit="Hz"
                onChange={(v) => onUpdate('frequency', v)}
            />
            <Knob
                label="Thresh"
                value={module.parameters.threshold}
                min={-60}
                max={0}
                unit="dB"
                onChange={(v) => onUpdate('threshold', v)}
            />
            <Knob
                label="Ratio"
                value={module.parameters.ratio}
                min={1}
                max={20}
                onChange={(v) => onUpdate('ratio', v)}
            />
        </div>
        
        <div className="flex justify-center items-center gap-2">
            <button
                onClick={() => onUpdate('monitor', isMonitor ? 0 : 1)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${isMonitor ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}
            >
                <Ear size={12} />
                Monitor Sidechain
            </button>
        </div>
      </div>
    </ModuleShell>
  );
};
