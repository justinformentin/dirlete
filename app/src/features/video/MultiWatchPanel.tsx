import { ChevronLeft, ChevronRight, FastForward, Pause, Play, Rewind } from 'lucide-react';
import VideoCard from '../../components/VideoCard';
import Button from '../../ui/Button';
import { VideoAction, VideoItem } from '../../types/ipc';
import { MULTIWATCH_PAGE_SIZE } from '../../hooks/useVideoCuller';

interface MultiWatchPanelProps {
  videos: VideoItem[];
  pageVideos: VideoItem[];
  page: number;
  totalPages: number;
  isPlaying: boolean;
  isDeleting: boolean;
  refs: React.MutableRefObject<(HTMLVideoElement | null)[]>;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onPageChange: (page: number) => void;
  onAction: (index: number, action: VideoAction | null) => void;
  onExpand: (index: number) => void;
  onDurationLoaded: (index: number, seconds: number) => void;
}

export default function MultiWatchPanel({ videos, pageVideos, page, totalPages, isPlaying, isDeleting, refs, onTogglePlay, onSeek, onPageChange, onAction, onExpand, onDurationLoaded }: MultiWatchPanelProps) {
  if (videos.length === 0) return null;

  return (
    <div className="bg-card p-4 rounded-xl">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Button variant={isPlaying ? 'warning' : 'secondary'} onClick={onTogglePlay} disabled={isDeleting} className="shadow">
          {isPlaying
            ? <div className="flex items-center gap-2"><Pause className="w-4 h-4" /><span>Pause All</span></div>
            : <div className="flex items-center gap-2"><Play className="w-4 h-4" /><span>Play All</span></div>}
        </Button>
        <Button onClick={() => onSeek(-5)} disabled={isDeleting} title="Seek all back 5 seconds" className="shadow">
          <div className="flex items-center gap-1"><Rewind className="w-4 h-4 self-center" /><span>5s</span></div>
        </Button>
        <Button onClick={() => onSeek(5)} disabled={isDeleting} title="Seek all forward 5 seconds" className="shadow">
          <div className="flex items-center gap-1"><span>5s</span><FastForward className="w-4 h-4 self-center" /></div>
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button size="icon" onClick={() => onPageChange(page - 1)} disabled={page === 0} title="Previous page">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm text-muted min-w-[6rem] text-center">Page {page + 1} of {totalPages}</span>
          <Button size="icon" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1} title="Next page">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div key={page} className="grid gap-3 grid-cols-3">
        {pageVideos.map((video, localIndex) => {
          const globalIndex = page * MULTIWATCH_PAGE_SIZE + localIndex;
          return (
            <VideoCard
              key={video.path}
              ref={(element) => { refs.current[localIndex] = element; }}
              path={video.path}
              sizeBytes={video.sizeBytes}
              action={video.action}
              durationSeconds={video.durationSeconds}
              isFocused={false}
              onFocus={() => {}}
              onAction={(action) => onAction(globalIndex, action)}
              onExpand={() => onExpand(globalIndex)}
              onDurationLoaded={(seconds) => onDurationLoaded(globalIndex, seconds)}
            />
          );
        })}
      </div>
    </div>
  );
}
