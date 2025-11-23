use anyhow::{Context, Result};
use std::fs;
use std::path::Path;
use std::process::Command;

/// Try multiple strategies to delete a folder on Unix-like systems (macOS, Linux)
pub fn delete_folder_with_strategies(
    path: &str,
    attempts: &mut Vec<String>,
    notes: &mut Vec<String>,
) -> Result<()> {
    let path_obj = Path::new(path);

    // Strategy 1: Standard remove_dir_all
    attempts.push("std::fs::remove_dir_all".to_string());
    match fs::remove_dir_all(path_obj) {
        Ok(_) => return Ok(()),
        Err(e) => {
            attempts.push(format!("Failed: {}", e));
        }
    }

    // Strategy 2: Try to fix permissions and retry
    attempts.push("Attempting to fix permissions".to_string());
    if let Err(e) = fix_permissions_recursive(path_obj) {
        attempts.push(format!("Fix permissions failed: {}", e));
    } else {
        attempts.push("Permissions updated, retrying...".to_string());
        match fs::remove_dir_all(path_obj) {
            Ok(_) => return Ok(()),
            Err(e) => {
                attempts.push(format!("Still failed: {}", e));
            }
        }
    }

    // Strategy 3: Use rm -rf as last resort
    attempts.push("Trying rm -rf".to_string());
    match rm_rf_delete(path) {
        Ok(_) => return Ok(()),
        Err(e) => {
            attempts.push(format!("rm -rf failed: {}", e));
        }
    }

    notes.push("All deletion strategies failed. Folder may have permission issues or be in use.".to_string());
    notes.push("Try checking file permissions or if any process is using files in this folder.".to_string());

    anyhow::bail!("Failed to delete folder after all strategies")
}

#[cfg(unix)]
fn fix_permissions_recursive(path: &Path) -> Result<()> {
    use std::os::unix::fs::PermissionsExt;
    use walkdir::WalkDir;

    for entry in WalkDir::new(path).follow_links(false) {
        let entry = entry.context("Failed to read directory entry")?;
        let metadata = entry.metadata().context("Failed to get metadata")?;

        // Set permissions to 755 for directories, 644 for files
        let mode = if metadata.is_dir() { 0o755 } else { 0o644 };
        let perms = std::fs::Permissions::from_mode(mode);

        fs::set_permissions(entry.path(), perms)
            .context("Failed to set permissions")?;
    }

    Ok(())
}

#[cfg(not(unix))]
fn fix_permissions_recursive(_path: &Path) -> Result<()> {
    // Fallback for non-Unix systems (shouldn't be called, but just in case)
    Ok(())
}

fn rm_rf_delete(path: &str) -> Result<()> {
    let output = Command::new("rm")
        .args(&["-rf", path])
        .output()
        .context("Failed to execute rm -rf")?;

    if output.status.success() {
        Ok(())
    } else {
        anyhow::bail!(
            "rm -rf failed: {}",
            String::from_utf8_lossy(&output.stderr)
        )
    }
}
