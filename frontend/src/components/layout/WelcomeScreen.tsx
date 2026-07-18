import React from 'react';
import { FolderOpen, FilePlus, Clock, Code2, Zap, Shield } from 'lucide-react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useEditorStore } from '@/store/useEditorStore';
import { useFileSystem } from '@/hooks/useFileSystem';
import { SUPPORTED_LANGUAGES } from '@/lib/languageMap';
import { useLayoutStore } from '@/store/useLayoutStore';
import { useModalStore } from '@/store/useModalStore';
import { FULL_TEMPLATES } from '@/lib/templates';
import Dither from '@/components/ui/Dither';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/logo.png';
import megaLogo from '@/assets/Royaltylogo.png';
import mountRushmore from '@/assets/MoutRushmore.png';
import heroSpinner from '@/assets/hero_spinner.png';
import planeCemetery from '@/assets/PlaneCemetery.png';
import planeCemetery2 from '@/assets/PlaneCemetery2.png';

export const WelcomeScreen: React.FC = () => {
  const { openWorkspace, recentWorkspaces } = useWorkspaceStore();
  const { openTab, setActiveFile } = useEditorStore();
  const { openFolderDialog } = useFileSystem();
  const { isWelcomeVisible } = useLayoutStore();
  const [currentBg, setCurrentBg] = React.useState(0);
  const [isEntranceLoading, setIsEntranceLoading] = React.useState(true);
  const [loadingProgress, setLoadingProgress] = React.useState(0);
  const backgrounds = [mountRushmore, planeCemetery, planeCemetery2];

  React.useEffect(() => {
    const bgTimer = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % backgrounds.length);
    }, 10000);

    const progressTimer = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 2; // ~50 ticks over 5s
      });
    }, 100);

    const loadingTimer = setTimeout(() => {
      setIsEntranceLoading(false);
    }, 3000); // Elite 3-second cinematic loading

    return () => {
      clearInterval(bgTimer);
      clearInterval(progressTimer);
      clearTimeout(loadingTimer);
    };
  }, []);

  const handleOpenFolder = async () => {
    console.log("🖱️ WelcomeScreen: Clicked 'Open Folder' button");
    try {
      const selected = await openFolderDialog();
      console.log("📂 WelcomeScreen: Dialog returned:", selected);
      if (selected) {
        openWorkspace(selected);
      }
    } catch (err) {
      console.error("❌ WelcomeScreen: handleOpenFolder error:", err);
    }
  };

  const handleNewFile = async () => {
    console.log("🖱️ WelcomeScreen: Clicked 'New File' button");
    const filename = await useModalStore.getState().prompt('Define the identity of the new module (e.g. main.py, hello.js):', '', 'Initialize Module');
    if (filename && filename.trim()) {
      openTab(filename.trim(), '', filename.split('.').pop() || 'plaintext', '');
      setActiveFile(filename.trim());
      // Mark workspace as "open" with no root (untitled mode)
      openWorkspace('__untitled__');
    }
  };

  const handleOpenRecent = (path: string) => {
    console.log("🖱️ WelcomeScreen: Clicked Recent Workspace:", path);
    openWorkspace(path);
  };

  const handleTemplateClick = async (id: string) => {
    const langData = FULL_TEMPLATES[id];
    if (!langData) return;

    // Prepare topics for selection modal
    const topics = Object.keys(langData.topics).map(topicId => ({
      id: topicId,
      label: topicId.replace(/_/g, ' ').toUpperCase()
    }));

    // Expert Selection Modal
    const selectedTopic = await useModalStore.getState().select(
      `Initialize ${id.toUpperCase()} foundation. Select module focus:`,
      topics,
      `${id.toUpperCase()} MODULE EXPLORER`
    );

    if (selectedTopic) {
      const content = langData.topics[selectedTopic];
      const ext = id === 'javascript' ? 'js' : (id === 'typescript' ? 'ts' : (id === 'python' ? 'py' : id)); // Simplified ext mapping
      const fileName = `${id}_${selectedTopic}.${ext}`;

      openTab(fileName, content, id, '');
      setActiveFile(fileName);
      openWorkspace('__untitled__');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    }
  };

  const logoVariants = {
    hidden: { scale: 0.8, opacity: 0, rotate: -10 },
    visible: {
      scale: 1,
      opacity: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        delay: 0.2
      }
    }
  };

  return (
    <div className="h-full w-full relative overflow-hidden bg-background">
      {/* Cinematic Fixed Surface (Dynamic Cycle) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden bg-black">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentBg}
            src={backgrounds[currentBg]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: 'brightness(1.2) contrast(1.05)',
            }}
          />
        </AnimatePresence>

        {/* Subtle high-contrast protective overlay (no blur) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/20 to-black/80" />
      </div>


      {/* Scrollable Content Layer */}
      <div className="absolute inset-0 overflow-y-auto flex flex-col items-center px-4 md:px-0" style={{ zIndex: 10 }}>
        <AnimatePresence>
          {isWelcomeVisible && (
            <motion.div
              key="welcome-content"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: 20, transition: { duration: 0.5 } }}
              className="max-w-6xl w-full pt-[12vh] md:pt-[22vh] pb-32 space-y-24 md:space-y-32 relative"
            >
              {/* Entrance Loading Overlay (The "Neural Command Loading Area") */}
              <AnimatePresence>
                {isEntranceLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 1.5, ease: "easeInOut" } }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black cursor-none overflow-hidden"
                  >
                    {/* Central Logo Core (Floating - Still) */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="relative z-[110] flex flex-col items-center"
                    >
                      <div className="w-80 h-80 md:w-[35rem] md:h-[35rem] flex flex-col items-center justify-center no-underline">
                         {/* Hero Spinner - large responsive spinning wheel */}
                         <img
                           src={heroSpinner}
                           alt="Hero Spinner"
                           className="w-64 h-64 md:w-[30rem] md:h-[30rem] object-contain animate-spin"
                         />
                         {/* Original logo retained for branding */}
                         <img
                           src={logo}
                           alt="Neural Command"
                           className="w-56 h-56 md:w-[28rem] md:h-[28rem] object-contain brightness-110"
                         />
                        <motion.h1
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5, duration: 1 }}
                          className="text-4xl md:text-7xl font-black font-['Montserrat'] text-white tracking-[0.2em] uppercase mt-4 mb-2"
                        >
                          CODEAPS
                        </motion.h1>
                      </div>

                      {/* Technical Progress Section (Shadcn Style) */}
                      <div className="w-64 md:w-96 space-y-4 mt-8">
                        <div className="flex justify-between items-center text-[8px] font-mono text-white/40 uppercase tracking-[0.2em]">
                          <span>Neural Link Baseline</span>
                          <span>{loadingProgress}%</span>
                        </div>
                        {/* Progress Bar Track */}
                        <div className="h-[2px] w-full bg-white/10 relative overflow-hidden">
                          {/* Animated Progress Fill */}
                          <motion.div
                            className="absolute inset-y-0 left-0 bg-white"
                            initial={{ width: "0%" }}
                            animate={{ width: `${loadingProgress}%` }}
                            transition={{ type: "spring", stiffness: 50, damping: 20 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Branding & Title Display (Logo-Less) */}
              {!isEntranceLoading && (
                <div className="flex flex-col items-center justify-center text-center mt-2">
                  {/* Branding Title Block (Absolute Weighted Center) */}
                  <div className="flex flex-col items-center justify-center w-full min-h-[60vh] md:min-h-[70vh] -mt-20">
                    <div className="flex flex-col items-center justify-center w-full space-y-0 no-underline">
                      {/* Line 1: CODE + Unified Neural Seal (Montserrat - Local) */}
                      <div className="flex items-center justify-center space-x-6 md:space-x-12 mb-[-1.5rem] md:mb-[-3rem] z-20">
                        <h1 className="text-[clamp(4.5rem,13vw,13rem)] font-['Montserrat'] font-black text-white tracking-[-0.04em] uppercase leading-none select-none">
                          CODE
                        </h1>

                        {/* Unified Neural Seal */}
                        <div className="relative w-36 h-36 md:w-64 md:h-64 flex items-center justify-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <img src="/seal.png" className="w-full h-full opacity-100" alt="Neural Seal" />
                            <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full overflow-visible">
                              <path id="orbitalPath" d="M 100, 100 m -62, 0 a 62,62 0 1,1 124,0 a 62,62 0 1,1 -124,0" fill="none" />
                              <text className="text-[7.5px] font-black font-mono fill-black uppercase tracking-[0.15em]">
                                <textPath href="#orbitalPath">CODEAPS • RATH • CODEAPS • RATH • CODEAPS • RATH • CODEAPS • RATH • CODEAPS • RATH • CODEAPS • RATH •</textPath>
                              </text>
                            </svg>
                          </motion.div>
                          <img src={logo} alt="CodeAps" className="w-20 h-20 md:w-40 md:h-40 object-contain brightness-110 drop-shadow-[0_0_80px_rgba(255,255,255,0.25)] relative z-10" />
                        </div>
                      </div>

                      {/* Line 2: APS (Michroma - Wide Monolithic Pattern) */}
                      <div className="w-full flex justify-center overflow-visible">
                        <h1 className="text-[clamp(5rem,14vw,15.5rem)] font-['Michroma'] text-white uppercase leading-none select-none tracking-[0.08em] scale-x-115 md:scale-x-125 transform origin-center drop-shadow-[0_0_25px_rgba(255,255,255,0.1)]">
                          APS
                        </h1>
                      </div>
                    </div>
                    <p className="text-[11px] md:text-[16px] font-['Montserrat'] text-white/20 font-block uppercase tracking-[0.3em] md:tracking-[0.6em] leading-relaxed max-w-3xl mx-auto px-6 mt-4 text-center">
                      Neural Architecture Workspace <br />
                      <span className="text-primary/70 font-['Montserrat']  font-medium italic">Initialize session to begin.</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Primary Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <motion.button
                  variants={itemVariants}
                  whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,69,0,0.4)" }}
                  onClick={handleOpenFolder}
                  className="group flex flex-col items-center justify-center p-10 bg-white/[0.02] border border-white/5 transition-all space-y-6 cursor-pointer relative shadow-2xl overflow-hidden"
                >
                  <FolderOpen size={38} className="text-primary transition-transform group-hover:scale-110" />
                  <div className="text-center">
                    <div className="text-[14px] font-block text-white uppercase tracking-[0.2em]">Open Workspace</div>
                    <div className="text-[9px] text-white/30 mt-2 uppercase tracking-widest font-block">Local Filesystem</div>
                  </div>
                </motion.button>

                <motion.button
                  variants={itemVariants}
                  whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,165,0,0.4)" }}
                  onClick={handleOpenFolder} // In real world would trigger special initialization
                  className="group flex flex-col items-center justify-center p-10 bg-white/[0.02] border border-orange-500/20 transition-all space-y-6 cursor-pointer relative shadow-2xl overflow-hidden"
                >
                  <Shield size={38} className="text-orange-500 transition-transform group-hover:scale-110" />
                  <div className="text-center">
                    <div className="text-[14px] font-block text-white uppercase tracking-[0.2em]">Initialize Project</div>
                    <div className="text-[9px] text-white/30 mt-2 uppercase tracking-widest font-block">Enterprise Lifecycle</div>
                  </div>
                </motion.button>

                <motion.button
                  variants={itemVariants}
                  whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(0,191,255,0.4)" }}
                  onClick={handleNewFile}
                  className="group flex flex-col items-center justify-center p-10 bg-white/[0.02] border border-white/5 transition-all space-y-6 cursor-pointer relative shadow-2xl overflow-hidden"
                >
                  <FilePlus size={38} className="text-secondary transition-transform group-hover:scale-110" />
                  <div className="text-center">
                    <div className="text-[14px] font-block text-white uppercase tracking-[0.2em]">New Archive</div>
                    <div className="text-[9px] text-white/30 mt-2 uppercase tracking-widest font-block">Ephemeral Session</div>
                  </div>
                </motion.button>

                <motion.button
                  variants={itemVariants}
                  whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(168,85,247,0.4)" }}
                  onClick={() => {
                    openTab('Documentation', '', 'help', '');
                    setActiveFile('Documentation');
                    openWorkspace('__untitled__');
                  }}
                  className="group flex flex-col items-center justify-center p-10 bg-white/[0.02] border border-purple-500/20 transition-all space-y-6 cursor-pointer relative shadow-2xl overflow-hidden"
                >
                  <Zap size={38} className="text-purple-400 transition-transform group-hover:scale-110" />
                  <div className="text-center">
                    <div className="text-[14px] font-block text-white uppercase tracking-[0.2em]">Get Started</div>
                    <div className="text-[9px] text-white/30 mt-2 uppercase tracking-widest font-block">App Setup & Efficiency</div>
                  </div>
                </motion.button>
              </div>

              {/* Smart Templates */}
              <motion.div className="space-y-6" variants={itemVariants}>
                <div className="flex items-center space-x-3 text-[10px] font-block text-white/30 uppercase tracking-[0.4em]">
                  <Code2 size={14} />
                  <span>Smart Starter Templates</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.keys(FULL_TEMPLATES).map((langId) => (
                    <motion.button
                      key={langId}
                      whileHover={{ y: -8, backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,69,0,0.5)" }}
                      onClick={() => handleTemplateClick(langId)}
                      className="flex items-center space-x-6 p-8 bg-white/[0.01] border border-white/10 transition-all text-left relative overflow-hidden group cursor-pointer shadow-2xl backdrop-blur-md min-h-[120px]"
                    >
                      <div className="p-5 bg-primary/5 border border-primary/20 text-primary transition-transform group-hover:scale-110 grayscale group-hover:grayscale-0 flex items-center justify-center shrink-0">
                        {/* Inline scale-up for icons */}
                        <div className="scale-[1.8]">
                          {SUPPORTED_LANGUAGES.find(l => l.id === langId)?.icon || <Code2 size={24} />}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-[16px] font-black text-white uppercase tracking-[0.1em]">{langId}</div>
                        <div className="text-[9px] text-white/30 mt-2 uppercase font-block tracking-[0.2em] leading-relaxed">
                          Neural Link Foundation<br />
                          <span className="text-primary/40 group-hover:text-primary transition-colors italic">Executive Suite v5.0 Final</span>
                        </div>
                      </div>

                      {/* Absolute subtle background text */}
                      <div className="absolute -bottom-2 -right-2 text-[40px] font-black text-white/[0.02] uppercase pointer-events-none group-hover:text-primary/[0.05] transition-colors">
                        {langId}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Recent Workspaces */}
              {recentWorkspaces.length > 0 && (
                <motion.div className="space-y-6" variants={itemVariants}>
                  <div className="flex items-center space-x-3 text-[10px] font-block text-white/30 uppercase tracking-[0.4em]">
                    <Clock size={14} />
                    <span>Session History</span>
                  </div>
                  <div className="space-y-2">
                    {recentWorkspaces.filter((r: string) => r !== '__untitled__').map((path: string) => (
                      <motion.button
                        key={path}
                        whileHover={{ x: 10, backgroundColor: "rgba(255,255,255,0.03)" }}
                        onClick={() => handleOpenRecent(path)}
                        className="w-full flex items-center space-x-4 px-6 py-4 bg-white/[0.01] border border-white/5 transition-all text-left group cursor-pointer relative"
                      >
                        <FolderOpen size={16} className="text-primary/40 group-hover:text-primary transition-colors shrink-0" />
                        <span className="text-[12px] text-white/60 group-hover:text-white transition-colors truncate font-mono">{path}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Footer */}
              <motion.div className="text-center space-y-10" variants={itemVariants}>
                <div className="flex items-center justify-center space-x-4 opacity-20">
                  <div className="h-px w-20 bg-white" />
                  <div className="text-[9px] font-black uppercase tracking-[0.5em] text-white">Executive Suite v5.0 // Phase 7 FINAL</div>
                  <div className="h-px w-20 bg-white" />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
