import React, { useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FolderRow } from '../types/ipc';

type SortField = 'path' | 'size';
type SortDirection = 'asc' | 'desc';

interface ResultsTableProps {
  folders: FolderRow[];
  rootPath: string;
  onToggleSelection: (path: string) => void;
  onToggleAll: () => void;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ folders, rootPath, onToggleSelection, onToggleAll }) => {
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
  const deletableCount = folders.filter((f) =>
    f.status === 'pending' || f.status === 'selected'
  ).length;
  const allSelected = deletableCount > 0 && selectedCount === deletableCount;

  // Early return AFTER all hooks
  if (folders.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p className="mb-4">No folders found yet.</p>
        <p>Select a root directory and click "Scan for Folders" to get started.</p>
      </div>
    );
  }

  const formatSize = (bytes: number | null): string => {
    if (bytes === null) return 'N/A';
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getStatusClass = (status: string): string => {
    const baseClasses = 'inline-block px-2 py-1 rounded-sm text-[11px] font-semibold uppercase';
    const statusClasses = {
      pending: 'bg-gray-200 text-gray-700',
      selected: 'bg-blue-100 text-blue-800',
      deleting: 'bg-yellow-100 text-yellow-800',
      deleted: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return `${baseClasses} ${statusClasses[status as keyof typeof statusClasses] || ''}`;
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Found Folders</h2>
        <div className="text-sm text-gray-600">
          {selectedCount} of {folders.length} selected
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto border border-gray-300 rounded">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>
              <th className="w-10 text-center p-3 text-left text-[13px] font-semibold text-gray-700 border-b-2 border-gray-300">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  disabled={deletableCount === 0}
                  className="w-4 h-4 cursor-pointer"
                />
              </th>
              <th
                className="p-3 text-left text-[13px] font-semibold text-gray-700 border-b-2 border-gray-300 cursor-pointer select-none transition-colors hover:bg-gray-100"
                onClick={() => handleSort('path')}
              >
                Path {sortField === 'path' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th
                className="w-[120px] text-right p-3 text-[13px] font-semibold text-gray-700 border-b-2 border-gray-300 cursor-pointer select-none transition-colors hover:bg-gray-100"
                onClick={() => handleSort('size')}
              >
                Size {sortField === 'size' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th className="w-[120px] p-3 text-left text-[13px] font-semibold text-gray-700 border-b-2 border-gray-300">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedFolders.map((folder) => {
              const canSelect = folder.status === 'pending' || folder.status === 'selected';
              const isSelected = folder.status === 'selected';

              return (
                <tr key={folder.path} className="hover:bg-gray-50">
                  <td className="text-center p-2.5 text-[13px] border-b border-gray-200">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelection(folder.path)}
                      disabled={!canSelect}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="p-2.5 text-[12px] font-mono border-b border-gray-200 max-w-[500px] overflow-hidden text-ellipsis whitespace-nowrap" title={folder.path}>
                    <span
                      className="text-blue-600 cursor-pointer underline transition-colors hover:text-blue-700"
                      onClick={() => handleOpenFolder(folder.path)}
                    >
                      {getDisplayPath(folder.path)}
                    </span>
                    {folder.error && (
                      <div className="text-red-600 text-[12px] italic">{folder.error}</div>
                    )}
                  </td>
                  <td className="text-right p-2.5 text-[13px] border-b border-gray-200">{formatSize(folder.sizeBytes)}</td>
                  <td className="p-2.5 text-[13px] border-b border-gray-200">
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
