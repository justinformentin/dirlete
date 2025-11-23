#[cfg(target_os = "windows")]
mod windows;
#[cfg(any(target_os = "macos", target_os = "linux"))]
mod unix;

#[cfg(target_os = "windows")]
pub use windows::delete_folder_with_strategies;

#[cfg(any(target_os = "macos", target_os = "linux"))]
pub use unix::delete_folder_with_strategies;
