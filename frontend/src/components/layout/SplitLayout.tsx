import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Sidebar } from './Sidebar';
import { Editor } from './Editor';
import { TerminalPanel } from './TerminalPanel';
import { StatsPanel } from './StatsPanel';
import { ChatPanel } from './ChatPanel';
import { WelcomeScreen } from './WelcomeScreen';
import { AnalysisDashboard } from './AnalysisDashboard';
import { RequirementPanel } from './RequirementPanel';
import { LifecycleDashboard } from './LifecycleDashboard';
import { useLayoutStore } from '@/store/useLayoutStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useEditorStore } from '@/store/useEditorStore';
import { useCodeAnalysis } from '@/hooks/useCodeAnalysis';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const SplitLayout = () => {
  const { 
    isSidebarVisible, isTerminalVisible,
    sidebarSize, terminalSize,
    setSidebarSize, setTerminalSize,
    rightPanelMode, isWelcomeVisible
  } = useLayoutStore();
  
  const { isWorkspaceOpen } = useWorkspaceStore();
  const { tabs } = useEditorStore();

  useCodeAnalysis(true); // Auto-run diagnostics globally


  // Show welcome screen when no workspace AND no tabs
  const showWelcome = !isWorkspaceOpen && tabs.length === 0;

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative">
      {/* Permanent Welcome Overlay */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0 z-[100]"
          >
            <WelcomeScreen />
          </motion.div>
        )}
      </AnimatePresence>

      {isWelcomeVisible && (
        <PanelGroup direction="horizontal">
          {/* Sidebar Panel */}
          {isSidebarVisible && (
            <>
              <Panel 
                defaultSize={sidebarSize} 
                onResize={setSidebarSize}
                minSize={10}
                maxSize={30}
                collapsible={true}
              >
                <Sidebar />
              </Panel>
              <CustomResizeHandle direction="horizontal" />
            </>
          )}

          {/* Main Content Area (Editor + Terminal) */}
          <Panel className="flex flex-col" minSize={30}>
            <PanelGroup direction="vertical">
              <Panel minSize={20}>
                <Editor />
              </Panel>
              
              {isTerminalVisible && (
                <>
                  <CustomResizeHandle direction="vertical" />
                  <Panel 
                    defaultSize={terminalSize} 
                    onResize={setTerminalSize}
                    minSize={15}
                    maxSize={70}
                    collapsible={true}
                  >
                    <TerminalPanel />
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>

          <CustomResizeHandle direction="horizontal" />

          {/* Right Panel (Stats, Chat, Analysis, Requirements, or Lifecycle) */}
          <Panel 
            defaultSize={25}
            minSize={15}
            maxSize={45}
            collapsible={true}
            className="relative z-10 flex flex-col bg-surface-container overflow-hidden"
          >
            <div className="flex-1 min-h-0 relative flex flex-col">
              {rightPanelMode === 'stats' && <StatsPanel />}
              {rightPanelMode === 'chat' && <ChatPanel />}
              {rightPanelMode === 'requirements' && <RequirementPanel />}
              {rightPanelMode === 'lifecycle' && <LifecycleDashboard />}
              {rightPanelMode === 'analysis' && <AnalysisDashboard />}
            </div>
          </Panel>
        </PanelGroup>
      )}
    </div>
  );
};

const CustomResizeHandle = ({ direction }: { direction: 'horizontal' | 'vertical' }) => (
    <PanelResizeHandle className={cn(
        "transition-all duration-300 ease-in-out relative z-50 bg-white/[0.01] hover:bg-primary/20",
        direction === 'horizontal' ? "w-[1.5px] hover:w-1" : "h-[1.5px] hover:h-1"
    )} />
);
