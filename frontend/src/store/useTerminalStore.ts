import { create } from 'zustand';
import { useWorkspaceStore } from './useWorkspaceStore';

interface TerminalState {
  pendingPath: string | null;
  setPendingPath: (path: string | null) => void;
  triggerReset: number;
  requestReset: (path: string) => void;
}

export const useTerminalStore = create<TerminalState>()((set: any) => ({
  // Seed initial path from workspace store safely
  pendingPath: useWorkspaceStore.getState()?.workspacePath || null,
  setPendingPath: (path: string | null) => set({ pendingPath: path }),
  triggerReset: 0,
  requestReset: (path: string) => set((state: TerminalState) => {
    // Prevent redundant reset pulses for identical paths
    if (state.pendingPath === path && state.triggerReset > 0) return state;
    
    return { 
      pendingPath: path, 
      triggerReset: state.triggerReset + 1 
    };
  }),
}));



