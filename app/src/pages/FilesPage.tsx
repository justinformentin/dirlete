import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, Event } from '@tauri-apps/api/event';
import RootPicker from '../components/RootPicker';
import PatternInput from '../components/PatternInput';
import IgnorePathsInput from '../components/IgnorePathsInput';
import ScanControls from '../components/ScanControls';
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

export default function FilesPage() {
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
  const [currentDeletingPath, setCurrentDeletingPath] = useState<string | null>(
    null,
  );

  const unsubscribers = useRef<Array<() => void>>([]);

  const scanProgress = (event: Event<ScanProgressEvent>) => {
    const { folder } = event.payload;
    setFolders((prev) => {
      // Check if this folder already exists (prevent duplicates)
      if (prev.some((f) => f.path === folder.path)) {
        return prev;
      }
      return [
        ...prev,
        {
          path: folder.path,
          sizeBytes: folder.sizeBytes,
          status: 'selected',
        },
      ];
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

      // Mark succeeded folders
      next = next.map((f) =>
        succeeded.includes(f.path)
          ? { ...f, status: 'deleted', error: undefined }
          : f,
      );

      // Mark failed folders
      failed.forEach((fd) => {
        const reason = fd.error || fd.attempts?.[0] || 'Unknown error';
        const idx = next.findIndex((f) => f.path === fd.path);
        if (idx >= 0) {
          next[idx] = { ...next[idx], status: 'failed', error: reason };
        } else {
          next.push({
            path: fd.path,
            sizeBytes: null,
            status: 'failed',
            error: reason,
          });
        }
      });

      return next;
    });
  };

  const setupListeners = async () => {
    // Listen for scan progress events
    const prog = await listen<ScanProgressEvent>('scan-progress', scanProgress);
    unsubscribers.current = [...unsubscribers.current, prog];

    // Listen for scan complete events
    const completeScan = await listen<ScanCompleteEvent>(
      'scan-complete',
      scanComplete,
    );
    unsubscribers.current = [...unsubscribers.current, completeScan];

    // Listen for delete progress events
    const deleteProg = await listen<DeleteProgressEvent>(
      'delete-progress',
      deleteProgress,
    );
    unsubscribers.current = [...unsubscribers.current, deleteProg];

    // Listen for delete complete events
    const completed = await listen<DeleteCompleteEvent>(
      'delete-complete',
      deleteComplete,
    );
    unsubscribers.current = [...unsubscribers.current, completed];
  };
  // Set up event listeners on mount
  useEffect(() => {
    setupListeners();
    // Cleanup listeners on unmount
    return () => {
      unsubscribers.current.forEach((unsub) => unsub());
    };
  }, []);

  const handleScan = async () => {
    if (!root) {
      alert('Please select a root directory first.');
      return;
    }

    if (patterns.length === 0) {
      alert('Please specify at least one folder pattern.');
      return;
    }

    // Clear previous results
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

      // Start scanning - results will come via events
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
          if (f.status === 'selected') {
            return { ...f, status: 'pending' };
          } else if (f.status === 'pending') {
            return { ...f, status: 'selected' };
          }
        }
        return f;
      }),
    );
  };

  const handleToggleAll = () => {
    const deletableCount = folders.filter(
      (f) => f.status === 'pending' || f.status === 'selected',
    ).length;
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
    const toDelete = folders
      .filter((f) => f.status === 'selected')
      .map((f) => f.path);

    if (toDelete.length === 0) {
      alert('No folders selected for deletion.');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete ${toDelete.length} folder(s)?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const request: DeleteJobRequest = {
        folders: toDelete,
      };

      const response = await invoke<DeleteJobStartResponse>(
        'start_delete_job',
        { request },
      );

      setDeleteJobId(response.jobId);
      setDeleteTotal(toDelete.length);
      setDeleteCompleted(0);

      // Mark folders as deleting
      setFolders((prev) =>
        prev.map((f) =>
          toDelete.includes(f.path)
            ? { ...f, status: 'deleting', error: undefined }
            : f,
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

  return (
    <>
      <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-soft hover:shadow-soft-lg transition-shadow duration-300 mb-6">
        <RootPicker root={root} onRootChange={setRoot} disabled={isDeleting} />
        <PatternInput
          patterns={patterns}
          onPatternsChange={setPatterns}
          disabled={isDeleting}
        />
        <IgnorePathsInput
          ignorePaths={ignorePaths}
          onIgnorePathsChange={setIgnorePaths}
          disabled={isDeleting}
        />
        <ScanControls
          skipNested={skipNested}
          onSkipNestedChange={setSkipNested}
          useGlobPatterns={useGlobPatterns}
          onUseGlobPatternsChange={setUseGlobPatterns}
          onScan={handleScan}
          onCancelScan={handleCancelScan}
          isScanning={isScanning}
          disabled={isDeleting}
        />
      </div>

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
    </>
  );
}
