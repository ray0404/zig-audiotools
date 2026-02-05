import React from 'react';
import { useAudioStore } from '@/store/useAudioStore';
import { Volume2, Power } from 'lucide-react';

export const SettingsView: React.FC = () => {
    const { isInitialized, master, setTrackVolume } = useAudioStore();

    return (
        <div className="space-y-6">
            {/* Audio Engine Status */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                        <Power size={18} />
                        Audio Engine
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded font-bold ${isInitialized ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isInitialized ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <p className="text-xs text-slate-400">
                    Latency: {isInitialized ? '~10ms' : 'N/A'} (48kHz)
                </p>
            </div>

            {/* Master Volume */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Volume2 size={16} />
                    Master Volume
                </label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={master.volume}
                    onChange={(e) => setTrackVolume('MASTER', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="text-right text-xs text-slate-500">
                    {Math.round(master.volume * 100)}%
                </div>
            </div>
        </div>
    );
};
