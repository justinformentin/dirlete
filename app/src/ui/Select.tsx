import { SelectHTMLAttributes } from 'react';

export default function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={[
        'bg-surface text-foreground text-xs rounded-md px-2 py-1.5 border border-border cursor-pointer outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </select>
  );
}
