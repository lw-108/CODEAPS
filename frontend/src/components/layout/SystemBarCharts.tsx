import React, { memo } from 'react';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { useEditorStore } from '@/store/useEditorStore';

export const SystemBarCharts = memo(() => {
  const { fileResults, visibilitySettings } = useAnalysisStore();
  const { activeFile } = useEditorStore();

  const currentResult = activeFile ? fileResults[activeFile] : null;
  const systemBars = currentResult?.systemBars || { heap: 0, stack: 0, cpu: 0, io: 0 };

  const metrics = [
    { label: 'Heap', value: systemBars.heap, color: 'var(--primary)', unit: 'MB' },
    { label: 'Stack', value: systemBars.stack, color: 'var(--primary-dim)', unit: 'KB' },
    { label: 'CPU', value: systemBars.cpu, color: 'var(--primary)', unit: '%' },
    { label: 'I/O', value: systemBars.io, color: '#33AACC', unit: 'ops/s' }, // Kept as unique system color for variety
  ];

  if (!visibilitySettings.showBars) return null;

  return (
    <div className="w-full bg-surface-low backdrop-blur-md rounded-none p-5 border border-outline-variant space-y-4 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -mr-12 -mt-12 rounded-none" />
      <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 border-b border-outline-variant pb-2 flex items-center">
        <div className="w-1 h-3 bg-primary mr-2 rounded-none" />
        System Resource Reactions
      </h3>
      
      <div className="space-y-4 relative z-10">
        {metrics.map((m) => (
          <div key={m.label} className="group relative">
            <div className="flex justify-between items-center mb-1.5 px-1">
              <span className="text-[10px] font-bold text-on-surface/60 group-hover:text-primary transition-colors uppercase tracking-wider">
                {m.label}
              </span>
              <span className="text-[10px] font-black text-on-surface-variant/40 tabular-nums">
                {m.value}{m.unit}
              </span>
            </div>
            
            <div className="h-1.5 w-full bg-on-surface/5 rounded-none overflow-hidden border border-outline-variant">
              <div 
                className="h-full rounded-none transition-all duration-1000 ease-in-out relative"
                style={{ 
                  width: `${Math.min(m.value, 100)}%`,
                  backgroundColor: m.color,
                  boxShadow: m.color.startsWith('var') ? `0 0 12px var(--primary-rgb)44` : `0 0 12px ${m.color}44`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-on-surface/20 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

SystemBarCharts.displayName = 'SystemBarCharts';
