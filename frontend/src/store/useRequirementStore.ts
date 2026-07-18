import { createWithEqualityFn } from 'zustand/traditional';

export interface Requirement {
    id: number;
    module_id: number;
    requirement_text: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'pending' | 'implemented' | 'verified';
    created_at?: string;
}

interface RequirementState {
    requirements: Requirement[];
    suggestions: string[];
    isLoading: boolean;
    isSuggesting: boolean;
    isInitialized: boolean;
    error: string | null;
    fetchRequirements: () => Promise<void>;
    addRequirement: (text: string, priority: Requirement['priority']) => Promise<void>;
    updateRequirementStatus: (id: number, status: Requirement['status']) => Promise<void>;
    fetchSuggestions: (code: string) => Promise<void>;
    dismissSuggestion: (text: string) => void;
}

export const useRequirementStore = createWithEqualityFn<RequirementState>((set: any, get: any) => ({
    requirements: [],
    suggestions: [],
    isLoading: false,
    isSuggesting: false,
    isInitialized: false,
    error: null,

    fetchSuggestions: async (code: string) => {
        set({ isSuggesting: true });
        try {
            const response = await fetch('http://localhost:8000/api/v1/requirements/neural-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            if (!response.ok) throw new Error("Suggestion engine offline.");
            const data = await response.json();
            set({ suggestions: data, isSuggesting: false });
        } catch (err: any) {
            set({ isSuggesting: false });
            console.error("Neural Suggest Error:", err.message);
        }
    },

    dismissSuggestion: (text: string) => {
        set((state: RequirementState) => ({
            suggestions: state.suggestions.filter(s => s !== text)
        }));
    },

    fetchRequirements: async () => {
        if (get().isInitialized || get().isLoading) return;
        
        set({ isLoading: true, error: null });
        try {
            const response = await fetch('http://localhost:8000/api/v1/requirements/');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || "Database synchronization failed.");
            }
            const data = await response.json();
            set({ requirements: data, isLoading: false, isInitialized: true });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
            console.error("CodeAps Node Error:", err.message);
        }
    },

    addRequirement: async (text: string, priority: Requirement['priority']) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch('http://localhost:8000/api/v1/requirements/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    module_id: 1, 
                    requirement_text: text,
                    priority: priority
                })
            });
            if (!response.ok) throw new Error("Sync failure on write.");
            const newReq = await response.json();
            set((state: RequirementState) => ({ 
                requirements: [...state.requirements, newReq],
                isLoading: false 
            }));
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    updateRequirementStatus: async (id: number, status: Requirement['status']) => {
        const prev = get().requirements;
        set((state: RequirementState) => ({
            requirements: state.requirements.map((r: Requirement) => r.id === id ? { ...r, status } : r)
        }));

        try {
            const response = await fetch(`http://localhost:8000/api/v1/requirements/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (!response.ok) throw new Error("Sync failure on status patch.");
        } catch (err: any) {
            set({ requirements: prev, error: err.message });
        }
    }
}));
