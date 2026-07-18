import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useLayoutStore } from '../../store/useLayoutStore';
import { useEditorStore } from '../../store/useEditorStore';

interface IndexedFile {
  path: string;
  filename: string;
}

export function CommandPalette() {
  const { isCommandPaletteVisible, setCommandPaletteVisible } = useLayoutStore();
  const { openTab } = useEditorStore();
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteVisible) {
      setQuery('');
      setSelectedIndex(0);
      invoke<IndexedFile[]>('get_indexed_files').then((res) => {
        setFiles(res || []);
      }).catch(err => console.error(err));
      
      // Auto focus slightly delayed to ensure render
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteVisible]);

  if (!isCommandPaletteVisible) return null;

  const filteredData = files.filter(f => 
    f.filename.toLowerCase().includes(query.toLowerCase()) || 
    f.path.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 50); // limit ui render length

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setCommandPaletteVisible(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredData.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredData.length) % filteredData.length);
    } else if (e.key === 'Enter') {
      const selected = filteredData[selectedIndex];
      if (selected) {
        openFile(selected);
      }
      setCommandPaletteVisible(false);
    }
  };

  const openFile = async (f: IndexedFile) => {
    try {
      const contentStr = await invoke<string>('read_file_content', { path: f.path });
      // Detect language from extension generically
      const ext = f.filename.split('.').pop()?.toLowerCase();
      const language = ext === 'rs' ? 'rust' : ext === 'ts' || ext === 'tsx' ? 'typescript' : ext === 'py' ? 'python' : ext === 'js' || ext === 'jsx' ? 'javascript' : ext === 'json' ? 'json' : 'plaintext';
      
      openTab(f.filename, contentStr, language, f.path);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
         onClick={() => setCommandPaletteVisible(false)}
    >
      <div 
        className="w-[600px] max-h-[60vh] bg-[#0b0e14] border border-[#1e293b] rounded-none shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-3 border-b border-[#1e293b] flex items-center bg-[#0d1117]">
          <i className="fa-solid fa-magnifying-glass text-[#475569] mr-3"></i>
          <input
             ref={inputRef}
             type="text"
             className="w-full bg-transparent text-white outline-none placeholder-[#475569] font-functional text-lg"
             placeholder="Search files by name..."
             value={query}
             onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
             onKeyDown={handleKeyDown}
          />
        </div>
        <div className="overflow-y-auto w-full flex-1 p-2 custom-scrollbar">
          {filteredData.length === 0 ? (
             <div className="text-[#475569] text-center p-4">No results found.</div>
          ) : (
             filteredData.map((f, i) => (
                <div 
                  key={i} 
                  className={`p-2 rounded-none cursor-pointer flex items-center justify-between ${i === selectedIndex ? 'bg-[#38bdf822] text-white' : 'text-[#94a3b8] hover:bg-[#1e293b]'}`}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => { openFile(f); setCommandPaletteVisible(false); }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{f.filename}</span>
                    <span className="text-xs opacity-50 truncate" style={{maxWidth: '400px'}}>{f.path}</span>
                  </div>
                </div>
             ))
          )}
        </div>
        <div className="p-2 border-t border-[#1e293b] bg-[#0d1117] flex gap-4 text-xs tracking-wider font-mono text-[#475569]">
          <span><kbd className="bg-[#1e293b] rounded-none px-1 text-[#94a3b8]">↑↓</kbd> to navigate</span>
          <span><kbd className="bg-[#1e293b] rounded-none px-1 text-[#94a3b8]">Enter</kbd> to open</span>
          <span><kbd className="bg-[#1e293b] rounded-none px-1 text-[#94a3b8]">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
