use serde::Serialize;
use git2::{Repository, StatusOptions, DiffOptions};
use std::path::Path;

// ── Data Types ──

#[derive(Serialize, Clone)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,       // "modified", "new", "deleted", "renamed", "typechange"
    pub is_staged: bool,
    pub display_status: String, // "M", "A", "D", "R", "?"
}

#[derive(Serialize, Clone)]
pub struct GitStatusResult {
    pub branch: String,
    pub files: Vec<GitFileStatus>,
    pub is_repo: bool,
    pub ahead: usize,
    pub behind: usize,
}

#[derive(Serialize, Clone)]
pub struct GitCommitInfo {
    pub id: String,
    pub short_id: String,
    pub message: String,
    pub author: String,
    pub email: String,
    pub timestamp: i64,
    pub date: String,
}

#[derive(Serialize, Clone)]
pub struct GitBranchInfo {
    pub current: String,
    pub branches: Vec<String>,
}

#[derive(Serialize, Clone)]
pub struct GitDiffResult {
    pub file: String,
    pub diff: String,
    pub additions: usize,
    pub deletions: usize,
}

// ── Helper ──

fn map_status(status: git2::Status) -> (&'static str, &'static str) {
    if status.contains(git2::Status::INDEX_NEW) || status.contains(git2::Status::WT_NEW) {
        ("new", "A")
    } else if status.contains(git2::Status::INDEX_MODIFIED) || status.contains(git2::Status::WT_MODIFIED) {
        ("modified", "M")
    } else if status.contains(git2::Status::INDEX_DELETED) || status.contains(git2::Status::WT_DELETED) {
        ("deleted", "D")
    } else if status.contains(git2::Status::INDEX_RENAMED) || status.contains(git2::Status::WT_RENAMED) {
        ("renamed", "R")
    } else if status.contains(git2::Status::INDEX_TYPECHANGE) || status.contains(git2::Status::WT_TYPECHANGE) {
        ("typechange", "T")
    } else {
        ("unknown", "?")
    }
}

fn is_staged(status: git2::Status) -> bool {
    status.intersects(
        git2::Status::INDEX_NEW
            | git2::Status::INDEX_MODIFIED
            | git2::Status::INDEX_DELETED
            | git2::Status::INDEX_RENAMED
            | git2::Status::INDEX_TYPECHANGE,
    )
}

// ── Commands ──

#[tauri::command]
pub fn git_status(path: String) -> Result<GitStatusResult, String> {
    let repo = match Repository::discover(&path) {
        Ok(r) => r,
        Err(_) => {
            return Ok(GitStatusResult {
                branch: String::new(),
                files: Vec::new(),
                is_repo: false,
                ahead: 0,
                behind: 0,
            });
        }
    };

    // Get branch name
    let branch = match repo.head() {
        Ok(head) => {
            head.shorthand().unwrap_or("HEAD").to_string()
        }
        Err(_) => "main".to_string(),
    };

    // Get file statuses
    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);

    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;

    let files: Vec<GitFileStatus> = statuses
        .iter()
        .filter_map(|entry| {
            let path = entry.path()?.to_string();
            let status = entry.status();
            
            // Skip clean files
            if status.is_empty() || status == git2::Status::IGNORED {
                return None;
            }

            let (status_str, display) = map_status(status);
            let staged = is_staged(status);

            Some(GitFileStatus {
                path,
                status: status_str.to_string(),
                is_staged: staged,
                display_status: display.to_string(),
            })
        })
        .collect();

    Ok(GitStatusResult {
        branch,
        files,
        is_repo: true,
        ahead: 0,
        behind: 0,
    })
}

