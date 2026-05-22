import React from 'react';

interface TamdeenLogoProps {
  showText?: boolean;
  textColorClass?: string;
  className?: string;
  iconSize?: number;
  centerTextAlign?: boolean;
}

export default function TamdeenLogo({ 
  showText = true, 
  textColorClass = 'text-slate-800', 
  className = '', 
  iconSize = 38,
  centerTextAlign = false
}: TamdeenLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${centerTextAlign ? 'flex-col sm:flex-row' : ''} ${className}`}>
      {/* Icon portion (the tower & palm tree) */}
      <svg 
        width={iconSize} 
        height={iconSize} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm"
      >
        {/* Sky/ground rays expanding at bottom */}
        {/* Left ray (gold) */}
        <path d="M50 80 L30 85 L10 88 L35 83 Z" fill="#e5b25d" />
        {/* Next ray (navy) */}
        <path d="M50 80 L40 85 L20 88 L43 83 Z" fill="#1b124c" />
        {/* Next ray (navy) */}
        <path d="M50 80 L52 85 L32 88 L48 83 Z" fill="#1b124c" />
        {/* Right rays (gold) */}
        <path d="M50 80 L70 85 L90 88 L65 83 Z" fill="#e5b25d" />
        {/* Right rays (navy) */}
        <path d="M50 80 L60 85 L80 88 L57 83 Z" fill="#1b124c" />
        
        {/* The building structure */}
        {/* Left tall facade (dark blue) */}
        <path d="M48 25 L48 80 L35 80 L35 45 Z" fill="#1e1355" />
        {/* Right main facade (dark blue with angle) */}
        <path d="M48 20 L65 25 L65 80 L48 80 Z" fill="#2d1c75" />
        
        {/* Golden slice outline on right facade */}
        <path d="M65 25 L65 80 L63 80 L63 26 Z" fill="#e5b25d" />
        
        {/* Palm tree shape drawn on building in white */}
        {/* Trunk */}
        <rect x="54" y="46" width="2" height="34" fill="#ffffff" />
        <path d="M53 46 C54 46 55 43 55 40 C55 43 56 46 57 46" fill="#ffffff" />
        {/* Fronds */}
        <path d="M55 43 C51 43 46 46 45 50 C48 48 52 46 55 46" fill="#ffffff" />
        <path d="M55 43 C59 43 64 46 65 50 C62 48 58 46 55 46" fill="#ffffff" />
        <path d="M55 42 C50 40 45 40 42 43 C46 42 51 42 55 42" fill="#ffffff" />
        <path d="M55 42 C60 40 65 40 68 43 C64 42 59 42 55 42" fill="#ffffff" />
        <path d="M55 41 C52 36 48 35 45 37 C48 37 52 39 55 41" fill="#ffffff" />
        <path d="M55 41 C58 36 62 35 65 37 C62 37 58 39 55 41" fill="#ffffff" />
        {/* Top central leaf */}
        <path d="M55 40 C55 33 53 30 55 28 C57 32 55 35 55 40" fill="#ffffff" fillRule="evenodd" />
      </svg>

      {/* Text portion if shown */}
      {showText && (
        <div className={`flex flex-col select-none ${centerTextAlign ? 'items-center sm:items-start text-center sm:text-left' : 'items-start text-left'}`}>
          <span className={`text-sm md:text-base font-black tracking-wide leading-none font-sans ${textColorClass}`}>
            التمدين الوطنية
          </span>
          <span className="text-[10px] md:text-xs font-bold tracking-tight text-[#e5b25d] leading-tight font-sans mt-0.5">
            Tamdeen Watania
          </span>
        </div>
      )}
    </div>
  );
}
