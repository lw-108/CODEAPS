import { StateManager } from '../StateManager.js';

export class EditorArea {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.tabsBar = document.getElementById('tabs-bar');
        this.state = new StateManager();
        this.editor = null;
        this.tabs = {}; // { filename: { content, language, model, viewState } }
        this.activeTab = null;
        
        // Define theme once
        if (typeof monaco !== 'undefined') {
            this.defineCustomTheme();
        }

        this.initMonaco();
    }

    defineCustomTheme() {
        monaco.editor.defineTheme('CodeApsVibrant', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '52525b', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'e4e4e7', fontStyle: 'bold' },
                { token: 'string', foreground: 'a1a1aa' },
                { token: 'number', foreground: 'fafafa' },
                { token: 'type', foreground: 'd4d4d8' },
                { token: 'class', foreground: 'ffffff', fontStyle: 'bold' },
                { token: 'function', foreground: 'e4e4e7' },
                { token: 'variable', foreground: 'fafafa' }
            ],
            colors: {
                'editor.background': '#09090b',
                'editor.foreground': '#e4e4e7',
                'editor.lineHighlightBackground': '#27272a33',
                'editorCursor.foreground': '#fafafa',
                'editorWhitespace.foreground': '#3f3f4666',
                'editorIndentGuide.background': '#27272a',
                'editorIndentGuide.activeBackground': '#71717a',
                'editor.selectionBackground': '#ffffff22',
                'editor.inactiveSelectionBackground': '#ffffff11',
                'editorBreadcrumbs.foreground': '#a1a1aa',
                'editorBreadcrumbs.background': '#09090b',
                'editorBreadcrumbs.focusForeground': '#ffffff'
            }
        });
    }

    async initMonaco() {
        if (typeof monaco === 'undefined') {
            // Wait for monaco to load if it's being loaded dynamically
            await new Promise(resolve => {
                const check = () => {
                    if (typeof monaco !== 'undefined') resolve();
                    else setTimeout(check, 100);
                };
                check();
            });
        }

        this.defineCustomTheme();
        
        this.editor = monaco.editor.create(this.container, {
            theme: 'CodeApsVibrant',
            automaticLayout: true,
            fontSize: 14,
            lineHeight: 24,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: true, side: 'right', maxColumn: 80 },
            breadcrumbs: { enabled: true },
            multiCursorModifier: 'alt',
            scrollbar: { 
                vertical: 'visible',
                horizontal: 'visible',
                useShadows: false,
                verticalWidth: 8, 
                horizontalHeight: 8 
            },
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            readOnly: false,
            cursorSmoothCaretAnimation: 'on',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            formatOnPaste: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            folding: true,
            foldingHighlight: true,
            padding: { top: 20, bottom: 20 }
        });

        // Sync with StateManager for Line/Col
        this.editor.onDidChangeCursorPosition(e => {
            const statusLineCol = document.getElementById('status-line-col');
            if (statusLineCol) {
                statusLineCol.innerText = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
            }
        });

        // Store view state on change to persist scroll/collapse
        this.editor.onDidScrollChange(() => this.saveActiveViewState());

        this.setupAICodeLens();
        this.restoreSession();
    }

    setupAICodeLens() {
        monaco.languages.registerCodeLensProvider('*', {
            provideCodeLenses: (model) => {
                const lenses = [];
                const lines = model.getLineCount();
                for (let i = 1; i <= lines; i++) {
                    const content = model.getLineContent(i);
                    // Match functions in various languages
                    if (/^\s*(def |async function|function|class|pub fn|fn|export (const|let|var|function) )/.test(content)) {
                        lenses.push({
                            range: { startLineNumber: i, startColumn: 1, endLineNumber: i, endColumn: 1 },
                            id: `ai-opt-${i}`,
                            command: {
                                id: 'ai.optimize',
                                title: '✨ AI: Optimize Logic',
                                arguments: [content, i]
                            }
                        });
                    }
                }
                return { lenses, dispose: () => { } };
            }
        });

        this.editor.addAction({
            id: 'ai.optimize',
            label: 'AI: Optimize Code Block',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO],
            contextMenuGroupId: 'navigation',
            run: (ed) => {
                const selection = ed.getSelection();
                const code = ed.getModel().getValueInRange(selection) || ed.getModel().getLineContent(ed.getPosition().lineNumber);
                this.triggerAICommand(`Optimize this code:\n\n${code}`);
            }
        });

        // Inline AI Chat (Cmd+I)
        this.editor.addAction({
            id: 'ai.inline.chat',
            label: 'AI: Inline Magic',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
            run: (ed) => {
                const selection = ed.getSelection();
                const prompt = window.prompt("✨ AI: What should I do with this code?");
                if (prompt) {
                    const code = ed.getModel().getValueInRange(selection);
                    this.triggerAICommand(`${prompt}\n\nCode context:\n${code}`, true);
                }
            }
        });
    }

    triggerAICommand(prompt, isInline = false) {
        if (window.ide && window.ide.aiDashboard) {
            window.ide.switchView('ai');
            const promptInput = document.getElementById('ai-prompt-input');
            if (promptInput) {
                promptInput.value = prompt;
                document.getElementById('btn-generate-solutions').click();
            }
        }
    }

    openTab(filename, content = '', switchNow = true) {
        if (this.tabs[filename]) {
            if (switchNow) this.switchTab(filename);
            return;
        }

        const language = this.detectLanguage(filename);
        const model = monaco.editor.createModel(content, language);

        this.tabs[filename] = { 
            filename,
            language, 
            model,
            viewState: null 
        };

        this.renderTabs();
        if (switchNow) this.switchTab(filename);
        this.saveSession();
    }

    switchTab(filename) {
        if (!this.tabs[filename] || !this.editor) return;

        // Save current tab's view state before switching
        if (this.activeTab && this.tabs[this.activeTab]) {
            this.tabs[this.activeTab].viewState = this.editor.saveViewState();
        }

        this.activeTab = filename;
        this.editor.setModel(this.tabs[filename].model);
        
        if (this.tabs[filename].viewState) {
            this.editor.restoreViewState(this.tabs[filename].viewState);
        }

        this.editor.focus();

        // Update Status Bar info
        const statusLang = document.getElementById('status-lang');
        if (statusLang) statusLang.innerText = this.tabs[filename].language.toUpperCase();

        this.renderTabs();
        this.state.set('activeFile', filename);
    }

    closeTab(filename) {
        if (!this.tabs[filename]) return;

        this.tabs[filename].model.dispose();
        delete this.tabs[filename];

        if (this.activeTab === filename) {
            const remaining = Object.keys(this.tabs);
            if (remaining.length > 0) {
                this.switchTab(remaining[remaining.length - 1]);
            } else {
                this.activeTab = null;
                this.editor.setModel(null);
            }
        }
        this.renderTabs();
        this.saveSession();
    }

    saveActiveViewState() {
        if (this.activeTab && this.tabs[this.activeTab] && this.editor) {
            this.tabs[this.activeTab].viewState = this.editor.saveViewState();
        }
    }

    saveSession() {
        const sessionData = {
            activeTab: this.activeTab,
            tabs: Object.keys(this.tabs).map(f => ({
                filename: f,
                content: this.tabs[f].model.getValue(),
                language: this.tabs[f].language
            }))
        };
        this.state.set('editorSession', sessionData);
    }

    restoreSession() {
        const session = this.state.get('editorSession');
        if (!session || !session.tabs) return;

        session.tabs.forEach(t => {
            this.openTab(t.filename, t.content, false);
        });

        if (session.activeTab && this.tabs[session.activeTab]) {
            this.switchTab(session.activeTab);
        }
    }

    renderTabs() {
        this.tabsBar.innerHTML = '';
        Object.keys(this.tabs).forEach(filename => {
            const tab = document.createElement('div');
            tab.className = `editor-tab ${this.activeTab === filename ? 'active' : ''}`;
            tab.innerHTML = `
                <span class="tab-icon">${this.getIconForLang(this.tabs[filename].language)}</span>
                <span class="tab-title">${filename}</span>
                <i class="fa-solid fa-xmark tab-close"></i>
            `;

            tab.onclick = () => this.switchTab(filename);
            tab.querySelector('.tab-close').onclick = (e) => {
                e.stopPropagation();
                this.closeTab(filename);
            };

            this.tabsBar.appendChild(tab);
        });
    }

    getIconForLang(lang) {
        const icons = {
            'c': '<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/C_Programming_Language.svg/1920px-C_Programming_Language.svg.png" style="width:1.2em;height:1.2em;object-contain" />',
            'cpp': '<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/ISO_C%2B%2B_Logo.svg/1280px-ISO_C%2B%2B_Logo.svg.png" style="width:1.2em;height:1.2em;object-contain" />',
            'python': '<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/1280px-Python-logo-notext.svg.png" style="width:1.2em;height:1.2em;object-contain" />',
            'javascript': '<img src="https://www.svgrepo.com/show/373762/light-js.svg" style="width:1.2em;height:1.2em;object-contain" />',
            'typescript': '<img src="https://www.svgrepo.com/show/374144/typescript.svg" style="width:1.2em;height:1.2em;object-contain" />',
            'rust': '<img src="https://icons.veryicon.com/png/o/business/vscode-program-item-icon/rust-1.png" style="width:1.2em;height:1.2em;object-contain" />',
            'html': '<img src="https://upload.wikimedia.org/wikipedia/commons/6/61/HTML5_logo_and_wordmark.svg" style="width:1.2em;height:1.2em;object-contain" />',
            'css': '<img src="https://www.svgrepo.com/show/373535/css.svg" style="width:1.2em;height:1.2em;object-contain" />',
            'json': '<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/JSON_vector_logo.svg/3840px-JSON_vector_logo.svg.png" style="width:1.2em;height:1.2em;object-contain" />'
        };
        return icons[lang] || '<i class="fa-regular fa-file"></i>';
    }

    detectLanguage(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const map = {
            'py': 'python',
            'js': 'javascript',
            'ts': 'typescript',
            'rs': 'rust',
            'cpp': 'cpp',
            'json': 'json',
            'md': 'markdown',
            'html': 'html',
            'css': 'css'
        };
        return map[ext] || 'plaintext';
    }
}

