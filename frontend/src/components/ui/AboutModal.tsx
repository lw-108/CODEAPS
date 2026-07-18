import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Cpu, Globe, Target, Terminal, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';
import Royaltylogo from '@/assets/Royaltylogo.png';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-none overflow-hidden shadow-[0_0_100px_rgba(255,69,0,0.1)]"
                    >
                        {/* Header Branding */}
                        <div className="relative h-48 bg-gradient-to-br from-orange-500/20 via-transparent to-transparent p-10 flex flex-col justify-end">
                            <button 
                                onClick={onClose}
                                className="absolute top-8 right-8 p-2 rounded-none bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                            
                            <div className="flex items-center space-x-4 mb-2">
                                <div className="p-3 rounded-none bg-orange-500 text-black shadow-[0_0_30px_rgba(255,69,0,0.4)]">
                                    <ShieldCheck size={28} />
                                </div>
                                <div>
                                    <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase font-editorial">CodeAps</h1>
                                </div>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="p-10 pt-6 space-y-10 custom-scrollbar max-h-[60vh] overflow-y-auto">
                            {/* Version Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-none bg-white/[0.02] border border-white/5 space-y-1">
                                    <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">Release Identity</div>
                                    <div className="text-xs font-bold text-white uppercase tracking-tight">v5.0-FINAL-PRODUCTION</div>
                                </div>
                                <div className="p-4 rounded-none bg-white/[0.02] border border-white/5 space-y-1">
                                    <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">Neural Link Build</div>
                                    <div className="text-xs font-bold text-white uppercase tracking-tight">2026.04.RC1</div>
                                </div>
                            </div>

                            {/* Legacy & Inspiration */}
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2 text-white/40 mb-2">
                                    <Fingerprint size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Architectural Foundation</span>
                                </div>
                                <p className="text-sm font-medium text-white/60 leading-relaxed italic">
                                    "CodeAps is a tribute to complexity and loyalty. Inspired by the systemic depth of San Andreas and built for the architects of the future. Every line of code serves the purpose of universal intelligence."
                                </p>
                            </div>

                            {/* Core Modules Status */}
                            <div className="space-y-4">
                                <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">System Integrity</div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { icon: <Cpu />, name: 'Kinetic', status: 'Optimal' },
                                        { icon: <Target />, name: 'Archive', status: 'Secured' },
                                        { icon: <Globe />, name: 'Neural', status: 'Synced' }
                                    ].map(mod => (
                                        <div key={mod.name} className="flex flex-col items-center p-3 rounded-none bg-white/[0.01] border border-white/5 space-y-2">
                                            <div className="text-orange-500/60 lowercase">{mod.icon}</div>
                                            <div className="text-[10px] font-black uppercase text-white/80">{mod.name}</div>
                                            <div className="text-[8px] font-bold text-green-500/40 uppercase tracking-widest">{mod.status}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Signature */}
                            <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                <a 
                                    href="https://lw19.vercel.app/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-3 group"
                                >
                                    <img src={Royaltylogo} alt="Royalty" className="w-10 h-10 object-contain mix-blend-screen group-hover:scale-110 transition-transform" />
                                    <div className="space-y-0.5">
                                        <div className="text-[10px] font-black text-white transition-colors group-hover:text-orange-500 uppercase tracking-widest">M.K.Lingeshwarma</div>
                                        <div className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em]">Lead System Architect</div>
                                    </div>
                                </a>
                                
                                <div className="text-right">
                                    <div className="text-[8px] font-black text-white/10 uppercase tracking-[0.5em] mb-1">Neural Ghost Technology</div>
                                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Est. 2026 // Global Suite</div>
                                </div>
                            </div>
                        </div>

                        {/* Decorative Background Glitch */}
                        <div className="absolute -left-20 -bottom-20 opacity-[0.03] select-none pointer-events-none">
                            <Terminal size={300} />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
