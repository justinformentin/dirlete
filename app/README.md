# Dirlete

A cross-platform desktop application for efficiently deleting `node_modules`, `.next`, and other folder patterns.

## Features

- **Pattern-based scanning**: Search for folders by name patterns (e.g., `node_modules`, `.next`, `dist`)
- **Skip nested matches**: Avoid scanning inside already matched folders for better performance
- **Multi-strategy deletion**: Uses multiple deletion strategies on Windows to handle locked/protected files
- **Progress tracking**: Real-time progress updates during deletion
- **Cross-platform**: Works on Windows, macOS, and Linux

## Tech Stack

- **Desktop shell**: Tauri 2
- **Backend**: Rust
- **Frontend**: React + TypeScript (with Vite)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri prerequisites](https://tauri.app/v2/guides/getting-started/prerequisites/)

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run in development mode:
   ```bash
   npm run tauri:dev
   ```

### Building

Build the application for production:

```bash
npm run tauri:build
```

This will create platform-specific installers in `src-tauri/target/release/bundle/`.

## Usage

1. **Select root directory**: Click "Browse..." to choose the directory to scan
2. **Configure patterns**: Specify folder names to search for (comma-separated)
3. **Scan**: Click "Scan for Folders" to find matching directories
4. **Review results**: Check/uncheck folders in the results table
5. **Delete**: Click "Delete X Selected Folder(s)" to remove selected directories

## Deletion Strategies

### Windows
1. Standard `remove_dir_all`
2. Clear read-only attributes and retry
3. Use long path prefix (`\\?\`) for deep paths
4. Robocopy mirror trick (empties folder then deletes)
5. `cmd /C rd /s /q` fallback

### macOS/Linux
1. Standard `remove_dir_all`
2. Fix permissions and retry
3. `rm -rf` fallback

## Project Structure

```
app/
  src/                    # React frontend
    components/           # UI components
    types/               # TypeScript types
    App.tsx              # Main application
    main.tsx             # Entry point
  src-tauri/             # Rust backend
    src/
      cleaner/           # Core deletion logic
        models.rs        # Data models
        scan.rs          # Folder scanning
        delete.rs        # Deletion orchestration
        platform/        # OS-specific implementations
          windows.rs
          unix.rs
      commands.rs        # Tauri IPC commands
      main.rs            # Application entry
```

## License

See parent repository for license information.
