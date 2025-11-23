use anyhow::{Context, Result};
use std::fs;
use std::path::Path;
use std::process::Command;

/// Try multiple strategies to delete a folder on Windows
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

    // Strategy 2: Clear attributes and retry
    attempts.push("Clearing read-only attributes".to_string());
    if let Err(e) = clear_readonly_recursive(path_obj) {
        attempts.push(format!("Clear attributes failed: {}", e));
    } else {
        attempts.push("Attributes cleared, retrying...".to_string());
        match fs::remove_dir_all(path_obj) {
            Ok(_) => return Ok(()),
            Err(e) => {
                attempts.push(format!("Still failed: {}", e));
            }
        }
    }

    // Strategy 3: Try with long path prefix
    let long_path = if !path.starts_with(r"\\?\") {
        format!(r"\\?\{}", path)
    } else {
        path.to_string()
    };

    attempts.push(format!("Trying with long path prefix: {}", long_path));
    match fs::remove_dir_all(&long_path) {
        Ok(_) => return Ok(()),
        Err(e) => {
            attempts.push(format!("Long path failed: {}", e));
        }
    }

    // Strategy 4: Nuclear option - robocopy mirror trick (Windows-specific)
    attempts.push("Trying robocopy mirror trick".to_string());
    match robocopy_delete(path) {
        Ok(_) => return Ok(()),
        Err(e) => {
            attempts.push(format!("Robocopy failed: {}", e));
        }
    }

    // Strategy 5: cmd /C rd /s /q
    attempts.push("Trying cmd /C rd /s /q".to_string());
    match cmd_rd_delete(path) {
        Ok(_) => return Ok(()),
        Err(e) => {
            attempts.push(format!("cmd rd failed: {}", e));
        }
    }

    notes.push("All deletion strategies failed. Folder may be locked by another process.".to_string());
    notes.push("Try closing applications that might be using files in this folder.".to_string());

    anyhow::bail!("Failed to delete folder after all strategies")
}

fn clear_readonly_recursive(path: &Path) -> Result<()> {
    use walkdir::WalkDir;

    for entry in WalkDir::new(path).follow_links(false) {
        let entry = entry.context("Failed to read directory entry")?;
        let metadata = entry.metadata().context("Failed to get metadata")?;

        if metadata.permissions().readonly() {
            let mut perms = metadata.permissions();
            perms.set_readonly(false);
            fs::set_permissions(entry.path(), perms)
                .context("Failed to set permissions")?;
        }
    }

    Ok(())
}

fn robocopy_delete(path: &str) -> Result<()> {
    // Create an empty temporary directory
    let temp_dir = std::env::temp_dir().join(format!("dirlete_empty_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).context("Failed to create temp directory")?;

    // Use robocopy to mirror empty dir to target (effectively deleting everything)
    let output = Command::new("robocopy")
        .args(&[
            temp_dir.to_string_lossy().as_ref(),
            path,
            "/MIR",
            "/R:0",
            "/W:0",
            "/NFL",
            "/NDL",
            "/NJH",
            "/NJS",
            "/nc",
            "/ns",
            "/np",
        ])
        .output()
        .context("Failed to execute robocopy")?;

    // Clean up temp dir
    let _ = fs::remove_dir(&temp_dir);

    // Robocopy exit codes: 0-7 are success, 8+ are errors
    if output.status.code().unwrap_or(16) < 8 {
        // Now try to remove the empty directory
        fs::remove_dir(path).context("Failed to remove emptied directory")?;
        Ok(())
    } else {
        anyhow::bail!("Robocopy failed with exit code: {:?}", output.status.code())
    }
}

fn cmd_rd_delete(path: &str) -> Result<()> {
    let output = Command::new("cmd")
        .args(&["/C", "rd", "/s", "/q", path])
        .output()
        .context("Failed to execute cmd rd")?;

    if output.status.success() {
        Ok(())
    } else {
        anyhow::bail!(
            "cmd rd failed: {}",
            String::from_utf8_lossy(&output.stderr)
        )
    }
}
