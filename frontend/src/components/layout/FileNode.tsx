import React, { useState } from 'react';
import { 
  Folder, ChevronRight, ChevronDown, FileCode, MoreHorizontal 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileInfo } from '@/hooks/useFileSystem';
import { useEditorStore } from '@/store/useEditorStore';

interface FileNodeProps {
  file: FileInfo;
  depth?: number;
  onFileClick: (file: FileInfo) => void;
}

export const FileNode = ({ file, depth = 0, onFileClick }: FileNodeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { activeFile } = useEditorStore();
  const isActive = activeFile === file.name;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.is_dir) {
      setIsOpen(!isOpen);
    } else {
      onFileClick(file);
    }
  };

  return (
    <div className="select-none">
      <div 
        onClick={handleToggle}
        style={{ paddingLeft: `${depth * 12 + 16}px` }}
        className={cn(
            "group flex items-center space-x-2 py-1.5 cursor-pointer transition-all relative border-l-2 border-transparent",
            isActive ? "bg-primary/5 text-primary border-primary/50 shadow-[inset_0_0_20px_rgba(5,255,161,0.03)]" : "text-white/40 hover:bg-white/[0.02] hover:text-white/70",
            file.is_dir && "hover:bg-white/[0.04]"
        )}
      >
        {/* Active Indicator Glow */}
        {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-primary rounded-none shadow-[0_0_10px_#05FFA1]" />
        )}

        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          {file.is_dir ? (
            isOpen ? <ChevronDown size={14} className="text-white/20 group-hover:text-white/60 transition-colors" /> : <ChevronRight size={14} className="text-white/20 group-hover:text-white/60 transition-colors" />
          ) : (
            <div className="w-1 h-1 rounded-none bg-white/10 group-hover:bg-white/30 transition-colors" />
          )}
        </div>

        {file.is_dir ? (
          <Folder size={14} className={cn("transition-colors", isOpen ? "text-primary/60" : "text-white/40 group-hover:text-white/60")} />
        ) : (
          <FileCode size={14} className={cn("transition-colors", isActive ? "text-primary" : "text-white/40 group-hover:text-white/60")} />
        )}

        <span className={cn(
            "text-[11px] font-medium truncate transition-colors",
            isActive ? "font-bold text-white/90" : "font-normal"
        )}>
          {file.name}
        </span>

        {/* Hover Actions Placeholder */}
        <div className="ml-auto pr-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2 text-white/20">
            {!file.is_dir && <MoreHorizontal size={12} className="hover:text-white transition-colors" />}
        </div>
      </div>

      {file.is_dir && isOpen && file.children && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          {file.children.map((child, i) => (
            <FileNode key={i} file={child} depth={depth + 1} onFileClick={onFileClick} />
          ))}
        </div>
      )}
    </div>
  );
};
