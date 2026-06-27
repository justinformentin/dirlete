import { MutableRefObject, RefObject, useEffect } from 'react';
import { VideoAction, VideoDisplayItem, VideoItem } from '../../types/ipc';
import { VideoTab } from './VideoTabs';

interface UseVideoKeyboardShortcutsArgs {
  activeTab: VideoTab;
  videos: VideoItem[];
  displayVideos: VideoDisplayItem[];
  focusedIndex: number | null;
  modalIndex: number | null;
  videoRefs: MutableRefObject<(HTMLVideoElement | null)[]>;
  multiWatchRefs: MutableRefObject<(HTMLVideoElement | null)[]>;
  modalVideoRef: RefObject<HTMLVideoElement>;
  onFocusIndexChange: (index: number | null | ((index: number | null) => number | null)) => void;
  onModalIndexChange: (index: number | null | ((index: number | null) => number | null)) => void;
  onModalPlayingChange: (isPlaying: boolean) => void;
  onMultiWatchPlayingChange: (isPlaying: boolean) => void;
  onApplyAction: (index: number, action: VideoAction | null) => void;
}

const isTextInputTarget = (target: EventTarget | null) => (
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
);

const toggleVideoPlayback = (video: HTMLVideoElement | null | undefined) => {
  if (!video) return;
  if (video.paused) video.play().catch(() => {});
  else video.pause();
};

const seekVideo = (video: HTMLVideoElement | null | undefined, seconds: number) => {
  if (video) video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
};

export function useVideoKeyboardShortcuts({
  activeTab,
  videos,
  displayVideos,
  focusedIndex,
  modalIndex,
  videoRefs,
  multiWatchRefs,
  modalVideoRef,
  onFocusIndexChange,
  onModalIndexChange,
  onModalPlayingChange,
  onMultiWatchPlayingChange,
  onApplyAction,
}: UseVideoKeyboardShortcutsArgs) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target)) return;

      if (modalIndex !== null) {
        if (event.key === 'Escape') {
          onModalIndexChange(null);
          onModalPlayingChange(false);
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          onModalIndexChange((index) => (index !== null ? Math.min(index + 1, videos.length - 1) : null));
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          onModalIndexChange((index) => (index !== null ? Math.max(index - 1, 0) : null));
        } else if (event.key === 'k' || event.key === 'K') {
          onApplyAction(modalIndex, videos[modalIndex]?.action === 'keep' ? null : 'keep');
        } else if (event.key === 'd' || event.key === 'D') {
          onApplyAction(modalIndex, videos[modalIndex]?.action === 'delete' ? null : 'delete');
        } else if (event.key === 's' || event.key === 'S') {
          onApplyAction(modalIndex, videos[modalIndex]?.action === 'skip' ? null : 'skip');
        } else if (event.key === '[') {
          seekVideo(modalVideoRef.current, -5);
        } else if (event.key === ']') {
          seekVideo(modalVideoRef.current, 5);
        } else if (event.key === ' ') {
          event.preventDefault();
          const video = modalVideoRef.current;
          if (video) {
            if (video.paused) { video.play().catch(() => {}); onModalPlayingChange(true); }
            else { video.pause(); onModalPlayingChange(false); }
          }
        }
        return;
      }

      if (activeTab === 'multiwatch') {
        if (event.key === ' ') {
          event.preventDefault();
          const anyPlaying = multiWatchRefs.current.some((video) => video && !video.paused);
          multiWatchRefs.current.forEach((video) => { if (anyPlaying) video?.pause(); else video?.play().catch(() => {}); });
          onMultiWatchPlayingChange(!anyPlaying);
        }
        return;
      }

      if (activeTab !== 'browse') return;

      const navVideos = displayVideos.length > 0 ? displayVideos : videos.map((v, i) => ({ ...v, globalIndex: i }));

      if (focusedIndex === null) {
        if ((event.key === 'ArrowRight' || event.key === 'ArrowDown') && navVideos.length > 0) {
          onFocusIndexChange(navVideos[0].globalIndex);
        }
        return;
      }

      if (event.key === 'k' || event.key === 'K') {
        onApplyAction(focusedIndex, videos[focusedIndex]?.action === 'keep' ? null : 'keep');
      } else if (event.key === 'd' || event.key === 'D') {
        onApplyAction(focusedIndex, videos[focusedIndex]?.action === 'delete' ? null : 'delete');
      } else if (event.key === 's' || event.key === 'S') {
        onApplyAction(focusedIndex, videos[focusedIndex]?.action === 'skip' ? null : 'skip');
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        const curPos = navVideos.findIndex((v) => v.globalIndex === focusedIndex);
        if (curPos >= 0) {
          const next = navVideos[Math.min(curPos + 1, navVideos.length - 1)];
          if (next) onFocusIndexChange(next.globalIndex);
        } else if (navVideos.length > 0) {
          onFocusIndexChange(navVideos[0].globalIndex);
        }
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        const curPos = navVideos.findIndex((v) => v.globalIndex === focusedIndex);
        if (curPos > 0) {
          const prev = navVideos[curPos - 1];
          if (prev) onFocusIndexChange(prev.globalIndex);
        }
      } else if (event.key === '[') {
        seekVideo(videoRefs.current[focusedIndex], -5);
      } else if (event.key === ']') {
        seekVideo(videoRefs.current[focusedIndex], 5);
      } else if (event.key === ' ') {
        event.preventDefault();
        toggleVideoPlayback(videoRefs.current[focusedIndex]);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeTab, displayVideos, focusedIndex, modalIndex, modalVideoRef, multiWatchRefs, onApplyAction, onFocusIndexChange, onModalIndexChange, onModalPlayingChange, onMultiWatchPlayingChange, videoRefs, videos]);
}
