import { createWithEqualityFn } from 'zustand/traditional';
import { persist } from 'zustand/middleware';

interface LayoutState {
  isSidebarVisible: boolean;
  isTerminalVisible: boolean;
  isChatVisible: boolean;
  isCommandPaletteVisible: boolean;
  sidebarSize: number;
  terminalSize: number;
  rightPanelMode: 'stats' | 'chat' | 'analysis' | 'requirements' | 'lifecycle';
  isWelcomeVisible: boolean;
  isLoginVisible: boolean;
  terminalActiveTab: 'tests' | 'console' | 'problems';
  toggleSidebar: () => void;
  toggleTerminal: () => void;
  toggleWelcome: () => void;
  toggleLogin: () => void;
  setLoginVisible: (v: boolean) => void;
  setCommandPaletteVisible: (v: boolean) => void;
  setRightPanelMode: (mode: 'stats' | 'chat' | 'analysis' | 'requirements' | 'lifecycle') => void;
  setTerminalActiveTab: (tab: 'tests' | 'console' | 'problems') => void;
  setSidebarSize: (size: number) => void;
  setTerminalSize: (size: number) => void;
}

export const useLayoutStore = createWithEqualityFn<LayoutState>()(
  persist<LayoutState>(
    (set) => ({
      isSidebarVisible: true,
      isTerminalVisible: true,
      isChatVisible: true,
      isCommandPaletteVisible: false,
      sidebarSize: 20,
      terminalSize: 30,
      rightPanelMode: 'stats',
      isWelcomeVisible: true,
      isLoginVisible: false,
      terminalActiveTab: 'tests',
      toggleSidebar: () => set((state: LayoutState) => ({ isSidebarVisible: !state.isSidebarVisible })),
      toggleTerminal: () => set((state: LayoutState) => ({ isTerminalVisible: !state.isTerminalVisible })),
      toggleWelcome: () => set((state: LayoutState) => ({ isWelcomeVisible: !state.isWelcomeVisible })),
      toggleLogin: () => set((state: LayoutState) => ({ isLoginVisible: !state.isLoginVisible })),
      setLoginVisible: (v: boolean) => set({ isLoginVisible: v }),
      setCommandPaletteVisible: (v: boolean) => set({ isCommandPaletteVisible: v }),
      setRightPanelMode: (mode: 'stats' | 'chat' | 'analysis' | 'requirements' | 'lifecycle') => set({ rightPanelMode: mode }),
      setTerminalActiveTab: (tab: 'tests' | 'console' | 'problems') => set({ terminalActiveTab: tab }),
      setSidebarSize: (size: number) => set({ sidebarSize: size }),
      setTerminalSize: (size: number) => set({ terminalSize: size }),
    }),
    {
      name: 'codeaps-layout-storage',
    }
  )
);
