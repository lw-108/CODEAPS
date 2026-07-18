import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { editor } from 'monaco-editor';
import { X, GitCommit, FileText, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/tauri';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useGitStore } from '@/store/useGitStore';
import { cn } from '@/lib/utils';
import { getLanguageFromExtension } from '@/lib/languageMap';
import { useSettingsStore } from '@/store/useSettingsStore';

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
}

export const DiffModal: React.FC<DiffModalProps> = ({ isOpen, onClose, filePath }) => {
  const diffEditorRef = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<any>(null);
  const { workspacePath } = useWorkspaceStore();
  const { theme: currentTheme } = useSettingsStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && diffEditorRef.current && !editorInstance.current) {
      editorInstance.current = monaco.editor.createDiffEditor(diffEditorRef.current, {
        theme: currentTheme === 'nebula-light' ? 'vs' : 'neural-onyx',
        automaticLayout: true,
        readOnly: true,
        renderSideBySide: true,
        originalEditable: false,
        scrollbar: {
          vertical: 'hidden',
          horizontal: 'hidden'
        },
        minimap: { enabled: false }
      });
    }

    if (isOpen && filePath) {
      loadDiff();
    }

    return () => {
      if (editorInstance.current) {
        editorInstance.current.dispose();
        editorInstance.current = null;
      }
    };
  }, [isOpen, filePath]);

  const loadDiff = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get original content from Git HEAD
      const original = await invoke('git_get_file_content', { 
        path: workspacePath, 
        file: filePath,
        revision: "HEAD"
      }) as string;

      // 2. Get current content from disk
      const current = await invoke('read_file_content', { 
        path: `${workspacePath}/${filePath}` 
      }) as string;

      if (editorInstance.current) {
        const lang = getLanguageFromExtension(filePath);
        const originalModel = monaco.editor.createModel(original, lang.id);
        const modifiedModel = monaco.editor.createModel(current, lang.id);

        editorInstance.current.setModel({
          original: originalModel,
          modified: modifiedModel
        });
      }
    } catch (err: any) {
      console.error('Failed to load diff:', err);
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-8"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="w-full h-full bg-surface border border-outline-variant rounded-none overflow-hidden flex flex-col shadow-2xl shadow-primary/10"
          >
            {/* Header */}
            <div className="h-14 bg-surface-low border-b border-outline-variant flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-none bg-orange-500/10 flex items-center justify-center">
                  <GitCommit className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Compare with HEAD</h3>
                  <p className="text-[10px] text-white/40 font-mono">{filePath}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-none border border-white/5">
                  <span className="text-[10px] uppercase tracking-widest text-white/40">Reference:</span>
                  <span className="text-[10px] font-mono text-orange-500">HEAD</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-none transition-colors group"
                >
                  <X className="w-4 h-4 text-white/40 group-hover:text-white" />
                </button>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative bg-background">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-1 bg-surface-highest rounded-none overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        animate={{ x: [-100, 100] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      />
                    </div>
                    <span className="text-xs text-on-surface-variant animate-pulse">Computing Diff...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black p-12 text-center">
                  <div className="max-w-md">
                    <p className="text-red-500 text-sm mb-4">Neural Analysis Error</p>
                    <p className="text-white/40 text-xs font-mono bg-white/5 p-4 rounded-none">
                      {error}
                    </p>
                    <button 
                      onClick={onClose}
                      className="mt-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-none transition-colors"
                    >
                      Close Comparison
                    </button>
                  </div>
                </div>
              )}

              <div ref={diffEditorRef} className="w-full h-full" />
            </div>

            {/* Footer */}
            <div className="h-12 bg-surface-low border-t border-outline-variant flex items-center justify-between px-6">
              <div className="flex items-center gap-4 text-[10px] text-on-surface-variant uppercase tracking-widest">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="w-2 h-2 rounded-none bg-red-500/50" />
                  Original
                </div>
                <ArrowRight className="w-3 h-3" />
                <div className="flex items-center gap-2 font-semibold text-on-surface">
                  <span className="w-2 h-2 rounded-none bg-green-500/50" />
                  Modified
                </div>
              </div>

              <div className="text-[10px] font-mono text-on-surface-variant/20">
                Neural Diff Engine v1.0 // CodeAps Executive Suite
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
