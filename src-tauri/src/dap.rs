use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
// No unused imports here

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DapState {
    pub active_session: bool,
    pub debugger_type: String,
}

pub struct DapManager {
    pub state: Arc<Mutex<DapState>>,
}

impl DapManager {
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(DapState {
                active_session: false,
                debugger_type: "".to_string(),
            })),
        }
    }
}

// TODO: Connect this to a real Dap TcpStream and handle JSON-RPC content parsing.
#[tauri::command]
pub fn dap_start_session(manager: tauri::State<DapManager>, debugger: String) -> Result<(), String> {
    let mut state = manager.state.lock().unwrap();
    state.active_session = true;
    state.debugger_type = debugger.clone();
    println!("DAP Session starting for {}", debugger);
    Ok(())
}

#[tauri::command]
pub fn dap_stop_session(manager: tauri::State<DapManager>) -> Result<(), String> {
    let mut state = manager.state.lock().unwrap();
    state.active_session = false;
    println!("DAP Session stopped");
    Ok(())
}
