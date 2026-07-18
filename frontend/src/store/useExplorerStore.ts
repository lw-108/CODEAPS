import { create } from 'zustand';
import { FileInfo } from '../hooks/useFileSystem';

interface ExplorerState {
  selectedItem: FileInfo | null;
  setSelectedItem: (item: FileInfo | null) => void;
}

export const useExplorerStore = (create as any)<ExplorerState>((set: any) => ({
  selectedItem: null,
  setSelectedItem: (item: FileInfo | null) => set({ selectedItem: item }),
}));
