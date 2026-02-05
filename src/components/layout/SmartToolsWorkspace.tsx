
import React, { useState, useRef, useEffect } from 'react';
import { initProcessor, processAudioBuffer } from '@/services/Processor';
import { audioBufferToWav } from '@/utils/wav-export';
import { saveAs } from 'file-saver';
import { 
    Loader2, Upload, 
    Play, Square, Download, Trash2, Wand2,
    Settings2, ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { ResponsiveCanvas } from '@/components/visualizers/ResponsiveCanvas';

export const SmartToolsWorkspace: React.FC = () => {
    const [, setIsSdkReady] = useState(false);
    const [sourceBuffer, setSourceBuffer] = useState<AudioBuffer | null>(null);
    const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    
    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackMode, setPlaybackMode] = useState<'source' | 'processed'>('processed');
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const startTimeRef = useRef<number>(0);
    const [progress, setProgress] = useState(0);
    const animationFrameRef = useRef<number>(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Refs for waveform rendering
    const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const processedCanvasRef = useRef<HTMLCanvasElement | null>(null);

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
            
            setStatus(null);
        } catch (err) {
            setStatus('Error decoding audio');
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
        const startOffset = offset % duration;
        
        source.start(0, startOffset);
        startTimeRef.current = startTime - startOffset;
        
        sourceNodeRef.current = source;
        setIsPlaying(true);
        updateProgress(buffer);
    };

    const updateProgress = (activeBuffer: AudioBuffer) => {
        if (!audioContextRef.current || !activeBuffer) return;
        
        const now = audioContextRef.current.currentTime;
        const elapsed = now - startTimeRef.current;
        const p = (elapsed / activeBuffer.duration) % 1;
        
        setProgress(p);
        animationFrameRef.current = requestAnimationFrame(() => updateProgress(activeBuffer));
    };

    const togglePlay = () => {
        if (isPlaying) {
            stopPlayback();
        } else {
            const buffer = playbackMode === 'source' ? sourceBuffer : processedBuffer;
            if (buffer) startPlayback(buffer, progress * buffer.duration);
        }
    };

    const runTool = async (tool: any, label: string, params?: any) => {
        if (!sourceBuffer) return;
        setIsProcessing(true);
        setStatus(`Running ${label}...`);
        
        try {
            const result = await processAudioBuffer(processedBuffer || sourceBuffer, tool, params);
            setProcessedBuffer(result);
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
            <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                        <Wand2 size={18} className="text-white" />
                    </div>
                    <h1 className="font-bold tracking-tight text-lg">Sonic Forge <span className="text-blue-500">SmartTools</span></h1>
                </div>
                
                <div className="flex items-center gap-4">
                    {status && (
                        <div className="text-xs font-mono text-blue-400 animate-pulse flex items-center gap-2 bg-blue-950/30 px-3 py-1.5 rounded-full border border-blue-900/30">
                            {isProcessing && <Loader2 size={12} className="animate-spin" />}
                            {status}
                        </div>
                    )}
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border border-slate-700"
                    >
                        <Upload size={14} />
                        {sourceBuffer ? 'Change File' : 'Open Audio'}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*" className="hidden" />
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Tools Sidebar */}
                <aside className="w-72 border-r border-slate-800 bg-slate-900/30 p-4 flex flex-col gap-6">
                    <section>
                        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Processors</h2>
                        <div className="space-y-2">
                            <ToolButton 
                                icon={<Settings2 size={14} />} 
                                label="Loudness Normalize" 
                                onClick={() => runTool('lufs', 'Normalization', { targetLufs: -14 })}
                                disabled={!sourceBuffer || isProcessing}
                            />
                            <ToolButton 
                                icon={<ChevronRight size={14} />} 
                                label="Phase Rotation" 
                                onClick={() => runTool('phase', 'Phase Fix')}
                                disabled={!sourceBuffer || isProcessing}
                            />
                            <ToolButton 
                                icon={<Wand2 size={14} />} 
                                label="De-Clip" 
                                onClick={() => runTool('declip', 'De-Clip')}
                                disabled={!sourceBuffer || isProcessing}
                            />
                            <ToolButton 
                                icon={<ChevronRight size={14} />} 
                                label="Spectral Denoise" 
                                onClick={() => runTool('denoise', 'Denoise')}
                                disabled={!sourceBuffer || isProcessing}
                            />
                            <ToolButton 
                                icon={<ChevronRight size={14} />} 
                                label="Mono Bass" 
                                onClick={() => runTool('monoBass', 'Mono Bass', { cutoff: 120 })}
                                disabled={!sourceBuffer || isProcessing}
                            />
                        </div>
                    </section>

                    {sourceBuffer && (
                        <section className="mt-auto pt-6 border-t border-slate-800 space-y-3">
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
                <section className="flex-1 flex flex-col bg-slate-950 relative">
                    {!sourceBuffer ? (
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
                            <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
                                {/* Waveform Compare */}
                                <div className="flex-1 flex flex-col gap-4">
                                    <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col gap-2">
                                        <div className="flex items-center justify-between px-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Original Source</span>
                                            {playbackMode === 'source' && isPlaying && <span className="text-[10px] text-blue-500 font-bold animate-pulse">Monitoring</span>}
                                        </div>
                                        <div className="flex-1 relative rounded-xl overflow-hidden bg-slate-950/50 border border-slate-800/50">
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

                                    <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col gap-2">
                                        <div className="flex items-center justify-between px-2">
                                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Processed Result</span>
                                            {playbackMode === 'processed' && isPlaying && <span className="text-[10px] text-blue-500 font-bold animate-pulse">Monitoring</span>}
                                        </div>
                                        <div className="flex-1 relative rounded-xl overflow-hidden bg-slate-950/50 border border-slate-800/50">
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
                            <footer className="h-24 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 flex items-center justify-center gap-8 px-10">
                                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                                    <button 
                                        onClick={() => {
                                            setPlaybackMode('source');
                                            if (isPlaying && sourceBuffer) startPlayback(sourceBuffer, progress * sourceBuffer.duration);
                                        }}
                                        className={clsx(
                                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                            playbackMode === 'source' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                                        )}
                                    >
                                        Source
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setPlaybackMode('processed');
                                            if (isPlaying && processedBuffer) startPlayback(processedBuffer, progress * processedBuffer.duration);
                                        }}
                                        className={clsx(
                                            "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                            playbackMode === 'processed' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                                        )}
                                    >
                                        Processed
                                    </button>
                                </div>

                                <button 
                                    onClick={togglePlay}
                                    className="w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-xl shadow-blue-900/20 active:scale-90 transition-all"
                                >
                                    {isPlaying ? <Square size={24} fill="white" className="text-white" /> : <Play size={24} fill="white" className="text-white ml-1" />}
                                </button>

                                <div className="text-2xl font-mono tabular-nums text-slate-400">
                                    {(progress * (sourceBuffer?.duration || 0)).toFixed(2)}
                                    <span className="text-slate-700 mx-1">/</span>
                                    <span className="text-slate-600">{(sourceBuffer?.duration || 0).toFixed(2)}</span>
                                </div>
                            </footer>
                        </>
                    )}
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
