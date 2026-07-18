import { createWithEqualityFn } from 'zustand/traditional';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
  workspacePath: string | null;
  workspaceName: string | null;
  recentWorkspaces: string[];
  isWorkspaceOpen: boolean;

  openWorkspace: (path: string) => void;
  closeWorkspace: () => void;
  addRecentWorkspace: (path: string) => void;
}

export const useWorkspaceStore = createWithEqualityFn<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspacePath: null,
      workspaceName: null,
      recentWorkspaces: [],
      isWorkspaceOpen: false,

      openWorkspace: (path: string) => {
        const name = path.split(/[\\/]/).pop() || path;

        const recents = get().recentWorkspaces.filter((r: string) => r !== path);
        recents.unshift(path);
        if (recents.length > 5) recents.pop();

        set({
          workspacePath: path,
          workspaceName: name,
          isWorkspaceOpen: true,
          recentWorkspaces: recents,
        });
      },

      closeWorkspace: () =>
        set({
          workspacePath: null,
          workspaceName: null,
          isWorkspaceOpen: false,
        }),

      addRecentWorkspace: (path: string) => {
        const recents = get().recentWorkspaces.filter((r: string) => r !== path);
        recents.unshift(path);
        if (recents.length > 5) recents.pop();

        set({ recentWorkspaces: recents });
      },
    }),
    {
      name: 'codeaps-workspace-storage',
    }
  )
);