import { useRef } from 'react';
import { useAudioStore } from '@/store/useAudioStore';
import { clsx } from 'clsx';
import { Trash2, Plus, FileAudio } from 'lucide-react';

const TrackStripUI = ({ track, isActive, onSelect, onVolume, onPan, onMute, onRemove, onLoadFile }: any) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div
            onClick={onSelect}
            className={clsx(
                "w-24 shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col p-2 gap-2 relative transition-all cursor-pointer group select-none",
                isActive ? "bg-slate-800 ring-2 ring-primary/50 ring-inset" : "hover:bg-slate-800/50"
            )}
        >
            <div className={clsx(
                "text-[10px] font-black truncate mb-1 text-center py-1 px-2 rounded uppercase tracking-wider",
                isActive ? "bg-primary text-white" : "bg-slate-800 text-slate-400"
            )} title={track.name}>
                {track.name}
            </div>
            
            {/* Source Indicator / Loader */}
            {track.id !== 'MASTER' && (
                <div 
                    className={clsx(
                        "text-[9px] flex items-center justify-center gap-1 py-1 px-1 rounded cursor-pointer transition-colors border shadow-inner",
                        track.sourceDuration > 0 
                            ? "bg-slate-950 text-green-400 border-green-900/30 hover:bg-slate-900" 
                            : "bg-slate-950 text-slate-600 border-slate-800 hover:bg-slate-900 hover:text-primary hover:border-primary/30"
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                    }}
                    title={track.sourceName || "Load Audio"}
                >
                    <FileAudio size={10} className={track.sourceDuration > 0 ? "animate-pulse" : ""} />
                    <span className="truncate max-w-[55px] font-mono">
                        {track.sourceName || "EMPTY"}
                    </span>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files?.[0]) {
                                onLoadFile(e.target.files[0]);
                            }
                            // Reset input
                            e.target.value = '';
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Pan Knob */}
            <div className="flex flex-col items-center gap-1.5 mt-2">
                 <div className="flex items-center justify-between w-full px-1 text-[9px] font-mono text-slate-500">
                     <span>L</span>
                     <span className={clsx(track.pan !== 0 && "text-primary font-bold")}>{track.pan === 0 ? "C" : Math.abs(track.pan).toFixed(2)}</span>
                     <span>R</span>
                 </div>
                 <input
                    type="range"
                    min="-1" max="1" step="0.01"
                    value={track.pan}
                    onChange={(e) => onPan(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-950 rounded-full appearance-none cursor-pointer accent-primary border border-slate-800"
                    onClick={(e) => e.stopPropagation()}
                 />
            </div>

            {/* Volume Fader */}
            <div className="flex-1 flex items-center justify-center py-4 relative min-h-[220px]">
                {/* Fader Track Background & Ticks */}
                <div className="absolute top-4 bottom-4 left-1/2 -translate-x-1/2 w-3 flex flex-col justify-between items-center pointer-events-none opacity-20">
                    {[...Array(11)].map((_, i) => (
                        <div key={i} className={clsx("h-px bg-white", i % 5 === 0 ? "w-full" : "w-1/2")} />
                    ))}
                </div>
                
                <div className="absolute top-4 bottom-4 left-1/2 -translate-x-1/2 w-1.5 bg-slate-950 rounded-full border border-slate-800 shadow-inner" />
                
                <input
                    type="range"
                    min="0" max="1.5" step="0.01"
                    value={track.volume}
                    onChange={(e) => onVolume(parseFloat(e.target.value))}
                    className="h-1.5 bg-transparent appearance-none cursor-pointer accent-primary -rotate-90 origin-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ width: '180px' }} // Width becomes height when rotated
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
            <div className="text-center text-[11px] text-slate-400 font-mono bg-slate-950 py-0.5 rounded border border-slate-800 mx-1">
                {Math.round(track.volume * 100)}%
            </div>

            {/* Controls */}
            <div className="flex gap-2 justify-center mt-3">
                 <button
                    onClick={(e) => { e.stopPropagation(); onMute(); }}
                    className={clsx(
                        "rounded-md text-[10px] font-black w-8 h-8 flex items-center justify-center border transition-all shadow-sm",
                        track.isMuted 
                            ? "bg-red-600 text-white border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.3)]" 
                            : "bg-slate-950 text-slate-500 border-slate-800 hover:text-red-500 hover:border-red-900/50"
                    )}
                 >
                    M
                 </button>
                 <button
                     onClick={(e) => { e.stopPropagation(); /* Solo */ }}
                     className={clsx(
                        "rounded-md text-[10px] font-black w-8 h-8 flex items-center justify-center border transition-all shadow-sm",
                        track.isSoloed 
                            ? "bg-amber-500 text-white border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]" 
                            : "bg-slate-950 text-slate-500 border-slate-800 hover:text-amber-500 hover:border-amber-900/50"
                     )}
                 >
                    S
                 </button>
            </div>

            {/* Remove */}
            {track.id !== 'MASTER' && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="absolute top-2 right-2 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Track"
                >
                    <Trash2 size={12} />
                </button>
            )}
        </div>
    );
};

export const MixerView = () => {
    const {
        tracks, trackOrder, master, activeTrackId,
        selectTrack, setTrackVolume, setTrackPan, toggleTrackMute, removeTrack, addTrack, loadSourceFile
    } = useAudioStore();

    const orderedTracks = trackOrder.map(id => tracks[id]).filter(Boolean);

    return (
        <div className="flex h-full w-full overflow-x-auto bg-slate-950 border-t border-slate-800">
            {orderedTracks.map(track => (
                <TrackStripUI
                    key={track.id}
                    track={track}
                    isActive={activeTrackId === track.id}
                    onSelect={() => selectTrack(track.id)}
                    onVolume={(v: number) => setTrackVolume(track.id, v)}
                    onPan={(v: number) => setTrackPan(track.id, v)}
                    onMute={() => toggleTrackMute(track.id)}
                    onRemove={() => removeTrack(track.id)}
                    onLoadFile={(file: File) => loadSourceFile(track.id, file)}
                />
            ))}

            {/* Add Track Button */}
            <div 
                className="w-16 shrink-0 flex flex-col items-center justify-center border-r border-slate-800 bg-slate-950/20 hover:bg-slate-950/40 transition-all cursor-pointer group" 
                onClick={() => addTrack()}
                title="Add New Track"
            >
                <div className="p-2 rounded-full bg-slate-900 border border-slate-800 group-hover:border-primary/50 group-hover:scale-110 transition-all shadow-inner">
                    <Plus size={18} className="text-slate-500 group-hover:text-primary" />
                </div>
                <span className="text-[8px] font-bold text-slate-600 uppercase mt-2 group-hover:text-slate-400 tracking-tighter">Add Track</span>
            </div>

            {/* Master Strip */}
            <div className="w-24 shrink-0 border-l border-slate-700 ml-auto bg-slate-900/50">
                 <TrackStripUI
                    track={master}
                    isActive={activeTrackId === 'MASTER'}
                    onSelect={() => selectTrack('MASTER')}
                    onVolume={(v: number) => setTrackVolume('MASTER', v)}
                    onPan={(v: number) => setTrackPan('MASTER', v)}
                    onMute={() => {}} // Master mute usually different
                    onRemove={() => {}}
                />
            </div>
        </div>
    );
};
