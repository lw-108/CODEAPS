/**
 * StateManager — Lightweight reactive state management for CodeAps IDE.
 * Backed by localStorage for persistence across sessions.
 * 
 * Usage:
 *   const state = new StateManager();
 *   state.set('theme', 'dark');
 *   state.subscribe('theme', (val) => applyTheme(val));
 *   state.get('theme'); // 'dark'
 */

const STORAGE_KEY = 'codeaps_state';

export class StateManager {
    constructor() {
        this._state = {};
        this._subscribers = {};
        this._restore();

        // Save full state snapshot before page unload
        window.addEventListener('beforeunload', () => this._persist());
    }

    /**
     * Get a state value by key.
     * @param {string} key 
     * @param {*} defaultValue
     * @returns {*}
     */
    get(key, defaultValue = null) {
        return key in this._state ? this._state[key] : defaultValue;
    }

    /**
     * Set a state value and notify subscribers.
     * @param {string} key 
     * @param {*} value 
     */
    set(key, value) {
        const previous = this._state[key];
        this._state[key] = value;

        // Notify subscribers only on change
        if (JSON.stringify(previous) !== JSON.stringify(value)) {
            this._notify(key, value, previous);
        }
    }

    /**
     * Update a nested object state by merging.
     * @param {string} key 
     * @param {object} partial 
     */
    merge(key, partial) {
        const current = this.get(key, {});
        this.set(key, { ...current, ...partial });
    }

    /**
     * Subscribe to changes on a specific key.
     * @param {string} key 
     * @param {function} callback - (newValue, previousValue) => void
     * @returns {function} unsubscribe function
     */
    subscribe(key, callback) {
        if (!this._subscribers[key]) {
            this._subscribers[key] = [];
        }
        this._subscribers[key].push(callback);

        // Return unsubscribe function
        return () => {
            this._subscribers[key] = this._subscribers[key].filter(cb => cb !== callback);
        };
    }

    /**
     * Persist current state to localStorage.
     */
    _persist() {
        try {
            const serialized = JSON.stringify(this._state);
            localStorage.setItem(STORAGE_KEY, serialized);
        } catch (e) {
            console.warn('[StateManager] Failed to persist state:', e.message);
        }
    }

    /**
     * Restore state from localStorage.
     */
    _restore() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                this._state = JSON.parse(raw);
                console.log('[StateManager] Restored session state');
            }
        } catch (e) {
            console.warn('[StateManager] Failed to restore state:', e.message);
            this._state = {};
        }
    }

    /**
     * Notify all subscribers of a key change.
     */
    _notify(key, value, previous) {
        const callbacks = this._subscribers[key] || [];
        for (const cb of callbacks) {
            try {
                cb(value, previous);
            } catch (e) {
                console.error(`[StateManager] Subscriber error for key "${key}":`, e);
            }
        }
    }

    /**
     * Force persist now (debounce-safe).
     */
    save() {
        this._persist();
    }

    /**
     * Get the full state snapshot (read-only copy).
     */
    snapshot() {
        return JSON.parse(JSON.stringify(this._state));
    }

    /**
     * Clear all state and localStorage.
     */
    reset() {
        this._state = {};
        this._subscribers = {};
        localStorage.removeItem(STORAGE_KEY);
    }
}
