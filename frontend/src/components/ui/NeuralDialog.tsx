import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, HelpCircle, FileText, Layers } from 'lucide-react';
import { useModalStore } from '../../store/useModalStore';
import { cn } from '../../lib/utils';

export const NeuralDialog: React.FC = () => {
  const { isOpen, options, submit, cancel } = useModalStore();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && options?.defaultValue !== undefined) {
      setInputValue(options.defaultValue);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, options]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submit(options?.type === 'prompt' ? inputValue : true);
    } else if (e.key === 'Escape') {
      cancel();
    }
  };

  if (!isOpen || !options) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={cancel}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            "relative w-full max-w-[400px] overflow-hidden shadow-2xl border",
            "bg-surface-high border-outline-variant",
            "flex flex-col"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-highest/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-none bg-primary/10 text-primary">
                {options.type === 'alert' && <AlertCircle size={18} />}
                {options.type === 'confirm' && <HelpCircle size={18} />}
                {options.type === 'prompt' && <FileText size={18} />}
                {options.type === 'select' && <Layers size={18} />}
              </div>
              <span className="text-[12px] font-black uppercase tracking-[0.2em] text-on-surface italic">
                {options.title}
              </span>
            </div>
            <button
              onClick={cancel}
              className="p-1 hover:bg-on-surface/10 rounded-none transition-colors text-on-surface-variant/60 hover:text-on-surface"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-4 bg-surface-high">
            <p className="text-[14px] text-on-surface/90 font-medium leading-relaxed tracking-tight">
              {options.message}
            </p>

            {options.type === 'select' && options.items && (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {options.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => submit(item.id)}
                    className="w-full text-left px-5 py-4 bg-surface border border-outline-variant hover:bg-primary/10 hover:border-primary/40 transition-all rounded-none group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold uppercase tracking-widest text-on-surface/80 group-hover:text-primary transition-colors">
                        {item.label}
                      </span>
                      <span className="text-[10px] font-mono text-on-surface/20 group-hover:text-primary transition-colors">
                        EXECUTE &gt;
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {options.type === 'prompt' && (
              <div className="relative group">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "w-full bg-surface-low border border-outline-variant",
                    "px-4 py-3 text-[14px] text-on-surface font-mono outline-none transition-all",
                    "focus:border-primary/50 focus:bg-surface-highest/20",
                    "placeholder:text-on-surface-variant/30",
                    "shadow-inner"
                  )}
                  placeholder="Enter identity..."
                  spellCheck={false}
                  autoComplete="off"
                />
                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary group-focus-within:w-full transition-all duration-300 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-surface-highest/50 border-t border-outline-variant flex items-center justify-end space-x-3">
            <button
              onClick={cancel}
              className="px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-on-surface/40 hover:text-on-surface hover:bg-on-surface/5 transition-all"
            >
              Discard
            </button>
            <button
              onClick={() => submit(options.type === 'prompt' ? inputValue : true)}
              className={cn(
                "px-8 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all",
                "bg-primary text-on-primary hover:brightness-110",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]"
              )}
              disabled={options.type === 'prompt' && !inputValue.trim()}
            >
              {options.type === 'prompt' ? 'Initialize' : options.type === 'confirm' ? 'Execute' : 'Acknowledged'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
