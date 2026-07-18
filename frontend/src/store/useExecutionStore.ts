import { create } from 'zustand';

interface ExecutionState {
  isRunning: boolean;
  lastExitCode: number | null;
  setRunning: (isRunning: boolean) => void;
  setExitCode: (code: number | null) => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  isRunning: false,
  lastExitCode: null,
  setRunning: (isRunning: boolean) => set({ isRunning }),
  setExitCode: (code: number | null) => set({ lastExitCode: code }),
}));
