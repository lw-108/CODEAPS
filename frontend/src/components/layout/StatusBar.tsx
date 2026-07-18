import React from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { 
  CheckCircle2, Globe, Cpu, Bell, Activity, 
  Zap, Eye, EyeOff, Target 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStats } from '@/hooks/useSystemStats';
import { useLayoutStore } from '@/store/useLayoutStore';
import { useRequirementStore } from '@/store/useRequirementStore';
import { AboutModal } from '@/components/ui/AboutModal';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import Royaltylogo from '@/assets/Royaltylogo.png';

export const StatusBar = () => {
  const { activeFile, tabs } = useEditorStore();
  const activeTab = tabs.find((t: any) => t.filename === activeFile);
  const { stats } = useSystemStats(2000);
  const { isWelcomeVisible, toggleWelcome } = useLayoutStore();
  const { isLoading: isLoadingRequirements } = useRequirementStore();
  const { isWorkspaceOpen } = useWorkspaceStore();
  const [showCredits, setShowCredits] = React.useState(false);
  const [showAbout, setShowAbout] = React.useState(false);
  const latency = stats ? `${Math.floor(15 + Math.random() * 5)} MS` : '0 MS';
  const isOnWelcomeScreen = !isWorkspaceOpen && tabs.length === 0;

  return (
    <div className="h-12 fixed bottom-0 left-0 w-full z-50 px-6 flex items-center justify-between pointer-events-none">
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      
      {/* Left-aligned Zenith Eye Module */}
      <div className="flex items-center space-x-3 pointer-events-auto relative">
        {isOnWelcomeScreen && (
          <>
            <button 
              onClick={toggleWelcome}
              className="p-2.5 rounded-none bg-black/40 backdrop-blur-xl border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all cursor-pointer group flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)]"
              title={isWelcomeVisible ? "Neural Zen (Hide UI)" : "Restore Dashboard"}
            >
              {isWelcomeVisible ? <Eye size={18} /> : <EyeOff size={18} className="text-primary" />}
            </button>

            <button 
              onClick={() => setShowCredits(true)}
              className="p-2.5 rounded-none bg-black/40 backdrop-blur-xl border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all cursor-pointer group flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden"
              title="System Credits"
            >
              <img src="/CJ.png" className="w-[18px] h-[18px] object-cover opacity-100 group-hover:scale-110 transition-transform" alt="Credits" />
            </button>
          </>
        )}


      </div>

      <AnimatePresence>
        {showCredits && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl pointer-events-auto"
            onClick={() => setShowCredits(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg p-12 bg-zinc-950 border border-white/10 relative overflow-hidden"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowCredits(false)}
                className="absolute top-6 right-6 font-['Montserrat'] font-bold text-white/20 hover:text-white transition-colors cursor-pointer text-2xl"
              >
                X
              </button>
              
              <div className="space-y-12 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
                <a 
                  href="https://lw19.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block space-y-4 group no-underline"
                >
                  <div className="text-[10px] font-black text-primary uppercase tracking-[0.5em]">System Architect</div>
                  <h2 className="text-4xl font-extrabold text-white tracking-widest uppercase font-editorial group-hover:text-primary transition-all cursor-pointer">M.K. LINGESHWARMA</h2>
                </a>

                <div className="space-y-6 pt-6 border-t border-white/10">
                  <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">San Andreas Legacy // Since 2018</div>
                  <p className="text-[12px] leading-relaxed text-white/60 font-medium font-sans italic">
                    "Grand Theft Auto: San Andreas is more than a game; it’s a living digital memory. My journey began in 2018. The purple sky in Bone County takes my inner soul's breath into a something soulfully pleasure. From the loyalty of Grove Street to the systemic complexity of its world, San Andreas laid the spiritual foundation for the architectural vision of CodeAps."
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-12 pt-6 border-t border-white/5">
                  <div className="space-y-2">
                    <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Neural Link Foundation</div>
                    <div className="text-[11px] text-white/60 font-medium tracking-tight">CodeAps Executive Suite V3</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Kinetic Core</div>
                    <div className="text-[11px] text-white/60 font-medium tracking-tight">AI-Powered System Engine</div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5 text-center">
                  <p className="text-[9px] text-white/20 uppercase tracking-[0.4em] font-black">
                    Expanding universal high-fidelity intelligence.
                  </p>
                </div>

                <div className="flex items-center justify-center space-x-12 opacity-90 pb-4">
                  <img src="/CJ.png" className="w-24 h-24 rounded-none shadow-2xl" alt="CJ" />
                  <img src="/GTASA.svg" className="w-20 h-20 invert brightness-[1.8]" alt="GTA San Andreas" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isWelcomeVisible && (
        <div className="flex items-center space-x-6 h-full pointer-events-auto">
          {/* Neural Sync Indicator */}
          <AnimatePresence>
              {isLoadingRequirements && (
                  <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/60"
                  >
                      <Target size={14} className="animate-spin-slow" />
                      <span>Neural Sync Active</span>
                  </motion.div>
              )}
          </AnimatePresence>
  
          {/* Royalty Badge (Restored) */}
          <a 
            href="https://lw19.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-3 px-4 py-1.5 bg-black/20 backdrop-blur-md border border-white/5 rounded-none hover:bg-white/5 transition-all group cursor-pointer pointer-events-auto no-underline"
          >
              <img src={Royaltylogo} alt="Royalty" className="w-8 h-8 object-contain mix-blend-screen filter drop-shadow-[0_0_8px_rgba(255,69,0,0.5)]" />
              <span className="text-[10px] font-black text-white/60 tracking-widest uppercase font-editorial group-hover:text-white transition-colors leading-tight">
                  M.K.Lingeshwarma
              </span>
          </a>
        </div>
      )}
    </div>
  );
};
