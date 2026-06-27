export type VideoTab = 'browse' | 'multiwatch';

interface VideoTabsProps {
  activeTab: VideoTab;
  count: number;
  onChange: (tab: VideoTab) => void;
}

export default function VideoTabs({ activeTab, count, onChange }: VideoTabsProps) {
  if (count === 0) return null;
  const tabClass = (tab: VideoTab) => [
    'px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors',
    activeTab === tab ? 'bg-card text-foreground border border-b-card border-border -mb-px' : 'text-subtle hover:text-muted',
  ].join(' ');

  return (
    <div className="mb-4 flex gap-1 border-b border-border">
      <button className={tabClass('browse')} onClick={() => onChange('browse')}>Browse ({count})</button>
      <button className={tabClass('multiwatch')} onClick={() => onChange('multiwatch')}>Multi-Watch</button>
    </div>
  );
}
