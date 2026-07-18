use std::sync::Arc;
use tauri::State;
use crate::lsp::LspManager;

#[tauri::command]
pub async fn lsp_initialize(
    language: String,
    workspace_path: String,
    state: State<'_, Arc<LspManager>>
) -> Result<(), String> {
    state.start_server(&language, &workspace_path).await
}

#[tauri::command]
pub async fn lsp_definition(
    language: String,
    file_uri: String,
    line: u32,
    character: u32,
    state: State<'_, Arc<LspManager>>
) -> Result<(), String> {
    state.request_definition(&language, &file_uri, line, character).await
}

#[tauri::command]
pub async fn lsp_hover(
    language: String,
    file_uri: String,
    line: u32,
    character: u32,
    state: State<'_, Arc<LspManager>>
) -> Result<(), String> {
    state.request_hover(&language, &file_uri, line, character).await
}

#[tauri::command]
pub async fn lsp_completion(
    language: String,
    file_uri: String,
    line: u32,
    character: u32,
    state: State<'_, Arc<LspManager>>
) -> Result<(), String> {
    state.request_completion(&language, &file_uri, line, character).await
}

#[tauri::command]
pub async fn lsp_references(
    _language: String,
    _file_uri: String,
    _line: u32,
    _character: u32,
    _state: State<'_, Arc<LspManager>>
) -> Result<(), String> {
    // Note: lsp_references is a placeholder for now, adding logic soon
    Ok(())
}
