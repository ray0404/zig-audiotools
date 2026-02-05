import React from 'react';
import { RackModule } from '@/store/useAudioStore';
import { ModuleShell } from '@/components/ui/ModuleShell';
import { Knob } from '@/components/ui/Knob';

interface MidSideEQUnitProps {
  module: RackModule;
  onRemove: () => void;
  onBypass: () => void;
  onUpdate: (param: string, value: number) => void;
  dragHandleProps?: any;
}

export const MidSideEQUnit: React.FC<MidSideEQUnitProps> = ({ module, onRemove, onBypass, onUpdate, dragHandleProps }) => {
  const minF = 20;
  const maxF = 20000;
  const minLog = Math.log(minF);
  const maxLog = Math.log(maxF);
  const scale = maxLog - minLog;

  const mapTo01Freq = (val: number) => (Math.log(val) - minLog) / scale;
  const mapFrom01Freq = (val: number) => Math.exp(val * scale + minLog);

  return (
    <ModuleShell
        title="Mid/Side EQ"
        color="text-green-400"
        onBypass={onBypass}
        onRemove={onRemove}
        isBypassed={module.bypass}
        dragHandleProps={dragHandleProps}
    >
      <div className="flex gap-8 justify-center p-2">
         {/* Mid Channel */}
         <div className="flex flex-col items-center gap-4 p-4 bg-slate-950/30 rounded border border-slate-800">
             <h4 className="text-xs font-bold text-green-500 uppercase tracking-widest">Mid (Sum)</h4>
             <div className="flex gap-4">
                <Knob
                    label="Freq" unit="Hz"
                    value={module.parameters.midFreq} min={20} max={20000}
                    mapTo01={mapTo01Freq} mapFrom01={mapFrom01Freq}
                    onChange={(v) => onUpdate('midFreq', v)}
                />
                <Knob
                    label="Gain" unit="dB"
                    value={module.parameters.midGain} min={-15} max={15}
                    onChange={(v) => onUpdate('midGain', v)}
                />
             </div>
         </div>

         {/* Side Channel */}
         <div className="flex flex-col items-center gap-4 p-4 bg-slate-950/30 rounded border border-slate-800">
             <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Side (Diff)</h4>
             <div className="flex gap-4">
                <Knob
                    label="Freq" unit="Hz"
                    value={module.parameters.sideFreq} min={20} max={20000}
                    mapTo01={mapTo01Freq} mapFrom01={mapFrom01Freq}
                    onChange={(v) => onUpdate('sideFreq', v)}
                />
                <Knob
                    label="Gain" unit="dB"
                    value={module.parameters.sideGain} min={-15} max={15}
                    onChange={(v) => onUpdate('sideGain', v)}
                />
             </div>
         </div>
      </div>
    </ModuleShell>
  );
};
