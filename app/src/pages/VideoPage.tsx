import { useEffect, useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { listen, Event } from '@tauri-apps/api/event';
import { confirm, message } from '@tauri-apps/plugin-dialog';
import { open } from '@tauri-apps/plugin-dialog';
import VideoCard from '../components/VideoCard';
import { formatBytes } from '../utils/formatBytes';
import EmptyState from '../ui/EmptyState';
import FloatingDeleteBar from '../features/video/FloatingDeleteBar';
import VideoSidebar from '../features/video/VideoSidebar';
import VideoTabs from '../features/video/VideoTabs';
import { loadSavedActions, persistActions } from '../features/video/videoActionsStorage';
import { VideoAction, VideoItem, VideoScanProgressEvent, VideoScanCompleteEvent } from '../types/ipc';
import { Rewind, FastForward, Play, Pause, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useSidebar } from '../SidebarContext';

const MULTIWATCH_PAGE_SIZE = 9;

export default function VideoPage() {
  const setSidebarContent = useSidebar();

  const [root, setRoot] = useState('');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeTab, setActiveTab] = useState<'browse' | 'multiwatch'>('browse');

  const [multiWatchPage, setMultiWatchPage] = useState(0);
  const [isMultiWatchPlaying, setIsMultiWatchPlaying] = useState(false);
  const multiWatchRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [modalIsPlaying, setModalIsPlaying] = useState(false);
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  const savedActions = useRef<Record<string, VideoAction>>(loadSavedActions());
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const pendingVideos = useRef<VideoItem[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPending = useCallback(() => {
    flushTimer.current = null;
    const batch = pendingVideos.current;
    if (batch.length === 0) return;
    pendingVideos.current = [];
    setVideos((prev) => {
      const existing = new Set(prev.map((v) => v.path));
      const newItems = batch.filter((v) => !existing.has(v.path));
      return newItems.length === 0 ? prev : [...prev, ...newItems];
    });
  }, []);

  // ── Scan event listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    listen<VideoScanProgressEvent>('video-scan-progress', (event: Event<VideoScanProgressEvent>) => {
      const { path, sizeBytes } = event.payload;
      pendingVideos.current.push({ path, sizeBytes, action: savedActions.current[path] ?? null });
      if (!flushTimer.current) {
        flushTimer.current = setTimeout(flushPending, 50);
      }
    }).then((u) => unsubs.push(u));

    listen<VideoScanCompleteEvent>('video-scan-complete', () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushPending();
      setIsScanning(false);
    }).then((u) => unsubs.push(u));

    return () => unsubs.forEach((u) => u());
  }, [flushPending]);

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (modalIndex !== null) {
        if (e.key === 'Escape') {
          setModalIndex(null); setModalIsPlaying(false);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setModalIndex((i) => (i !== null ? Math.min(i + 1, videos.length - 1) : null));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setModalIndex((i) => (i !== null ? Math.max(i - 1, 0) : null));
        } else if (e.key === 'k' || e.key === 'K') {
          applyAction(modalIndex, videos[modalIndex]?.action === 'keep' ? null : 'keep');
        } else if (e.key === 'd' || e.key === 'D') {
          applyAction(modalIndex, videos[modalIndex]?.action === 'delete' ? null : 'delete');
        } else if (e.key === 's' || e.key === 'S') {
          applyAction(modalIndex, videos[modalIndex]?.action === 'skip' ? null : 'skip');
        } else if (e.key === '[') {
          const el = modalVideoRef.current;
          if (el) el.currentTime = Math.max(0, el.currentTime - 5);
        } else if (e.key === ']') {
          const el = modalVideoRef.current;
          if (el) el.currentTime = Math.min(el.duration || 0, el.currentTime + 5);
        } else if (e.key === ' ') {
          e.preventDefault();
          const el = modalVideoRef.current;
          if (el) {
            if (el.paused) { el.play().catch(() => {}); setModalIsPlaying(true); }
            else { el.pause(); setModalIsPlaying(false); }
          }
        }
        return;
      }

      if (activeTab === 'multiwatch') {
        if (e.key === ' ') {
          e.preventDefault();
          const anyPlaying = multiWatchRefs.current.some((v) => v && !v.paused);
          if (anyPlaying) {
            multiWatchRefs.current.forEach((v) => v?.pause());
            setIsMultiWatchPlaying(false);
          } else {
            multiWatchRefs.current.forEach((v) => { if (v) v.play().catch(() => {}); });
            setIsMultiWatchPlaying(true);
          }
        }
        return;
      }

      if (activeTab !== 'browse') return;

      if (focusedIndex === null) {
        if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && videos.length > 0) {
          setFocusedIndex(0);
        }
        return;
      }

      const idx = focusedIndex;
      if (e.key === 'k' || e.key === 'K') {
        applyAction(idx, videos[idx]?.action === 'keep' ? null : 'keep');
      } else if (e.key === 'd' || e.key === 'D') {
        applyAction(idx, videos[idx]?.action === 'delete' ? null : 'delete');
      } else if (e.key === 's' || e.key === 'S') {
        applyAction(idx, videos[idx]?.action === 'skip' ? null : 'skip');
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(Math.min(idx + 1, videos.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(Math.max(idx - 1, 0));
      } else if (e.key === '[') {
        const el = videoRefs.current[idx];
        if (el) el.currentTime = Math.max(0, el.currentTime - 5);
      } else if (e.key === ']') {
        const el = videoRefs.current[idx];
        if (el) el.currentTime = Math.min(el.duration || 0, el.currentTime + 5);
      } else if (e.key === ' ') {
        e.preventDefault();
        const el = videoRefs.current[idx];
        if (el) { if (el.paused) el.play().catch(() => {}); else el.pause(); }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedIndex, videos, modalIndex, activeTab]);

  const handleDurationLoaded = useCallback((idx: number, seconds: number) => {
    setVideos((prev) => {
      const item = prev[idx];
      if (!item || item.durationSeconds === seconds) return prev;
      const next = [...prev];
      next[idx] = { ...item, durationSeconds: seconds };
      return next;
    });
  }, []);

  const applyAction = useCallback((idx: number, action: VideoAction | null) => {
    setVideos((prev) => {
      const next = [...prev];
      const item = next[idx];
      if (!item) return prev;
      next[idx] = { ...item, action };
      if (action === null) {
        delete savedActions.current[item.path];
      } else {
        savedActions.current[item.path] = action;
      }
      persistActions(savedActions.current);
      return next;
    });
  }, []);

  const openModal = (idx: number) => { setModalIndex(idx); setModalIsPlaying(false); };

  const toggleModalPlay = () => {
    const el = modalVideoRef.current;
    if (!el) return;
    if (modalIsPlaying) { el.pause(); setModalIsPlaying(false); }
    else { el.play().catch(() => {}); setModalIsPlaying(true); }
  };

  const seekModal = (seconds: number) => {
    const el = modalVideoRef.current;
    if (el) el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + seconds));
  };

  const handleModalVideoLoaded = () => {
    if (modalIsPlaying && modalVideoRef.current) {
      modalVideoRef.current.play().catch(() => {});
    }
  };

  const openFolderPicker = useCallback(async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Select Video Folder' });
      if (selected) setRoot(selected);
    } catch (e) { console.error(e); }
  }, []);

  const handleScan = async () => {
    if (!root) return;
    videoRefs.current.forEach((v) => v?.pause());
    multiWatchRefs.current.forEach((v) => v?.pause());
    setIsMultiWatchPlaying(false);
    setVideos([]);
    videoRefs.current = [];
    multiWatchRefs.current = [];
    pendingVideos.current = [];
    if (flushTimer.current) { clearTimeout(flushTimer.current); flushTimer.current = null; }
    setFocusedIndex(null);
    setModalIndex(null);
    setMultiWatchPage(0);
    setIsScanning(true);
    try {
      await invoke('scan_videos', { root });
    } catch (err) {
      alert(`Scan error: ${err}`);
      setIsScanning(false);
    }
  };

  const toggleMultiWatchPlay = () => {
    if (isMultiWatchPlaying) {
      multiWatchRefs.current.forEach((v) => v?.pause());
      setIsMultiWatchPlaying(false);
    } else {
      multiWatchRefs.current.forEach((v) => { if (v) v.play().catch(() => {}); });
      setIsMultiWatchPlaying(true);
    }
  };

  const seekMultiWatch = (seconds: number) => {
    multiWatchRefs.current.forEach((v) => {
      if (v) v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds));
    });
  };

  const changeMultiWatchPage = (newPage: number) => {
    multiWatchRefs.current.forEach((v) => v?.pause());
    setIsMultiWatchPlaying(false);
    multiWatchRefs.current = [];
    setMultiWatchPage(newPage);
  };

  const handleDeleteMarked = async () => {
    const toDelete = videos.filter((v) => v.action === 'delete').map((v) => v.path);
    if (toDelete.length === 0) return;

    const totalSize = videos
      .filter((v) => v.action === 'delete')
      .reduce((s, v) => s + (v.sizeBytes ?? 0), 0);

    const confirmed = await confirm(
      `Permanently delete ${toDelete.length} video(s) (${formatBytes(totalSize)})?\n\nThis cannot be undone.`,
      { title: 'Confirm Deletion', kind: 'warning' }
    );
    if (!confirmed) return;

    videoRefs.current.forEach((v) => v?.pause());
    multiWatchRefs.current.forEach((v) => v?.pause());
    setIsMultiWatchPlaying(false);
    setIsDeleting(true);

    try {
      await invoke('delete_files', { paths: toDelete });
      setVideos((prev) => prev.filter((v) => !toDelete.includes(v.path)));
      toDelete.forEach((p) => delete savedActions.current[p]);
      persistActions(savedActions.current);
    } catch (err) {
      await message(`Delete failed:\n${err}`, { title: 'Error', kind: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteCount = videos.filter((v) => v.action === 'delete').length;
  const deleteSize = videos.filter((v) => v.action === 'delete').reduce((s, v) => s + (v.sizeBytes ?? 0), 0);
  const keepCount = videos.filter((v) => v.action === 'keep').length;
  const skipCount = videos.filter((v) => v.action === 'skip').length;
  const unmarkedCount = videos.filter((v) => v.action === null).length;

  const totalMultiWatchPages = Math.ceil(videos.length / MULTIWATCH_PAGE_SIZE);
  const multiWatchVideos = videos.slice(
    multiWatchPage * MULTIWATCH_PAGE_SIZE,
    (multiWatchPage + 1) * MULTIWATCH_PAGE_SIZE
  );

  const modalVideo = modalIndex !== null ? videos[modalIndex] : null;
  const modalFilename = modalVideo?.path.split(/[\\/]/).pop() ?? '';
  const modalSrc = modalVideo ? convertFileSrc(modalVideo.path) : '';
  const modalAction = modalVideo?.action ?? null;

  const modalActionStyles: Record<VideoAction, { ring: string; badge: string }> = {
    keep:   { ring: 'ring-4 ring-green-500', badge: 'bg-green-500' },
    delete: { ring: 'ring-4 ring-red-500',   badge: 'bg-red-500' },
    skip:   { ring: 'ring-4 ring-gray-400',  badge: 'bg-gray-500' },
  };

  // ── Sidebar injection ────────────────────────────────────────────────────────
  useEffect(() => {
    setSidebarContent(
      <VideoSidebar
        root={root}
        total={videos.length}
        unmarkedCount={unmarkedCount}
        keepCount={keepCount}
        skipCount={skipCount}
        deleteCount={deleteCount}
        isScanning={isScanning}
        isDeleting={isDeleting}
        onPickFolder={openFolderPicker}
        onScan={handleScan}
      />,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, isScanning, isDeleting, videos.length, keepCount, deleteCount, unmarkedCount, skipCount]);

  return (
    <div>
      <VideoTabs activeTab={activeTab} count={videos.length} onChange={setActiveTab} />

      {/* Browse tab */}
      {activeTab === 'browse' && videos.length > 0 && (
        <div className="bg-card p-4 rounded-xl">
          <p className="mb-4 text-xs text-subtle">
            Keyboard shortcuts when a video is focused — <kbd className="bg-surface text-muted px-1 rounded">K</kbd> Keep &nbsp;
            <kbd className="bg-surface text-muted px-1 rounded">D</kbd> Delete &nbsp;
            <kbd className="bg-surface text-muted px-1 rounded">S</kbd> Skip &nbsp;
            <kbd className="bg-surface text-muted px-1 rounded">Space</kbd> Play/Pause &nbsp;
            <kbd className="bg-surface text-muted px-1 rounded">←→</kbd> Navigate &nbsp;
            <kbd className="bg-surface text-muted px-1 rounded">[</kbd><kbd className="bg-surface text-muted px-1 rounded">]</kbd> Seek ±5s
          </p>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((video, idx) => (
              <VideoCard
                key={video.path}
                ref={(el) => { videoRefs.current[idx] = el; }}
                path={video.path}
                sizeBytes={video.sizeBytes}
                action={video.action}
                durationSeconds={video.durationSeconds}
                isFocused={focusedIndex === idx}
                onFocus={() => setFocusedIndex(idx)}
                onAction={(action) => applyAction(idx, action)}
                onExpand={() => openModal(idx)}
                onDurationLoaded={(s) => handleDurationLoaded(idx, s)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Multi-Watch tab */}
      {activeTab === 'multiwatch' && videos.length > 0 && (
        <div className="bg-card p-4 rounded-xl">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <button
              className={[
                'px-5 py-2.5 rounded-lg font-medium shadow transition-colors',
                isMultiWatchPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-btn hover:bg-btn-hover text-btn-text',
              ].join(' ')}
              onClick={toggleMultiWatchPlay}
              disabled={isDeleting}
            >
              {isMultiWatchPlaying
                ? <div className="flex items-center gap-2"><Pause className="w-4 h-4" /><span>Pause All</span></div>
                : <div className="flex items-center gap-2"><Play className="w-4 h-4" /><span>Play All</span></div>}
            </button>
            <button
              className="px-4 py-2.5 rounded-lg font-medium shadow transition-colors bg-btn hover:bg-btn-hover text-btn-text"
              onClick={() => seekMultiWatch(-5)}
              disabled={isDeleting}
              title="Seek all back 5 seconds"
            >
              <div className="flex items-center gap-1"><Rewind className="w-4 h-4 self-center" /><span>5s</span></div>
            </button>
            <button
              className="px-4 py-2.5 rounded-lg font-medium shadow transition-colors bg-btn hover:bg-btn-hover text-btn-text"
              onClick={() => seekMultiWatch(5)}
              disabled={isDeleting}
              title="Seek all forward 5 seconds"
            >
              <div className="flex items-center gap-1"><span>5s</span><FastForward className="w-4 h-4 self-center" /></div>
            </button>

            {/* Pagination */}
            <div className="ml-auto flex items-center gap-2">
              <button
                className="p-2 rounded-lg bg-btn hover:bg-btn-hover text-btn-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                onClick={() => changeMultiWatchPage(multiWatchPage - 1)}
                disabled={multiWatchPage === 0}
                title="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-muted min-w-[6rem] text-center">
                Page {multiWatchPage + 1} of {totalMultiWatchPages}
              </span>
              <button
                className="p-2 rounded-lg bg-btn hover:bg-btn-hover text-btn-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                onClick={() => changeMultiWatchPage(multiWatchPage + 1)}
                disabled={multiWatchPage >= totalMultiWatchPages - 1}
                title="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 3×3 grid */}
          <div key={multiWatchPage} className="grid gap-3 grid-cols-3">
            {multiWatchVideos.map((video, localIdx) => {
              const globalIdx = multiWatchPage * MULTIWATCH_PAGE_SIZE + localIdx;
              return (
                <VideoCard
                  key={video.path}
                  ref={(el) => { multiWatchRefs.current[localIdx] = el; }}
                  path={video.path}
                  sizeBytes={video.sizeBytes}
                  action={video.action}
                  durationSeconds={video.durationSeconds}
                  isFocused={false}
                  onFocus={() => {}}
                  onAction={(action) => applyAction(globalIdx, action)}
                  onExpand={() => openModal(globalIdx)}
                  onDurationLoaded={(s) => handleDurationLoaded(globalIdx, s)}
                />
              );
            })}
          </div>
        </div>
      )}

      <FloatingDeleteBar
        count={deleteCount}
        sizeBytes={deleteSize}
        isDeleting={isDeleting}
        isScanning={isScanning}
        onDelete={handleDeleteMarked}
      />

      {!isScanning && videos.length === 0 && (
        <EmptyState title="No videos found" description="Select a folder and click “Rescan” to get started." />
      )}

      {/* ── Video Modal ──────────────────────────────────────────────────────────── */}
      {modalIndex !== null && modalVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => { setModalIndex(null); setModalIsPlaying(false); }}
        >
          {/* Prev button */}
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30"
            onClick={(e) => { e.stopPropagation(); setModalIndex((i) => (i !== null ? Math.max(i - 1, 0) : null)); }}
            disabled={modalIndex === 0}
            title="Previous (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Modal content */}
          <div
            className={[
              'relative flex flex-col w-full max-w-4xl mx-16 rounded-2xl overflow-hidden shadow-2xl',
              modalAction ? modalActionStyles[modalAction].ring : 'ring-1 ring-white/10',
            ].join(' ')}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-900 text-white">
              <div className="flex items-center gap-2 min-w-0">
                {modalAction && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide text-white ${modalActionStyles[modalAction].badge}`}>
                    {modalAction}
                  </span>
                )}
                <p className="text-sm font-medium truncate" title={modalVideo.path}>
                  {modalFilename}
                </p>
                {modalVideo.sizeBytes != null && (
                  <span className="text-xs text-gray-400 shrink-0">{formatBytes(modalVideo.sizeBytes)}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 text-xs text-gray-400">
                <span>{modalIndex + 1} / {videos.length}</span>
                <button
                  className="p-1.5 rounded hover:bg-white/10 transition-colors"
                  onClick={() => { setModalIndex(null); setModalIsPlaying(false); }}
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Video */}
            <div className="bg-black">
              <video
                key={modalSrc}
                ref={modalVideoRef}
                src={modalSrc}
                className="w-full max-h-[65vh] object-contain"
                muted
                loop
                playsInline
                controls
                onLoadedMetadata={handleModalVideoLoaded}
              />
            </div>

            {/* Controls */}
            <div className="bg-gray-900 px-4 py-3 flex flex-col gap-3">
              <div className="flex items-center justify-center gap-3">
                <button
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                  onClick={() => seekModal(-5)}
                  title="Back 5s ([)"
                >
                  <div className="flex items-center gap-1"><Rewind className="w-4 h-4 self-center" /><span>5s</span></div>
                </button>
                <button
                  className="px-6 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-colors"
                  onClick={toggleModalPlay}
                  title="Play / Pause"
                >
                  {modalIsPlaying
                    ? <div className="flex items-center gap-1"><Pause className="w-4 h-4 self-center" /><span>Pause</span></div>
                    : <div className="flex items-center gap-1"><Play className="w-4 h-4 self-center" /><span>Play</span></div>}
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                  onClick={() => seekModal(5)}
                  title="Forward 5s (])"
                >
                  <div className="flex items-center gap-1"><span>5s</span><FastForward className="w-4 h-4 self-center" /></div>
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  className={[
                    'flex-1 py-2 text-sm font-semibold rounded-lg transition-colors',
                    modalAction === 'keep'
                      ? 'bg-green-500 text-white'
                      : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-800/60',
                  ].join(' ')}
                  onClick={() => applyAction(modalIndex, modalAction === 'keep' ? null : 'keep')}
                  title="Keep (K)"
                >
                  Keep
                </button>
                <button
                  className={[
                    'flex-1 py-2 text-sm font-semibold rounded-lg transition-colors',
                    modalAction === 'skip'
                      ? 'bg-gray-500 text-white'
                      : 'bg-surface text-muted hover:bg-surface-hover',
                  ].join(' ')}
                  onClick={() => applyAction(modalIndex, modalAction === 'skip' ? null : 'skip')}
                  title="Skip (S)"
                >
                  Skip
                </button>
                <button
                  className={[
                    'flex-1 py-2 text-sm font-semibold rounded-lg transition-colors',
                    modalAction === 'delete'
                      ? 'bg-red-500 text-white'
                      : 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-800/60',
                  ].join(' ')}
                  onClick={() => applyAction(modalIndex, modalAction === 'delete' ? null : 'delete')}
                  title="Delete (D)"
                >
                  Delete
                </button>
              </div>

              {/* Keyboard hint */}
              <p className="text-center text-xs text-gray-500">
                <kbd className="bg-gray-700 px-1 rounded">K</kbd> Keep &nbsp;
                <kbd className="bg-gray-700 px-1 rounded">D</kbd> Delete &nbsp;
                <kbd className="bg-gray-700 px-1 rounded">S</kbd> Skip &nbsp;
                <kbd className="bg-gray-700 px-1 rounded">Space</kbd> Play/Pause &nbsp;
                <kbd className="bg-gray-700 px-1 rounded">[</kbd><kbd className="bg-gray-700 px-1 rounded">]</kbd> Seek ±5s &nbsp;
                <kbd className="bg-gray-700 px-1 rounded">←→</kbd> Navigate &nbsp;
                <kbd className="bg-gray-700 px-1 rounded">Esc</kbd> Close
              </p>
            </div>
          </div>

          {/* Next button */}
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30"
            onClick={(e) => { e.stopPropagation(); setModalIndex((i) => (i !== null ? Math.min(i + 1, videos.length - 1) : null)); }}
            disabled={modalIndex === videos.length - 1}
            title="Next (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
