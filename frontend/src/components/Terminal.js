export class TerminalManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.term = null;
        this.fitAddon = null;
        this.isReady = false;
        
        this.initTerminal();
    }

    async initTerminal() {
        if (typeof Terminal === 'undefined') {
            await new Promise(resolve => {
                const check = () => {
                    if (typeof Terminal !== 'undefined') resolve();
                    else setTimeout(check, 100);
                };
                check();
            });
        }

        this.term = new Terminal({
            cursorBlink: true,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            theme: {
                background: '#09090b',
                foreground: '#e4e4e7',
                cursor: '#a1a1aa',
                selection: 'rgba(255, 255, 255, 0.1)',
                black: '#09090b',
                red: '#ef4444',
                green: '#22c55e',
                yellow: '#eab308',
                blue: '#71717a',
                magenta: '#d4d4d8',
                cyan: '#a1a1aa',
                white: '#fafafa'
            },
            allowTransparency: true,
            rows: 20
        });

        if (typeof FitAddon !== 'undefined') {
            this.fitAddon = new FitAddon();
            this.term.loadAddon(this.fitAddon);
        }

        this.term.open(this.container);
        if (this.fitAddon) this.fitAddon.fit();

        this.term.write('\x1b[1;37mCodeAps Elegant Shell v1.2.0 (Zinc Native)\x1b[0m\r\n');
        this.term.write('\x1b[38;5;244mSystem connected. Neural pipeline stable.\x1b[0m\r\n\r\n');

        // Connect to Tauri Backend
        this.setupTauriIPC();

        this.term.onData(data => {
            if (this.isReady) {
                window.__TAURI__.invoke('write_terminal', { input: data });
            }
        });

        window.addEventListener('resize', () => {
            if (this.fitAddon && this.term && this.term.element && this.term.element.offsetParent) {
                this.fitAddon.fit();
            }
        });
    }

    async setupTauriIPC() {
        if (!window.__TAURI__) {
            this.term.write('\x1b[31m[Error] Tauri context not found. Running in mock mode.\x1b[0m\r\n$ ');
            return;
        }

        try {
            // Listen for output from the backend
            await window.__TAURI__.event.listen('terminal-output', (event) => {
                this.term.write(event.payload.data);
            });

            // Start the shell process
            await window.__TAURI__.invoke('create_terminal');
            this.isReady = true;
            console.log('[Terminal] Native shell initialized.');
        } catch (e) {
            this.term.write(`\x1b[31m[Error] Failed to initialize native shell: ${e}\x1b[0m\r\n$ `);
        }
    }

    /**
     * Trigger AI suggestion for a failed command or complex task.
     */
    suggestAI(command) {
        this.term.write(`\r\n\x1b[1;35m[AI] Analyzing command: "${command}"...\x1b[0m\r\n`);
        if (window.ide && window.ide.aiDashboard) {
            window.ide.switchView('ai');
            const promptInput = document.getElementById('ai-prompt-input');
            if (promptInput) {
                promptInput.value = `The terminal command "${command}" failed or needs improvement. Please suggest a better way or explain the error.`;
                document.getElementById('btn-generate-solutions').click();
            }
        }
    }
}

