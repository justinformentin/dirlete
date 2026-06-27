import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'lightDanger' | 'warning' | 'unstyled';
type ButtonSize = 'xs' | 'sm' | 'md' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-purple-600 hover:bg-purple-500 text-white',
  secondary: 'bg-btn hover:bg-btn-hover text-btn-text',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  ghost: 'text-muted hover:text-foreground hover:bg-surface',
  lightDanger: 'bg-white text-red-600 hover:bg-red-50',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  unstyled: '',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-3 py-1.5 text-xs rounded-md',
  sm: 'px-3 py-2 text-xs rounded-md',
  md: 'px-5 py-2.5 text-sm rounded-lg',
  icon: 'p-2 rounded-lg',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
