import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAudioStore, RackModuleType } from '@/store/useAudioStore';

export const AddModuleMenu: React.FC = () => {
  const addModule = useAudioStore((state) => state.addModule);
  const activeTrackId = useAudioStore((state) => state.activeTrackId);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
            setIsOpen(false);
        }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleAdd = (type: RackModuleType) => {
      addModule(activeTrackId, type);
      setIsOpen(false);
  };

  const categories = {
      'Dynamics': [
          { label: 'Compressor', type: 'COMPRESSOR' },
          { label: 'Multiband Comp', type: 'MULTIBAND_COMPRESSOR' },
          { label: 'De-Esser', type: 'DE_ESSER' },
          { label: 'Limiter', type: 'LIMITER' },
          { label: 'Transient Shaper', type: 'TRANSIENT_SHAPER' },
      ],
      'EQ': [
          { label: 'Parametric EQ', type: 'PARAMETRIC_EQ' },
          { label: 'Dynamic EQ', type: 'DYNAMIC_EQ' },
          { label: 'Mid/Side EQ', type: 'MIDSIDE_EQ' },
      ],
      'Color': [
          { label: 'Saturation', type: 'SATURATION' },
          { label: 'Distortion', type: 'DISTORTION' },
          { label: 'BitCrusher', type: 'BITCRUSHER' },
      ],
      'Modulation': [
          { label: 'Chorus', type: 'CHORUS' },
          { label: 'Phaser', type: 'PHASER' },
          { label: 'Tremolo', type: 'TREMOLO' },
          { label: 'AutoWah', type: 'AUTOWAH' },
      ],
      'Spatial': [
          { label: 'Multiband Imager', type: 'STEREO_IMAGER' },
          { label: 'Feedback Delay', type: 'FEEDBACK_DELAY' },
          { label: 'Cabinet Sim', type: 'CAB_SIM' },
      ],
      'Utility': [
          { label: 'Loudness Meter', type: 'LOUDNESS_METER' },
          { label: 'TPDF Dithering', type: 'DITHERING' },
      ]
  };

  return (
    <div className="relative z-50" ref={menuRef}>
        <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white font-bold rounded shadow-lg transition-colors text-sm"
        >
            <Plus size={16} />
            <span>Add Module</span>
        </button>

        {isOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-surface border border-slate-700 rounded-lg shadow-2xl overflow-y-auto max-h-[70vh] animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/50">
                {Object.entries(categories).map(([category, items]) => (
                    <div key={category} className="border-b border-slate-700 last:border-0">
                        <div className="px-3 py-1.5 bg-slate-900/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider backdrop-blur-sm">
                            {category}
                        </div>
                        <div>
                            {items.map((item) => (
                                <button
                                    key={item.type}
                                    onClick={() => handleAdd(item.type as RackModuleType)}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-700 text-sm text-slate-300 transition-colors flex items-center justify-between group"
                                >
                                    {item.label}
                                    <Plus size={12} className="opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};
