import React, { useState, useRef, useEffect } from 'react';
import { useChatStore, Message } from '@/store/useChatStore';
import { Send, MessageSquare, Check, Copy, Zap, Trash2, Paperclip, X, File } from 'lucide-react';
import { useAI } from '@/hooks/useAI';
import { useEditorStore } from '@/store/useEditorStore';
import { cn } from '@/lib/utils';

interface ChatFile {
  filename: string;
  data: string;
  type: string;
}

export const ChatPanel = () => {
  const { messages, addMessage, clearHistory, fetchHistory, isLoading: isHistoryLoading } = useChatStore();
  const [input, setInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<ChatFile[]>([]);
  const { sendMessage, analyzeCode, isGenerating, aiStatus } = useAI();
  const { activeFile, updateTabContent, getActiveTab } = useEditorStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleAnalyze = async () => {
    const tab = getActiveTab();
    if (tab && !isGenerating) {
      await analyzeCode(tab.content);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: ChatFile[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        
        const promise = new Promise<void>((resolve) => {
            reader.onload = (event) => {
                newFiles.push({
                    filename: file.name,
                    data: event.target?.result as string,
                    type: file.type
                });
                resolve();
            };
        });
        reader.readAsDataURL(file);
        await promise;
    }
    setSelectedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isGenerating) return;
    
    const userMsg: Message = { 
        id: Date.now().toString(), 
        text: (input || '').trim() + (selectedFiles.length > 0 ? ` (Attached ${selectedFiles.length} files)` : ""), 
        sender: 'user', 
        timestamp: new Date().toISOString()
    };
    addMessage(userMsg);
    
    const currentInput = input;
    const currentFiles = [...selectedFiles];
    
    setInput('');
    setSelectedFiles([]);

    try {
        const activeTab = getActiveTab();
        const context = activeTab ? { content: activeTab.content, filename: activeTab.filename } : undefined;
        
        const aiMsgId = (Date.now() + 1).toString();
        const aiPlaceholder: Message = {
            id: aiMsgId,
            text: '',
            sender: 'ai',
            timestamp: new Date().toISOString()
        };
        
        const { updateMessageText, saveMessage } = useChatStore.getState();
        await addMessage(aiPlaceholder, true);

        let accumulatedText = "";
        await sendMessage(currentInput, context, currentFiles, (chunk) => {
            accumulatedText += chunk;
            updateMessageText(aiMsgId, accumulatedText);
        });

        if (accumulatedText) {
          await saveMessage({ ...aiPlaceholder, text: accumulatedText });
        }
    } catch (err) {
        console.error("AI Error:", err);
    }
  };

  const applyCode = (code: string) => {
    if (activeFile) {
      updateTabContent(activeFile, code);
    }
  };

  const renderMessageContent = (text: string = '') => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const lines = part.split('\n');
        const language = lines[0].replace('```', '').trim() || 'code';
        const code = lines.slice(1, -1).join('\n');
        
        return (
          <div key={index} className="my-4 border border-outline-variant rounded-none overflow-hidden bg-surface-low group relative">
            <div className="flex items-center justify-between px-4 py-2 bg-surface-high border-b border-outline-variant">
              <span className="text-[9px] font-block uppercase tracking-widest text-on-surface/40">{language}</span>
              <button 
                onClick={() => applyCode(code)}
                className="flex items-center space-x-2 px-3 py-1 bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all rounded-none text-[9px] font-block uppercase tracking-tighter"
              >
                <Zap size={10} />
                <span>Apply</span>
              </button>
            </div>
            <pre className="p-4 text-[11px] font-mono leading-relaxed overflow-x-auto text-on-surface/80">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      return <p key={index} className="whitespace-pre-wrap text-on-surface/70">{part}</p>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-outline-variant overflow-hidden relative">
      {/* Premium Neural Header */}
      <div className="h-14 px-6 flex items-center justify-between bg-surface border-b border-outline-variant shrink-0">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "w-2 h-2 rounded-none",
            aiStatus === 'online' ? "bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" : "bg-on-surface-variant/20"
          )} />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface">Neural Link</span>
        </div>
        <div className="flex items-center space-x-2">
            <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">{isGenerating ? 'Processing...' : 'Ready'}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto premium-scroll p-6 space-y-6" ref={scrollRef}>
        {messages && messages.map((msg: Message) => (
          <div key={msg.id} className={cn(
              "flex flex-col space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300",
              msg.sender === 'user' ? "items-end" : "items-start"
          )}>
            <div className={cn(
                "max-w-[95%] px-5 py-4 rounded-none text-[12px] leading-relaxed shadow-2xl relative",
                msg.sender === 'user' 
                    ? "bg-surface-high text-on-surface border border-outline-variant" 
                    : "bg-background text-on-surface border border-primary/20"
            )}>
                {renderMessageContent(msg.text)}
            </div>
          </div>
        ))}
        {isGenerating && (
            <div className="flex items-center space-x-2 px-4 py-2 bg-surface-high rounded-none w-fit animate-pulse">
                <div className="w-1 h-1 bg-primary" />
                <div className="w-1 h-1 bg-primary" />
                <div className="w-1 h-1 bg-primary" />
            </div>
        )}
      </div>

      {/* Input Unit */}
      <div className="p-4 bg-surface-low border-t border-outline-variant">
        <div className="flex flex-col bg-background border border-outline-variant p-1 rounded-none shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2 border-b border-outline-variant bg-on-surface/[0.01]">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-1 text-primary hover:brightness-125 transition-colors cursor-pointer"
              >
                <Paperclip size={12} />
              </button>
              <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange}
              />
              <button 
                onClick={() => clearHistory()} 
                className="p-1 text-primary hover:text-red-500 transition-all cursor-pointer group"
                title="Purge Neural Archive"
              >
                <Trash2 size={12} className="group-hover:rotate-12" />
              </button>
              <button disabled={!activeFile} onClick={handleAnalyze} className="p-1 text-primary hover:brightness-125 transition-colors disabled:opacity-30 cursor-pointer"><Zap size={12} /></button>
            </div>
            <button 
              onClick={handleSend}
              disabled={isGenerating || (!input.trim() && selectedFiles.length === 0)}
              className="p-1.5 text-primary hover:brightness-125 transition-all cursor-pointer"
            >
              <Send size={16} />
            </button>
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-white/5 bg-white/[0.02]">
                {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-white/[0.05] border border-white/10 px-2 py-1">
                        <File size={10} className="text-secondary" />
                        <span className="text-[10px] text-white/40 max-w-[80px] truncate">{file.filename}</span>
                        <button onClick={() => removeFile(idx)} className="text-white/10 hover:text-primary"><X size={10} /></button>
                    </div>
                ))}
            </div>
          )}
          
          <textarea
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Search code, ask questions..."
            className="w-full bg-transparent px-4 py-4 text-[12px] text-on-surface placeholder:text-on-surface/30 focus:outline-none resize-none min-h-[80px] font-functional"
          />
        </div>
      </div>
    </div>
  );
};
