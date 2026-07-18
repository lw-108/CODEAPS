import React, { useState, useEffect, useRef } from 'react';
import { useLayoutStore } from '@/store/useLayoutStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useEditorStore } from '@/store/useEditorStore';
import { useModalStore } from '@/store/useModalStore';
import { appWindow } from '@tauri-apps/api/window';
import { emit } from '@tauri-apps/api/event';
import { X, Square, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItemProps {
  label: string;
  items: { label: string; action: string; accelerator?: string; separator?: boolean }[];
}

export const MenuBar = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { toggleTerminal, setCommandPaletteVisible, toggleSidebar } = useLayoutStore();
  const { theme } = useSettingsStore();
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action: string) => {
    setActiveMenu(null);
    
    switch (action) {
      case 'new_file':
        useEditorStore.getState().openTab('untitled', '', 'plaintext', '');
        break;
      case 'toggle_terminal':
        toggleTerminal();
        break;
      case 'toggle_sidebar':
        toggleSidebar();
        break;
      case 'command_palette':
        setCommandPaletteVisible(true);
        break;
      case 'about':
        useModalStore.getState().alert('CodeAps v1.0.0\nCentralized Operations & Development Engine', 'About');
        break;
      case 'quit':
        appWindow.close();
        break;
      default:
        emit('menu-event', action);
    }
  };

  const menus: MenuItemProps[] = [
    {
      label: 'File',
      items: [
        { label: 'New File', action: 'new_file', accelerator: 'Ctrl+N' },
        { label: 'Open File...', action: 'open_file', accelerator: 'Ctrl+O' },
        { label: 'Open Folder...', action: 'open_folder', accelerator: 'Ctrl+Shift+O' },
        { label: '', action: '', separator: true },
        { label: 'Save', action: 'save', accelerator: 'Ctrl+S' },
        { label: 'Save As...', action: 'save_as', accelerator: 'Ctrl+Shift+S' },
        { label: '', action: '', separator: true },
        { label: 'Preferences', action: 'preferences' },
        { label: '', action: '', separator: true },
        { label: 'Exit', action: 'quit' },
      ]
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', action: 'undo', accelerator: 'Ctrl+Z' },
        { label: 'Redo', action: 'redo', accelerator: 'Ctrl+Y' },
        { label: '', action: '', separator: true },
        { label: 'Cut', action: 'cut', accelerator: 'Ctrl+X' },
        { label: 'Copy', action: 'copy', accelerator: 'Ctrl+C' },
        { label: 'Paste', action: 'paste', accelerator: 'Ctrl+V' },
        { label: '', action: '', separator: true },
        { label: 'Select All', action: 'select_all', accelerator: 'Ctrl+A' },
      ]
    },
    {
      label: 'View',
      items: [
        { label: 'Command Palette', action: 'command_palette', accelerator: 'Ctrl+P' },
        { label: '', action: '', separator: true },
        { label: 'Toggle Sidebar', action: 'toggle_sidebar', accelerator: 'Ctrl+B' },
        { label: 'Toggle Terminal', action: 'toggle_terminal', accelerator: 'Ctrl+`' },
      ]
    },
    {
      label: 'Help',
      items: [
        { label: 'Documentation', action: 'docs' },
        { label: 'Keyboard Shortcuts', action: 'shortcuts' },
        { label: '', action: '', separator: true },
        { label: 'About CodeAps', action: 'about' },
      ]
    }
  ];

  // Theme-specific colors
  const bgColor = theme === 'aps-gold' ? '#2d333b' : theme === 'neural-onyx' ? '#000000' : 'var(--background)';
  const textColor = theme === 'nebula-light' ? '#000000' : '#ffffff';

  return (
    <div className="flex flex-col select-none z-[var(--z-max)]" ref={menuRef} style={{ color: textColor }}>
      {/* Title Bar */}
      <div 
        className="h-7 flex items-center justify-between px-2 app-region-drag"
        data-tauri-drag-region
        style={{ backgroundColor: bgColor, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center space-x-2 px-2 opacity-60">
          <span className="text-[9px] font-black tracking-[0.3em] uppercase">CodeAps IDE</span>
        </div>
        
        <div className="flex items-center no-drag">
          <button onClick={() => appWindow.minimize()} className="w-10 h-7 flex items-center justify-center hover:bg-on-surface/10 transition-colors"><Minus size={14} /></button>
          <button onClick={() => appWindow.toggleMaximize()} className="w-10 h-7 flex items-center justify-center hover:bg-on-surface/10 transition-colors"><Square size={12} /></button>
          <button onClick={() => appWindow.close()} className="w-10 h-7 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"><X size={14} /></button>
        </div>
      </div>

      {/* Menu Bar */}
      <div 
        className="h-7 flex items-center px-1 text-[11px]"
        data-tauri-drag-region
        style={{ backgroundColor: bgColor }}
      >
        {menus.map((menu) => (
          <div key={menu.label} className="relative">
            <button
              className={cn(
                "px-3 py-1 hover:bg-on-surface/10 transition-colors rounded-none",
                activeMenu === menu.label && "bg-on-surface/10"
              )}
              onMouseEnter={() => activeMenu && setActiveMenu(menu.label)}
              onClick={() => setActiveMenu(activeMenu === menu.label ? null : menu.label)}
            >
              {menu.label}
            </button>
            
            {activeMenu === menu.label && (
              <div className="absolute top-full left-0 w-64 bg-surface-container border border-outline-variant shadow-2xl py-1 z-[1000] no-drag">
                {menu.items.map((item, idx) => (
                  item.separator ? (
                    <div key={idx} className="h-[1px] bg-outline-variant my-1" />
                  ) : (
                    <button
                      key={idx}
                      onClick={() => handleAction(item.action)}
                      className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-primary hover:text-on-primary transition-colors text-left group"
                    >
                      <span className="text-on-surface/90 group-hover:text-on-primary">{item.label}</span>
                      {item.accelerator && <span className="text-[9px] opacity-40 group-hover:text-on-primary/60">{item.accelerator}</span>}
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
