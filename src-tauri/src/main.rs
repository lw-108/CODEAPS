#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod python;
mod error;
mod lsp;
mod indexer;
mod dap;
mod plugins;

use std::sync::{Arc, Mutex};
use crate::python::manager::PythonManager;
use crate::lsp::LspManager;
use crate::indexer::{IndexerManager, start_workspace_index, get_indexed_files};
use crate::dap::{DapManager, dap_start_session, dap_stop_session};
use crate::commands::analysis::analyze_memory_rust;
use crate::commands::system_stats::get_system_stats;
use crate::commands::terminal::{create_terminal, write_terminal, resize_terminal, TerminalState};
use crate::commands::file_ops::{
    read_directory, read_file_content, write_file_content, 
    create_new_file, create_new_directory, delete_item, rename_item, copy_item,
    check_path_exists, open_folder_dialog, save_file_dialog, open_file_dialog
};
use crate::commands::git::{
    git_status, git_stage_file, git_unstage_file, git_commit, 
    git_log, git_diff, git_branch_info, git_stage_all, git_get_file_content
};
use crate::commands::search::search_files;
use crate::commands::lsp::{lsp_initialize, lsp_definition, lsp_hover, lsp_references, lsp_completion};
use crate::commands::plugins::{load_plugin, call_plugin_hook, list_plugins, scan_plugins};
use crate::plugins::PluginManager;
use tauri::{Menu, Submenu, CustomMenuItem, MenuItem, Manager};

