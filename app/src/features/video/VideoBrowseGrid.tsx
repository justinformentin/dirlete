import VideoCard from '../../components/VideoCard';
import { VideoAction, VideoDisplayItem } from '../../types/ipc';
import VideoKeyboardHint from './VideoKeyboardHint';

interface VideoBrowseGridProps {
  videos: VideoDisplayItem[];
  focusedIndex: number | null;
  cardSize: number;
  groupByFolder: boolean;
  videoRefs: React.MutableRefObject<(HTMLVideoElement | null)[]>;
  onFocus: (index: number) => void;
  onAction: (index: number, action: VideoAction | null) => void;
  onExpand: (index: number) => void;
  onDurationLoaded: (index: number, seconds: number) => void;
}

function getMinCardWidth(cardSize: number): number {
  return Math.round(150 + (cardSize / 100) * 230);
}

function getFolder(path: string): string {
  return path.replace(/[\\/][^\\/]*$/, '');
}

export default function VideoBrowseGrid({
  videos, focusedIndex, cardSize, groupByFolder,
  videoRefs, onFocus, onAction, onExpand, onDurationLoaded,
}: VideoBrowseGridProps) {
  if (videos.length === 0) return null;

  const minCardWidth = getMinCardWidth(cardSize);
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gap: '1rem',
    gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
  };

  const renderCard = (video: VideoDisplayItem) => (
    <VideoCard
      key={video.path}
      ref={(element) => { videoRefs.current[video.globalIndex] = element; }}
      path={video.path}
      sizeBytes={video.sizeBytes}
      action={video.action}
      durationSeconds={video.durationSeconds}
      isFocused={focusedIndex === video.globalIndex}
      onFocus={() => onFocus(video.globalIndex)}
      onAction={(action) => onAction(video.globalIndex, action)}
      onExpand={() => onExpand(video.globalIndex)}
      onDurationLoaded={(seconds) => onDurationLoaded(video.globalIndex, seconds)}
    />
  );

  if (groupByFolder) {
    // Group videos by parent folder, preserving sort order
    const groups: Array<{ folder: string; items: VideoDisplayItem[] }> = [];
    for (const video of videos) {
      const folder = getFolder(video.path);
      const last = groups[groups.length - 1];
      if (last && last.folder === folder) {
        last.items.push(video);
      } else {
        groups.push({ folder, items: [video] });
      }
    }

    return (
      <div className="bg-card p-4 rounded-xl">
        <VideoKeyboardHint />
        <div className="space-y-6">
          {groups.map(({ folder, items }) => (
            <div key={folder}>
              <p className="text-xs text-muted font-mono truncate mb-3 flex items-center gap-1.5" title={folder}>
                <span className="text-subtle">📁</span>
                {folder}
              </p>
              <div style={gridStyle}>
                {items.map(renderCard)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card p-4 rounded-xl">
      <VideoKeyboardHint />
      <div style={gridStyle}>
        {videos.map(renderCard)}
      </div>
    </div>
  );
}
