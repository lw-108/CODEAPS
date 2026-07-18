use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tokio::process::{Child, ChildStdin, Command};
use tokio::sync::Mutex;
use tokio::io::AsyncWriteExt;
use tokio_util::codec::FramedRead;
use serde_json::{json, Value};
use tokio::sync::mpsc;
use crate::lsp::rpc::LspCodec;
use futures_util::StreamExt;
use bytes::BytesMut;

#[allow(dead_code)]
pub struct LspServer {
    pub language: String,
    pub process: Child,
    pub stdin: ChildStdin,
    pub request_id: u32,
    pub sender: mpsc::UnboundedSender<Value>,
}

#[allow(dead_code)]
pub struct LspManager {
    pub servers: Arc<Mutex<HashMap<String, LspServer>>>,
}

impl LspManager {
    pub fn new() -> Self {
        Self {
            servers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn start_server(&self, language: &str, workspace_path: &str) -> Result<(), String> {
        let mut servers = self.servers.lock().await;
        if servers.contains_key(language) {
            return Ok(());
        }

        // Gracefully skip plaintext or unsupported languages without erroring loudly
        if language == "plaintext" {
            return Ok(());
        }

        let (binary, args) = match language {
            "python" => ("pyright", vec!["--stdio"]),
            "rust" => ("rust-analyzer", vec![]),
            "javascript" | "typescript" => ("typescript-language-server", vec!["--stdio"]),
            _ => return Ok(()), // Silently ignore other languages for now
        };

        let mut resolved_binary = binary.to_string();

        // If 'pyright' isn't in global PATH, check the project's virtual environment
        if language == "python" && which::which(binary).is_err() {
            let current_dir = std::env::current_dir().unwrap_or_default();
            let venv_path = if cfg!(windows) {
                current_dir.join("backend-python").join("venv").join("Scripts").join("pyright.exe")
            } else {
                current_dir.join("backend-python").join("venv").join("bin").join("pyright")
            };

            if venv_path.exists() {
                resolved_binary = venv_path.to_string_lossy().to_string();
                println!("[LSP] Found pyright in local venv: {}", resolved_binary);
            }
        }

        // Check if the binary exists before trying to spawn
        if which::which(&resolved_binary).is_err() && !std::path::Path::new(&resolved_binary).exists() {
            println!("[LSP] Skipping {}: binary '{}' not found in PATH or venv", language, binary);
            return Ok(());
        }

        let mut cmd = Command::new(&resolved_binary);
        for arg in args {
            cmd.arg(arg);
        }

        let mut child = cmd
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .map_err(|e| format!("Failed to start LSP {}: {}", language, e))?;

        let stdin = child.stdin.take().ok_or("Failed to open STDIN for LSP")?;
        let stdout = child.stdout.take().ok_or("Failed to open STDOUT for LSP")?;

        let (tx, mut _rx) = mpsc::unbounded_channel::<Value>();
        
        let mut framed_read = FramedRead::new(stdout, LspCodec);
        let language_clone = language.to_string();
        let _servers_arc = self.servers.clone();

        // Spawn a reader thread to handle messages from the LSP server
        tokio::spawn(async move {
            while let Some(msg_res) = framed_read.next().await {
                match msg_res {
                    Ok(msg) => {
                        // Forward signals back to the websocket bridge for now
                        // In the future we will use a global event system
                        println!("LSP [{}] message: {:?}", language_clone, msg);
                    }
                    Err(e) => {
                        eprintln!("LSP [{}] read error: {:?}", language_clone, e);
                        break;
                    }
                }
            }
        });

        // Initialize request
        let initialize_params = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "processId": std::process::id(),
                "rootUri": format!("file:///{}", workspace_path.replace("\\", "/")),
                "capabilities": {
                    "textDocument": {
                        "definition": { "dynamicRegistration": true },
                        "hover": { "dynamicRegistration": true },
                        "references": { "dynamicRegistration": true },
                        "completion": {
                            "dynamicRegistration": true,
                            "completionItem": {
                                "snippetSupport": true,
                                "commitCharactersSupport": true
                            }
                        }
                    }
                }
            }
        });

        let mut stdin_writer = stdin;
        let mut dst = BytesMut::new();
        use tokio_util::codec::Encoder;
        LspCodec.encode(initialize_params, &mut dst).map_err(|e| e.to_string())?;
        stdin_writer.write_all(&dst).await.map_err(|e| e.to_string())?;
        stdin_writer.flush().await.map_err(|e| e.to_string())?;

        let server = LspServer {
            language: language.to_string(),
            process: child,
            stdin: stdin_writer,
            request_id: 2,
            sender: tx,
        };

        servers.insert(language.to_string(), server);
        Ok(())
    }

    pub async fn request_definition(&self, language: &str, file_uri: &str, line: u32, character: u32) -> Result<(), String> {
        let mut servers = self.servers.lock().await;
        if let Some(server) = servers.get_mut(language) {
            let id = server.request_id;
            server.request_id += 1;

            let request = json!({
                "jsonrpc": "2.0",
                "id": id,
                "method": "textDocument/definition",
                "params": {
                    "textDocument": { "uri": file_uri },
                    "position": { "line": line, "character": character }
                }
            });

            self.send_request(server, request).await
        } else {
            Err(format!("LSP server for {} not found", language))
        }
    }

    pub async fn request_hover(&self, language: &str, file_uri: &str, line: u32, character: u32) -> Result<(), String> {
        let mut servers = self.servers.lock().await;
        if let Some(server) = servers.get_mut(language) {
            let id = server.request_id;
            server.request_id += 1;

            let request = json!({
                "jsonrpc": "2.0",
                "id": id,
                "method": "textDocument/hover",
                "params": {
                    "textDocument": { "uri": file_uri },
                    "position": { "line": line, "character": character }
                }
            });

            self.send_request(server, request).await
        } else {
            Err(format!("LSP server for {} not found", language))
        }
    }

    pub async fn request_completion(&self, language: &str, file_uri: &str, line: u32, character: u32) -> Result<(), String> {
        let mut servers = self.servers.lock().await;
        if let Some(server) = servers.get_mut(language) {
            let id = server.request_id;
            server.request_id += 1;

            let request = json!({
                "jsonrpc": "2.0",
                "id": id,
                "method": "textDocument/completion",
                "params": {
                    "textDocument": { "uri": file_uri },
                    "position": { "line": line, "character": character },
                    "context": {
                        "triggerKind": 1 // Invited
                    }
                }
            });

            self.send_request(server, request).await
        } else {
            Err(format!("LSP server for {} not found", language))
        }
    }

    async fn send_request(&self, server: &mut LspServer, request: Value) -> Result<(), String> {
        let mut dst = BytesMut::new();
        use tokio_util::codec::Encoder;
        LspCodec.encode(request, &mut dst).map_err(|e| e.to_string())?;
        server.stdin.write_all(&dst).await.map_err(|e| e.to_string())?;
        server.stdin.flush().await.map_err(|e| e.to_string())?;
        Ok(())
    }
}
