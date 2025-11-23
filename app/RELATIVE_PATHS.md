# Relative Path Display

## Implementation

Updated the path display in the results table to show relative paths instead of full absolute paths, making the UI cleaner and easier to read.

### Changes Made

#### 1. Updated ResultsTable Component
**File**: [src/components/ResultsTable.tsx](src/components/ResultsTable.tsx)

**Added `rootPath` prop**:
```typescript
interface ResultsTableProps {
  folders: FolderRow[];
  rootPath: string;  // ← Added
  onToggleSelection: (path: string) => void;
  onToggleAll: () => void;
}
```

**Added `getDisplayPath()` helper function**:
```typescript
const getDisplayPath = (fullPath: string): string => {
  if (!rootPath) return fullPath;

  // Normalize paths for comparison (handle both forward and back slashes)
  const normalizedRoot = rootPath.replace(/\\/g, '/').replace(/\/$/, '');
  const normalizedFull = fullPath.replace(/\\/g, '/');

  if (normalizedFull.startsWith(normalizedRoot)) {
    const relativePath = normalizedFull.substring(normalizedRoot.length);
    // Remove leading slash
    const cleanPath = relativePath.replace(/^\//, '');
    // Restore original path separator style from the full path
    const separator = fullPath.includes('\\') ? '\\' : '/';
    const displayPath = cleanPath.replace(/\//g, separator);
    return `...${separator}${displayPath}`;
  }

  return fullPath;
};
```

**Updated table cell to use display path**:
```typescript
<td className="path-cell" title={folder.path}>
  {getDisplayPath(folder.path)}  {/* ← Changed from {folder.path} */}
  {folder.error && (
    <div className="error-cell">{folder.error}</div>
  )}
</td>
```

#### 2. Updated App Component
**File**: [src/App.tsx](src/App.tsx)

**Passed rootPath to ResultsTable**:
```typescript
<ResultsTable
  folders={folders}
  rootPath={root}  {/* ← Added */}
  onToggleSelection={handleToggleSelection}
  onToggleAll={handleToggleAll}
/>
```

### Examples

#### Before (Full Paths):
```
Path                                                    | Size      | Status
C:\Users\Justin\Desktop\apps\app1\node_modules        | 487.23 MB | selected
C:\Users\Justin\Desktop\apps\app1\.next               | 12.45 MB  | selected
C:\Users\Justin\Desktop\apps\app2\node_modules        | 322.11 MB | selected
```

#### After (Relative Paths):
```
Path                          | Size      | Status
...\app1\node_modules        | 487.23 MB | selected
...\app1\.next               | 12.45 MB  | selected
...\app2\node_modules        | 322.11 MB | selected
```

**Root path**: `C:\Users\Justin\Desktop\apps`

### Features

✅ **Cross-platform**: Works on Windows (`\`), macOS, and Linux (`/`)
✅ **Preserves separator style**: Uses the same separator as the original path
✅ **Full path in tooltip**: Hover over path to see complete absolute path
✅ **Handles edge cases**: Falls back to full path if it doesn't start with root

### Path Separator Handling

The function intelligently handles different path separators:

1. **Normalizes for comparison**: Converts all separators to `/` for string matching
2. **Detects original style**: Checks if original path uses `\` or `/`
3. **Restores original style**: Converts display path back to match original

This ensures:
- Windows paths: `...\folder\subfolder`
- Unix paths: `.../folder/subfolder`

### Benefits

1. **Cleaner UI**: Removes repetitive root path prefix
2. **Easier scanning**: Quickly identify which project/subfolder contains the match
3. **Better UX**: Less clutter in the table
4. **Still accessible**: Full path available on hover (title attribute)

### Testing

Run the app and test:
```bash
cd app
npm run tauri:dev
```

1. Select a root directory (e.g., `C:\Users\Justin\Desktop\apps`)
2. Scan for folders
3. Observe paths displayed as `...\project\node_modules` instead of full paths
4. Hover over paths to see full absolute path in tooltip
