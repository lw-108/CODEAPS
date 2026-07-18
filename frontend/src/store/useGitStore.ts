import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';
import { useWorkspaceStore } from './useWorkspaceStore';

export interface GitFileStatus {
    path: string;
    status: string;
    is_staged: boolean;
    display_status: string;
}

export interface GitStatusResult {
    branch: string;
    files: GitFileStatus[];
    is_repo: boolean;
    ahead: number;
    behind: number;
}

export interface GitCommitInfo {
    id: string;
    short_id: string;
    message: string;
    author: string;
    email: string;
    timestamp: number;
    date: string;
}

export interface GitDiffResult {
    file: string;
    diff: string;
    additions: number;
    deletions: number;
}

interface GitState {
    status: GitStatusResult | null;
    log: GitCommitInfo[];
    diffs: Record<string, GitDiffResult>;
    isLoading: boolean;
    refreshStatus: () => Promise<void>;
    refreshLog: (limit?: number) => Promise<void>;
    getDiff: (file?: string) => Promise<GitDiffResult[]>;
    stageFile: (file: string) => Promise<void>;
    unstageFile: (file: string) => Promise<void>;
    stageAll: () => Promise<void>;
    commit: (message: string) => Promise<string>;
    clearDiffs: () => void;
}

export const useGitStore = create<GitState>((set, get) => ({
    status: null,
    log: [],
    diffs: {},
    isLoading: false,

    refreshStatus: async () => {
        const { workspacePath } = useWorkspaceStore.getState();
        if (!workspacePath || workspacePath === '__untitled__') return;
        
        set({ isLoading: true });
        try {
            const result = await invoke('git_status', { path: workspacePath }) as GitStatusResult;
            set({ status: result });
            // Chain refresh log to keep context in sync
            get().refreshLog();
        } catch (err: any) {
            if (!err.toString().includes('NotFound') && !err.toString().includes('Repository')) {
                console.error('Git status failed:', err);
            }
        } finally {
            set({ isLoading: false });
        }
    },

    refreshLog: async (limit: number = 20) => {
        const { workspacePath } = useWorkspaceStore.getState();
        if (!workspacePath || workspacePath === '__untitled__') return;

        try {
            const result = await invoke('git_log', { path: workspacePath, limit }) as GitCommitInfo[];
            set({ log: result });
        } catch (err: any) {
            if (!err.toString().includes('NotFound') && !err.toString().includes('Repository')) {
                console.error('Git log failed:', err);
            }
        }
    },

    getDiff: async (file?: string) => {
        const { workspacePath } = useWorkspaceStore.getState();
        if (!workspacePath || workspacePath === '__untitled__') return [];

        try {
            const result = await invoke('git_diff', { path: workspacePath, file: file || "" }) as GitDiffResult[];
            const newDiffs = { ...get().diffs };
            result.forEach(d => {
                newDiffs[d.file] = d;
            });
            set({ diffs: newDiffs });
            return result;
        } catch (err) {
            console.error('Git diff failed:', err);
            return [];
        }
    },

    stageFile: async (file: string) => {
        const { workspacePath } = useWorkspaceStore.getState();
        if (!workspacePath) return;
        try {
            await invoke('git_stage_file', { path: workspacePath, file });
            await get().refreshStatus();
        } catch (err) {
            console.error('Git stage failed:', err);
        }
    },

    unstageFile: async (file: string) => {
        const { workspacePath } = useWorkspaceStore.getState();
        if (!workspacePath) return;
        try {
            await invoke('git_unstage_file', { path: workspacePath, file });
            await get().refreshStatus();
        } catch (err) {
            console.error('Git unstage failed:', err);
        }
    },

    stageAll: async () => {
        const { workspacePath } = useWorkspaceStore.getState();
        if (!workspacePath) return;
        try {
            await invoke('git_stage_all', { path: workspacePath });
            await get().refreshStatus();
        } catch (err) {
            console.error('Git stage all failed:', err);
        }
    },

    commit: async (message: string) => {
        const { workspacePath } = useWorkspaceStore.getState();
        if (!workspacePath) throw new Error('No workspace path');
        try {
            set({ isLoading: true });
            const result = await invoke('git_commit', { path: workspacePath, message }) as string;
            await get().refreshStatus();
            await get().refreshLog();
            return result;
        } catch (err) {
            console.error('Git commit failed:', err);
            throw err;
        } finally {
            set({ isLoading: false });
        }
    },

    clearDiffs: () => set({ diffs: {} })
}));
