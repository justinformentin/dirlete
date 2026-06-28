import React, { useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FolderRow } from '../types/ipc';
import { formatBytes } from '../utils/formatBytes';
import Checkbox from '../ui/Checkbox';

enum Status {
  Pending = 'pending',
  Selected = 'selected',
  Deleting = 'deleting',
  Deleted = 'deleted',
  Failed = 'failed',
}
type SortField = 'path' | 'size';
type SortDirection = 'asc' | 'desc';

interface ResultsTableProps {
  folders: FolderRow[];
  rootPath: string;
  onToggleSelection: (path: string) => void;
  onToggleAll: () => void;
}

const ResultsTable: React.FC<ResultsTableProps> = ({
  folders,
  rootPath,
  onToggleSelection,
  onToggleAll,
}) => {
  const [sortField, setSortField] = useState<SortField>('path');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'size' ? 'desc' : 'asc');
    }
  };

  const sortedFolders = useMemo(() => {
    const sorted = [...folders];
    sorted.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'path') {
        comparison = a.path.localeCompare(b.path);
      } else if (sortField === 'size') {
        const aSize = a.sizeBytes ?? 0;
        const bSize = b.sizeBytes ?? 0;
        comparison = aSize - bSize;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [folders, sortField, sortDirection]);

  const selectedCount = folders.filter((f) => f.status === 'selected').length;
  const deletableCount = folders.filter(
    (f) => f.status === 'pending' || f.status === 'selected'
  ).length;
  const allSelected = deletableCount > 0 && selectedCount === deletableCount;

  if (folders.length === 0) {
    return (
      <div className="text-center py-10 text-subtle">
        <p className="mb-4">No folders found yet.</p>
        <p>Select a root directory and click "Scan for Folders" to get started.</p>
      </div>
    );
  }

  const getStatusClass = (status: string): string => {
    const base = 'inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide';
    const map: Record<string, string> = {
      pending:  'bg-surface text-muted',
      selected: 'bg-sky-500/20 text-sky-700 dark:text-sky-300',
      deleting: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
      deleted:  'bg-green-500/20 text-green-700 dark:text-green-300',
      failed:   'bg-red-500/20 text-red-600 dark:text-red-400',
    };
    return `${base} ${map[status] ?? ''}`;
  };

  const getDisplayPath = (fullPath: string): string => {
    if (!rootPath) return fullPath;
    const normalizedRoot = rootPath.replace(/\\/g, '/').replace(/\/$/, '');
    const normalizedFull = fullPath.replace(/\\/g, '/');
    if (normalizedFull.startsWith(normalizedRoot)) {
      const relativePath = normalizedFull.substring(normalizedRoot.length);
      const cleanPath = relativePath.replace(/^\//, '');
      const separator = fullPath.includes('\\') ? '\\' : '/';
      return `...${separator}${cleanPath.replace(/\//g, separator)}`;
    }
    return fullPath;
  };

  const handleOpenFolder = async (path: string) => {
    try {
      await invoke('open_folder', { path });
    } catch (error) {
      console.error('Failed to open folder:', error);
      alert(`Failed to open folder: ${error}`);
    }
  };

  return (
    <div className="h-[calc(100%-3rem)]">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold text-foreground">Found Folders</h2>
        <div className="text-sm font-medium text-muted bg-surface px-3 py-1.5 rounded-lg">
          {selectedCount} of {folders.length} selected
        </div>
      </div>

      <div className="h-[calc(100%-3rem)] overflow-y-auto border border-border rounded-xl shadow-inner">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-surface z-10 shadow-sm">
            <tr>
              <th className="w-12 text-center p-4 text-left text-sm font-bold text-foreground border-b-2 border-border">
                <Checkbox
                  aria-label="Select all folders"
                  checked={allSelected}
                  onChange={onToggleAll}
                  disabled={deletableCount === 0}
                  className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary/20"
                />
              </th>
              <th
                className="p-4 text-left text-sm font-bold text-foreground border-b-2 border-border cursor-pointer select-none transition-all duration-150 hover:bg-surface-hover"
                onClick={() => handleSort('path')}
              >
                <span className="flex items-center gap-2">
                  Path{' '}
                  <span className="text-primary">
                    {sortField === 'path' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </span>
                </span>
              </th>
              <th
                className="w-[130px] text-right p-4 text-sm font-bold text-foreground border-b-2 border-border cursor-pointer select-none transition-all duration-150 hover:bg-surface-hover"
                onClick={() => handleSort('size')}
              >
                <span className="flex items-center justify-end gap-2">
                  Size{' '}
                  <span className="text-primary">
                    {sortField === 'size' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </span>
                </span>
              </th>
              <th className="w-[130px] p-4 text-left text-sm font-bold text-foreground border-b-2 border-border">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedFolders.map((folder) => {
              const isSelected = folder.status === Status.Selected;
              const isDeleted = folder.status === Status.Deleted;
              const canSelect = folder.status === Status.Pending || isSelected;

              return (
                <tr key={folder.path} className="hover:bg-surface transition-colors duration-150">
                  <td className="text-center p-3.5 text-sm border-b border-border">
                    <Checkbox
                      aria-label={`Select ${folder.path}`}
                      checked={isSelected}
                      onChange={() => onToggleSelection(folder.path)}
                      disabled={!canSelect}
                      className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary/20"
                    />
                  </td>
                  <td
                    className="p-3.5 text-sm font-mono border-b border-border max-w-[500px] overflow-hidden text-ellipsis whitespace-nowrap"
                    title={folder.path}
                  >
                    <span
                      className={
                        isDeleted
                          ? 'opacity-50 text-muted'
                          : 'text-primary cursor-pointer underline decoration-primary underline-offset-2 transition-colors'
                      }
                      onClick={() => isDeleted ? null : handleOpenFolder(folder.path)}
                    >
                      {getDisplayPath(folder.path)}
                    </span>
                    {folder.error && (
                      <div className="text-red-500 text-sm italic mt-1">
                        {folder.error}
                      </div>
                    )}
                  </td>
                  <td
                    className={
                      (isDeleted ? 'opacity-50' : '') +
                      ' text-right p-3.5 text-sm font-medium border-b border-border text-foreground'
                    }
                  >
                    {formatBytes(folder.sizeBytes)}
                  </td>
                  <td className="p-3.5 text-sm border-b border-border">
                    <span className={getStatusClass(folder.status)}>
                      {folder.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;
