import React, { useState, useRef, useEffect } from 'react';
import { useAnalysisStore, MiniChatMessage } from '@/store/useAnalysisStore';
import { useEditorStore } from '@/store/useEditorStore';
import { useCodeAnalysis } from '@/hooks/useCodeAnalysis';
import { MessageSquare, ChevronDown, ChevronUp, Zap, AlertTriangle, Clock, Wand2, RefreshCcw, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MiniCodeChat = () => {
  const { fileResults, visibilitySettings, setPerfectCode } = useAnalysisStore();
  const { activeFile, tabs, updateTabContent } = useEditorStore();
  const { generatePerfectCode, isGeneratingSuggestion, lastPerfectCode, optimizationError, setOptimizationError } = useCodeAnalysis();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentResult = activeFile ? fileResults[activeFile] : null;
  const messages = currentResult?.miniChatMessages || [];

  // Priority Ranking: Warnings > Info
  const sortedMessages = [...messages].sort((a, b) => {
    if (a.type === b.type) return 0;
    return a.type === 'warning' ? -1 : 1;
  });

  // Smart Auto-scroll Logic
  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length, isExpanded, lastPerfectCode]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setIsAtBottom(scrollHeight - scrollTop <= clientHeight + 50);
  };

  const handleApplyFix = () => {
    if (activeFile && lastPerfectCode) {
      updateTabContent(activeFile, lastPerfectCode);
      setPerfectCode(null);
    }
  };

  if (!visibilitySettings.showMiniChat || messages.length === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-24 right-8 w-80 bg-background/95 backdrop-blur-xl rounded-none border border-outline-variant shadow-2xl z-[var(--z-neural)] overflow-hidden transition-all duration-500 ease-in-out",
      "border-l-[3px] border-l-primary flex flex-col",
      isExpanded ? "h-[500px]" : "h-12"
    )}>
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-on-surface/5 transition-colors group shrink-0"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-none bg-primary/10 text-primary">
            <MessageSquare size={14} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface/60 group-hover:text-on-surface transition-colors">
            AI Suggestions
          </span>
          <span className="px-1.5 py-0.5 rounded-none bg-on-surface/5 text-[9px] font-black text-on-surface/40">
            {messages.length}
          </span>
        </div>
        <div className="text-on-surface/20 group-hover:text-primary transition-colors">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
      </div>

      {/* Message List */}
      {isExpanded && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 p-4 space-y-3 overflow-y-auto premium-scroll border-t border-outline-variant bg-surface-low/50"
          >
            {sortedMessages.map((msg: MiniChatMessage, idx: number) => (
              <div 
                key={msg.hash || idx} 
                className={cn(
                  "group p-3 rounded-none border transition-all animate-in slide-in-from-right-4 duration-500",
                  msg.type === 'warning' ? "bg-amber-500/5 border-amber-500/10 hover:border-amber-500/20" : "bg-primary/5 border-primary/10 hover:border-primary/20"
                )}
              >
                <div className="flex items-start space-x-3">
                  <div className={cn(
                    "mt-0.5 p-1 rounded-none",
                    msg.type === 'warning' ? "text-amber-500" : "text-primary"
                  )}>
                    {msg.type === 'warning' ? <AlertTriangle size={12} /> : <Zap size={12} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className={cn(
                        "px-1.5 py-0.5 rounded-none text-[8px] font-black uppercase tracking-tighter",
                        msg.type === 'warning' ? "bg-amber-500/20 text-amber-500" : "bg-primary/20 text-primary"
                      )}>
                        Line {msg.line}
                      </div>
                      {msg.timestamp && (
                        <div className="flex items-center text-[8px] text-white/20 font-bold">
                          <Clock size={8} className="mr-1" />
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-on-surface/70 group-hover:text-on-surface transition-colors mb-2">
                      {msg.message}
                    </p>
                    
                    {msg.type === 'warning' && (
                      <div className="space-y-2">
                        <button 
                          onClick={() => {
                            setOptimizationError(null);
                            generatePerfectCode(msg.message);
                          }}
                          disabled={isGeneratingSuggestion}
                          className={cn(
                            "flex items-center space-x-1.5 px-2 py-1 rounded-none transition-all text-[9px] font-bold uppercase tracking-widest border",
                            isGeneratingSuggestion 
                              ? "bg-on-surface/5 text-on-surface/20 border-outline-variant cursor-not-allowed" 
                              : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/10"
                          )}
                        >
                          {isGeneratingSuggestion ? <RefreshCcw size={10} className="animate-spin" /> : <Wand2 size={10} />}
                          <span>{isGeneratingSuggestion ? 'Synthesizing...' : 'Fix Complexity'}</span>
                        </button>
                        
                        {optimizationError && !lastPerfectCode && (
                          <div className="text-[9px] text-red-400 font-bold flex items-center space-x-1 animate-pulse">
                            <AlertTriangle size={8} />
                            <span>{optimizationError}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Result Card (Overlay at bottom of list) */}
          {lastPerfectCode && (
            <div className="px-4 py-3 bg-primary/10 border-t border-primary/20 animate-in slide-in-from-bottom-full duration-300">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Sparkles size={12} className="text-primary animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Neural Proposal Ready</span>
                </div>
                <button 
                  onClick={() => setPerfectCode(null)}
                  className="p-1 hover:bg-primary/10 rounded-none text-primary/40 hover:text-primary transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={handleApplyFix}
                  className="flex-1 py-1.5 bg-primary text-on-primary text-[9px] font-black uppercase tracking-widest rounded-none shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
                >
                  Apply Neural Fix
                </button>
                <button 
                  onClick={() => setPerfectCode(null)}
                  className="px-3 py-1.5 bg-on-surface/5 text-on-surface/40 text-[9px] font-black uppercase tracking-widest rounded-none hover:text-on-surface transition-all"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
