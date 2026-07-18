use std::sync::{Arc, Mutex};
use notify::{Watcher, RecommendedWatcher, RecursiveMode, Config};
use tauri::{AppHandle, Manager};
use ignore::WalkBuilder;
use tokio::sync::mpsc;
use serde::Serialize;
use std::time::Instant;

#[derive(Serialize, Clone)]
pub struct IndexedFile {
    pub path: String,
    pub filename: String,
}

pub struct IndexerManager {
    pub cached_files: Arc<Mutex<Vec<IndexedFile>>>,
    pub tx: mpsc::UnboundedSender<String>,
    pub app_handle: Arc<Mutex<Option<AppHandle>>>,
}

impl IndexerManager {
    pub fn new() -> Self {
        let (tx, mut rx) = mpsc::unbounded_channel::<String>();
        let cached_files = Arc::new(Mutex::new(Vec::new()));
        
        let manager = Self {
            cached_files: cached_files.clone(),
            tx,
            app_handle: Arc::new(Mutex::new(None)),
        };

        let app_handle_clone = manager.app_handle.clone();

        let cache_clone = cached_files.clone();

        tokio::spawn(async move {
            let mut watcher: RecommendedWatcher = notify::RecommendedWatcher::new(
                move |res: Result<notify::Event, notify::Error>| {
                    if let Ok(_event) = res {
                        if let Some(handle) = app_handle_clone.lock().unwrap().as_ref() {
                            // notify::Event is not serializable; emit a simple signal instead
                            let _ = handle.emit_all("fs-event", "refresh");
                        }
                    }
                },
                Config::default(),
            ).expect("Failed to create watcher");

            while let Some(path) = rx.recv().await {
                // Watch directory for changes
                let _ = watcher.watch(std::path::Path::new(&path), RecursiveMode::Recursive);
                
                println!("Starting parallel index of: {}", path);
                let start = Instant::now();

                let walker = WalkBuilder::new(&path)
                    .hidden(true)
                    .git_ignore(true)
                    .build_parallel();
                
                let results = Arc::new(Mutex::new(Vec::new()));
                let walker_results = results.clone();

                walker.run(|| {
                    let thread_res = walker_results.clone();
                    Box::new(move |result| {
                        if let Ok(entry) = result {
                            if entry.file_type().map_or(false, |ft| ft.is_file()) {
                                if let Some(p) = entry.path().to_str() {
                                    let filename = entry.path().file_name()
                                        .map_or("".to_string(), |n| n.to_string_lossy().into_owned());
                                    
                                    thread_res.lock().unwrap().push(IndexedFile {
                                        path: p.to_string(),
                                        filename,
                                    });
                                }
                            }
                        }
                        ignore::WalkState::Continue
                    })
                });

                let mut final_res = results.lock().unwrap();
                let mut cache = cache_clone.lock().unwrap();
                cache.clear();
                cache.append(&mut final_res);
                println!("Indexed {} files in {:?}", cache.len(), start.elapsed());
            }
        });

        manager
    }

    pub fn index_workspace(&self, path: String, handle: AppHandle) {
        let mut app_handle = self.app_handle.lock().unwrap();
        *app_handle = Some(handle);
        let _ = self.tx.send(path);
    }
}

#[tauri::command]
pub fn start_workspace_index(path: String, handle: tauri::AppHandle, indexer: tauri::State<IndexerManager>) -> Result<(), String> {
    indexer.index_workspace(path, handle);
    Ok(())
}

#[tauri::command]
pub fn get_indexed_files(indexer: tauri::State<IndexerManager>) -> Result<Vec<IndexedFile>, String> {
    let cache = indexer.cached_files.lock().unwrap();
    // Return max 1000 items to avoid IPC payload overload on massive monorepos
    let response: Vec<IndexedFile> = cache.iter().take(1000).cloned().collect();
    Ok(response)
}
