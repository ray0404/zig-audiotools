import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useAudioStore, RackModule } from '@/store/useAudioStore';
import { ModuleShell } from '@/components/ui/ModuleShell';
import { Knob } from '@/components/ui/Knob';
import { Upload } from 'lucide-react';

interface CabSimUnitProps {
  module: RackModule;
  onRemove: () => void;
  onBypass: () => void;
  onUpdate: (param: string, value: any) => void;
  dragHandleProps?: any;
}

export const CabSimUnit: React.FC<CabSimUnitProps> = ({ module, onRemove, onBypass, onUpdate, dragHandleProps }) => {
  const loadAsset = useAudioStore((state) => state.loadAsset);
  const assets = useAudioStore((state) => state.assets);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const assetId = module.parameters.irAssetId;
  const audioBuffer = assets[assetId];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!audioBuffer) return;

    const data = audioBuffer.getChannelData(0);
    // Draw simple waveform
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;

    ctx.strokeStyle = '#f59e0b'; // Amber-500
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i++) {
       let min = 1.0;
       let max = -1.0;
       for (let j = 0; j < step; j++) {
           const idx = (i * step) + j;
           if (idx < data.length) {
               const datum = data[idx];
               if (datum < min) min = datum;
               if (datum > max) max = datum;
           }
       }
       if (max < min) max = min;
       ctx.moveTo(i, (1 + min) * amp);
       ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();

  }, [audioBuffer]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('audio/')) {
            try {
                const id = await loadAsset(file);
                onUpdate('irAssetId', id);
            } catch (err) {
                alert('Failed to load IR');
            }
        }
    }
  }, [loadAsset, onUpdate]);

  return (
    <ModuleShell
        title="Cab Sim / IR"
        color="text-amber-400"
        onBypass={onBypass}
        onRemove={onRemove}
        isBypassed={module.bypass}
        dragHandleProps={dragHandleProps}
    >
      <div className="flex gap-4 items-center p-2">
          {/* Drop Area / Visualizer */}
          <div
            className={`flex-1 h-24 rounded border-2 border-dashed relative overflow-hidden transition-colors ${isDragging ? 'border-amber-400 bg-slate-700' : 'border-slate-700 bg-slate-950'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
             <canvas ref={canvasRef} width={300} height={96} className="w-full h-full object-cover" />

             {!audioBuffer && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none">
                     <Upload size={20} className="mb-1" />
                     <span className="text-[10px] font-bold uppercase tracking-wider">Drag WAV Here</span>
                 </div>
             )}
          </div>

          {/* Mix Knob */}
          <Knob
            label="Mix"
            value={module.parameters.mix * 100} min={0} max={100}
            onChange={(v) => onUpdate('mix', v / 100)}
            unit="%"
          />
      </div>
    </ModuleShell>
  );
};
