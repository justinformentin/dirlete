# Directory Size Calculation

## Implementation

Added directory size calculation to the scanner so users can see how much space each folder is taking up.

### Changes Made

**File**: [src-tauri/src/cleaner/scan.rs](src-tauri/src/cleaner/scan.rs)

#### 1. Added `calculate_dir_size()` Function

```rust
fn calculate_dir_size(path: &Path) -> Option<u64> {
    let mut total_size = 0u64;

    let walker = WalkDir::new(path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok());

    for entry in walker {
        if let Ok(metadata) = entry.metadata() {
            if metadata.is_file() {
                total_size = total_size.saturating_add(metadata.len());
            }
        }
    }

    Some(total_size)
}
```

**Features**:
- Recursively walks through all files in the directory
- Uses `saturating_add` to prevent overflow
- Returns `Option<u64>` (Some with byte count)
- Skips symbolic links to avoid infinite loops
- Gracefully handles errors (skips inaccessible files)

#### 2. Updated Both Scan Paths

**Non-nested scan** (lines 41-49):
```rust
if patterns.contains(name) {
    let path = entry.path();
    let path_str = path.to_string_lossy().to_string();
    let size_bytes = calculate_dir_size(path);  // ← Added

    matches.push(ScanFolderMatch {
        path: path_str,
        size_bytes,
    });
}
```

**Nested scan** (lines 88-96):
```rust
if patterns.contains(&name) {
    let path = entry.path();
    let path_str = path.to_string_lossy().to_string();
    let size_bytes = calculate_dir_size(&path);  // ← Added

    matches.push(ScanFolderMatch {
        path: path_str,
        size_bytes,
    });
}
```

### Frontend Display

The size is automatically formatted in the `ResultsTable` component using the `formatSize()` function:

```typescript
const formatSize = (bytes: number | null): string => {
  if (bytes === null) return 'N/A';
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
```

### Performance Considerations

**Important**: Size calculation involves walking the entire directory tree, which can be slow for very large folders (e.g., node_modules with thousands of files).

**Behavior**:
- Scanning happens in the background (async Tauri command)
- UI remains responsive during scan
- Each folder is sized independently
- Errors during sizing are handled gracefully (folder still appears in results)

### Example Output

Before (without size):
```
Path                           | Size  | Status
C:\project\node_modules        | N/A   | selected
C:\project\.next               | N/A   | selected
```

After (with size):
```
Path                           | Size      | Status
C:\project\node_modules        | 487.23 MB | selected
C:\project\.next               | 12.45 MB  | selected
```

### Testing

Run the app and scan a directory:
```bash
cd app
npm run tauri:dev
```

1. Select a root directory
2. Click "Scan for Folders"
3. Wait for scan to complete
4. Check the "Size" column - should show actual folder sizes

### Future Optimizations

If performance becomes an issue with very large directories:

1. **Optional size calculation**: Add checkbox to enable/disable sizing
2. **Lazy loading**: Calculate size on-demand when user hovers/clicks
3. **Caching**: Cache sizes and update only when needed
4. **Parallel sizing**: Use rayon to calculate sizes in parallel
5. **Approximate sizing**: Quick estimation instead of exact count

For now, the current implementation provides accurate sizes with reasonable performance for typical use cases.
