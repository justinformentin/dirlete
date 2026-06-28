import { ChevronLeft, ChevronRight, FastForward, Pause, Play, Rewind, X } from 'lucide-react';
import { RefObject } from 'react';
import Button from '../../ui/Button';
import { VideoAction, VideoItem } from '../../types/ipc';
import { formatBytes } from '../../utils/formatBytes';
import VideoActionButtons from './VideoActionButtons';
import VideoKeyboardHint from './VideoKeyboardHint';

interface VideoModalProps {
  index: number | null;
  video: VideoItem | null;
  filename: string;
  src: string;
  action: VideoAction | null;
  totalVideos: number;
  isPlaying: boolean;
  videoRef: RefObject<HTMLVideoElement>;
  onClose: () => void;
  onIndexChange: (index: number | null | ((index: number | null) => number | null)) => void;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onLoadedMetadata: () => void;
  onAction: (action: VideoAction | null) => void;
}

const actionStyles: Record<VideoAction, { ring: string; badge: string }> = {
  keep: { ring: 'ring-4 ring-green-500', badge: 'bg-green-500' },
  delete: { ring: 'ring-4 ring-red-500', badge: 'bg-red-500' },
  skip: { ring: 'ring-4 ring-gray-400', badge: 'bg-gray-500' },
};

export default function VideoModal({ index, video, filename, src, action, totalVideos, isPlaying, videoRef, onClose, onIndexChange, onTogglePlay, onSeek, onLoadedMetadata, onAction }: VideoModalProps) {
  if (index === null || !video) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <Button
        variant="unstyled"
        className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30"
        onClick={(event) => { event.stopPropagation(); onIndexChange((current) => (current !== null ? Math.max(current - 1, 0) : null)); }}
        disabled={index === 0}
        title="Previous (←)"
      >
        <ChevronLeft className="w-6 h-6" />
      </Button>

      <div
        className={[
          'relative flex flex-col w-full max-w-4xl mx-16 rounded-2xl overflow-hidden shadow-2xl',
          action ? actionStyles[action].ring : 'ring-1 ring-white/10',
        ].join(' ')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-900 text-white">
          <div className="flex items-center gap-2 min-w-0">
            {action && <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide text-white ${actionStyles[action].badge}`}>{action}</span>}
            <p className="text-sm font-medium truncate" title={video.path}>{filename}</p>
            {video.sizeBytes != null && <span className="text-xs text-gray-400 shrink-0">{formatBytes(video.sizeBytes)}</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0 text-xs text-gray-400">
            <span>{index + 1} / {totalVideos}</span>
            <Button variant="unstyled" className="p-1.5 rounded hover:bg-white/10" onClick={onClose} title="Close (Esc)">
              <X className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>

        <div className="bg-black">
          <video key={src} ref={videoRef} src={src} className="w-full max-h-[65vh] object-contain" muted loop playsInline controls onLoadedMetadata={onLoadedMetadata} />
        </div>

        <div className="bg-gray-900 px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-center gap-3">
            <Button variant="unstyled" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm" onClick={() => onSeek(-5)} title="Back 5s ([)">
              <div className="flex items-center gap-1"><Rewind className="w-4 h-4 self-center" /><span>5s</span></div>
            </Button>
            <Button variant="unstyled" className="px-6 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-semibold" onClick={onTogglePlay} title="Play / Pause">
              {isPlaying
                ? <div className="flex items-center gap-1"><Pause className="w-4 h-4 self-center" /><span>Pause</span></div>
                : <div className="flex items-center gap-1"><Play className="w-4 h-4 self-center" /><span>Play</span></div>}
            </Button>
            <Button variant="unstyled" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm" onClick={() => onSeek(5)} title="Forward 5s (])">
              <div className="flex items-center gap-1"><span>5s</span><FastForward className="w-4 h-4 self-center" /></div>
            </Button>
          </div>

          <VideoActionButtons action={action} onAction={onAction} includeSkip />
          <VideoKeyboardHint modal className="text-center text-xs text-gray-500" kbdClassName="bg-gray-700 px-1 rounded" />
        </div>
      </div>

      <Button
        variant="unstyled"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30"
        onClick={(event) => { event.stopPropagation(); onIndexChange((current) => (current !== null ? Math.min(current + 1, totalVideos - 1) : null)); }}
        disabled={index === totalVideos - 1}
        title="Next (→)"
      >
        <ChevronRight className="w-6 h-6" />
      </Button>
    </div>
  );
}
