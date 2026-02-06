import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Knob } from '@/components/ui/Knob';

interface EchoVanishPanelProps {
    onApply: (params: { reduction: number, tailLength: number }) => void;
    onCancel: () => void;
}

export const EchoVanishPanel: React.FC<EchoVanishPanelProps> = ({ onApply, onCancel }) => {
    const [reduction, setReduction] = useState(0.5); // 0.0 to 1.0
    const [tailLength, setTailLength] = useState(100); // 50 to 500 ms

    return (
        <div className="absolute top-16 right-4 w-72 bg-slate-900/90 backdrop-blur-xl border border-slate-700 shadow-2xl rounded-2xl p-4 flex flex-col gap-6 z-50 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                     <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wide">Echo Vanish</h3>
                </div>
                <button onClick={onCancel} className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                    <X size={14} />
                </button>
            </div>

            <div className="flex items-center justify-around py-2">
                <Knob
                    label="Reduction"
                    value={reduction}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={setReduction}
                    unit="Amt"
                    className="scale-110"
                />
                 <Knob
                    label="Tail"
                    value={tailLength}
                    min={50}
                    max={500}
                    step={10}
                    onChange={setTailLength}
                    unit="ms"
                    className="scale-110"
                />
            </div>

             <div className="bg-slate-950/50 rounded-lg p-3 text-[10px] text-slate-500 font-mono leading-relaxed border border-slate-800/50">
                Adjust <span className="text-blue-400">Tail</span> to match room size. Increase <span className="text-blue-400">Reduction</span> to remove more reverb, but watch for artifacts.
            </div>

            <button
                onClick={() => onApply({ reduction, tailLength })}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl font-bold text-xs shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
                <Check size={14} />
                Apply Processing
            </button>
        </div>
    );
};
