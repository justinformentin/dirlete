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
      <div className="empty-state">
        <p>No folders found yet.</p>
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
    return `status-badge status-${status}`;
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
      <div className="results-header">
        <h2>Found Folders</h2>
        <div className="results-stats">
          {selectedCount} of {folders.length} selected
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="checkbox-cell">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  disabled={deletableCount === 0}
                />
              </th>
              <th className="sortable-header" onClick={() => handleSort('path')}>
                Path {sortField === 'path' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th className="size-cell sortable-header" onClick={() => handleSort('size')}>
                Size {sortField === 'size' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th className="status-cell">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedFolders.map((folder) => {
              const canSelect = folder.status === 'pending' || folder.status === 'selected';
              const isSelected = folder.status === 'selected';

              return (
                <tr key={folder.path}>
                  <td className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelection(folder.path)}
                      disabled={!canSelect}
                    />
                  </td>
                  <td className="path-cell" title={folder.path}>
                    <span
                      className="path-link"
                      onClick={() => handleOpenFolder(folder.path)}
                    >
                      {getDisplayPath(folder.path)}
                    </span>
                    {folder.error && (
                      <div className="error-cell">{folder.error}</div>
                    )}
                  </td>
                  <td className="size-cell">{formatSize(folder.sizeBytes)}</td>
                  <td className="status-cell">
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
