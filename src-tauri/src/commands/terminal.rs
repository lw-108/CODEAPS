use std::sync::{Arc, Mutex};
use std::io::{Read, Write};
use std::thread;
use portable_pty::{CommandBuilder, PtySize, NativePtySystem, PtySystem, MasterPty};
use tauri::{Window, State};
use serde::{Serialize, Deserialize};

pub struct TerminalState {
    pub master: Arc<Mutex<Option<Box<dyn MasterPty + Send>>>>,
    pub writer: Arc<Mutex<Option<Box<dyn Write + Send>>>>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TerminalOutput {
    pub data: String,
}

#[tauri::command]
pub async fn create_terminal(
    window: Window, 
    state: State<'_, TerminalState>,
    path: Option<String>
) -> Result<(), String> {
    // Kill existing terminal if any
    {
        let mut master_guard = state.master.lock().unwrap();
        *master_guard = None;
        let mut writer_guard = state.writer.lock().unwrap();
        *writer_guard = None;
    }

    let pty_system = NativePtySystem::default();
    let pair = pty_system.openpty(PtySize {
        rows: 24,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    }).map_err(|e| format!("PTY Initialization Failed: {}", e))?;

    let final_path = path.unwrap_or_else(|| "d:\\CodeAps".to_string());
    
    // Attempt spawning with powershell first - Simple, bare startup
    let mut cmd = CommandBuilder::new("powershell.exe");
    cmd.args(["-NoLogo", "-NoExit"]);
    cmd.cwd(&final_path);

    let child_result = pair.slave.spawn_command(cmd);

    // Fallback to cmd if powershell fails
    if child_result.is_err() {
        let mut fallback_cmd = CommandBuilder::new("cmd.exe");
        fallback_cmd.cwd(&final_path);
        pair.slave.spawn_command(fallback_cmd).map_err(|e| format!("All shells failed to spawn: {}", e))?;
    }

    // drop the slave handle so that the master side can receive EOF 
    // when the child process exits.
    drop(pair.slave);

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    
    {
        let mut master_guard = state.master.lock().unwrap();
        *master_guard = Some(pair.master);
        let mut writer_guard = state.writer.lock().unwrap();
        *writer_guard = Some(writer);
    }

    // Spawn reader thread with high-performance batching and UTF-8 optimization
    thread::spawn(move || {
        let mut buffer = [0u8; 8192];
        let mut accumulator = Vec::with_capacity(8192);
        
        while let Ok(n) = reader.read(&mut buffer) {
            if n == 0 {
                break;
            }
            accumulator.extend_from_slice(&buffer[..n]);
            
            // Performance Heuristic: 
            // If we read less than the full buffer, it means the PTY's current output stream
            // is temporarily exhausted. This is an ideal time to flush the accumulator 
            // to the frontend to maintain low latency for interactive use. 
            // If the buffer is full, we loop again to batch more data, reducing IPC overhead.
            if n < buffer.len() || accumulator.len() >= 16384 {
                let data = match String::from_utf8(accumulator.clone()) {
                    Ok(s) => s,
                    Err(_) => String::from_utf8_lossy(&accumulator).to_string(),
                };
                let _ = window.emit("terminal-output", TerminalOutput { data });
                accumulator.clear();
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn write_terminal(
    input: String, 
    state: State<'_, TerminalState>
) -> Result<(), String> {
    let mut writer_guard = state.writer.lock().unwrap();
    if let Some(writer) = writer_guard.as_mut() {
        writer.write_all(input.as_bytes()).map_err(|e| e.to_string())?;
        writer.flush().map_err(|e| e.to_string())?;
    } else {
        return Err("No active terminal session".to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn resize_terminal(
    rows: u16, 
    cols: u16, 
    state: State<'_, TerminalState>
) -> Result<(), String> {
    let mut master_guard = state.master.lock().unwrap();
    if let Some(master) = master_guard.as_mut() {
        master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        }).map_err(|e| e.to_string())?;
    }
    Ok(())
}
