import { createWithEqualityFn } from 'zustand/traditional';
import { persist } from 'zustand/middleware';

export type Theme = 'aps-light' | 'neural-onyx' | 'aps-gold' | 'nebula-light';

interface SettingsState {
  theme: Theme;
  fontSize: number;
  fontFamily: string;
  minimap: boolean;
  wordWrap: 'on' | 'off';
  lineNumbers: 'on' | 'off';
  cursorStyle: 'block' | 'line' | 'underline';
  breadcrumbs: boolean;
  autoSave: boolean;
  telemetry: boolean;
  neuralCompletions: boolean;
  ollamaPath: string;
  ollamaModelDir: string;
  activeModel: string;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (font: string) => void;
  setMinimap: (enabled: boolean) => void;
  setWordWrap: (wrap: 'on' | 'off') => void;
  setLineNumbers: (numbers: 'on' | 'off') => void;
  setCursorStyle: (style: 'block' | 'line' | 'underline') => void;
  setBreadcrumbs: (enabled: boolean) => void;
  setAutoSave: (enabled: boolean) => void;
  setTelemetry: (enabled: boolean) => void;
  setNeuralCompletions: (enabled: boolean) => void;
  setOllamaPath: (path: string) => void;
  setOllamaModelDir: (dir: string) => void;
  setActiveModel: (model: string) => void;
}

export const useSettingsStore = createWithEqualityFn<SettingsState>()(
  persist(
    (set) => ({
      theme: 'aps-light',
      fontSize: 14,
      fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      minimap: true,
      wordWrap: 'on',
      lineNumbers: 'on',
      cursorStyle: 'line',
      breadcrumbs: true,
      autoSave: false,
      telemetry: true,
      neuralCompletions: true,
      ollamaPath: '',
      ollamaModelDir: '',
      activeModel: 'llama3',
      setTheme: (theme: Theme) => set({ theme }),
      setFontSize: (fontSize: number) => set({ fontSize }),
      setFontFamily: (fontFamily: string) => set({ fontFamily }),
      setMinimap: (minimap: boolean) => set({ minimap }),
      setWordWrap: (wordWrap: 'on' | 'off') => set({ wordWrap }),
      setLineNumbers: (lineNumbers: 'on' | 'off') => set({ lineNumbers }),
      setCursorStyle: (cursorStyle: 'block' | 'line' | 'underline') => set({ cursorStyle }),
      setBreadcrumbs: (breadcrumbs: boolean) => set({ breadcrumbs }),
      setAutoSave: (autoSave: boolean) => set({ autoSave }),
      setTelemetry: (telemetry: boolean) => set({ telemetry }),
      setNeuralCompletions: (neuralCompletions: boolean) => set({ neuralCompletions }),
      setOllamaPath: (ollamaPath: string) => set({ ollamaPath }),
      setOllamaModelDir: (ollamaModelDir: string) => set({ ollamaModelDir }),
      setActiveModel: (activeModel: string) => set({ activeModel }),
    }),
    {
      name: 'codeaps-settings-storage',
    }
  )
);
