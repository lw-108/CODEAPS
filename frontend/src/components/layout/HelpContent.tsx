import React, { useState } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { BookOpen, Rocket, Cpu, Shield, Zap, Keyboard, Terminal, Sparkles, Settings, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export const HelpContent = () => {
  const { theme } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('setup');
  
  const pages = [
    {
      id: 'setup',
      label: 'Setup Guide',
      icon: <Rocket size={16} />,
      title: 'Initialize Your Environment',
      description: 'Follow these steps to configure CodeAps for your workflow.',
      content: [
        {
          title: 'Workspace Configuration',
          items: [
            'Open a folder (Ctrl+Shift+O) to initialize the Neural Link.',
            'The sidebar will automatically index your files for AI retrieval.',
            'Use File > New Archive (Ctrl+N) for ephemeral scratchpad sessions.'
          ]
        },
        {
          title: 'AI Integration',
          items: [
            'Ensure Ollama is installed and running on localhost:11434.',
            'CodeAps will auto-detect your local models (Llama3, Mistral, etc.).',
            'Configured models are used for real-time analysis and completions.'
          ]
        }
      ]
    },
    {
      id: 'efficiency',
      label: 'Efficiency',
      icon: <Zap size={16} />,
      title: 'Neural Throughput',
      description: 'How CodeAps optimizes your development velocity.',
      content: [
        {
          title: 'Zero-Lag Architecture',
          items: [
            'Rust-driven backend ensures near-instant file operations.',
            'High-speed RTC bridge for real-time terminal synchronization.',
            'Memory-efficient indexing allows browsing massive monorepos.'
          ]
        },
        {
          title: 'AI-Powered Flow',
          items: [
            'Inline completions reduce keystrokes by predicting your next move.',
            'Mini-Chat suggested actions appear automatically as you type.',
            'Static analysis runs in background threads to avoid UI blocking.'
          ]
        }
      ]
    },
    {
      id: 'shortcuts',
      label: 'Shortcuts',
      icon: <Keyboard size={16} />,
      title: 'Command Mastery',
      description: 'Essential keybindings for high-speed operation.',
      content: [
        {
          title: 'General',
          items: [
            'Ctrl + P : Command Palette / File Navigation',
            'Ctrl + B : Toggle Primary Sidebar',
            'Ctrl + ` : Toggle Integrated Terminal',
            'Ctrl + Shift + P : Command Search'
          ]
        },
        {
          title: 'Editor',
          items: [
            'Ctrl + S : Save Buffer to Disk',
            'Alt + Shift + F : Format Active Document',
            'Ctrl + / : Toggle Line Comment',
            'Ctrl + F : Find in current file'
          ]
        }
      ]
    },
    {
      id: 'ollama',
      label: 'AI Neural Engine',
      icon: <Cpu size={16} />,
      title: 'Ollama Integration (2026)',
      description: 'The backbone of CodeAps AI. Configure your local LLM stack for private, high-speed inference.',
      content: [
        {
          title: '1. Installation & Acquisition',
          items: [
            'Visit ollama.com and download the latest 2026 stable binary for your OS.',
            'Execute the installer and ensure the Ollama service is active in your system tray.',
            'Open your terminal and verify with: `ollama --version`'
          ]
        },
        {
          title: '2. Downloading LLM Models',
          items: [
            'Pull the recommended baseline: `ollama pull llama3:8b` (or `mistral` for lower VRAM).',
            'For high-fidelity reasoning, use: `ollama pull codestral`.',
            'Models are stored locally and encrypted within your neural workspace.'
          ]
        },
        {
          title: '3. Storage Optimization (Drive Migration)',
          items: [
            'By default, models are stored on your C: drive. To migrate to a larger D: or E: drive:',
            'Windows: Set a System Environment Variable `OLLAMA_MODELS` to your target path (e.g., `D:\\OllamaModels`).',
            'Linux/Mac: Export `OLLAMA_MODELS="/path/to/drive"` in your shell profile.',
            'Restart the Ollama service to apply the path changes.'
          ]
        },
        {
          title: '4. CodeAps Synchronization',
          items: [
            'Go to File > Preferences > System Config.',
            'Ensure the "Neural Completions" toggle is active.',
            'The engine will automatically detect models at http://localhost:11434.'
          ]
        },
        {
          title: '5. Verification & Testing',
          items: [
            'Open a code file and start typing. Look for "Neural Suggestion" ghosts.',
            'Use the Mini-Chat sidebar to ask a question. If it responds, the link is established.',
            'Check the Status Bar: A glowing "Neural Link: Active" icon confirms peak performance.'
          ]
        }
      ]
    },
    {
      id: 'config',
      label: 'System Config',
      icon: <Settings size={16} />,
      title: 'Global Configuration',
      description: 'Tailor the engine to your personal specifications.',
      content: [
        {
          title: 'Visual Identity',
          items: [
            'Theme: Switch between APS Gold, Neural Onyx, and Nebula Light.',
            'Fonts: Supports system-wide ligatures and custom monospaced families.',
            'Minimap: Toggle for high-level navigation in large modules.'
          ]
        },
        {
          title: 'Operational Settings',
          items: [
            'Auto-Save: Periodically persists dirty buffers to prevent data loss.',
            'Telemetry: Toggle system analytics and neural feedback loops.',
            'Neural Completions: Enable/Disable the local LLM inference engine.'
          ]
        }
      ]
    }
  ];

  const currentPage = pages.find(p => p.id === activeTab) || pages[0];

  return (
    <div className="flex h-full bg-background/50 backdrop-blur-md">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-outline-variant/10 flex flex-col p-4 space-y-2 shrink-0">
        <div className="px-4 py-6 mb-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">System Manual</h2>
          <p className="text-[9px] text-on-surface/30 mt-1 uppercase">CodeAps Executive v5.0</p>
        </div>
        
        {pages.map((page) => (
          <button
            key={page.id}
            onClick={() => setActiveTab(page.id)}
            className={cn(
              "flex items-center space-x-3 px-4 py-3 rounded-none transition-all text-sm font-bold",
              activeTab === page.id 
                ? "bg-primary/10 text-primary shadow-[inset_0_0_10px_rgba(255,184,108,0.1)]" 
                : "text-on-surface/40 hover:text-on-surface/70 hover:bg-on-surface/5"
            )}
          >
            <span className={activeTab === page.id ? "text-primary" : "text-on-surface/30"}>
              {page.icon}
            </span>
            <span>{page.label}</span>
          </button>
        ))}
        
        <div className="mt-auto p-4 rounded-none bg-on-surface/5 border border-outline-variant/10">
          <div className="flex items-center space-x-2 text-primary/60 mb-2">
            <Info size={14} />
            <span className="text-[10px] font-black uppercase">Version Info</span>
          </div>
          <p className="text-[9px] text-on-surface/40 leading-relaxed">
            Build: 2026.04.23-STABLE<br />
            Engine: Tauri 1.5.0 / Rust 1.75<br />
            Neural Link: Active
          </p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto premium-scroll p-12">
        <div className="max-w-3xl animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="mb-12">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-none bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-6">
              <Sparkles size={10} />
              <span>{currentPage.label}</span>
            </div>
            <h1 className="text-4xl font-black mb-4 tracking-tight text-on-surface uppercase">
              {currentPage.title}
            </h1>
            <p className="text-on-surface/60 text-lg leading-relaxed">
              {currentPage.description}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-12">
            {currentPage.content.map((section, i) => (
              <div key={i} className="space-y-6">
                <h3 className="text-xl font-bold flex items-center space-x-3 text-on-surface/90">
                  <div className="w-8 h-[1px] bg-primary/40" />
                  <span>{section.title}</span>
                </h3>
                <ul className="space-y-4 ml-11">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-start space-x-3 text-sm text-on-surface/70 group">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-none bg-primary/20 group-hover:bg-primary transition-colors shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
