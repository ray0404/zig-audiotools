import React from 'react';
import { KnobHeadless } from 'react-knob-headless';
import { twMerge } from 'tailwind-merge';

interface KnobProps {
  label: string;
  unit?: string;
  className?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  mapTo01?: (val: number) => number;
  mapFrom01?: (val: number) => number;
}

export const Knob: React.FC<KnobProps> = ({
  label,
  unit,
  className,
  value,
  min,
  max,
  step,
  onChange,
  mapTo01,
  mapFrom01,
}) => {
  const value01 = mapTo01
    ? mapTo01(value)
    : (value - min) / (max - min);

  const handleChange = (newVal01: number) => {
    let finalVal: number;
    if (mapFrom01) {
      finalVal = mapFrom01(newVal01);
    } else {
      finalVal = newVal01 * (max - min) + min;
    }

    if (step) {
      finalVal = Math.round(finalVal / step) * step;
    }

    finalVal = Math.min(Math.max(finalVal, min), max);
    onChange(finalVal);
  };

  const angle = value01 * 270 - 135;
  const arcLength = 188.5;
  const dashOffset = arcLength - (value01 * arcLength);

  return (
    <div className={twMerge("flex flex-col items-center gap-1", className)}>
      <KnobHeadless
        valueRaw={value01}
        valueMin={0}
        valueMax={1}
        valueRawRoundFn={(v) => v}
        valueRawDisplayFn={(v) => v.toFixed(2)}
        onValueRawChange={handleChange}
        dragSensitivity={0.006}
        aria-label={label}
        mapTo01={(v) => v}
        mapFrom01={(v) => v}
        className="relative w-10 h-10 outline-none cursor-ns-resize touch-none group select-none"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full transform transition-transform group-active:scale-105 pointer-events-none">
           <path
              d="M 21.72 78.28 A 40 40 0 1 1 78.28 78.28"
              className="stroke-knob-ring fill-none stroke-[8] stroke-linecap-round"
           />
           <path
              d="M 21.72 78.28 A 40 40 0 1 1 78.28 78.28"
              className="stroke-knob-indicator fill-none stroke-[8] stroke-linecap-round"
              strokeDasharray={arcLength}
              strokeDashoffset={dashOffset}
           />
        </svg>
        <div
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ transform: `rotate(${angle}deg)` }}
        >
             <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-2.5 bg-slate-200 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)]" />
        </div>
      </KnobHeadless>

      <div className="text-center select-none pointer-events-none">
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="text-[10px] font-mono text-primary">
            {Math.abs(value) < 10 && Math.abs(value) >= 0.1 ? value.toFixed(2) : Math.abs(value) < 100 ? value.toFixed(1) : value.toFixed(0)}
            {unit && <span className="text-[9px] text-slate-500 ml-0.5">{unit}</span>}
        </div>
      </div>
    </div>
  );
};
