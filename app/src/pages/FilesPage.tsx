import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, Event } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import PatternInput from '../components/PatternInput';
import IgnorePathsInput from '../components/IgnorePathsInput';
import ResultsTable from '../components/ResultsTable';
import ProgressBar from '../components/ProgressBar';
import {
  FolderRow,
  ScanRequest,
  ScanProgressEvent,
  ScanCompleteEvent,
  DeleteJobRequest,
  DeleteJobStartResponse,
  DeleteProgressEvent,
  DeleteCompleteEvent,
} from '../types/ipc';
import { formatBytes } from '../utils/formatBytes';
import { useSidebar } from '../SidebarContext';

export default function FilesPage() {
  const setSidebarContent = useSidebar();

  const [root, setRoot] = useState<string>('');
  const [patterns, setPatterns] = useState<string[]>(['node_modules', '.next']);
  const [ignorePaths, setIgnorePaths] = useState<string[]>(['.git', '.vscode']);
  const [skipNested, setSkipNested] = useState<boolean>(true);
  const [useGlobPatterns, setUseGlobPatterns] = useState<boolean>(false);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [deleteTotal, setDeleteTotal] = useState<number>(0);
  const [deleteCompleted, setDeleteCompleted] = useState<number>(0);
  const [currentDeletingPath, setCurrentDeletingPath] = useState<string | null>(null);

  const unsubscribers = useRef<Array<() => void>>([]);

  const scanProgress = (event: Event<ScanProgressEvent>) => {
    const { folder } = event.payload;
    setFolders((prev) => {
      if (prev.some((f) => f.path === folder.path)) return prev;
      return [...prev, { path: folder.path, sizeBytes: folder.sizeBytes, status: 'selected' }];
    });
  };

  const scanComplete = () => setIsScanning(false);

  const deleteProgress = (event: Event<DeleteProgressEvent>) => {
    const payload = event.payload;
    setDeleteJobId(payload.jobId);
    setDeleteTotal(payload.total);
    setDeleteCompleted(payload.completed);
    setCurrentDeletingPath(payload.currentPath ?? null);

    if (payload.currentPath) {
      setFolders((prev) =>
        prev.map((f) =>
          f.path === payload.currentPath ? { ...f, status: 'deleting' } : f,
        ),
      );
    }
  };

  const deleteComplete = (event: Event<DeleteCompleteEvent>) => {
    const { succeeded, failed } = event.payload;

    setDeleteJobId(null);
    setCurrentDeletingPath(null);

    setFolders((prev) => {
      let next = [...prev];
      next = next.map((f) =>
        succeeded.includes(f.path) ? { ...f, status: 'deleted', error: undefined } : f,
      );
      failed.forEach((fd) => {
        const reason = fd.error || fd.attempts?.[0] || 'Unknown error';
        const idx = next.findIndex((f) => f.path === fd.path);
        if (idx >= 0) {
          next[idx] = { ...next[idx], status: 'failed', error: reason };
        } else {
          next.push({ path: fd.path, sizeBytes: null, status: 'failed', error: reason });
        }
      });
      return next;
    });
  };

  const setupListeners = async () => {
    const prog = await listen<ScanProgressEvent>('scan-progress', scanProgress);
    unsubscribers.current = [...unsubscribers.current, prog];
    const completeScan = await listen<ScanCompleteEvent>('scan-complete', scanComplete);
    unsubscribers.current = [...unsubscribers.current, completeScan];
    const deleteProg = await listen<DeleteProgressEvent>('delete-progress', deleteProgress);
    unsubscribers.current = [...unsubscribers.current, deleteProg];
    const completed = await listen<DeleteCompleteEvent>('delete-complete', deleteComplete);
    unsubscribers.current = [...unsubscribers.current, completed];
  };

  useEffect(() => {
    setupListeners();
    return () => { unsubscribers.current.forEach((unsub) => unsub()); };
  }, []);

  const openFolderPicker = async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Select Root Directory' });
      if (selected) setRoot(selected);
    } catch (e) {
      console.error(e);
    }
  };

  const handleScan = async () => {
    if (!root) return;
    if (patterns.length === 0) {
      alert('Please specify at least one folder pattern.');
      return;
    }
    setFolders([]);
    setIsScanning(true);
    try {
      const request: ScanRequest = {
        root,
        patterns,
        skip_nested: skipNested,
        ignore_paths: ignorePaths.length > 0 ? ignorePaths : undefined,
        use_glob_patterns: useGlobPatterns,
      };
      await invoke('scan_dirs', { request });
    } catch (error) {
      console.error('Scan error:', error);
      alert(`Error scanning: ${error}`);
      setIsScanning(false);
    }
  };

  const handleCancelScan = async () => {
    try {
      await invoke('cancel_scan');
      setIsScanning(false);
    } catch (error) {
      console.error('Cancel scan error:', error);
    }
  };

  const handleToggleSelection = (path: string) => {
    setFolders((prev) =>
      prev.map((f) => {
        if (f.path === path) {
          if (f.status === 'selected') return { ...f, status: 'pending' };
          else if (f.status === 'pending') return { ...f, status: 'selected' };
        }
        return f;
      }),
    );
  };

  const handleToggleAll = () => {
    const deletableCount = folders.filter((f) => f.status === 'pending' || f.status === 'selected').length;
    const selectedCount = folders.filter((f) => f.status === 'selected').length;
    const allSelected = deletableCount > 0 && selectedCount === deletableCount;
    setFolders((prev) =>
      prev.map((f) => {
        if (f.status === 'pending' || f.status === 'selected') {
          return { ...f, status: allSelected ? 'pending' : 'selected' };
        }
        return f;
      }),
    );
  };

  const handleDeleteSelected = async () => {
    const toDelete = folders.filter((f) => f.status === 'selected').map((f) => f.path);
    if (toDelete.length === 0) {
      alert('No folders selected for deletion.');
      return;
    }
    const confirmed = confirm(
      `Are you sure you want to delete ${toDelete.length} folder(s)?\n\nThis action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      const request: DeleteJobRequest = { folders: toDelete };
      const response = await invoke<DeleteJobStartResponse>('start_delete_job', { request });
      setDeleteJobId(response.jobId);
      setDeleteTotal(toDelete.length);
      setDeleteCompleted(0);
      setFolders((prev) =>
        prev.map((f) =>
          toDelete.includes(f.path) ? { ...f, status: 'deleting', error: undefined } : f,
        ),
      );
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Error starting deletion: ${error}`);
    }
  };

  const isDeleting = deleteJobId !== null;
  const selectedCount = folders.filter((f) => f.status === 'selected').length;
  const selectedTotalSize = folders
    .filter((f) => f.status === 'selected')
    .reduce((total, f) => total + (f.sizeBytes || 0), 0);

  // ── Sidebar injection ────────────────────────────────────────────────────────
  useEffect(() => {
    setSidebarContent(
      <div className="p-4 space-y-5 text-sm">
        {/* Current Folder */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
            Current Folder
          </p>
          <p className="text-xs text-gray-300 font-mono truncate mb-2.5 leading-relaxed" title={root}>
            {root || 'None selected'}
          </p>
          <button
            onClick={openFolderPicker}
            disabled={isDeleting}
            className="w-full text-xs px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-200 disabled:opacity-40 transition-colors"
          >
            Change Folder
          </button>
        </div>

        <div className="border-t border-gray-800" />

        {/* Folder Patterns */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
            Folder Patterns
          </p>
          <PatternInput patterns={patterns} onPatternsChange={setPatterns} disabled={isDeleting} />
        </div>

        <div className="border-t border-gray-800" />

        {/* Ignore Directories */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
            Ignore Directories
          </p>
          <IgnorePathsInput ignorePaths={ignorePaths} onIgnorePathsChange={setIgnorePaths} disabled={isDeleting} />
        </div>

        <div className="border-t border-gray-800" />

        {/* Options */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
            Options
          </p>
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer mb-2 select-none">
            <input
              type="checkbox"
              checked={skipNested}
              onChange={(e) => setSkipNested(e.target.checked)}
              disabled={isDeleting}
              className="w-3.5 h-3.5 accent-purple-500"
            />
            Skip nested matches
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useGlobPatterns}
              onChange={(e) => setUseGlobPatterns(e.target.checked)}
              disabled={isDeleting}
              className="w-3.5 h-3.5 accent-purple-500"
            />
            Use wildcard patterns
          </label>
        </div>

        <div className="border-t border-gray-800" />

        {/* Scan */}
        <div className="flex gap-2">
          <button
            onClick={handleScan}
            disabled={isScanning || isDeleting || !root}
            className="flex-1 text-xs px-3 py-2 rounded-md bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 transition-colors font-medium"
          >
            {isScanning ? (
              <span className="flex items-center justify-center gap-1.5">
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Scanning…
              </span>
            ) : (
              'Scan for Folders'
            )}
          </button>
          {isScanning && (
            <button
              onClick={handleCancelScan}
              className="text-xs px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              Stop
            </button>
          )}
        </div>
      </div>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, isScanning, isDeleting, patterns, ignorePaths, skipNested, useGlobPatterns]);

  return (
    <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
      <ResultsTable
        folders={folders}
        rootPath={root}
        onToggleSelection={handleToggleSelection}
        onToggleAll={handleToggleAll}
      />

      {folders.length > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <button
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg hover:bg-red-700 transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
            onClick={handleDeleteSelected}
            disabled={selectedCount === 0 || isDeleting || isScanning}
          >
            {isDeleting
              ? 'Deleting...'
              : `Delete ${selectedCount} Selected Folder(s)`}
          </button>
          {selectedCount > 0 && (
            <div className="text-lg font-semibold text-gray-700">
              Total: {formatBytes(selectedTotalSize)}
            </div>
          )}
        </div>
      )}

      {isDeleting && (
        <ProgressBar
          total={deleteTotal}
          completed={deleteCompleted}
          currentPath={currentDeletingPath}
        />
      )}
    </div>
  );
}
