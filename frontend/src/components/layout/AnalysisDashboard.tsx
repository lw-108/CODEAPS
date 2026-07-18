import React from 'react';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { Brain, Zap, Clock, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadarDashboard } from './RadarDashboard';
import { SystemBarCharts } from './SystemBarCharts';

import { useEditorStore } from '@/store/useEditorStore';

import { StatsPanel } from './StatsPanel';

export const AnalysisDashboard = () => {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'diagnostics'>('overview');
  const { activeFile } = useEditorStore();
  const { fileResults, isAnalyzing } = useAnalysisStore();
  
  const result = activeFile ? fileResults[activeFile] : null;
  const complexity = result?.complexity || { time: 'O(1)', space: 'O(1)', explanation: 'Select a file to begin neural analysis.' };
  const lastAnalysis = result?.lastAnalysis;

  return (
    <div className="flex flex-col h-full bg-background text-on-surface premium-scroll overflow-y-auto overscroll-contain p-4 pb-20 space-y-6 font-functional">
      {/* Neural Header */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "p-2 rounded-none bg-primary/10 text-primary border border-primary/20 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)]",
            isAnalyzing && "animate-pulse"
          )}>
            <Brain size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-on-surface italic">Neural Command</h2>
            <p className="text-[10px] text-on-surface-variant/20 font-bold uppercase tracking-widest">
              {lastAnalysis ? `Last Sync: ${new Date(lastAnalysis).toLocaleTimeString()}` : 'Awaiting Telemetry...'}
            </p>
          </div>
        </div>
        {isAnalyzing && (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-none bg-primary/10 border border-primary/20">
            <Activity size={10} className="text-primary animate-spin" />
            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Processing...</span>
          </div>
        )}
      </div>
      {/* Sub-Tabs Navigation */}
      <div className="flex p-1 bg-on-surface/[0.03] border border-outline-variant rounded-none mx-1">
        <button 
          onClick={() => setActiveTab('overview')}
          className={cn(
            "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-none",
            activeTab === 'overview' ? "bg-primary text-on-primary shadow-lg" : "text-on-surface-variant/40 hover:text-on-surface hover:bg-on-surface/5"
          )}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('diagnostics')}
          className={cn(
            "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-none",
            activeTab === 'diagnostics' ? "bg-primary text-on-primary shadow-lg" : "text-on-surface-variant/40 hover:text-on-surface hover:bg-on-surface/5"
          )}
        >
          Diagnostics
        </button>
      </div>

        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 gap-6 transition-all duration-300">
            {/* Radar Metrics */}
            <RadarDashboard />

            {/* Complexity Card */}
            <div className="bg-surface-low rounded-none p-5 border border-outline-variant relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap size={64} className="text-primary" />
              </div>
              
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 flex items-center">
                  <Zap size={12} className="mr-2 text-primary" /> Complexity Feedback
                </h3>
                {complexity.predictedRuntimeMs !== undefined && (
                  <div className="flex items-center space-x-2 text-primary bg-primary/10 px-2 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest border border-primary/20">
                    <Clock size={10} />
                    <span>Est. {complexity.predictedRuntimeMs}ms</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex space-x-8">
                  <div>
                    <div className="text-[10px] uppercase font-black text-on-surface-variant/20 mb-1 tracking-widest">Time</div>
                    <div className="text-3xl font-black text-primary tracking-tighter tabular-nums" style={{ filter: 'drop-shadow(0 0 3px var(--primary))' }}>
                      {complexity.time}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-black text-on-surface-variant/20 mb-1 tracking-widest">Space</div>
                    <div className="text-3xl font-black text-primary tracking-tighter tabular-nums" style={{ filter: 'drop-shadow(0 0 3px var(--primary))' }}>
                      {complexity.space}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] leading-6 text-on-surface/50 border-t border-outline-variant pt-4 font-editorial italic">
                  {complexity.explanation}
                </p>
              </div>
            </div>

            {/* System Reactions */}
            <SystemBarCharts />
          </div>
        ) : (
          <div className="transition-all duration-300 h-full">
            <StatsPanel isNested />
          </div>
        )}

      {/* Analytics Footer Hint */}
      <div className="pt-4 text-center">
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface/10 hover:text-primary transition-colors cursor-default">
          Intelligence Layer Active
        </span>
      </div>
    </div>
  );
};
