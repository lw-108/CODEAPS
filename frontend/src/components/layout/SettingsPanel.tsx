import React, { useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Palette, Type, Layout, Eye, Minus, Plus, Check, Zap, Cpu, Folder, FileSearch, Download, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { invoke } from '@tauri-apps/api/tauri';
import { ollamaService } from '@/services/OllamaService';

// Decoupled Sub-components to prevent re-mounting on every state update
const Section = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center space-x-3 mb-6 border-b border-outline-variant pb-4">
        <div className="text-primary">{icon}</div>
        <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-on-surface font-editorial">{title}</h2>
      </div>
      <div className="space-y-6 px-4">
        {children}
      </div>
    </div>
);

const SettingRow = ({ label, description, children }: { label: string, description?: string, children: React.ReactNode }) => (
    <div className="flex flex-col space-y-2 max-w-2xl">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-on-surface tracking-tight">{label}</span>
        <div className="flex items-center">
            {children}
        </div>
      </div>
      {description && <p className="text-[10px] text-on-surface-variant/60 leading-relaxed max-w-md">{description}</p>}
    </div>
);

import { motion } from 'framer-motion';

const Toggle = ({ active, onClick }: { active: boolean, onClick: () => void }) => (
    <button 
        onClick={onClick}
        className="relative flex items-center group cursor-pointer"
    >
        <div className={cn(
            "w-12 h-6 rounded-none transition-all duration-500 border-2",
            active ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]" : "bg-primary/[0.05] border-primary/50"
        )} />
        <motion.div 
            animate={{ x: active ? 26 : 4 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
                "absolute w-4 h-4 rounded-none shadow-lg",
                active ? "bg-primary shadow-[0_0_12px_var(--primary)]" : "bg-primary/50"
            )}
        />
    </button>
);


  const SettingsPanel = () => {
    const settings = useSettingsStore();
    const [availableModels, setAvailableModels] = React.useState<string[]>([]);
    const fetchModels = async () => {
      try {
        const data = await ollamaService.checkStatus();
        if (data?.models) {
          setAvailableModels(data.models);
        } else {
          console.warn('No models field in status response');
        }
      } catch (e) {
        console.error('Failed to fetch models', e);
      }
    };
    useEffect(() => {
      fetchModels();
    }, []);


  return (
    <div className="h-full w-full bg-background overflow-y-auto premium-scroll flex justify-center py-16 px-12 select-none">
      <div className="max-w-4xl w-full">
        <div className="mb-16">
          <h1 className="text-4xl font-black text-on-surface mb-4 font-editorial tracking-tighter">System Configuration</h1>
          <p className="text-on-surface/30 text-xs tracking-widest uppercase font-block">Personalize your Neural Workspace Environment</p>
        </div>

        <Section title="Appearance & Themes" icon={<Palette size={18} />}>
          <SettingRow label="Color Theme" description="Choose the core aesthetic for your workspace.">
             <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                {[
                  { id: 'aps-light', label: 'APS Light' },
                  { id: 'neural-onyx', label: 'Neural Onyx' },
                  { id: 'aps-gold', label: 'APS GOLD' },
                  { id: 'nebula-light', label: 'Nebula Light' }
                ].map(t => (
                   <button 
                    key={t.id}
                    onClick={() => settings.setTheme(t.id as any)}
                    className={cn(
                        "px-4 py-3 text-[9px] font-black uppercase tracking-widest border transition-all text-left flex items-center justify-between",
                        settings.theme === t.id ? "bg-primary/10 text-primary border-primary" : "bg-surface text-on-surface/40 border-outline-variant hover:border-on-surface/20"
                    )}
                  >
                    <span>{t.label}</span>
                    {settings.theme === t.id && <div className="w-1.5 h-1.5 bg-primary rounded-none shadow-[0_0_8px_var(--primary)]" />}
                  </button>
                ))}
             </div>
          </SettingRow>
        </Section>

        <Section title="Typography" icon={<Type size={18} />}>
          <SettingRow label="Font Size" description="Controls the font size in pixels.">
            <div className="flex items-center space-x-4 bg-surface-low border border-outline-variant p-1 rounded-none">
                <button onClick={() => settings.setFontSize(Math.max(10, settings.fontSize - 1))} className="p-2 hover:bg-on-surface/5 transition-colors cursor-pointer text-on-surface/40 hover:text-on-surface"><Minus size={12} /></button>
                <span className="text-[11px] font-mono w-8 text-center text-on-surface">{settings.fontSize}px</span>
                <button onClick={() => settings.setFontSize(Math.min(32, settings.fontSize + 1))} className="p-2 hover:bg-on-surface/5 transition-colors cursor-pointer text-on-surface/40 hover:text-on-surface"><Plus size={12} /></button>
            </div>
          </SettingRow>

          <SettingRow label="Font Family" description="Configure the primary monospaced font family.">
            <select 
                value={settings.fontFamily} 
                onChange={(e) => settings.setFontFamily(e.target.value)}
                className="bg-surface-low border border-outline-variant text-[11px] px-4 py-2 text-on-surface/70 outline-none focus:border-primary/40 transition-all cursor-pointer font-mono rounded-none"
            >
                <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                <option value="'Fira Code', monospace">Fira Code</option>
                <option value="'Cascadia Code', monospace">Cascadia Code</option>
                <option value="'Source Code Pro', monospace">Source Code Pro</option>
                <option value="'Courier New', monospace">Courier New</option>
            </select>
          </SettingRow>
        </Section>

        <Section title="Editor Behavior" icon={<Layout size={18} />}>
          <SettingRow label="Minimap" description="Show a high-level overview of the document on the side.">
            <Toggle active={settings.minimap} onClick={() => settings.setMinimap(!settings.minimap)} />
          </SettingRow>

          <SettingRow label="Word Wrap" description="Determines if lines should wrap if they exceed the viewport.">
            <Toggle active={settings.wordWrap === 'on'} onClick={() => settings.setWordWrap(settings.wordWrap === 'on' ? 'off' : 'on')} />
          </SettingRow>

          <SettingRow label="Line Numbers" description="Controls the rendering of line numbers.">
            <Toggle active={settings.lineNumbers === 'on'} onClick={() => settings.setLineNumbers(settings.lineNumbers === 'on' ? 'off' : 'on')} />
          </SettingRow>

          <SettingRow label="Cursor Style" description="Customize the visual appearance of the editor cursor.">
            <select 
                value={settings.cursorStyle} 
                onChange={(e) => settings.setCursorStyle(e.target.value as any)}
                className="bg-surface-low border border-outline-variant text-[11px] px-4 py-2 text-on-surface/70 outline-none focus:border-primary/40 transition-all cursor-pointer font-block uppercase tracking-widest rounded-none"
            >
                <option value="line">Line (Default)</option>
                <option value="block">Block</option>
                <option value="underline">Underline</option>
            </select>
          </SettingRow>

          <SettingRow label="Breadcrumbs" description="Show sticky navigation headers for the current scope.">
            <Toggle active={settings.breadcrumbs} onClick={() => settings.setBreadcrumbs(!settings.breadcrumbs)} />
          </SettingRow>
        </Section>

        <Section title="Neural Intelligence" icon={<Cpu size={18} />}>
          <SettingRow label="Neural Completions (Ghost Text)" description="Enable AI-powered predictive code completions (Neural Ghost). Powered by local LLM.">
            <Toggle active={settings.neuralCompletions} onClick={() => settings.setNeuralCompletions(!settings.neuralCompletions)} />
          </SettingRow>

          <div className="space-y-6 mt-4 p-6 bg-surface-low border border-outline-variant rounded-none">
             <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/60">AI Engine Configuration</h3>
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-none bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]" />
                    <span className="text-[9px] font-bold text-primary uppercase">Neural Link Active</span>
                </div>
             </div>

             {/* Ollama Path */}
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface/40 uppercase">Ollama Executable Path</label>
                <div className="flex space-x-2">
                    <input 
                        type="text" 
                        readOnly 
                        value={settings.ollamaPath || "Auto-detecting system path..."}
                        className="flex-1 bg-background border border-outline-variant rounded-none px-3 py-2 text-[10px] font-mono text-on-surface/60"
                    />
                    <button 
                        onClick={async () => {
                            const path = await invoke('open_file_dialog', { filters: ['exe'] }) as string;
                            if (path) {
                                settings.setOllamaPath(path);
                                await ollamaService.updateConfig(path, settings.ollamaModelDir);
                            }
                        }}
                        className="px-4 py-2 bg-on-surface/5 hover:bg-on-surface/10 border border-outline-variant rounded-none text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center space-x-2"
                    >
                        <FileSearch size={12} />
                        <span>Locate</span>
                    </button>
                </div>
             </div>

             {/* Active Model Selection */}
             <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-on-surface/40 uppercase">Active Model</label>
                    <button onClick={fetchModels} className="text-on-surface/40 hover:text-primary"><RefreshCcw size={10} /></button>
                </div>
                <select 
                    value={settings.activeModel}
                    onChange={(e) => settings.setActiveModel(e.target.value)}
                    className="w-full bg-background border border-outline-variant px-3 py-2 text-[10px] font-mono text-on-surface outline-none focus:border-primary/40 rounded-none"
                >
                    {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
             </div>

             {/* Model Directory */}
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface/40 uppercase">Local Model Directory (D: Drive Recommended)</label>
                <div className="flex space-x-2">
                    <input 
                        type="text" 
                        readOnly 
                        value={settings.ollamaModelDir || "Default (~/.ollama/models)"}
                        className="flex-1 bg-background border border-outline-variant rounded-none px-3 py-2 text-[10px] font-mono text-on-surface/60"
                    />
                    <button 
                        onClick={async () => {
                            const path = await invoke('open_folder_dialog') as string;
                            if (path) {
                                settings.setOllamaModelDir(path);
                                await ollamaService.updateConfig(settings.ollamaPath, path);
                            }
                        }}
                        className="px-4 py-2 bg-on-surface/5 hover:bg-on-surface/10 border border-outline-variant rounded-none text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center space-x-2"
                    >
                        <Folder size={12} />
                        <span>Browse</span>
                    </button>
                </div>
             </div>

             {/* Model Downloader */}
             <div className="pt-4 border-t border-outline-variant/30">
                <label className="text-[10px] font-bold text-on-surface/40 uppercase block mb-3">Orchestrate Neural Models</label>
                <div className="flex space-x-2">
                    <input 
                        type="text" 
                        id="modelToPull"
                        placeholder="e.g., deepseek-coder:1.3b"
                        className="flex-1 bg-background border border-outline-variant rounded-none px-3 py-2 text-[10px] font-mono text-on-surface focus:border-primary/40 outline-none transition-all"
                    />
                    <button 
                        onClick={async () => {
                            const input = document.getElementById('modelToPull') as HTMLInputElement;
                            const model = input?.value;
                            if (model) {
                                await ollamaService.pullModel(model, (progress) => {
                                    console.log(`[Ollama Pull] ${model}:`, progress);
                                });
                            }
                        }}
                        className="px-6 py-2 bg-primary text-black rounded-none text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_15px_var(--primary-half)] inline-flex items-center space-x-2"
                    >
                        <Download size={12} />
                        <span>Pull Model</span>
                    </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    {['deepseek-coder:1.3b', 'phi3:mini', 'llama3:8b'].map(m => (
                        <button 
                            key={m}
                            onClick={() => {
                                const input = document.getElementById('modelToPull') as HTMLInputElement;
                                if (input) input.value = m;
                            }}
                            className="px-3 py-1.5 bg-on-surface/[0.03] hover:bg-on-surface/[0.08] border border-outline-variant rounded-none text-[8px] font-bold text-on-surface/40 hover:text-on-surface/70 transition-all uppercase tracking-tight"
                        >
                            {m}
                        </button>
                    ))}
                </div>
             </div>
          </div>
        </Section>

        <Section title="Automation" icon={<Zap size={18} />}>
          <SettingRow label="Auto-Save" description="Automatically save file changes after 1.5 seconds of inactivity.">
            <Toggle active={settings.autoSave} onClick={() => settings.setAutoSave(!settings.autoSave)} />
          </SettingRow>
        </Section>

        <Section title="System & Privacy" icon={<Eye size={18} />}>
          <SettingRow label="Environmental Telemetry" description="Allow the application to log system bridge events and diagnostics to the console.">
            <Toggle active={settings.telemetry} onClick={() => settings.setTelemetry(!settings.telemetry)} />
          </SettingRow>
        </Section>

        <div className="mt-20 pt-10 border-t border-outline-variant text-center">
            <div className="inline-flex items-center space-x-2 px-6 py-3 bg-surface border border-outline-variant text-[9px] font-black text-on-surface/20 uppercase tracking-[0.4em]">
                <Check size={10} className="text-primary" />
                <span>All changes are persisted to Neural Storage</span>
            </div>
        </div>
      </div>
    </div>
  );
};
