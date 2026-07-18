import { useState, useCallback, useEffect } from 'react';
import { ollamaService } from '@/services/OllamaService';
import { useAnalysisStore, CodeMetrics } from '@/store/useAnalysisStore';
import { useRequirementStore, Requirement } from '@/store/useRequirementStore';
import { useChatStore } from '@/store/useChatStore';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const useAI = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState<'online' | 'offline'>('offline');
  const { setMetrics, setFindings, recordAnalysis, setAnalyzing } = useAnalysisStore();
  const { addMessage, updateMessageText, saveMessage, messages: chatHistory } = useChatStore();

  const checkStatus = useCallback(async () => {
    try {
        const data = await ollamaService.checkStatus();
        setAiStatus(data.status === 'running' ? 'online' : 'offline');
    } catch (err) {
        setAiStatus('offline');
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const sendMessage = useCallback(async (text: string, context?: any, files?: any[], onChunk?: (chunk: string) => void) => {
    if (!text.trim() && (!files || files.length === 0)) return;

    const { requirements } = useRequirementStore.getState();
    const activeRequirements = (requirements as Requirement[])
      .filter((r: Requirement) => r.status !== 'verified')
      .map((r: Requirement) => `- [${r.priority.toUpperCase()}] ${r.requirement_text}`)
      .join('\n');

    setIsGenerating(true);

    try {
      let systemPrompt = `You are the CodeAps AI Assistant. Provide expert coding advice.
      ${activeRequirements ? `\nActive Project Requirements:\n${activeRequirements}` : ''}`;
      
      if (context) {
        const isObject = typeof context !== 'string';
        const filename = isObject ? context.filename : 'Untitled';
        const content = isObject ? context.content : context;
        
        systemPrompt = `You are the CodeAps AI Assistant, an elite pair-programmer.
           Active File: ${filename || 'Untitled'}
           Code Context:
           \`\`\`
           ${content}
           \`\`\`
           Stay aligned with these targets:
           ${activeRequirements || 'N/A'}`;
      }

      // Convert ChatStore messages to Ollama format
      const ollamaMessages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
      ];

      const data = await ollamaService.chat(
        ollamaMessages,
        {
          model: "deepseek-coder:1.3b",
          files: files
        },
        onChunk
      );
      
      return data.response;

    } catch (err) {
      console.error(err);
      return "Error: Neural Link unavailable.";
    } finally {
      setIsGenerating(false);
    }
  }, [chatHistory]);

  const analyzeCode = useCallback(async (content: string) => {
    setIsGenerating(true);
    setAnalyzing(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (!response.ok) throw new Error("Analysis failed");
      const data = await response.json();
      
      const newMetrics: CodeMetrics = {
          quality: data.scores.logic || 0,
          performance: data.scores.style || 0,
          security: data.scores.style || 0,
          maintainability: data.scores.coverage || 0,
          reliability: data.scores.logic || 0
      };
      setMetrics(newMetrics);
      setFindings([...data.feedback.logic, ...data.feedback.style.map((s: any) => s.message)]);
      recordAnalysis(newMetrics.quality);

      return data;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setIsGenerating(false);
      setAnalyzing(false);
    }
  }, [setMetrics, setFindings, recordAnalysis, setAnalyzing]);

  return { isGenerating, aiStatus, sendMessage, analyzeCode };
};
