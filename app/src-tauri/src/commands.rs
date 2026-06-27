use crate::cleaner::models::*;
use crate::cleaner::{delete, scan};
use tauri::{AppHandle, Emitter, Manager};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

#[tauri::command]
pub async fn scan_dirs(request: ScanRequest, app_handle: AppHandle) -> Result<(), String> {
    // Run scan in background thread
    std::thread::spawn(move || {
        scan::scan_dirs_with_progress(&request, app_handle);
    });

    Ok(())
}

#[tauri::command]
pub async fn cancel_scan(app_handle: AppHandle) -> Result<(), String> {
    let cancel_flag = app_handle.state::<Arc<AtomicBool>>();
    cancel_flag.store(true, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub async fn start_delete_job(
    request: DeleteJobRequest,
    app_handle: AppHandle,
) -> Result<DeleteJobStartResponse, String> {
    if request.folders.is_empty() {
        return Err("No folders provided".into());
    }

    let job_id = request
        .job_id
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    delete::start_delete_job(app_handle, job_id.clone(), request.folders);

    Ok(DeleteJobStartResponse { job_id })
}

#[tauri::command]
pub async fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}

const VIDEO_EXTENSIONS: &[&str] = &[
    "mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v",
    "mpg", "mpeg", "m2ts", "ts", "mts", "vob", "ogv",
];

#[tauri::command]
pub async fn scan_videos(root: String, app_handle: AppHandle) -> Result<(), String> {
    std::thread::spawn(move || {
        let mut total = 0usize;
        for entry in walkdir::WalkDir::new(&root).into_iter().filter_map(|e| e.ok()) {
            if entry.file_type().is_file() {
                let ext = entry
                    .path()
                    .extension()
                    .map(|e| e.to_string_lossy().to_lowercase())
                    .unwrap_or_default();
                if VIDEO_EXTENSIONS.contains(&ext.as_str()) {
                    let path = entry.path().to_string_lossy().to_string();
                    let size_bytes = entry.metadata().ok().map(|m| m.len());
                    let _ = app_handle.emit(
                        "video-scan-progress",
                        VideoScanProgressEvent { path, size_bytes },
                    );
                    total += 1;
                }
            }
        }
        let _ = app_handle.emit("video-scan-complete", VideoScanCompleteEvent { total });
    });
    Ok(())
}

#[tauri::command]
pub async fn delete_files(paths: Vec<String>) -> Result<(), String> {
    let mut errors: Vec<String> = Vec::new();
    for path in &paths {
        if let Err(e) = std::fs::remove_file(path) {
            errors.push(format!("{}: {}", path, e));
        }
    }
    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors.join("\n"))
    }
}

// Optional: Cancel functionality would require shared state management
// For now, we'll keep it simple without cancellation
