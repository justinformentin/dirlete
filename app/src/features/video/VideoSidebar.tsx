import Button from '../../ui/Button';
import SidebarSection from '../../ui/SidebarSection';

interface VideoSidebarProps {
  root: string;
  total: number;
  unmarkedCount: number;
  keepCount: number;
  skipCount: number;
  deleteCount: number;
  isScanning: boolean;
  isDeleting: boolean;
  onPickFolder: () => void;
  onScan: () => void;
}

function Stat({ label, value, className = 'text-foreground' }: { label: string; value: number; className?: string }) {
  return (
    <div className="text-center bg-surface rounded-lg py-2">
      <p className={`text-base font-semibold ${className}`}>{value}</p>
      <p className="text-[10px] text-subtle uppercase tracking-wide">{label}</p>
    </div>
  );
}

export default function VideoSidebar({ root, total, unmarkedCount, keepCount, skipCount, deleteCount, isScanning, isDeleting, onPickFolder, onScan }: VideoSidebarProps) {
  return (
    <div className="p-4 space-y-5 text-sm">
      <SidebarSection title="Current Folder" withDivider={false}>
        <p className="text-xs text-muted font-mono truncate mb-2.5 leading-relaxed" title={root}>{root || 'None selected'}</p>
        <div className="flex gap-2">
          <Button onClick={onPickFolder} disabled={isScanning || isDeleting} size="xs" className="flex-1">Change</Button>
          <Button onClick={onScan} disabled={isScanning || isDeleting || !root} size="xs" className="flex-1">{isScanning ? 'Scanning…' : 'Rescan'}</Button>
        </div>
      </SidebarSection>

      {total > 0 && (
        <SidebarSection title="Status">
          <div className="text-center mb-3">
            <p className="text-3xl font-bold text-foreground">{total}</p>
            <p className="text-[10px] text-subtle uppercase tracking-wider">All</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Pending" value={unmarkedCount} />
            <Stat label="Keep" value={keepCount} className="text-green-400" />
            <Stat label="Skipped" value={skipCount} className="text-muted" />
            <Stat label="Delete" value={deleteCount} className="text-red-400" />
          </div>
        </SidebarSection>
      )}
    </div>
  );
}
