import React from 'react';
import { ModuleShell } from '../ui/ModuleShell';
import { Knob } from '../ui/Knob';
import { RackModule } from '@/store/useAudioStore';
import { clsx } from 'clsx';

// --- Pure Component ---
interface PureProps {
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
  makeupGain: number;
  mix: number;
  mode: number;
  
  isBypassed: boolean;
  onBypass: () => void;
  onRemove: () => void;
  dragHandleProps?: any;

  onThresholdChange: (v: number) => void;
  onRatioChange: (v: number) => void;
  onAttackChange: (v: number) => void;
  onReleaseChange: (v: number) => void;
  onMakeupGainChange: (v: number) => void;
  onMixChange: (v: number) => void;
  onModeChange: (v: number) => void;
}

export const PureCompressorUnit: React.FC<PureProps> = ({
  threshold, ratio, attack, release, makeupGain, mix, mode,
  isBypassed, onBypass, onRemove, dragHandleProps,
  onThresholdChange, onRatioChange, onAttackChange, onReleaseChange, onMakeupGainChange, onMixChange, onModeChange
}) => {
  const modes = ['VCA', 'FET', 'Opto', 'Tube'];

  return (
    <ModuleShell
      title="Compressor"
      isBypassed={isBypassed}
      onBypass={onBypass}
      onRemove={onRemove}
      color="text-emerald-400"
      dragHandleProps={dragHandleProps}
    >
      <div className="flex flex-col gap-3">
        {/* Knobs Row */}
        <div className="flex flex-wrap gap-2 justify-center">
            <Knob
                label="Thresh"
                value={threshold}
                min={-60}
                max={0}
                unit="dB"
                onChange={onThresholdChange}
            />
            <Knob
                label="Ratio"
                value={ratio}
                min={1}
                max={20}
                onChange={onRatioChange}
            />
            <Knob
                label="Att"
                value={attack}
                min={0.0001}
                max={1}
                unit="s"
                onChange={onAttackChange}
            />
            <Knob
                label="Rel"
                value={release}
                min={0.001}
                max={2}
                unit="s"
                onChange={onReleaseChange}
            />
            <Knob
                label="Makeup"
                value={makeupGain}
                min={0}
                max={24}
                unit="dB"
                onChange={onMakeupGainChange}
            />
            <Knob
                label="Mix"
                value={mix}
                min={0}
                max={1}
                onChange={onMixChange}
            />
        </div>

        {/* Mode Selector */}
        <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Topology</span>
            <div className="flex bg-slate-950/50 rounded p-0.5 border border-slate-800">
                {modes.map((label, idx) => (
                    <button
                        key={label}
                        onClick={() => onModeChange(idx)}
                        className={clsx(
                            "px-2 py-1 text-[9px] font-bold rounded transition-all",
                            mode === idx
                                ? "bg-emerald-500 text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
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

// --- Connected Component ---
interface ConnectedProps {
  module: RackModule;
  onRemove: () => void;
  onBypass: () => void;
  onUpdate: (param: string, value: any) => void;
  dragHandleProps?: any;
}

export const CompressorUnit: React.FC<ConnectedProps> = ({ module, onRemove, onBypass, onUpdate, dragHandleProps }) => {
    return (
        <PureCompressorUnit
            threshold={module.parameters.threshold}
            ratio={module.parameters.ratio}
            attack={module.parameters.attack}
            release={module.parameters.release}
            makeupGain={module.parameters.makeupGain}
            mix={module.parameters.mix ?? 1}
            mode={module.parameters.mode}
            
            isBypassed={module.bypass}
            onBypass={onBypass}
            onRemove={onRemove}
            dragHandleProps={dragHandleProps}

            onThresholdChange={(v) => onUpdate('threshold', v)}
            onRatioChange={(v) => onUpdate('ratio', v)}
            onAttackChange={(v) => onUpdate('attack', v)}
            onReleaseChange={(v) => onUpdate('release', v)}
            onMakeupGainChange={(v) => onUpdate('makeupGain', v)}
            onMixChange={(v) => onUpdate('mix', v)}
            onModeChange={(v) => onUpdate('mode', v)}
        />
    );
};