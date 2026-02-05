import React from 'react';
import { useAudioStore } from '@/store/useAudioStore';

export const TransportDisplay: React.FC = () => {
    // Select only what we need for the display loop
    const currentTime = useAudioStore(state => state.currentTime);
    const tracks = useAudioStore(state => state.tracks);
    const seek = useAudioStore(state => state.seek);

    // Calculate max duration from all tracks
    const sourceDuration = Object.values(tracks).reduce((max, track) => Math.max(max, track.sourceDuration), 0);
    const hasSource = sourceDuration > 0;

    // Format helper duplicated for isolation (or could be moved to utils)
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        seek(parseFloat(e.target.value));
    };

    return (
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex justify-between items-end px-1">
             <span className="font-mono text-sm font-bold text-slate-200 tracking-wider">
                {formatTime(currentTime)}
             </span>
             <span className="font-mono text-[10px] text-slate-500">
                {formatTime(sourceDuration)}
             </span>
          </div>
          <div className="relative h-6 group flex items-center">
             {/* Custom Range Track */}
             <div className="absolute left-0 right-0 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                 <div
                    className="h-full bg-primary transition-all duration-75"
                    style={{ width: `${(currentTime / (sourceDuration || 1)) * 100}%` }}
                 />
             </div>
             <input
                  type="range"
                  aria-label="Seek"
                  min={0}
                  max={sourceDuration || 100}
                  step={0.01}
                  value={currentTime}
                  onChange={handleSeek}
                  disabled={!hasSource}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
              />
          </div>
      </div>
    );
};
