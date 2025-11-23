use crate::cleaner::models::*;
use crate::cleaner::platform;
use tauri::{AppHandle, Emitter};

pub fn start_delete_job(app_handle: AppHandle, job_id: String, folders: Vec<String>) {
    std::thread::spawn(move || {
        let total = folders.len();
        let mut completed = 0usize;
        let mut succeeded = Vec::new();
        let mut failed = Vec::new();

        for folder in folders {
            let mut attempts = Vec::new();
            let mut notes = Vec::new();
            let path_str = folder.clone();

            // Emit progress: starting this folder
            let progress = DeleteProgressEvent {
                job_id: job_id.clone(),
                total,
                completed,
                current_path: Some(path_str.clone()),
                current_status: "deleting".to_string(),
            };
            let _ = app_handle.emit("delete-progress", &progress);

            // Attempt deletion with platform-specific strategies
            match platform::delete_folder_with_strategies(&path_str, &mut attempts, &mut notes) {
                Ok(()) => {
                    succeeded.push(path_str.clone());
                }
                Err(err) => {
                    failed.push(FailedDelete {
                        path: path_str.clone(),
                        error: err.to_string(),
                        attempts: attempts.clone(),
                        notes: notes.clone(),
                    });
                }
            }

            completed += 1;

            // Emit progress: after finishing this folder
            let progress = DeleteProgressEvent {
                job_id: job_id.clone(),
                total,
                completed,
                current_path: Some(path_str.clone()),
                current_status: "deleting".to_string(),
            };
            let _ = app_handle.emit("delete-progress", &progress);
        }

        // Final completion event
        let complete = DeleteCompleteEvent {
            job_id: job_id.clone(),
            succeeded,
            failed,
        };
        let _ = app_handle.emit("delete-complete", &complete);
    });
}
