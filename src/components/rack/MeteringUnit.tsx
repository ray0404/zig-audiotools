import React, { useEffect, useState, useRef } from 'react';
import { RackModule, mixerEngine } from '@/store/useAudioStore';
import { MeteringNode } from '@sonic-core/worklets/MeteringNode';
import { ModuleShell } from '@/components/ui/ModuleShell';
import { LEDBar } from '@/components/ui/LEDBar';

interface MeteringUnitProps {
  module: RackModule;
  onRemove: () => void;
  onBypass: () => void;
  dragHandleProps?: any;
}

const MeterDisplay = ({ nodeId }: { nodeId: string }) => {
    const [stats, setStats] = useState({ m: -100, s: -100 });
    const requestRef = useRef<number>();

    useEffect(() => {
        const update = () => {
            const node = mixerEngine.getModuleNode(nodeId) as MeteringNode | undefined;
            if (node) {
                setStats({ m: node.momentary, s: node.shortTerm });
            }
            requestRef.current = requestAnimationFrame(update);
        };
        requestRef.current = requestAnimationFrame(update);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [nodeId]);

    return (
        <div className="flex flex-col gap-2 w-full px-4">
             {/* Momentary */}
             <div className="flex items-center gap-4">
                 <span className="text-[10px] w-8 font-bold text-slate-500 uppercase">Mom</span>
                 <div className="flex-1 relative h-4">
                     <LEDBar value={stats.m} min={-60} max={0} orientation="horizontal" className="w-full h-full" />
                 </div>
                 <span className="text-xs font-mono w-12 text-right text-slate-300">{stats.m.toFixed(1)}</span>
             </div>

             {/* Short Term */}
             <div className="flex items-center gap-4">
                 <span className="text-[10px] w-8 font-bold text-slate-500 uppercase">Short</span>
                 <div className="flex-1 relative h-4">
                     <LEDBar value={stats.s} min={-60} max={0} orientation="horizontal" className="w-full h-full" />
                 </div>
                 <span className="text-xs font-mono w-12 text-right text-slate-300">{stats.s.toFixed(1)}</span>
             </div>
        </div>
    );
};

export const MeteringUnit: React.FC<MeteringUnitProps> = ({ module, onRemove, onBypass, dragHandleProps }) => {
  return (
    <ModuleShell
        title="Loudness Meter"
        color="text-cyan-400"
        onBypass={onBypass}
        onRemove={onRemove}
        isBypassed={module.bypass}
        dragHandleProps={dragHandleProps}
    >
      <div className="py-2">
         <MeterDisplay nodeId={module.id} />
      </div>
    </ModuleShell>
  );
};
