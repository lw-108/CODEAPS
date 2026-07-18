import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Diagnostics Scoring (StatsPanel) ──
export interface CodeMetrics {
  quality: number;
  security: number;
  performance: number;
  maintainability: number;
  reliability: number;
}

export interface AnalysisHistoryEntry {
  timestamp: string;
  score: number;
}

export interface MemoryAllocation {
  line: number;
  type: 'heap' | 'stack';
  size: number;
}

export interface RadarMetrics {
  scalability: number;
  maintainability: number;
  memoryEfficiency: number;
  cpuUsage: number;
  ioEfficiency: number;
  concurrency: number;
}

export interface SystemBars {
  heap: number;
  stack: number;
  cpu: number;
  io: number;
}

export interface MiniChatMessage {
  line: number;
  message: string;
  type: 'info' | 'warning';
  timestamp?: string;
  hash?: string;
}

export interface ComplexityData {
  time: string;
  space: string;
  explanation: string;
  predictedRuntimeMs?: number;
  confidence?: number;
}

export interface FileAnalysisResult {
  radarMetrics: RadarMetrics;
  systemBars: SystemBars;
  miniChatMessages: MiniChatMessage[];
  complexity: ComplexityData;
  memoryMap: MemoryAllocation[];
  lastAnalysis: string;
  source?: 'ai' | 'heuristic';
}

export interface VisibilitySettings {
  showRadar: boolean;
  showBars: boolean;
  showMiniChat: boolean;
}

export interface Problem {
  id: string;
  source: 'compiler' | 'neural';
  severity: 'error' | 'warning' | 'info';
  message: string;
  filename: string;
  filePath: string;
  line: number;
  column: number;
  timestamp: string;
}

export interface AnalysisState {
  fileResults: Record<string, FileAnalysisResult>;
  queuedSuggestions: Record<string, MiniChatMessage[]>;
  lspMarkers: Record<string, any[]>; // Simplified any[] for JSON serialization
  isAnalyzing: boolean;
  visibilitySettings: VisibilitySettings;

  // ── Diagnostics Scoring State ──
  metrics: CodeMetrics;
  findings: string[];
  lastAnalysis: string | null;
  analysisHistory: AnalysisHistoryEntry[];
  metricsSource: 'ai' | 'heuristic' | null;

  // ── Neural Perfector State ──
  lastPerfectCode: string | null;
  isGeneratingSuggestion: boolean;
  optimizationError: string | null;
  
  // Actions (Per-file analysis)
  setFileResults: (filePath: string, result: FileAnalysisResult) => void;
  queueSuggestions: (filePath: string, suggestions: MiniChatMessage[]) => void;
  setLspMarkers: (filePath: string, markers: any[]) => void;
  flushSuggestions: (filePath: string) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setVisibility: (settings: Partial<VisibilitySettings>) => void;
  resetAll: () => void;

  // Actions (Diagnostics scoring)
  setMetrics: (metrics: CodeMetrics, source?: 'ai' | 'heuristic') => void;
  setFindings: (findings: string[]) => void;
  recordAnalysis: (score: number) => void;
  setPerfectCode: (code: string | null) => void;
  setGeneratingSuggestion: (isGenerating: boolean) => void;
  setOptimizationError: (error: string | null) => void;
  resetFileMetrics: () => void;
  removeFileResults: (filePath: string) => void;
  removePathResults: (path: string, isDir: boolean) => void;
  getAllProblems: () => Problem[];
}

const defaultRadar: RadarMetrics = {
  scalability: 0,
  maintainability: 0,
  memoryEfficiency: 0,
  cpuUsage: 0,
  ioEfficiency: 0,
  concurrency: 0,
};

const defaultBars: SystemBars = {
  heap: 0,
  stack: 0,
  cpu: 0,
  io: 0,
};

const defaultComplexity: ComplexityData = { 
  time: 'O(1)', 
  space: 'O(1)', 
  explanation: 'No analysis yet.' 
};

export const defaultMetrics: CodeMetrics = {
  quality: 0,
  security: 0,
  performance: 0,
  maintainability: 0,
  reliability: 0,
};

/**
 * useAnalysisStore: Core state orchestrator for per-file reactive diagnostics.
 */
