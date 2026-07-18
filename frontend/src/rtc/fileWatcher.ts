import { useEditorStore } from '@/store/useEditorStore';
import { invoke } from '@tauri-apps/api/tauri';

class FileWatcherRTC {
    public socket: WebSocket | null = null;
    public clientId: string;

    constructor() {
        this.clientId = `client_${Math.random().toString(36).substr(2, 9)}`;
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // In Tauri, host might be 'tauri.localhost'. Default to backend port 8000.
        let host = window.location.host;
        if (!host || host.includes('tauri')) {
            host = '127.0.0.1:8000';
        }
        const url = `${protocol}//${host}/api/v1/ws/${this.clientId}`;

        console.log(`[RTC] Connecting to ${url}`);
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log('[RTC] Neural Link Established');
            window.dispatchEvent(new CustomEvent('rtc-open'));
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (err) {
                console.error('[RTC] Message parse error:', err);
            }
        };

        this.socket.onclose = () => {
            console.log('[RTC] Neural Link Severed. Reconnecting...');
            setTimeout(() => this.connect(), 3000);
        };
    }

    private async handleMessage(message: any) {
        if (!message || typeof message !== 'object') return;

        if (message.type === 'fs_event' && message.data) {
            const { event, path } = message.data;
            if (!event || !path) return;
            
            console.log(`[RTC] FS Event: ${event} on ${path}`);

            if (event === 'file_changed') {
                const { tabs, updateTabContent, activeFile, markSaved } = useEditorStore.getState();
                const targetTab = tabs.find((t: any) => t.filePath === path);
                
                if (targetTab) {
                    try {
                        const content = await invoke('read_file_content', { path: targetTab.filePath }) as string;
                        
                        if (content !== targetTab.content && !targetTab.isDirty) {
                            console.log(`[RTC] Auto-syncing ${path}`);
                            updateTabContent(targetTab.filePath, content);
                            markSaved(targetTab.filePath);
                        }
                    } catch (err) {
                        console.error(`[RTC] Failed to sync ${path}:`, err);
                    }
                }
            }
        } else if (message.type === 'telemetry' && message.data) {
            const event = new CustomEvent('system-telemetry', { detail: message.data });
            window.dispatchEvent(event);
        } else if (message.type === 'yjs_update') {
            const room = message.room;
            if (room && message.data) {
                const event = new CustomEvent(`yjs-${room}`, { detail: message });
                window.dispatchEvent(event);
            }
        }
    }
}

export const fileWatcherRTC = new FileWatcherRTC();
