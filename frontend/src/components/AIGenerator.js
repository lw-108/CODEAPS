export class AIGeneratorUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="ai-dashboard premium-scroll">
                <header class="dashboard-header">
                    <div class="header-content">
                        <div class="title-group">
                            <i class="fa-solid fa-microchip-ai pulse-icon"></i>
                            <h1>AI INTELLECTUAL ENGINE</h1>
                        </div>
                        <p>Enterprise-grade generation, algorithmic optimization, and pattern synthesis.</p>
                    </div>
                </header>

                <div class="ai-grid">
                    <section class="controls-panel card-glass">
                        <div class="field">
                            <label><i class="fa-solid fa-keyboard"></i> OBJECTIVE / REQUIREMENTS</label>
                            <textarea id="ai-prompt-input" placeholder="Describe the complex architecture or algorithm..."></textarea>
                        </div>
                        
                        <div class="config-row">
                            <div class="field">
                                <label>SYNTHESIS STRATEGY</label>
                                <select id="ai-strategy-select">
                                    <option value="production">Production-Grade</option>
                                    <option value="leetcode">Algorithmic (LeetCode)</option>
                                    <option value="optimize">Performance Optimizer</option>
                                    <option value="security">Security Audit</option>
                                </select>
                            </div>
                            <div class="field">
                                <label>TARGET LANGUAGE</label>
                                <select id="ai-lang-select">
                                    <option value="python">Python</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="rust">Rust</option>
                                    <option value="cpp">C++</option>
                                </select>
                            </div>
                        </div>

                        <button class="btn-primary-glow" id="btn-generate-solutions">
                            <i class="fa-solid fa-sparkles"></i> COMPILE INTELLIGENCE
                        </button>
                    </section>

                    <section class="results-panel card-glass" id="ai-results-area">
                        <div class="empty-state">
                            <div class="glow-orb"></div>
                            <i class="fa-solid fa-wand-magic-sparkles"></i>
                            <p>Orchestration Engine Ready.</p>
                            <span>Select a strategy and provide requirements to begin synthesis.</span>
                        </div>
                    </section>
                </div>
            </div>
        `;

        document.getElementById('btn-generate-solutions').addEventListener('click', () => this.handleGenerate());
    }

    async handleGenerate() {
        const prompt = document.getElementById('ai-prompt-input').value;
        const strategy = document.getElementById('ai-strategy-select').value;
        const lang = document.getElementById('ai-lang-select').value;

        if (!prompt) return;

        const resultsArea = document.getElementById('ai-results-area');
        resultsArea.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <span>Synchronizing with Neural Pipeline...</span>
                <p>Allocating compute resources for ${strategy} synthesis.</p>
            </div>
        `;

        try {
            const response = await fetch(`http://localhost:8000/api/v1/ai/generate/${strategy}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requirement: prompt,
                    language: lang,
                    problem: prompt
                })
            });

            const data = await response.json();
            if (response.ok) {
                this.renderSolution(data, strategy, lang);
            } else {
                throw new Error(data.detail || 'Synthesis failed');
            }
        } catch (error) {
            resultsArea.innerHTML = `
                <div class="error-msg">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <h3>Pipeline Interrupted</h3>
                    <p>${error.message}</p>
                    <button class="btn-ghost" onclick="location.reload()">Reset Engine</button>
                </div>
            `;
        }
    }

    renderSolution(data, strategy, lang) {
        const resultsArea = document.getElementById('ai-results-area');
        const code = data.code || data.optimal_solution || 'No code generated.';
        const complexity = data.complexity || { time: 'O(N)', space: 'O(1)' };

        resultsArea.innerHTML = `
            <div class="solution-view animate-fade-in">
                <div class="solution-header">
                    <div class="meta">
                        <span class="badge strategy">${strategy.toUpperCase()}</span>
                        <span class="badge time">${complexity.time}</span>
                    </div>
                    <div class="actions">
                        <button class="btn-icon" title="Copy Code" onclick="navigator.clipboard.writeText(\`${code.replace(/`/g, '\\`')}\`)">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                        <button class="btn-icon btn-action" id="btn-export-code" title="Export to Editor">
                            <i class="fa-solid fa-file-export"></i>
                        </button>
                    </div>
                </div>

                <div class="code-block-wrapper">
                    <pre><code class="language-${lang}">${this.escapeHtml(code)}</code></pre>
                </div>

                <div class="intelligence-grid">
                    <div class="intel-card">
                        <label>COMPLEXITY ANALYSIS</label>
                        <div class="metric"><span>Time</span> <b>${complexity.time}</b></div>
                        <div class="metric"><span>Space</span> <b>${complexity.space}</b></div>
                    </div>
                    
                    ${data.security_analysis ? `
                    <div class="intel-card warning">
                        <label>SECURITY INSIGHTS</label>
                        <ul>${data.security_analysis.map(s => `<li>${s}</li>`).join('')}</ul>
                    </div>` : ''}
                </div>

                <div class="reasoning-box">
                    <label>ARCHITECTURAL REASONING</label>
                    <p>${data.explanation || data.approach || 'Structural integrity verified.'}</p>
                </div>
            </div>
        `;

        document.getElementById('btn-export-code').addEventListener('click', () => {
            if (window.ide && window.ide.editorArea) {
                window.ide.switchView('editor');
                window.ide.editorArea.openTab(`generated_${Date.now()}.${this.getExt(lang)}`, code);
            }
        });
    }

    getExt(lang) {
        const map = { 'python': 'py', 'javascript': 'js', 'rust': 'rs', 'cpp': 'cpp' };
        return map[lang] || 'txt';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

