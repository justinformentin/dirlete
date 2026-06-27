import Button from '../../ui/Button';
import { formatBytes } from '../../utils/formatBytes';

interface FloatingDeleteBarProps {
  count: number;
  sizeBytes: number;
  isDeleting: boolean;
  isScanning: boolean;
  onDelete: () => void;
}

export default function FloatingDeleteBar({ count, sizeBytes, isDeleting, isScanning, onDelete }: FloatingDeleteBarProps) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-6 py-3 bg-red-600 text-white rounded-2xl shadow-2xl">
      <span className="text-sm font-medium">{formatBytes(sizeBytes)} selected</span>
      <Button variant="lightDanger" className="px-5 py-2 rounded-lg font-semibold text-sm" onClick={onDelete} disabled={isDeleting || isScanning}>
        {isDeleting ? 'Deleting…' : `Delete ${count} Video${count !== 1 ? 's' : ''}`}
      </Button>
    </div>
  );
}
