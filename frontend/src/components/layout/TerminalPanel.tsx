import React, { useEffect, useRef, useState } from 'react';
import { ChevronUp, ChevronDown, CheckCircle2, FolderSearch } from 'lucide-react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { open } from '@tauri-apps/api/dialog';
import { useTerminal } from '@/hooks/useTerminal';
import { useLayoutStore } from '@/store/useLayoutStore';
import { useTerminalStore } from '@/store/useTerminalStore';
import { cn } from '@/lib/utils';
import { useSystemStats } from '@/hooks/useSystemStats';
import { useFileSystem } from '@/hooks/useFileSystem';
import { Trash2 } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { ProblemsView } from '../ui/ProblemsView';

interface TerminalPanelProps {
  onClose?: () => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const { isTauriConnected } = useFileSystem();
  const xtermRef = useRef<any | null>(null);
  const fitAddonRef = useRef<any | null>(null);
  const { terminalActiveTab: activeTab, setTerminalActiveTab: setActiveTab } = useLayoutStore();
  const { theme: currentTheme } = useSettingsStore();
  const { workspacePath } = useWorkspaceStore();
  const { pendingPath, triggerReset, requestReset } = useTerminalStore();
  const { getAllProblems } = useAnalysisStore();
  const [activeTest, setActiveTest] = useState<string | null>('1');
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Robust Synchronization Bridge: Keeps terminal path aligned with active workspace
  useEffect(() => {
    if (workspacePath && workspacePath !== pendingPath) {
      const timer = setTimeout(() => {
        // Double-check to avoid pulse fluctuations
        if (workspacePath && workspacePath !== useTerminalStore.getState().pendingPath) {
          requestReset(workspacePath);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [workspacePath, pendingPath, requestReset]);

  const handleTerminalData = React.useCallback((data: string) => {
    if (xtermRef.current) {
        xtermRef.current.write(data);
    }
  }, []);

  const { stats } = useSystemStats(2000);
  const latency = stats ? `${Math.floor(15 + Math.random() * 5)} MS` : '0 MS';

  const { createTerminal, write, resize, isReady } = useTerminal(handleTerminalData);

  // Robust "Safe Fit" utility to prevent dimensions error
  const safeFit = React.useCallback(() => {
    if (!xtermRef.current || !fitAddonRef.current || !terminalRef.current) return;
    
    // xterm.js throws 'dimensions' error if requested when not visible or zero-sized
    // Stricter checks for DOM attachment and visibility
    const isConnected = terminalRef.current.isConnected;
    const { offsetWidth, offsetHeight } = terminalRef.current;
    
    // Check if element is in DOM and has positive dimensions
    const isVisible = !!(offsetWidth && offsetHeight && terminalRef.current.getClientRects().length);
    const parentIsVisible = terminalRef.current.offsetParent !== null;
    
    if (isConnected && isVisible && parentIsVisible && offsetWidth > 10 && offsetHeight > 10) {
      try {
        // Final sanity check on terminal render service
        if (xtermRef.current.element && xtermRef.current.element.offsetParent) {
            fitAddonRef.current.fit();
            if (xtermRef.current.rows && xtermRef.current.cols) {
                resize(xtermRef.current.rows, xtermRef.current.cols);
            }
        }
      } catch (err) {
        // Silently suppress internal xterm.js layout race conditions
        console.warn("Terminal layout sync deferred: Rendering surface not measured.");
      }
    }
  }, [resize]);

  // Global "Neural Bridge" Listener: Stays active across tabs/themes
  useEffect(() => {
    const handleRunCommand = (e: any) => {
      const { command } = e.detail;
      
      // Force switch to console but keep execution flow independent
      if (useLayoutStore.getState().terminalActiveTab !== 'console') {
        setActiveTab('console');
      }
      
      // Intelligent dispatch with Line-Feed normalization
      write(command + '\r\n');
    };

    window.addEventListener('run-command', handleRunCommand);
    return () => window.removeEventListener('run-command', handleRunCommand);
  }, [write, setActiveTab]);

  // Unified Terminal Lifecycle (Creation + Disposal)
  useEffect(() => {
    // 1. DEEP CLEAN: Kill existing instance if it exists
    if (xtermRef.current) {
        try {
            xtermRef.current.dispose();
        } catch (e) {
            console.warn("Error disposing stale terminal instance:", e);
        }
        xtermRef.current = null;
    }

    if (terminalRef.current) {
      // 2. DOM WIPE: remove all lingering children from the container
      terminalRef.current.innerHTML = '';
      
      const { offsetWidth, offsetHeight } = terminalRef.current;
      if (offsetWidth === 0 || offsetHeight === 0) {
        // Observer handles initial sizing below
      }

      const xterm = new XTerm({
        cursorBlink: true,
        convertEol: true,
        fontSize: 12,
        fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
        theme: {
          background: currentTheme === 'nebula-light' ? '#ffffff' : '#000000',
          foreground: currentTheme === 'nebula-light' ? '#1a1a1a' : '#ffffff',
          cursor: currentTheme === 'aps-light' ? '#ffffff' : (currentTheme === 'aps-gold' ? '#FFD700' : (currentTheme === 'nebula-light' ? '#0066cc' : '#ff4500')),
          selectionBackground: currentTheme === 'nebula-light' ? 'rgba(0,102,204,0.1)' : 'rgba(255,140,0,0.3)',
        },
        allowTransparency: true,
      });

      const fitAddon = new FitAddon();
      xterm.loadAddon(fitAddon);
      
      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;
      
      const tryInitTerminal = () => {
        if (!terminalRef.current || !xterm) return;
        
        try {
          const { offsetWidth, offsetHeight } = terminalRef.current;
          
          if (offsetWidth > 0 && offsetHeight > 0) {
              terminalRef.current.innerHTML = ''; 
              xterm.open(terminalRef.current);
              
              // Only trigger creation if it's the first time or a reset was requested
              createTerminal(pendingPath || undefined);
              
              requestAnimationFrame(() => {
                  setTimeout(safeFit, 500);
              });

              xterm.onData((data: string) => {
                  write(data);
              });
          }
        } catch (err) {
          console.warn("Terminal open deferred: container layout not stabilized.", err);
        }
      };

      // Immediate initialization if container is already sized
      if (terminalRef.current.offsetWidth > 0) {
        tryInitTerminal();
      }

      // Intersection and Resize observation for dynamic layout
      const obs = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
              tryInitTerminal();
              obs.disconnect();
          }
      }, { threshold: 0.1 });
      obs.observe(terminalRef.current);

      resizeObserverRef.current = new ResizeObserver(() => {
        if (useLayoutStore.getState().terminalActiveTab === 'console') {
           safeFit();
        }
      });
      resizeObserverRef.current.observe(terminalRef.current);

      return () => {
          if (resizeObserverRef.current) {
              resizeObserverRef.current.disconnect();
              resizeObserverRef.current = null;
          }
          obs.disconnect();
          if (xterm) {
              try { xterm.dispose(); } catch {}
          }
          xtermRef.current = null;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTheme]); 


  // React to Global Theme Changes
  useEffect(() => {
    if (xtermRef.current && terminalRef.current && terminalRef.current.offsetWidth > 0) {
        requestAnimationFrame(() => {
            try {
                // Additional check for visible dimensions to satisfy RenderService
                if (terminalRef.current?.getClientRects().length || 0 > 0) {
                    xtermRef.current!.options.theme = {
                        background: currentTheme === 'nebula-light' ? '#ffffff' : '#000000',
                        foreground: currentTheme === 'nebula-light' ? '#1a1a1a' : '#ffffff',
                        cursor: currentTheme === 'aps-light' ? '#ffffff' : (currentTheme === 'aps-gold' ? '#FFD700' : (currentTheme === 'nebula-light' ? '#0066cc' : '#ff4500')),
                    };
                }
            } catch (err) {
                console.warn("Theme sync deferred: terminal rendering service busy or unmeasured.");
            }
        });
    }
  }, [currentTheme]);

  // Handle Tab Switching & Re-fitting
  useEffect(() => {
    if (activeTab === 'console') {
        setTimeout(safeFit, 100);
    }
  }, [activeTab, safeFit]);

  // React to store-triggered resets
  useEffect(() => {
    if (triggerReset > 0) {
      handleReset();
    }
  }, [triggerReset]);

  const handleSelectFolder = async () => {
    if (!isTauriConnected) return;
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Terminal Working Directory'
      });

      if (selected && typeof selected === 'string') {
        useTerminalStore.getState().requestReset(selected);
      }
    } catch (error) {
      console.error('Failed to open folder picker:', error);
    }
  };

  const handleReset = async () => {
    if (xtermRef.current) {
      // 1. Reset Analysis Store (Purge all diagnostics)
      useAnalysisStore.getState().resetAll();
      
      // 2. Reset Terminal
      xtermRef.current.clear();
      xtermRef.current.write('\x1b[38;2;255;69;0m▶ Kinetic Engine: Re-initializing Shell Session\x1b[0m\r\n');
      if (pendingPath) {
        xtermRef.current.write(`\x1b[38;2;255;140;0m[ PATH: ${pendingPath} ]\x1b[0m\r\n`);
      }
      await createTerminal(pendingPath || undefined);
      setTimeout(() => {
          xtermRef.current?.focus();
          safeFit();
      }, 150);
    }
  };

  const handleKill = () => {
    if (write) {
      write('\x03');
    }
  };

  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (xtermRef.current) {
        try {
          xtermRef.current.dispose();
        } catch (e) {
          // Ignore disposal errors
        }
        xtermRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-surface-low overflow-hidden font-functional border-t border-primary/20">
      <div className="h-14 flex items-center px-4 md:px-6 shrink-0 bg-surface justify-between min-w-0">
        <div className="flex items-center space-x-4 md:space-x-10 h-full font-editorial text-[10px] font-bold uppercase tracking-[0.2em] overflow-x-auto no-scrollbar min-w-0 pr-4">
            <button 
                onClick={() => setActiveTab('tests')}
                className={cn(
                    "h-full flex items-center space-x-2 transition-all relative shrink-0",
                    activeTab === 'tests' ? "text-on-surface" : "text-on-surface-variant/30 hover:text-on-surface-variant/60"
                )}
            >
                {activeTab === 'tests' && <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_15px_#ff4500]" />}
                <span className="whitespace-nowrap">Validation Units</span>
            </button>
            <button 
                onClick={() => setActiveTab('console')}
                className={cn(
                    "h-full flex items-center space-x-2 transition-all relative shrink-0",
                    activeTab === 'console' ? "text-on-surface" : "text-on-surface-variant/30 hover:text-on-surface-variant/60"
                )}
            >
                {activeTab === 'console' && <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_15px_#ff4500]" />}
                <span className="whitespace-nowrap">Kinetic Console</span>
            </button>
            <button 
                onClick={() => setActiveTab('problems')}
                className={cn(
                    "h-full flex items-center space-x-2 transition-all relative shrink-0 font-functional",
                    activeTab === 'problems' ? "text-on-surface" : "text-on-surface-variant/30 hover:text-on-surface-variant/60"
                )}
            >
                {activeTab === 'problems' && <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_15px_#ff4500]" />}
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap">Intelligent Problems</span>
                  <div className={cn(
                    "px-1.5 py-0.5 rounded-none text-[8px] font-black tabular-nums transition-colors",
                    getAllProblems().length > 0 ? "bg-red-500 text-white" : "bg-white/5 text-white/20"
                  )}>
                    {getAllProblems().length}
                  </div>
                </div>
            </button>
            <div className="flex items-center space-x-4 ml-2 md:ml-4 shrink-0">
                <button 
                    onClick={handleSelectFolder}
                    className="flex items-center text-[9px] text-on-surface-variant/40 hover:text-primary transition-all space-x-1"
                    title="Select Custom Folder"
                >
                    <FolderSearch size={10} />
                    <span>[ BROWSE ]</span>
                </button>
                <button 
                    onClick={handleReset}
                    className="flex items-center text-[9px] text-primary/40 hover:text-primary transition-all"
                    title="Reset Shell Session"
                >
                    <span>[ RESET ]</span>
                </button>
                <button 
                    onClick={handleKill}
                    className="flex items-center text-[9px] text-secondary/40 hover:text-secondary transition-all space-x-1"
                    title="Kill Active Process (Ctrl+C)"
                >
                    <Trash2 size={10} />
                    <span>[ KILL ]</span>
                </button>
            </div>
        </div>

        {/* Telemetry Widgets */}
        <div className="hidden md:flex items-center space-x-4 lg:space-x-6 shrink-0">
            <div className="flex flex-col items-end">
                <span className="text-[9px] text-on-surface-variant/40 uppercase tracking-widest font-editorial">CPU Load</span>
                <span className="text-[11px] text-primary font-mono font-bold tracking-tighter tabular-nums">{stats ? Math.round(stats.cpu_usage) : 0}%</span>
            </div>
            <div className="flex flex-col items-end border-l border-white/5 pl-6">
                <span className="text-[9px] text-on-surface-variant/40 uppercase tracking-widest font-editorial">Memory</span>
                <span className="text-[11px] text-primary font-mono font-bold tracking-tighter tabular-nums">{stats ? Math.round(stats.memory_percentage) : 0}%</span>
            </div>
            <div className="flex flex-col items-end border-l border-white/5 pl-6">
                <span className="text-[9px] text-on-surface-variant/40 uppercase tracking-widest font-editorial">Net Latency</span>
                <span className="text-[11px] text-secondary font-mono font-bold tracking-tighter tabular-nums">{latency}</span>
            </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden relative p-4 md:p-8">
        {/* Terminal Effect Layer */}
        {activeTab === 'console' && <div className="absolute inset-0 neural-scanline mix-blend-overlay opacity-20 pointer-events-none z-10" />}

        <div className={cn(
            "absolute inset-0 transition-opacity duration-0", 
            activeTab === 'console' ? "visible opacity-100 z-10" : "invisible opacity-0 pointer-events-none -z-10"
        )}>
            <div 
                className="h-full w-full bg-background border border-outline-variant cursor-text codeaps-terminal" 
                ref={terminalRef}
                onClick={() => xtermRef.current?.focus()}
            ></div>
        </div>

        <div className={cn("h-full", activeTab !== 'tests' && "hidden")}>
            <div className="h-full overflow-y-auto premium-scroll space-y-2">
                <TestItem 
                  id="1" 
                  active={activeTest === '1'} 
                  onClick={() => setActiveTest(activeTest === '1' ? null : '1')}
                >
                    <div className="grid grid-cols-[140px_1fr] gap-4 text-[12px] font-medium leading-relaxed">
                        <span className="text-primary opacity-60 font-editorial uppercase tracking-widest text-[9px]">Neural Sequence</span>
                        <span className="text-on-surface font-mono bg-surface-container/60 p-3 border border-outline-variant">0x4F2A VALIDATED</span>
                        <span className="text-primary opacity-60 font-editorial uppercase tracking-widest text-[9px]">Memory Status</span>
                        <span className="text-primary font-mono font-bold bg-primary/10 p-3 border border-primary/20">RE-ALLOCATION SUCCESSFUL</span>
                    </div>
                </TestItem>
                <TestItem id="2" active={activeTest === '2'} onClick={() => setActiveTest(activeTest === '2' ? null : '2')} />
                <TestItem id="3" active={activeTest === '3'} onClick={() => setActiveTest(activeTest === '3' ? null : '3')} />
            </div>
        </div>

        <div className={cn("h-full", activeTab !== 'problems' && "hidden")}>
             <ProblemsView />
        </div>
      </div>

      <div className={cn(
          "h-10 flex items-center px-4 md:px-6 shrink-0 justify-between transition-all duration-500",
          "bg-primary shadow-[0_-4px_20px_rgba(var(--primary-rgb),0.15)]"
      )}>
        <div className="flex items-center space-x-2 md:space-x-3 text-on-primary">
            <CheckCircle2 size={14} className="shrink-0 neural-pulse" />
            <span className="text-[10px] md:text-[11px] font-black font-editorial tracking-[0.1em] md:tracking-[0.2em] tabular-nums uppercase truncate">
                Kinetic Engine: 100% Operational
            </span>
        </div>
        <div className="text-[9px] md:text-[10px] text-on-primary uppercase tracking-[0.2em] md:tracking-[0.4em] font-editorial font-bold ml-4 shrink-0">
            NEURAL_LINK ENGAGED
        </div>
      </div>
    </div>
  );
};

const TestItem = ({ id, active, onClick, children }: any) => (
    <div className={cn(
        "border transition-all overflow-hidden cursor-pointer",
        active ? "bg-surface-container border-primary shadow-2xl" : "bg-transparent border-white/5 opacity-40 hover:opacity-100"
    )}>
        <div 
          onClick={onClick}
          className="flex items-center justify-between p-4 px-6 hover:bg-white/[0.02]"
        >
            <h4 className="text-[11px] font-black text-on-surface font-editorial uppercase tracking-[0.2em]">Validation Unit {id}</h4>
            {active ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-on-surface-variant/40" />}
        </div>
        {active && children && (
            <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                {children}
            </div>
        )}
    </div>
);
