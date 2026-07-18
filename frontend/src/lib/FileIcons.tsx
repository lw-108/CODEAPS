import React from 'react';
import rustLogo from '../assets/rust.png';

/**
 * OfficialIcon renders a remote logo from Wikimedia.
 * Uses object-fit to ensure the logo maintains its aspect ratio correctly.
 */
const OfficialIcon = ({ url, alt, size = 16, className }: { url: string; alt: string; size?: number; className?: string }) => (
  <div style={{ width: size, height: size }} className={`flex items-center justify-center shrink-0 ${className || ""}`}>
    <img 
      src={url} 
      alt={alt} 
      style={{ 
        maxWidth: '100%', 
        maxHeight: '100%', 
        objectFit: 'contain'
      }} 
      onError={(e) => {
        // Fallback for failed image loads (e.g. offline)
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  </div>
);

/**
 * High-performance Vector Icon component for core UI elements if needed.
 */
const VectorIcon = ({ path, color, size = 14 }: { path: string; color: string; size?: number }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    className="shrink-0"
  >
    <path fill={color || 'currentColor'} d={path || 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z'} />
  </svg>
);

const WIKIMEDIA = {
  PYTHON: "https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg",
  JAVA: "https://upload.wikimedia.org/wikipedia/en/3/30/Java_programming_language_logo.svg",
  JAVASCRIPT: "https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png",
  TYPESCRIPT: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg",
  C: "https://upload.wikimedia.org/wikipedia/commons/1/18/C_Programming_Language.svg",
  CPP: "https://upload.wikimedia.org/wikipedia/commons/1/18/ISO_C%2B%2B_Logo.svg",
  RUST: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Rust_programming_language_black_logo.svg",
  HTML: "https://upload.wikimedia.org/wikipedia/commons/6/61/HTML5_logo_and_wordmark.svg",
  CSS: "https://upload.wikimedia.org/wikipedia/commons/d/d5/CSS3_logo_and_wordmark.svg",
  GO: "https://upload.wikimedia.org/wikipedia/commons/0/05/Go_Logo_Blue.svg",
  PHP: "https://upload.wikimedia.org/wikipedia/commons/2/27/PHP-logo.svg",
  RUBY: "https://upload.wikimedia.org/wikipedia/commons/7/73/Ruby_logo.svg",
  CSHARP: "https://upload.wikimedia.org/wikipedia/commons/4/4f/Csharp_Logo.svg",
  SHELL: "https://upload.wikimedia.org/wikipedia/commons/4/4b/Bash_Logo_Black_and_White.svg"
};

export const Icons = {
  C: <OfficialIcon url={WIKIMEDIA.C} alt="C" />,
  Cpp: <OfficialIcon url={WIKIMEDIA.CPP} alt="C++" />,
  Java: <OfficialIcon url={WIKIMEDIA.JAVA} alt="Java" />,
  Python: <OfficialIcon url={WIKIMEDIA.PYTHON} alt="Python" />,
  JS: <OfficialIcon url={WIKIMEDIA.JAVASCRIPT} alt="JS" />,
  React: <OfficialIcon url={WIKIMEDIA.JAVASCRIPT} alt="React" />, // Usually separate but user asked for these logos
  TS: <OfficialIcon url={WIKIMEDIA.TYPESCRIPT} alt="TS" />,
  ReactTS: <OfficialIcon url={WIKIMEDIA.TYPESCRIPT} alt="ReactTS" />,
  Rust: <OfficialIcon 
          url={WIKIMEDIA.RUST} 
          alt="Rust" 
          size={16} 
          className="[filter:invert(46%)_sepia(97%)_saturate(5818%)_hue-rotate(3deg)_brightness(103%)_contrast(106%)]" 
        />,
  HTML: <OfficialIcon url={WIKIMEDIA.HTML} alt="HTML" />,
  Go: <OfficialIcon url={WIKIMEDIA.GO} alt="Go" />,
  PHP: <OfficialIcon url={WIKIMEDIA.PHP} alt="PHP" />,
  Ruby: <OfficialIcon url={WIKIMEDIA.RUBY} alt="Ruby" />,
  CSharp: <OfficialIcon url={WIKIMEDIA.CSHARP} alt="C#" />,
  Shell: <OfficialIcon url={WIKIMEDIA.SHELL} alt="Shell" />,
  JSON: <div className="w-4 h-4 flex items-center justify-center font-black text-[9px] text-[#F5C518] tracking-tighter">{"{:}"}</div>,
  Settings: <img src="/settings.png" alt="Settings" className="w-4 h-4 object-contain" />,
  Fallback: (ext: string) => <div className="w-4 h-4 flex items-center justify-center font-bold border border-white/20 rounded-none text-[0.6em] text-white/40 uppercase">{ext.substring(0, 2)}</div>
};
