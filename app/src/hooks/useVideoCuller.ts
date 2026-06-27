import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { listen, Event } from '@tauri-apps/api/event';
import { confirm, message, open } from '@tauri-apps/plugin-dialog';
import { loadSavedActions, persistActions } from '../features/video/videoActionsStorage';
import { useVideoKeyboardShortcuts } from '../features/video/useVideoKeyboardShortcuts';
import { VideoTab } from '../features/video/VideoTabs';
import { formatBytes } from '../utils/formatBytes';
import { VideoAction, VideoItem, VideoScanCompleteEvent, VideoScanProgressEvent } from '../types/ipc';

export const MULTIWATCH_PAGE_SIZE = 9;

const pauseVideos = (refs: Array<HTMLVideoElement | null>) => refs.forEach((video) => video?.pause());
const seekVideo = (video: HTMLVideoElement | null, seconds: number) => {
  if (video) video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
};

export function useVideoCuller() {
  const [root, setRoot] = useState('');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<VideoTab>('browse');
  const [multiWatchPage, setMultiWatchPage] = useState(0);
  const [isMultiWatchPlaying, setIsMultiWatchPlaying] = useState(false);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [modalIsPlaying, setModalIsPlaying] = useState(false);

  const multiWatchRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const savedActions = useRef<Record<string, VideoAction>>(loadSavedActions());
  const pendingVideos = useRef<VideoItem[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPending = useCallback(() => {
    flushTimer.current = null;
    const batch = pendingVideos.current;
    if (batch.length === 0) return;
    pendingVideos.current = [];
    setVideos((prev) => {
      const existing = new Set(prev.map((video) => video.path));
      const newItems = batch.filter((video) => !existing.has(video.path));
      return newItems.length === 0 ? prev : [...prev, ...newItems];
    });
  }, []);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    listen<VideoScanProgressEvent>('video-scan-progress', (event: Event<VideoScanProgressEvent>) => {
      const { path, sizeBytes } = event.payload;
      pendingVideos.current.push({ path, sizeBytes, action: savedActions.current[path] ?? null });
      if (!flushTimer.current) flushTimer.current = setTimeout(flushPending, 50);
    }).then((unsubscribe) => unsubs.push(unsubscribe));

    listen<VideoScanCompleteEvent>('video-scan-complete', () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushPending();
      setIsScanning(false);
    }).then((unsubscribe) => unsubs.push(unsubscribe));

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [flushPending]);

  const applyAction = useCallback((index: number, action: VideoAction | null) => {
    setVideos((prev) => {
      const next = [...prev];
      const item = next[index];
      if (!item) return prev;
      next[index] = { ...item, action };
      if (action === null) delete savedActions.current[item.path];
      else savedActions.current[item.path] = action;
      persistActions(savedActions.current);
      return next;
    });
  }, []);

  useVideoKeyboardShortcuts({
    activeTab,
    videos,
    focusedIndex,
    modalIndex,
    videoRefs,
    multiWatchRefs,
    modalVideoRef,
    onFocusIndexChange: setFocusedIndex,
    onModalIndexChange: setModalIndex,
    onModalPlayingChange: setModalIsPlaying,
    onMultiWatchPlayingChange: setIsMultiWatchPlaying,
    onApplyAction: applyAction,
  });

  const handleDurationLoaded = useCallback((index: number, seconds: number) => {
    setVideos((prev) => {
      const item = prev[index];
      if (!item || item.durationSeconds === seconds) return prev;
      const next = [...prev];
      next[index] = { ...item, durationSeconds: seconds };
      return next;
    });
  }, []);

  const openModal = (index: number) => {
    setModalIndex(index);
    setModalIsPlaying(false);
  };

  const closeModal = () => {
    setModalIndex(null);
    setModalIsPlaying(false);
  };

  const toggleModalPlay = () => {
    const video = modalVideoRef.current;
    if (!video) return;
    if (modalIsPlaying) { video.pause(); setModalIsPlaying(false); }
    else { video.play().catch(() => {}); setModalIsPlaying(true); }
  };

  const seekModal = (seconds: number) => seekVideo(modalVideoRef.current, seconds);

  const handleModalVideoLoaded = () => {
    if (modalIsPlaying && modalVideoRef.current) modalVideoRef.current.play().catch(() => {});
  };

  const openFolderPicker = useCallback(async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Select Video Folder' });
      if (selected) setRoot(selected);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const scan = async () => {
    if (!root) return;
    pauseVideos(videoRefs.current);
    pauseVideos(multiWatchRefs.current);
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
    } catch (error) {
      alert(`Scan error: ${error}`);
      setIsScanning(false);
    }
  };

  const toggleMultiWatchPlay = () => {
    if (isMultiWatchPlaying) {
      pauseVideos(multiWatchRefs.current);
      setIsMultiWatchPlaying(false);
    } else {
      multiWatchRefs.current.forEach((video) => { if (video) video.play().catch(() => {}); });
      setIsMultiWatchPlaying(true);
    }
  };

  const seekMultiWatch = (seconds: number) => {
    multiWatchRefs.current.forEach((video) => seekVideo(video, seconds));
  };

  const changeMultiWatchPage = (newPage: number) => {
    pauseVideos(multiWatchRefs.current);
    setIsMultiWatchPlaying(false);
    multiWatchRefs.current = [];
    setMultiWatchPage(newPage);
  };

  const deleteMarked = async () => {
    const toDelete = videos.filter((video) => video.action === 'delete').map((video) => video.path);
    if (toDelete.length === 0) return;
    const totalSize = videos.filter((video) => video.action === 'delete').reduce((size, video) => size + (video.sizeBytes ?? 0), 0);
    const confirmed = await confirm(
      `Permanently delete ${toDelete.length} video(s) (${formatBytes(totalSize)})?\n\nThis cannot be undone.`,
      { title: 'Confirm Deletion', kind: 'warning' },
    );
    if (!confirmed) return;

    pauseVideos(videoRefs.current);
    pauseVideos(multiWatchRefs.current);
    setIsMultiWatchPlaying(false);
    setIsDeleting(true);

    try {
      await invoke('delete_files', { paths: toDelete });
      setVideos((prev) => prev.filter((video) => !toDelete.includes(video.path)));
      toDelete.forEach((path) => delete savedActions.current[path]);
      persistActions(savedActions.current);
    } catch (error) {
      await message(`Delete failed:\n${error}`, { title: 'Error', kind: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteCount = videos.filter((video) => video.action === 'delete').length;
  const deleteSize = videos.filter((video) => video.action === 'delete').reduce((size, video) => size + (video.sizeBytes ?? 0), 0);
  const keepCount = videos.filter((video) => video.action === 'keep').length;
  const skipCount = videos.filter((video) => video.action === 'skip').length;
  const unmarkedCount = videos.filter((video) => video.action === null).length;
  const totalMultiWatchPages = Math.ceil(videos.length / MULTIWATCH_PAGE_SIZE);
  const multiWatchVideos = videos.slice(multiWatchPage * MULTIWATCH_PAGE_SIZE, (multiWatchPage + 1) * MULTIWATCH_PAGE_SIZE);
  const modalVideo = modalIndex !== null ? videos[modalIndex] : null;

  return {
    root, videos, isScanning, focusedIndex, isDeleting, activeTab, multiWatchPage, isMultiWatchPlaying,
    modalIndex, modalIsPlaying, modalVideo, modalFilename: modalVideo?.path.split(/[\\/]/).pop() ?? '',
    modalSrc: modalVideo ? convertFileSrc(modalVideo.path) : '', modalAction: modalVideo?.action ?? null,
    multiWatchVideos, totalMultiWatchPages, deleteCount, deleteSize, keepCount, skipCount, unmarkedCount,
    videoRefs, multiWatchRefs, modalVideoRef,
    setActiveTab, setFocusedIndex, setModalIndex, setModalIsPlaying,
    openFolderPicker, scan, applyAction, handleDurationLoaded, openModal, closeModal,
    toggleModalPlay, seekModal, handleModalVideoLoaded, toggleMultiWatchPlay, seekMultiWatch,
    changeMultiWatchPage, deleteMarked,
  };
}