#[tauri::command]
pub fn git_stage_file(path: String, file: String) -> Result<(), String> {
    let repo = Repository::discover(&path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    
    let file_path = Path::new(&file);
    
    // Check if file exists on disk — if not, it was deleted, so remove from index
    let workdir = repo.workdir().ok_or("No working directory")?;
    let full_path = workdir.join(file_path);
    
    if full_path.exists() {
        index.add_path(file_path).map_err(|e| e.to_string())?;
    } else {
        index.remove_path(file_path).map_err(|e| e.to_string())?;
    }
    
    index.write().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_unstage_file(path: String, file: String) -> Result<(), String> {
    let repo = Repository::discover(&path).map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let head_commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    let head_tree = head_commit.tree().map_err(|e| e.to_string())?;
    
    repo.reset_default(Some(head_tree.as_object()), [file.as_str()])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn git_commit(path: String, message: String) -> Result<String, String> {
    if message.trim().is_empty() {
        return Err("Commit message cannot be empty".to_string());
    }

    let repo = Repository::discover(&path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let oid = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(oid).map_err(|e| e.to_string())?;

    let signature = repo.signature().map_err(|e| {
        format!("Git user not configured. Run: git config --global user.name \"Your Name\" && git config --global user.email \"your@email.com\". Error: {}", e)
    })?;

    let parent = match repo.head() {
        Ok(head) => Some(head.peel_to_commit().map_err(|e| e.to_string())?),
        Err(_) => None,
    };

    let parents: Vec<&git2::Commit> = parent.iter().collect();

    let commit_oid = repo
        .commit(Some("HEAD"), &signature, &signature, &message, &tree, &parents)
        .map_err(|e| e.to_string())?;

    Ok(commit_oid.to_string()[..8].to_string())
}

#[tauri::command]
pub fn git_log(path: String, limit: Option<usize>) -> Result<Vec<GitCommitInfo>, String> {
    let repo = Repository::discover(&path).map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(20);

    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.push_head().map_err(|e| e.to_string())?;
    revwalk.set_sorting(git2::Sort::TIME).map_err(|e| e.to_string())?;

    let mut commits = Vec::new();

    for oid_result in revwalk {
        if commits.len() >= limit {
            break;
        }
        
        let oid = oid_result.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
        
        let id = oid.to_string();
        let short_id = id[..7.min(id.len())].to_string();
        let message = commit.message().unwrap_or("").trim().to_string();
        let author = commit.author();
        let timestamp = author.when().seconds();
        
        // Format date
        let datetime = chrono::DateTime::from_timestamp(timestamp, 0);
        let date = datetime
            .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
            .unwrap_or_default();
        
        commits.push(GitCommitInfo {
            id,
            short_id,
            message,
            author: author.name().unwrap_or("Unknown").to_string(),
            email: author.email().unwrap_or("").to_string(),
            timestamp,
            date,
        });
    }

    Ok(commits)
}

#[tauri::command]
pub fn git_get_file_content(path: String, file: String, revision: String) -> Result<String, String> {
    let repo = Repository::discover(&path).map_err(|e| e.to_string())?;
    let rev = if revision.is_empty() { "HEAD".to_string() } else { revision };
    
    let obj = repo.revparse_single(&format!("{}:{}", rev, file)).map_err(|e| e.to_string())?;
    let blob = obj.as_blob().ok_or("Object is not a blob")?;
    
    let content = std::str::from_utf8(blob.content()).map_err(|e| e.to_string())?;
    Ok(content.to_string())
}

#[tauri::command]
pub fn git_diff(path: String, file: String) -> Result<Vec<GitDiffResult>, String> {
    let repo = Repository::discover(&path).map_err(|e| e.to_string())?;
    
    let mut diff_opts = DiffOptions::new();
    if !file.is_empty() {
        diff_opts.pathspec(file);
    }

    let diff = repo
        .diff_index_to_workdir(None, Some(&mut diff_opts))
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();

    diff.print(git2::DiffFormat::Patch, |delta, _hunk, line| {
        let file_path = delta
            .new_file()
            .path()
            .or_else(|| delta.old_file().path())
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        let origin = line.origin();
        let content = std::str::from_utf8(line.content()).unwrap_or("");

        // Find or create result for this file
        let result = results.iter_mut().find(|r: &&mut GitDiffResult| r.file == file_path);
        
        if let Some(result) = result {
            match origin {
                '+' => {
                    result.diff.push('+');
                    result.diff.push_str(content);
                    result.additions += 1;
                }
                '-' => {
                    result.diff.push('-');
                    result.diff.push_str(content);
                    result.deletions += 1;
                }
                ' ' => {
                    result.diff.push(' ');
                    result.diff.push_str(content);
                }
                _ => {
                    result.diff.push_str(content);
                }
            }
        } else {
            let mut diff_text = String::new();
            let mut additions = 0;
            let mut deletions = 0;
            
            match origin {
                '+' => {
                    diff_text.push('+');
                    diff_text.push_str(content);
                    additions = 1;
                }
                '-' => {
                    diff_text.push('-');
                    diff_text.push_str(content);
                    deletions = 1;
                }
                _ => {
                    diff_text.push_str(content);
                }
            }

            results.push(GitDiffResult {
                file: file_path,
                diff: diff_text,
                additions,
                deletions,
            });
        }

        true
    })
    .map_err(|e| e.to_string())?;

    Ok(results)
}

#[tauri::command]
pub fn git_branch_info(path: String) -> Result<GitBranchInfo, String> {
    let repo = Repository::discover(&path).map_err(|e| e.to_string())?;

    let current = match repo.head() {
        Ok(head) => head.shorthand().unwrap_or("HEAD").to_string(),
        Err(_) => "main".to_string(),
    };

    let branches = repo
        .branches(Some(git2::BranchType::Local))
        .map_err(|e| e.to_string())?;

    let branch_names: Vec<String> = branches
        .filter_map(|b| {
            let (branch, _) = b.ok()?;
            branch.name().ok()?.map(|n| n.to_string())
        })
        .collect();

    Ok(GitBranchInfo {
        current,
        branches: branch_names,
    })
}

#[tauri::command]
pub fn git_stage_all(path: String) -> Result<(), String> {
    let repo = Repository::discover(&path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    index
        .add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;
    Ok(())
}
