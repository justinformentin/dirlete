export default function Spinner({ className = 'w-3 h-3' }: { className?: string }) {
  return <span className={`inline-block ${className} border-2 border-current border-t-transparent rounded-full animate-spin`} />;
}
