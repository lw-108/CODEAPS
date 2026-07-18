import React, { memo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { useEditorStore } from '@/store/useEditorStore';

export const RadarDashboard = memo(() => {
  const { fileResults, visibilitySettings } = useAnalysisStore();
  const { activeFile } = useEditorStore();

  const currentResult = activeFile ? fileResults[activeFile] : null;
  const radarMetrics = currentResult?.radarMetrics || {
    scalability: 0,
    maintainability: 0,
    memoryEfficiency: 0,
    cpuUsage: 0,
    ioEfficiency: 0,
    concurrency: 0,
  };

  const data = [
    { subject: 'Scalability', A: Number(radarMetrics.scalability) || 0, fullMark: 100 },
    { subject: 'Maintainability', A: Number(radarMetrics.maintainability) || 0, fullMark: 100 },
    { subject: 'Memory', A: Number(radarMetrics.memoryEfficiency) || 0, fullMark: 100 },
    { subject: 'CPU', A: Number(radarMetrics.cpuUsage) || 0, fullMark: 100 },
    { subject: 'I/O', A: Number(radarMetrics.ioEfficiency) || 0, fullMark: 100 },
    { subject: 'Concurrency', A: Number(radarMetrics.concurrency) || 0, fullMark: 100 },
  ];

  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!visibilitySettings.showRadar) return null;

  return (
    <div className="w-full h-64 bg-surface/80 backdrop-blur-md rounded-none p-4 border border-outline-variant shadow-2xl relative overflow-hidden group flex flex-col">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-50 group-hover:opacity-100 transition-opacity" />
      <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-2 flex items-center">
        <div className="w-1.5 h-1.5 rounded-none bg-primary mr-2 animate-pulse" />
        Neural Radar Metrics
      </h3>
      
      <div className="flex-1 relative w-full h-full min-h-[200px]" style={{ minHeight: '200px' }}>
        {isMounted && (
          <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10} debounce={100}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.length > 0 ? data : []}>
              <PolarGrid stroke="var(--outline-variant)" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: 'var(--on-surface-variant)', fontSize: 8, fontWeight: 'bold' }} 
              />
              <Radar
                name="Metrics"
                dataKey="A"
                stroke="var(--primary)"
                fill="var(--primary)"
                fillOpacity={0.3}
                animationBegin={0}
                animationDuration={800}
                isAnimationActive={true}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--surface)', 
                  border: '1px solid var(--outline-variant)', 
                  borderRadius: '8px', 
                  fontSize: '10px',
                  color: 'var(--on-surface)',
                  backdropFilter: 'blur(10px)'
                }}
                itemStyle={{ color: 'var(--primary)' }}
                cursor={{ stroke: 'var(--primary)', strokeWidth: 1 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
});

RadarDashboard.displayName = 'RadarDashboard';
