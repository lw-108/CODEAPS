import React from 'react';
import { ArrowLeft, Play, FolderOpen, Save } from 'lucide-react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useEditorStore } from '@/store/useEditorStore';
import { useLayoutStore } from '@/store/useLayoutStore';
import { useFileSystem } from '@/hooks/useFileSystem';
import { getLanguageFromExtension, getRunCommand } from '@/lib/languageMap';
import { invoke } from '@tauri-apps/api/tauri';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

import { useExecutionStore } from '@/store/useExecutionStore';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useGitStore } from '@/store/useGitStore';

export const TopBar = () => {
  const { workspaceName, isWorkspaceOpen, closeWorkspace } = useWorkspaceStore();
  const { isRunning, setRunning } = useExecutionStore();
  const { tabs, activeFile, clearAllTabs, getActiveTab, markSaved, updateTabPath } = useEditorStore();
  const { toggleTerminal, isTerminalVisible } = useLayoutStore();
  const { openFolderDialog, saveAsDialog } = useFileSystem();
  const { theme } = useSettingsStore();
  const { metrics, resetAll } = useAnalysisStore();

  const activeTab = tabs.find((t: any) => t.filePath === activeFile);
  const activeLang = activeTab ? getLanguageFromExtension(activeTab.filename) : null;
  const runCmd = activeTab?.filePath ? getRunCommand(activeTab.filePath) : null;

  // ── Close Workspace ──
  const handleCloseWorkspace = () => {
    clearAllTabs();
    resetAll();
    closeWorkspace();
  };

  // ── Run Code ──
  const handleRun = async () => {
    if (!runCmd || !activeTab) return;

    // 1. Auto-save if dirty
    if (activeTab.isDirty && activeTab.filePath) {
      try {
        await invoke('write_file_content', { 
          path: activeTab.filePath, 
          content: activeTab.content 
        });
        markSaved(activeTab.filename);
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }

    if (!isTerminalVisible) toggleTerminal();
    
    setRunning(true);
    const event = new CustomEvent('run-command', { detail: { command: runCmd } });
    window.dispatchEvent(event);

    // Reset indicator after a delay or on terminal completion (simplified for now)
    setTimeout(() => setRunning(false), 3000);
  };

  // ── Save File ──
  const handleSave = async () => {
    const tab = getActiveTab();
    if (!tab) return;
    
    if (tab.filePath && tab.filePath !== '') {
      try {
        await invoke('write_file_content', { path: tab.filePath, content: tab.content });
        markSaved(tab.filename);
        // Refresh Git status
        useGitStore.getState().refreshStatus().catch(console.error);
      } catch (err) {
        alert(`Failed to save: ${err}`);
      }
    } else {
      const path = await saveAsDialog(tab.filename);
      if (path) {
        try {
          await invoke('write_file_content', { path, content: tab.content });
          if (updateTabPath) {
            updateTabPath(tab.filename, path);
          }
          markSaved(tab.filename);
          // Refresh Git status
          useGitStore.getState().refreshStatus().catch(console.error);
        } catch (err) {
          alert(`Failed to save: ${err}`);
        }
      }
    }
  };

  // ── Open Folder ──
  const handleOpenFolder = async () => {
    const selected = await openFolderDialog();
    if (selected) {
      clearAllTabs();
      useWorkspaceStore.getState().openWorkspace(selected);
    }
  };

  return (
    <div 
      className="h-12 bg-background flex items-center justify-between px-4 select-none app-region-drag relative z-[var(--z-bar)] border-b border-outline-variant"
      data-tauri-drag-region
    >
      <div className="flex items-center space-x-2">
        {isWorkspaceOpen && (
          <button 
            onClick={handleCloseWorkspace}
            className="p-2 hover:bg-on-surface/5 cursor-pointer transition-all group"
            title="Close Workspace"
          >
            <ArrowLeft size={16} className="text-on-surface-variant/60 group-hover:text-primary transition-colors" />
          </button>
        )}
        
        <button
          onClick={handleOpenFolder}
          className="flex items-center space-x-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 hover:text-on-surface hover:bg-on-surface/5 transition-all font-block cursor-pointer shrink-0"
        >
          <FolderOpen size={14} />
          <span className="hidden md:inline">Open Workspace</span>
        </button>
      </div>
      
      <div className="hidden sm:flex items-center space-x-4 md:space-x-6 flex-1 justify-center min-w-0">
        <div className="flex flex-col items-center min-w-0">
          <div className="flex items-center space-x-3 mb-1">
            <a href="https://lw19.vercel.app/" target="_blank" rel="noopener noreferrer">
              <img 
                  src={logo} 
                  alt="CodeAps Logo" 
                  className={cn(
                      "w-7 h-7 object-contain filter cursor-pointer",
                      theme === 'nebula-light' ? "drop-shadow-[0_0_10px_rgba(0,102,204,0.4)]" : "mix-blend-screen drop-shadow-[0_0_10px_rgba(255,69,0,0.6)]"
                  )} 
              />
            </a>
            <h1 className="text-[12px] font-black glitch-text tracking-[0.2em] uppercase text-on-surface truncate max-w-[300px] lg:max-w-none">
              CODEAPS
            </h1>
          </div>
          {/* XP Progress Bar */}
          <div className="hidden lg:flex items-center space-x-3 w-56">
            <span className="text-[8px] font-black text-primary/80 font-block tracking-widest">
              LVL {Math.floor(metrics.quality / 20) + 1 < 10 ? `0${Math.floor(metrics.quality / 20) + 1}` : Math.floor(metrics.quality / 20) + 1}
            </span>
            <div className="h-1 flex-1 bg-on-surface/5 overflow-hidden border border-outline-variant relative">
              <div 
                className="h-full bg-primary animate-pulse shadow-[0_0_10px_var(--primary)]" 
                style={{ width: `${metrics.quality}%`, transition: 'width 1s ease-in-out' }} 
              />
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-on-surface/5 to-transparent" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[8px] font-black text-on-surface/20 font-block tracking-widest tabular-nums">{Math.round(metrics.quality)}%</span>
              {activeLang && (
                <div className="opacity-60 hover:opacity-100 transition-opacity">
                  {activeLang.icon}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {activeLang && (
          <span className="hidden md:inline-block text-[10px] font-block uppercase tracking-[0.2em] px-3 py-1 bg-on-surface/[0.04] border border-outline-variant shrink-0" style={{ color: activeLang.color }}>
            {activeLang.label}
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
        {activeTab && (
          <button
            onClick={handleSave}
            className={cn(
              "flex items-center space-x-1.5 px-3 py-1.5 text-[10px] font-block uppercase tracking-[0.2em] transition-all cursor-pointer",
              activeTab.isDirty 
                ? "text-primary hover:bg-primary/10 border border-primary/20" 
                : "text-on-surface-variant/40 hover:text-on-surface-variant/60",
              "shrink-0"
            )}
          >
            <Save size={12} />
            <span className="hidden md:inline">Save</span>
          </button>
        )}

        {runCmd && (
          <div className="flex items-center space-x-6">
            {/* Neural Status */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1 bg-on-surface/[0.02] border border-outline-variant font-block">
              <div className={cn(
                  "w-1.5 h-1.5 rounded-none transition-all duration-500",
                  isRunning ? "bg-primary animate-ping shadow-[0_0_12px_var(--primary)]" : "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
              )} />
              <span className="text-[8px] text-on-surface/40 uppercase tracking-[0.2em]">
                  {isRunning ? "Neural_Stream Processing" : "Neural_Link Active"}
              </span>
            </div>
            
            <button
              onClick={handleRun}
              disabled={isRunning}
              className={cn(
                "flex items-center space-x-2 md:space-x-3 px-3 md:px-5 py-1.5 text-[11px] font-block uppercase tracking-[0.2em] transition-all shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)] border border-primary/40 shrink-0",
                isRunning ? "bg-on-surface/5 text-on-surface/20 border-outline-variant cursor-not-allowed" : "bg-primary text-on-primary hover:brightness-110 cursor-pointer"
              )}
            >
              {isRunning ? <div className="w-3 h-3 border-2 border-on-surface/20 border-t-on-surface rounded-none animate-spin shrink-0" /> : <Play size={12} className="fill-current shrink-0" />}
              <span className="hidden sm:inline">{isRunning ? "Running..." : "Execute"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
