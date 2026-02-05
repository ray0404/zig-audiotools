import React, { useEffect, useState, useRef } from 'react';
import { RackModule, mixerEngine } from '@/store/useAudioStore';
import { LimiterNode } from '@sonic-core/worklets/LimiterNode';
import { ModuleShell } from '@/components/ui/ModuleShell';
import { Knob } from '@/components/ui/Knob';
import { LEDBar } from '@/components/ui/LEDBar';

interface LimiterUnitProps {
  module: RackModule;
  onRemove: () => void;
  onBypass: () => void;
  onUpdate: (param: string, value: number) => void;
  dragHandleProps?: any;
}

const LimiterMeter = ({ nodeId }: { nodeId: string }) => {
  const [gr, setGr] = useState(0);
  const requestRef = useRef<number>();

  useEffect(() => {
    const update = () => {
        // @ts-ignore
        const node = mixerEngine.getModuleNode(nodeId) as LimiterNode | undefined;
        if (node) {
            setGr(node.currentGainReduction);
        }
        requestRef.current = requestAnimationFrame(update);
    };
    requestRef.current = requestAnimationFrame(update);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [nodeId]);

  return (
     <div className="flex flex-col items-center gap-1">
         <div className="relative h-32 w-4">
             <LEDBar
                value={gr}
                min={0}
                max={12}
                orientation="vertical"
                className="rotate-180"
                width={16}
                height={128}
             />
         </div>
         <span className="text-[9px] font-bold text-slate-500">GR</span>
     </div>
  );
};

export const LimiterUnit: React.FC<LimiterUnitProps> = ({ module, onRemove, onBypass, onUpdate, dragHandleProps }) => {
  return (
    <ModuleShell
        title="Limiter"
        color="text-red-400"
        onBypass={onBypass}
        onRemove={onRemove}
        isBypassed={module.bypass}
        dragHandleProps={dragHandleProps}
    >
      <div className="flex gap-6 items-center justify-center p-2">
         {/* Meter */}
         <LimiterMeter nodeId={module.id} />

         {/* Controls */}
         <div className="flex gap-4">
            <Knob
                label="Thresh" unit="dB"
                value={module.parameters.threshold} min={-60} max={0}
                onChange={(v) => onUpdate('threshold', v)}
            />
            <Knob
                label="Ceiling" unit="dB"
                value={module.parameters.ceiling} min={-20} max={0}
                onChange={(v) => onUpdate('ceiling', v)}
            />
            <Knob
                label="Lookahead" unit="ms"
                value={module.parameters.lookahead} min={0} max={20}
                onChange={(v) => onUpdate('lookahead', v)}
            />
            <Knob
                label="Release" unit="s"
                value={module.parameters.release} min={0.01} max={1} step={0.01}
                onChange={(v) => onUpdate('release', v)}
            />
         </div>
      </div>
    </ModuleShell>
  );
};
