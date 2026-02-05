import React, { useState } from 'react';
import { Download, Loader2, CheckCircle2, Settings2, Activity } from 'lucide-react';
import { OfflineRenderer, RenderProgress } from '@/services/OfflineRenderer';
import { ExportFormat, ExportSettings } from '@/services/TranscoderService';
import { ContextManager } from '@sonic-core/core/context-manager';
import { logger } from '@/utils/logger';
import { clsx } from 'clsx';

const SAMPLE_RATES = [44100, 48000, 88200, 96000] as const;
type SampleRate = typeof SAMPLE_RATES[number];

export const ExportView: React.FC = () => {
    const [isRendering, setIsRendering] = useState(false);
    const [progress, setProgress] = useState<RenderProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);

    // Export Settings State
    const [format, setFormat] = useState<ExportFormat>('wav');
    const [bitDepth, setBitDepth] = useState<16 | 24 | 32>(24);
    const [kbps, setKbps] = useState<128 | 192 | 256 | 320>(320);
    const [sampleRate, setSampleRate] = useState<SampleRate>(() => {
        const native = ContextManager.context.sampleRate;
        return SAMPLE_RATES.includes(native as any) ? (native as SampleRate) : 48000;
    });

    const handleExport = async () => {
        setIsRendering(true);
        setError(null);
        setIsComplete(false);
        try {
            const settings: ExportSettings = {
                format,
                bitDepth,
                kbps,
                sampleRate
            };

            await OfflineRenderer.render(settings, (p) => {
                setProgress(p);
            });
            setIsComplete(true);
        } catch (e: any) {
            logger.error("Export failed", e);
            setError(e.message || "Export failed. Please try again.");
        } finally {
            setIsRendering(false);
            setProgress(null);
        }
    };

    return (
        <div className="p-6 space-y-6 overflow-y-auto max-h-full pb-20">
            <div>
                <h2 className="text-xl font-semibold text-slate-100 mb-2">Export Master</h2>
                <p className="text-sm text-slate-400">
                    Configure your final delivery settings. High sample rates (96kHz) provide 
                    the highest frequency response for archival masters.
                </p>
            </div>

            {/* Format Selection */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['wav', 'mp3', 'flac', 'aac'] as ExportFormat[]).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFormat(f)}
                        className={clsx(
                            "py-3 px-4 rounded-xl border transition-all text-sm font-bold uppercase tracking-wider",
                            format === f 
                                ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                                : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500"
                        )}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 space-y-6">
                <div className="flex items-center gap-3 text-slate-300">
                    <Settings2 size={18} className="text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Encoder Settings</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Bit Depth (for Lossless) */}
                    {(format === 'wav' || format === 'flac') && (
                        <div className="space-y-3">
                            <label className="text-xs font-medium text-slate-500">Bit Depth</label>
                            <div className="flex gap-2">
                                {[16, 24, 32].map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setBitDepth(d as any)}
                                        className={clsx(
                                            "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                                            bitDepth === d 
                                                ? "bg-slate-200 text-slate-900" 
                                                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                        )}
                                    >
                                        {d === 32 ? '32-bit Float' : `${d}-bit`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bitrate (for Lossy) */}
                    {(format === 'mp3' || format === 'aac') && (
                        <div className="space-y-3">
                            <label className="text-xs font-medium text-slate-500">Bitrate (CBR)</label>
                            <div className="flex gap-2">
                                {[128, 192, 256, 320].map((k) => (
                                    <button
                                        key={k}
                                        onClick={() => setKbps(k as any)}
                                        className={clsx(
                                            "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                                            kbps === k 
                                                ? "bg-slate-200 text-slate-900" 
                                                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                        )}
                                    >
                                        {k}k
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="text-xs font-medium text-slate-500">Sample Rate</label>
                        <div className="grid grid-cols-2 gap-2">
                            {SAMPLE_RATES.map((rate) => (
                                <button
                                    key={rate}
                                    onClick={() => setSampleRate(rate)}
                                    className={clsx(
                                        "py-2 rounded-lg text-xs font-bold transition-all border",
                                        sampleRate === rate
                                            ? "bg-slate-200 text-slate-900 border-slate-200"
                                            : "bg-slate-700 text-slate-400 border-transparent hover:bg-slate-600"
                                    )}
                                >
                                    {rate / 1000} kHz
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-700/50">
                    <div className="flex flex-col items-center justify-center py-4 space-y-4">
                        {!isRendering && !isComplete && (
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-3 px-10 py-4 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold shadow-xl shadow-primary/30 transition-all active:scale-95 w-full justify-center"
                            >
                                <Download size={20} />
                                <span>Bounce Mix</span>
                            </button>
                        )}

                        {isRendering && (
                            <div className="flex flex-col items-center space-y-4 w-full">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-primary h-full transition-all duration-300"
                                        style={{ width: `${progress?.percentage || 0}%` }}
                                    />
                                </div>
                                <span className="text-sm font-medium text-slate-300">
                                    {progress?.status || "Processing..."}
                                </span>
                            </div>
                        )}

                        {isComplete && (
                            <div className="flex flex-col items-center space-y-4">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                <span className="text-lg font-medium text-emerald-500">Master Exported!</span>
                                <button 
                                    onClick={() => setIsComplete(false)}
                                    className="text-sm text-slate-400 hover:text-slate-100 underline underline-offset-4"
                                >
                                    Export another version
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm w-full text-center">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                <div className="flex gap-3">
                    <Activity size={18} className="text-blue-400 shrink-0" />
                    <p className="text-xs text-blue-300/80 leading-relaxed">
                        <strong>Audio Fidelity Note:</strong> Sonic Forge supports importing and processing 
                        audio at its original sample rate (up to 96kHz). When bouncing, 
                        the engine performs high-quality resampling to your target rate.
                    </p>
                </div>
            </div>
        </div>
    );
};
