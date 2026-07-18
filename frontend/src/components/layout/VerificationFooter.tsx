import React from 'react';
import { CheckCircle2, Play, Send, ChevronUp } from 'lucide-react';

export const VerificationFooter = () => {
  return (
    <div className="h-14 bg-[#222636] border-t border-white/5 flex items-center justify-between px-6 shrink-0 relative z-50">
      <div className="flex items-center space-x-3 group cursor-pointer">
        <div className="w-8 h-8 rounded-none bg-[#05FFA1]/10 flex items-center justify-center border border-[#05FFA1]/20 group-hover:bg-[#05FFA1]/20 transition-all">
            <CheckCircle2 size={18} className="text-[#05FFA1]" />
        </div>
        <span className="text-sm font-black text-[#05FFA1] tracking-tighter">300/300</span>
      </div>

      <div className="flex items-center space-x-3">
        <button className="flex items-center space-x-2 bg-[#2A2E42] hover:bg-[#383D56] text-white px-6 py-2 rounded-none text-[10px] font-bold uppercase tracking-widest border border-white/5 transition-all shadow-lg active:scale-95 group">
            <Play size={14} className="group-hover:text-[#05FFA1] transition-colors" />
            <span>Run Test</span>
        </button>
        <button className="flex items-center space-x-2 bg-[#05FFA1] hover:bg-[#04E38F] text-[#222636] px-8 py-2 rounded-none text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#05FFA1]/20 transition-all active:scale-95">
            <span>Submit</span>
        </button>
      </div>
    </div>
  );
};
