import React, { useState, useEffect } from 'react';
import { ChevronRight, Folder, FolderOpen, MoreVertical, FileText, Scissors, Copy, Clipboard, Edit2, Trash2, Plus, FolderPlus, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileInfo, useFileSystem } from '../../hooks/useFileSystem';
import { getLanguageFromExtension } from '../../lib/languageMap';
import { useClipboardStore } from '../../store/useClipboardStore';
import { useExplorerStore } from '../../store/useExplorerStore';
import { useEditorStore } from '../../store/useEditorStore';
import { useModalStore } from '../../store/useModalStore';
import { cn } from '../../lib/utils';
import { useAnalysisStore } from '../../store/useAnalysisStore';

interface FileTreeItemProps {
  file: FileInfo;
  level: number;
  onSelect: (file: FileInfo) => void;
  onRefresh: () => void;
  activePath?: string;
}

export const FileTreeItem: React.FC<FileTreeItemProps> = ({ 
  file, 
  level, 
  onSelect, 
  onRefresh,
  activePath 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<FileInfo[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  
  const { 
    readDirectory, isLoading, copyItem, renameItem, 
    deleteItem, createFile, createDirectory, revealInExplorer,
    getUniquePath, emitRefresh 
  } = useFileSystem();
  const { stagedItem, setStagedItem, clearClipboard } = useClipboardStore();
  const { selectedItem, setSelectedItem } = useExplorerStore();
  const { closeTab } = useEditorStore();
  
  const isActive = activePath === file.path;
  const isSelected = selectedItem?.path === file.path;
  const isStagedForCut = stagedItem?.path === file.path && stagedItem?.mode === 'cut';
  const lang = !file.is_dir ? getLanguageFromExtension(file.name) : null;

  const loadChildren = async () => {
    if (file.is_dir) {
      const data = await readDirectory(file.path);
      setChildren(data.sort((a, b) => {
        if (a.is_dir && !b.is_dir) return -1;
        if (!a.is_dir && b.is_dir) return 1;
        return a.name.localeCompare(b.name);
      }));
    }
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Listen for global sub-tree refresh events
  useEffect(() => {
    let unlisten: any;
    const startListen = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      unlisten = await listen('refresh-directory', (event: any) => {
        // If this item is a directory and its path matches the refresh target, reload
        if (file.is_dir && isOpen && event.payload.path === file.path) {
          console.log(`♻️ CodeAps [UI]: Refreshing directory subtree: ${file.name}`);
          loadChildren();
        }
      });
    };
    startListen();
    return () => { if (unlisten) unlisten(); };
  }, [file.is_dir, file.path, isOpen]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleAction = async (action: 'cut' | 'copy' | 'paste' | 'rename' | 'delete' | 'newFile' | 'newFolder' | 'reveal') => {
    setContextMenu(null);
    
    switch (action) {
      case 'cut':
        setStagedItem({ path: file.path, name: file.name, isDir: file.is_dir, mode: 'cut' });
        break;
      case 'copy':
        setStagedItem({ path: file.path, name: file.name, isDir: file.is_dir, mode: 'copy' });
        break;
      case 'paste':
        if (stagedItem) {
          try {
            const destinationDir = file.is_dir ? file.path : file.path.substring(0, Math.max(file.path.lastIndexOf('\\'), file.path.lastIndexOf('/')));
            const sep = destinationDir.includes('\\') ? '\\' : '/';
            // Use GetUniquePath to handle collisions
            const rawTargetPath = `${destinationDir}${sep}${stagedItem.name}`;
            const targetPath = await getUniquePath(rawTargetPath);
            
            console.log(`🚀 CodeAps [FS]: Initiating Paste -> ${targetPath}`);

            if (stagedItem.mode === 'copy') {
              if (await copyItem(stagedItem.path, targetPath)) {
                await emitRefresh(targetPath);
                if (file.is_dir) {
                  setIsOpen(true);
                  await loadChildren();
                } else {
                  onRefresh();
                }
              } else {
                useModalStore.getState().alert("Neural copy failed. Target path might be restricted.", "System Conflict");
              }
            } else {
              if (await renameItem(stagedItem.path, targetPath)) {
                clearClipboard();
                await emitRefresh(stagedItem.path); // Refresh source
                await emitRefresh(targetPath);      // Refresh destination
                if (file.is_dir) {
                  setIsOpen(true);
                  await loadChildren();
                } else {
                  onRefresh();
                }
              } else {
                useModalStore.getState().alert("Neural move failed. Verify source and destination accessibility.", "System Conflict");
              }
            }
          } catch (err: any) {
            console.error("❌ CodeAps: Paste Error:", err);
            const msg = err.message || err.toString();
            useModalStore.getState().alert(`Neural sync failed: ${msg}`, "System Conflict");
          }
        }
        break;
      case 'delete':
        if (await useModalStore.getState().confirm(`System will permanently purge "${file.name}" from current memory. Proceed?`, 'Execute Deletion')) {
          const result = await deleteItem(file.path);
          if (result.success) {
            if (!file.is_dir) closeTab(file.name);
            useAnalysisStore.getState().removePathResults(file.path, file.is_dir);
            if (selectedItem?.path === file.path) setSelectedItem(null);
            onRefresh();
            console.log("✅ CodeAps: Delete successful");
          } else {
            useModalStore.getState().alert(`Module deletion failed: ${result.error || 'Identity Access Restricted'}`, 'System Conflict');
          }
        }
        break;
      case 'rename':
        const newName = await useModalStore.getState().prompt('Redefine the module identity:', file.name, 'Modify Metadata');
        if (newName && newName.trim() !== file.name) {
          const parent = file.path.substring(0, Math.max(file.path.lastIndexOf('\\'), file.path.lastIndexOf('/')));
          const separator = (parent.includes('\\') || parent.includes('/')) ? (parent.includes('\\') ? '\\' : '/') : (navigator.platform.includes('Win') ? '\\' : '/');
          const newPath = `${parent}${separator}${newName.trim()}`;
          if (await renameItem(file.path, newPath)) {
            if (!file.is_dir) closeTab(file.name);
            setSelectedItem(null);
            onRefresh();
          }
        }
        break;
      case 'newFile':
        const fname = await useModalStore.getState().prompt('Define the identity of the new module:', '', 'Initialize Module');
        if (fname) {
          const sep = file.path.includes('\\') ? '\\' : '/';
          const newPath = `${file.path}${sep}${fname}`;
          if (await createFile(newPath)) {
            await loadChildren();
            setIsOpen(true);
          }
        }
        break;
      case 'newFolder':
        const dname = await useModalStore.getState().prompt('Define the container identity:', '', 'Initialize Directory');
        if (dname) {
          const sep = file.path.includes('\\') ? '\\' : '/';
          const newPath = `${file.path}${sep}${dname}`;
          if (await createDirectory(newPath)) {
            await loadChildren();
            setIsOpen(true);
          }
        }
        break;
      case 'reveal':
        await revealInExplorer(file.path);
        break;
    }
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.is_dir) {
      if (!isOpen) {
        await loadChildren();
      }
      setIsOpen(!isOpen);
    } else {
      onSelect(file);
    }
    setSelectedItem(file);
  };

  // Nesting guides (vertical lines)
  const guides = [];
  for (let i = 0; i < level; i++) {
    guides.push(
      <div 
        key={i} 
        className="w-[12px] h-full border-r border-outline-variant mx-[4px] shrink-0"
      />
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div 
        onClick={handleToggle}
        onContextMenu={handleContextMenu}
        className={cn(
          "group flex items-center h-7 px-2 cursor-pointer transition-all duration-150 relative select-none",
          isActive ? 'bg-primary/10 text-primary' : isSelected ? 'bg-on-surface/10 text-on-surface' : 'hover:bg-on-surface/5 text-on-surface/40 hover:text-on-surface/80',
          isStagedForCut && "opacity-40 grayscale-[0.5]"
        )}
        title={file.path}
      >
        {/* Indentation Guides */}
        <div className="flex h-full items-stretch shrink-0 pointer-events-none">
          {guides}
        </div>

        {/* Chevron / Spacer */}
        <div className="w-4 flex items-center justify-center mr-1 shrink-0">
          {file.is_dir && (
            <ChevronRight 
              size={14} 
              className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} 
            />
          )}
        </div>

        {/* Icon */}
        <div className="w-5 flex items-center justify-center mr-2 shrink-0">
          {file.is_dir ? (
            file.name.toLowerCase().includes('rust') || file.name.toLowerCase() === 'src-tauri' ? (
              <div className="flex items-center justify-center scale-90">
                {getLanguageFromExtension('main.rs')?.icon}
              </div>
            ) : (
              isOpen ? <FolderOpen size={16} className="text-zinc-500" /> : <Folder size={16} className="text-zinc-500" />
            )
          ) : (
            <div className="flex items-center justify-center">
              {lang?.icon || <FileText size={14} className="text-zinc-500" />}
            </div>
          )}
        </div>

        {/* Label */}
        <span className="text-[13px] truncate flex-1 font-medium tracking-tight">
          {file.name}
        </span>

        {/* Action Icon (Visible on Hover) */}
        <div 
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 p-1 hover:bg-on-surface/10 rounded-none"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({ x: e.clientX, y: e.clientY });
          }}
        >
           <MoreVertical size={14} className="text-on-surface-variant/60 hover:text-on-surface" />
        </div>

        {/* Active Indicator Line */}
        {isActive && (
          <motion.div 
            layoutId="active-file-indicator"
            className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)] z-20" 
          />
        )}
      </div>

      {/* Children Container */}
      <AnimatePresence>
        {file.is_dir && isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
            className="flex flex-col w-full overflow-hidden"
          >
            {isLoading && children.length === 0 ? (
              <div className="py-1 px-8 text-[11px] text-zinc-600 animate-pulse italic">
                Loading...
              </div>
            ) : (
              <div className="flex flex-col w-full">
                {children.map((child: FileInfo) => (
                  <FileTreeItem 
                    key={child.path}
                    file={child}
                    level={level + 1}
                    onSelect={onSelect}
                    onRefresh={loadChildren}
                    activePath={activePath}
                  />
                ))}
              </div>
            )}
            {isOpen && !isLoading && children.length === 0 && (
               <div className="py-1 h-7 flex items-center" style={{ paddingLeft: `${(level + 2) * 12 + 20}px` }}>
                  <span className="text-[11px] text-on-surface-variant/20 italic">No items</span>
               </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu Portal-like (Absolute) */}
      {contextMenu && (
        <div 
          className="fixed z-[1000] bg-surface-high border border-outline-variant rounded-none shadow-2xl py-1 w-44 overflow-hidden animate-in fade-in zoom-in duration-100 backdrop-blur-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => handleAction('cut')} className="w-full flex items-center gap-3 px-3 py-1.5 text-[12px] text-on-surface/80 hover:bg-on-surface/10 transition-colors">
            <Scissors size={14} className="text-on-surface-variant/40" /> Cut <span className="ml-auto text-[10px] opacity-40 uppercase">Ctrl+X</span>
          </button>
          <button onClick={() => handleAction('copy')} className="w-full flex items-center gap-3 px-3 py-1.5 text-[12px] text-on-surface/80 hover:bg-on-surface/10 transition-colors">
            <Copy size={14} className="text-on-surface-variant/40" /> Copy <span className="ml-auto text-[10px] opacity-40 uppercase">Ctrl+C</span>
          </button>
          <button 
            disabled={!stagedItem}
            onClick={() => handleAction('paste')} 
            className="w-full flex items-center gap-3 px-3 py-1.5 text-[12px] text-on-surface/80 hover:bg-on-surface/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Clipboard size={14} className="text-on-surface-variant/40" /> Paste <span className="ml-auto text-[10px] opacity-40 uppercase">Ctrl+V</span>
          </button>
          <div className="h-[1px] bg-outline-variant my-1" />
          {file.is_dir && (
            <>
              <button onClick={() => handleAction('newFile')} className="w-full flex items-center gap-3 px-3 py-1.5 text-[12px] text-on-surface/80 hover:bg-on-surface/10 transition-colors">
                <Plus size={14} className="text-on-surface-variant/40" /> New File
              </button>
              <button onClick={() => handleAction('newFolder')} className="w-full flex items-center gap-3 px-3 py-1.5 text-[12px] text-on-surface/80 hover:bg-on-surface/10 transition-colors">
                <FolderPlus size={14} className="text-on-surface-variant/40" /> New Folder
              </button>
              <div className="h-[1px] bg-outline-variant my-1" />
            </>
          )}
          <button onClick={() => handleAction('reveal')} className="w-full flex items-center gap-3 px-3 py-1.5 text-[12px] text-on-surface/80 hover:bg-on-surface/10 transition-colors">
            <Share2 size={14} className="text-on-surface-variant/40" /> Share / Reveal
          </button>
          <button onClick={() => handleAction('rename')} className="w-full flex items-center gap-3 px-3 py-1.5 text-[12px] text-on-surface/80 hover:bg-on-surface/10 transition-colors">
            <Edit2 size={14} className="text-on-surface-variant/40" /> Rename
          </button>
          <button onClick={() => handleAction('delete')} className="w-full flex items-center gap-3 px-3 py-1.5 text-[12px] text-rose-400 hover:bg-rose-500/10 transition-colors">
            <Trash2 size={14} className="text-rose-400 opacity-60" /> Delete <span className="ml-auto text-[10px] opacity-40">Del</span>
          </button>
        </div>
      )}
    </div>
  );
};
