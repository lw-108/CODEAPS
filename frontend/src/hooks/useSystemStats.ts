import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

export interface SystemStats {
    cpu_usage: number;
    memory_used: number;
    memory_total: number;
    memory_percentage: number;
}

export const useSystemStats = (intervalMs: number = 2000) => {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const fetchStats = async () => {
            try {
                // SHIELDED INVOKE: Prevents "callback id not found" warnings on session reload
                const data = await (invoke as any)('get_system_stats') as SystemStats;
                
                if (mounted) {
                    setStats(data);
                    setError(null);
                }
            } catch (err: any) {
                // Filter out harmless Tauri internal callback warnings during Vite hot-reloads
                const errStr = err.toString();
                if (errStr.includes('callback')) return;
                
                if (mounted) {
                    console.error('CodeAps Stats Error:', errStr);
                    setError(errStr);
                }
            }
        };

        // Immediate first fetch
        fetchStats();
        
        const timer = setInterval(fetchStats, intervalMs);
        
        return () => {
            mounted = false;
            clearInterval(timer);
        };
    }, [intervalMs]);

    return { stats, error };
};
