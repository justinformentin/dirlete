use crate::cleaner::models::*;
use crate::cleaner::{delete, scan};
use tauri::AppHandle;

#[tauri::command]
pub async fn scan_dirs(request: ScanRequest, app_handle: AppHandle) -> Result<(), String> {
    // Run scan in background thread
    std::thread::spawn(move || {
        scan::scan_dirs_with_progress(&request, app_handle);
    });

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

// Optional: Cancel functionality would require shared state management
// For now, we'll keep it simple without cancellation
