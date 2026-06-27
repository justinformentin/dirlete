import { ArrowDown, ArrowUp, Folder, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../../ui/Button';
import DualRangeSlider from '../../ui/DualRangeSlider';
import SidebarSection from '../../ui/SidebarSection';
import { StatusFilter, VideoSortBy, SortDir } from '../../types/ipc';
import { formatBytes, formatDuration } from '../../utils/formatBytes';

interface VideoSidebarProps {
  root: string;
  total: number;
  filteredCount: number;
  unmarkedCount: number;
  keepCount: number;
  skipCount: number;
  deleteCount: number;
  isScanning: boolean;
  isDeleting: boolean;
  onPickFolder: () => void;
  onScan: () => void;
  // Filter
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  sizeFilter: [number, number] | null;
  maxSizeBytes: number;
  onSizeFilterChange: (range: [number, number] | null) => void;
  durationFilter: [number, number] | null;
  maxDurationSeconds: number;
  onDurationFilterChange: (range: [number, number] | null) => void;
  // Sort
  groupByFolder: boolean;
  onGroupByFolderChange: (value: boolean) => void;
  folderSortDir: SortDir;
  onFolderSortDirChange: (dir: SortDir) => void;
  itemSortBy: VideoSortBy;
  onItemSortByChange: (by: VideoSortBy) => void;
  itemSortDir: SortDir;
  onItemSortDirChange: (dir: SortDir) => void;
  // View
  cardSize: number;
  onCardSizeChange: (size: number) => void;
}

function StatusPill({
  label,
  count,
  active,
  colorClass,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  colorClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex flex-col items-center justify-center py-2 rounded-lg text-center w-full transition-colors',
        active
          ? 'ring-1 ring-purple-500 bg-purple-500/10'
          : 'bg-surface hover:bg-surface-hover',
      ].join(' ')}
    >
      <span className={`text-base font-semibold leading-none ${colorClass ?? 'text-foreground'}`}>{count}</span>
      <span className="text-[10px] text-subtle uppercase tracking-wide mt-0.5">{label}</span>
    </button>
  );
}

