import VideoCard from '../../components/VideoCard';
import { VideoAction, VideoItem } from '../../types/ipc';
import VideoKeyboardHint from './VideoKeyboardHint';

interface VideoBrowseGridProps {
  videos: VideoItem[];
  focusedIndex: number | null;
  videoRefs: React.MutableRefObject<(HTMLVideoElement | null)[]>;
  onFocus: (index: number) => void;
  onAction: (index: number, action: VideoAction | null) => void;
  onExpand: (index: number) => void;
  onDurationLoaded: (index: number, seconds: number) => void;
}

export default function VideoBrowseGrid({ videos, focusedIndex, videoRefs, onFocus, onAction, onExpand, onDurationLoaded }: VideoBrowseGridProps) {
  if (videos.length === 0) return null;

  return (
    <div className="bg-card p-4 rounded-xl">
      <VideoKeyboardHint />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.map((video, index) => (
          <VideoCard
            key={video.path}
            ref={(element) => { videoRefs.current[index] = element; }}
            path={video.path}
            sizeBytes={video.sizeBytes}
            action={video.action}
            durationSeconds={video.durationSeconds}
            isFocused={focusedIndex === index}
            onFocus={() => onFocus(index)}
            onAction={(action) => onAction(index, action)}
            onExpand={() => onExpand(index)}
            onDurationLoaded={(seconds) => onDurationLoaded(index, seconds)}
          />
        ))}
      </div>
    </div>
  );
}
