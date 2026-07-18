import React, { useEffect, useState } from 'react';
import { useLifecycleStore, Milestone } from '@/store/useLifecycleStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Activity, Target, ShieldAlert, FileOutput, RefreshCcw, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const LifecycleDashboard = () => {
    const {
        activeProjectId,
        milestones,
        moduleProgress,
        overallProgress,
        risks,
        report,
        isLoading,
        isGeneratingReport,
        fetchMilestones,
        fetchProgress,
        fetchRisks,
        generateReport,
    } = useLifecycleStore();

    const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'risks' | 'reports'>('overview');

    // Auto-fetch data on mount or project change
    useEffect(() => {
        if (activeProjectId) {
            fetchMilestones(activeProjectId);
            fetchProgress(activeProjectId);
            fetchRisks(activeProjectId);
        }
    }, [activeProjectId, fetchMilestones, fetchProgress, fetchRisks]);

    const handleRefresh = () => {
        if (activeProjectId) {
            fetchMilestones(activeProjectId);
            fetchProgress(activeProjectId);
            fetchRisks(activeProjectId);
        }
    };

    return (
        <div className="h-full flex flex-col bg-surface-container text-on-surface">
            {/* Header */}
            <div className="flex-none p-4 border-b border-outline-variant flex items-center justify-between bg-surface">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-none text-primary border border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]">
                        <Activity size={20} />
                    </div>
                    <div>
                        <h2 className="text-[14px] font-black uppercase tracking-widest font-editorial leading-none text-on-surface italic">
                            Lifecycle Hub
                        </h2>
                        <div className="flex items-center space-x-2 mt-1">
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-none pulse",
                                isLoading ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                            )} />
                            <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-widest">
                                {isLoading ? "Synchronizing Matrix" : "Station Connected"}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className={cn(
                            "p-2 text-on-surface-variant/60 hover:text-primary hover:bg-primary/10 rounded-none transition-all border border-transparent hover:border-primary/20",
                            isLoading && "animate-spin cursor-not-allowed opacity-50"
                        )}
                        title="Synchronize Matrix"
                    >
                        <RefreshCcw size={16} />
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-outline-variant bg-surface/50">
                <TabButton
                    active={activeTab === 'overview'}
                    onClick={() => setActiveTab('overview')}
                    icon={<Activity size={14} />}
                    label="Overview"
                />
                <TabButton
                    active={activeTab === 'milestones'}
                    onClick={() => setActiveTab('milestones')}
                    icon={<Target size={14} />}
                    label="Milestones"
                />
                <TabButton
                    active={activeTab === 'risks'}
                    onClick={() => setActiveTab('risks')}
                    icon={<ShieldAlert size={14} />}
                    label="Risks"
                    badge={risks.length}
                />
                <TabButton
                    active={activeTab === 'reports'}
                    onClick={() => setActiveTab('reports')}
                    icon={<FileOutput size={14} />}
                    label="Reports"
                />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto premium-scroll relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="p-4"
                    >
                        {activeTab === 'overview' && (
                            <OverviewTab progress={overallProgress} modules={moduleProgress} />
                        )}
                        {activeTab === 'milestones' && (
                            <MilestonesTab milestones={milestones} />
                        )}
                        {activeTab === 'risks' && (
                            <RisksTab risks={risks} />
                        )}
                        {activeTab === 'reports' && (
                            <ReportsTab
                                report={report}
                                isGenerating={isGeneratingReport}
                                onGenerate={() => generateReport(activeProjectId!)}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

// ─── Sub-Components ──────────────────────────────────────────────

const TabButton = ({ active, onClick, icon, label, badge }: any) => (
    <button
        onClick={onClick}
        className={cn(
            "flex-1 flex items-center justify-center space-x-2 py-3 border-b-2 text-[11px] font-bold uppercase tracking-wider transition-all relative overflow-hidden",
            active
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5"
        )}
    >
        {icon}
        <span>{label}</span>
        {badge > 0 && (
            <span className="bg-red-500 text-on-primary text-[9px] px-1.5 py-0.5 rounded-none ml-2">
                {badge}
            </span>
        )}
    </button>
);

// ─── Tabs ────────────────────────────────────────────────────────

const OverviewTab = ({ progress, modules }: { progress: number; modules: any[] }) => (
    <div className="space-y-6">
        {/* Global Progress */}
        <div className="p-6 border border-outline-variant rounded-none bg-surface relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <h3 className="text-[12px] font-bold uppercase tracking-widest text-on-surface mb-6 relative z-10">
                System Convergence
            </h3>
            <div className="flex flex-col items-center justify-center relative z-10">
                <div className="relative">
                    <svg className="w-40 h-40 transform -rotate-90">
                        <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-surface-high" />
                        <circle
                            cx="80" cy="80" r="70"
                            stroke="currentColor" strokeWidth="12" fill="transparent"
                            strokeDasharray={440} strokeDashoffset={440 - (440 * progress) / 100}
                            className={cn(
                                "transition-all duration-1000 ease-out",
                                progress >= 100 ? "text-green-500" : progress > 50 ? "text-primary" : "text-amber-500"
                            )}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black font-mono">{progress.toFixed(1)}<span className="text-lg text-on-surface-variant">%</span></span>
                        <span className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold mt-1">Completion</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Module Breakdown */}
        <div className="space-y-4">
            <h3 className="text-[12px] font-bold uppercase tracking-widest text-on-surface">Module Status</h3>
            <div className="space-y-2">
                {modules.map((mod, idx) => (
                    <div key={idx} className="p-4 border border-outline-variant bg-surface rounded-none hover:border-primary/30 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                             <span className="text-[13px] font-bold text-on-surface">{mod.module_name}</span>
                            <span className={cn(
                                "text-[10px] font-black uppercase px-2 py-1 rounded-none",
                                mod.status === 'completed' ? "bg-green-500/10 text-green-500" : "bg-primary text-on-primary"
                            )}>
                                {mod.status}
                            </span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-mono whitespace-nowrap">
                                <span className="text-on-surface-variant">Quality Score: <span className="text-primary font-bold">{mod.quality_score.toFixed(1)}%</span></span>
                                <span className="text-on-surface-variant">Coverage: <span className="text-secondary font-bold">{(mod.requirement_coverage * 100).toFixed(0)}%</span></span>
                            </div>
                            <div className="w-full h-1.5 bg-surface-high rounded-none overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${mod.progress_pct}%` }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const MilestonesTab = ({ milestones }: { milestones: Milestone[] }) => (
    <div className="space-y-4">
        {milestones.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-outline-variant rounded-none opacity-50">
                <Target size={32} className="mx-auto mb-4" />
                <p className="text-[11px] font-bold uppercase tracking-widest">No Milestones Defined</p>
            </div>
        ) : (
            <div className="relative border-l border-white/10 ml-4 pl-6 space-y-8 py-4">
                {milestones.map((ms, idx) => (
                    <div key={idx} className="relative group/ms">
                        {/* Node */}
                        <div className={cn(
                            "absolute -left-[30px] top-1 w-3 h-3 rounded-none border-2 z-10 transition-colors",
                            ms.status === 'completed' ? "bg-green-500 border-green-500" :
                                ms.status === 'in_progress' ? "bg-primary border-primary" :
                                    ms.status === 'overdue' ? "bg-red-500 border-red-500" :
                                        "bg-surface border-outline-variant"
                        )} />

                        <div className="p-4 border border-outline-variant bg-surface rounded-none hover:border-primary/20 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[14px] font-bold text-on-surface font-editorial tracking-wide">{ms.title}</h4>
                                <div className="flex items-center space-x-3 text-[10px] font-mono text-on-surface-variant">
                                    {ms.target_date && (
                                        <span className="flex items-center"><Clock size={12} className="mr-1" /> {ms.target_date.split('T')[0]}</span>
                                    )}
                                    <span className="font-bold">{ms.progress_pct.toFixed(0)}%</span>
                                </div>
                            </div>
                            {ms.description && <p className="text-[12px] text-on-surface/70 mb-4">{ms.description}</p>}
                            <div className="w-full h-1 bg-surface-high rounded-none overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full transition-all duration-500",
                                        ms.status === 'overdue' ? "bg-red-500" : "bg-primary"
                                    )}
                                    style={{ width: `${ms.progress_pct}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);

const RisksTab = ({ risks }: { risks: RiskItem[] }) => (
    <div className="space-y-4">
        {risks.length === 0 ? (
            <div className="p-8 text-center bg-green-500/5 border border-green-500/20 rounded-none text-green-500">
                <CheckCircle2 size={32} className="mx-auto mb-4 opacity-80" />
                <p className="text-[11px] font-bold uppercase tracking-widest">No Active System Risks</p>
                <p className="text-[10px] font-mono mt-2 opacity-60">All constraints and milestones nominal.</p>
            </div>
        ) : (
            risks.map((risk, idx) => (
                <div key={idx} className={cn(
                    "p-4 border rounded-none flex items-start space-x-4",
                    risk.severity === 'critical' ? "bg-red-500/10 border-red-500/30 text-red-500" : "bg-amber-500/10 border-amber-500/30 text-amber-500"
                )}>
                    <div className="p-2 bg-on-surface/5 rounded-none">
                        {risk.severity === 'critical' ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
                    </div>
                    <div>
                        <h4 className="text-[13px] font-bold tracking-tight mb-1">{risk.title}</h4>
                        <p className="text-[11px] opacity-80 leading-relaxed font-mono">{risk.detail}</p>
                    </div>
                </div>
            ))
        )}
    </div>
);

const ReportsTab = ({ report, isGenerating, onGenerate }: any) => (
    <div className="space-y-6">
        <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full py-4 border border-outline-variant bg-surface hover:bg-primary/10 hover:border-primary/30 rounded-none transition-all flex flex-col items-center justify-center space-y-2 group"
        >
            {isGenerating ? (
                <RefreshCcw size={24} className="animate-spin text-primary" />
            ) : (
                <FileOutput size={24} className="text-on-surface-variant group-hover:text-primary transition-colors" />
            )}
            <span className="text-[11px] font-black uppercase tracking-widest text-on-surface group-hover:text-primary transition-colors">
                {isGenerating ? 'Compiling Analysis...' : 'Generate New Analytical Report'}
            </span>
        </button>

        {report && (
            <div className="p-6 border border-outline-variant bg-surface rounded-none space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="border-b border-outline-variant pb-4">
                    <h3 className="text-[16px] font-black uppercase tracking-wider font-editorial">{report.project_name} - Intelligence Report</h3>
                    <p className="text-[10px] font-mono text-on-surface-variant mt-1">Generated: {new Date(report.generated_at).toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-surface-container rounded-none">
                        <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Overall Quality</p>
                        <p className="text-2xl font-black text-primary font-mono">{report.sections.quality_summary.overall_quality.toFixed(1)}%</p>
                    </div>
                    <div className="p-4 bg-surface-container rounded-none">
                        <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Requirement Coverage</p>
                        <p className="text-2xl font-black text-secondary font-mono">{report.sections.requirement_coverage.overall_coverage.toFixed(1)}%</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <h4 className="text-[11px] font-bold uppercase text-on-surface-variant">Quality Vectors</h4>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 border border-outline-variant rounded-none">
                            <p className="text-[9px] uppercase font-bold text-on-surface-variant">Logic</p>
                            <p className="text-[12px] font-mono text-on-surface mt-1">{report.sections.quality_summary.avg_logic.toFixed(1)}</p>
                        </div>
                        <div className="text-center p-2 border border-outline-variant rounded-none">
                            <p className="text-[9px] uppercase font-bold text-on-surface-variant">Style</p>
                            <p className="text-[12px] font-mono text-on-surface mt-1">{report.sections.quality_summary.avg_style.toFixed(1)}</p>
                        </div>
                        <div className="text-center p-2 border border-outline-variant rounded-none">
                            <p className="text-[9px] uppercase font-bold text-on-surface-variant">Coverage</p>
                            <p className="text-[12px] font-mono text-on-surface mt-1">{report.sections.quality_summary.avg_coverage.toFixed(1)}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
);
