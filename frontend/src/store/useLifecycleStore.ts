import { createWithEqualityFn } from 'zustand/traditional';
import { persist } from 'zustand/middleware';

// ─── Types ──────────────────────────────────────────────────────

export interface Milestone {
    id: number;
    project_id: number;
    title: string;
    description?: string;
    target_date?: string;
    status: 'planned' | 'in_progress' | 'completed' | 'overdue';
    progress_pct: number;
    order_index: number;
    created_at?: string;
}

export interface ModuleProgress {
    module_id: number;
    module_name: string;
    status: string;
    progress_pct: number;
    requirement_coverage: number;
    quality_score: number;
    total_requirements: number;
    satisfied_requirements: number;
}

export interface RiskItem {
    type: string;
    severity: 'critical' | 'warning';
    title: string;
    detail: string;
    entity_id: number | null;
}

export interface ProjectReport {
    report_id: string;
    project_name: string;
    generated_at: string;
    overall_progress: number;
    total_modules: number;
    completed_modules: number;
    sections: {
        requirement_coverage: {
            modules: Array<{
                module_id: number;
                module_name: string;
                total_requirements: number;
                implemented: number;
                verified: number;
                pending: number;
                coverage_pct: number;
            }>;
            overall_coverage: number;
            total_requirements: number;
            total_satisfied: number;
        };
        milestone_adherence: {
            items: Array<{
                id: number;
                title: string;
                target_date: string | null;
                status: string;
                progress_pct: number;
                adherence: 'on_track' | 'at_risk' | 'overdue';
                linked_modules: number;
            }>;
            summary: {
                total: number;
                on_track: number;
                at_risk: number;
                overdue: number;
                completed: number;
            };
        };
        risk_indicators: {
            total_risks: number;
            critical: number;
            warnings: number;
            items: RiskItem[];
        };
        deviation_patterns: {
            items: Array<{
                milestone: string;
                expected_progress: number;
                actual_progress: number;
                deviation: number;
                status: 'ahead' | 'behind' | 'on_track';
            }>;
            avg_deviation: number;
        };
        quality_summary: {
            avg_coverage: number;
            avg_logic: number;
            avg_style: number;
            overall_quality: number;
            modules_analyzed: number;
        };
    };
}

// ─── Store ──────────────────────────────────────────────────────

interface LifecycleState {
    milestones: Milestone[];
    moduleProgress: ModuleProgress[];
    overallProgress: number;
    risks: RiskItem[];
    report: ProjectReport | null;
    isLoading: boolean;
    isGeneratingReport: boolean;
    error: string | null;
    activeProjectId: number;

    setActiveProject: (id: number) => void;
    fetchMilestones: (projectId?: number) => Promise<void>;
    createMilestone: (data: { project_id: number; title: string; description?: string; target_date?: string; order_index?: number }) => Promise<void>;
    updateMilestone: (id: number, data: Partial<Milestone>) => Promise<void>;
    deleteMilestone: (id: number) => Promise<void>;
    fetchProgress: (projectId?: number) => Promise<void>;
    fetchRisks: (projectId?: number) => Promise<void>;
    generateReport: (projectId?: number) => Promise<void>;
}

const API_BASE = 'http://127.0.0.1:8000/api/v1';

export const useLifecycleStore = createWithEqualityFn(
    persist<LifecycleState>(
        (set, get) => ({
            milestones: [],
            moduleProgress: [],
            overallProgress: 0,
            risks: [],
            report: null,
            isLoading: false,
            isGeneratingReport: false,
            error: null,
            activeProjectId: 1,

            setActiveProject: (id: number) => set({ activeProjectId: id }),

            fetchMilestones: async (projectId?: number) => {
                const pid = projectId || (get() as LifecycleState).activeProjectId;
                if (!pid) return;
                set({ isLoading: true, error: null });
                try {
                    const res = await fetch(`${API_BASE}/milestones/?project_id=${pid}`);
                    if (!res.ok) throw new Error('Failed to fetch milestones');
                    const data = await res.json();
                    set({ milestones: data, isLoading: false });
                } catch (err: any) {
                    set({ error: err.message, isLoading: false });
                }
            },

            createMilestone: async (data: { project_id: number; title: string; description?: string; target_date?: string; order_index?: number }) => {
                set({ isLoading: true, error: null });
                try {
                    const res = await fetch(`${API_BASE}/milestones/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });
                    if (!res.ok) throw new Error('Failed to create milestone');
                    const created = await res.json();
                    set((s: LifecycleState) => ({ milestones: [...s.milestones, created], isLoading: false }));
                } catch (err: any) {
                    set({ error: err.message, isLoading: false });
                }
            },

            updateMilestone: async (id: number, data: Partial<Milestone>) => {
                try {
                    const res = await fetch(`${API_BASE}/milestones/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });
                    if (!res.ok) throw new Error('Failed to update milestone');
                    const updated = await res.json();
                    set((s: LifecycleState) => ({
                        milestones: s.milestones.map((m: Milestone) => (m.id === id ? updated : m)),
                    }));
                } catch (err: any) {
                    set({ error: err.message });
                }
            },

            deleteMilestone: async (id: number) => {
                try {
                    const res = await fetch(`${API_BASE}/milestones/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete milestone');
                    set((s: LifecycleState) => ({ milestones: s.milestones.filter((m: Milestone) => m.id !== id) }));
                } catch (err: any) {
                    set({ error: err.message });
                }
            },

            fetchProgress: async (projectId?: number) => {
                const pid = projectId || (get() as LifecycleState).activeProjectId;
                if (!pid) return;
                set({ isLoading: true, error: null });
                try {
                    const res = await fetch(`${API_BASE}/lifecycle/progress/${pid}`);
                    if (!res.ok) throw new Error('Failed to fetch progress');
                    const data = await res.json();
                    set({
                        moduleProgress: data.modules || [],
                        overallProgress: data.overall_progress || 0,
                        isLoading: false,
                    });
                } catch (err: any) {
                    set({ error: err.message, isLoading: false });
                }
            },

            fetchRisks: async (projectId?: number) => {
                const pid = projectId || (get() as LifecycleState).activeProjectId;
                if (!pid) return;
                set({ isLoading: true, error: null });
                try {
                    const res = await fetch(`${API_BASE}/lifecycle/risks/${pid}`);
                    if (!res.ok) throw new Error('Failed to fetch risks');
                    const data = await res.json();
                    set({ risks: data.items || [], isLoading: false });
                } catch (err: any) {
                    set({ error: err.message, isLoading: false });
                }
            },

            generateReport: async (projectId?: number) => {
                const pid = projectId || (get() as LifecycleState).activeProjectId;
                if (!pid) return;
                set({ isGeneratingReport: true, error: null });
                try {
                    const res = await fetch(`${API_BASE}/lifecycle/report/${pid}`);
                    if (!res.ok) throw new Error('Failed to generate report');
                    const data = await res.json();
                    set({ report: data, isGeneratingReport: false });
                } catch (err: any) {
                    set({ error: err.message, isGeneratingReport: false });
                }
            },
        }),
        {
            name: 'codeaps-lifecycle-storage',
        }
    )
);
