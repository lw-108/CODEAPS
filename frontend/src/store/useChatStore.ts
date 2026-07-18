import { createWithEqualityFn } from 'zustand/traditional';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string; // ISO string for persistence
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  addMessage: (message: Message, persist?: boolean) => Promise<void>;
  updateMessageText: (id: string, text: string) => void;
  saveMessage: (message: Message) => Promise<void>;
  fetchHistory: (projectId?: number) => Promise<void>;
  clearHistory: () => void;
}

const API_BASE = 'http://127.0.0.1:8000/api/v1/ollama';

export const useChatStore = createWithEqualityFn(
  persist<ChatState>(
    (set, get) => ({
      messages: [
        {
          id: 'initial-user',
          text: "Hi",
          sender: 'user',
          timestamp: new Date().toISOString()
        },
        {
          id: 'initial-ai',
          text: "Hello! Neural Link synchronized. I am the CodeAps AI assistant, ready to analyze and optimize your code. How can I help you today?",
          sender: 'ai',
          timestamp: new Date().toISOString()
        }
      ],
      isLoading: false,

      fetchHistory: async (projectId?: number) => {
        set({ isLoading: true });
        try {
          const url = projectId ? `${API_BASE}/history?project_id=${projectId}` : `${API_BASE}/history`;
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            const history = data.map((m: any) => ({
              id: m.id.toString(),
              text: m.text,
              sender: m.sender,
              timestamp: m.timestamp
            }));
            
            // Always sync with database state to prevent stale localStorage persistence
            if (history.length > 0) {
              set({ messages: history });
            } else {
              set({
                messages: [
                  {
                    id: 'fallback-user',
                    text: "Hi",
                    sender: 'user',
                    timestamp: new Date().toISOString()
                  },
                  {
                    id: 'fallback-ai',
                    text: "Neural Link Synchronized. History is clean. How can I assist?",
                    sender: 'ai',
                    timestamp: new Date().toISOString()
                  }
                ]
              });
            }
          }
        } catch (error) {
          console.error("Neural Link History Error:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      addMessage: async (message: Message, skipPersist: boolean = false) => {
        set((state: ChatState) => ({ messages: [...state.messages, message] }));
        if (skipPersist) return;
        try {
          await fetch(`${API_BASE}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: message.text,
              sender: message.sender,
              project_id: null 
            })
          });
        } catch (error) {
          console.error("Failed to persist message to Neural Archive:", error);
        }
      },

      updateMessageText: (id: string, text: string) => {
        set((state: ChatState) => ({
          messages: state.messages.map((m: Message) => 
            m.id === id ? { ...m, text } : m
          )
        }));
      },

      saveMessage: async (message: Message) => {
        try {
          await fetch(`${API_BASE}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: message.text,
              sender: message.sender,
              project_id: null
            })
          });
        } catch (error) {
          console.error("Failed to persist completed message:", error);
        }
      },

      clearHistory: async (projectIdArg?: any) => {
        // DEFENSIVE: React events pass the event object as the first arg if called as onClick={clearHistory}
        const projectId = typeof projectIdArg === 'number' ? projectIdArg : undefined;
        
        try {
          const url = projectId ? `${API_BASE}/history?project_id=${projectId}` : `${API_BASE}/history`;
          const response = await fetch(url, { method: 'DELETE' });
          
          // Force wipe cache if delete was successful OR if we are doing a global clear
          if (response.ok || !projectId) {
            localStorage.removeItem('codeaps-chat-history');
          }
        } catch (error) {
          console.error("Failed to purge Neural Archive:", error);
        }
        
        set({ 
          messages: [
            { 
              id: 'reset-user', 
              text: "Hi", 
              sender: 'user', 
              timestamp: new Date().toISOString() 
            },
            { 
              id: 'reset-ai', 
              text: "Neural Link Reset. History purged. How can I assist you now?", 
              sender: 'ai', 
              timestamp: new Date().toISOString() 
            }
          ] 
        });
      },
    }),
    {
      name: 'codeaps-chat-history', // LocalStorage Key
    }
  )
);