export const useAnalysisStore = create(
  persist<AnalysisState>(
    (set, get) => ({
      fileResults: {},
      queuedSuggestions: {},
      lspMarkers: {},
      isAnalyzing: false,
      visibilitySettings: {
        showRadar: true,
        showBars: true,
        showMiniChat: true
      },

      // Diagnostics scoring defaults
      metrics: { ...defaultMetrics },
      findings: [],
      lastAnalysis: null,
      analysisHistory: [],
      metricsSource: null,
      
      // Neural Perfector defaults
      lastPerfectCode: null,
      isGeneratingSuggestion: false,
      optimizationError: null,
      
      setFileResults: (filePath: string, result: FileAnalysisResult) => set((state: AnalysisState) => {
        // Validation Layer: Ensure all required arrays are present
        const validatedResult = {
          ...result,
          miniChatMessages: Array.isArray(result.miniChatMessages) ? result.miniChatMessages : [],
          memoryMap: Array.isArray(result.memoryMap) ? result.memoryMap : [],
          lastAnalysis: new Date().toISOString()
        };

        return {
          fileResults: {
            ...state.fileResults,
            [filePath]: validatedResult
          }
        };
      }),

      setLspMarkers: (filePath: string, markers: any[]) => set((state: AnalysisState) => ({
        lspMarkers: {
          ...state.lspMarkers,
          [filePath]: markers
        }
      })),

      queueSuggestions: (filePath: string, suggestions: MiniChatMessage[]) => set((state: AnalysisState) => {
        const existing = state.queuedSuggestions[filePath] || [];
        // Deduplication & Hash-based check
        const newSuggestions = suggestions.filter(s => {
          const hash = `${s.line}-${s.message}`;
          return !existing.some(e => `${e.line}-${e.message}` === hash);
        }).map(s => ({ ...s, timestamp: new Date().toISOString() }));

        const combined = [...existing, ...newSuggestions].slice(-100); // Max 100 queued

        return {
          queuedSuggestions: {
            ...state.queuedSuggestions,
            [filePath]: combined
          }
        };
      }),

      flushSuggestions: (filePath: string) => set((state: AnalysisState) => {
        const queued = state.queuedSuggestions[filePath] || [];
        if (queued.length === 0) return state;

        const currentResult = state.fileResults[filePath] || {
          radarMetrics: defaultRadar,
          systemBars: defaultBars,
          miniChatMessages: [],
          complexity: defaultComplexity,
          memoryMap: [],
          lastAnalysis: new Date().toISOString()
        };

        // Atomic move from queued to active result
        const existingMessages = Array.isArray(currentResult.miniChatMessages) ? currentResult.miniChatMessages : [];
        
        return {
          fileResults: {
            ...state.fileResults,
            [filePath]: {
              ...currentResult,
              miniChatMessages: [...existingMessages, ...queued].slice(-50) // Max 50 active
            }
          },
          queuedSuggestions: {
            ...state.queuedSuggestions,
            [filePath]: []
          }
        };
      }),

      setAnalyzing: (isAnalyzing: boolean) => set({ isAnalyzing }),

      setVisibility: (settings: Partial<VisibilitySettings>) => set((state: AnalysisState) => ({
        visibilitySettings: { ...state.visibilitySettings, ...settings }
      })),

      resetAll: () => set({
        fileResults: {},
        queuedSuggestions: {},
        lspMarkers: {},
        isAnalyzing: false,
        metrics: { ...defaultMetrics },
        findings: [],
        lastAnalysis: null,
        analysisHistory: [],
      }),

      // ── Diagnostics Scoring Actions ──
      setMetrics: (metrics: CodeMetrics, source?: 'ai' | 'heuristic') => set({
        metrics,
        metricsSource: source || 'heuristic',
        lastAnalysis: new Date().toISOString(),
      }),

      setFindings: (findings: string[]) => set({ findings }),

      recordAnalysis: (score: number) => set((state: AnalysisState) => {
        const entry: AnalysisHistoryEntry = {
          timestamp: new Date().toISOString(),
          score,
        };
        return {
          analysisHistory: [...state.analysisHistory.slice(-49), entry],
        };
      }),

      setPerfectCode: (code: string | null) => set({ lastPerfectCode: code, optimizationError: null }),
      setGeneratingSuggestion: (isGenerating: boolean) => set({ isGeneratingSuggestion: isGenerating }),
      setOptimizationError: (error: string | null) => set({ optimizationError: error, isGeneratingSuggestion: false }),
      
      resetFileMetrics: () => set({
        metrics: { ...defaultMetrics },
        findings: [],
        lastAnalysis: null,
        lastPerfectCode: null
      }),

      removeFileResults: (filePath: string) => set((state: AnalysisState) => {
        const newFileResults = { ...state.fileResults };
        const newQueued = { ...state.queuedSuggestions };
        const newLsp = { ...state.lspMarkers };
        
        delete newFileResults[filePath];
        delete newQueued[filePath];
        delete newLsp[filePath];
        
        return {
          fileResults: newFileResults,
          queuedSuggestions: newQueued,
          lspMarkers: newLsp
        };
      }),

      removePathResults: (targetPath: string, isDir: boolean) => set((state: AnalysisState) => {
        const newFileResults = { ...state.fileResults };
        const newQueued = { ...state.queuedSuggestions };
        const newLsp = { ...state.lspMarkers };
        
        const toRemove: string[] = [];
        const normalizedTarget = targetPath.replace(/\\/g, '/');

        // Check fileResults keys
        const targetBasename = targetPath.split(/[\\/]/).pop() || targetPath;

        Object.keys(newFileResults).forEach(key => {
          const normalizedKey = key.replace(/\\/g, '/');
          if (isDir) {
            if (normalizedKey.startsWith(normalizedTarget)) toRemove.push(key);
          } else {
            // Match absolute path OR legacy filename key
            if (normalizedKey === normalizedTarget || normalizedKey === targetBasename) toRemove.push(key);
          }
        });

        // Also check LSP markers (often keyed by path or filename)
        Object.keys(newLsp).forEach(key => {
          const normalizedKey = key.replace(/\\/g, '/');
          if (isDir) {
            if (normalizedKey.startsWith(normalizedTarget)) toRemove.push(key);
          } else {
            if (normalizedKey === normalizedTarget || normalizedKey === targetBasename) toRemove.push(key);
          }
        });

        toRemove.forEach(path => {
          delete newFileResults[path];
          delete newQueued[path];
          delete newLsp[path];
        });
        
        return {
          fileResults: newFileResults,
          queuedSuggestions: newQueued,
          lspMarkers: newLsp
        };
      }),

      getAllProblems: () => {
        const state = get();
        const allProblems: Problem[] = [];

        // 1. Process LSP Markers
        Object.entries(state.lspMarkers).forEach(([filePath, markers]) => {
          markers.forEach((m: any, idx) => {
            const filename = filePath.split(/[\\/]/).pop() || filePath;
            allProblems.push({
              id: `lsp-${filePath}-${idx}`,
              source: 'compiler',
              severity: m.severity === 8 ? 'error' : (m.severity === 4 ? 'warning' : 'info'),
              message: m.message,
              filename,
              filePath: m.resource?.fsPath || m.resource?.path || filePath,
              line: m.startLineNumber,
              column: m.startColumn,
              timestamp: new Date().toISOString()
            });
          });
        });

        // 2. Process AI Suggestions
        Object.entries(state.fileResults).forEach(([filePath, result]) => {
          if (result.miniChatMessages) {
            const filename = filePath.split(/[\\/]/).pop() || filePath;
            result.miniChatMessages.forEach((msg, idx) => {
              allProblems.push({
                id: `ai-${filePath}-${idx}`,
                source: 'neural',
                severity: msg.type === 'warning' ? 'warning' : 'info',
                message: msg.message,
                filename,
                filePath,
                line: msg.line,
                column: 1,
                timestamp: msg.timestamp || new Date().toISOString()
              });
            });
          }
        });

        return allProblems.sort((a, b) => {
          const sevMap = { error: 0, warning: 1, info: 2 };
          return sevMap[a.severity] - sevMap[b.severity] || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
      },
    }),
    {
      name: 'codeaps-analysis-storage',
      onRehydrateStorage: () => (state: AnalysisState | undefined) => {
        if (!state) return;
        // 24h expiration policy enforcement
        const now = new Date().getTime();
        const expirationMs = 24 * 60 * 60 * 1000;
        
        const nextResults = { ...state.fileResults };
        let changed = false;

        Object.keys(nextResults).forEach(key => {
          const last = new Date(nextResults[key].lastAnalysis).getTime();
          if (now - last > expirationMs) {
            delete nextResults[key];
            changed = true;
          }
        });

        if (changed) {
          state.fileResults = nextResults;
        }
      }
    }
  )
);
