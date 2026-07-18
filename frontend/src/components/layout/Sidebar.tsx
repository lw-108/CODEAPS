import React, { useEffect, useState } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, 
  Search, FileText, GitBranch, MessageSquare,
  Info, FilePlus, FolderPlus, Trash2, Pencil, X,
  ExternalLink, Users, Settings, Terminal, Brain, Puzzle, ListChecks, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlugins } from '@/hooks/usePlugins';
import { useFileSystem, FileInfo } from '@/hooks/useFileSystem';
import { useEditorStore } from '@/store/useEditorStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useLayoutStore } from '@/store/useLayoutStore';
import { useTerminalStore } from '@/store/useTerminalStore';
import { listen } from '@tauri-apps/api/event';
import { useGitStore } from '@/store/useGitStore';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { useSearch } from '@/hooks/useSearch';
import { getLanguageFromExtension } from '@/lib/languageMap';
import { cn } from '@/lib/utils';
import { RefreshCcw, Check, Plus, Minus, Scissors, Copy, Clipboard } from 'lucide-react';
import { FileTreeItem } from './FileTreeItem';
import { useClipboardStore } from '@/store/useClipboardStore';
import { useExplorerStore } from '@/store/useExplorerStore';
import { useModalStore } from '@/store/useModalStore';
import { DiffModal } from '../ui/DiffModal';
import logo from '@/assets/logo.png';
import { GitCommitInfo } from '@/store/useGitStore';

