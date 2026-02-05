import React from 'react';
import { GripVertical, X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModuleShellProps {
  title: string;
  color?: string; // Text color class for title
  onBypass: () => void;
  onRemove: () => void;
  isBypassed: boolean;
  children: React.ReactNode;
  dragHandleProps?: any; // For dnd-kit
}

export const ModuleShell: React.FC<ModuleShellProps> = ({
  title,
  color = 'text-blue-400',
  onBypass,
  onRemove,
  isBypassed,
  children,
  dragHandleProps
}) => {
  return (
    <div className="group relative w-full bg-rack-bg border border-slate-800 rounded-lg shadow-xl overflow-hidden flex flex-col transition-all hover:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
           {/* Drag Handle */}
           <div
             className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 focus:outline-none touch-none p-1"
             {...dragHandleProps}
           >
             <GripVertical size={16} />
           </div>

           {/* Bypass Switch */}
           <button
             onClick={onBypass}
             className={clsx(
               "w-3 h-3 rounded-full border transition-all shadow-[0_0_8px_rgba(0,0,0,0.5)] mx-1",
               isBypassed
                 ? "bg-slate-800 border-slate-600"
                 : "bg-active-led border-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
             )}
             title={isBypassed ? "Engage" : "Bypass"}
           />

           <span className={clsx("font-bold text-sm tracking-wide uppercase select-none", color)}>
             {title}
           </span>
        </div>

        <button
          onClick={onRemove}
          className="text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          title="Remove Module"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="relative p-2 bg-slate-900/50">
        <div className={clsx("transition-opacity duration-300", isBypassed && "opacity-40 grayscale pointer-events-none")}>
           {children}
        </div>

        {/* Bypass Overlay Text */}
        {isBypassed && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <span className="text-3xl font-bold text-slate-700/20 uppercase tracking-[0.5em] -rotate-12 select-none">Bypassed</span>
            </div>
        )}
      </div>
    </div>
  );
};
