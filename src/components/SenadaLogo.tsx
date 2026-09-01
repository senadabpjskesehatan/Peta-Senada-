import React from 'react';

interface SenadaLogoProps {
  className?: string;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
  theme?: 'dark' | 'light';
}

/**
 * Official SENADA Logo Component
 * Sentralisasi Edukasi Penanganan Pengaduan
 */
export const SenadaLogoIcon: React.FC<{ className?: string }> = ({ className = "w-9 h-9" }) => {
  return (
    <svg 
      viewBox="0 0 100 80" 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Logo SENADA"
    >
      {/* Green Superellipse / Rounded Pill Background */}
      <rect x="5" y="5" width="90" height="70" rx="28" fill="#00A859" />
      
      {/* Central White Ring of 4 Embracing Figures around Medical Cross */}
      <g fill="#FFFFFF">
        {/* Central Medical Cross */}
        <path d="M44 34 H56 V30 H60 V42 H56 V46 H44 V42 H40 V30 H44 Z" fill="#00A859" />
        <rect x="46" y="32" width="8" height="16" rx="1.5" fill="#00A859" />
        <rect x="42" y="36" width="16" height="8" rx="1.5" fill="#00A859" />
        
        {/* Top Head & Body */}
        <circle cx="50" cy="22" r="3.5" />
        <path d="M44 27 C47 25, 53 25, 56 27 C54 29, 46 29, 44 27 Z" />

        {/* Bottom Head & Body */}
        <circle cx="50" cy="58" r="3.5" />
        <path d="M44 53 C47 55, 53 55, 56 53 C54 51, 46 51, 44 53 Z" />

        {/* Left Head & Body */}
        <circle cx="32" cy="40" r="3.5" />
        <path d="M37 34 C35 37, 35 43, 37 46 C39 44, 39 36, 37 34 Z" />

        {/* Right Head & Body */}
        <circle cx="68" cy="40" r="3.5" />
        <path d="M63 34 C65 37, 65 43, 63 46 C61 44, 61 36, 63 34 Z" />

        {/* Interlocking Circular Hug Arms */}
        <path 
          d="M 50 25 A 15 15 0 0 1 75 40 A 15 15 0 0 1 50 55 A 15 15 0 0 1 25 40 A 15 15 0 0 1 50 25 Z" 
          stroke="#FFFFFF" 
          strokeWidth="3.5" 
          fill="none" 
        />
        {/* Inner Medical Cross Overlay */}
        <path d="M47 34 h6 v12 h-6 z M41 40 h18 v-6 h-18 z" fill="#00A859" />
      </g>
    </svg>
  );
};

export const SenadaLogo: React.FC<SenadaLogoProps> = ({
  className = "",
  showSubtitle = true,
  size = 'md',
  layout = 'horizontal',
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const subSizes = {
    sm: 'text-[7px]',
    md: 'text-[8.5px]',
    lg: 'text-[10px]',
  };

  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        {/* Green Emblem */}
        <div className="relative mb-1">
          <svg viewBox="0 0 100 70" className="w-16 h-12" fill="none">
            <rect width="100" height="70" rx="24" fill="#00A859" />
            <g fill="#FFFFFF">
              {/* Outer Ring Circle */}
              <circle cx="50" cy="35" r="18" stroke="#FFFFFF" strokeWidth="3.5" fill="none" />
              {/* 4 Heads */}
              <circle cx="50" cy="17" r="3.5" />
              <circle cx="50" cy="53" r="3.5" />
              <circle cx="32" cy="35" r="3.5" />
              <circle cx="68" cy="35" r="3.5" />
              {/* Center Cross */}
              <path d="M46 27 h8 v16 h-8 z M42 31 h16 v8 h-16 z" fill="#FFFFFF" />
              <path d="M47 28 h6 v14 h-6 z M43 32 h14 v6 h-14 z" fill="#00A859" />
            </g>
          </svg>
        </div>
        {/* SENADA Text */}
        <span className={`font-black tracking-wider ${titleSizes[size]} ${isDark ? 'text-blue-400' : 'text-blue-700'} font-sans uppercase`}>
          SENADA
        </span>
        {showSubtitle && (
          <span className={`font-extrabold tracking-widest uppercase mt-0.5 ${subSizes[size]} ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            SENTRALISASI EDUKASI PENANGANAN PENGADUAN
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Emblem SVG */}
      <div className="shrink-0 relative">
        <svg viewBox="0 0 100 75" className={iconSizes[size]} fill="none">
          <rect width="100" height="75" rx="26" fill="#00A859" />
          <g fill="#FFFFFF">
            <circle cx="50" cy="37.5" r="18" stroke="#FFFFFF" strokeWidth="4" fill="none" />
            <circle cx="50" cy="19.5" r="3.8" />
            <circle cx="50" cy="55.5" r="3.8" />
            <circle cx="32" cy="37.5" r="3.8" />
            <circle cx="68" cy="37.5" r="3.8" />
            <path d="M46 29.5 h8 v16 h-8 z M42 33.5 h16 v8 h-16 z" fill="#FFFFFF" />
            <path d="M47 30.5 h6 v14 h-6 z M43 34.5 h14 v6 h-14 z" fill="#00A859" />
          </g>
        </svg>
      </div>

      <div className="flex flex-col min-w-0">
        <span className={`font-black tracking-tight leading-none ${titleSizes[size]} ${isDark ? 'text-blue-400' : 'text-blue-700'} uppercase font-sans`}>
          SENADA
        </span>
        {showSubtitle && (
          <span className={`font-bold tracking-wider uppercase mt-1 leading-tight ${subSizes[size]} ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
            SENTRALISASI EDUKASI<br />PENANGANAN PENGADUAN
          </span>
        )}
      </div>
    </div>
  );
};

export default SenadaLogo;
