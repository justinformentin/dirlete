import { forwardRef, useEffect, useRef, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { VideoAction } from '../types/ipc';
import { formatBytes } from '../utils/formatBytes';
import { Maximize2, Film } from 'lucide-react';

interface VideoCardProps {
  path: string;
  sizeBytes: number | null;
  action: VideoAction | null;
  isFocused: boolean;
  onFocus: () => void;
  onAction: (action: VideoAction | null) => void;
  onExpand: () => void;
  onDurationLoaded?: (seconds: number) => void;
  durationSeconds?: number;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const VideoCard = forwardRef<HTMLVideoElement, VideoCardProps>(
  ({ path, sizeBytes, action, isFocused, onFocus, onAction, onExpand, onDurationLoaded, durationSeconds }, ref) => {
    const filename = path.split(/[\\/]/).pop() ?? path;
    const src = convertFileSrc(path);

    const containerRef = useRef<HTMLDivElement>(null);
    const [isNearViewport, setIsNearViewport] = useState(false);

    // Only render the <video> element once the card scrolls near the viewport.
    // This prevents dozens of concurrent metadata loads from freezing the UI.
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsNearViewport(true);
            observer.disconnect();
          }
        },
        { rootMargin: '400px' } // start loading 400px before entering view
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const d = e.currentTarget.duration;
      if (isFinite(d) && d > 0) {
        onDurationLoaded?.(d);
      }
    };

    const actionStyles: Record<VideoAction, string> = {
      keep: 'ring-4 ring-green-500',
      delete: 'ring-4 ring-red-500',
      skip: 'ring-4 ring-gray-400',
    };

    const cardClass = [
      'rounded-xl overflow-hidden bg-gray-900 flex flex-col cursor-pointer transition-all duration-150',
      isFocused ? 'ring-2 ring-sky-400 ring-offset-2' : '',
      action ? actionStyles[action] : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={containerRef} className={cardClass} onClick={onFocus} tabIndex={0} onFocus={onFocus}>
        {/* Video / placeholder */}
        <div className="relative bg-black aspect-video group">
          {isNearViewport ? (
            <video
              ref={ref}
              src={src}
              className="w-full h-full object-contain"
              muted
              loop
              playsInline
              preload="metadata"
              onLoadedMetadata={handleLoadedMetadata}
            />
          ) : (
            // Skeleton placeholder — no video element until near viewport
            <div className="w-full h-full flex items-center justify-center text-gray-600">
              <Film className="w-8 h-8 opacity-40" />
            </div>
          )}

          {/* Expand button — visible on hover */}
          <button
            className="absolute top-2 left-2 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-black/70"
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            title="Expand"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Action badge overlay */}
          {action && (
            <div
              className={[
                'absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide',
                action === 'keep' && 'bg-green-500 text-white',
                action === 'delete' && 'bg-red-500 text-white',
                action === 'skip' && 'bg-gray-500 text-white',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {action}
            </div>
          )}
        </div>

        {/* Info + actions */}
        <div className="p-3 flex flex-col gap-2 bg-white">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-gray-800 truncate flex-1" title={path}>
              {filename}
            </p>
            <div className="flex items-center gap-2 shrink-0 text-xs text-gray-500">
              {durationSeconds != null && <span>{formatDuration(durationSeconds)}</span>}
              {sizeBytes != null && <span>{formatBytes(sizeBytes)}</span>}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              className={[
                'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                action === 'keep'
                  ? 'bg-green-500 text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200',
              ].join(' ')}
              onClick={(e) => {
                e.stopPropagation();
                onAction(action === 'keep' ? null : 'keep');
              }}
              title="Keep (K)"
            >
              Keep
            </button>
            <button
              className={[
                'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                action === 'delete'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-100 text-red-600 hover:bg-red-200',
              ].join(' ')}
              onClick={(e) => {
                e.stopPropagation();
                onAction(action === 'delete' ? null : 'delete');
              }}
              title="Delete (D)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }
);

VideoCard.displayName = 'VideoCard';

export default VideoCard;
