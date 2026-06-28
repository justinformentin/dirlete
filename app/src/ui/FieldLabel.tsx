import { LabelHTMLAttributes, ReactNode } from 'react';

interface FieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
}

export default function FieldLabel({ className = '', children, ...props }: FieldLabelProps) {
  return (
    <label
      className={[
        'block mb-2 text-sm font-semibold text-foreground',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </label>
  );
}
