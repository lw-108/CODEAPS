use std::sync::Arc;
use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use futures_util::StreamExt;
use crate::lsp::LspManager;
use serde_json::Value;

pub async fn start_lsp_websocket_server(addr: &str, _lsp_manager: Arc<LspManager>) {
    let listener = TcpListener::bind(addr).await.expect("Failed to bind LSP WebSocket server");
    println!("LSP WebSocket Bridge listening on: {}", addr);

    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(async move {
            let ws_stream = accept_async(stream).await.expect("Error during WebSocket handshake");
            let (_ws_sender, mut ws_receiver) = ws_stream.split();

            println!("New LSP WebSocket connection established");

            while let Some(msg) = ws_receiver.next().await {
                if let Ok(msg) = msg {
                    if msg.is_text() {
                        let text = msg.to_text().unwrap();
                        if let Ok(json) = serde_json::from_str::<Value>(text) {
                            // Forward to LSP Manager
                            println!("Received LSP JSON: {:?}", json);
                        }
                    }
                }
            }
        });
    }
}
