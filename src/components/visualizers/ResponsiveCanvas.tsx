import React, { useRef, useEffect } from 'react';

export interface CanvasDrawCallback {
    (ctx: CanvasRenderingContext2D, width: number, height: number): void;
}

interface ResponsiveCanvasPropsV2 {
    onMount: (canvas: HTMLCanvasElement) => void;
    className?: string;
    label?: string;
}

export const ResponsiveCanvas: React.FC<ResponsiveCanvasPropsV2> = ({ onMount, className, label }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!containerRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const container = containerRef.current;
        
        // Pass canvas up immediately
        onMount(canvas);

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                const { width, height } = entry.contentRect;
                const dpr = window.devicePixelRatio || 1;
                
                // Only update if changed to avoid flicker/loops
                if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
                    canvas.width = width * dpr;
                    canvas.height = height * dpr;
                    // Reset transform
                    const ctx = canvas.getContext('2d');
                    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                }
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [onMount]);

    return (
        <div ref={containerRef} className={`relative w-full h-full min-h-[100px] ${className || ''}`}>
             {label && (
                <span className="absolute top-2 left-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider z-10 pointer-events-none select-none mix-blend-difference">
                    {label}
                </span>
             )}
             <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%' }}
                className="block"
             />
        </div>
    );
};