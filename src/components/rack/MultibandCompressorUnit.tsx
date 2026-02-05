import React, { useState } from 'react';
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

export const MultibandCompressorUnit: React.FC<Props> = ({ module, onRemove, onBypass, onUpdate, dragHandleProps }) => {
  const [activeBand, setActiveBand] = useState<'Low' | 'Mid' | 'High'>('Low');

  const renderBandControls = (band: 'Low' | 'Mid' | 'High') => {
      const suffix = band; // e.g. "Low"
      return (
          <div className="grid grid-cols-5 gap-2 animate-in fade-in duration-200">
              <Knob label="Thresh" value={module.parameters[`thresh${suffix}`]} min={-60} max={0} unit="dB" onChange={(v) => onUpdate(`thresh${suffix}`, v)} />
              <Knob label="Ratio" value={module.parameters[`ratio${suffix}`]} min={1} max={20} onChange={(v) => onUpdate(`ratio${suffix}`, v)} />
              <Knob label="Attack" value={module.parameters[`att${suffix}`]} min={0.001} max={1} unit="s" onChange={(v) => onUpdate(`att${suffix}`, v)} />
              <Knob label="Release" value={module.parameters[`rel${suffix}`]} min={0.01} max={2} unit="s" onChange={(v) => onUpdate(`rel${suffix}`, v)} />
              <Knob label="Gain" value={module.parameters[`gain${suffix}`]} min={0} max={24} unit="dB" onChange={(v) => onUpdate(`gain${suffix}`, v)} />
          </div>
      );
  };

  return (
    <ModuleShell
      title="Multiband Dynamics"
      isBypassed={module.bypass}
      onBypass={onBypass}
      onRemove={onRemove}
      color="text-emerald-400"
      dragHandleProps={dragHandleProps}
    >
      <div className="flex flex-col gap-3">
        {/* Crossovers */}
        <div className="flex justify-center gap-8 pb-2 border-b border-slate-800">
             <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider">Low X-Over</span>
                <input 
                    type="number" 
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-1 text-center text-xs text-emerald-400 font-mono"
                    value={module.parameters.lowFreq}
                    onChange={(e) => onUpdate('lowFreq', Number(e.target.value))}
                />
            </div>
            <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider">High X-Over</span>
                <input 
                    type="number" 
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-1 text-center text-xs text-emerald-400 font-mono"
                    value={module.parameters.highFreq}
                    onChange={(e) => onUpdate('highFreq', Number(e.target.value))}
                />
            </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
            {(['Low', 'Mid', 'High'] as const).map((band) => (
                <button
                    key={band}
                    onClick={() => setActiveBand(band)}
                    className={clsx(
                        "flex-1 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all",
                        activeBand === band 
                            ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    )}
                >
                    {band} Band
                </button>
            ))}
        </div>

        {/* Band Controls */}
        <div className="p-2 bg-slate-900/30 rounded-lg border border-slate-800/50">
            {renderBandControls(activeBand)}
        </div>
      </div>
    </ModuleShell>
  );
};
