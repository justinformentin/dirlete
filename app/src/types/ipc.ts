// IPC types matching the Rust backend

export interface ScanRequest {
  root: string;
  patterns: string[];
  skip_nested: boolean;
  ignore_paths?: string[];
  use_glob_patterns?: boolean;
}

export interface ScanFolderMatch {
  path: string;
  sizeBytes: number | null;
}

export interface ScanResponse {
  matches: ScanFolderMatch[];
}

export interface ScanProgressEvent {
  folder: ScanFolderMatch;
}

export interface ScanCompleteEvent {
  total: number;
}

export interface DeleteJobRequest {
  jobId?: string;
  folders: string[];
}

export interface DeleteJobStartResponse {
  jobId: string;
}

export type DeleteStatus = "pending" | "selected" | "deleting" | "deleted" | "failed";

export interface FolderRow {
  path: string;
  sizeBytes: number | null;
  status: DeleteStatus;
  error?: string;
}

export interface DeleteProgressEvent {
  jobId: string;
  total: number;
  completed: number;
  currentPath: string | null;
  currentStatus: string;
}

export interface FailedDelete {
  path: string;
  error: string;
  attempts: string[];
  notes: string[];
}

export interface DeleteCompleteEvent {
  jobId: string;
  succeeded: string[];
  failed: FailedDelete[];
}

export interface CancelRequest {
  jobId: string;
}

export interface CancelResponse {
  jobId: string;
  cancelled: boolean;
}

// Video culler types
export type VideoAction = 'keep' | 'delete' | 'skip';

export interface VideoItem {
  path: string;
  sizeBytes: number | null;
  action: VideoAction | null;
  durationSeconds?: number;
}

export interface VideoDisplayItem extends VideoItem {
  globalIndex: number;
}

export type StatusFilter = 'all' | 'pending' | 'keep' | 'skip' | 'delete';
export type VideoSortBy = 'name' | 'size' | 'duration';
export type SortDir = 'asc' | 'desc';

export interface VideoScanProgressEvent {
  path: string;
  sizeBytes: number | null;
}

export interface VideoScanCompleteEvent {
  total: number;
}