function SortRow({
  label,
  sortBy,
  sortDir,
  onSortByChange,
  onSortDirChange,
}: {
  label: string;
  sortBy: VideoSortBy;
  sortDir: SortDir;
  onSortByChange: (by: VideoSortBy) => void;
  onSortDirChange: (dir: SortDir) => void;
}) {
  return (
    <div>
      <p className="text-[10px] text-subtle uppercase tracking-widest mb-1.5">{label}</p>
      <div className="flex gap-1.5">
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as VideoSortBy)}
          className="flex-1 bg-surface text-foreground text-xs rounded-md px-2 py-1.5 border border-border cursor-pointer outline-none focus:ring-1 focus:ring-purple-500"
        >
          <option value="name">Name</option>
          <option value="size">Size</option>
          <option value="duration">Duration</option>
          <option value="date">Date</option>
        </select>
        <button
          onClick={() => onSortDirChange(sortDir === 'asc' ? 'desc' : 'asc')}
          title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          className="p-1.5 bg-surface hover:bg-surface-hover border border-border rounded-md text-muted hover:text-foreground transition-colors"
        >
          {sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export default function VideoSidebar({
  root, total, filteredCount, unmarkedCount, keepCount, skipCount, deleteCount,
  isScanning, isDeleting,
  onPickFolder, onScan,
  statusFilter, onStatusFilterChange,
  sizeFilter, maxSizeBytes, onSizeFilterChange,
  durationFilter, maxDurationSeconds, onDurationFilterChange,
  groupByFolder, onGroupByFolderChange,
  folderSortDir, onFolderSortDirChange,
  itemSortBy, onItemSortByChange,
  itemSortDir, onItemSortDirChange,
  cardSize, onCardSizeChange,
}: VideoSidebarProps) {
  const isFiltered = statusFilter !== 'all' || sizeFilter !== null || durationFilter !== null;
  const sizeStep = maxSizeBytes > 0 ? Math.max(1024, Math.pow(2, Math.floor(Math.log2(maxSizeBytes / 200)))) : 1;
  const [draftSizeRange, setDraftSizeRange] = useState<[number, number]>(sizeFilter ?? [0, maxSizeBytes]);
  const [draftDurationRange, setDraftDurationRange] = useState<[number, number]>(durationFilter ?? [0, maxDurationSeconds]);

  useEffect(() => setDraftSizeRange(sizeFilter ?? [0, maxSizeBytes]), [sizeFilter, maxSizeBytes]);
  useEffect(() => setDraftDurationRange(durationFilter ?? [0, maxDurationSeconds]), [durationFilter, maxDurationSeconds]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const isFullRange = draftSizeRange[0] <= 0 && draftSizeRange[1] >= maxSizeBytes;
      const next = isFullRange ? null : draftSizeRange;
      if (JSON.stringify(next) !== JSON.stringify(sizeFilter)) onSizeFilterChange(next);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [draftSizeRange, maxSizeBytes, onSizeFilterChange, sizeFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const isFullRange = draftDurationRange[0] <= 0 && draftDurationRange[1] >= maxDurationSeconds;
      const next = isFullRange ? null : draftDurationRange;
      if (JSON.stringify(next) !== JSON.stringify(durationFilter)) onDurationFilterChange(next);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [draftDurationRange, maxDurationSeconds, onDurationFilterChange, durationFilter]);

  return (
    <div className="p-4 space-y-5 text-sm">
      <SidebarSection title="Current Folder" withDivider={false}>
        <p className="text-xs text-muted font-mono truncate mb-2.5 leading-relaxed" title={root}>{root || 'None selected'}</p>
        <div className="flex gap-2">
          <Button onClick={onPickFolder} disabled={isScanning || isDeleting} size="xs" className="flex-1">Change</Button>
          <Button onClick={onScan} disabled={isScanning || isDeleting || !root} size="xs" className="flex-1">{isScanning ? 'Scanning…' : 'Rescan'}</Button>
        </div>
      </SidebarSection>

      {total > 0 && (
        <>
          <SidebarSection>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Filters</p>
              {isFiltered && (
                <span className="text-[10px] text-purple-400 font-medium tabular-nums">
                  {filteredCount} / {total}
                </span>
              )}
            </div>

            {/* Status filter */}
            <div className="mb-3">
              <button
                onClick={() => onStatusFilterChange('all')}
                className={[
                  'flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs mb-2 transition-colors',
                  statusFilter === 'all'
                    ? 'bg-purple-500/10 ring-1 ring-purple-500 text-foreground'
                    : 'bg-surface hover:bg-surface-hover text-muted',
                ].join(' ')}
              >
                <span className="font-medium">All videos</span>
                <span className="font-semibold text-foreground">{total}</span>
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <StatusPill label="Pending" count={unmarkedCount} active={statusFilter === 'pending'} onClick={() => onStatusFilterChange(statusFilter === 'pending' ? 'all' : 'pending')} />
                <StatusPill label="Keep" count={keepCount} active={statusFilter === 'keep'} colorClass="text-green-400" onClick={() => onStatusFilterChange(statusFilter === 'keep' ? 'all' : 'keep')} />
                <StatusPill label="Skipped" count={skipCount} active={statusFilter === 'skip'} colorClass="text-muted" onClick={() => onStatusFilterChange(statusFilter === 'skip' ? 'all' : 'skip')} />
                <StatusPill label="Delete" count={deleteCount} active={statusFilter === 'delete'} colorClass="text-red-400" onClick={() => onStatusFilterChange(statusFilter === 'delete' ? 'all' : 'delete')} />
              </div>
            </div>

            {/* Size filter */}
            {maxSizeBytes > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-subtle uppercase tracking-widest">File Size</p>
                  {sizeFilter && (
                    <button onClick={() => { setDraftSizeRange([0, maxSizeBytes]); onSizeFilterChange(null); }} className="text-muted hover:text-foreground transition-colors" title="Clear size filter">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <DualRangeSlider
                  min={0}
                  max={maxSizeBytes}
                  step={sizeStep}
                  value={draftSizeRange}
                  onChange={setDraftSizeRange}
                  formatLabel={(v) => formatBytes(v)}
                />
              </div>
            )}

            {/* Duration filter */}
            {maxDurationSeconds > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-subtle uppercase tracking-widest">Duration</p>
                  {durationFilter && (
                    <button onClick={() => { setDraftDurationRange([0, maxDurationSeconds]); onDurationFilterChange(null); }} className="text-muted hover:text-foreground transition-colors" title="Clear duration filter">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <DualRangeSlider
                  min={0}
                  max={maxDurationSeconds}
                  step={1}
                  value={draftDurationRange}
                  onChange={setDraftDurationRange}
                  formatLabel={(v) => formatDuration(v)}
                />
              </div>
            )}
          </SidebarSection>

          <SidebarSection title="Sort">
            <div className="space-y-3">
              {/* Group by folder toggle */}
              <button
                onClick={() => onGroupByFolderChange(!groupByFolder)}
                className={[
                  'flex items-center gap-2 w-full px-3 py-2 text-xs rounded-md border transition-colors',
                  groupByFolder
                    ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                    : 'bg-surface border-border text-muted hover:text-foreground hover:bg-surface-hover',
                ].join(' ')}
              >
                <Folder className="w-3.5 h-3.5 shrink-0" />
                Group by folder
              </button>

              {groupByFolder ? (
                <>
                  <SortRow
                    label="Folder Order"
                    sortBy="name"
                    sortDir={folderSortDir}
                    onSortByChange={() => {}}
                    onSortDirChange={onFolderSortDirChange}
                  />
                  <SortRow
                    label="Within Folder"
                    sortBy={itemSortBy}
                    sortDir={itemSortDir}
                    onSortByChange={onItemSortByChange}
                    onSortDirChange={onItemSortDirChange}
                  />
                </>
              ) : (
                <SortRow
                  label="Sort By"
                  sortBy={itemSortBy}
                  sortDir={itemSortDir}
                  onSortByChange={onItemSortByChange}
                  onSortDirChange={onItemSortDirChange}
                />
              )}
            </div>
          </SidebarSection>

          <SidebarSection title="View">
            <p className="text-[10px] text-subtle uppercase tracking-widest mb-2">Card Size</p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={cardSize}
                onChange={(e) => onCardSizeChange(Number(e.target.value))}
                style={{ accentColor: 'var(--theme-primary)' }}
                className="flex-1 cursor-pointer h-1"
              />
              <span className="text-xs text-muted w-9 text-right tabular-nums">{cardSize}%</span>
            </div>
          </SidebarSection>
        </>
      )}
    </div>
  );
}
