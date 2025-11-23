# Dialog Browse Button Fix

## Issue
The "Browse..." button wasn't opening the folder selection dialog.

## Root Cause
Tauri 2 uses a new capabilities-based permission system. The dialog plugin needs explicit permissions configured.

## Changes Made

### 1. Updated RootPicker Component
**File**: [src/components/RootPicker.tsx](src/components/RootPicker.tsx)

- Simplified the dialog result handling (Tauri 2 returns string directly)
- Added error alert for better debugging
- Added dialog title

```typescript
const selected = await open({
  directory: true,
  multiple: false,
  title: 'Select Root Directory',
});

if (selected) {
  onRootChange(selected);
}
```

### 2. Created Capabilities File
**File**: [src-tauri/capabilities/default.json](src-tauri/capabilities/default.json)

Added permissions for:
- Core window operations
- Dialog operations (`dialog:allow-open`, `dialog:default`)

### 3. Updated Tauri Configuration
**File**: [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json)

Changes:
- Added `"label": "main"` to the window (required for capabilities)
- Added `"capabilities": ["default"]` to security config

## Testing

To test the dialog:

1. Run the app:
   ```bash
   cd app
   npm run tauri:dev
   ```

2. Click the "Browse..." button next to "Root Directory"

3. You should see a native folder selection dialog

4. Select a folder and it should populate the input field

## Technical Details

### Tauri 2 Capabilities System
Tauri 2 introduced a capabilities system where:
- Each window must have a `label`
- Permissions are granted through capability files
- The capability file lists all allowed operations
- Windows reference capabilities in `security.capabilities`

### Dialog Plugin Permissions
Required permissions for folder selection:
- `dialog:allow-open` - Allow opening file/folder dialogs
- `dialog:default` - Default dialog permissions

## Verification

✅ Rust compiles without errors
✅ TypeScript builds successfully
✅ Dialog plugin configured with proper permissions
✅ Window labeled for capability matching

The browse button should now work correctly!
