import React, { useMemo } from 'react';
import { Zap, Cpu, Activity, Shield, Code, AlertTriangle, CheckCircle2, TrendingUp, Clock, Sparkles, Brain, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { useCodeAnalysis } from '@/hooks/useCodeAnalysis';
import { useEditorStore } from '@/store/useEditorStore';
import { RadialBar, RadialBarChart, LabelList, ResponsiveContainer, Tooltip, PolarAngleAxis } from 'recharts';

interface StatsPanelProps {
  isNested?: boolean;
}

export const StatsPanel = ({ isNested = false }: StatsPanelProps) => {
  const { 
    metrics, isAnalyzing, findings, lastAnalysis, analysisHistory, 
    lastPerfectCode, isGeneratingSuggestion 
  } = useAnalysisStore();
  const { activeFile, updateTabContent } = useEditorStore();
  const { refetch, generatePerfectCode } = useCodeAnalysis();
  
  const [copied, setCopied] = React.useState(false);

  // Radar chart data for 4 pillars
  const radarKeys = ['security', 'performance', 'maintainability', 'reliability'] as const;
  const radarLabels = { security: 'SECURITY', performance: 'PERFORMANCE', maintainability: 'MAINTAIN', reliability: 'RELIABILITY' };
  const radarColors = { security: '#f87171', performance: '#fbbf24', maintainability: '#94a3b8', reliability: '#4ade80' };
  const radarIcons = { security: <Shield size={14} />, performance: <Zap size={14} />, maintainability: <Code size={14} />, reliability: <Activity size={14} /> };

  const chartData = useMemo(() => {
    if (!metrics) return radarKeys.map(key => ({ name: radarLabels[key], score: 0, fill: radarColors[key] }));
    return radarKeys.map((key) => ({
      name: radarLabels[key].toLowerCase(),
      score: metrics[key] || 0,
      fill: radarColors[key]
    }));
  }, [metrics]);

  const qualityColor = useMemo(() => {
    const q = metrics?.quality ?? 0;
    if (q >= 80) return '#4ade80';
    if (q >= 60) return '#fbbf24';
    if (q >= 40) return '#f87171';
    return '#ef4444';
  }, [metrics?.quality]);

  const trend = useMemo(() => {
    if (analysisHistory.length < 2) return null;
    const recent = analysisHistory[analysisHistory.length - 1].score;
    const prev = analysisHistory[analysisHistory.length - 2].score;
    return recent - prev;
  }, [analysisHistory]);

  const hasData = metrics && metrics.quality !== null;

  const scoringRationale = useMemo(() => {
    if (!hasData) return null;
    let text = "";
    const lowScores = radarKeys.filter(k => metrics[k] < 60);
    const highScores = radarKeys.filter(k => metrics[k] >= 85);

    if (metrics.quality >= 90) {
      text = "Exceptional structural integrity. The codebase demonstrates elite architectural patterns with zero critical bottlenecks.";
    } else if (lowScores.includes('security')) {
      text = "Security vulnerabilities detected. The health index is lowered primarily due to risks in the authentication or data handling paths.";
    } else if (lowScores.includes('performance')) {
      text = "Performance degradation found. Execution paths are currently sub-optimal, likely due to resource-heavy operations.";
    } else if (findings.length > 5) {
      text = `System stability is under pressure. ${findings.length} critical findings across multiple modules are suppressing the overall quality score.`;
    } else if (highScores.length >= 2) {
      text = "Relatively stable core. While some refinements are needed, the fundamental performance and security pillars remain strong.";
    } else {
      text = "Balanced diagnostic profile. Refinement of specific edge cases in the current module will elevate the health index.";
    }
    
    return text;
  }, [metrics, findings, hasData]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Header with Pulse */}
      {!isNested && (
        <div className="h-14 px-6 flex items-center justify-between bg-surface border-b border-outline-variant shrink-0">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "w-2 h-2 rounded-none",
              isAnalyzing ? "bg-on-surface animate-pulse shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]" : hasData ? "bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.3)]" : "bg-on-surface/20"
            )} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
              {isAnalyzing ? 'Analyzing Neural Patterns...' : hasData ? 'System Diagnostic Stable' : 'Awaiting Code Input'}
            </span>
          </div>
        </div>
      )}

      {/* Main Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto premium-scroll p-6 space-y-10 overscroll-contain">
        {/* Main Score Visualization */}
        <div className="flex flex-col items-center justify-center py-4 relative group">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-7xl font-black tracking-tighter tabular-nums mb-2"
            style={{ color: qualityColor }}
          >
            {Math.round(metrics.quality || 0)}
          </motion.div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center space-x-2" style={{ color: qualityColor }}>
            <Sparkles size={10} />
            <span>Code Health Index</span>
          </div>
          
          {hasData && (
            <div className="mt-4 px-4 py-1.5 rounded-none text-[9px] font-black uppercase tracking-[0.2em] border"
              style={{ 
                color: qualityColor, 
                borderColor: `${qualityColor}30`,
                backgroundColor: `${qualityColor}10`
              }}
            >
              {metrics.quality >= 90 ? 'EXCEPTIONAL' : metrics.quality >= 75 ? 'PRODUCTION READY' : metrics.quality >= 60 ? 'ACCEPTABLE' : metrics.quality >= 40 ? 'NEEDS WORK' : 'CRITICAL'}
            </div>
          )}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-32 blur-[80px] -z-10 opacity-50 transition-opacity"
            style={{ backgroundColor: `${qualityColor}20` }}
          />
        </div>

        {/* Diagnostics Radial Chart Section */}
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="relative w-full h-80 flex flex-col items-center justify-center bg-on-surface/[0.01] rounded-none border border-outline-variant/10 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={chartData}
                innerRadius={30}
                outerRadius={110}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar 
                  dataKey="score" 
                  background={{ fill: 'var(--outline-variant)' }}
                  animationDuration={400}
                >
                  <LabelList position="insideStart" dataKey="name" fill="var(--on-surface)" style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                </RadialBar>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>

          {scoringRationale && (
            <div className="px-6 py-4 bg-on-surface/[0.02] border-y border-outline-variant/30 text-center italic text-[11px] text-on-surface/50 font-editorial">
              "{scoringRationale}"
            </div>
          )}
        </div>

        {/* Detailed Metrics Grid */}
        {hasData && (
          <div className="grid grid-cols-2 gap-4">
            {radarKeys.map((key) => (
              <MetricCard key={key} label={key} val={metrics[key]} icon={radarIcons[key]} color={radarColors[key]} />
            ))}
          </div>
        )}

        {/* Findings Log */}
        {hasData && (
          <div className="space-y-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/20 px-2">
              Critical Findings
            </div>
            <div className="space-y-1">
              {findings.map((f: string, i: number) => (
                <div key={i} className="flex items-center justify-between py-3 px-4 bg-on-surface/[0.02] border border-outline-variant">
                  <span className="text-[11px] text-on-surface/60 font-medium truncate">{f}</span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-red-500/60 ml-2">CRIT</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Primary Action - With pb-16 for StatusBar */}
      <div className="p-6 pb-16 bg-surface-high border-t border-outline-variant shrink-0">
        <button 
          onClick={refetch}
          disabled={isAnalyzing || !activeFile}
          className="w-full flex items-center justify-center space-x-3 py-4 bg-primary text-on-primary hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all cursor-pointer rounded-none uppercase tracking-[0.2em] font-black text-[11px] border-none"
        >
          <Activity size={16} />
          <span>{isAnalyzing ? 'Scanning Neural Core...' : 'Execute Deep Scan'}</span>
        </button>
      </div>
    </div>
  );
};

const MetricCard = ({ label, val, icon, color }: { label: string; val: number; icon: React.ReactNode; color: string }) => {
  const displayVal = Math.round(val || 0);
  return (
    <div className="p-4 bg-on-surface/[0.02] border border-outline-variant flex flex-col space-y-4 rounded-none">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-surface-high border border-outline-variant text-on-surface-variant/60">{icon}</div>
        <div className="text-xl font-black text-on-surface tabular-nums tracking-tighter">{displayVal}%</div>
      </div>
      <div className="h-1 bg-on-surface/5 w-full rounded-none overflow-hidden">
        <div className="h-full" style={{ width: `${displayVal}%`, backgroundColor: color }} />
      </div>
      <div className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">{label}</div>
    </div>
  );
};
