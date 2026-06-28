import { InputHTMLAttributes, ReactNode } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  labelClassName?: string;
}

export default function Checkbox({ label, className = '', labelClassName = '', ...props }: CheckboxProps) {
  const input = (
    <input
      type="checkbox"
      className={`cursor-pointer disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );

  if (!label) return input;

  return (
    <label className={`flex items-center gap-2 cursor-pointer select-none ${labelClassName}`}>
      {input}
      {label}
    </label>
  );
}
