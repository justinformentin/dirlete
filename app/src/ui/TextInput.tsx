import { InputHTMLAttributes } from 'react';

export default function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={[
        'px-2 py-1.5 text-sm bg-surface text-foreground placeholder:text-subtle focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
