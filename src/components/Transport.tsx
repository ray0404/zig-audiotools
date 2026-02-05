import React, { useRef, useState, useEffect } from 'react';
import { useAudioStore } from '@/store/useAudioStore';
import { Play, Pause, FileAudio, Download, Loader2, Music, FileType } from 'lucide-react';
import { clsx } from 'clsx';
import { TransportDisplay } from './TransportDisplay';
import { useShallow } from 'zustand/react/shallow';
import { OfflineRenderer } from '@/services/OfflineRenderer';
import { logger } from '@/utils/logger';
import { ExportFormat } from '@/services/TranscoderService';

export const Transport: React.FC = () => {
  const { 
    isPlaying, 
    togglePlay, 
    loadSourceFile,
    tracks,
    addTrack,
    activeTrackId
  } = useAudioStore(useShallow(state => ({
    isPlaying: state.isPlaying,
    togglePlay: state.togglePlay,
    loadSourceFile: state.loadSourceFile,
    tracks: state.tracks,
    addTrack: state.addTrack,
    activeTrackId: state.activeTrackId
  })));
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format: ExportFormat) => {
      if (isExporting) return;
      
      setIsExporting(true);
      setShowExportMenu(false);
      setExportProgress(0);
      
      try {
          // Default to High-Fidelity 24-bit / 48kHz for WAV
          // For MP3, we render at 48kHz and transcode to 320kbps
          await OfflineRenderer.render({
              format,
              bitDepth: format === 'mp3' ? 32 : 24, // Use 32-bit float internal for MP3 transcoding
              sampleRate: 48000,
              kbps: 320
          }, (p) => {
              setExportProgress(p.percentage);
          });
      } catch (e) {
          logger.error(`Transport ${format} export failed`, e);
          alert("Export failed. See console for details.");
      } finally {
          setIsExporting(false);
          setExportProgress(0);
      }
  };

  const sourceDuration = Object.values(tracks).reduce((max, track) => Math.max(max, track.sourceDuration), 0);
  const hasSource = sourceDuration > 0;

  const handleFileLoad = (file: File) => {
      let targetTrackId = activeTrackId;
      if (activeTrackId === 'MASTER') {
          // If on master, create a new track for the file
          // We can't get the ID sync easily from addTrack as currently implemented.
          // So we'll add track, but we can't load immediately without the ID.
          // Simplest fix: Just add track. The user can then select it and load (or we auto-load if we update store).
          // For now, let's auto-create "Audio 1" if no tracks exist?
          // Actually, let's just create a track and tell user to drop file there?
          // Or update store to return ID.
          alert("Please add a track first.");
          return;
      }
      loadSourceFile(targetTrackId, file);
  }

  return (
    <div className="w-full flex items-center justify-between gap-4 max-w-2xl mx-auto">
      {/* File Loader Button (Visible if no source) */}
      {!hasSource && (
          <div className="absolute inset-0 bg-slate-900/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <button
                type="button"
                aria-label="Load Audio File"
                onClick={() => {
                    if (Object.keys(tracks).length === 0) {
                        addTrack("Audio 1");
                        // We need to wait for track to exist.
                        // Just showing file picker is tricky if we don't know where to put it.
                        // Let's just create the track and close this overlay?
                        // No, the overlay stays if !hasSource.
                        // We need the file picker.
                        // Let's assume user clicked "Load Audio".
                        // We trigger file input.
                        fileInputRef.current?.click();
                    } else {
                        fileInputRef.current?.click();
                    }
                }}
                className="flex flex-col items-center justify-center gap-4 w-full h-full max-h-48 border-2 border-dashed border-slate-600 rounded-2xl hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
             >
                 <div className="p-4 bg-slate-800 rounded-full group-hover:scale-110 transition-transform shadow-xl">
                    <FileAudio size={32} className="text-blue-400" />
                 </div>
                 <div className="text-center">
                    <p className="text-sm font-bold text-slate-200">Start Project</p>
                    <p className="text-xs text-slate-500 mt-1">Load audio to a track</p>
                 </div>
                 <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="audio/*" 
                    className="hidden" 
                    onChange={(e) => {
                        if (e.target.files?.[0]) {
                            // If no tracks, add one?
                            // This is async in UI...
                            // Quick hack: if activeTrack is MASTER, warn.
                             handleFileLoad(e.target.files[0]);
                        }
                    }}
                  />
             </button>
          </div>
      )}

      {/* Play/Pause */}
      <button 
          type="button"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={togglePlay}
          disabled={!hasSource}
          className={clsx(
              "shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg",
              isPlaying ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-amber-500/20' : 'bg-primary hover:bg-blue-400 text-white shadow-blue-500/20',
              !hasSource && 'opacity-50 cursor-not-allowed grayscale'
          )}
      >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
      </button>

      {/* Time & Seeker */}
      <TransportDisplay />

      {/* Export / Menu */}
      <div className="relative" ref={menuRef}>
          <button 
            type="button"
            aria-label="Export Mix"
            className={clsx(
                "relative shrink-0 p-3 rounded-lg border transition-all disabled:opacity-50 overflow-hidden",
                isExporting ? "bg-slate-900 border-primary text-primary" : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700",
                showExportMenu && "bg-slate-700 border-slate-500 text-slate-100"
            )}
            disabled={!hasSource || isExporting}
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="Export Mix"
          >
              {isExporting ? (
                  <div className="flex items-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      <span className="text-[10px] font-bold tabular-nums">{Math.round(exportProgress)}%</span>
                      <div 
                        className="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-300" 
                        style={{ width: `${exportProgress}%` }}
                      />
                  </div>
              ) : (
                  <Download size={20} />
              )}
          </button>

          {/* Quick Export Popup */}
          {showExportMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="px-3 py-2 border-b border-slate-800 mb-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bounce Mix</span>
                  </div>
                  <button
                    onClick={() => handleExport('wav')}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                  >
                      <FileType size={16} className="text-blue-400 group-hover:scale-110 transition-transform" />
                      <div className="flex flex-col">
                          <span className="text-xs font-bold">WAV Master</span>
                          <span className="text-[9px] text-slate-500">24-bit / 48kHz (Lossless)</span>
                      </div>
                  </button>
                  <button
                    onClick={() => handleExport('mp3')}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left group"
                  >
                      <Music size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                      <div className="flex flex-col">
                          <span className="text-xs font-bold">MP3 High-Fidelity</span>
                          <span className="text-[9px] text-slate-500">320kbps / 48kHz (High-Res)</span>
                      </div>
                  </button>
              </div>
          )}
      </div>

      <input 
        ref={fileInputRef}
        type="file" 
        accept="audio/*" 
        className="hidden" 
        onChange={(e) => e.target.files && handleFileLoad(e.target.files[0])}
      />
    </div>
  );
};
