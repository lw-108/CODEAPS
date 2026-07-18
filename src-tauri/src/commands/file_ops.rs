use std::fs;
use std::path::Path;
use serde::{Serialize, Deserialize};
use tauri::api::dialog::blocking::FileDialogBuilder;

#[derive(Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileEntry>>,
}

#[tauri::command]
pub fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let mut entries = Vec::new();
    let dir = Path::new(&path);

    if dir.is_dir() {
        for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path_buf = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = path_buf.is_dir();

            entries.push(FileEntry {
                name,
                path: path_buf.to_string_lossy().to_string(),
                is_dir,
                children: None,
            });
        }
    }

    Ok(entries)
}

#[tauri::command]
pub fn read_file_content(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file_content(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_new_file(path: String) -> Result<bool, String> {
    fs::File::create(&path).map(|_| true).map_err(|e| format!("Creation failed for module at {}: {}", path, e))
}

#[tauri::command]
pub fn create_new_directory(path: String) -> Result<bool, String> {
    fs::create_dir_all(&path).map(|_| true).map_err(|e| format!("Directory initialization failed at {}: {}", path, e))
}

#[tauri::command]
pub fn check_path_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

#[tauri::command]
pub fn rename_item(old_path: String, new_path: String) -> Result<bool, String> {
    if old_path == new_path { return Ok(true); }
    let old = Path::new(&old_path);
    let new = Path::new(&new_path);
    
    if !old.exists() {
        return Err(format!("Source path not found: {}", old_path));
    }
    
    if new.exists() && old_path.to_lowercase() != new_path.to_lowercase() {
        return Err(format!("A file or folder with this name already exists at the destination."));
    }

    match fs::rename(old, new) {
        Ok(_) => Ok(true),
        Err(e) => {
            // Fallback for cross-filesystem moves
            internal_copy_item(&old_path, &new_path)?;
            if Path::new(&new_path).exists() {
                internal_delete_item(&old_path)?;
                Ok(true)
            } else {
                Err(format!("Identity transfer failed: {}. OS Context: {}", e, e.to_string()))
            }
        }
    }
}

#[tauri::command]
pub fn copy_item(source: String, destination: String) -> Result<bool, String> {
    if source == destination {
        return Ok(true);
    }
    internal_copy_item(&source, &destination).map(|_| true)
}

fn internal_copy_item(source: &str, destination: &str) -> Result<(), String> {
    let src = Path::new(source);
    let dst = Path::new(destination);

    if !src.exists() {
        return Err(format!("Source missing: {}", source));
    }

    if src.is_dir() {
        copy_dir_recursive(src, dst).map_err(|e| format!("Directory sync failed: {}", e))
    } else {
        if let Some(parent) = dst.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::copy(src, dst).map(|_| ()).map_err(|e| format!("File capture failed: {}", e))
    }
}

#[tauri::command]
pub fn delete_item(path: String) -> Result<(), String> {
    internal_delete_item(&path)
}

fn internal_delete_item(path: &str) -> Result<(), String> {
    let path_obj = Path::new(path);
    if !path_obj.exists() { return Ok(()); }

    if path_obj.is_dir() {
        fs::remove_dir_all(path).map_err(|e| format!("Failed to purge directory: {}", e))
    } else {
        fs::remove_file(path).map_err(|e| format!("Failed to purge file: {}", e))
    }
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        if file_type.is_dir() {
            copy_dir_recursive(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn open_folder_dialog() -> Option<String> {
    FileDialogBuilder::new()
        .pick_folder()
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
pub fn save_file_dialog(default_filename: Option<String>) -> Option<String> {
    let mut builder = FileDialogBuilder::new();
    if let Some(name) = default_filename {
        builder = builder.set_file_name(&name);
    }
    builder.save_file()
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_file_dialog(filters: Option<Vec<String>>) -> Option<String> {
    let mut builder = FileDialogBuilder::new();
    if let Some(f) = filters {
        let extensions: Vec<&str> = f.iter().map(|s| s.as_str()).collect();
        builder = builder.add_filter("Executable", &extensions);
    }
    builder.pick_file()
        .map(|p| p.to_string_lossy().to_string())
}
