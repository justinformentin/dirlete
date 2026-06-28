import Button, { ButtonProps } from './Button';

export default function IconButton({
  variant = 'unstyled',
  size = 'icon',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}
