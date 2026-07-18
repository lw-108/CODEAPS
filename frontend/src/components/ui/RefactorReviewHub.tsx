import React from 'react';
import { Check, X, ArrowRight, FileText, Brain, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRefactorStore } from '@/store/useRefactorStore';
import { useEditorStore } from '@/store/useEditorStore';
import { useFileSystem } from '@/hooks/useFileSystem';
import { cn } from '@/lib/utils';

export const RefactorReviewHub: React.FC = () => {
  const { proposals, reviewVisible, activeInstruction, applyAll, discardAll, setReviewVisible } = useRefactorStore();
  const { updateTabContent, markSaved } = useEditorStore();
  const { writeFile } = useFileSystem();

  const handleApply = async () => {
    try {
      for (const proposal of proposals) {
        // Atomic apply to disk and store
        await writeFile(proposal.filePath, proposal.newContent);
        updateTabContent(proposal.filename, proposal.newContent);
        markSaved(proposal.filename);
      }
      applyAll();
    } catch (err) {
      console.error('Failed to apply refactor:', err);
    }
  };

  if (!reviewVisible || proposals.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[var(--z-neural)] flex items-center justify-center bg-background/90 backdrop-blur-xl p-12"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="w-full max-w-5xl h-[80vh] bg-surface border border-outline-variant rounded-none overflow-hidden flex flex-col shadow-[0_0_100px_rgba(var(--primary-rgb),0.1)]"
        >
          {/* Header */}
          <div className="h-16 bg-surface-low border-b border-outline-variant flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-none bg-primary/10 flex items-center justify-center border border-primary/20">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-on-surface">Neural Refactor Review</h3>
                <p className="text-[10px] text-on-surface-variant/40 font-mono italic">Instruction: "{activeInstruction}"</p>
              </div>
            </div>

            <button onClick={discardAll} className="p-2 hover:bg-on-surface/10 rounded-none transition-colors text-on-surface-variant/40 border border-transparent hover:border-outline-variant">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Proposal List */}
          <div className="flex-1 overflow-y-auto premium-scroll p-8 space-y-8">
            {proposals.map((proposal: any, idx: number) => (
              <div key={idx} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-[12px] font-bold text-on-surface font-mono tracking-tight">{proposal.filePath}</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-none font-black uppercase tracking-widest border border-primary/20">
                      Modified
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 bg-background border border-outline-variant rounded-none p-4 overflow-hidden relative group">
                  <div className="text-[11px] font-mono text-on-surface/40 leading-relaxed max-h-[300px] overflow-y-auto no-scrollbar whitespace-pre-wrap">
                    {proposal.newContent.substring(0, 1000)}
                    {proposal.newContent.length > 1000 && '...'}
                  </div>
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />
                </div>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="h-20 bg-surface-low border-t border-outline-variant flex items-center justify-center gap-4 px-8 shrink-0">
            <button
              onClick={discardAll}
              className="flex-1 max-w-[200px] py-3 border border-outline-variant hover:bg-on-surface/5 text-on-surface-variant text-[10px] font-black uppercase tracking-[0.2em] rounded-none transition-all"
            >
              Discard Changes
            </button>
            <button
              onClick={handleApply}
              className="flex-1 max-w-[320px] py-3 bg-primary text-on-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-none transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]"
            >
              Apply All Modifications
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
