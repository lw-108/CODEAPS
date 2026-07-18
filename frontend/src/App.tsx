import React, { useEffect } from 'react';
import { TopBar } from './components/layout/TopBar';
import { StatusBar } from './components/layout/StatusBar';
import { SplitLayout } from './components/layout/SplitLayout';
import { CommandPalette } from './components/layout/CommandPalette';
import { useLayoutStore } from './store/useLayoutStore';
import { useEditorStore } from './store/useEditorStore';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import { useSettingsStore } from './store/useSettingsStore';
import { invoke } from '@tauri-apps/api/tauri';
import { listen, emit } from '@tauri-apps/api/event';
import { fileWatcherRTC } from './rtc/fileWatcher';
import { ollamaService } from './services/OllamaService';
import { NeuralDialog } from './components/ui/NeuralDialog';
import { useModalStore } from './store/useModalStore';
import { MenuBar } from './components/layout/MenuBar';

export default function App() {
  const { toggleSidebar, toggleTerminal, setCommandPaletteVisible, isWelcomeVisible } = useLayoutStore((state: any) => ({
    toggleSidebar: state.toggleSidebar,
    toggleTerminal: state.toggleTerminal,
    isCommandPaletteVisible: state.isCommandPaletteVisible,
    setCommandPaletteVisible: state.setCommandPaletteVisible,
    isWelcomeVisible: state.isWelcomeVisible
  }));

  const { theme } = useSettingsStore();

  useEffect(() => {
    // Start Neural Link RTC
    fileWatcherRTC.connect();

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElem = document.activeElement as HTMLElement;
      
      // ROOT CAUSE FIX: Monaco and XTerm (Terminal) have their own internal keybinding systems.
      // We must return early if focus is inside these components to allow their
      // internal shortcuts (Ctrl+C, typing, etc.) to function without IDE interference.
      const isInputArea = !!activeElem?.closest('.monaco-editor') || 
                          !!activeElem?.closest('.codeaps-terminal') ||
                          activeElem?.tagName === 'INPUT' || 
                          activeElem?.tagName === 'TEXTAREA' || 
                          activeElem?.isContentEditable;

      // Allow global "Escape" or other critical keys if needed, but otherwise return
      if (isInputArea && !e.ctrlKey && !e.metaKey) return; 
      
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            saveActiveFile();
            break;
          case 'p':
            e.preventDefault();
            setCommandPaletteVisible(true);
            break;
          case 'b':
            e.preventDefault();
            toggleSidebar();
            break;
          case '`':
            e.preventDefault();
            toggleTerminal();
            break;
          default:
            // If we are in an input and it's not a global command, let the input handle it
            if (isInputArea) return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // ── Native Menu Event Handler ──
    const setupListener = async () => {
      const unlisten = await listen<string>('menu-event', (event) => {
        const id = event.payload;
        // Prevent duplicate processing if events are firing rapidly
        if ((window as any)._lastMenuEvent === id && Date.now() - ((window as any)._lastMenuTime || 0) < 100) return;
        (window as any)._lastMenuEvent = id;
        (window as any)._lastMenuTime = Date.now();

        switch (id) {
          // File
          case 'new_file':
            useEditorStore.getState().openTab('untitled', '', 'plaintext', '');
            break;
          case 'open_file':
            invoke('open_file_dialog').then((result: any) => {
              if (result) {
                invoke('read_file_content', { path: result }).then((content: any) => {
                  const name = (result as string).split(/[\\/]/).pop() || 'file';
                  useEditorStore.getState().openTab(name, content as string, 'plaintext', result as string);
                });
              }
            });
            break;
          case 'open_folder':
            invoke('open_folder_dialog').then((path: any) => {
              if (path) useWorkspaceStore.getState().openWorkspace(path as string);
            });
            break;
          case 'save':
            saveActiveFile();
            break;
          case 'save_as':
            invoke('save_file_dialog').then((path: any) => {
              if (path) {
                const tab = useEditorStore.getState().getActiveTab();
                if (tab) {
                  invoke('write_file_content', { path, content: tab.content }).then(() => {
                    useEditorStore.getState().markSaved(tab.filename);
                  });
                }
              }
            });
            break;
          case 'close_editor': {
            const st = useEditorStore.getState();
            if (st.activeFile) st.closeTab(st.activeFile);
            break;
          }
          case 'preferences':
            useEditorStore.getState().openTab('Settings', '', 'settings', '');
            break;

          // View
          case 'command_palette':
            setCommandPaletteVisible(true);
            break;
          case 'toggle_explorer':
          case 'toggle_search':
          case 'toggle_git':
            // Ensure sidebar is visible
            if (!useLayoutStore.getState().isSidebarVisible) toggleSidebar();
            break;
          case 'toggle_terminal':
            toggleTerminal();
            break;
          case 'zoom_in':
            document.body.style.zoom = String(parseFloat(document.body.style.zoom || '1') + 0.1);
            break;
          case 'zoom_out':
            document.body.style.zoom = String(Math.max(0.5, parseFloat(document.body.style.zoom || '1') - 0.1));
            break;
          case 'zoom_reset':
            document.body.style.zoom = '1';
            break;
          case 'toggle_fullscreen':
            invoke('__cmd__toggleFullscreen').catch(() => {
              // Fallback for webview
              if (document.fullscreenElement) document.exitFullscreen();
              else document.documentElement.requestFullscreen();
            });
            break;

          // Go
          case 'go_to_line':
            window.dispatchEvent(new CustomEvent('menu-action', { detail: 'editor.action.gotoLine' }));
            break;
          case 'go_to_file':
            setCommandPaletteVisible(true);
            break;
          case 'find':
            window.dispatchEvent(new CustomEvent('menu-action', { detail: 'actions.find' }));
            break;
          case 'replace':
            window.dispatchEvent(new CustomEvent('menu-action', { detail: 'editor.action.startFindReplaceAction' }));
            break;

          // Run
          case 'run_code':
            window.dispatchEvent(new CustomEvent('run-active-file'));
            break;

          // Terminal
          case 'new_terminal':
            toggleTerminal();
            break;

          // Help
          case 'docs':
          case 'shortcuts':
            useEditorStore.getState().openTab('Documentation', '', 'help', '');
            break;
          case 'about':
            useModalStore.getState().alert('CodeAps v1.0.0\nCentralized Operations & Development Engine\nAI Powered System', 'About CodeAps');
            break;
          case 'undo':
          case 'redo':
          case 'cut':
          case 'copy':
          case 'paste':
          case 'select_all':
            window.dispatchEvent(new CustomEvent('menu-action', { detail: id }));
            break;
          case 'toggle_devtools':
            invoke('__cmd__toggleDevtools').catch(() => {});
            break;
        }
      });
      return unlisten;
    };

    const unlistenPromise = setupListener();

    // Bridge for window-dispatched menu events (from Monaco commands)
    const handleWindowMenuEvent = (e: any) => {
      emit('menu-event', e.detail);
    };
    window.addEventListener('menu-event' as any, handleWindowMenuEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('menu-event' as any, handleWindowMenuEvent);
      unlistenPromise.then(fn => fn());
    };
  }, [toggleSidebar, toggleTerminal]);

  const saveActiveFile = async () => {
    const state = useEditorStore.getState();
    const activeTab = state.getActiveTab();
    if (!activeTab) return;

    if (activeTab.filePath && activeTab.filePath !== '') {
      // Save to real filesystem via Tauri
      try {
        await invoke('write_file_content', { 
          path: activeTab.filePath, 
          content: activeTab.content 
        });
        state.markSaved(activeTab.filename);
        ollamaService.syncRag(activeTab.filePath, activeTab.content).catch(console.error);
        console.log(`✅ Saved: ${activeTab.filePath}`);
      } catch (err) {
        console.error('❌ Failed to save:', err);
        alert(`Failed to save file: ${err}`);
      }
    } else {
      // Untitled file — prompt for save location
      const path = await useModalStore.getState().prompt(`Define the persistent memory path for "${activeTab.filename}":`, '', 'Initialize Storage');
      if (path) {
        try {
          await invoke('write_file_content', { path, content: activeTab.content });
          state.markSaved(activeTab.filename);
          ollamaService.syncRag(path, activeTab.content).catch(console.error);
          console.log(`✅ Saved: ${path}`);
        } catch (err) {
          console.error('❌ Failed to save:', err);
          useModalStore.getState().alert(`System synchronization failed: ${err}`, 'IO Error');
        }
      }
    }
  };

  const { isWorkspaceOpen } = useWorkspaceStore();
  const { tabs } = useEditorStore();
  
  // No TopBar when we are on the Welcome screen (no active workspace and no tabs)
  const showTopBar = isWorkspaceOpen || tabs.length > 0;

  return (
    <div 
        data-theme={theme}
        className="h-screen w-screen flex flex-col bg-background text-on-surface font-functional overflow-hidden relative z-[var(--z-base)]"
    >
      {isWelcomeVisible && <MenuBar />}
      {showTopBar && isWelcomeVisible && <TopBar />}
      {/* Main Workspace */}
      <div className="flex-1 relative z-[var(--z-panel)] flex flex-col min-h-0">
        <SplitLayout />
      </div>
      <StatusBar />
      <CommandPalette />
      <NeuralDialog />
    </div>
  );
}
