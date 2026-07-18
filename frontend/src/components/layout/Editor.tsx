import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as monaco from 'monaco-editor';
import { X, Play, FileCode, MoreVertical, ChevronRight, Hash, AlignLeft, Cpu, Settings } from 'lucide-react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { CodeApsYjsProvider } from '@/rtc/YjsProvider';
import { useEditorStore, EditorState } from '@/store/useEditorStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { shallow } from 'zustand/shallow';
import { useLayoutStore } from '@/store/useLayoutStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFileSystem } from '@/hooks/useFileSystem';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { useGitStore } from '@/store/useGitStore';
import { getLanguageFromExtension, getRunCommand } from '@/lib/languageMap';
import { useInlineCompletions } from '@/hooks/useInlineCompletions';
import { LspClient } from '@/lsp/client';
import { registerLspProviders } from '@/editor/lspIntegration';
import { invoke } from '@tauri-apps/api/tauri';
import { cn } from '@/lib/utils';
import { SettingsPanel } from './SettingsPanel';
import { analysisService } from '@/services/AnalysisService';
import { useDebounce } from '../../hooks/useDebounce';
import { MiniCodeChat } from './MiniCodeChat';
import { ollamaService } from '@/services/OllamaService';
import { RefactorOverlay } from '../ui/RefactorOverlay';
import { RefactorReviewHub } from '../ui/RefactorReviewHub';
import { useRefactorStore } from '@/store/useRefactorStore';
import { HelpContent } from './HelpContent';
import brandLogo from '@/assets/Royaltylogo.png';

