import React, { useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FolderRow } from '../types/ipc';
import { formatBytes } from '../utils/formatBytes';

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
  // All hooks must be called before any early returns
  const [sortField, setSortField] = useState<SortField>('path');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default direction
      setSortField(field);
      setSortDirection(field === 'size' ? 'desc' : 'asc'); // Size defaults to largest first
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

  // Early return AFTER all hooks
  if (folders.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p className="mb-4">No folders found yet.</p>
        <p>
          Select a root directory and click "Scan for Folders" to get started.
        </p>
      </div>
    );
  }

  const getStatusClass = (status: string): string => {
    const baseClasses =
      'inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide shadow-sm';
    const statusClasses = {
      pending: 'bg-gray-200 text-gray-700',
      selected: 'bg-blue-100 text-blue-800',
      deleting: 'bg-yellow-100 text-yellow-800',
      deleted: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return `${baseClasses} ${
      statusClasses[status as keyof typeof statusClasses] || ''
    }`;
  };

  const getDisplayPath = (fullPath: string): string => {
    if (!rootPath) return fullPath;

    // Normalize paths for comparison (handle both forward and back slashes)
    const normalizedRoot = rootPath.replace(/\\/g, '/').replace(/\/$/, '');
    const normalizedFull = fullPath.replace(/\\/g, '/');

    if (normalizedFull.startsWith(normalizedRoot)) {
      const relativePath = normalizedFull.substring(normalizedRoot.length);
      // Remove leading slash and replace forward slashes with backslashes on Windows
      const cleanPath = relativePath.replace(/^\//, '');
      // Restore original path separator style from the full path
      const separator = fullPath.includes('\\') ? '\\' : '/';
      const displayPath = cleanPath.replace(/\//g, separator);
      return `...${separator}${displayPath}`;
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
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold text-gray-800">Found Folders</h2>
        <div className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
          {selectedCount} of {folders.length} selected
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto border border-gray-300 rounded-xl shadow-inner">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 z-10 shadow-sm">
            <tr>
              <th className="w-12 text-center p-4 text-left text-sm font-bold text-gray-700 border-b-2 border-gray-300">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  disabled={deletableCount === 0}
                  className="w-5 h-5 text-primary rounded cursor-pointer focus:ring-2 focus:ring-primary/20"
                />
              </th>
              <th
                className="p-4 text-left text-sm font-bold text-gray-700 border-b-2 border-gray-300 cursor-pointer select-none transition-all duration-150 hover:bg-gray-200/50"
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
                className="w-[130px] text-right p-4 text-sm font-bold text-gray-700 border-b-2 border-gray-300 cursor-pointer select-none transition-all duration-150 hover:bg-gray-200/50"
                onClick={() => handleSort('size')}
              >
                <span className="flex items-center justify-end gap-2">
                  Size{' '}
                  <span className="text-primary">
                    {sortField === 'size' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </span>
                </span>
              </th>
              <th className="w-[130px] p-4 text-left text-sm font-bold text-gray-700 border-b-2 border-gray-300">
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
                <tr key={folder.path} className="hover:bg-primary/30 transition-colors duration-150">
                  <td className="text-center p-3.5 text-sm border-b border-gray-200">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelection(folder.path)}
                      disabled={!canSelect}
                      className="w-5 h-5 text-primary rounded cursor-pointer focus:ring-2 focus:ring-primary/20"
                    />
                  </td>
                  <td
                    className="p-3.5 text-sm font-mono border-b border-gray-200 max-w-[500px] overflow-hidden text-ellipsis whitespace-nowrap"
                    title={folder.path}
                  >
                    <span
                      className={
                        isDeleted
                          ? 'opacity-50'
                          : 'text-primary cursor-pointer underline decoration-primary underline-offset-2 transition-colors hover:text-primary hover:decoration-primary'
                      }
                      onClick={() =>
                        isDeleted ? null : handleOpenFolder(folder.path)
                      }
                    >
                      {getDisplayPath(folder.path)}
                    </span>
                    {folder.error && (
                      <div className="text-red-600 text-sm italic mt-1">
                        {folder.error}
                      </div>
                    )}
                  </td>
                  <td
                    className={
                      (isDeleted ? 'opacity-50' : '') +
                      ' text-right p-3.5 text-sm font-medium border-b border-gray-200'
                    }
                  >
                    {formatBytes(folder.sizeBytes)}
                  </td>
                  <td className="p-3.5 text-sm border-b border-gray-200">
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
