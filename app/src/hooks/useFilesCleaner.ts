import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, Event } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import {
  DeleteCompleteEvent,
  DeleteJobRequest,
  DeleteJobStartResponse,
  DeleteProgressEvent,
  FolderRow,
  ScanCompleteEvent,
  ScanProgressEvent,
  ScanRequest,
} from '../types/ipc';

const isSelectable = (folder: FolderRow) => folder.status === 'pending' || folder.status === 'selected';

export function useFilesCleaner() {
  const [root, setRoot] = useState('');
  const [patterns, setPatterns] = useState<string[]>(['node_modules', '.next']);
  const [ignorePaths, setIgnorePaths] = useState<string[]>(['.git', '.vscode']);
  const [skipNested, setSkipNested] = useState(true);
  const [useGlobPatterns, setUseGlobPatterns] = useState(false);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [deleteTotal, setDeleteTotal] = useState(0);
  const [deleteCompleted, setDeleteCompleted] = useState(0);
  const [currentDeletingPath, setCurrentDeletingPath] = useState<string | null>(null);
  const unsubscribers = useRef<Array<() => void>>([]);

  useEffect(() => {
    const scanProgress = (event: Event<ScanProgressEvent>) => {
      const { folder } = event.payload;
      setFolders((prev) => prev.some((f) => f.path === folder.path)
        ? prev
        : [...prev, { path: folder.path, sizeBytes: folder.sizeBytes, status: 'selected' }]);
    };

    const deleteProgress = (event: Event<DeleteProgressEvent>) => {
      const payload = event.payload;
      setDeleteJobId(payload.jobId);
      setDeleteTotal(payload.total);
      setDeleteCompleted(payload.completed);
      setCurrentDeletingPath(payload.currentPath ?? null);
      if (payload.currentPath) {
        setFolders((prev) => prev.map((f) => f.path === payload.currentPath ? { ...f, status: 'deleting' } : f));
      }
    };

    const deleteComplete = (event: Event<DeleteCompleteEvent>) => {
      const { succeeded, failed } = event.payload;
      setDeleteJobId(null);
      setCurrentDeletingPath(null);
      setFolders((prev) => {
        let next = prev.map((f) => succeeded.includes(f.path) ? { ...f, status: 'deleted' as const, error: undefined } : f);
        failed.forEach((fd) => {
          const reason = fd.error || fd.attempts?.[0] || 'Unknown error';
          const idx = next.findIndex((f) => f.path === fd.path);
          if (idx >= 0) next[idx] = { ...next[idx], status: 'failed', error: reason };
          else next.push({ path: fd.path, sizeBytes: null, status: 'failed', error: reason });
        });
        return next;
      });
    };

    void Promise.all([
      listen<ScanProgressEvent>('scan-progress', scanProgress),
      listen<ScanCompleteEvent>('scan-complete', () => setIsScanning(false)),
      listen<DeleteProgressEvent>('delete-progress', deleteProgress),
      listen<DeleteCompleteEvent>('delete-complete', deleteComplete),
    ]).then((unsubs) => { unsubscribers.current = unsubs; });

    return () => { unsubscribers.current.forEach((unsub) => unsub()); };
  }, []);

  const openFolderPicker = async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Select Root Directory' });
      if (selected) setRoot(selected);
    } catch (error) {
      console.error(error);
    }
  };

  const scan = async () => {
    if (!root) return;
    if (patterns.length === 0) {
      alert('Please specify at least one folder pattern.');
      return;
    }
    setFolders([]);
    setIsScanning(true);
    try {
      const request: ScanRequest = { root, patterns, skip_nested: skipNested, ignore_paths: ignorePaths.length > 0 ? ignorePaths : undefined, use_glob_patterns: useGlobPatterns };
      await invoke('scan_dirs', { request });
    } catch (error) {
      console.error('Scan error:', error);
      alert(`Error scanning: ${error}`);
      setIsScanning(false);
    }
  };

  const cancelScan = async () => {
    try {
      await invoke('cancel_scan');
      setIsScanning(false);
    } catch (error) {
      console.error('Cancel scan error:', error);
    }
  };

  const toggleSelection = (path: string) => {
    setFolders((prev) => prev.map((f) => {
      if (f.path !== path) return f;
      if (f.status === 'selected') return { ...f, status: 'pending' };
      if (f.status === 'pending') return { ...f, status: 'selected' };
      return f;
    }));
  };

  const toggleAll = () => {
    const deletableCount = folders.filter(isSelectable).length;
    const selectedCount = folders.filter((f) => f.status === 'selected').length;
    const allSelected = deletableCount > 0 && selectedCount === deletableCount;
    setFolders((prev) => prev.map((f) => isSelectable(f) ? { ...f, status: allSelected ? 'pending' : 'selected' } : f));
  };

  const deleteSelected = async () => {
    const toDelete = folders.filter((f) => f.status === 'selected').map((f) => f.path);
    if (toDelete.length === 0) {
      alert('No folders selected for deletion.');
      return;
    }
    if (!confirm(`Are you sure you want to delete ${toDelete.length} folder(s)?\n\nThis action cannot be undone.`)) return;
    try {
      const request: DeleteJobRequest = { folders: toDelete };
      const response = await invoke<DeleteJobStartResponse>('start_delete_job', { request });
      setDeleteJobId(response.jobId);
      setDeleteTotal(toDelete.length);
      setDeleteCompleted(0);
      setFolders((prev) => prev.map((f) => toDelete.includes(f.path) ? { ...f, status: 'deleting', error: undefined } : f));
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Error starting deletion: ${error}`);
    }
  };

  const isDeleting = deleteJobId !== null;
  const selectedFolders = folders.filter((f) => f.status === 'selected');

  return {
    root, patterns, ignorePaths, skipNested, useGlobPatterns, folders, isScanning,
    deleteTotal, deleteCompleted, currentDeletingPath, isDeleting,
    selectedCount: selectedFolders.length,
    selectedTotalSize: selectedFolders.reduce((total, f) => total + (f.sizeBytes || 0), 0),
    setPatterns, setIgnorePaths, setSkipNested, setUseGlobPatterns,
    openFolderPicker, scan, cancelScan, toggleSelection, toggleAll, deleteSelected,
  };
}
