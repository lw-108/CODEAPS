import { EditorArea } from './components/EditorArea.js';
import { Sidebar } from './components/Sidebar.js';
import { TerminalManager } from './components/Terminal.js';
import { AIGeneratorUI } from './components/AIGenerator.js';
import { StateManager } from './StateManager.js';
import { AutoSave } from './components/AutoSave.js';

class CodeApsIDE {
    constructor() {
        this.state = new StateManager();
        this.autoSave = new AutoSave(this.state);

        // Core UI components
        this.editorArea = new EditorArea('editor-container');
        this.sidebar = new Sidebar('sidebar-content');
        this.terminal = new TerminalManager('terminal-container');
        this.aiDashboard = new AIGeneratorUI('ai-view-container');

        this.currentView = this.state.get('currentView', 'editor');
        this.initEventListeners();
        this.initHealthCheck();
        this.restoreSession();
        this.autoSave.start();
        this.applyTheme();
    }

    initEventListeners() {
        // Activity Bar navigation
        document.getElementById('btn-explorer').addEventListener('click', () => {
            this.switchView('editor');
            this.sidebar.switchTab('explorer');
        });

        document.getElementById('btn-erp').addEventListener('click', () => {
            this.switchView('editor'); // Shared main view
            this.sidebar.switchTab('erp');
        });

        document.getElementById('btn-ai').addEventListener('click', () => {
            this.switchView('ai');
            this.sidebar.switchTab('ai');
        });

        // Vertical resizer (Editor/Terminal split)
        const resizer = document.getElementById('resizer-v');
        const panel = document.getElementById('panel-area');
        let isResizing = false;

        resizer.addEventListener('mousedown', () => {
            isResizing = true;
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const newHeight = window.innerHeight - e.clientY;
            if (newHeight > 50 && newHeight < window.innerHeight * 0.8) {
                panel.style.height = `${newHeight}px`;
                if (this.editorArea.editor) this.editorArea.editor.layout();
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = 'default';
                document.body.style.userSelect = 'auto';
                this.state.set('panelHeight', panel.style.height);
            }
        });
    }

    /**
     * Periodically check backend health and update status bar.
     */
    async initHealthCheck() {
        const updateHealth = async () => {
            const syncIcon = document.getElementById('status-sync');
            try {
                const response = await fetch('http://localhost:8000/api/v1/health');
                const data = await response.json();

                if (data.status === 'healthy') {
                    syncIcon.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#48bb78"></i> System Ready`;
                } else {
                    syncIcon.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color:#ed8936"></i> Degraded`;
                }
            } catch (e) {
                syncIcon.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color:#c53030"></i> Offline`;
            }
        };

        updateHealth();
        setInterval(updateHealth, 30000); // Check every 30s
    }

    switchView(viewId) {
        if (this.currentView === viewId) return;

        document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(`${viewId}-view-container`);
        if (target) {
            target.classList.add('active');
            this.currentView = viewId;
            this.state.set('currentView', viewId);
        }

        if (viewId === 'editor' && this.editorArea.editor) {
            this.editorArea.editor.layout();
        }
    }

    applyTheme() {
        const theme = this.state.get('theme', 'dark');
        document.body.className = `vscode-${theme}`;
        // Custom variable overrides could go here for "Premium" sub-themes
    }

    restoreSession() {
        const savedView = this.state.get('currentView', 'editor');
        if (savedView !== 'editor') this.switchView(savedView);

        const panelHeight = this.state.get('panelHeight');
        if (panelHeight) {
            const panel = document.getElementById('panel-area');
            if (panel) panel.style.height = panelHeight;
        }

        const recovery = this.autoSave.checkRecovery();
        if (recovery) this.showRecoveryPrompt(recovery);
    }

    showRecoveryPrompt(snapshot) {
        const tabCount = Object.keys(snapshot.tabs).length;
        const banner = document.createElement('div');
        banner.className = 'recovery-banner-premium';
        banner.innerHTML = `
            <span>🔄 Found ${tabCount} unsaved tab(s). Restore?</span>
            <div class="actions">
                <button id="btn-recover" class="btn-primary">Restore</button>
                <button id="btn-dismiss" class="btn-ghost">Dismiss</button>
            </div>
        `;
        document.body.appendChild(banner);

        document.getElementById('btn-recover').addEventListener('click', () => {
            this.autoSave.restoreFromSnapshot(snapshot);
            banner.remove();
        });

        document.getElementById('btn-dismiss').addEventListener('click', () => {
            this.autoSave.clearRecovery();
            banner.remove();
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.ide = new CodeApsIDE();
});
