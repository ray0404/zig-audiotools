import React from 'react';
import { useAudioStore } from '@/store/useAudioStore';
import { Music, Clock, FileAudio } from 'lucide-react';

export const AssetManagerView: React.FC = () => {
    const { assets } = useAudioStore();
    const assetIds = Object.keys(assets);

    return (
        <div className="space-y-4">
            {assetIds.length === 0 ? (
                <div className="text-center text-slate-500 py-10">
                    <FileAudio size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No assets loaded.</p>
                    <p className="text-xs mt-2">Drag and drop audio files into modules like 'Cab Sim'.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {assetIds.map((id, index) => {
                        const buffer = assets[id];
                        return (
                            <div key={id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="bg-slate-700 p-2 rounded">
                                        <Music size={16} className="text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-medium text-sm text-slate-200 truncate">Asset {index + 1}</h4>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <span className="flex items-center gap-1">
                                                <Clock size={10} />
                                                {buffer?.duration.toFixed(2)}s
                                            </span>
                                            <span>•</span>
                                            <span>{buffer?.numberOfChannels === 1 ? 'Mono' : 'Stereo'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-600 font-mono">
                                    {id.slice(0, 4)}...
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
