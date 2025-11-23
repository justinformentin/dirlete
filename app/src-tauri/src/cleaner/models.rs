use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct ScanRequest {
    pub root: String,
    pub patterns: Vec<String>,
    pub skip_nested: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct ScanFolderMatch {
    pub path: String,
    #[serde(rename = "sizeBytes")]
    pub size_bytes: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct ScanResponse {
    pub matches: Vec<ScanFolderMatch>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ScanProgressEvent {
    pub folder: ScanFolderMatch,
}

#[derive(Debug, Serialize, Clone)]
pub struct ScanCompleteEvent {
    pub total: usize,
}

#[derive(Debug, Deserialize)]
pub struct DeleteJobRequest {
    #[serde(rename = "jobId")]
    pub job_id: Option<String>,
    pub folders: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct DeleteJobStartResponse {
    #[serde(rename = "jobId")]
    pub job_id: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct FailedDelete {
    pub path: String,
    pub error: String,
    pub attempts: Vec<String>,
    pub notes: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct DeleteCompleteEvent {
    #[serde(rename = "jobId")]
    pub job_id: String,
    pub succeeded: Vec<String>,
    pub failed: Vec<FailedDelete>,
}

#[derive(Debug, Serialize)]
pub struct DeleteProgressEvent {
    #[serde(rename = "jobId")]
    pub job_id: String,
    pub total: usize,
    pub completed: usize,
    #[serde(rename = "currentPath")]
    pub current_path: Option<String>,
    #[serde(rename = "currentStatus")]
    pub current_status: String,
}

// Optional: Cancel functionality for future implementation
#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct CancelRequest {
    #[serde(rename = "jobId")]
    pub job_id: String,
}

#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct CancelResponse {
    #[serde(rename = "jobId")]
    pub job_id: String,
    pub cancelled: bool,
}
