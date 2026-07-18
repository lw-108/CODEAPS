import React, { useState, useEffect, useRef } from 'react';
import { Brain, Sparkles, X, Wand2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRefactorStore } from '@/store/useRefactorStore';
import { useEditorStore } from '@/store/useEditorStore';
import { refactorService } from '@/services/RefactorService';
import { cn } from '@/lib/utils';

interface RefactorOverlayProps {
  selectionInfo: {
    top: number;
    left: number;
    code: string;
    range: any;
    filePath: string;
  } | null;
  onClose: () => void;
}

export const RefactorOverlay: React.FC<RefactorOverlayProps> = ({ selectionInfo, onClose }) => {
  const [instruction, setInstruction] = useState('');
  const { startRefactor, setProposals, setRefactoring, isRefactoring } = useRefactorStore();
  const { tabs } = useEditorStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectionInfo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectionInfo]);

  const handleRefactor = async () => {
    if (!selectionInfo || !instruction.trim()) return;

    startRefactor(instruction, selectionInfo.code, selectionInfo.range, selectionInfo.filePath);
    
    try {
      // Collect all opened files for context
      const context: Record<string, string> = {};
      tabs.forEach((tab: any) => {
        const key = tab.filePath || tab.filename;
        context[key] = tab.content;
      });

      const proposals = await refactorService.runRefactor(
        instruction,
        selectionInfo.code,
        selectionInfo.filePath,
        context
      );

      setProposals(proposals);
      onClose();
    } catch (err) {
      console.error('Refactor failed:', err);
      setRefactoring(false);
    }
  };

  if (!selectionInfo) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      style={{ top: selectionInfo.top - 60, left: selectionInfo.left }}
      className="absolute z-[var(--z-neural)] flex items-center gap-2 p-1.5 bg-surface border border-primary/30 rounded-none shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)] backdrop-blur-xl min-w-[320px]"
    >
      <div className="flex items-center gap-2 pl-3">
        {isRefactoring ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : (
          <Brain className="w-4 h-4 text-primary" />
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleRefactor()}
        placeholder={isRefactoring ? "Neural Alignment in Progress..." : "Neural instruction (e.g. 'Extract to component')"}
        disabled={isRefactoring}
        className="flex-1 bg-transparent border-none text-[11px] text-on-surface outline-none placeholder:text-on-surface-variant/40 h-8"
      />

      <div className="flex items-center gap-1 pr-1">
        <button
          onClick={handleRefactor}
          disabled={isRefactoring || !instruction.trim()}
          className="p-1.5 hover:bg-primary/10 text-primary rounded-none transition-colors disabled:opacity-30"
        >
          <Wand2 className="w-4 h-4" />
        </button>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-on-surface/10 text-on-surface-variant/30 hover:text-on-surface rounded-none transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Decorative Gradient Bar */}
      <div className="absolute -bottom-[1px] left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </motion.div>
  );
};
