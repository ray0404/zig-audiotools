import React from 'react';
import { ModuleShell } from '../ui/ModuleShell';
import { RackModule } from '@/store/useAudioStore';

interface DitheringUnitProps {
  module: RackModule;
  onRemove: () => void;
  onBypass: () => void;
  onUpdate: (param: string, value: any) => void;
  dragHandleProps?: any;
}

export const DitheringUnit: React.FC<DitheringUnitProps> = ({
  module,
  onRemove,
  onBypass,
  onUpdate,
  dragHandleProps
}) => {
  const { parameters, bypass } = module;
  const currentDepth = parameters.bitDepth || 24;

  return (
    <ModuleShell
      title="TPDF Dithering"
      color="text-teal-300"
      onRemove={onRemove}
      onBypass={onBypass}
      isBypassed={bypass}
      dragHandleProps={dragHandleProps}
    >
      <div className="flex items-center justify-center gap-6 py-2">
         <div className="text-slate-400 text-xs font-mono max-w-[120px] text-center">
            Applies triangular dither for final export.
         </div>

         <div className="flex flex-col gap-2 p-1 bg-slate-950/50 rounded-lg border border-slate-800">
             <div className="flex gap-1">
                <button
                    onClick={() => onUpdate('bitDepth', 16)}
                    className={`
                        w-12 py-2 text-xs font-bold rounded transition-all
                        ${currentDepth === 16 
                            ? 'bg-teal-500 text-slate-900 shadow-[0_0_8px_rgba(20,184,166,0.5)]' 
                            : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}
                    `}
                >
                    16-bit
                </button>
                <button
                    onClick={() => onUpdate('bitDepth', 24)}
                    className={`
                        w-12 py-2 text-xs font-bold rounded transition-all
                        ${currentDepth === 24 
                            ? 'bg-teal-500 text-slate-900 shadow-[0_0_8px_rgba(20,184,166,0.5)]' 
                            : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}
                    `}
                >
                    24-bit
                </button>
             </div>
         </div>
      </div>
    </ModuleShell>
  );
};
