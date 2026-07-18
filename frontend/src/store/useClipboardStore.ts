import { create } from 'zustand';

export interface ClipboardItem {
  path: string;
  name: string;
  isDir: boolean;
  mode: 'cut' | 'copy';
}

interface ClipboardState {
  stagedItem: ClipboardItem | null;
  setStagedItem: (item: ClipboardItem | null) => void;
  clearClipboard: () => void;
}

export const useClipboardStore = create<ClipboardState>((set: any) => ({
  stagedItem: null,
  setStagedItem: (item: ClipboardItem | null) => set({ stagedItem: item }),
  clearClipboard: () => set({ stagedItem: null }),
}));
