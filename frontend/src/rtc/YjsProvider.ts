import * as Y from 'yjs';
import { fileWatcherRTC } from './fileWatcher';

// Convert Uint8Array to Base64 String
export const uint8ArrayToBase64 = (buffer: Uint8Array): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

// Convert Base64 String to Uint8Array
export const base64ToUint8Array = (base64: string): Uint8Array => {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
};

export class CodeApsYjsProvider {
    doc: Y.Doc;
    room: string;
    clientId: number;
    private onUpdateCallback: (update: Uint8Array, origin: any) => void;
    private messageListener: (e: CustomEvent) => void;
    private isListenerAttached: boolean = false;
    private joinTimeout: any = null;

    constructor(doc: Y.Doc, room: string) {
        this.doc = doc;
        this.room = room;
        this.clientId = this.doc.clientID;
        
        // When Yjs doc updates locally, broadcast it
        this.onUpdateCallback = (update: Uint8Array, origin: any) => {
            if (origin !== this) {
                this.broadcastUpdate(update);
            }
        };
        this.doc.on('update', this.onUpdateCallback);

        // Tell websocket we joined the room
        const joinRoom = () => {
            if (fileWatcherRTC.socket?.readyState === WebSocket.OPEN) {
                fileWatcherRTC.socket.send(JSON.stringify({
                    type: 'join_room',
                    room: this.room
                }));
            } else {
                // Buffer to allow state transition to finalize
                this.joinTimeout = setTimeout(() => {
                    if (fileWatcherRTC.socket?.readyState === WebSocket.OPEN) {
                        fileWatcherRTC.socket.send(JSON.stringify({
                            type: 'join_room',
                            room: this.room
                        }));
                    }
                }, 10);
            }
        };

        if (fileWatcherRTC.socket?.readyState === WebSocket.OPEN) {
            joinRoom();
        } else {
            window.addEventListener('rtc-open', joinRoom, { once: true });
        }

        this.messageListener = (e: CustomEvent) => {
            const msg = e.detail;
            if (msg.type === 'yjs_update' && msg.from !== fileWatcherRTC.clientId) {
                const update = base64ToUint8Array(msg.data);
                Y.applyUpdate(this.doc, update, this);
            }
        };

        if (!this.isListenerAttached) {
            window.addEventListener(`yjs-${this.room}`, this.messageListener as EventListener);
            this.isListenerAttached = true;
        }
    }

    private broadcastUpdate(update: Uint8Array) {
        if (!fileWatcherRTC.socket || fileWatcherRTC.socket.readyState !== WebSocket.OPEN) return;
        
        const base64Update = uint8ArrayToBase64(update);
        fileWatcherRTC.socket.send(JSON.stringify({
            type: 'yjs_update',
            room: this.room,
            data: base64Update
        }));
    }

    destroy() {
        if (this.joinTimeout) clearTimeout(this.joinTimeout);
        
        this.doc.off('update', this.onUpdateCallback);
        
        if (this.isListenerAttached) {
            window.removeEventListener(`yjs-${this.room}`, this.messageListener as EventListener);
            this.isListenerAttached = false;
        }

        if (fileWatcherRTC.socket?.readyState === WebSocket.OPEN) {
            fileWatcherRTC.socket.send(JSON.stringify({
                type: 'leave_room',
                room: this.room
            }));
        }
    }
}
