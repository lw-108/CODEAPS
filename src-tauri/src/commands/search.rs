use std::path::Path;
use serde::Serialize;
use ignore::WalkBuilder;
use std::fs;

#[derive(Serialize, Clone)]
pub struct SearchResult {
    pub file: String,
    pub line: usize,
    pub column: usize,
    pub content: String,
    pub filename: String,
}

#[tauri::command]
pub fn search_files(
    path: String,
    query: String,
    case_sensitive: Option<bool>,
    max_results: Option<usize>,
) -> Result<Vec<SearchResult>, String> {
    if query.trim().is_empty() {
        return Ok(Vec::new());
    }

    let case_sensitive = case_sensitive.unwrap_or(false);
    let max_results = max_results.unwrap_or(200);
    let query_lower = query.to_lowercase();
    
    let mut results = Vec::new();
    let walker = WalkBuilder::new(&path)
        .hidden(true)
        .git_ignore(true)
        .build();

    for result in walker {
        if results.len() >= max_results {
            break;
        }

        let entry = match result {
            Ok(e) => e,
            Err(_) => continue,
        };

        if entry.file_type().map_or(false, |ft| ft.is_file()) {
            let file_path = entry.path();
            
            // Basic binary check: just skip common binary extensions for speed
            if is_likely_binary(file_path) {
                continue;
            }

            if let Ok(content) = fs::read_to_string(file_path) {
                for (line_idx, line) in content.lines().enumerate() {
                    if results.len() >= max_results {
                        break;
                    }

                    let matches = if case_sensitive {
                        line.contains(&query)
                    } else {
                        line.to_lowercase().contains(&query_lower)
                    };

                    if matches {
                        let column = if case_sensitive {
                            line.find(&query).unwrap_or(0) + 1
                        } else {
                            line.to_lowercase().find(&query_lower).unwrap_or(0) + 1
                        };

                        results.push(SearchResult {
                            file: file_path.to_string_lossy().to_string(),
                            line: line_idx + 1,
                            column,
                            content: line.trim().to_string(),
                            filename: file_path.file_name().map_or("".into(), |n| n.to_string_lossy().to_string()),
                        });
                    }
                }
            }
        }
    }

    Ok(results)
}

fn is_likely_binary(path: &Path) -> bool {
    const BINARY_EXTS: &[&str] = &[
        "png", "jpg", "jpeg", "gif", "ico", "exe", "dll", "so", "dylib",
        "zip", "tar", "gz", "pdf", "db", "sqlite", "pyc", "bin"
    ];
    if let Some(ext) = path.extension() {
        let ext_str = ext.to_string_lossy().to_lowercase();
        return BINARY_EXTS.contains(&ext_str.as_str());
    }
    false
}
