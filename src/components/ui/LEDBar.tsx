import React, { useRef, useEffect } from 'react';
import { clsx } from 'clsx';

interface LEDBarProps {
  value: number; // dB or other unit
  min?: number;
  max?: number;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  width?: number;
  height?: number;
}

export const LEDBar: React.FC<LEDBarProps> = ({
  value,
  min = -60,
  max = 0,
  orientation = 'vertical',
  className,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const valueRef = useRef(value);
  const displayValueRef = useRef(min);
  const lastTimeRef = useRef(performance.now());
  const requestRef = useRef<number>();

  useEffect(() => {
      valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = width || (orientation === 'vertical' ? 16 : 200);
    const h = height || (orientation === 'vertical' ? 200 : 16);
    canvas.width = w;
    canvas.height = h;

    const animate = (time: number) => {
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // Ballistics
      let current = displayValueRef.current;
      const target = valueRef.current;

      if (target > current) {
          current = target;
      } else {
          const decayRate = (max - min) * 1.5; // Decay 1.5x range per second
          current -= decayRate * dt;
      }

      if (current < min) current = min;
      displayValueRef.current = current;

      // Draw
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      const range = max - min;
      const norm = (Math.max(current, min) - min) / range;
      const clampedNorm = Math.min(Math.max(norm, 0), 1);

      let grad;
      if (orientation === 'vertical') {
          grad = ctx.createLinearGradient(0, h, 0, 0);
      } else {
          grad = ctx.createLinearGradient(0, 0, w, 0);
      }

      // Generic Pro Audio Colors (Green -> Yellow -> Red)
      grad.addColorStop(0, '#22c55e');
      grad.addColorStop(0.6, '#22c55e');
      grad.addColorStop(0.75, '#eab308');
      grad.addColorStop(0.9, '#ef4444');
      grad.addColorStop(1, '#ef4444');

      ctx.fillStyle = grad;

      if (orientation === 'vertical') {
          const fillH = clampedNorm * h;
          ctx.fillRect(0, h - fillH, w, fillH);

          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          // Draw ~10 ticks
          const steps = 10;
          for (let i = 1; i < steps; i++) {
              const y = h - (i / steps) * h;
              ctx.fillRect(0, y, w, 1);
          }
      } else {
          const fillW = clampedNorm * w;
          ctx.fillRect(0, 0, fillW, h);

          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          const steps = 10;
          for (let i = 1; i < steps; i++) {
              const x = (i / steps) * w;
              ctx.fillRect(x, 0, 1, h);
          }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [min, max, orientation, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={clsx("rounded border border-slate-700 shadow-inner bg-slate-950", className)}
    />
  );
};
