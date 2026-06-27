import React from 'react';

interface DualRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatLabel?: (value: number) => string;
  step?: number;
}

export default function DualRangeSlider({ min, max, value, onChange, formatLabel, step = 1 }: DualRangeSliderProps) {
  const [low, high] = value;
  const safeMax = max > min ? max : min + 1;
  const range = safeMax - min;
  const lowPct = ((low - min) / range) * 100;
  const highPct = ((high - min) / range) * 100;

  const absStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    opacity: 0,
    cursor: 'pointer',
    margin: 0,
    padding: 0,
  };

  return (
    <div>
      <div className="relative h-5" style={{ touchAction: 'none' }}>
        {/* Background track */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '100%',
            height: 3,
            borderRadius: 9999,
            backgroundColor: 'var(--surface)',
            pointerEvents: 'none',
          }}
        />
        {/* Active fill */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            left: `${lowPct}%`,
            right: `${100 - highPct}%`,
            height: 3,
            borderRadius: 9999,
            backgroundColor: 'var(--theme-primary)',
            pointerEvents: 'none',
          }}
        />
        {/* Low thumb visual */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${lowPct}%`,
            transform: 'translate(-50%, -50%)',
            width: 13,
            height: 13,
            borderRadius: '50%',
            backgroundColor: 'var(--theme-primary)',
            pointerEvents: 'none',
            boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
          }}
        />
        {/* High thumb visual */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${highPct}%`,
            transform: 'translate(-50%, -50%)',
            width: 13,
            height: 13,
            borderRadius: '50%',
            backgroundColor: 'var(--theme-primary)',
            pointerEvents: 'none',
            boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
          }}
        />
        {/* Low range input (invisible, handles events) */}
        <input
          type="range"
          min={min}
          max={safeMax}
          step={step}
          value={low}
          onChange={(e) => onChange([Math.min(Number(e.target.value), high), high])}
          style={{ ...absStyle, zIndex: low > (min + safeMax) / 2 ? 5 : 3 }}
        />
        {/* High range input (invisible, handles events) */}
        <input
          type="range"
          min={min}
          max={safeMax}
          step={step}
          value={high}
          onChange={(e) => onChange([low, Math.max(Number(e.target.value), low)])}
          style={{ ...absStyle, zIndex: high < (min + safeMax) / 2 ? 5 : 3 }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted mt-1">
        <span>{formatLabel ? formatLabel(low) : low}</span>
        <span>{formatLabel ? formatLabel(high) : high}</span>
      </div>
    </div>
  );
}
