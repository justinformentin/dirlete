use crate::cleaner::models::*;
use anyhow::Result;
use std::collections::HashSet;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use walkdir::WalkDir;

pub fn scan_dirs(req: &ScanRequest) -> Result<ScanResponse> {
    let mut matches = Vec::new();
    let patterns: HashSet<String> = req
        .patterns
        .iter()
        .map(|p| p.trim().to_string())
        .collect();

    if patterns.is_empty() {
        return Ok(ScanResponse { matches });
    }

    if req.skip_nested {
        // Use a manual recursive approach with depth tracking
        scan_dirs_recursive(&req.root, &patterns, &mut matches)?;
    } else {
        // Simple walkdir without nested filtering
        let walker = WalkDir::new(&req.root).follow_links(false);

        for entry in walker {
            let entry = match entry {
                Ok(e) => e,
                Err(_) => continue,
            };

            if !entry.file_type().is_dir() {
                continue;
            }

            let name = match entry.file_name().to_str() {
                Some(s) => s,
                None => continue,
            };

            if patterns.contains(name) {
                let path = entry.path();
                let path_str = path.to_string_lossy().to_string();
                let size_bytes = calculate_dir_size(path);

                matches.push(ScanFolderMatch {
                    path: path_str,
                    size_bytes,
                });
            }
        }
    }

    Ok(ScanResponse { matches })
}

pub fn scan_dirs_with_progress(req: &ScanRequest, app_handle: AppHandle) {
    let patterns: HashSet<String> = req
        .patterns
        .iter()
        .map(|p| p.trim().to_string())
        .collect();

    let ignore_paths: HashSet<String> = req
        .ignore_paths
        .iter()
        .map(|p| p.trim().to_string())
        .collect();

    if patterns.is_empty() {
        let _ = app_handle.emit("scan-complete", ScanCompleteEvent { total: 0 });
        return;
    }

    // Get or create the cancel flag from app state
    let cancel_flag = app_handle
        .state::<Arc<AtomicBool>>()
        .inner()
        .clone();

    // Reset the cancel flag at the start of a new scan
    cancel_flag.store(false, Ordering::Relaxed);

    let mut count = 0;

    if req.skip_nested {
        scan_dirs_recursive_with_progress(&req.root, &patterns, &ignore_paths, &cancel_flag, &app_handle, &mut count);
    } else {
        let walker = WalkDir::new(&req.root).follow_links(false);

        for entry in walker {
            // Check if scan was cancelled
            if cancel_flag.load(Ordering::Relaxed) {
                break;
            }

            let entry = match entry {
                Ok(e) => e,
                Err(_) => continue,
            };

            if !entry.file_type().is_dir() {
                continue;
            }

            let name = match entry.file_name().to_str() {
                Some(s) => s,
                None => continue,
            };

            // Skip ignored directories
            if ignore_paths.contains(name) {
                continue;
            }

            if patterns.contains(name) {
                let path = entry.path();
                let path_str = path.to_string_lossy().to_string();
                let size_bytes = calculate_dir_size(path);

                let folder = ScanFolderMatch {
                    path: path_str,
                    size_bytes,
                };

                // Emit event for this found folder
                let _ = app_handle.emit("scan-progress", ScanProgressEvent { folder });
                count += 1;
            }
        }
    }

    // Emit completion event
    let _ = app_handle.emit("scan-complete", ScanCompleteEvent { total: count });
}

fn scan_dirs_recursive(
    current_path: &str,
    patterns: &HashSet<String>,
    matches: &mut Vec<ScanFolderMatch>,
) -> Result<()> {
    let entries = match std::fs::read_dir(current_path) {
        Ok(e) => e,
        Err(_) => return Ok(()), // Skip directories we can't read
    };

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        if !metadata.is_dir() {
            continue;
        }

        let name = match entry.file_name().to_str() {
            Some(s) => s.to_string(),
            None => continue,
        };

        // Check if this directory matches our patterns
        if patterns.contains(&name) {
            let path = entry.path();
            let path_str = path.to_string_lossy().to_string();
            let size_bytes = calculate_dir_size(&path);

            matches.push(ScanFolderMatch {
                path: path_str,
                size_bytes,
            });

            // Skip recursing into this directory (skip_nested behavior)
            continue;
        }

        // Recurse into non-matching directories
        let path_str = entry.path().to_string_lossy().to_string();
        let _ = scan_dirs_recursive(&path_str, patterns, matches);
    }

    Ok(())
}

fn scan_dirs_recursive_with_progress(
    current_path: &str,
    patterns: &HashSet<String>,
    ignore_paths: &HashSet<String>,
    cancel_flag: &Arc<AtomicBool>,
    app_handle: &AppHandle,
    count: &mut usize,
) {
    // Check if scan was cancelled
    if cancel_flag.load(Ordering::Relaxed) {
        return;
    }

    let entries = match std::fs::read_dir(current_path) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries {
        // Check if scan was cancelled
        if cancel_flag.load(Ordering::Relaxed) {
            return;
        }

        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        if !metadata.is_dir() {
            continue;
        }

        let name = match entry.file_name().to_str() {
            Some(s) => s.to_string(),
            None => continue,
        };

        // Skip ignored directories
        if ignore_paths.contains(&name) {
            continue;
        }

        if patterns.contains(&name) {
            let path = entry.path();
            let path_str = path.to_string_lossy().to_string();
            let size_bytes = calculate_dir_size(&path);

            let folder = ScanFolderMatch {
                path: path_str,
                size_bytes,
            };

            // Emit event for this found folder
            let _ = app_handle.emit("scan-progress", ScanProgressEvent { folder });
            *count += 1;

            // Skip recursing into this directory (skip_nested behavior)
            continue;
        }

        // Recurse into non-matching directories
        let path_str = entry.path().to_string_lossy().to_string();
        scan_dirs_recursive_with_progress(&path_str, patterns, ignore_paths, cancel_flag, app_handle, count);
    }
}

/// Calculate the total size of a directory in bytes
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scan_basic() {
        // This is a placeholder test - in real usage you'd set up test directories
        let req = ScanRequest {
            root: ".".to_string(),
            patterns: vec!["node_modules".to_string()],
            skip_nested: true,
        };

        let result = scan_dirs(&req);
        assert!(result.is_ok());
    }
}
