import React, { useCallback, useRef, useState } from 'react';

interface DualRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatLabel?: (value: number) => string;
  step?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snapToStep(value: number, min: number, step: number) {
  if (step <= 0) return value;
  return min + Math.round((value - min) / step) * step;
}

export default function DualRangeSlider({ min, max, value, onChange, formatLabel, step = 1 }: DualRangeSliderProps) {
  const [dragging, setDragging] = useState<'low' | 'high' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [low, high] = value;
  const safeMax = max > min ? max : min + 1;
  const range = safeMax - min;
  const lowPct = ((low - min) / range) * 100;
  const highPct = ((high - min) / range) * 100;

  const valueFromClientX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return min;
    const pct = clamp((clientX - rect.left) / rect.width, 0, 1);
    if (pct <= 0.001) return min;
    if (pct >= 0.999) return safeMax;
    return clamp(snapToStep(min + pct * range, min, step), min, safeMax);
  }, [min, range, safeMax, step]);

  const updateThumb = useCallback((thumb: 'low' | 'high', clientX: number) => {
    const nextValue = valueFromClientX(clientX);
    if (thumb === 'low') onChange([Math.min(nextValue, high), high]);
    else onChange([low, Math.max(nextValue, low)]);
  }, [high, low, onChange, valueFromClientX]);

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const nextValue = valueFromClientX(event.clientX);
    const lowDistance = Math.abs(nextValue - low);
    const highDistance = Math.abs(nextValue - high);
    const thumb = lowDistance <= highDistance ? 'low' : 'high';
    setDragging(thumb);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateThumb(thumb, event.clientX);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updateThumb(dragging, event.clientX);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(null);
  };

  const thumbStyle = (pct: number, active: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: '50%',
    left: `${pct}%`,
    transform: 'translate(-50%, -50%)',
    width: 13,
    height: 13,
    borderRadius: '50%',
    backgroundColor: 'var(--theme-primary)',
    pointerEvents: 'none',
    boxShadow: active ? '0 0 0 4px rgba(168,85,247,0.2), 0 1px 4px rgba(0,0,0,0.5)' : '0 1px 4px rgba(0,0,0,0.5)',
  });

  return (
    <div>
      <div
        ref={trackRef}
        className="relative h-5 cursor-pointer select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: '100%', height: 3, borderRadius: 9999, backgroundColor: 'var(--surface)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: `${lowPct}%`, right: `${100 - highPct}%`, height: 3, borderRadius: 9999, backgroundColor: 'var(--theme-primary)', pointerEvents: 'none' }} />
        <div style={thumbStyle(lowPct, dragging === 'low')} />
        <div style={thumbStyle(highPct, dragging === 'high')} />
      </div>
      <div className="flex justify-between text-[10px] text-muted mt-1">
        <span>{formatLabel ? formatLabel(low) : low}</span>
        <span>{formatLabel ? formatLabel(high) : high}</span>
      </div>
    </div>
  );
}
