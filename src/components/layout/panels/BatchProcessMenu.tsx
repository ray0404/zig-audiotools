import React, { useState, useRef, useEffect } from 'react';
import { useAudioStore, mixerEngine } from '@/store/useAudioStore';
import { offlineProcessor } from '@sonic-core/workers/OfflineProcessorClient';
import { set as setIDB } from 'idb-keyval';
import { audioBufferToWav } from '@/utils/wav-export';
import { Loader2, Upload, Undo2, Redo2, FileAudio, Layers, Play, Square, Download, Trash2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import { clsx } from 'clsx';

type Mode = 'track' | 'file';

interface HistoryItem {
    trackId: string;
    buffer: AudioBuffer;
    timestamp: number;
    description: string;
}

interface FileHistoryItem {
    buffer: AudioBuffer;
    timestamp: number;
    description: string;
}

export const BatchProcessMenu: React.FC = () => {
  const { tracks, trackOrder, isInitialized } = useAudioStore();
  const [mode, setMode] = useState<Mode>('track');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  
  // File Mode State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentFileBuffer, setCurrentFileBuffer] = useState<AudioBuffer | null>(null);
  const [previewNode, setPreviewNode] = useState<AudioBufferSourceNode | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const previewStartTimeRef = useRef<number>(0);
  const previewAnimationFrameRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSeekingRef = useRef(false);

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // History State (Undo/Redo for Tracks)
  const [undoStack, setUndoStack] = useState<HistoryItem[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryItem[]>([]);

  // History State (Undo/Redo for Files)
  const [fileUndoStack, setFileUndoStack] = useState<FileHistoryItem[]>([]);
  const [fileRedoStack, setFileRedoStack] = useState<FileHistoryItem[]>([]);

  // Cleanup preview on unmount
  useEffect(() => {
      return () => {
          stopPreview(true);
      };
  }, []);

  // Initialize selected track if not set
  useEffect(() => {
      if (!selectedTrackId && trackOrder.length > 0) {
          setSelectedTrackId(trackOrder[0]);
      }
  }, [trackOrder, selectedTrackId]);

  // --- Track History Logic ---
  const addToHistory = (trackId: string, buffer: AudioBuffer, description: string) => {
      setUndoStack(prev => [...prev.slice(-4), { trackId, buffer, timestamp: Date.now(), description }]); // Keep last 5
      setRedoStack([]);
  };

  const handleUndo = async () => {
      const lastAction = undoStack[undoStack.length - 1];
      if (!lastAction) return;

      const track = mixerEngine.getTrack(lastAction.trackId);
      if (track && track.sourceBuffer) {
          // Push current to Redo
          setRedoStack(prev => [...prev, { 
              trackId: lastAction.trackId, 
              buffer: track.sourceBuffer!, 
              timestamp: Date.now(), 
              description: "Undo Revert" 
          }]);

          // Restore
          track.setSource(lastAction.buffer);
          
          // Persist Restore
          await persistTrack(lastAction.trackId, lastAction.buffer);

          setUndoStack(prev => prev.slice(0, -1));
          setStatus(`Undid: ${lastAction.description}`);
          setTimeout(() => setStatus(null), 2000);
      }
  };

  const handleRedo = async () => {
      const nextAction = redoStack[redoStack.length - 1];
      if (!nextAction) return;

      const track = mixerEngine.getTrack(nextAction.trackId);
      if (track && track.sourceBuffer) {
          // Push current to Undo
          setUndoStack(prev => [...prev, { 
              trackId: nextAction.trackId, 
              buffer: track.sourceBuffer!, 
              timestamp: Date.now(), 
              description: "Redo Reapply" 
          }]);

          // Restore
          track.setSource(nextAction.buffer);
          
          // Persist
          await persistTrack(nextAction.trackId, nextAction.buffer);

          setRedoStack(prev => prev.slice(0, -1));
          setStatus("Redo complete");
          setTimeout(() => setStatus(null), 2000);
      }
  };

  const persistTrack = async (trackId: string, buffer: AudioBuffer) => {
        const wavData = audioBufferToWav(buffer, { bitDepth: 32, float: true });
        const blob = new Blob([wavData], { type: 'audio/wav' });
        const file = new File([blob], `track_${trackId}_source.wav`, { type: 'audio/wav' });
        await setIDB(`track_${trackId}_source`, file);
  };

  // --- File Mode History Logic ---
  const addFileToHistory = (buffer: AudioBuffer, description: string) => {
        setFileUndoStack(prev => [...prev.slice(-4), { buffer, timestamp: Date.now(), description }]);
        setFileRedoStack([]);
  };

  const handleFileUndo = () => {
      const lastAction = fileUndoStack[fileUndoStack.length - 1];
      if (!lastAction || !currentFileBuffer) return;

      // Push current to Redo
      setFileRedoStack(prev => [...prev, { 
          buffer: currentFileBuffer, 
          timestamp: Date.now(), 
          description: "Undo Revert" 
      }]);

      stopPreview(true);
      setCurrentFileBuffer(lastAction.buffer);
      setFileUndoStack(prev => prev.slice(0, -1));
      setStatus(`Undid: ${lastAction.description}`);
      setTimeout(() => setStatus(null), 1500);
  };

  const handleFileRedo = () => {
      const nextAction = fileRedoStack[fileRedoStack.length - 1];
      if (!nextAction || !currentFileBuffer) return;

      // Push current to Undo
      setFileUndoStack(prev => [...prev, { 
          buffer: currentFileBuffer, 
          timestamp: Date.now(), 
          description: "Redo Reapply" 
      }]);

      stopPreview(true);
      setCurrentFileBuffer(nextAction.buffer);
      setFileRedoStack(prev => prev.slice(0, -1));
      setStatus("Redo complete");
      setTimeout(() => setStatus(null), 1500);
  };


  // --- File Mode Logic ---

  const handleFileLoad = async (file: File) => {
      try {
          setStatus("Loading file...");
          const arrayBuffer = await file.arrayBuffer();
          const buffer = await mixerEngine.context.decodeAudioData(arrayBuffer);
          setSelectedFile(file);
          setCurrentFileBuffer(buffer);
          
          // Clear history on new file
          setFileUndoStack([]);
          setFileRedoStack([]);
          
          setStatus(null);
      } catch (e: any) {
          setStatus(`Error loading file: ${e.message}`);
      }
  };

  const stopPreview = (reset: boolean = true) => {
      if (previewNode) {
          try {
             previewNode.stop();
             previewNode.disconnect();
          } catch (e) {}
      }
      if (previewAnimationFrameRef.current) {
          cancelAnimationFrame(previewAnimationFrameRef.current);
      }
      setPreviewNode(null);
      setIsPlayingPreview(false);
      isSeekingRef.current = false;
      if (reset) {
          setPreviewProgress(0);
      }
  };

  const updatePreviewProgress = () => {
      if (!mixerEngine.context || !currentFileBuffer || isSeekingRef.current) return;
      
      const elapsed = mixerEngine.context.currentTime - previewStartTimeRef.current;
      const progress = Math.min(Math.max(elapsed / currentFileBuffer.duration, 0), 1);
      
      setPreviewProgress(progress);
      
      if (progress < 1) {
          previewAnimationFrameRef.current = requestAnimationFrame(updatePreviewProgress);
      } else {
          setIsPlayingPreview(false);
          setPreviewNode(null);
          setPreviewProgress(0);
      }
  };

  const startPreviewNode = (offsetTime: number) => {
      if (!mixerEngine.context || !currentFileBuffer) return;

      const source = mixerEngine.context.createBufferSource();
      source.buffer = currentFileBuffer;
      source.connect(mixerEngine.context.destination);
      
      source.start(0, offsetTime);
      previewStartTimeRef.current = mixerEngine.context.currentTime - offsetTime;
      
      setPreviewNode(source as unknown as AudioBufferSourceNode);
      setIsPlayingPreview(true);
      
      // Start loop
      if (previewAnimationFrameRef.current) cancelAnimationFrame(previewAnimationFrameRef.current);
      updatePreviewProgress();
  }

  const handlePreview = () => {
      if (!mixerEngine.context || !currentFileBuffer) return;

      if (isPlayingPreview) {
          stopPreview(true); // Stop and reset
          return;
      }

      // Start from current progress (if scrubbed) or 0
      const startOffset = previewProgress * currentFileBuffer.duration;
      
      // Check if we are at the end, if so restart
      const effectiveOffset = startOffset >= currentFileBuffer.duration - 0.1 ? 0 : startOffset;

      startPreviewNode(effectiveOffset);
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!currentFileBuffer) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      const targetTime = percent * currentFileBuffer.duration;

      setPreviewProgress(percent);

      if (isPlayingPreview) {
          // Seek behavior: Stop current, start new at target
          if (previewNode) {
              try { previewNode.stop(); previewNode.disconnect(); } catch(e){}
          }
          // Prevent loop from overwriting progress while we seek
          isSeekingRef.current = true;
          
          startPreviewNode(targetTime);
          
          isSeekingRef.current = false;
      }
  };

  const handleDownload = () => {
      if (!currentFileBuffer || !selectedFile) return;

      const defaultName = selectedFile.name.replace(/\.[^/.]+$/, "") + "_processed_sf";
      const name = prompt("Enter filename for download:", defaultName);
      
      if (name) {
          setStatus("Encoding WAV...");
          setTimeout(() => {
            const wavData = audioBufferToWav(currentFileBuffer, { bitDepth: 32, float: true });
            const blob = new Blob([wavData], { type: 'audio/wav' });
            saveAs(blob, `${name}.wav`);
            setStatus("Downloaded!");
            setTimeout(() => setStatus(null), 2000);
          }, 50);
      }
  };

  const handleResetFile = () => {
      stopPreview(true);
      setSelectedFile(null);
      setCurrentFileBuffer(null);
      setFileUndoStack([]);
      setFileRedoStack([]);
  };

  const processAudio = async (
      name: string, 
      processFn: (l: Float32Array, r: Float32Array, sr: number) => Promise<{ leftChannel: Float32Array, rightChannel: Float32Array }>
  ) => {
      if (!isInitialized) return;
      setIsProcessing(true);
      setStatus(`Processing: ${name}...`);

      try {
          let sourceBuffer: AudioBuffer | null = null;
          let trackIdForUpdate: string | null = null;

          // 1. Get Source Audio
          if (mode === 'track') {
              if (!selectedTrackId) throw new Error("No track selected");
              const track = mixerEngine.getTrack(selectedTrackId);
              if (!track || !track.sourceBuffer) throw new Error("Track has no audio");
              sourceBuffer = track.sourceBuffer;
              trackIdForUpdate = selectedTrackId;
          } else {
              // Use current buffer in chain if available
              if (!currentFileBuffer) throw new Error("No audio loaded");
              sourceBuffer = currentFileBuffer;
          }

          // 2. Prepare Data
          const sr = sourceBuffer.sampleRate;
          const left = new Float32Array(sourceBuffer.getChannelData(0));
          const right = sourceBuffer.numberOfChannels > 1 
              ? new Float32Array(sourceBuffer.getChannelData(1))
              : new Float32Array(left); // Duplicate mono to stereo

          // 3. Process
          const result = await processFn(left, right, sr);

          // 4. Create Output Buffer
          const newBuffer = mixerEngine.context.createBuffer(2, result.leftChannel.length, sr);
          newBuffer.copyToChannel(result.leftChannel, 0);
          newBuffer.copyToChannel(result.rightChannel, 1);

          // 5. Handle Result
          if (mode === 'track' && trackIdForUpdate) {
              const track = mixerEngine.getTrack(trackIdForUpdate);
              if (track && sourceBuffer) {
                  // Save History
                  addToHistory(trackIdForUpdate, sourceBuffer, name);
                  
                  // Update Track
                  track.setSource(newBuffer as unknown as AudioBuffer);
                  
                  // Persist
                  setStatus("Saving to project...");
                  await persistTrack(trackIdForUpdate, newBuffer as unknown as AudioBuffer);
              }
          } else {
              // File Mode: Update State
              if (currentFileBuffer) {
                  addFileToHistory(currentFileBuffer, name);
              }
              stopPreview(true); // Stop and reset
              setCurrentFileBuffer(newBuffer as unknown as AudioBuffer);
              setStatus("Updated buffer");
          }

          setTimeout(() => setStatus(null), 1500);

      } catch (e: any) {
          console.error(e);
          setStatus(`Error: ${e.message}`);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleNormalize = () => {
    const input = prompt("Enter target LUFS (e.g. -14, -23):", "-14");
    if (input === null) return;
    const target = parseFloat(input);
    if (isNaN(target)) {
        alert("Invalid number");
        return;
    }
    processAudio(`Normalize to ${target} LUFS`, (l, r, sr) => offlineProcessor.normalizeLoudness(l, r, sr, target));
  };

  const btnClass = "w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded text-sm text-left transition-colors flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 hover:border-slate-600";

  return (
    <div className="flex flex-col h-full">
      {/* Mode Toggles */}
      <div className="flex p-1 bg-slate-800 rounded-lg mb-4 shrink-0">
          <button
              onClick={() => { setMode('track'); stopPreview(true); }}
              className={clsx(
                  "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all",
                  mode === 'track' ? "bg-primary text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              )}
          >
              <Layers size={14} />
              Project Track
          </button>
          <button
              onClick={() => { setMode('file'); stopPreview(true); }}
              className={clsx(
                  "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all",
                  mode === 'file' ? "bg-primary text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              )}
          >
              <FileAudio size={14} />
              External File
          </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        
        {/* === TRACK MODE CONTROLS === */}
        {mode === 'track' && (
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Target Track</label>
                    <select 
                        value={selectedTrackId}
                        onChange={(e) => setSelectedTrackId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary outline-none"
                    >
                        {trackOrder.map(id => (
                            <option key={id} value={id}>
                                {tracks[id]?.name || `Track ${id}`}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Undo/Redo */}
                <div className="flex gap-2">
                    <button
                        onClick={handleUndo}
                        disabled={undoStack.length === 0 || isProcessing}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded border border-slate-700 flex items-center justify-center gap-2 text-xs font-bold transition-all"
                    >
                        <Undo2 size={14} />
                        Undo
                    </button>
                    <button
                        onClick={handleRedo}
                        disabled={redoStack.length === 0 || isProcessing}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded border border-slate-700 flex items-center justify-center gap-2 text-xs font-bold transition-all"
                    >
                        Redo
                        <Redo2 size={14} />
                    </button>
                </div>
            </div>
        )}

        {/* === FILE MODE CONTROLS === */}
        {mode === 'file' && (
            <div className="space-y-4">
                {!selectedFile ? (
                    <div 
                        className="border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer text-center hover:bg-slate-800/30 hover:border-slate-600"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={24} className="text-slate-500" />
                        <div className="text-xs font-medium text-slate-400">
                            Click to upload audio file
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-3">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center shrink-0">
                                <FileAudio size={16} className="text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-200 truncate" title={selectedFile.name}>
                                    {selectedFile.name}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                    {(currentFileBuffer?.duration || 0).toFixed(2)}s • {currentFileBuffer?.numberOfChannels}ch
                                </div>
                            </div>
                            <button 
                                onClick={handleResetFile}
                                className="p-1.5 hover:bg-red-900/30 text-slate-500 hover:text-red-400 rounded transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {/* Timeline / Playhead */}
                        <div 
                            className="h-8 bg-slate-950 rounded border border-slate-800 relative overflow-hidden group cursor-pointer"
                            onClick={handleScrub}
                        >
                            {/* Waveform Placeholder (visual flair) */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                                <div className="w-full h-px bg-slate-400"></div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div 
                                className="absolute top-0 bottom-0 left-0 bg-primary/20 border-r border-primary transition-all duration-75 ease-linear pointer-events-none"
                                style={{ width: `${previewProgress * 100}%` }}
                            ></div>
                        </div>

                        {/* Controls */}
                        <div className="flex gap-2">
                             <button
                                onClick={handlePreview}
                                disabled={isProcessing}
                                className={clsx(
                                    "flex-1 py-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-2",
                                    isPlayingPreview 
                                        ? "bg-primary text-white shadow-glow" 
                                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                                )}
                             >
                                {isPlayingPreview ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                                {isPlayingPreview ? "Stop" : "Preview"}
                             </button>
                             <button
                                onClick={handleDownload}
                                disabled={isProcessing}
                                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold transition-all flex items-center justify-center gap-2"
                             >
                                <Download size={14} />
                                Download
                             </button>
                        </div>

                        {/* Undo/Redo for File */}
                         <div className="flex gap-2">
                            <button
                                onClick={handleFileUndo}
                                disabled={fileUndoStack.length === 0 || isProcessing || isPlayingPreview}
                                className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-30 rounded border border-slate-800 flex items-center justify-center gap-2 text-[10px] font-bold transition-all text-slate-400"
                            >
                                <Undo2 size={12} />
                                Undo
                            </button>
                            <button
                                onClick={handleFileRedo}
                                disabled={fileRedoStack.length === 0 || isProcessing || isPlayingPreview}
                                className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-30 rounded border border-slate-800 flex items-center justify-center gap-2 text-[10px] font-bold transition-all text-slate-400"
                            >
                                Redo
                                <Redo2 size={12} />
                            </button>
                        </div>
                    </div>
                )}
                
                <input 
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files?.[0]) handleFileLoad(e.target.files[0]);
                        e.target.value = ''; // Reset
                    }}
                />
            </div>
        )}

        {/* === PROCESSOR LIST === */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Available Processors
            </h3>
            
            <button 
                disabled={isProcessing || (mode === 'file' && !currentFileBuffer)}
                onClick={handleNormalize}
                className={btnClass}
            >
                <span>Loudness Normalize (Custom)</span>
            </button>
            
            <button 
                disabled={isProcessing || (mode === 'file' && !currentFileBuffer)}
                onClick={() => processAudio("Phase Rotation", (l, r, sr) => offlineProcessor.fixPhase(l, r, sr))}
                className={btnClass}
            >
                <span>Phase Rotation (Fix Headroom)</span>
            </button>

            <button 
                disabled={isProcessing || (mode === 'file' && !currentFileBuffer)}
                onClick={() => processAudio("De-Clip", (l, r, sr) => offlineProcessor.repairClipping(l, r, sr))}
                className={btnClass}
            >
                <span>De-Clip (Restoration)</span>
            </button>

            <button 
                disabled={isProcessing || (mode === 'file' && !currentFileBuffer)}
                onClick={() => processAudio("Spectral Denoise", (l, r, sr) => offlineProcessor.denoise(l, r, sr))}
                className={btnClass}
            >
                <span>Adaptive Spectral Denoise</span>
            </button>

            <button 
                disabled={isProcessing || (mode === 'file' && !currentFileBuffer)}
                onClick={() => processAudio("Mono Bass", (l, r, sr) => offlineProcessor.monoBass(l, r, sr, 120))}
                className={btnClass}
            >
                <span>Mono Bass ({'<'} 120Hz)</span>
            </button>
        </div>
      </div>

      {status && (
        <div className="shrink-0 pt-4 text-xs text-blue-400 font-mono animate-pulse flex items-center">
           {isProcessing && <Loader2 className="inline w-3 h-3 mr-2 animate-spin" />}
           {status}
        </div>
      )}
    </div>
  );
};