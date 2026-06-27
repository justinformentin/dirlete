import { InputHTMLAttributes, ReactNode } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  labelClassName?: string;
}

export default function Checkbox({ label, className = '', labelClassName = '', ...props }: CheckboxProps) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer select-none ${labelClassName}`}>
      <input
        type="checkbox"
        className={`disabled:cursor-not-allowed ${className}`}
        {...props}
      />
      {label}
    </label>
  );
}
