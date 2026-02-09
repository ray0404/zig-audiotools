import React, { useState, useRef, useEffect } from 'react';
import { initProcessor, processAudioBuffer } from '@/services/Processor';
import { audioBufferToWav } from '@/utils/wav-export';
import { saveAs } from 'file-saver';
import { 
    Loader2, Upload, 
    Play, Square, Download, Trash2, Wand2,
    Settings2, ChevronRight, Mic, Activity, Droplets, FastForward,
    Target, Wind, SkipBack, BarChart3, Waves
} from 'lucide-react';
import { clsx } from 'clsx';
import { ResponsiveCanvas } from '@/components/visualizers/ResponsiveCanvas';
import { useUIStore } from '@/store/useUIStore';
import { AnalysisView } from '@/components/views/AnalysisView';

export const SmartToolsWorkspace: React.FC = () => {
    const { activeView, setActiveView } = useUIStore();
    const [, setIsSdkReady] = useState(false);
    const [sourceBuffer, setSourceBuffer] = useState<AudioBuffer | null>(null);
    const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null);
    const [referenceBuffer, setReferenceBuffer] = useState<AudioBuffer | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    
    // History State
    const [history, setHistory] = useState<AudioBuffer[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Tool Params
    const [plosiveParams, setPlosiveParams] = useState({ sensitivity: 0.5, strength: 0.8, cutoff: 150 });
    const [echoParams, setEchoParams] = useState({ amount: 0.8, tailMs: 200 });
    const [smartLevelParams, setSmartLevelParams] = useState({ targetLufs: -14, maxGainDb: 12, gateThresholdDb: -60 });
    
    // New Params
    const [lufsParams, setLufsParams] = useState({ targetLufs: -14 });
    const [monoBassParams, setMonoBassParams] = useState({ cutoff: 120 });
    const [voiceIsolateParams, setVoiceIsolateParams] = useState({ amount: 1.0 });
    const [psychoParams, setPsychoParams] = useState({ intensity: 1.0, refDb: -18.0 });
    const [debleedParams, setDebleedParams] = useState({ sensitivity: 0.5, threshold: -40 });
    const [declipParams, setDeclipParams] = useState({ threshold: 0.95 });
    const [tapeParams, setTapeParams] = useState({ nominalFreq: 60, amount: 1.0 });
    const [spectralMatchParams, setSpectralMatchParams] = useState({ amount: 1.0 });

    // Noise Profile State
    const [noiseProfile, setNoiseProfile] = useState<{ start: number | null, end: number | null, buffer: AudioBuffer | null }>({ start: null, end: null, buffer: null });

    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackMode, setPlaybackMode] = useState<'source' | 'processed'>('processed');
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const startTimeRef = useRef<number>(0);
    const [progress, setProgress] = useState(0);
    const animationFrameRef = useRef<number>(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const refInputRef = useRef<HTMLInputElement>(null);

    // Refs for waveform rendering
    const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const processedCanvasRef = useRef<HTMLCanvasElement | null>(null);
    
    // Ref for seeking
    const isDraggingRef = useRef(false);

    useEffect(() => {
        initProcessor().then(() => setIsSdkReady(true));
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        return () => {
            stopPlayback();
            audioContextRef.current?.close();
        };
    }, []);

    // Draw waveforms when buffers change
    useEffect(() => {
        if (sourceBuffer && sourceCanvasRef.current) {
            drawWaveform(sourceBuffer, sourceCanvasRef.current, '#475569');
        }
    }, [sourceBuffer]);

    useEffect(() => {
        if (processedBuffer && processedCanvasRef.current) {
            drawWaveform(processedBuffer, processedCanvasRef.current, '#3b82f6');
        }
    }, [processedBuffer]);

    const addToHistory = (buffer: AudioBuffer) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(buffer);
            // Limit history
            if (newHistory.length > 20) newHistory.shift();
            return newHistory;
        });
        setHistoryIndex(prev => Math.min(prev + 1, 19));
        setProcessedBuffer(buffer);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setProcessedBuffer(history[newIndex]);
            if (isPlaying && playbackMode === 'processed') {
                stopPlayback(); // Stop to avoid glitch
                // Ideally restart playback at current position with new buffer
                const buffer = history[newIndex];
                startPlayback(buffer, progress * buffer.duration);
            }
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setProcessedBuffer(history[newIndex]);
            if (isPlaying && playbackMode === 'processed') {
                stopPlayback();
                const buffer = history[newIndex];
                startPlayback(buffer, progress * buffer.duration);
            }
        }
    };

    const drawWaveform = (buffer: AudioBuffer, canvas: HTMLCanvasElement, color: string) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = height / 2;

        ctx.clearRect(0, 0, width, height);
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.moveTo(i, (1 + min) * amp);
            ctx.lineTo(i, (1 + max) * amp);
        }
        ctx.stroke();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !audioContextRef.current) return;

        setStatus('Loading audio...');
        setFileName(file.name);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const decoded = await audioContextRef.current.decodeAudioData(arrayBuffer);
            
            // Set source as a clean original
            setSourceBuffer(decoded);
            
            // Create a distinct clone for processedBuffer to ensure A/B comparison works correctly
            const clone = new AudioBuffer({
                length: decoded.length,
                numberOfChannels: decoded.numberOfChannels,
                sampleRate: decoded.sampleRate
            });
            for (let i = 0; i < decoded.numberOfChannels; i++) {
                clone.copyToChannel(decoded.getChannelData(i), i);
            }
            setProcessedBuffer(clone);
            
            // Init history with the initial clone
            setHistory([clone]);
            setHistoryIndex(0);

            setStatus(null);
        } catch (err) {
            setStatus('Error decoding audio');
        }
    };

    const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !audioContextRef.current) return;
        setStatus('Loading reference...');
        try {
            const arrayBuffer = await file.arrayBuffer();
            const decoded = await audioContextRef.current.decodeAudioData(arrayBuffer);
            setReferenceBuffer(decoded);
            setStatus('Reference loaded');
            setTimeout(() => setStatus(null), 2000);
        } catch (err) {
            setStatus('Error loading reference');
        }
    };

    const stopPlayback = () => {
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
                sourceNodeRef.current.disconnect();
            } catch (e) {
                // Ignore if already stopped
            }
        }
        sourceNodeRef.current = null;
        setIsPlaying(false);
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = 0;
        }
    };

    const startPlayback = (buffer: AudioBuffer, offset: number = 0) => {
        if (!audioContextRef.current) return;
        stopPlayback();

        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        
        const startTime = audioContextRef.current.currentTime;
        const duration = buffer.duration;
        // Clamp offset
        const safeOffset = Math.max(0, Math.min(offset, duration - 0.01));
        
        source.start(0, safeOffset);
        startTimeRef.current = startTime - safeOffset;
        
        sourceNodeRef.current = source;
        setIsPlaying(true);
        updateProgress(buffer);
    };

    const updateProgress = (activeBuffer: AudioBuffer) => {
        if (!audioContextRef.current || !activeBuffer) return;
        
        const now = audioContextRef.current.currentTime;
        const elapsed = now - startTimeRef.current;
        const p = Math.max(0, Math.min(1, elapsed / activeBuffer.duration));
        
        setProgress(p);
        
        if (p >= 1) {
             stopPlayback();
             setProgress(1);
        } else {
             animationFrameRef.current = requestAnimationFrame(() => updateProgress(activeBuffer));
        }
    };

    const togglePlay = () => {
        if (isPlaying) {
            stopPlayback();
        } else {
            const buffer = playbackMode === 'source' ? sourceBuffer : processedBuffer;
            if (buffer) {
                // If at end, restart
                const startPos = progress >= 1 ? 0 : progress * buffer.duration;
                startPlayback(buffer, startPos);
            }
        }
    };

    const handleSeek = (e: React.MouseEvent | React.TouchEvent, container: HTMLDivElement) => {
        if (!sourceBuffer) return;
        
        const rect = container.getBoundingClientRect();
        let clientX;
        
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = (e as React.MouseEvent).clientX;
        }
        
        const x = clientX - rect.left;
        const newProgress = Math.max(0, Math.min(1, x / rect.width));
        
        setProgress(newProgress);
        
        // If playing, seek immediately
        if (isPlaying) {
            const buffer = playbackMode === 'source' ? sourceBuffer : processedBuffer;
            if (buffer) startPlayback(buffer, newProgress * buffer.duration);
        }
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        isDraggingRef.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        handleSeek(e, e.currentTarget);
    };
    
    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isDraggingRef.current) {
            handleSeek(e, e.currentTarget);
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        isDraggingRef.current = false;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    const runTool = async (tool: any, label: string, params?: any) => {
        if (!sourceBuffer) return;
        setIsProcessing(true);
        setStatus(`Running ${label}...`);
        
        try {
            const result = await processAudioBuffer(processedBuffer || sourceBuffer, tool, params);
            // setProcessedBuffer(result); // Replaced by addToHistory
            addToHistory(result);
            setStatus(`Applied ${label}`);
            setTimeout(() => setStatus(null), 2000);
            
            // If playing, switch to new buffer seamlessly
            if (isPlaying && playbackMode === 'processed') {
                startPlayback(result, progress * result.duration);
            }
        } catch (err) {
            setStatus(`Error: ${err}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
            {/* Header */}
            <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 bg-slate-900/50 backdrop-blur-md shrink-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                        <Wand2 size={18} className="text-white" />
                    </div>
                    <h1 className="font-bold tracking-tight text-lg hidden md:block">Sonic Forge <span className="text-blue-500">SmartTools</span></h1>
                    <h1 className="font-bold tracking-tight text-lg md:hidden">SF <span className="text-blue-500">Tools</span></h1>
                </div>
                
                <div className="flex items-center gap-2 md:gap-4">
                    {/* Undo/Redo Controls */}
                    <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
                        <button 
                            onClick={handleUndo}
                            disabled={historyIndex <= 0}
                            className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                            title="Undo"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                        </button>
                        <button 
                            onClick={handleRedo}
                            disabled={historyIndex >= history.length - 1}
                            className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                            title="Redo"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 3.7"/></svg>
                        </button>
                    </div>

                    {status && (
                        <div className="hidden md:flex text-xs font-mono text-blue-400 animate-pulse items-center gap-2 bg-blue-950/30 px-3 py-1.5 rounded-full border border-blue-900/30">
                            {isProcessing && <Loader2 size={12} className="animate-spin" />}
                            {status}
                        </div>
                    )}
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 md:px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border border-slate-700"
                    >
                        <Upload size={14} />
                        <span className="hidden md:inline">{sourceBuffer ? 'Change File' : 'Open Audio'}</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*" className="hidden" />
                </div>
            </header>

            <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* Tools Sidebar */}
                <aside className="order-2 md:order-1 w-full md:w-72 border-t md:border-t-0 md:border-r border-slate-800 bg-slate-900/30 p-4 flex flex-col gap-6 overflow-y-auto shrink-0 h-1/2 md:h-auto">
                    <section>
                         <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Views</h2>
                         <div className="flex gap-2 mb-6 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                            <button 
                                onClick={() => setActiveView('TOOLS')}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                                    activeView === 'TOOLS' || activeView === 'SETTINGS' ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                <Waves size={14} />
                                Editor
                            </button>
                            <button 
                                onClick={() => setActiveView('ANALYSIS')}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                                    activeView === 'ANALYSIS' ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                <BarChart3 size={14} />
                                Analysis
                            </button>
                         </div>

                        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Processors</h2>
                        <div className="space-y-2 pb-20 md:pb-0">
                            {/* Loudness Normalize */}
                            <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-3 space-y-3">
                                <ToolButton 
                                    icon={<Settings2 size={14} />} 
                                    label="Loudness Normalize" 
                                    onClick={() => runTool('lufs', 'Normalization', lufsParams)}
                                    disabled={!sourceBuffer || isProcessing}
                                />
                                <div className="space-y-1 px-1">
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                        <span>Target LUFS</span>
                                        <span>{lufsParams.targetLufs}</span>
                                    </div>
                                    <input
                                        type="range" min="-24" max="-6" step="0.5"
                                        value={lufsParams.targetLufs}
                                        onChange={(e) => setLufsParams({...lufsParams, targetLufs: parseFloat(e.target.value)})}
                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>

                            <ToolButton 
                                icon={<ChevronRight size={14} />} 
                                label="Phase Rotation" 
                                onClick={() => runTool('phase', 'Phase Fix')}
                                disabled={!sourceBuffer || isProcessing}
                            />
                            
                            {/* De-Clip */}
                            <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-3 space-y-3">
                                <ToolButton 
                                    icon={<Wand2 size={14} />} 
                                    label="De-Clip" 
                                    onClick={() => runTool('declip', 'De-Clip', declipParams)}
                                    disabled={!sourceBuffer || isProcessing}
                                />
                                <div className="space-y-1 px-1">
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                        <span>Threshold</span>
                                        <span>{declipParams.threshold.toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range" min="0.5" max="1.0" step="0.01"
                                        value={declipParams.threshold}
                                        onChange={(e) => setDeclipParams({...declipParams, threshold: parseFloat(e.target.value)})}
                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Spectral Denoise */}
                            <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-3 space-y-3">
                                <ToolButton 
                                    icon={<ChevronRight size={14} />} 
                                    label="Spectral Denoise" 
                                    onClick={() => runTool('denoise', 'Denoise', { noiseBuffer: noiseProfile.buffer })}
                                    disabled={!sourceBuffer || isProcessing}
                                />
                                
                                <div className="bg-slate-950/50 rounded-lg p-2 space-y-2 border border-slate-800/50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Noise Profile</span>
                                        {noiseProfile.buffer && (
                                            <button 
                                                onClick={() => setNoiseProfile({ start: null, end: null, buffer: null })}
                                                className="text-[10px] text-red-400 hover:text-red-300"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>

                                    {!noiseProfile.buffer ? (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <button 
                                                    onClick={() => sourceBuffer && setNoiseProfile(prev => ({ ...prev, start: progress * sourceBuffer.duration }))}
                                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-300 border border-slate-700"
                                                >
                                                    Set Start {noiseProfile.start !== null ? `(${noiseProfile.start.toFixed(2)}s)` : ''}
                                                </button>
                                                <button 
                                                    onClick={() => sourceBuffer && setNoiseProfile(prev => ({ ...prev, end: progress * sourceBuffer.duration }))}
                                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-300 border border-slate-700"
                                                >
                                                    Set End {noiseProfile.end !== null ? `(${noiseProfile.end.toFixed(2)}s)` : ''}
                                                </button>
                                            </div>
                                            
                                            {noiseProfile.start !== null && noiseProfile.end !== null && (
                                                <button 
                                                    onClick={() => {
                                                        if (!sourceBuffer || noiseProfile.start === null || noiseProfile.end === null) return;
                                                        const start = Math.min(noiseProfile.start, noiseProfile.end);
                                                        const end = Math.max(noiseProfile.start, noiseProfile.end);
                                                        if (end - start < 0.1) {
                                                            setStatus("Selection too short (<0.1s)");
                                                            return;
                                                        }

                                                        const sampleRate = sourceBuffer.sampleRate;
                                                        const startFrame = Math.floor(start * sampleRate);
                                                        const endFrame = Math.floor(end * sampleRate);
                                                        const length = endFrame - startFrame;

                                                        const buffer = new AudioBuffer({
                                                            length,
                                                            numberOfChannels: sourceBuffer.numberOfChannels,
                                                            sampleRate
                                                        });

                                                        for(let i=0; i<sourceBuffer.numberOfChannels; i++) {
                                                            const chan = sourceBuffer.getChannelData(i).subarray(startFrame, endFrame);
                                                            buffer.copyToChannel(chan, i);
                                                        }

                                                        setNoiseProfile({ start: null, end: null, buffer });
                                                        setStatus(`Profile Captured (${(length/sampleRate).toFixed(2)}s)`);
                                                        setTimeout(() => setStatus(null), 2000);
                                                    }}
                                                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold text-white shadow-lg shadow-blue-900/20"
                                                >
                                                    Capture Selection
                                                </button>
                                            )}
                                            <div className="text-[10px] text-slate-500 text-center italic">
                                                {noiseProfile.start !== null ? "Define range..." : "Auto: Uses first 200ms"}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 p-2 bg-blue-900/20 border border-blue-900/30 rounded">
                                            <Activity size={12} className="text-blue-400" />
                                            <span className="text-[10px] text-blue-200">
                                                Manual Profile: {(noiseProfile.buffer.duration).toFixed(2)}s
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Mono Bass */}
                            <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-3 space-y-3">
                                <ToolButton 
                                    icon={<ChevronRight size={14} />} 
                                    label="Mono Bass" 
                                    onClick={() => runTool('monoBass', 'Mono Bass', monoBassParams)}
                                    disabled={!sourceBuffer || isProcessing}
                                />
                                <div className="space-y-1 px-1">
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                        <span>Cutoff (Hz)</span>
                                        <span>{monoBassParams.cutoff}</span>
                                    </div>
                                    <input
                                        type="range" min="20" max="500" step="10"
                                        value={monoBassParams.cutoff}
                                        onChange={(e) => setMonoBassParams({...monoBassParams, cutoff: parseFloat(e.target.value)})}
                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Voice Isolate */}
                            <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-3 space-y-3">
                                <ToolButton
                                    icon={<Mic size={14} />}
                                    label="Voice Isolate"
                                    onClick={() => runTool('voiceIsolate', 'Voice Isolate', voiceIsolateParams)}
                                    disabled={!sourceBuffer || isProcessing}
                                />
                                <div className="space-y-1 px-1">
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                        <span>Amount</span>
                                        <span>{voiceIsolateParams.amount.toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.05"
                                        value={voiceIsolateParams.amount}
                                        onChange={(e) => setVoiceIsolateParams({...voiceIsolateParams, amount: parseFloat(e.target.value)})}
                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>

                            {/* PsychoDynamic EQ */}
                            <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-3 space-y-3">
                                <ToolButton
                                    icon={<Wand2 size={14} />}
                                    label="PsychoDynamic EQ"
                                    onClick={() => runTool('psychodynamic', 'PsychoDynamic EQ', psychoParams)}
                                    disabled={!sourceBuffer || isProcessing}
                                />
                                <div className="space-y-2 px-1">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                            <span>Intensity</span>
                                            <span>{psychoParams.intensity.toFixed(1)}</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="2" step="0.1"
                                            value={psychoParams.intensity}
                                            onChange={(e) => setPsychoParams({...psychoParams, intensity: parseFloat(e.target.value)})}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                            <span>Ref dB</span>
                                            <span>{psychoParams.refDb.toFixed(1)}</span>
                                        </div>
                                        <input
                                            type="range" min="-60" max="0" step="1"
                                            value={psychoParams.refDb}
                                            onChange={(e) => setPsychoParams({...psychoParams, refDb: parseFloat(e.target.value)})}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Smart Level with Controls */}
                            <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-3 space-y-3">
                                <ToolButton
                                    icon={<Activity size={14} />}
                                    label="Smart Level"
                                    onClick={() => runTool('smartLevel', 'Smart Level', smartLevelParams)}
                                    disabled={!sourceBuffer || isProcessing}
                                />
                                <div className="space-y-2 px-1">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                            <span>Target LUFS</span>
                                            <span>{smartLevelParams.targetLufs}</span>
                                        </div>
                                        <input
                                            type="range" min="-24" max="-6" step="0.5"
                                            value={smartLevelParams.targetLufs}
                                            onChange={(e) => setSmartLevelParams({...smartLevelParams, targetLufs: parseFloat(e.target.value)})}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                            <span>Max Gain (dB)</span>
                                            <span>{smartLevelParams.maxGainDb}</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="24" step="0.5"
                                            value={smartLevelParams.maxGainDb}
                                            onChange={(e) => setSmartLevelParams({...smartLevelParams, maxGainDb: parseFloat(e.target.value)})}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                            <span>Gate (dB)</span>
                                            <span>{smartLevelParams.gateThresholdDb}</span>
                                        </div>
                                        <input
                                            type="range" min="-100" max="-30" step="1"
                                            value={smartLevelParams.gateThresholdDb}
                                            onChange={(e) => setSmartLevelParams({...smartLevelParams, gateThresholdDb: parseFloat(e.target.value)})}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* DeBleed Lite */}
                            <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-3 space-y-3">
                                <ToolButton
                                    icon={<Droplets size={14} />}
                                    label="DeBleed Lite"
                                    onClick={() => runTool('debleed', 'DeBleed', debleedParams)}
                                    disabled={!sourceBuffer || isProcessing || sourceBuffer.numberOfChannels < 2}
                                />
                                <div className="space-y-2 px-1">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                            <span>Sensitivity</span>
                                            <span>{debleedParams.sensitivity.toFixed(2)}</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="1" step="0.05"
                                            value={debleedParams.sensitivity}
                                            onChange={(e) => setDebleedParams({...debleedParams, sensitivity: parseFloat(e.target.value)})}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                            <span>Threshold (dB)</span>
                                            <span>{debleedParams.threshold}</span>
                                        </div>
                                        <input
                                            type="range" min="-80" max="0" step="1"
                                            value={debleedParams.threshold}
                                            onChange={(e) => setDebleedParams({...debleedParams, threshold: parseFloat(e.target.value)})}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tape Stabilizer */}
                            <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-3 space-y-3">
                                <ToolButton
                                    icon={<FastForward size={14} />}
                                    label="Tape Stabilizer"
                                    onClick={() => runTool('tapeStabilizer', 'Tape Fix', tapeParams)}
                                    disabled={!sourceBuffer || isProcessing}
                                />
                                <div className="space-y-2 px-1">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                            <span>Nominal Freq</span>
                                            <div className="flex gap-1">
                                                <button 
                                                    onClick={() => setTapeParams({...tapeParams, nominalFreq: 50})}
                                                    className={`px-2 py-0.5 rounded text-[10px] ${tapeParams.nominalFreq === 50 ? 'bg-blue-600 text-white' : 'bg-slate-700'}`}
                                                >50Hz</button>
                                                <button 
                                                    onClick={() => setTapeParams({...tapeParams, nominalFreq: 60})}
                                                    className={`px-2 py-0.5 rounded text-[10px] ${tapeParams.nominalFreq === 60 ? 'bg-blue-600 text-white' : 'bg-slate-700'}`}
                                                >60Hz</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                            <span>Amount</span>
                                            <span>{tapeParams.amount.toFixed(2)}</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="1" step="0.05"
                                            value={tapeParams.amount}
                                            onChange={(e) => setTapeParams({...tapeParams, amount: parseFloat(e.target.value)})}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Spectral Match */}
                            <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-3 space-y-3">
                                <ToolButton
                                    icon={<Target size={14} />}
                                    label="Spectral Match"
                                    onClick={() => runTool('spectralMatch', 'Match', { referenceBuffer, ...spectralMatchParams })}
                                    disabled={!sourceBuffer || isProcessing || !referenceBuffer}
                                />
                                <div className="space-y-1 px-1">
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                        <span>Match Amount</span>
                                        <span>{spectralMatchParams.amount.toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.05"
                                        value={spectralMatchParams.amount}
                                        onChange={(e) => setSpectralMatchParams({...spectralMatchParams, amount: parseFloat(e.target.value)})}
                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                                <button 
                                    onClick={() => refInputRef.current?.click()}
                                    className="w-full text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded-lg border border-slate-700 transition-colors"
                                >
                                    {referenceBuffer ? 'Change Reference' : 'Load Reference'}
                                </button>
                                <input type="file" ref={refInputRef} onChange={handleRefUpload} accept="audio/*" className="hidden" />
                            </div>

                            {/* Echo Vanish with Controls */}
                            <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-3 space-y-3">
                                <ToolButton
                                    icon={<Wind size={14} />}
                                    label="Echo Vanish"
                                    onClick={() => runTool('echovanish', 'De-Reverb', echoParams)}
                                    disabled={!sourceBuffer || isProcessing}
                                />
                                <div className="space-y-2 px-1">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                            <span>Amount</span>
                                            <span>{echoParams.amount.toFixed(2)}</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="1" step="0.01"
                                            value={echoParams.amount}
                                            onChange={(e) => setEchoParams({...echoParams, amount: parseFloat(e.target.value)})}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                            <span>Tail (ms)</span>
                                            <span>{echoParams.tailMs}</span>
                                        </div>
                                        <input
                                            type="range" min="10" max="2000" step="10"
                                            value={echoParams.tailMs}
                                            onChange={(e) => setEchoParams({...echoParams, tailMs: parseFloat(e.target.value)})}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Plosive Guard */}
                            <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-3 space-y-3">
                                <ToolButton
                                    icon={<Wand2 size={14} />}
                                    label="Plosive Guard"
                                    onClick={() => runTool('plosiveGuard', 'Plosive Guard', plosiveParams)}
                                    disabled={!sourceBuffer || isProcessing}
                                />
                                <div className="space-y-2 px-1">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                            <span>Sensitivity</span>
                                            <span>{plosiveParams.sensitivity.toFixed(2)}</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="1" step="0.01"
                                            value={plosiveParams.sensitivity}
                                            onChange={(e) => setPlosiveParams({...plosiveParams, sensitivity: parseFloat(e.target.value)})}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                            <span>Strength</span>
                                            <span>{plosiveParams.strength.toFixed(2)}</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="1" step="0.01"
                                            value={plosiveParams.strength}
                                            onChange={(e) => setPlosiveParams({...plosiveParams, strength: parseFloat(e.target.value)})}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                            <span>Cutoff (Hz)</span>
                                            <span>{plosiveParams.cutoff}</span>
                                        </div>
                                        <input
                                            type="range" min="80" max="250" step="1"
                                            value={plosiveParams.cutoff}
                                            onChange={(e) => setPlosiveParams({...plosiveParams, cutoff: parseFloat(e.target.value)})}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {sourceBuffer && (
                        <section className="mt-auto pt-6 border-t border-slate-800 space-y-3 mb-24 md:mb-0">
                            <button 
                                onClick={() => {
                                    const wav = audioBufferToWav(processedBuffer!, { bitDepth: 24 });
                                    saveAs(new Blob([wav], { type: 'audio/wav' }), fileName.replace(/\.[^/.]+$/, "") + "_processed.wav");
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <Download size={16} />
                                Download Result
                            </button>
                            <button 
                                onClick={() => {
                                    setSourceBuffer(null);
                                    setProcessedBuffer(null);
                                    stopPlayback();
                                    setProgress(0);
                                }}
                                className="w-full bg-slate-800 hover:bg-red-900/20 hover:text-red-400 text-slate-400 py-2 rounded-lg text-xs font-medium transition-all"
                            >
                                <Trash2 size={14} className="inline mr-2" />
                                Clear Workspace
                            </button>
                        </section>
                    )}
                </aside>

                {/* Content Area */}
                <section className="order-1 md:order-2 flex-1 flex flex-col bg-slate-950 relative h-1/2 md:h-auto overflow-hidden">
                    {activeView === 'ANALYSIS' ? (
                        <AnalysisView sourceBuffer={sourceBuffer} processedBuffer={processedBuffer || sourceBuffer} />
                    ) : (
                        !sourceBuffer ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                            <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-2">
                                <Upload size={32} className="text-slate-700" />
                            </div>
                            <div className="text-center">
                                <p className="text-slate-300 font-medium">No audio file loaded</p>
                                <p className="text-xs">Drag and drop or use the Open Audio button</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 md:gap-6 overflow-y-auto">
                                {/* Waveform Compare */}
                                <div className="flex-1 flex flex-col gap-4">
                                    <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 p-2 md:p-4 flex flex-col gap-2 relative">
                                        <div className="flex items-center justify-between px-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Original Source</span>
                                            {playbackMode === 'source' && isPlaying && <span className="text-[10px] text-blue-500 font-bold animate-pulse">Monitoring</span>}
                                        </div>
                                        <div 
                                            className="flex-1 relative rounded-xl overflow-hidden bg-slate-950/50 border border-slate-800/50 cursor-crosshair touch-none"
                                            onPointerDown={handlePointerDown}
                                            onPointerMove={handlePointerMove}
                                            onPointerUp={handlePointerUp}
                                            onPointerLeave={handlePointerUp}
                                        >
                                            <ResponsiveCanvas 
                                                onMount={(c) => { 
                                                    sourceCanvasRef.current = c; 
                                                    if (sourceBuffer) drawWaveform(sourceBuffer, c, '#475569');
                                                }} 
                                                onResize={(c) => {
                                                    if (sourceBuffer) drawWaveform(sourceBuffer, c, '#475569');
                                                }}
                                            />
                                            <div 
                                                className="absolute inset-0 bg-blue-500/10 border-r border-blue-500 transition-all pointer-events-none"
                                                style={{ width: `${progress * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 p-2 md:p-4 flex flex-col gap-2 relative">
                                        <div className="flex items-center justify-between px-2">
                                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Processed Result</span>
                                            {playbackMode === 'processed' && isPlaying && <span className="text-[10px] text-blue-500 font-bold animate-pulse">Monitoring</span>}
                                        </div>
                                        <div 
                                            className="flex-1 relative rounded-xl overflow-hidden bg-slate-950/50 border border-slate-800/50 cursor-crosshair touch-none"
                                            onPointerDown={handlePointerDown}
                                            onPointerMove={handlePointerMove}
                                            onPointerUp={handlePointerUp}
                                            onPointerLeave={handlePointerUp}
                                        >
                                            <ResponsiveCanvas 
                                                onMount={(c) => { 
                                                    processedCanvasRef.current = c; 
                                                    if (processedBuffer) drawWaveform(processedBuffer, c, '#3b82f6');
                                                }} 
                                                onResize={(c) => {
                                                    if (processedBuffer) drawWaveform(processedBuffer, c, '#3b82f6');
                                                }}
                                            />
                                            <div 
                                                className="absolute inset-0 bg-blue-500/10 border-r border-blue-500 transition-all pointer-events-none"
                                                style={{ width: `${progress * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Transport Bar */}
                            <footer className="h-20 md:h-24 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 flex items-center justify-center gap-4 md:gap-8 px-4 md:px-10 shrink-0 absolute bottom-0 md:relative w-full z-20">
                                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                                    <button 
                                        onClick={() => {
                                            setPlaybackMode('source');
                                            if (isPlaying && sourceBuffer) startPlayback(sourceBuffer, progress * sourceBuffer.duration);
                                        }}
                                        className={clsx(
                                            "px-3 md:px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                            playbackMode === 'source' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                                        )}
                                    >
                                        Src
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setPlaybackMode('processed');
                                            if (isPlaying && processedBuffer) startPlayback(processedBuffer, progress * processedBuffer.duration);
                                        }}
                                        className={clsx(
                                            "px-3 md:px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                            playbackMode === 'processed' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                                        )}
                                    >
                                        Mix
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                     <button 
                                        onClick={() => {
                                            setProgress(0);
                                            if (isPlaying) {
                                                const buffer = playbackMode === 'source' ? sourceBuffer : processedBuffer;
                                                if(buffer) startPlayback(buffer, 0);
                                            }
                                        }}
                                        className="w-10 h-10 md:w-12 md:h-12 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-all"
                                    >
                                        <SkipBack size={18} fill="currentColor" />
                                    </button>

                                    <button 
                                        onClick={togglePlay}
                                        className="w-12 h-12 md:w-14 md:h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-xl shadow-blue-900/20 active:scale-90 transition-all"
                                    >
                                        {isPlaying ? <Square size={20} fill="white" className="text-white" /> : <Play size={20} fill="white" className="text-white ml-1" />}
                                    </button>
                                </div>

                                <div className="text-xs md:text-xl font-mono tabular-nums text-slate-400 hidden md:block">
                                    {(progress * (sourceBuffer?.duration || 0)).toFixed(2)}
                                    <span className="text-slate-700 mx-1">/</span>
                                    <span className="text-slate-600">{(sourceBuffer?.duration || 0).toFixed(2)}</span>
                                </div>
                            </footer>
                        </>
                    ))}
                </section>
            </main>
        </div>
    );
};

const ToolButton: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, disabled?: boolean }> = ({ icon, label, onClick, disabled }) => (
    <button 
        disabled={disabled}
        onClick={onClick}
        className="w-full flex items-center gap-3 p-3 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
    >
        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
            {icon}
        </div>
        <span className="text-sm font-medium text-slate-300 group-hover:text-white">{label}</span>
    </button>
);