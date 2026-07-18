use tauri::api::process::{Command as TauriCommand, CommandEvent};
use std::sync::Mutex;

pub struct PythonManager {
    process: Mutex<Option<tauri::api::process::CommandChild>>,
    port: u16,
}

impl PythonManager {
    pub fn new() -> Self {
        Self {
            process: Mutex::new(None),
            port: 8000, 
        }
    }
    
    pub fn start_backend(&self) -> Result<(), String> {
        // 1. Check if backend is already running
        if self.is_port_in_use(self.port) {
            println!("[i] Port {} is already active. Skipping auto-start.", self.port);
            return Ok(());
        }

        println!("Starting CodeAps Backend sidecar...");
        
        // Use Tauri's sidecar command
        // The binary name in tauri.conf.json is "codeaps-backend"
        let (mut rx, child) = TauriCommand::new_sidecar("codeaps-backend")
            .map_err(|e| format!("Failed to find sidecar: {}", e))?
            .spawn()
            .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

        // Monitor sidecar events
        tokio::spawn(async move {
            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(line) => println!("[Backend] {}", line),
                    CommandEvent::Stderr(line) => eprintln!("[Backend Error] {}", line),
                    CommandEvent::Error(err) => eprintln!("[Backend Crash] {}", err),
                    CommandEvent::Terminated(payload) => {
                        println!("[Backend Terminated] Code: {:?}", payload.code);
                        break;
                    }
                    _ => {}
                }
            }
        });

        *self.process.lock().unwrap() = Some(child);
        Ok(())
    }

    fn is_port_in_use(&self, port: u16) -> bool {
        std::net::TcpListener::bind(("127.0.0.1", port)).is_err()
    }
}

impl Drop for PythonManager {
    fn drop(&mut self) {
        if let Some(child) = self.process.lock().unwrap().take() {
            // Kill the sidecar child process
            let _ = child.kill().ok();
        }
    }
}