export const Sidebar = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const { 
    readDirectory, readFile, createFile, createDirectory, 
    deleteItem, renameItem, revealInExplorer, isLoading,
    copyItem, renameItem: moveItem, getUniquePath, emitRefresh
  } = useFileSystem();
  const { workspacePath, workspaceName } = useWorkspaceStore();
  const { 
    isSidebarVisible, toggleSidebar,
    rightPanelMode, setRightPanelMode,
    setTerminalActiveTab 
  } = useLayoutStore();
  const { requestReset: requestTerminalReset } = useTerminalStore();
  const { tabs, activeFile, openTab, setActiveFile, closeTab } = useEditorStore();
  const [activeActivity, setActiveActivity] = useState<'explorer' | 'search' | 'git' | 'users' | 'plugins' | 'settings'>('explorer');
  const { plugins: wasmPlugins, loading: pluginsLoading, refreshPlugins, loadPlugin, runHook } = usePlugins();

  const { 
    status: gitStatus, 
    log: gitLog,
    refreshStatus: refreshGit, 
    refreshLog: refreshGitLog,
    stageFile, 
    unstageFile, 
    stageAll: stageAllGit,
    commit: commitGit, 
    isLoading: isGitLoading 
  } = useGitStore();
  const { results: searchResults, search: executeSearch, isSearching } = useSearch();
  const [commitMessage, setCommitMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { stagedItem, setStagedItem, clearClipboard } = useClipboardStore();
  const { selectedItem, setSelectedItem } = useExplorerStore();
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [diffFile, setDiffFile] = useState('');

  useEffect(() => {
    if (workspacePath && workspacePath !== '__untitled__') {
      refreshFiles();
    }
  }, [workspacePath]);

  useEffect(() => {
    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      const activeElem = document.activeElement as HTMLElement;
      const isInput = activeElem?.tagName === 'INPUT' || 
                      activeElem?.tagName === 'TEXTAREA' || 
                      activeElem?.isContentEditable || 
                      activeElem?.classList.contains('monaco-editor') || 
                      activeElem?.closest('.monaco-editor') ||
                      activeElem?.closest('.codeaps-terminal');
      if (isInput) return;

      const activeTabData = tabs.find((t: any) => t.filePath === activeFile);
      // Target is prioritized: Selection > Active Editor Tab
      const target = selectedItem || (activeTabData ? { name: activeTabData.filename, path: activeTabData.filePath, is_dir: false } : null);

      if (!target && e.key !== 'v') return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'c':
            if (target) {
              setStagedItem({ 
                path: target.path, 
                name: target.name, 
                isDir: target.is_dir, 
                mode: 'copy' 
              });
            }
            break;
          case 'x':
            if (target) {
              setStagedItem({ 
                path: target.path, 
                name: target.name, 
                isDir: target.is_dir, 
                mode: 'cut' 
              });
            }
            break;
          case 'v':
            if (stagedItem) {
              try {
                let destinationDir = workspacePath;
                if (selectedItem) {
                  destinationDir = selectedItem.is_dir 
                    ? selectedItem.path 
                    : selectedItem.path.substring(0, Math.max(selectedItem.path.lastIndexOf('\\'), selectedItem.path.lastIndexOf('/')));
                } else if (activeTabData?.filePath) {
                  const p = activeTabData.filePath;
                  destinationDir = p.substring(0, Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/')));
                }

                if (!destinationDir) return;

                const sep = destinationDir.includes('\\') ? '\\' : '/';
                const rawTargetPath = `${destinationDir}${sep}${stagedItem.name}`;
                
                // Smart Path Resolution
                const targetPath = await getUniquePath(rawTargetPath);
                
                console.log(`🚀 CodeAps [FS]: Global Paste -> ${targetPath}`);

                if (stagedItem.mode === 'copy') {
                  const success = await copyItem(stagedItem.path, targetPath);
                  if (success) {
                    console.log(`✅ CodeAps: Successfully copied.`);
                    await emitRefresh(targetPath);
                    refreshFiles(); // Still refresh root just in case
                  } else {
                    alert("Failed to copy file. Target may already exist or is restricted.");
                  }
                } else {
                  const success = await moveItem(stagedItem.path, targetPath);
                  if (success) {
                    clearClipboard();
                    console.log(`✅ CodeAps: Successfully moved.`);
                    await emitRefresh(stagedItem.path); // Refresh source
                    await emitRefresh(targetPath);      // Refresh destination
                    refreshFiles();
                  } else {
                    console.error("❌ CodeAps: Move operation failed (target might exist or permission error).");
                    alert(`Failed to move: Check if "${stagedItem.name}" already exists or is locked.`);
                  }
                }
              } catch (err: any) {
                console.error("❌ CodeAps: Global Paste Error:", err);
                const msg = err.message || err.toString();
                alert(`Neural Move/Copy Conflict: ${msg}`);
              }
            }
            break;
        }
      } else if (e.key === 'Delete') {
        const confirmed = await useModalStore.getState().confirm(`System will permanently purge "${target.name}" from current memory. Proceed?`, 'Execute Deletion');
        if (target && confirmed) {
          console.log(`🗑️ CodeAps: Deleting ${target.path}`);
          const result = await deleteItem(target.path);
          if (result.success) {
            if (!target.is_dir) closeTab(target.name);
            useAnalysisStore.getState().removePathResults(target.path, target.is_dir);
            if (selectedItem?.path === target.path) setSelectedItem(null);
            refreshFiles();
          } else {
            useModalStore.getState().alert(`Module deletion failed: ${result.error || 'Identity Access Restricted'}`, 'System Conflict');
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeFile, tabs, stagedItem, workspacePath, selectedItem]);

  const handleActivityClick = (activity: 'explorer' | 'search' | 'git' | 'users' | 'settings' | 'plugins') => {
    if (activity === 'settings') {
      if (activeFile === 'Settings') {
        setActiveActivity('settings');
        return;
      }
      openTab('Settings', '', 'settings', '__settings__');
      return;
    }
    setActiveActivity(activity);
    if (!isSidebarVisible) toggleSidebar();
    
    if (activity === 'git') {
      refreshGit();
    }
  };

  const refreshFiles = async () => {
    if (!workspacePath || workspacePath === '__untitled__') return;
    try {
      const data = await readDirectory(workspacePath);
      const sorted = data.sort((a, b) => {
        if (a.is_dir && !b.is_dir) return -1;
        if (!a.is_dir && b.is_dir) return 1;
        return a.name.localeCompare(b.name);
      });
      setFiles(sorted);
    } catch (err) {
      console.error("Failed to load directory:", err);
    }
  };

  useEffect(() => {
    const unlistenPromise = listen('fs-event', (event) => {
      console.log('📡 CodeAps: External FS Event detected, refreshing...', event);
      refreshFiles();
    });

    return () => {
      unlistenPromise.then((unlistenFn) => unlistenFn());
    };
  }, [refreshFiles]);

  const handleFileClick = async (file: FileInfo) => {
    if (!file.is_dir) {
      const content = await readFile(file.path || file.name);
      const lang = getLanguageFromExtension(file.name);
      openTab(file.name, content, lang.monacoId, file.path);
    }
  };

  const handleNewFile = async () => {
    const filename = await useModalStore.getState().prompt('Define the identity of the new module (e.g. main.py, interface.ts):', '', 'Initialize Module');
    if (!filename || !filename.trim()) return;
    if (workspacePath && workspacePath !== '__untitled__') {
      const separator = workspacePath.includes('\\') ? '\\' : '/';
      const fullPath = `${workspacePath}${separator}${filename.trim()}`;
      const success = await createFile(fullPath);
      if (success) {
        await refreshFiles();
        const lang = getLanguageFromExtension(filename.trim());
        openTab(filename.trim(), '', lang.monacoId, fullPath);
      }
    } else {
      const lang = getLanguageFromExtension(filename.trim());
      openTab(filename.trim(), '', lang.monacoId, '');
      setActiveFile(filename.trim());
    }
  };

  const handleNewFolder = async () => {
    const foldername = await useModalStore.getState().prompt('Define the container identity:', '', 'Initialize Directory');
    if (!foldername || !foldername.trim()) return;
    if (workspacePath && workspacePath !== '__untitled__') {
      const separator = workspacePath.includes('\\') ? '\\' : '/';
      const fullPath = `${workspacePath}${separator}${foldername.trim()}`;
      await createDirectory(fullPath);
      await refreshFiles();
    }
  };

  const handleDeleteFile = async (file: FileInfo) => {
    const confirmed = await useModalStore.getState().confirm(`System will permanently purge "${file.name}"?`, 'Confirm Purge');
    if (confirmed) {
      if (await deleteItem(file.path)) {
        closeTab(file.name);
        await refreshFiles();
      }
    }
  };

  const handleRenameFile = async (file: FileInfo) => {
    const newName = await useModalStore.getState().prompt('Redefine the module identity:', file.name, 'Modify Metadata');
    if (newName && newName.trim() !== file.name) {
      const parentPath = file.path.substring(0, file.path.lastIndexOf(file.name));
      if (parentPath) {
        if (await renameItem(file.path, `${parentPath}${newName.trim()}`)) {
          await refreshFiles();
        }
      }
    }
  };

  const handleOpenInTerminal = (path: string) => {
    requestTerminalReset(path);
    setTerminalActiveTab('console');
  };

  return (
    <div className="flex h-full bg-surface-container overflow-hidden">
      {/* Activity Bar - High Visibility Labels */}
      <div className="w-[72px] h-full flex flex-col items-center py-6 pb-12 space-y-4 bg-surface shrink-0 border-r border-outline-variant overflow-y-auto premium-scroll relative z-[60]">
        <a href="https://lw19.vercel.app/" target="_blank" rel="noopener noreferrer" className="mb-6 group cursor-pointer flex items-center justify-center w-full">
          <img src={logo} alt="CodeAps" className="w-8 h-8 object-contain filter drop-shadow-[0_0_12px_rgba(255,184,108,0.4)] group-hover:scale-110 transition-transform cursor-pointer" />
        </a>
        <ActivityIcon 
          icon={<FileText size={22} />} 
          label="FILES"
          active={isSidebarVisible && activeActivity === 'explorer'} 
          onClick={() => handleActivityClick('explorer')}
          tooltip="File Explorer"
        />
        <ActivityIcon 
          icon={<GitBranch size={22} />} 
          label="SOURCE"
          active={isSidebarVisible && activeActivity === 'git'}
          onClick={() => handleActivityClick('git')}
          tooltip="Source Control"
        />
        <ActivityIcon 
          icon={<Search size={22} />} 
          label="SEARCH"
          active={isSidebarVisible && activeActivity === 'search'}
          onClick={() => handleActivityClick('search')}
          tooltip="Global Search"
        />
        <ActivityIcon 
          icon={<Brain size={22} />} 
          label="NEURAL"
          active={rightPanelMode === 'analysis'} 
          onClick={() => setRightPanelMode('analysis')}
          tooltip="Neural Analysis"
        />
        <ActivityIcon 
          icon={<ListChecks size={22} />} 
          label="TARGETS"
          active={rightPanelMode === 'requirements'} 
          onClick={() => setRightPanelMode('requirements')}
          tooltip="Executive Requirements"
        />
        <ActivityIcon 
          icon={<Activity size={22} />} 
          label="LIFECYCLE"
          active={rightPanelMode === 'lifecycle'} 
          onClick={() => setRightPanelMode('lifecycle')}
          tooltip="Project Lifecycle"
        />
        <ActivityIcon 
          icon={<Puzzle size={22} />} 
          label="PLUGINS"
          active={isSidebarVisible && activeActivity === 'plugins'}
          onClick={() => handleActivityClick('plugins')}
          tooltip="Wasm Plugins"
        />
        <ActivityIcon 
          icon={<MessageSquare size={22} />} 
          label="CHAT"
          active={rightPanelMode === 'chat'} 
          onClick={() => setRightPanelMode('chat')}
          tooltip="AI Chat"
        />
        
        <ActivityIcon 
          icon={<Settings size={22} />} 
          label="SETUP"
          active={activeFile === 'Settings'}
          onClick={() => handleActivityClick('settings')}
          tooltip="Settings"
          className="mt-auto"
        />
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto premium-scroll">
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
              <span className="text-[10px] font-black text-on-surface uppercase tracking-[0.15em] font-editorial truncate">
                {activeActivity === 'explorer' ? 'Explorer' : activeActivity}
              </span>
              {activeActivity === 'explorer' && (
                <div className="flex items-center space-x-1">
                  <button onClick={handleNewFile} className="p-1.5 text-on-surface-variant/40 hover:text-white transition-all cursor-pointer" title="New File"><FilePlus size={14} /></button>
                  <button onClick={handleNewFolder} className="p-1.5 text-on-surface-variant/40 hover:text-white transition-all cursor-pointer" title="New Folder"><FolderPlus size={14} /></button>
                  <button onClick={refreshFiles} className="p-1.5 text-on-surface-variant/40 hover:text-white transition-all cursor-pointer" title="Refresh Explorer"><RefreshCcw size={14} /></button>
                </div>
              )}
            </div>

            {activeActivity === 'explorer' ? (
              <div className="flex flex-col h-full">
                {/* Open Editors Section */}
                {tabs.length > 0 && (
                  <SidebarSection title="Open Editors" collapsible defaultOpen>
                    <div className="space-y-[1px]">
                        {tabs.map((tab: any) => {
                          const lang = getLanguageFromExtension(tab.filename);
                          const isActive = activeFile === tab.filePath;
                          return (
                            <div key={tab.filePath} onClick={() => setActiveFile(tab.filePath)} className={cn("group flex items-center space-x-2 px-4 h-7 cursor-pointer text-[12px] transition-all relative", isActive ? "bg-primary text-on-primary" : "text-on-surface/40 hover:bg-on-surface/5 hover:text-on-surface/80")}>
                              <span className="text-[12px] flex items-center justify-center shrink-0 w-5" style={{ color: isActive ? 'var(--on-primary)' : lang.color }}>{lang.icon}</span>
                              <span className="truncate flex-1 text-[13px]">{tab.filename}</span>
                              {tab.isDirty && <span className={cn("text-[14px] mr-2", isActive ? "text-on-primary/60" : "text-zinc-500")}>●</span>}
                              <button onClick={(e) => { e.stopPropagation(); closeTab(tab.filePath); }} className={cn("opacity-0 group-hover:opacity-100 cursor-pointer mr-1", isActive ? "text-on-primary/60 hover:text-on-primary" : "text-zinc-500 hover:text-on-surface")}><X size={14} /></button>
                              {isActive && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-on-primary/40" />}
                            </div>
                          );
                        })}
                    </div>
                  </SidebarSection>
                )}
                
                {/* Workspace Section */}
                {workspacePath && workspacePath !== '__untitled__' && (
                  <SidebarSection title={workspaceName?.toUpperCase() || "WORKSPACE"} collapsible defaultOpen>
                    <div className="flex flex-col">
                      {files.map((file) => (
                        <FileTreeItem 
                          key={file.path} 
                          file={file} 
                          level={0} 
                          activePath={activeFile}
                          onSelect={handleFileClick}
                          onRefresh={refreshFiles}
                        />
                      ))}
                    </div>
                  </SidebarSection>
                )}
              </div>
            ) : activeActivity === 'users' ? (
              <SidebarSection title="Active Collaborators" collapsible defaultOpen>
                <div className="space-y-[1px] px-2">
                  <CollaboratorNode name="SYSTEM_ADMIN" status="online" role="architect" color="#fafafa" />
                  <CollaboratorNode name="PEER_01" status="online" role="student" color="#71717a" />
                  <CollaboratorNode name="PEER_02" status="away" role="student" color="#52525b" opacity={0.3} />
                </div>
              </SidebarSection>
            ) : activeActivity === 'git' ? (
              <div className="flex flex-col h-full bg-surface-container">
                  <SidebarSection 
                    title="Source Control" 
                    collapsible 
                    defaultOpen
                    action={
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); stageAllGit(); }} 
                          className="p-1 hover:text-secondary transition-all"
                          title="Stage All All Changes"
                        >
                          <Plus size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); refreshGit(); }} 
                          className={cn("p-1 hover:text-primary transition-all", isGitLoading && "animate-spin")}
                          title="Refresh Git Status"
                        >
                          <RefreshCcw size={14} />
                        </button>
                      </div>
                    }
                  >
                    <div className="px-4 py-2 space-y-4">
                        {gitStatus?.is_repo ? (
                          <>
                            <div className="flex items-center justify-between text-[11px] text-on-surface-variant/60 font-bold uppercase tracking-wider italic">
                                <span>Branch: {gitStatus?.branch}</span>
                                <GitBranch size={12} className="text-primary" />
                            </div>
                            
                            <div className="space-y-1">
                                {gitStatus?.files.map((file: any, idx: number) => (
                                  <div key={idx} className="group p-2 bg-white/[0.02] border border-white/5 text-[10px] text-on-surface/80 flex items-center justify-between hover:bg-white/[0.05]">
                                      <div className="flex items-center space-x-2 truncate flex-1 mr-2">
                                        <span className={cn(
                                          "w-4 text-center font-black",
                                          file.status === 'modified' ? "text-amber-500" : 
                                          file.status === 'new' ? "text-secondary" : "text-red-500"
                                        )}>{file.display_status}</span>
                                        <span className="truncate" title={file.path}>{file.path}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        {file.is_staged ? (
                                          <button onClick={() => unstageFile(file.path)} className="p-1 text-primary hover:bg-primary/20 rounded-none" title="Unstage"><Minus size={12} /></button>
                                        ) : (
                                          <>
                                            <button 
                                              onClick={() => { setDiffFile(file.path); setIsDiffOpen(true); }}
                                              className="p-1 text-on-surface-variant/40 hover:text-orange-500 hover:bg-white/10 rounded-none" 
                                              title="Compare with HEAD"
                                            >
                                              <ExternalLink size={12} />
                                            </button>
                                            <button onClick={() => stageFile(file.path)} className="p-1 text-on-surface-variant/40 hover:text-secondary hover:bg-white/10 rounded-none" title="Stage"><Plus size={12} /></button>
                                          </>
                                        )}
                                      </div>
                                  </div>
                                ))}
                                {gitStatus?.files.length === 0 && (
                                  <div className="text-[10px] text-on-surface-variant/30 italic text-center py-4">No changes detected.</div>
                                )}
                            </div>

                            <div className="space-y-2 mt-4">
                              <textarea
                                value={commitMessage}
                                onChange={(e) => setCommitMessage(e.target.value)}
                                placeholder="Commit message..."
                                className="w-full bg-surface-low border border-outline-variant p-2 text-[11px] text-on-surface outline-none focus:border-primary/40 min-h-[60px] resize-none rounded-none"
                              />
                              <button 
                                onClick={async () => {
                                  if (!commitMessage.trim()) return;
                                  await commitGit(commitMessage);
                                  setCommitMessage('');
                                }}
                                disabled={!commitMessage.trim() || isGitLoading}
                                className="w-full py-2 bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all disabled:opacity-30 disabled:hover:bg-primary/10 disabled:hover:text-primary"
                              >
                                {isGitLoading ? 'Processing...' : 'Commit Changes'}
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-64 space-y-6 opacity-60">
                              <div className="relative">
                                <GitBranch size={48} className="text-on-surface-variant/20" />
                                <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-primary/5 blur-xl -z-10 rounded-none" />
                              </div>
                              <div className="flex flex-col items-center space-y-2">
                                <span className="text-[10px] text-center px-8 uppercase tracking-widest font-bold text-on-surface/40">Neural Git Archive Inactive</span>
                                <button 
                                  onClick={async () => {
                                    const { invoke } = await import('@tauri-apps/api/tauri');
                                    try {
                                      await invoke('git_init', { path: workspacePath });
                                      refreshGit();
                                    } catch (e) {
                                      console.error("Git Init Failed:", e);
                                    }
                                  }}
                                  className="px-6 py-2 bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] transition-all cursor-pointer border-none"
                                >
                                  Initialize Neural Repo
                                </button>
                              </div>
                          </div>
                        )}
                    </div>
                  </SidebarSection>

                  {/* Git Log / Timeline Section */}
                  {gitStatus?.is_repo && gitLog && gitLog.length > 0 && (
                    <SidebarSection 
                      title="Executive Timeline" 
                      collapsible 
                      defaultOpen
                    >
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-4 py-4 space-y-6 relative ml-4 border-l border-white/10"
                      >
                        {gitLog.map((commit: any, idx: number) => (
                          <motion.div 
                            key={commit.id} 
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="relative pl-6 group/item"
                          >
                            {/* Neural Line Connector Node */}
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: idx * 0.05 + 0.2 }}
                              className="absolute -left-[25px] top-1.5 w-2 h-2 rounded-none bg-zinc-800 border border-white/20 z-10 group-hover/item:border-orange-500 transition-colors" 
                            />
                            
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-orange-500 font-mono tracking-tighter uppercase">{commit.short_id}</span>
                                <span className="text-[9px] text-white/30 uppercase tracking-[0.1em]">{commit.date.split(' ')[0]}</span>
                              </div>
                              <span className="text-[11px] text-zinc-100 font-medium leading-tight line-clamp-2" title={commit.message}>
                                {commit.message}
                              </span>
                              <div className="flex items-center gap-1.5 pt-1">
                                <div className="w-3.5 h-3.5 rounded-none bg-zinc-800 border border-white/5 flex items-center justify-center text-[8px] font-bold">
                                  {commit.author[0]}
                                </div>
                                <span className="text-[9px] text-white/40 font-bold uppercase tracking-wide truncate">{commit.author}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    </SidebarSection>
                  )}
              </div>
            ) : activeActivity === 'search' ? (
              <div className="flex flex-col h-full bg-surface-container">
                  <div className="p-4 space-y-4 border-b border-white/5">
                    <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Global Search</span>
                        <div className="relative">
                          <input 
                              type="text" 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && executeSearch(searchQuery)}
                              placeholder="Search workspace..." 
                              className="w-full bg-white/[0.03] border border-white/5 pl-4 pr-10 py-3 text-[11px] text-on-surface outline-none focus:border-primary/40 transition-all font-functional"
                          />
                          <button 
                            onClick={() => executeSearch(searchQuery)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-primary transition-colors"
                          >
                            {isSearching ? <RefreshCcw size={14} className="animate-spin" /> : <Search size={14} />}
                          </button>
                        </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      <div className="p-2 space-y-1">
                        {searchResults.map((result, idx) => (
                          <div 
                            key={idx} 
                            onClick={async () => {
                              const content = await readFile(result.file);
                              const lang = getLanguageFromExtension(result.filename);
                              openTab(result.filename, content, lang.monacoId, result.file);
                            }}
                            className="p-3 bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] cursor-pointer group transition-all"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[11px] font-bold text-primary/80 truncate">{result.filename}</span>
                              <span className="text-[9px] text-on-surface-variant/40 font-mono">L{result.line}</span>
                            </div>
                            <div className="text-[10px] text-on-surface/60 font-mono truncate bg-black/40 p-1.5 border-l-2 border-primary/20">
                              {result.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 h-full flex flex-col items-center justify-center opacity-20 space-y-4 py-20">
                        <Search size={32} />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-center italic">
                          {isSearching ? 'Searching Workspace...' : 'Search Index Ready • Awaiting Query'}
                        </span>
                      </div>
                    )}
                  </div>
              </div>
            ) : activeActivity === 'plugins' ? (
              <div className="flex flex-col h-full bg-surface-container">
                  <div className="p-4 flex items-center justify-between border-b border-outline-variant">
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Extension Engine</span>
                    <button onClick={refreshPlugins} className={cn("p-1.5 text-on-surface-variant/40 hover:text-primary transition-all", pluginsLoading && "animate-spin")}>
                      <RefreshCcw size={14} />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {wasmPlugins.length > 0 ? (
                      wasmPlugins.map((plugin) => (
                        <div key={plugin.name} className="p-4 bg-on-surface/[0.02] border border-outline-variant hover:bg-on-surface/[0.04] group transition-all relative overflow-hidden">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Puzzle size={16} className="text-secondary" />
                              <span className="text-[12px] font-bold text-on-surface uppercase tracking-tight">{plugin.name}</span>
                            </div>
                            <span className={cn(
                              "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-none",
                              plugin.status === 'loaded' ? "bg-green-500/10 text-green-500" : "bg-on-surface/10 text-on-surface/40"
                            )}>{plugin.status}</span>
                          </div>
                          <div className="text-[9px] text-on-surface/30 truncate mb-4 font-mono">{plugin.path}</div>
                          
                          <div className={cn("grid gap-2", plugin.status === 'loaded' ? "grid-cols-2" : "grid-cols-1")}>
                            {plugin.status === 'unloaded' ? (
                              <button 
                                onClick={() => loadPlugin(plugin.name, plugin.path)}
                                className="py-2 bg-primary text-on-primary text-[9px] font-black uppercase tracking-widest transition-all hover:brightness-110"
                              >
                                {pluginsLoading ? 'Injecting WASM...' : 'Load into Engine'}
                              </button>
                            ) : (
                              <>
                                <button 
                                  onClick={() => runHook(plugin.name, 'on_load')}
                                  className="py-1.5 bg-on-surface/5 hover:bg-primary/20 hover:text-primary text-[9px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-primary/20"
                                >
                                  Init
                                </button>
                                <button 
                                  onClick={() => runHook(plugin.name, 'transform')}
                                  className="py-1.5 bg-on-surface/5 hover:bg-secondary/20 hover:text-secondary text-[9px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-secondary/20"
                                >
                                  Transform
                                </button>
                              </>
                            )}
                          </div>
                          
                          {/* Glitch Overlay */}
                          <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                            <Puzzle size={40} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 space-y-4">
                        <Puzzle size={32} />
                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-center italic">
                          No plugins detected in /plugins
                        </div>
                      </div>
                    )}
                  </div>
              </div>
            ) : (
              <div className="p-8 text-center space-y-4">
                <div className="text-primary opacity-20"><Search size={48} className="mx-auto" /></div>
                <div className="text-[10px] font-black uppercase text-on-surface-variant/40 tracking-widest font-editorial">
                  {activeActivity} Engine Offline
                </div>
                <div className="text-[9px] text-on-surface-variant/20 italic">Module integration pending activation.</div>
              </div>
            )}
        </div>
      </div>

      <DiffModal 
        isOpen={isDiffOpen} 
        onClose={() => setIsDiffOpen(false)} 
        filePath={diffFile} 
      />
    </div>
  );
};


interface ActivityIconProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  tooltip: string;
}

interface CollaboratorNodeProps {
  name: string;
  status: 'online' | 'away' | 'offline';
  role: string;
  color: string;
  opacity?: number;
}

const CollaboratorNode = ({ name, status, role, color, opacity = 1 }: CollaboratorNodeProps) => (
  <div className="flex items-center space-x-3 py-2 px-4 hover:bg-on-surface/5 transition-all group cursor-default" style={{ opacity }}>
    <div className="relative">
      <div className="w-8 h-8 border border-outline-variant bg-on-surface/5 flex items-center justify-center text-[10px] font-black text-on-surface-variant/40 font-block">
        {name[0]}
      </div>
      <div 
        className={cn(
          "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-surface-container rounded-none",
          status === 'online' ? "bg-green-500" : status === 'away' ? "bg-yellow-500" : "bg-gray-500"
        )} 
      />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[11px] font-bold text-on-surface truncate font-block tracking-tight">{name}</div>
      <div className="text-[8px] font-black text-on-surface-variant/20 uppercase tracking-[0.2em] font-editorial">{role}</div>
    </div>
    <div className="w-1.5 h-1.5 rounded-none shadow-[0_0_8px_currentColor]" style={{ color }} />
  </div>
);

const ActivityIcon = ({ icon, label, active, onClick, tooltip, className }: any) => (
    <div 
        onClick={onClick}
        className={cn(
            "w-full flex flex-col items-center py-3 cursor-pointer transition-all relative group/sidebar",
            active ? "text-primary border-l-[3px] border-primary bg-primary/5 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]" : "text-on-surface-variant/40 hover:text-on-surface hover:bg-on-surface/5",
            className
        )}
    >
        {icon}
        <span className={cn(
            "text-[8px] font-black mt-1.5 transition-all uppercase tracking-tighter",
            active ? "text-primary" : "text-on-surface-variant/30 group-hover/sidebar:text-on-surface/60"
        )}>
            {label}
        </span>
        {/* Premium Tooltip */}
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-surface-high text-on-surface text-[10px] font-black uppercase tracking-widest border border-outline-variant rounded-none opacity-0 group-hover/sidebar:opacity-100 pointer-events-none transition-all duration-300 translate-x-3 group-hover/sidebar:translate-x-0 whitespace-nowrap z-[100] backdrop-blur-md shadow-2xl">
           <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-surface-high border-l border-b border-outline-variant rotate-45" />
           {tooltip}
        </div>
    </div>
);

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  collapsible: boolean;
  defaultOpen?: boolean;
  action?: React.ReactNode;
}

const SidebarSection = ({ title, children, collapsible, defaultOpen = false, action }: SidebarSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="mb-2">
      <div 
        className="flex items-center justify-between px-4 py-3 hover:bg-surface-high/40 cursor-pointer group transition-colors select-none"
        onClick={() => collapsible && setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2">
          {collapsible && (
              isOpen ? <ChevronDown size={14} className="text-on-surface-variant" /> : <ChevronRight size={14} className="text-on-surface-variant" />
          )}
          <span className="text-[11px] font-bold text-on-surface group-hover:text-primary transition-colors font-editorial uppercase tracking-widest">
            {title}
          </span>
        </div>
        {action && <div className="z-10">{action}</div>}
      </div>
      {isOpen && children && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            {children}
          </div>
      )}
    </div>
  );
};
