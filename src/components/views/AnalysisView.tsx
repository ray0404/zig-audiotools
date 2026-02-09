import React, { useState, useEffect } from 'react';
import { AudioAnalysis } from '@sonic-core/types';
import { analyzeBuffer } from '@/services/Processor';
import { Loader2, RefreshCw, Activity, BarChart3, Zap, Layers, ArrowUp, ArrowDown } from 'lucide-react';
import { clsx } from 'clsx';

interface AnalysisViewProps {
    sourceBuffer: AudioBuffer | null;
    processedBuffer: AudioBuffer | null;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ sourceBuffer, processedBuffer }) => {
    const [preAnalysis, setPreAnalysis] = useState<AudioAnalysis | null>(null);
    const [postAnalysis, setPostAnalysis] = useState<AudioAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const runAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            if (sourceBuffer) {
                const pre = await analyzeBuffer(sourceBuffer);
                setPreAnalysis(pre);
            } else {
                setPreAnalysis(null);
            }

            if (processedBuffer) {
                const post = await analyzeBuffer(processedBuffer);
                setPostAnalysis(post);
            } else {
                setPostAnalysis(null);
            }
        } catch (err) {
            console.error('Analysis failed', err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
        runAnalysis();
    }, [sourceBuffer, processedBuffer]);

    if (!sourceBuffer && !processedBuffer) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8">
                <Activity className="w-12 h-12 mb-4 opacity-50" />
                <p>No audio loaded for analysis</p>
            </div>
        );
    }

    if (isAnalyzing && !preAnalysis && !postAnalysis) {
         return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                <p>Analyzing Comparison...</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
            <header className="flex items-center justify-between mb-6">
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                        <Activity className="text-blue-500" size={24} />
                        Analysis Comparison
                    </h2>
                    <div className="flex items-center gap-4 text-xs mt-1">
                        <span className="flex items-center gap-1 text-slate-500"><div className="w-2 h-2 rounded-full bg-slate-500"></div>Original</span>
                        <span className="flex items-center gap-1 text-blue-400"><div className="w-2 h-2 rounded-full bg-blue-500"></div>Processed</span>
                    </div>
                </div>
                <button 
                    onClick={runAnalysis}
                    disabled={isAnalyzing}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                    title="Refresh Analysis"
                >
                    <RefreshCw size={16} className={isAnalyzing ? "animate-spin" : ""} />
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Loudness Comparison */}
                <ComparisonCard 
                    title="Loudness" 
                    icon={<BarChart3 size={18} className="text-purple-400" />}
                    stats={[
                        { 
                            label: 'Integrated', 
                            pre: preAnalysis?.loudness.integrated, 
                            post: postAnalysis?.loudness.integrated,
                            unit: 'LUFS',
                            inverseBad: false, // Higher is not necessarily bad, but > -14 is hot
                            threshold: -14
                        },
                        { 
                            label: 'Range (LRA)', 
                            pre: preAnalysis?.loudness.range, 
                            post: postAnalysis?.loudness.range,
                            unit: 'LU'
                        },
                        { 
                            label: 'Short-Term', 
                            pre: preAnalysis?.loudness.shortTermMax, 
                            post: postAnalysis?.loudness.shortTermMax,
                            unit: 'LUFS'
                        },
                        { 
                            label: 'Momentary', 
                            pre: preAnalysis?.loudness.momentaryMax, 
                            post: postAnalysis?.loudness.momentaryMax,
                            unit: 'LUFS'
                        },
                    ]}
                />

                {/* Dynamics Comparison */}
                <ComparisonCard 
                    title="Dynamics" 
                    icon={<Zap size={18} className="text-yellow-400" />}
                    stats={[
                        { 
                            label: 'True Peak', 
                            pre: preAnalysis?.dynamics.truePeak, 
                            post: postAnalysis?.dynamics.truePeak,
                            unit: 'dBTP',
                            inverseBad: true, // Higher > 0 is bad
                            threshold: -1.0
                        },
                        { 
                            label: 'RMS', 
                            pre: preAnalysis?.dynamics.rms, 
                            post: postAnalysis?.dynamics.rms,
                            unit: 'dB'
                        },
                        { 
                            label: 'Crest Factor', 
                            pre: preAnalysis?.dynamics.crestFactor, 
                            post: postAnalysis?.dynamics.crestFactor,
                            unit: 'dB'
                        },
                    ]}
                />

                {/* Stereo Comparison */}
                <ComparisonCard 
                    title="Stereo Image" 
                    icon={<Layers size={18} className="text-blue-400" />}
                    stats={[
                        { 
                            label: 'Correlation', 
                            pre: preAnalysis?.stereo.correlation, 
                            post: postAnalysis?.stereo.correlation,
                            unit: '',
                            threshold: 0
                        },
                        { 
                            label: 'Width', 
                            pre: preAnalysis?.stereo.width ? preAnalysis.stereo.width * 100 : undefined, 
                            post: postAnalysis?.stereo.width ? postAnalysis.stereo.width * 100 : undefined,
                            unit: '%'
                        },
                        { 
                            label: 'Balance', 
                            pre: preAnalysis?.stereo.balance, 
                            post: postAnalysis?.stereo.balance,
                            unit: ''
                        },
                    ]}
                />

                {/* Spectral Comparison */}
                <ComparisonCard 
                    title="Spectral Balance" 
                    icon={<Activity size={18} className="text-green-400" />}
                    stats={[
                        { 
                            label: 'Low', 
                            pre: preAnalysis?.spectral.low ? preAnalysis.spectral.low * 100 : undefined, 
                            post: postAnalysis?.spectral.low ? postAnalysis.spectral.low * 100 : undefined,
                            unit: '%' 
                        },
                        { 
                            label: 'Mid', 
                            pre: preAnalysis?.spectral.mid ? preAnalysis.spectral.mid * 100 : undefined, 
                            post: postAnalysis?.spectral.mid ? postAnalysis.spectral.mid * 100 : undefined,
                            unit: '%' 
                        },
                        { 
                            label: 'High', 
                            pre: preAnalysis?.spectral.high ? preAnalysis.spectral.high * 100 : undefined, 
                            post: postAnalysis?.spectral.high ? postAnalysis.spectral.high * 100 : undefined,
                            unit: '%' 
                        },
                    ]}
                />
            </div>

            {/* Visual Comparison Bars */}
            {postAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                            <span>Spectral Shift</span>
                            <span className="text-xs normal-case text-slate-600">Pre vs Post</span>
                        </h3>
                        
                        <div className="space-y-2">
                             {/* Pre Bar */}
                             {preAnalysis && (
                                <div className="h-4 flex rounded-full overflow-hidden w-full bg-slate-950 border border-slate-800 opacity-50">
                                    <div className="bg-red-500/80 h-full" style={{ width: `${preAnalysis.spectral.low * 100}%` }} title="Pre Low" />
                                    <div className="bg-green-500/80 h-full" style={{ width: `${preAnalysis.spectral.mid * 100}%` }} title="Pre Mid" />
                                    <div className="bg-blue-500/80 h-full" style={{ width: `${preAnalysis.spectral.high * 100}%` }} title="Pre High" />
                                </div>
                             )}
                             {/* Post Bar */}
                             <div className="h-6 flex rounded-full overflow-hidden w-full bg-slate-950 border border-slate-700 shadow-lg">
                                <div className="bg-red-500 h-full flex items-center justify-center text-[10px] font-bold text-white" style={{ width: `${postAnalysis.spectral.low * 100}%` }}>L</div>
                                <div className="bg-green-500 h-full flex items-center justify-center text-[10px] font-bold text-white" style={{ width: `${postAnalysis.spectral.mid * 100}%` }}>M</div>
                                <div className="bg-blue-500 h-full flex items-center justify-center text-[10px] font-bold text-white" style={{ width: `${postAnalysis.spectral.high * 100}%` }}>H</div>
                             </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-4">
                         <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                            <span>Stereo Width</span>
                            <span className="text-xs normal-case text-slate-600">Expansion/Contraction</span>
                        </h3>
                        
                        <div className="space-y-6 pt-2">
                            {/* Width Comparison */}
                            <div className="relative h-4 bg-slate-800 rounded-full">
                                {/* Pre Marker */}
                                {preAnalysis && (
                                    <div 
                                        className="absolute top-[-4px] bottom-[-4px] w-1 bg-slate-500 z-10 rounded-full"
                                        style={{ left: `${preAnalysis.stereo.width * 100}%` }}
                                        title={`Pre Width: ${(preAnalysis.stereo.width * 100).toFixed(0)}%`}
                                    />
                                )}
                                {/* Post Bar */}
                                <div 
                                    className="absolute top-0 bottom-0 left-0 bg-blue-600/50 rounded-l-full transition-all duration-500"
                                    style={{ width: `${postAnalysis.stereo.width * 100}%` }}
                                />
                                <div 
                                    className="absolute top-[-6px] bottom-[-6px] w-1.5 bg-blue-400 z-20 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                    style={{ left: `${postAnalysis.stereo.width * 100}%` }}
                                    title={`Post Width: ${(postAnalysis.stereo.width * 100).toFixed(0)}%`}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                                <span>Mono (0%)</span>
                                <span>Wide (100%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface StatRow {
    label: string;
    pre?: number;
    post?: number;
    unit: string;
    threshold?: number;
    inverseBad?: boolean;
}

const ComparisonCard: React.FC<{ title: string, icon: React.ReactNode, stats: StatRow[] }> = ({ title, icon, stats }) => (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-800/50 pb-2">
            {icon}
            <h3 className="font-bold text-slate-300 text-sm">{title}</h3>
        </div>
        <div className="space-y-3">
            {stats.map((stat, i) => {
                const diff = (stat.post !== undefined && stat.pre !== undefined) ? stat.post - stat.pre : 0;
                const hasChange = Math.abs(diff) > 0.01;
                const isBad = stat.threshold !== undefined && stat.post !== undefined && (stat.inverseBad ? stat.post > stat.threshold : stat.post < stat.threshold);
                
                // Color for Post Value
                let postColor = "text-slate-200";
                if (isBad) postColor = "text-red-400 font-bold";
                else if (hasChange) postColor = "text-blue-300 font-bold";

                return (
                    <div key={i} className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
                            <div className="flex items-center gap-2">
                                {/* Pre Value (Small) */}
                                {stat.pre !== undefined && hasChange && (
                                    <span className="text-[10px] text-slate-600 font-mono line-through decoration-slate-700">
                                        {stat.pre.toFixed(stat.unit === '%' ? 0 : 2)}{stat.unit && <span className="text-[9px] opacity-50">{stat.unit}</span>}
                                    </span>
                                )}
                                {/* Post Value (Main) */}
                                <span className={clsx("text-sm font-mono", postColor)}>
                                    {stat.post?.toFixed(stat.unit === '%' ? 0 : 2) ?? '-'}<span className="text-[10px] opacity-50 ml-0.5">{stat.unit}</span>
                                </span>
                            </div>
                        </div>
                        
                        {/* Delta Indicator */}
                        {hasChange && (
                            <div className="flex justify-end items-center gap-1 text-[10px]">
                                {diff > 0 ? (
                                    <span className="text-emerald-500 flex items-center">
                                        <ArrowUp size={8} /> {Math.abs(diff).toFixed(2)}
                                    </span>
                                ) : (
                                    <span className="text-amber-500 flex items-center">
                                        <ArrowDown size={8} /> {Math.abs(diff).toFixed(2)}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
);