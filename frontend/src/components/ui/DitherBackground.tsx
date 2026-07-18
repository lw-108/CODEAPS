import React from 'react';

interface DitherBackgroundProps {
  opacity?: number;
  color?: string;
  className?: string;
}

export const DitherBackground: React.FC<DitherBackgroundProps> = ({ 
  opacity = 0.05, 
  color = '#ff4500', // CodeAps Primary Orange
  className = '' 
}) => {
  return (
    <div className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0 mix-blend-overlay ${className}`}>
      <style>
        {`
          @keyframes dither-jitter {
            0% { transform: translate(0, 0); }
            10% { transform: translate(-2%, -2%); }
            20% { transform: translate(-4%, 2%); }
            30% { transform: translate(2%, -4%); }
            40% { transform: translate(-2%, 4%); }
            50% { transform: translate(-4%, 2%); }
            60% { transform: translate(4%, 0); }
            70% { transform: translate(0, 4%); }
            80% { transform: translate(-4%, 0); }
            90% { transform: translate(2%, 2%); }
            100% { transform: translate(0, 0); }
          }
          .dither-anim {
            animation: dither-jitter 0.8s steps(2) infinite;
          }
        `}
      </style>
      {/* Dynamic Animated Dither Overlay */}
      <svg className="absolute w-[150%] h-[150%] -top-[25%] -left-[25%] opacity-100 mix-blend-screen dither-anim" xmlns="http://www.w3.org/2000/svg">
        <filter id="dither-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" stitchTiles="stitch" />
          {/* Constrain colors to create a true retro 1-bit or 2-bit dither effect */}
          <feComponentTransfer>
             <feFuncR type="discrete" tableValues="0 1"/>
             <feFuncG type="discrete" tableValues="0 1"/>
             <feFuncB type="discrete" tableValues="0 1"/>
          </feComponentTransfer>
          <feColorMatrix type="matrix" values="
            1 0 0 0 0, 
            0 0.5 0 0 0, 
            0 0 0.2 0 0, 
            0 0 0 0.5 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#dither-noise)" />
      </svg>
      
      {/* Scanlines overlay to complement the dither for 'Neural Link' aesthetic */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))]" 
        style={{ backgroundSize: '100% 4px, 6px 100%', opacity: 0.4 }} 
      />
    </div>
  );
};
