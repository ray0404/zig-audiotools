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

export const ParametricEQUnit: React.FC<Props> = ({ module, onRemove, onBypass, onUpdate, dragHandleProps }) => {
  const handleChange = (param: string, value: number) => {
    onUpdate(param, value);
  };

  return (
    <ModuleShell
      title="Parametric EQ"
      isBypassed={module.bypass}
      onBypass={onBypass}
      onRemove={onRemove}
      color="text-orange-400"
      dragHandleProps={dragHandleProps}
    >
      <div className="flex gap-4">
        {/* Low Section */}
        <div className="flex flex-col gap-2 items-center bg-slate-800/30 p-2 rounded-lg border border-slate-800/50">
           <span className="text-[10px] font-bold text-slate-500 uppercase">Low</span>
           <Knob
            label="Freq"
            value={module.parameters.lowFreq}
            min={20}
            max={1000}
            unit="Hz"
            onChange={(v) => handleChange('lowFreq', v)}
          />
          <Knob
            label="Gain"
            value={module.parameters.lowGain}
            min={-24}
            max={24}
            unit="dB"
            onChange={(v) => handleChange('lowGain', v)}
          />
        </div>

        {/* Mid Section */}
        <div className="flex flex-col gap-2 items-center bg-slate-800/30 p-2 rounded-lg border border-slate-800/50">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Mid</span>
            <div className="flex gap-2">
                <Knob
                    label="Freq"
                    value={module.parameters.midFreq}
                    min={200}
                    max={5000}
                    unit="Hz"
                    onChange={(v) => handleChange('midFreq', v)}
                />
                <Knob
                    label="Q"
                    value={module.parameters.midQ}
                    min={0.1}
                    max={10}
                    onChange={(v) => handleChange('midQ', v)}
                />
            </div>
            <Knob
                label="Gain"
                value={module.parameters.midGain}
                min={-24}
                max={24}
                unit="dB"
                onChange={(v) => handleChange('midGain', v)}
            />
        </div>

        {/* High Section */}
        <div className="flex flex-col gap-2 items-center bg-slate-800/30 p-2 rounded-lg border border-slate-800/50">
          <span className="text-[10px] font-bold text-slate-500 uppercase">High</span>
          <Knob
            label="Freq"
            value={module.parameters.highFreq}
            min={2000}
            max={20000}
            unit="Hz"
            onChange={(v) => handleChange('highFreq', v)}
          />
          <Knob
            label="Gain"
            value={module.parameters.highGain}
            min={-24}
            max={24}
            unit="dB"
            onChange={(v) => handleChange('highGain', v)}
          />
        </div>
      </div>
    </ModuleShell>
  );
};