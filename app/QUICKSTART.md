# Quick Start Guide

## Installation

1. **Install dependencies**:
   ```bash
   cd app
   npm install
   ```

2. **Run the app in development mode**:
   ```bash
   npm run tauri:dev
   ```

   This will:
   - Start the Vite dev server
   - Compile the Rust backend
   - Launch the Tauri window

## First Run

The first time you run `npm run tauri:dev`, it may take a few minutes to:
- Download and compile Rust dependencies
- Set up the Tauri environment

Subsequent runs will be much faster.

## Building for Production

To create a distributable application:

```bash
npm run tauri:build
```

The built application will be in:
- **Windows**: `src-tauri/target/release/bundle/msi/` or `src-tauri/target/release/bundle/nsis/`
- **macOS**: `src-tauri/target/release/bundle/dmg/` or `src-tauri/target/release/bundle/macos/`
- **Linux**: `src-tauri/target/release/bundle/deb/` or `src-tauri/target/release/bundle/appimage/`

## Troubleshooting

### "tauri: command not found"
Make sure you've run `npm install` to install dependencies including `@tauri-apps/cli`.

### Rust compilation errors
Ensure you have the latest stable Rust toolchain:
```bash
rustup update stable
```

### Windows-specific: Missing build tools
Install the [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

### macOS-specific: Missing Xcode
Install Xcode Command Line Tools:
```bash
xcode-select --install
```

## Development Tips

- **Hot reload**: The frontend has hot module replacement (HMR). Changes to React components will update instantly.
- **Rust changes**: Require a full rebuild. The app will restart automatically when you save Rust files.
- **Debugging**:
  - Frontend: Use browser DevTools (right-click → "Inspect Element")
  - Backend: Add `println!()` statements in Rust code

## Project Commands

- `npm run dev` - Start Vite dev server only (no Tauri window)
- `npm run build` - Build frontend only
- `npm run tauri:dev` - Run full app in development
- `npm run tauri:build` - Build production app
