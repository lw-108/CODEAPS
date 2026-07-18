/**
 * AutoSave — Periodically saves editor content to localStorage.
 * Detects unsaved (dirty) changes and offers recovery on next load.
 * 
 * Usage:
 *   const autoSave = new AutoSave(stateManager);
 *   autoSave.trackEditor(editorInstance);
 *   autoSave.start();
 */

const AUTOSAVE_KEY = 'codeaps_autosave';
const AUTOSAVE_INTERVAL_MS = 30_000; // 30 seconds

export class AutoSave {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this._intervalId = null;
        this._dirtyTabs = new Set();
        this._editors = {};    // tabId -> { content, language, cursorPosition }
    }

    /**
     * Start the auto-save timer.
     */
    start() {
        if (this._intervalId) return;
        this._intervalId = setInterval(() => this._save(), AUTOSAVE_INTERVAL_MS);
        console.log(`[AutoSave] Started (interval: ${AUTOSAVE_INTERVAL_MS / 1000}s)`);

        // Also save on page unload
        window.addEventListener('beforeunload', (e) => {
            if (this._dirtyTabs.size > 0) {
                this._save();
                // Warn user about unsaved changes (browser may show prompt)
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    /**
     * Stop the auto-save timer.
     */
    stop() {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    /**
     * Register a tab's content for tracking.
     * @param {string} tabId - Unique identifier for the tab/file
     * @param {string} content - Current editor content
     * @param {object} metadata - { language, cursorLine, cursorColumn }
     */
    trackContent(tabId, content, metadata = {}) {
        const previous = this._editors[tabId];
        if (previous && previous.content === content) return; // No change

        this._editors[tabId] = {
            content,
            language: metadata.language || 'plaintext',
            cursorLine: metadata.cursorLine || 1,
            cursorColumn: metadata.cursorColumn || 1,
            timestamp: Date.now(),
        };
        this._dirtyTabs.add(tabId);
    }

    /**
     * Mark a tab as saved (no longer dirty).
     * @param {string} tabId 
     */
    markSaved(tabId) {
        this._dirtyTabs.delete(tabId);
    }

    /**
     * Check if a specific tab has unsaved changes.
     * @param {string} tabId 
     * @returns {boolean}
     */
    isDirty(tabId) {
        return this._dirtyTabs.has(tabId);
    }

    /**
     * Get all dirty tab IDs.
     * @returns {string[]}
     */
    getDirtyTabs() {
        return Array.from(this._dirtyTabs);
    }

    /**
     * Check for a previous recovery snapshot.
     * @returns {object|null} - The saved snapshot or null
     */
    checkRecovery() {
        try {
            const raw = localStorage.getItem(AUTOSAVE_KEY);
            if (!raw) return null;

            const snapshot = JSON.parse(raw);
            if (!snapshot || !snapshot.tabs || Object.keys(snapshot.tabs).length === 0) {
                return null;
            }

            return snapshot;
        } catch (e) {
            console.warn('[AutoSave] Failed to read recovery data:', e.message);
            return null;
        }
    }

    /**
     * Restore content from a recovery snapshot.
     * @param {object} snapshot
     * @returns {object} - Map of tabId -> { content, metadata }
     */
    restoreFromSnapshot(snapshot) {
        if (!snapshot || !snapshot.tabs) return {};
        return snapshot.tabs;
    }

    /**
     * Clear the recovery snapshot (after successful restore or dismissal).
     */
    clearRecovery() {
        localStorage.removeItem(AUTOSAVE_KEY);
        console.log('[AutoSave] Recovery data cleared');
    }

    /**
     * Save current dirty editors to localStorage.
     */
    _save() {
        if (this._dirtyTabs.size === 0) return;

        try {
            const snapshot = {
                timestamp: Date.now(),
                tabs: {},
            };

            for (const tabId of this._dirtyTabs) {
                if (this._editors[tabId]) {
                    snapshot.tabs[tabId] = this._editors[tabId];
                }
            }

            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
            console.log(`[AutoSave] Saved ${this._dirtyTabs.size} dirty tab(s)`);
        } catch (e) {
            console.warn('[AutoSave] Failed to save:', e.message);
        }
    }
}
