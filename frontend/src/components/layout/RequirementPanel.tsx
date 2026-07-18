import React, { useState, useEffect } from 'react';
import { ListChecks, Plus, Target, ShieldAlert, CheckCircle2, ChevronRight, Zap, Target as TargetIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

import { useRequirementStore, Requirement } from '@/store/useRequirementStore';
import { useEditorStore } from '@/store/useEditorStore';

export const RequirementPanel = () => {
    const { 
        requirements, 
        isLoading, 
        fetchRequirements, 
        addRequirement, 
        updateRequirementStatus
    } = useRequirementStore();
    
    const [isAdding, setIsAdding] = useState(false);
    const [newReq, setNewReq] = useState('');
    const [priority, setPriority] = useState<Requirement['priority']>('medium');

    useEffect(() => {
        fetchRequirements();
    }, [fetchRequirements]);

    const handleAdd = () => {
        if (!newReq.trim()) return;
        addRequirement(newReq.trim(), priority);
        setNewReq('');
        setIsAdding(false);
    };

    const toggleStatus = (req: Requirement) => {
        const nextStatus = req.status === 'pending' ? 'implemented' : (req.status === 'implemented' ? 'verified' : 'pending');
        updateRequirementStatus(req.id, nextStatus);
    };

    return (
        <div className="flex flex-col h-full bg-background text-on-surface font-functional relative overflow-hidden">
            {/* Header */}
            <div className="h-14 px-6 flex items-center justify-between bg-surface border-b border-outline-variant shrink-0">
                <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-none bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface">Neural Lifecycle</span>
                </div>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="p-1.5 rounded-none bg-on-surface/[0.02] border border-outline-variant hover:bg-primary hover:text-on-primary transition-all group"
                >
                    <Plus size={14} className={cn("transition-transform", isAdding && "rotate-45")} />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 min-h-0 overflow-y-auto premium-scroll p-6 pb-20 space-y-6 overscroll-contain">
                <AnimatePresence>
                    {isAdding && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-surface-low border border-primary/20 rounded-none p-4 space-y-4 shadow-2xl">
                                <textarea 
                                    value={newReq}
                                    onChange={(e) => setNewReq(e.target.value)}
                                    placeholder="Enter requirement..."
                                    className="w-full bg-background border border-outline-variant p-3 text-[11px] outline-none focus:border-primary/40 min-h-[80px] rounded-none"
                                />
                                <div className="flex items-center justify-between">
                                    <div className="flex space-x-2">
                                        {(['low', 'medium', 'high', 'critical'] as const).map(p => (
                                            <button 
                                                key={p}
                                                onClick={() => setPriority(p)}
                                                className={cn(
                                                    "px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-none border",
                                                    priority === p ? "bg-primary text-on-primary border-primary" : "bg-on-surface/[0.02] text-on-surface-variant/40 border-outline-variant"
                                                )}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={handleAdd}
                                        className="px-4 py-1.5 bg-primary text-on-primary text-[9px] font-black uppercase tracking-widest rounded-none hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                                    >
                                        Deploy
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-4">
                    {requirements.map((req: Requirement, idx: number) => (
                        <div 
                            key={req.id}
                            className="group bg-surface-low border border-outline-variant p-4 rounded-none hover:border-primary/30 transition-all relative overflow-hidden"
                        >
                            <div className="flex items-start justify-between relative z-10">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <span className={cn(
                                            "px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.2em] border rounded-none",
                                            req.priority === 'critical' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                            req.priority === 'high' ? "bg-primary/10 text-primary border-primary/20" :
                                            "bg-on-surface/5 text-on-surface-variant/60 border-outline-variant"
                                        )}>
                                            {req.priority}
                                        </span>
                                    </div>
                                    <p className={cn(
                                        "text-[12px] leading-relaxed",
                                        req.status === 'verified' ? "text-on-surface/30 line-through" : "text-on-surface/80"
                                    )}>
                                        {req.requirement_text}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => toggleStatus(req)}
                                    className={cn(
                                        "shrink-0 ml-4 p-2 cursor-pointer",
                                        req.status === 'verified' ? "text-green-500" :
                                        req.status === 'implemented' ? "text-primary animate-pulse" : "text-on-surface-variant/20"
                                    )}
                                >
                                    {req.status === 'verified' ? <CheckCircle2 size={16} /> : <Zap size={16} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {isLoading && (
                    <div className="flex flex-col items-center justify-center p-20 space-y-4 opacity-30">
                        <TargetIcon size={32} className="animate-spin text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Scanning History...</span>
                    </div>
                )}
            </div>
        </div>
    );
};
