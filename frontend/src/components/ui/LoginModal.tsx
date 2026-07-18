import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, ArrowRight, ShieldCheck, X, Activity } from 'lucide-react';
import { useLayoutStore } from '@/store/useLayoutStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';

export const LoginModal = () => {
    const { isLoginVisible, setLoginVisible } = useLayoutStore();
    const { login } = useAuthStore();
    const [isRegistering, setIsRegistering] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            if (isRegistering) {
                // Registration Logic
                const response = await fetch('http://127.0.0.1:8000/api/v1/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        email,
                        password,
                        full_name: fullName,
                        role: 'architect'
                    })
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.detail || "Registration Failed");
                }
                setIsRegistering(false);
                setError("Account Initialized. Accessing System...");
                setTimeout(() => setError(null), 3000);
            } else {
                await login(username, password);
                setLoginVisible(false);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isLoginVisible) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-0">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
                    onClick={() => setLoginVisible(false)}
                />
                
                <motion.div 
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-none overflow-hidden shadow-2xl relative z-10"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Cinematic Header Overlay */}
                    <div className="absolute top-0 left-0 w-full h-[150px] bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none" />
                    
                    <div className="p-8 sm:p-12 relative z-20">
                        <div className="flex justify-between items-start mb-6">
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-orange-500">
                                    <ShieldCheck size={18} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Executive Identity</span>
                                </div>
                                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase font-editorial">
                                    {isRegistering ? 'Initialize Identity' : 'Secure Entry'}
                                </h2>
                            </div>
                            <button 
                                onClick={() => setLoginVisible(false)}
                                className="p-2 text-white/20 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "mb-6 p-3 rounded-none text-[10px] font-bold uppercase tracking-widest text-center",
                                    error.includes("Initialized") ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                                )}
                            >
                                {error}
                            </motion.div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-6">
                            {isRegistering && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6"
                                >
                                    <InputGroup 
                                        icon={<User size={16} />} 
                                        type="text" 
                                        placeholder="Full Name" 
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                    <InputGroup 
                                        icon={<Activity size={16} />} 
                                        type="email" 
                                        placeholder="Organizational Email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </motion.div>
                            )}

                            <InputGroup 
                                icon={<User size={16} />} 
                                type="text" 
                                placeholder="Username" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                            <InputGroup 
                                icon={<Lock size={16} />} 
                                type="password" 
                                placeholder="Neural Key" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full group mt-8 py-4 bg-orange-500 text-black font-black uppercase tracking-[0.2em] text-[11px] rounded-none flex items-center justify-center space-x-3 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,69,0,0.3)]"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-none animate-spin" />
                                        <span>Syncing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{isRegistering ? 'Initialize' : 'Enter System'}</span>
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-8 border-t border-white/5 flex flex-col items-center space-y-4">
                            <button 
                                onClick={() => setIsRegistering(!isRegistering)}
                                className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-orange-500 transition-colors"
                            >
                                {isRegistering ? 'Awaiting Access? Enter System' : 'New Architect? Initialize Identity'}
                            </button>
                            <span className="text-[8px] text-white/10 italic">Secured by CodeAps Executive v5.0</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

const InputGroup = ({ icon, ...props }: { icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-orange-500 transition-colors">
            {icon}
        </div>
        <input 
            {...props}
            className="w-full bg-white/[0.03] border border-white/10 rounded-none pl-12 pr-4 py-4 text-[12px] text-white placeholder:text-white/10 outline-none focus:border-orange-500/40 focus:bg-white/[0.05] transition-all font-functional"
        />
    </div>
);