export const Editor = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<any>(null);
  const settings = useSettingsStore();
  const { tabs, activeFile, setActiveFile, closeTab, updateTabContent, markSaved, updateTabPath } = useEditorStore(
    (state: EditorState) => ({
      tabs: state.tabs,
      activeFile: state.activeFile,
      setActiveFile: state.setActiveFile,
      closeTab: state.closeTab,
      updateTabContent: state.updateTabContent,
      markSaved: state.markSaved,
      updateTabPath: state.updateTabPath
    }),
    shallow
  );
  const { toggleTerminal, isTerminalVisible, setTerminalActiveTab } = useLayoutStore();
  const { saveAsDialog } = useFileSystem();
  const { 
    fileResults,
    isAnalyzing: isGlobalAnalyzing, 
    setAnalyzing, 
    setFileResults,
    setLspMarkers,
    queueSuggestions,
    flushSuggestions,
    removeFileResults
  } = useAnalysisStore();

  const activeTab = tabs.find((t: any) => t.filePath === activeFile);
  const currentResult = activeTab?.filePath ? fileResults[activeTab.filePath] : null;
  const radarMetrics = currentResult?.radarMetrics || { scalability: 0, maintainability: 0, memoryEfficiency: 0, cpuUsage: 0, ioEfficiency: 0, concurrency: 0 };
  
  const isProgrammaticChange = useRef(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [selectionInfo, setSelectionInfo] = useState<{ top: number; left: number; code: string; range: any; filePath: string } | null>(null);
  const { isRefactoring } = useRefactorStore();

  const activeLang = useMemo(() => activeTab ? getLanguageFromExtension(activeTab.filename) : null, [activeTab?.filename]);
  const runCmd = activeTab ? getRunCommand(activeTab.filePath || activeTab.filename) : null;

  useInlineCompletions(editorInstance);

  const lspClientsRef = useRef<Map<string, LspClient>>(new Map());
  const decorationsRef = useRef<string[]>([]);
  const decorationThrottleRef = useRef<any>(null);

  // Per-file suggestions flush on mount or tab switch
  useEffect(() => {
    if (activeTab?.filePath) {
      flushSuggestions(activeTab.filePath);
    }
  }, [activeTab?.filePath, editorInstance]);

  useEffect(() => {
    if (!editorInstance || !activeFile || !activeLang) return;

    const workspacePath = activeTab?.filePath ? activeTab.filePath.split('\\').slice(0, -1).join('\\') : '';
    
    if (activeLang?.id && lspClientsRef.current && !lspClientsRef.current.has(activeLang.id)) {
      console.log(`Neural Link: Activating LSP for ${activeLang.id}`);
      const client = new LspClient(activeLang.id, workspacePath);
      client.connect().then(() => {
        if (activeLang.id) {
          registerLspProviders(activeLang.id, client);
          lspClientsRef.current?.set(activeLang.id, client);
        }
      });
    }
  }, [activeFile, activeLang?.id, editorInstance]);

  const handleRun = async () => {
    if (!runCmd || !activeTab) return;

    if (activeTab.isDirty) {
      let pathToSave = activeTab.filePath;
      if (!pathToSave || pathToSave === '') {
        pathToSave = await saveAsDialog(activeTab.filename) || '';
      }

      if (pathToSave && pathToSave !== '') {
        try {
          await invoke('write_file_content', { 
            path: pathToSave, 
            content: activeTab.content 
          });
          if (updateTabPath && !activeTab.filePath) {
            updateTabPath(activeTab.filename, pathToSave);
          }
          markSaved(pathToSave);
          // Auto-trigger Git status refresh
          useGitStore.getState().refreshStatus().catch(console.error);
          // Sync saved changes to local vector memory silently
          ollamaService.syncRag(pathToSave, activeTab.content).catch(console.error);
        } catch (err) {
          console.error('Auto-save failed:', err);
          return;
        }
      } else if (activeTab.isDirty) {
        return;
      }
    }

    // Re-calculate runCmd after potentially saving to get the latest filePath
    const freshActiveTab = tabs.find((t: any) => t.filePath === activeFile);
    const finalPath = freshActiveTab?.filePath || freshActiveTab?.filename || '';
    const freshRunCmd = getRunCommand(finalPath);

    const wasTerminalHidden = !isTerminalVisible;
    if (wasTerminalHidden) toggleTerminal();
    setTerminalActiveTab('console');

    // Defer dispatch to allow React to mount the TerminalPanel if it was hidden.
    // Without this delay, the 'run-command' event fires before the listener exists.
    const dispatchDelay = wasTerminalHidden ? 350 : 50;
    setTimeout(() => {
      if (freshRunCmd) {
        const event = new CustomEvent('run-command', { detail: { command: freshRunCmd } });
        window.dispatchEvent(event);
      }
    }, dispatchDelay);
  };

  const handleFormat = () => {
    if (monacoEditorRef.current) {
      monacoEditorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  const modelsRef = useRef<Map<string, any>>(new Map());
  const yDocsRef = useRef<Map<string, any>>(new Map());
  const subscriptionRef = useRef<any>(null);
  
  useEffect(() => {
    return () => {
      // Step 1: Destroy Yjs bindings FIRST while models are still alive
      if (yDocsRef.current) {
        yDocsRef.current.forEach((ydoc: any) => {
           try {
             // Surgical cleanup of Y-Monaco binding
             if (ydoc.binding && typeof ydoc.binding.destroy === 'function') {
                ydoc.binding.destroy();
                ydoc.binding = null;
             }
             if (ydoc.provider && typeof ydoc.provider.destroy === 'function') {
                ydoc.provider.destroy();
                ydoc.provider = null;
             }
             if (ydoc.doc && typeof ydoc.doc.destroy === 'function') {
                ydoc.doc.destroy();
                ydoc.doc = null;
             }
           } catch (e) {
             // Silence framework noise during rapid unmounts
           }
        });
        yDocsRef.current.clear();
      }

      // Step 2: Dispose of Monaco models AFTER bindings are detached
      if (modelsRef.current) {
        modelsRef.current.forEach(model => model.dispose());
        modelsRef.current.clear();
      }

      if (subscriptionRef.current) {
        subscriptionRef.current.dispose();
      }
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
        console.log("Editor Disposed");
        monacoEditorRef.current = null;
      }
      if (decorationThrottleRef.current) clearTimeout(decorationThrottleRef.current);
    };
  }, []);

  // ── Intelligent Diagnostics Sync ──
  useEffect(() => {
    const syncMarkers = (uris: any[]) => {
      uris.forEach(uri => {
        const markers = monaco.editor.getModelMarkers({ resource: uri });
        const pathStr = uri.toString();
        
        // Find matching tab to associate markers with a filename
        const matchingTab = tabs.find(t => {
          if (!t.filePath) return t.filename === pathStr || pathStr.endsWith(t.filename);
          const tUri = monaco.Uri.file(t.filePath).toString();
          return tUri === pathStr;
        });

        if (matchingTab) {
          setLspMarkers(matchingTab.filePath || matchingTab.filename, markers);
        }
      });
    };

    const disposable = monaco.editor.onDidChangeMarkers((uris: any[]) => {
      if (decorationThrottleRef.current) clearTimeout(decorationThrottleRef.current);
      decorationThrottleRef.current = setTimeout(() => syncMarkers(uris), 800);
    });

    return () => disposable.dispose();
  }, [tabs, setLspMarkers]);

  useEffect(() => {
    const handleJump = (e: any) => {
      const { line, column, filename } = e.detail;
      if (activeFile === filename && monacoEditorRef.current) {
        monacoEditorRef.current.revealLineInCenter(line);
        monacoEditorRef.current.setPosition({ lineNumber: line, column: column || 1 });
        monacoEditorRef.current.focus();
      }
    };
    window.addEventListener('editor-jump-to-line', handleJump);
    return () => window.removeEventListener('editor-jump-to-line', handleJump);
  }, [activeFile]);

  // Sync workspace-wide layout on folder change
  const { workspacePath } = useWorkspaceStore();
  
  // High-fidelity layout synchronization via ResizeObserver
  useEffect(() => {
    if (!editorRef.current || !monacoEditorRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to ensure layout happens after browser paint
      requestAnimationFrame(() => {
        if (monacoEditorRef.current) {
          monacoEditorRef.current.layout();
        }
      });
    });

    resizeObserver.observe(editorRef.current);
    
    // Initial pulses to guarantee state in rapid transitions
    setTimeout(() => monacoEditorRef.current?.layout(), 100);
    setTimeout(() => monacoEditorRef.current?.layout(), 500);
    setTimeout(() => monacoEditorRef.current?.layout(), 1500);

    return () => resizeObserver.disconnect();
  }, [editorInstance, workspacePath, tabs.length]);

  // Handle explicit layout pulses on active file changes
  // This is CRITICAL for cold-start: Monaco creates inside a hidden container (0×0),
  // so we must force a pixel-accurate recalculation when the container becomes visible.
  useEffect(() => {
    if (!monacoEditorRef.current || !activeFile) return;

    const forceLayout = () => {
      if (!monacoEditorRef.current || !editorRef.current) return;
      const rect = editorRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Force Monaco to use the container's actual pixel dimensions
        monacoEditorRef.current.layout({ width: rect.width, height: rect.height });
      } else {
        // Fallback: let Monaco auto-detect
        monacoEditorRef.current.layout();
      }
    };

    // Multi-stage layout: covers React render, CSS transition, and browser paint timing
    requestAnimationFrame(forceLayout);
    const t1 = setTimeout(() => { forceLayout(); monacoEditorRef.current?.focus(); }, 50);
    const t2 = setTimeout(forceLayout, 150);
    const t3 = setTimeout(forceLayout, 400);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [activeFile]);

  // Define themes once on mount (themes are global, not tied to editor instance)
  useEffect(() => {
    monaco.editor.defineTheme('aps-light', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: 'ffffff', fontStyle: 'bold' },
            { token: 'comment', foreground: '666666', fontStyle: 'italic' },
            { token: 'string', foreground: 'dddddd' },
            { token: 'function', foreground: 'ffffff' },
            { token: 'type', foreground: 'ffffff' }
        ],
        colors: {
            'editor.background': '#000000',
            'editor.foreground': '#ffffff',
            'editorLineNumber.foreground': '#333333',
            'editorLineNumber.activeForeground': '#ffffff',
            'editorCursor.foreground': '#ffffff',
            'editor.lineHighlightBackground': '#080808',
            'editor.selectionBackground': '#333333',
            'editorBracketMatch.background': '#ffffff22',
            'editorBracketMatch.border': '#ffffff',
        }
    });
    monaco.editor.defineTheme('codeaps-amber', {
      base: 'vs-dark',
      inherit: true,
      rules: [
          { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' },
          { token: 'string', foreground: 'f1fa8c' },
          { token: 'function', foreground: '50fa7b' },
          { token: 'variable', foreground: 'f8f8f2' },
          { token: 'number', foreground: 'bd93f9' },
          { token: 'type', foreground: '8be9fd' },
          { token: 'keyword.js', foreground: 'ffb86c' },
          { token: 'keyword.ts', foreground: 'ffb86c' },
          { token: 'identifier', foreground: 'f8f8f2' },
      ],
      colors: {
          'editor.background': '#0D0D0D',
          'editor.foreground': '#f8f8f2',
          'editorLineNumber.foreground': '#44475a',
          'editorLineNumber.activeForeground': '#ffb86c',
          'editor.lineHighlightBackground': '#1A1A1A',
          'editor.selectionBackground': '#44475a44',
          'editorCursor.foreground': '#ffb86c',
          'editorBracketMatch.background': '#ffb86c33',
          'editorBracketMatch.border': '#ffb86c',
      }
    });
    monaco.editor.defineTheme('aps-gold', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'keyword',  foreground: 'ffb454', fontStyle: 'bold' },
            { token: 'string',   foreground: 'c2d94c' },
            { token: 'comment',  foreground: '565b66', fontStyle: 'italic' },
            { token: 'function', foreground: 'ffcc66' },
            { token: 'variable', foreground: 'bfbdb6' },
            { token: 'number',   foreground: 'e6b450' },
            { token: 'type',     foreground: '59c2ff' },
        ],
        colors: {
            'editor.background':                  '#0d1117',
            'editor.foreground':                  '#bfbdb6',
            'editorLineNumber.foreground':         '#253340',
            'editorLineNumber.activeForeground':   '#ffb454',
            'editorCursor.foreground':             '#ffb454',
            'editor.lineHighlightBackground':      '#111820',
            'editor.selectionBackground':          '#253340aa',
            'editorBracketMatch.background':       '#ffb45433',
            'editorBracketMatch.border':           '#ffb454',
        }
    });
    monaco.editor.defineTheme('nebula-light', {
        base: 'vs',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: '0066cc', fontStyle: 'bold' },
            { token: 'comment', foreground: '999999', fontStyle: 'italic' },
            { token: 'string', foreground: '22863a' },
            { token: 'function', foreground: '6f42c1' },
        ],
        colors: {
            'editor.background': '#ffffff',
            'editor.foreground': '#000000',
            'editorLineNumber.foreground': '#cccccc',
            'editorLineNumber.activeForeground': '#0066cc',
            'editorCursor.foreground': '#0066cc',
            'editor.lineHighlightBackground': '#f5f5f5',
            'editor.selectionBackground': '#0066cc22',
        }
    });
    monaco.editor.defineTheme('neural-onyx', {
        base: 'vs-dark',
        inherit: true,
        rules: [{ token: 'keyword', foreground: 'ff4500', fontStyle: 'bold' }],
        colors: {
            'editor.background': '#000000',
            'editor.foreground': '#ffffff',
            'editorLineNumber.foreground': '#333333',
            'editorLineNumber.activeForeground': '#ff4500',
            'editorCursor.foreground': '#ff4500',
            'editor.lineHighlightBackground': '#050505',
        }
    });
  }, []);

  // Create Monaco editor ONLY when the container is visible (activeFile is set AND not a meta-tab).
  // This prevents the 0×0 layout bug that causes the blank/uneditable screen.
  useEffect(() => {
    const isMetaTab = activeTab?.language === 'settings' || activeTab?.language === 'help';
    if (editorRef.current && !monacoEditorRef.current && activeFile && !isMetaTab) {
      // Themes already defined in mount-only effect above
      monaco.editor.setTheme(settings.theme);

      monacoEditorRef.current = monaco.editor.create(editorRef.current, {
        theme: settings.theme,
        automaticLayout: false, // We manage layout explicitly for reliability
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
        lineHeight: settings.fontSize * 1.5,
        fontLigatures: true,
        lineNumbers: settings.lineNumbers,
        renderLineHighlight: 'all',
        glyphMargin: true,
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
          verticalScrollbarSize: 4,
          horizontalScrollbarSize: 4,
          useShadows: false,
        },
        minimap: { enabled: settings.minimap, side: 'right', maxColumn: 80, scale: 1 },
        cursorSmoothCaretAnimation: 'on',
        cursorBlinking: 'phase',
        cursorStyle: settings.cursorStyle,
        cursorWidth: 2,
        smoothScrolling: true,
        padding: { top: 12, bottom: 12 },
        wordWrap: settings.wordWrap,
        bracketPairColorization: { enabled: true },
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        folding: true,
        multiCursorModifier: 'ctrlCmd',
        stickyScroll: { enabled: settings.breadcrumbs, maxLineCount: 10 },
        inlineSuggest: { enabled: true },
        mouseWheelZoom: true,
      });

      setEditorInstance(monacoEditorRef.current);

      let currentBreakpoints: number[] = [];
      let breakpointDecorations: string[] = [];

      monacoEditorRef.current.onMouseDown((e: any) => {
        if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
          const lineNumber = e.target.position.lineNumber;
          const idx = currentBreakpoints.indexOf(lineNumber);
          
          if (idx !== -1) {
            currentBreakpoints.splice(idx, 1);
          } else {
            currentBreakpoints.push(lineNumber);
          }
          
          // Render the breakpoints
          const newDecorations = currentBreakpoints.map(ln => ({
            range: new monaco.Range(ln, 1, ln, 1),
            options: {
              isWholeLine: false,
              glyphMarginClassName: 'w-3 h-3 bg-red-500 rounded-none mt-1 ml-1 shadow-[0_0_8px_#ef4444]',
              glyphMarginHoverMessage: { value: 'Breakpoint' }
            }
          }));
          breakpointDecorations = monacoEditorRef.current?.deltaDecorations(breakpointDecorations, newDecorations) || [];

          if ('__TAURI_IPC__' in window) {
            console.log("Syncing breakpoint to DAP service", lineNumber);
          }
        }
      });

      monacoEditorRef.current.onDidChangeCursorPosition((e: any) => {
        setCursorPos({ line: e.position.lineNumber, column: e.position.column });
      });

      monacoEditorRef.current.onDidChangeCursorSelection((e: any) => {
        const selection = e.selection;
        if (!selection.isEmpty()) {
          const coords = monacoEditorRef.current.getScrolledVisiblePosition(selection.getStartPosition());
          if (coords) {
            const code = monacoEditorRef.current.getModel().getValueInRange(selection);
            setSelectionInfo({
              top: coords.top,
              left: coords.left,
              code,
              range: selection,
              filePath: activeTab?.filePath || activeTab?.filename || ''
            });
          }
        } else {
          setSelectionInfo(null);
        }
      });

      monacoEditorRef.current.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
        monacoEditorRef.current?.getAction('editor.action.formatDocument')?.run();
      });

      // ── Register Global Keybindings (Bridging Global -> Editor) ──
      
      // Ctrl + S (Save)
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        // We use a custom event because saveActiveFile is defined in App.tsx
        // but we could also move it to a service or store.
        // For now, custom event is cleaner than re-implementing.
        window.dispatchEvent(new CustomEvent('menu-action', { detail: 'save' }));
      });

      // Ctrl + B (Sidebar)
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
        useLayoutStore.getState().toggleSidebar();
      });

      // Ctrl + ` (Terminal)
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote, () => {
        useLayoutStore.getState().toggleTerminal();
      });

      // Ctrl + P (Command Palette)
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
        useLayoutStore.getState().setCommandPaletteVisible(true);
      });

      // Ctrl + F (Find)
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
        monacoEditorRef.current?.getAction('actions.find')?.run();
      });

      // Ctrl + H (Replace)
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
        monacoEditorRef.current?.getAction('editor.action.startFindReplaceAction')?.run();
      });

      // Ctrl + G (Go to Line)
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG, () => {
        monacoEditorRef.current?.getAction('editor.action.gotoLine')?.run();
      });

      // Ctrl + Shift + P / F1 (Command Palette)
      const openPalette = () => useLayoutStore.getState().setCommandPaletteVisible(true);
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, openPalette);
      monacoEditorRef.current.addCommand(monaco.KeyCode.F1, openPalette);

      // Ctrl + N (New File)
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, () => {
        window.dispatchEvent(new CustomEvent('menu-event', { detail: 'new_file' }));
      });

      // Ctrl + O (Open File)
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO, () => {
        window.dispatchEvent(new CustomEvent('menu-event', { detail: 'open_file' }));
      });

      // Ctrl + Shift + S (Save As)
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
        window.dispatchEvent(new CustomEvent('menu-event', { detail: 'save_as' }));
      });

      // Ctrl + W (Close Tab)
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, () => {
        window.dispatchEvent(new CustomEvent('menu-event', { detail: 'close_editor' }));
      });

      // Ctrl + / (Toggle Comment) - Monaco handles this natively, 
      // but if we want to ensure it works we can bind it explicitly.
      // monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      //   monacoEditorRef.current?.getAction('editor.action.commentLine')?.run();
      // });

      if ('fonts' in document) {
        (document as any).fonts.ready.then(() => monacoEditorRef.current?.layout());
      }
      
      // Force pixel-accurate layout now that container is VISIBLE
      requestAnimationFrame(() => {
        if (monacoEditorRef.current && editorRef.current) {
          const rect = editorRef.current.getBoundingClientRect();
          monacoEditorRef.current.layout({ width: rect.width, height: rect.height });
          monacoEditorRef.current.focus();
        }
      });
      
      // Synchronize state with public instance
      // ── Core Editor Command Registry (Neural Hardening) ──
      const trigger = (id: string) => {
        monacoEditorRef.current?.focus();
        monacoEditorRef.current?.trigger('keyboard', id, null);
      };

      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA, () => trigger('editor.action.selectAll'));
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => trigger('undo'));
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, () => trigger('redo'));
      
      // Removed manual Backspace/Delete trigger as it interferes with multi-selection deletion
      // Monaco's native handler is better at this if we don't override the command.

      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {
        monacoEditorRef.current?.focus();
        document.execCommand('cut');
      });
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
        monacoEditorRef.current?.focus();
        document.execCommand('copy');
      });
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
        monacoEditorRef.current?.focus();
        navigator.clipboard.readText().then(text => {
          monacoEditorRef.current?.trigger('keyboard', 'paste', { text });
        }).catch(() => document.execCommand('paste'));
      });
      monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        window.dispatchEvent(new CustomEvent('menu-action', { detail: 'save' }));
      });

      // Capture phase listener on the DOM container to prevent Sidebar/App interception
      const container = editorRef.current;
      if (container) {
        const stopInterception = (e: KeyboardEvent) => {
          if (e.key === 'Backspace' || e.key === 'Delete') {
            // Stop bubbling to Sidebar/App but let it reach Monaco's internal textarea
            e.stopPropagation();
          }
        };
        container.addEventListener('keydown', stopInterception, true);
        (monacoEditorRef.current as any)._stopInterception = stopInterception;
      }

      setEditorInstance(monacoEditorRef.current);

      // ── Native Menu / Global Action Bridge ──
      return () => {
        // No-op cleanup here, handled by separate effect
      };
    }
  }, [activeFile, settings.theme, settings.fontFamily]); // activeFile ensures container is visible before creation

  useEffect(() => {
    if (!monacoEditorRef.current) return;

    const handleMenuAction = async (e: any) => {
      const action = e.detail;
      if (!monacoEditorRef.current) return;

      switch (action) {
        case 'save':
          const activeTab = useEditorStore.getState().getActiveTab();
          if (activeTab && activeTab.filePath) {
            try {
              await invoke('write_file_content', { 
                path: activeTab.filePath, 
                content: activeTab.content 
              });
              useEditorStore.getState().markSaved(activeTab.filePath);
              ollamaService.syncRag(activeTab.filePath, activeTab.content).catch(console.error);
            } catch (err) {
              console.error('Save failed from editor bridge:', err);
            }
          }
          break;
        case 'undo':
          monacoEditorRef.current.focus();
          monacoEditorRef.current.trigger('keyboard', 'undo', null);
          break;
        case 'redo':
          monacoEditorRef.current.focus();
          monacoEditorRef.current.trigger('keyboard', 'redo', null);
          break;
        case 'select_all':
          monacoEditorRef.current.focus();
          monacoEditorRef.current.trigger('keyboard', 'editor.action.selectAll', null);
          break;
        case 'cut':
          monacoEditorRef.current.focus();
          document.execCommand('cut');
          break;
        case 'copy':
          monacoEditorRef.current.focus();
          document.execCommand('copy');
          break;
        case 'paste':
          monacoEditorRef.current.focus();
          navigator.clipboard.readText().then(text => {
            monacoEditorRef.current.trigger('keyboard', 'paste', { text });
          }).catch(() => {
            document.execCommand('paste');
          });
          break;
        case 'editor.action.gotoLine':
          monacoEditorRef.current.focus();
          monacoEditorRef.current.getAction('editor.action.gotoLine')?.run();
          break;
        case 'actions.find':
          monacoEditorRef.current.focus();
          monacoEditorRef.current.getAction('actions.find')?.run();
          break;
        case 'editor.action.startFindReplaceAction':
          monacoEditorRef.current.focus();
          monacoEditorRef.current.getAction('editor.action.startFindReplaceAction')?.run();
          break;
        case 'format':
          monacoEditorRef.current.getAction('editor.action.formatDocument')?.run();
          break;
      }
    };

    window.addEventListener('menu-action' as any, handleMenuAction);
    return () => window.removeEventListener('menu-action' as any, handleMenuAction);
  }, [editorInstance]); // Depends on the stateful instance being ready

  useEffect(() => {
    if (monacoEditorRef.current) {
      monacoEditorRef.current.updateOptions({
        theme: settings.theme,
        fontSize: settings.fontSize,
        lineHeight: settings.fontSize * 1.5,
        minimap: { enabled: settings.minimap },
        wordWrap: settings.wordWrap,
        lineNumbers: settings.lineNumbers,
        fontFamily: settings.fontFamily,
        cursorStyle: settings.cursorStyle,
        stickyScroll: { enabled: settings.breadcrumbs }
      });
      monaco.editor.setTheme(settings.theme);
    }
  }, [settings]);

  // ── Auto-Save Engine ──
  const autoSaveContent = useDebounce(activeTab?.content, 1500);
  useEffect(() => {
    if (settings.autoSave && autoSaveContent && activeTab?.isDirty && activeTab?.filePath) {
      console.log(`[AutoSave] Persisting: ${activeTab.filename}`);
      invoke('write_file_content', { 
        path: activeTab.filePath, 
        content: autoSaveContent 
      }).then(() => {
        markSaved(activeTab.filePath);
        ollamaService.syncRag(activeTab.filePath, autoSaveContent).catch(console.error);
      }).catch((err: any) => console.error('[AutoSave] Failed:', err));
    }
  }, [autoSaveContent, settings.autoSave, activeTab?.filename]);

  // ── Model Synchronization Effect ──
  // Handles setting the model on the editor and initializing Yjs/Listeners
  useEffect(() => {
    if (!monacoEditorRef.current || !activeTab || !modelsRef.current) return;

    const modelKey = activeTab.filePath || activeTab.filename;
    let model = modelsRef.current.get(modelKey);
    const lang = getLanguageFromExtension(activeTab.filename);

    if (!model) {
      const uri = monaco.Uri.file(modelKey);
      const existingGlobalModel = monaco.editor.getModel(uri);
      if (existingGlobalModel) {
        model = existingGlobalModel;
      } else {
        model = monaco.editor.createModel(activeTab.content || '', lang.monacoId, uri);
      }
      modelsRef.current.set(modelKey, model);

      // Yjs Initialization
      if (!yDocsRef.current!.has(modelKey)) {
        const yDoc = new Y.Doc();
        const yText = yDoc.getText('monaco');
        if (activeTab.content && yText.length === 0) {
            yText.insert(0, activeTab.content);
        }
        const provider = new CodeApsYjsProvider(yDoc, modelKey);
        const binding = new MonacoBinding(yText, model, new Set([monacoEditorRef.current!]));
        yDocsRef.current!.set(modelKey, { doc: yDoc, provider, binding });
      }
    } 

    if (monacoEditorRef.current.getModel() !== model) {
      monacoEditorRef.current.setModel(model);
      
      requestAnimationFrame(() => {
        if (monacoEditorRef.current && editorRef.current) {
          const rect = editorRef.current.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            monacoEditorRef.current.layout({ width: rect.width, height: rect.height });
          }
          monacoEditorRef.current.focus();
        }
      });

      if (subscriptionRef.current) subscriptionRef.current.dispose();
      subscriptionRef.current = model.onDidChangeContent(() => {
        if (isProgrammaticChange.current) return;
        const content = model?.getValue() || '';
        updateTabContent(activeTab.filePath, content);
      });
    }
  }, [activeFile, tabs.length, editorInstance]); // DON'T depend on content here

  // ── Content Persistence Sync ──
  // Only sync if content changes from an EXTERNAL source (not the user typing)
  useEffect(() => {
    if (!monacoEditorRef.current || !activeTab) return;
    const model = monacoEditorRef.current.getModel();
    if (!model) return;

    const currentVal = model.getValue();
    if (activeTab.content !== undefined && activeTab.content !== currentVal) {
        // This is likely an external change (e.g. Refactor Apply, File Refresh)
        isProgrammaticChange.current = true;
        model.setValue(activeTab.content);
        setTimeout(() => { isProgrammaticChange.current = false; }, 50);
    }
  }, [activeTab?.content]); // Specific content sync

  // Adaptive Debounce Logic
  const getAdaptiveDelay = (content: string) => {
    const lines = content.split('\n').length;
    if (lines < 500) return 800;
    if (lines < 1500) return 1500;
    return 2500;
  };

  const debouncedContent = useDebounce(activeTab?.content || '', getAdaptiveDelay(activeTab?.content || ''));
  const analysisRequestIdRef = useRef<number>(0);
  const analysisAbortRef = useRef<AbortController | null>(null);
  const analysisPendingRef = useRef<boolean>(false);
  
  useEffect(() => {
    if (!debouncedContent || !activeTab || !editorInstance) return;

    const performAnalysis = async () => {
      // Strict Concurrency Lock: Prevent starting a new request if one is already in flight
      if (analysisPendingRef.current) return;

      // Cancel previous request immediately
      if (analysisAbortRef.current) {
        analysisAbortRef.current.abort();
      }
      analysisAbortRef.current = new AbortController();

      // Increment request ID for each new scan
      const requestId = ++analysisRequestIdRef.current!;
      
      // ── Access Filter: Prevent analysis of logic-less modules ──
      const isMetaFile = activeTab.language === 'settings' || 
                         activeTab.language === 'help' ||
                         activeTab.filename.endsWith('.json') || 
                         activeTab.filename.endsWith('.md') ||
                         activeTab.filename.endsWith('.txt');
      
      if (isMetaFile) return;

      const currentFileAtStart = activeTab.filePath || activeTab.filename;
      setAnalyzing(true);
      analysisPendingRef.current = true;
      try {
        const langInfo = getLanguageFromExtension(activeTab.filename);
        const result = await analysisService.analyze(
          debouncedContent, 
          activeTab.filename, 
          langInfo.id || 'text',
          analysisAbortRef.current?.signal
        );

        // STALE CHECK: If a newer request has already started, discard this result
        if (requestId !== analysisRequestIdRef.current) return;

        if (result) {
          // Check if user switched tabs during background analysis
          if (useEditorStore.getState().activeFile === activeTab.filePath) {
            // ── Anti-Glitch Logic: Prevent jumping from AI to Heuristics if AI is fresh ──
            const existing = useAnalysisStore.getState().fileResults[currentFileAtStart];
            const isFreshAI = existing?.source === 'ai' && 
                             (new Date().getTime() - new Date(existing.lastAnalysis).getTime() < 15000);
            
            // If we have a fresh AI result, don't overwrite it with a heuristic fallback
            if (result.source === 'heuristic' && isFreshAI) {
               console.log(`[Anti-Glitch] Ignoring heuristic update for ${currentFileAtStart} to preserve AI fidelity.`);
               return;
            }

            setFileResults(currentFileAtStart, {
              radarMetrics: result.radarMetrics,
              systemBars: result.systemBars,
              complexity: result.complexity,
              miniChatMessages: result.miniChatMessages || [],
              memoryMap: result.memory_map || [],
              lastAnalysis: new Date().toISOString(),
              source: result.source
            });
            
            // Throttled Decoration Update
            if (decorationThrottleRef.current) clearTimeout(decorationThrottleRef.current);
            decorationThrottleRef.current = setTimeout(() => {
              // Final check before applying decorations to Monaco
              if (requestId !== analysisRequestIdRef.current) return;
              
              const newDecorations: any[] = result.memory_map.map((alloc: any) => ({
                range: new monaco.Range(alloc.line, 1, alloc.line, 1),
                options: {
                  isWholeLine: false,
                  glyphMarginClassName: alloc.size > 512 ? 'heatmap-hot' : alloc.size > 128 ? 'heatmap-warm' : 'heatmap-cool',
                  glyphMarginHoverMessage: { value: `Memory Intensity: ${alloc.size} bytes (${alloc.type})` }
                }
              }));
              decorationsRef.current = editorInstance.deltaDecorations(decorationsRef.current, newDecorations);
            }, 100);

          } else {
            // Queue suggestions for backgrounded-none file
            queueSuggestions(currentFileAtStart, result.miniChatMessages);
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Real-time analysis failed:', err);
        }
      } finally {
        analysisPendingRef.current = false;
        // Only stop the spinner if this is still the latest request
        if (requestId === analysisRequestIdRef.current) {
          setAnalyzing(false);
        }
      }
    };

    performAnalysis();
  }, [debouncedContent, activeTab?.filePath, editorInstance]);

  if (tabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background text-on-surface/10 space-y-4">
        <div className="relative">
          <img src={brandLogo} alt="CodeAps Logo" className="w-20 h-20 object-contain" />
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-none" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-on-surface/20">System Idle • No Active Session</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background overflow-hidden relative", settings.theme)}>
      {/* Neural Suggestion Layer */}
      <MiniCodeChat />
      
      {/* Refactor UI Layers */}
      <RefactorOverlay selectionInfo={selectionInfo} onClose={() => setSelectionInfo(null)} />
      <RefactorReviewHub />

      {/* Tabs Bar */}
      <div className="flex items-center justify-between bg-surface-low h-11 shrink-0 px-0 border-b border-outline-variant">
        <div className="flex items-center h-full overflow-x-auto premium-scroll no-scrollbar">
          {tabs.map((tab: any) => {
            const lang = getLanguageFromExtension(tab.filename);
            const isActive = activeFile === tab.filePath;
            return (
              <TabItem
                key={tab.filePath}
                name={tab.filename}
                icon={<span className="text-[14px] flex items-center justify-center shrink-0" style={{ color: lang.color }}>{lang.icon}</span>}
                active={isActive}
                isDirty={tab.isDirty}
                onClick={() => setActiveFile(tab.filePath)}
                onClose={() => {
                  closeTab(tab.filePath);
                  removeFileResults(tab.filePath);
                }}
              />
            );
          })}
        </div>

        <div className="flex items-center space-x-1 px-1 md:px-3 shrink-0">
          <button 
            onClick={handleFormat}
            className="p-1.5 text-on-surface-variant/60 hover:text-primary transition-colors cursor-pointer rounded-none hover:bg-on-surface/5"
            title="Format Document (Alt+Shift+F)"
          >
            <AlignLeft size={14} />
          </button>
          {runCmd && (
            <button
              onClick={handleRun}
              className="p-1.5 text-primary hover:text-primary-light transition-all cursor-pointer group relative rounded-none hover:bg-primary/10"
              title="Execute Build"
            >
              <Play size={14} className="fill-current" />
            </button>
          )}
          <div className="hidden sm:block w-[1px] h-4 bg-outline-variant mx-1 md:mx-2" />
          <button className="hidden sm:block p-1.5 text-on-surface-variant/60 hover:text-on-surface transition-all rounded-none hover:bg-on-surface/5">
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center h-8 bg-background px-4 border-b border-outline-variant space-x-2 overflow-hidden shrink-0">
        <Cpu size={12} className="text-primary/60 shrink-0" />
        <div className="flex items-center text-[10px] font-medium text-on-surface-variant/40 space-x-2 truncate">
          <span>root</span>
          <ChevronRight size={10} className="text-on-surface-variant/20" />
          {activeTab?.filePath?.split(/[\\/]/).filter(Boolean).map((part: string, idx: number, arr: any[]) => (
            <React.Fragment key={idx}>
              <span className={cn(idx === arr.length - 1 ? "text-primary/80 font-bold" : "")}>{part}</span>
              {idx < arr.length - 1 && <ChevronRight size={10} className="text-on-surface-variant/20" />}
            </React.Fragment>
          )) || <span className="text-primary/80 font-bold">{activeFile}</span>}
        </div>
      </div>

      {/* Editor Main */}
      <div className="flex-1 relative overflow-visible group">
        {/* Settings Layer */}
        {activeTab?.language === 'settings' && (
          <div className="absolute inset-0 z-20 bg-background">
            <SettingsPanel />
          </div>
        )}

        {/* Help Layer */}
        {activeTab?.language === 'help' && (
          <div className="absolute inset-0 z-20 bg-background overflow-hidden flex flex-col">
            <HelpContent />
          </div>
        )}

        {/* Idle Layer */}
        {!activeFile && activeTab?.language !== 'settings' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background space-y-6">
            <div className="relative">
              <img src={brandLogo} alt="CodeAps Logo" className="w-20 h-20 object-contain" />
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-none" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-on-surface-variant/20">System Idle • No Active Session</span>
          </div>
        )}

        {/* Monaco Editor Layer (Always Mounted if possible to preserve instance) */}
        <div 
          ref={editorRef} 
          style={{ 
            backgroundColor: 'var(--background)',
            visibility: (activeFile && activeTab?.language !== 'settings' && activeTab?.language !== 'help') ? 'visible' : 'hidden'
          }}
          className={cn(
            "absolute inset-0",
            (activeFile && activeTab?.language !== 'settings' && activeTab?.language !== 'help') ? "z-0" : "-z-10"
          )} 
        />
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-surface-low border-t border-outline-variant flex items-center justify-between px-2 md:px-3 text-[10px] uppercase tracking-wider font-bold text-on-surface/30 shrink-0 select-none min-w-0">
        <div className="flex items-center space-x-2 md:space-x-4 min-w-0">
          <div className="flex items-center space-x-1 hover:text-white/60 transition-colors cursor-default shrink-0">
            <Hash size={10} className="text-primary/60 hidden sm:block" />
            <span>Ln {cursorPos.line}, Col {cursorPos.column}</span>
          </div>
          <div className="hidden sm:flex items-center space-x-1 hover:text-white/60 transition-colors cursor-default">
            <span>Spaces: 2</span>
          </div>
          <div className="hidden sm:block w-[1px] h-3 bg-white/10 mx-1" />
          <div className={cn(
            "flex items-center space-x-1.5 md:space-x-2 px-1.5 md:px-2 py-0.5 rounded-none transition-colors cursor-pointer shrink-0",
            radarMetrics.maintainability > 80 ? "text-green-400 bg-green-400/5" : radarMetrics.maintainability > 50 ? "text-amber-400 bg-amber-400/5" : "text-rose-400 bg-rose-400/5"
          )}>
            <div className={cn("w-1 h-1 rounded-none shrink-0", isGlobalAnalyzing ? "animate-pulse" : "")} style={{ backgroundColor: 'currentColor' }} />
            <span className="text-[9px] font-black uppercase tracking-widest truncate">
              <span className="hidden md:inline">Maintainability: </span>{Math.round(radarMetrics.maintainability)}%
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
          {activeLang && (
            <div className="hidden sm:flex items-center space-x-1 hover:text-white/60 transition-colors cursor-default">
              <span style={{ color: activeLang.color }}>{activeLang.label}</span>
            </div>
          )}
          <div className="hidden sm:flex items-center space-x-1">
            <span>UTF-8</span>
          </div>
          <div className="flex items-center pl-1 md:pl-0">
             <div className={cn("w-1.5 h-1.5 rounded-none", activeTab?.isDirty ? "bg-primary animate-pulse shadow-[0_0_5px_#ffb86c]" : "bg-green-500/40")} />
          </div>
        </div>
      </div>
    </div>
  );
};

interface TabItemProps {
  name: string;
  icon: React.ReactNode;
  active: boolean;
  isDirty: boolean;
  onClick: () => void;
  onClose: () => void;
}

const TabItem = ({ name, icon, active, isDirty, onClick, onClose }: TabItemProps) => (
  <div 
    onClick={onClick}
    className={cn(
      "flex items-center space-x-3 px-4 h-full transition-all cursor-pointer relative border-r border-outline-variant group shrink-0",
      active ? "bg-background text-on-surface" : "text-on-surface/20 hover:text-on-surface/40 hover:bg-surface/50"
    )}
  >
    {active && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_15px_#ffb86c]" />}
    <div className={cn("transition-transform duration-300", active ? "scale-110" : "scale-100")}>
      {icon}
    </div>
    <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
      {name}
      {isDirty && <span className="text-primary ml-1.5 animate-pulse">●</span>}
    </span>
    <button
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onClose(); }}
      className={cn(
        "transition-all duration-200 p-0.5 rounded-none hover:bg-on-surface/10",
        active ? "opacity-100 text-on-surface-variant/40" : "opacity-0 group-hover:opacity-100 text-on-surface-variant/20"
      )}
    >
      <X size={10} />
    </button>
  </div>
);