#[tokio::main]
async fn main() {
    let python_manager = PythonManager::new();
    
    // Start backend
    if let Err(e) = python_manager.start_backend() {
        eprintln!("Failed to start python backend: {}", e);
    }

    let terminal_state = TerminalState {
        master: Arc::new(Mutex::new(None)),
        writer: Arc::new(Mutex::new(None)),
    };

    let lsp_manager = Arc::new(LspManager::new());
    let lsp_manager_for_ws = lsp_manager.clone();
    let indexer_manager = IndexerManager::new();
    let dap_manager = DapManager::new();
    let plugin_manager = PluginManager::new().expect("Failed to initialize Wasm Plugin Engine");

    // Start LSP WebSocket Bridge
    tokio::spawn(async move {
        crate::lsp::websocket::start_lsp_websocket_server("127.0.0.1:9001", lsp_manager_for_ws).await;
    });

    // ── Native Menu Bar (VS Code-style) ──────────────────────────────

    // File
    let file_menu = Submenu::new("File", Menu::new()
        .add_item(CustomMenuItem::new("new_file", "New File").accelerator("CmdOrCtrl+N"))
        .add_item(CustomMenuItem::new("new_window", "New Window").accelerator("CmdOrCtrl+Shift+N"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("open_file", "Open File...").accelerator("CmdOrCtrl+O"))
        .add_item(CustomMenuItem::new("open_folder", "Open Folder...").accelerator("CmdOrCtrl+Shift+O"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("save", "Save").accelerator("CmdOrCtrl+S"))
        .add_item(CustomMenuItem::new("save_as", "Save As...").accelerator("CmdOrCtrl+Shift+S"))
        .add_item(CustomMenuItem::new("save_all", "Save All").accelerator("CmdOrCtrl+Alt+S"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("preferences", "Preferences"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("close_editor", "Close Editor").accelerator("CmdOrCtrl+W"))
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Quit)
    );

    // Edit
    let edit_menu = Submenu::new("Edit", Menu::new()
        .add_native_item(MenuItem::Undo)
        .add_native_item(MenuItem::Redo)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Cut)
        .add_native_item(MenuItem::Copy)
        .add_native_item(MenuItem::Paste)
        .add_native_item(MenuItem::SelectAll)
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("find", "Find").accelerator("CmdOrCtrl+F"))
        .add_item(CustomMenuItem::new("replace", "Replace").accelerator("CmdOrCtrl+H"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("find_in_files", "Find in Files").accelerator("CmdOrCtrl+Shift+F"))
        .add_item(CustomMenuItem::new("replace_in_files", "Replace in Files").accelerator("CmdOrCtrl+Shift+H"))
    );

    // Selection
    let selection_menu = Submenu::new("Selection", Menu::new()
        .add_item(CustomMenuItem::new("select_all", "Select All").accelerator("CmdOrCtrl+A"))
        .add_item(CustomMenuItem::new("expand_selection", "Expand Selection").accelerator("Shift+Alt+Right"))
        .add_item(CustomMenuItem::new("shrink_selection", "Shrink Selection").accelerator("Shift+Alt+Left"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("copy_line_up", "Copy Line Up").accelerator("Shift+Alt+Up"))
        .add_item(CustomMenuItem::new("copy_line_down", "Copy Line Down").accelerator("Shift+Alt+Down"))
        .add_item(CustomMenuItem::new("move_line_up", "Move Line Up").accelerator("Alt+Up"))
        .add_item(CustomMenuItem::new("move_line_down", "Move Line Down").accelerator("Alt+Down"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("add_cursor_above", "Add Cursor Above").accelerator("CmdOrCtrl+Alt+Up"))
        .add_item(CustomMenuItem::new("add_cursor_below", "Add Cursor Below").accelerator("CmdOrCtrl+Alt+Down"))
    );

    // View
    let view_menu = Submenu::new("View", Menu::new()
        .add_item(CustomMenuItem::new("command_palette", "Command Palette...").accelerator("CmdOrCtrl+Shift+P"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("toggle_explorer", "Explorer").accelerator("CmdOrCtrl+Shift+E"))
        .add_item(CustomMenuItem::new("toggle_search", "Search").accelerator("CmdOrCtrl+Shift+F"))
        .add_item(CustomMenuItem::new("toggle_git", "Source Control").accelerator("CmdOrCtrl+Shift+G"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("toggle_terminal", "Terminal").accelerator("CmdOrCtrl+`"))
        .add_item(CustomMenuItem::new("toggle_problems", "Problems").accelerator("CmdOrCtrl+Shift+M"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("zoom_in", "Zoom In").accelerator("CmdOrCtrl+Plus"))
        .add_item(CustomMenuItem::new("zoom_out", "Zoom Out").accelerator("CmdOrCtrl+-"))
        .add_item(CustomMenuItem::new("zoom_reset", "Reset Zoom").accelerator("CmdOrCtrl+0"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("toggle_fullscreen", "Toggle Full Screen").accelerator("F11"))
    );

    // Go
    let go_menu = Submenu::new("Go", Menu::new()
        .add_item(CustomMenuItem::new("go_back", "Back").accelerator("Alt+Left"))
        .add_item(CustomMenuItem::new("go_forward", "Forward").accelerator("Alt+Right"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("go_to_file", "Go to File...").accelerator("CmdOrCtrl+P"))
        .add_item(CustomMenuItem::new("go_to_symbol", "Go to Symbol...").accelerator("CmdOrCtrl+Shift+O"))
        .add_item(CustomMenuItem::new("go_to_line", "Go to Line...").accelerator("CmdOrCtrl+G"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("go_to_definition", "Go to Definition").accelerator("F12"))
        .add_item(CustomMenuItem::new("go_to_references", "Go to References").accelerator("Shift+F12"))
    );

    // Run
    let run_menu = Submenu::new("Run", Menu::new()
        .add_item(CustomMenuItem::new("run_code", "Run Code").accelerator("CmdOrCtrl+Shift+B"))
        .add_item(CustomMenuItem::new("start_debugging", "Start Debugging").accelerator("F5"))
        .add_item(CustomMenuItem::new("run_without_debug", "Run Without Debugging").accelerator("CmdOrCtrl+F5"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("stop", "Stop").accelerator("Shift+F5"))
        .add_item(CustomMenuItem::new("restart", "Restart").accelerator("CmdOrCtrl+Shift+F5"))
    );

    // Terminal
    let terminal_menu = Submenu::new("Terminal", Menu::new()
        .add_item(CustomMenuItem::new("new_terminal", "New Terminal").accelerator("CmdOrCtrl+Shift+`"))
        .add_item(CustomMenuItem::new("split_terminal", "Split Terminal"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("clear_terminal", "Clear Terminal"))
    );

    // Help
    let help_menu = Submenu::new("Help", Menu::new()
        .add_item(CustomMenuItem::new("about", "About CodeAps"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("keyboard_shortcuts", "Keyboard Shortcuts"))
        .add_item(CustomMenuItem::new("documentation", "Documentation"))
        .add_item(CustomMenuItem::new("release_notes", "Release Notes"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("toggle_devtools", "Toggle Developer Tools").accelerator("CmdOrCtrl+Shift+I"))
    );

    let menu = Menu::new()
        .add_submenu(file_menu)
        .add_submenu(edit_menu)
        .add_submenu(selection_menu)
        .add_submenu(view_menu)
        .add_submenu(go_menu)
        .add_submenu(run_menu)
        .add_submenu(terminal_menu)
        .add_submenu(help_menu);

    tauri::Builder::default()
        // .menu(menu) // Native menu removed in favor of custom HTML MenuBar for theme support
        .on_menu_event(|event| {
            let window = event.window();
            // Dispatch menu events to the frontend via window.emit
            let _ = window.emit("menu-event", event.menu_item_id());
        })
        .setup(|app| {
            // Force Windows dark mode on the native title bar & menu bar
            #[cfg(target_os = "windows")]
            {
                use std::ffi::c_void;

                #[link(name = "dwmapi")]
                extern "system" {
                    fn DwmSetWindowAttribute(
                        hwnd: isize,
                        dw_attribute: u32,
                        pv_attribute: *const c_void,
                        cb_attribute: u32,
                    ) -> i32;
                }

                let window = app.get_window("main").unwrap();
                let hwnd = window.hwnd().unwrap().0 as isize;
                let dark_mode: u32 = 1;
                unsafe {
                    // DWMWA_USE_IMMERSIVE_DARK_MODE = 20
                    DwmSetWindowAttribute(
                        hwnd,
                        20,
                        &dark_mode as *const u32 as *const c_void,
                        std::mem::size_of::<u32>() as u32,
                    );
                }
            }
            Ok(())
        })
        .manage(python_manager)
        .manage(terminal_state) // PTY state
        .manage(lsp_manager)      // LSP state
        .manage(indexer_manager)  // Indexer State
        .manage(dap_manager)      // DAP State
        .manage(plugin_manager)   // Wasm Plugin State
        .invoke_handler(tauri::generate_handler![
            create_terminal,
            write_terminal,
            resize_terminal,
            read_directory,
            read_file_content,
            write_file_content,
            create_new_file,
            create_new_directory,
            delete_item,
            rename_item,
            open_folder_dialog,
            save_file_dialog,
            open_file_dialog,
            copy_item,
            check_path_exists,
            git_status,
            git_stage_file,
            git_unstage_file,
            git_commit,
            git_log,
            git_get_file_content,
            git_diff,
            git_branch_info,
            git_stage_all,
            search_files,
            lsp_initialize,
            lsp_definition,
            lsp_hover,
            lsp_references,
            lsp_completion,
            analyze_memory_rust,
            get_system_stats,
            start_workspace_index,
            get_indexed_files,
            dap_start_session,
            dap_stop_session,
            load_plugin,
            call_plugin_hook,
            list_plugins,
            scan_plugins
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
