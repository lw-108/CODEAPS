import { invoke } from '@tauri-apps/api/tauri';

export class LspClient {
    private socket: WebSocket | null = null;
    private language: string;
    private workspacePath: string;
    private pendingRequests: Map<number, (value: any) => void> = new Map();

    constructor(language: string, workspacePath: string) {
        this.language = language;
        this.workspacePath = workspacePath;
    }

    async connect() {
        // First, ensure the backend language server is started
        try {
            await invoke('lsp_initialize', {
                language: this.language,
                workspacePath: this.workspacePath
            });
            console.log(`LSP [${this.language}] initialized via Tauri`);
        } catch (err) {
            console.error(`Failed to initialize LSP [${this.language}]:`, err);
            return;
        }

        // Connect to the WebSocket bridge
        this.socket = new WebSocket('ws://127.0.0.1:9001');
        
        this.socket.onopen = () => {
            console.log(`LSP WebSocket [${this.language}] connected`);
        };

        this.socket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                // If it's a response with an ID, resolve the pending request
                if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
                    const resolve = this.pendingRequests.get(msg.id);
                    if (resolve) {
                        resolve(msg.result);
                        this.pendingRequests.delete(msg.id);
                    }
                }
            } catch (err) {
                console.error('Failed to parse LSP WebSocket message:', err);
            }
        };

        this.socket.onerror = (err) => {
            console.error(`LSP WebSocket [${this.language}] error:`, err);
        };
    }

    async request(method: string, params: any): Promise<any> {
        // Fallback for commands not yet in websocket bridge
        if (method === 'textDocument/completion') {
            const id = Math.floor(Math.random() * 1000000);
            return new Promise((resolve) => {
                this.pendingRequests.set(id, resolve);
                invoke('lsp_completion', {
                    language: this.language,
                    fileUri: params.textDocument.uri,
                    line: params.position.line,
                    character: params.position.character
                }).catch(err => {
                    console.error('LSP Completion Request Failed:', err);
                    this.pendingRequests.delete(id);
                    resolve(null);
                });
                
                // Set a timeout to prevent hanging
                setTimeout(() => {
                    if (this.pendingRequests.has(id)) {
                        this.pendingRequests.delete(id);
                        resolve(null);
                    }
                }, 5000);
            });
        }

        // Legacy direct socket send (if applicable)
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return null;
        this.socket.send(JSON.stringify({ jsonrpc: '2.0', id: Math.floor(Math.random() * 1000), method, params }));
        return null;
    }
}
