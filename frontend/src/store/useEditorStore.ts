import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tab {
  filename: string;
  filePath: string;
  content: string;
  language: string;
  isDirty?: boolean;
}

export interface EditorState {
  tabs: Tab[];
  activeFile: string | null;
  
  openTab: (filename: string, content: string, language: string, filePath: string) => void;
  closeTab: (filename: string) => void;
  setActiveFile: (filename: string) => void;
  updateTabContent: (filename: string, content: string) => void;
  getActiveTab: () => Tab | null;
  markSaved: (filename: string) => void;
  updateTabPath: (filename: string, newPath: string) => void;
  clearAllTabs: () => void;
}

export const useEditorStore = createWithEqualityFn<EditorState>(
  persist(
    (set, get) => ({
      tabs: [],
      activeFile: null,

      openTab: (filename: string, content: string, language: string, filePath: string) => set((state: EditorState) => {
        const existsIndex = state.tabs.findIndex(t => t.filePath === filePath);
        
        if (existsIndex !== -1) {
          // Update existing tab with new content
          const updatedTabs = [...state.tabs];
          updatedTabs[existsIndex] = { 
            ...updatedTabs[existsIndex], 
            content, 
            language, 
            filePath, 
            isDirty: false 
          };
          return { tabs: updatedTabs, activeFile: filePath };
        }
        
        return {
          tabs: [...state.tabs, { filename, content, language, filePath, isDirty: false }],
          activeFile: filePath
        };
      }),

      closeTab: (path: string) => set((state: EditorState) => {
        const nextTabs = state.tabs.filter(t => t.filePath !== path);
        let nextActive = state.activeFile;
        if (state.activeFile === path) {
          nextActive = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].filePath : null;
        }
        return { tabs: nextTabs, activeFile: nextActive };
      }),

      setActiveFile: (path: string) => set({ activeFile: path }),

      updateTabContent: (path: string, content: string) => set((state: EditorState) => ({
        tabs: state.tabs.map(t => t.filePath === path ? { ...t, content, isDirty: true } : t)
      })),

      getActiveTab: () => {
        const state = get();
        return state.tabs.find(t => t.filePath === state.activeFile) || null;
      },

      markSaved: (path: string) => set((state: EditorState) => ({
        tabs: state.tabs.map(t => t.filePath === path ? { ...t, isDirty: false } : t)
      })),

      updateTabPath: (oldPath: string, newPath: string) => set((state: EditorState) => {
        const newName = newPath.split(/[\\/]/).pop() || oldPath;
        return {
          tabs: state.tabs.map(t => t.filePath === oldPath ? { ...t, filePath: newPath, filename: newName } : t),
          activeFile: state.activeFile === oldPath ? newPath : state.activeFile
        };
      }),

      clearAllTabs: () => set({ tabs: [], activeFile: null }),
    }),
    {
      name: 'codeaps-editor-storage',
    }
  )
);
