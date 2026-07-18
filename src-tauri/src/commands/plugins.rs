use tauri::{State, AppHandle};
use crate::plugins::PluginManager;
use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub async fn load_plugin(
    app: AppHandle,
    name: String,
    path: String,
    current_code: String,
    manager: State<'_, PluginManager>
) -> Result<String, String> {
    println!("[IDE] Requesting load of plugin '{}' from {}", name, path);
    
    // Resolve full path (handling relative paths from plugins/ directory)
    let full_path = if PathBuf::from(&path).is_absolute() {
        PathBuf::from(&path)
    } else {
        app.path_resolver()
            .resource_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap())
            .join(&path)
    };

    let wasm_bytes = fs::read(&full_path)
        .map_err(|e| format!("Failed to read plugin file: {}", e))?;

    manager.load_plugin(&name, &wasm_bytes, current_code)
        .map_err(|e| format!("Wasm Engine Error: {}", e))?;

    Ok(format!("Plugin '{}' loaded and active", name))
}

#[tauri::command]
pub async fn call_plugin_hook(
    name: String,
    hook: String,
    manager: State<'_, PluginManager>
) -> Result<String, String> {
    println!("[IDE] Calling hook '{}' in plugin '{}'", hook, name);
    match manager.call_hook(&name, &hook) {
        Ok(res) => Ok(res),
        Err(e) => Err(format!("Plugin Error: {}", e))
    }
}

#[tauri::command]
pub async fn list_plugins(
    manager: State<'_, PluginManager>
) -> Result<Vec<String>, String> {
    let plugins = manager.plugins.lock().unwrap();
    Ok(plugins.keys().cloned().collect())
}

#[tauri::command]
pub async fn scan_plugins(
    app: AppHandle
) -> Result<Vec<String>, String> {
    let plugins_dir = app.path_resolver()
        .resource_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap())
        .join("plugins");

    if !plugins_dir.exists() {
        return Ok(vec![]);
    }

    let mut found = Vec::new();
    if let Ok(entries) = fs::read_dir(plugins_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("wasm") {
                if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                    found.push(name.to_string());
                }
            }
        }
    }
    
    Ok(found)
}
