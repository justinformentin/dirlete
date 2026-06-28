import { InputHTMLAttributes } from 'react';

export default function RangeInput({ className = '', style, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <input
      type="range"
      style={{ accentColor: 'var(--theme-primary)', ...style }}
      className={[
        'cursor-pointer h-1 disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
