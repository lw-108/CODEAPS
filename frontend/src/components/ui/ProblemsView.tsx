import React, { useMemo } from 'react';
import { AlertCircle, AlertTriangle, Info, Brain, FileCode, ArrowRight, ExternalLink } from 'lucide-react';
import { useAnalysisStore, Problem } from '@/store/useAnalysisStore';
import { useEditorStore } from '@/store/useEditorStore';
import { useFileSystem } from '@/hooks/useFileSystem';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const ProblemsView: React.FC = () => {
  const { getAllProblems, fileResults, lspMarkers } = useAnalysisStore();
  const { openTab, setActiveFile } = useEditorStore();
  const { readFile } = useFileSystem();

  // Aggregate problems on every render
  const problems = useMemo(() => getAllProblems(), [getAllProblems, fileResults, lspMarkers]);

  const handleJumpToSource = async (problem: Problem) => {
    try {
      const content = await readFile(problem.filePath);
      // We need to determine the language (simplified here, ideally use languageMap)
      const ext = problem.filename.split('.').pop() || 'txt';
      openTab(problem.filename, content, ext, problem.filePath);
      
      // Navigate to line logic would ideally use monaco.editor.revealLine
      // For now, setting active file is the first step
      setActiveFile(problem.filename);
      
      // Trigger a global jump-to-line event that Editor.tsx can listen to
      window.dispatchEvent(new CustomEvent('editor-jump-to-line', {
        detail: { line: problem.line, column: problem.column, filename: problem.filename }
      }));
    } catch (err) {
      console.error('Failed to jump to source:', err);
    }
  };

  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-30 py-20">
        <div className="w-12 h-12 rounded-none bg-primary/10 flex items-center justify-center border border-primary/20">
          <FileCode className="text-primary w-6 h-6" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] font-editorial">Analysis Hub Clear • No Anomalies Detected</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface-low overflow-hidden">
      {/* Table Header */}
      <div className="flex items-center px-4 py-2 border-b border-white/5 bg-surface text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">
        <div className="w-8 shrink-0">Typ</div>
        <div className="flex-1 px-4">Description</div>
        <div className="w-48 px-4 text-right">Resource</div>
        <div className="w-24 px-4 text-right">Location</div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-y-auto premium-scroll pb-10">
        <AnimatePresence>
          {problems.map((problem) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={problem.id}
              onClick={() => handleJumpToSource(problem)}
              className="group flex items-center px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.04] cursor-pointer transition-all"
            >
              {/* Severity Icon */}
              <div className="w-8 shrink-0 flex items-center justify-center">
                {problem.severity === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]" />
                ) : problem.severity === 'warning' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                )}
              </div>

              {/* Description & Source Tag */}
              <div className="flex-1 px-4 overflow-hidden">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-on-surface font-medium truncate shrink min-w-0" title={problem.message}>
                    {problem.message}
                  </span>
                  {problem.source === 'neural' && (
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-none text-[8px] font-black text-orange-500 uppercase tracking-widest">
                      <Brain className="w-2.5 h-2.5" />
                      Neural Suggestion
                    </div>
                  )}
                </div>
              </div>

              {/* File Info */}
              <div className="w-48 px-4 text-right">
                <span className="text-[10px] text-white/40 font-mono truncate block" title={problem.filePath}>
                  {problem.filename}
                </span>
              </div>

              {/* Location */}
              <div className="w-24 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5 text-[10px] font-mono text-white/20 group-hover:text-primary transition-colors">
                  <span>L{problem.line}</span>
                  <span className="opacity-40">:</span>
                  <span>C{problem.column}</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer / Summary Strip */}
      <div className="h-8 bg-surface border-t border-white/5 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest">
          <div className="flex items-center gap-2 text-red-500">
            <span className="w-1.5 h-1.5 rounded-none bg-red-500" />
            {problems.filter(p => p.severity === 'error').length} Errors
          </div>
          <div className="flex items-center gap-2 text-amber-500">
            <span className="w-1.5 h-1.5 rounded-none bg-amber-500" />
            {problems.filter(p => p.severity === 'warning').length} Warnings
          </div>
          <div className="flex items-center gap-2 text-blue-400">
            <span className="w-1.5 h-1.5 rounded-none bg-blue-400" />
            {problems.filter(p => p.severity === 'info').length} Info
          </div>
        </div>
        
        <div className="text-[8px] font-mono text-white/10 uppercase tracking-[0.2em]">
          Diagnostics Orchestrator v2.0 // Active Workspace Survey Complete
        </div>
      </div>
    </div>
  );
};
