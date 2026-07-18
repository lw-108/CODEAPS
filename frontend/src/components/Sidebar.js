import { FileExplorer } from './FileExplorer.js';
import { AIChatSidebar } from './AIChatSidebar.js';

export class Sidebar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentTab = 'explorer';
        this.fileExplorer = null;
        this.aiChat = null;
        this.render();
    }

    switchTab(tabId) {
        if (this.currentTab === tabId) return;

        this.currentTab = tabId;
        const title = document.getElementById('sidebar-title');
        if (title) title.innerText = tabId.toUpperCase();

        // Update active state on activity bar
        document.querySelectorAll('.activity-bar .action-item').forEach(el => {
            el.classList.remove('active');
        });
        const activeBtn = document.getElementById(`btn-${tabId}`);
        if (activeBtn) activeBtn.classList.add('active');

        this.render();
    }

    render() {
        this.container.innerHTML = '';

        if (this.currentTab === 'explorer') {
            this.renderExplorer();
        } else if (this.currentTab === 'erp') {
            this.renderERP();
        } else if (this.currentTab === 'ai') {
            this.renderAI();
        }
    }

    renderExplorer() {
        this.container.innerHTML = `
            <div class="explorer-view premium-scroll">
                <div class="explorer-section collapsible">
                    <div class="section-header">
                        <i class="fa-solid fa-chevron-down"></i>
                        <span>OPEN EDITORS</span>
                    </div>
                    <div id="open-editors-list" class="list"></div>
                </div>
                <div class="explorer-section collapsible">
                    <div class="section-header">
                        <i class="fa-solid fa-chevron-down"></i>
                        <span>CODEAPS-WORKSPACE</span>
                    </div>
                    <div id="file-tree" class="list"></div>
                </div>
            </div>
        `;
        this.fileExplorer = new FileExplorer('file-tree');
    }

    renderERP() {
        this.container.innerHTML = `
            <div class="sidebar-info-view premium-scroll">
                <div class="info-card">
                    <div class="info-header">
                        <label>PROJECT VELOCITY</label>
                        <span class="value">65%</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill" style="width: 65%"></div>
                    </div>
                </div>
                
                <div class="info-card">
                    <div class="info-header">
                        <label>SYSTEM HEALTH</label>
                        <span class="status-indicator online">OPTIMAL</span>
                    </div>
                    <p class="sub-label">All microservices operational</p>
                </div>

                <div class="info-card">
                    <div class="info-header">
                        <label>PENDING TASKS</label>
                        <span class="badge ai">8</span>
                    </div>
                    <div class="task-mini-list">
                        <div class="mini-task">Fix AI imports</div>
                        <div class="mini-task">Update design system</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAI() {
        // Clear container and let AIChatSidebar take over
        this.aiChat = new AIChatSidebar(this.container);
    }
}

