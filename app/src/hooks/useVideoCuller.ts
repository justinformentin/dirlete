import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { listen, Event } from '@tauri-apps/api/event';
import { confirm, message, open } from '@tauri-apps/plugin-dialog';
import { loadSavedActions, persistActions } from '../features/video/videoActionsStorage';
import { useVideoKeyboardShortcuts } from '../features/video/useVideoKeyboardShortcuts';
import { VideoTab } from '../features/video/VideoTabs';
import { formatBytes } from '../utils/formatBytes';
import {
  VideoAction, VideoDisplayItem, VideoItem, VideoScanCompleteEvent, VideoScanProgressEvent,
  StatusFilter, VideoSortBy, SortDir,
} from '../types/ipc';

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

  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sizeFilter, setSizeFilter] = useState<[number, number] | null>(null);
  const [durationFilter, setDurationFilter] = useState<[number, number] | null>(null);

  // Sort state
  const [groupByFolder, setGroupByFolder] = useState(false);
  const [folderSortDir, setFolderSortDir] = useState<SortDir>('asc');
  const [itemSortBy, setItemSortBy] = useState<VideoSortBy>('name');
  const [itemSortDir, setItemSortDir] = useState<SortDir>('asc');

  // View state
  const [cardSize, setCardSize] = useState(80);

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
    let disposed = false;

    const addUnsubscribe = (unsubscribe: () => void) => {
      if (disposed) unsubscribe();
      else unsubs.push(unsubscribe);
    };

    listen<VideoScanProgressEvent>('video-scan-progress', (event: Event<VideoScanProgressEvent>) => {
      const { path, sizeBytes, modifiedMs } = event.payload;
      pendingVideos.current.push({ path, sizeBytes, modifiedMs, action: savedActions.current[path] ?? null });
      if (!flushTimer.current) flushTimer.current = setTimeout(flushPending, 50);
    }).then(addUnsubscribe);

    listen<VideoScanCompleteEvent>('video-scan-complete', () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushPending();
      setIsScanning(false);
    }).then(addUnsubscribe);

    return () => {
      disposed = true;
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
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

  // Derived slider bounds
  const maxSizeBytes = videos.reduce((acc, v) => Math.max(acc, v.sizeBytes ?? 0), 0);
  const maxDurationSeconds = videos.reduce((acc, v) => Math.max(acc, v.durationSeconds ?? 0), 0);

  // Filtered and sorted display list
  const filteredSortedVideos = useMemo((): VideoDisplayItem[] => {
    let result: VideoDisplayItem[] = videos.map((v, i) => ({ ...v, globalIndex: i }));

    if (statusFilter !== 'all') {
      result = result.filter((v) => (statusFilter === 'pending' ? v.action === null : v.action === statusFilter));
    }

    if (sizeFilter) {
      const [minS, maxS] = sizeFilter;
      result = result.filter((v) => { const s = v.sizeBytes ?? 0; return s >= minS && s <= maxS; });
    }

    if (durationFilter) {
      const [minD, maxD] = durationFilter;
      result = result.filter((v) => { const d = v.durationSeconds ?? 0; return d >= minD && d <= maxD; });
    }

    const getVal = (v: VideoDisplayItem, by: VideoSortBy): string | number => {
      if (by === 'name') return v.path.split(/[\\/]/).pop()?.toLowerCase() ?? '';
      if (by === 'size') return v.sizeBytes ?? -1;
      if (by === 'duration') return v.durationSeconds ?? -1;
      return v.modifiedMs ?? -1;
    };

    const compare = (a: VideoDisplayItem, b: VideoDisplayItem, by: VideoSortBy, dir: SortDir): number => {
      const av = getVal(a, by);
      const bv = getVal(b, by);
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return dir === 'asc' ? cmp : -cmp;
    };

    if (groupByFolder) {
      const getFolder = (v: VideoDisplayItem) => v.path.replace(/[\\/][^\\/]*$/, '').toLowerCase();
      result.sort((a, b) => {
        const fc = getFolder(a).localeCompare(getFolder(b));
        const fCmp = folderSortDir === 'asc' ? fc : -fc;
        if (fCmp !== 0) return fCmp;
        return compare(a, b, itemSortBy, itemSortDir);
      });
    } else {
      result.sort((a, b) => compare(a, b, itemSortBy, itemSortDir));
    }

    return result;
  }, [videos, statusFilter, sizeFilter, durationFilter, groupByFolder, folderSortDir, itemSortBy, itemSortDir]);

  useEffect(() => {
    setMultiWatchPage((page) => {
      const maxPage = Math.max(0, Math.ceil(filteredSortedVideos.length / MULTIWATCH_PAGE_SIZE) - 1);
      return Math.min(page, maxPage);
    });
  }, [filteredSortedVideos.length]);

  useVideoKeyboardShortcuts({
    activeTab,
    videos,
    displayVideos: filteredSortedVideos,
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

  const actionCounts = videos.reduce(
    (counts, video) => {
      if (video.action === null) counts.unmarked += 1;
      else counts[video.action] += 1;
      return counts;
    },
    { delete: 0, keep: 0, skip: 0, unmarked: 0 },
  );
  const keepCount = actionCounts.keep;
  const skipCount = actionCounts.skip;
  const unmarkedCount = actionCounts.unmarked;
  const totalMultiWatchPages = Math.ceil(filteredSortedVideos.length / MULTIWATCH_PAGE_SIZE);
  const multiWatchVideos = filteredSortedVideos.slice(multiWatchPage * MULTIWATCH_PAGE_SIZE, (multiWatchPage + 1) * MULTIWATCH_PAGE_SIZE);
  const modalVideo = modalIndex !== null ? videos[modalIndex] : null;

  return {
    root, videos, isScanning, focusedIndex, isDeleting, activeTab, multiWatchPage, isMultiWatchPlaying,
    modalIndex, modalIsPlaying, modalVideo, modalFilename: modalVideo?.path.split(/[\\/]/).pop() ?? '',
    modalSrc: modalVideo ? convertFileSrc(modalVideo.path) : '', modalAction: modalVideo?.action ?? null,
    multiWatchVideos, totalMultiWatchPages, deleteCount, deleteSize, keepCount, skipCount, unmarkedCount,
    videoRefs, multiWatchRefs, modalVideoRef,
    // Filter
    statusFilter, sizeFilter, durationFilter, maxSizeBytes, maxDurationSeconds,
    filteredSortedVideos,
    // Sort
    groupByFolder, folderSortDir, itemSortBy, itemSortDir,
    // View
    cardSize,
    setActiveTab, setFocusedIndex, setModalIndex, setModalIsPlaying,
    setStatusFilter, setSizeFilter, setDurationFilter,
    setGroupByFolder, setFolderSortDir, setItemSortBy, setItemSortDir,
    setCardSize,
    openFolderPicker, scan, applyAction, handleDurationLoaded, openModal, closeModal,
    toggleModalPlay, seekModal, handleModalVideoLoaded, toggleMultiWatchPlay, seekMultiWatch,
    changeMultiWatchPage, deleteMarked,
  };
}