import { useEffect } from 'react';
import ResultsTable from '../components/ResultsTable';
import ProgressBar from '../components/ProgressBar';
import FilesSidebar from '../features/files/FilesSidebar';
import { useFilesCleaner } from '../hooks/useFilesCleaner';
import { useSidebar } from '../SidebarContext';
import Button from '../ui/Button';
import { formatBytes } from '../utils/formatBytes';

export default function FilesPage() {
  const setSidebarContent = useSidebar();
  const cleaner = useFilesCleaner();

  useEffect(() => {
    setSidebarContent(
      <FilesSidebar
        root={cleaner.root}
        patterns={cleaner.patterns}
        ignorePaths={cleaner.ignorePaths}
        skipNested={cleaner.skipNested}
        useGlobPatterns={cleaner.useGlobPatterns}
        isScanning={cleaner.isScanning}
        isDeleting={cleaner.isDeleting}
        onPickFolder={cleaner.openFolderPicker}
        onScan={cleaner.scan}
        onCancelScan={cleaner.cancelScan}
        onPatternsChange={cleaner.setPatterns}
        onIgnorePathsChange={cleaner.setIgnorePaths}
        onSkipNestedChange={cleaner.setSkipNested}
        onUseGlobPatternsChange={cleaner.setUseGlobPatterns}
      />,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleaner.root, cleaner.isScanning, cleaner.isDeleting, cleaner.patterns, cleaner.ignorePaths, cleaner.skipNested, cleaner.useGlobPatterns]);

  return (
    <div className="h-full bg-card p-6 lg:p-8 rounded-2xl shadow-soft hover:shadow-soft-lg transition-shadow duration-300">
      <ResultsTable folders={cleaner.folders} rootPath={cleaner.root} onToggleSelection={cleaner.toggleSelection} onToggleAll={cleaner.toggleAll} />

      {cleaner.folders.length > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <Button variant="danger" size="sm" className="px-4 rounded-lg shadow-md hover:shadow-lg disabled:shadow-none" onClick={cleaner.deleteSelected} disabled={cleaner.selectedCount === 0 || cleaner.isDeleting || cleaner.isScanning}>
            {cleaner.isDeleting ? 'Deleting...' : `Delete ${cleaner.selectedCount} Selected Folder(s)`}
          </Button>
          {cleaner.selectedCount > 0 && <div className="text-lg font-semibold text-muted">Total: {formatBytes(cleaner.selectedTotalSize)}</div>}
        </div>
      )}

      {cleaner.isDeleting && <ProgressBar total={cleaner.deleteTotal} completed={cleaner.deleteCompleted} currentPath={cleaner.currentDeletingPath} />}
    </div>
  );
}
