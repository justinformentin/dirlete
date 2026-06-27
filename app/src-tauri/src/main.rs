// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cleaner;
mod commands;

use commands::*;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(Arc::new(AtomicBool::new(false)))
        .invoke_handler(tauri::generate_handler![scan_dirs, cancel_scan, start_delete_job, open_folder, scan_videos, delete_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
