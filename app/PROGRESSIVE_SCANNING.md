# Progressive Scanning Feature

## Overview

Implemented real-time progressive scanning that updates the UI as folders are found, eliminating long waits for large directory scans.

## Changes Made

### Backend (Rust)

#### 1. New Event Models
**File**: [src-tauri/src/cleaner/models.rs](src-tauri/src/cleaner/models.rs)

Added events for streaming scan results:

```rust
#[derive(Debug, Serialize, Clone)]
pub struct ScanProgressEvent {
    pub folder: ScanFolderMatch,
}

#[derive(Debug, Serialize, Clone)]
pub struct ScanCompleteEvent {
    pub total: usize,
}
```

Also added `Clone` derive to `ScanFolderMatch` for event emission.

#### 2. New Progressive Scan Functions
**File**: [src-tauri/src/cleaner/scan.rs](src-tauri/src/cleaner/scan.rs)

Added `scan_dirs_with_progress()` and `scan_dirs_recursive_with_progress()`:

- Emits `scan-progress` event for each folder found
- Emits `scan-complete` event when scan finishes
- Runs in background thread to keep UI responsive

```rust
pub fn scan_dirs_with_progress(req: &ScanRequest, app_handle: AppHandle) {
    // ... scan logic ...

    // Emit event for each found folder
    let _ = app_handle.emit("scan-progress", ScanProgressEvent { folder });

    // Emit completion
    let _ = app_handle.emit("scan-complete", ScanCompleteEvent { total: count });
}
```

#### 3. Updated Tauri Command
**File**: [src-tauri/src/commands.rs](src-tauri/src/commands.rs)

Changed `scan_dirs` command to run in background:

```rust
#[tauri::command]
pub async fn scan_dirs(request: ScanRequest, app_handle: AppHandle) -> Result<(), String> {
    std::thread::spawn(move || {
        scan::scan_dirs_with_progress(&request, app_handle);
    });
    Ok(())
}
```

### Frontend (TypeScript/React)

#### 1. New TypeScript Types
**File**: [src/types/ipc.ts](src/types/ipc.ts)

Added event interfaces:

```typescript
export interface ScanProgressEvent {
  folder: ScanFolderMatch;
}

export interface ScanCompleteEvent {
  total: number;
}
```

#### 2. Event Listeners
**File**: [src/App.tsx](src/App.tsx)

Added listeners for scan events:

```typescript
// Listen for scan progress events
listen<ScanProgressEvent>('scan-progress', (event) => {
  const { folder } = event.payload;
  setFolders((prev) => [
    ...prev,
    {
      path: folder.path,
      sizeBytes: folder.sizeBytes,
      status: 'selected',
    },
  ]);
});

// Listen for scan complete events
listen<ScanCompleteEvent>('scan-complete', () => {
  setIsScanning(false);
});
```

#### 3. Updated Scan Handler

Changed `handleScan` to:
- Clear previous results before starting
- Not wait for response (results come via events)
- Handle errors by stopping scan state

```typescript
const handleScan = async () => {
  // Clear previous results
  setFolders([]);
  setIsScanning(true);

  try {
    const request: ScanRequest = {
      root,
      patterns,
      skip_nested: skipNested,
    };

    // Start scanning - results will come via events
    await invoke('scan_dirs', { request });
  } catch (error) {
    console.error('Scan error:', error);
    alert(`Error scanning: ${error}`);
    setIsScanning(false);
  }
};
```

## How It Works

### Before (Blocking)
1. User clicks "Scan"
2. UI freezes/waits
3. Backend scans entire directory tree
4. Returns all results at once
5. UI updates with all folders

**Problem**: Long wait for large directories (minutes)

### After (Progressive)
1. User clicks "Scan"
2. UI shows "Scanning..." immediately
3. Backend starts scan in background thread
4. **As each folder is found**:
   - Backend emits `scan-progress` event
   - Frontend immediately adds folder to table
   - User sees results appearing in real-time
5. When scan completes, backend emits `scan-complete`
6. UI updates to "Scan complete"

**Benefits**: Instant feedback, no waiting!

## User Experience

### Large Directory Example

Scanning `C:\Projects` with 50 node_modules folders:

**Before**:
- Click scan → wait 2 minutes → see all 50 at once

**After**:
- Click scan → see first folder in 2 seconds
- Folders continuously appear as found
- All 50 visible within 2 minutes
- Can interact with early results while scan continues

### Visual Feedback

- Table updates in real-time
- Folders appear one by one with their sizes
- "Scanning..." button shows progress
- Can scroll through results while scan is still running

## Performance Notes

1. **Background Thread**: Scan runs in separate thread, UI stays responsive
2. **Event Overhead**: Minimal - only ~100 bytes per event
3. **Size Calculation**: Still computed per-folder (may slow large dirs)
4. **Memory**: Folders stored incrementally, no memory spike

## Testing

Run the app and scan a large directory:

```bash
cd app
npm run tauri:dev
```

1. Select a root directory with many subprojects
2. Click "Scan for Folders"
3. Watch folders appear in real-time
4. UI remains responsive during scan

## Future Enhancements

Possible improvements:

1. **Progress indicator**: Show "X folders found so far"
2. **Cancel scan**: Add button to stop scanning
3. **Batch events**: Send folders in batches of 10 for fewer events
4. **Lazy sizing**: Calculate sizes on-demand instead of during scan
5. **Scan statistics**: Show directories scanned, files checked, etc.

## Technical Details

### Thread Safety
- Each scan runs in its own thread
- Events are thread-safe via Tauri's event system
- No shared mutable state between scans

### Event Flow
```
Rust Thread          →  Tauri Events  →  React Frontend
scan_dirs_with_progress
  ├─ find folder 1  →  scan-progress  →  append to state
  ├─ find folder 2  →  scan-progress  →  append to state
  ├─ find folder 3  →  scan-progress  →  append to state
  └─ scan done      →  scan-complete  →  setIsScanning(false)
```

The progressive scanning feature significantly improves the user experience for large directory scans!
