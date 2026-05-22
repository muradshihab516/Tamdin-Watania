import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Upload, 
  RotateCcw, 
  Edit3, 
  Check, 
  X, 
  Download, 
  BookOpen, 
  AlertCircle 
} from 'lucide-react';
import TamdeenLogo from './TamdeenLogo';

interface IdCardProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  lang: 'bn' | 'en-ar';
}

// Code 39 encoding map (0 represents narrow, 1 represents wide element)
const CODE39_MAP: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', '*': '010010100'
};

/**
 * Custom function to compile Code 39 barcode SVG elements.
 * Generates an array of horizontal coordinates for dark bars.
 */
function getCode39BarcodeRects(text: string): { rects: { x: number; width: number }[]; totalWidth: number } {
  const upperText = `*${text.trim().toUpperCase()}*`;
  let currentX = 0;
  const narrowWidth = 2.4; // Optimized narrow element width
  const wideWidth = 6.0;   // Optimized wide element width (2.5x ratio)
  const gapWidth = 2.4;    // Inter-character space
  
  const rects: { x: number; width: number }[] = [];

  for (let i = 0; i < upperText.length; i++) {
    const char = upperText[i];
    const pattern = CODE39_MAP[char] || CODE39_MAP['*']; // Fallback to asterisk if invalid char

    // Each pattern has 9 elements: 5 bars, 4 spaces
    // Bars are elements 1,3,5,7,9 (j = 0,2,4,6,8)
    // Spaces are elements 2,4,6,8 (j = 1,3,5,7)
    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pattern[j] === '1';
      const elementWidth = isWide ? wideWidth : narrowWidth;

      if (isBar) {
        rects.push({ x: currentX, width: elementWidth });
      }
      currentX += elementWidth;
    }
    // Add inter-character gap
    currentX += gapWidth;
  }

  return { rects, totalWidth: currentX - gapWidth };
}

export default function IdCard({ id, isOpen, onClose, lang }: IdCardProps) {
  // Stored state for Virtual ID configuration
  const [nameEn, setNameEn] = useState<string>(() => localStorage.getItem('tamdeen_id_name_en') || 'Shhab Md Md Md');
  const [nameAr, setNameAr] = useState<string>(() => localStorage.getItem('tamdeen_id_name_ar') || 'شهاب مد مد مد');
  const [cardCode, setCardCode] = useState<string>(() => localStorage.getItem('tamdeen_id_code') || '6697');
  const [photoBase64, setPhotoBase64] = useState<string | null>(() => localStorage.getItem('tamdeen_id_photo') || null);
  
  // UI states
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editNameEn, setEditNameEn] = useState<string>('');
  const [editNameAr, setEditNameAr] = useState<string>('');
  const [editCode, setEditCode] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize state with LocalStorage on updates
  useEffect(() => {
    localStorage.setItem('tamdeen_id_name_en', nameEn);
  }, [nameEn]);

  useEffect(() => {
    localStorage.setItem('tamdeen_id_name_ar', nameAr);
  }, [nameAr]);

  useEffect(() => {
    localStorage.setItem('tamdeen_id_code', cardCode);
  }, [cardCode]);

  useEffect(() => {
    if (photoBase64) {
      localStorage.setItem('tamdeen_id_photo', photoBase64);
    } else {
      localStorage.removeItem('tamdeen_id_photo');
    }
  }, [photoBase64]);

  // Open edit mode
  const handleStartEdit = () => {
    setEditNameEn(nameEn);
    setEditNameAr(nameAr);
    setEditCode(cardCode);
    setIsEditing(true);
  };

  // Save edits
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate containing only digits/chars supported by Code 39
    const cleanCode = editCode.trim().replace(/[^0-9A-Za-z]/g, '');
    if (!cleanCode) return;
    
    setNameEn(editNameEn.trim() || 'Employee Name');
    setNameAr(editNameAr.trim() || 'الاسم الكامل');
    setCardCode(cleanCode);
    setIsEditing(false);
  };

  // Reset to original upload info (Shhab 6697)
  const handleResetToDefault = () => {
    if (window.confirm(lang === 'bn' ? 'আপনি কি আদি আইডি কার্ডের তথ্যে ফিরে যেতে চান?' : 'Reset card back to default photo and worker credentials?')) {
      setNameEn('Shhab Md Md Md');
      setNameAr('شهاب مد مد مد');
      setCardCode('6697');
      setPhotoBase64(null);
      setIsEditing(false);
    }
  };

  // Image Upload handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPhotoBase64(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Trigger file input
  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  // Recalculate barcode specs based on code state
  const { rects, totalWidth } = getCode39BarcodeRects(cardCode || '6697');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id={id}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      >
        {/* Modal container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden flex flex-col relative"
        >
          {/* Top header bar */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/60">
            <h2 className="text-xs font-mono font-black tracking-widest uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {lang === 'bn' ? 'ডিজিটাল আইডি কার্ড' : 'Virtual Identity Badge'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-200 hover:bg-slate-350 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form / Badge Scrollable Body */}
          <div className="p-6 overflow-y-auto max-h-[80vh] flex flex-col items-center gap-6">
            
            {/* 1. VISUAL PORTRAIT ID CARD REPRESENTATION (High contrast, scan-friendly) */}
            <div 
              id="printable-id-badge"
              className="w-[275px] h-[435px] shrink-0 bg-white rounded-2xl border border-slate-200 p-4 shadow-md flex flex-col justify-between relative overflow-hidden text-slate-905 select-none"
              style={{ contentVisibility: 'auto' }}
            >
              {/* Background elegant golden arcs decor */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
              <div className="absolute top-0 left-0 w-28 h-6 bg-amber-500/5 rotate-6 transform -translate-x-4 pointer-events-none" />

              {/* Header inside the ID card */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-2 relative">
                <div className="flex flex-col text-left">
                  <span className="text-[12px] font-black tracking-wide text-slate-900 font-sans leading-none">
                    مجموعة التمدين
                  </span>
                  <span className="text-[8px] font-black tracking-widest text-amber-500 font-sans uppercase leading-none mt-1">
                    AL-TAMDEEN GROUP
                  </span>
                </div>
                {/* Visual Tower Logo in badge header */}
                <div className="transform scale-75 origin-top-right -mt-1.5">
                  <TamdeenLogo showText={false} iconSize={40} />
                </div>
              </div>

              {/* Photo Frame Section */}
              <div className="flex justify-center my-3 relative">
                <div className="w-[110px] h-[135px] border border-slate-300 rounded-lg overflow-hidden bg-slate-100 shadow-inner flex items-center justify-center relative group">
                  {photoBase64 ? (
                    <img 
                      src={photoBase64} 
                      alt="Virtual ID Face" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    /* High-fidelity default Vector Silhouette matching employee with safety helmet */
                    <svg viewBox="0 0 100 120" className="w-full h-full text-slate-400 bg-slate-50">
                      {/* Safety Orange vest */}
                      <path d="M15 110 L85 110 L75 80 L65 75 L35 75 L25 80 Z" fill="#f97316" />
                      {/* White collar details */}
                      <path d="M35 75 L50 90 L65 75 L50 78 Z" fill="#ffffff" />
                      {/* Silver reflective vest stripes */}
                      <path d="M28 92 L34 92 L34 110 L28 110 Z" fill="#94a3b8" />
                      {/* Left side silver stripe */}
                      <path d="M72 92 L66 92 L66 110 L72 110 Z" fill="#94a3b8" />
                      {/* Human Neck */}
                      <rect x="44" y="62" width="12" height="15" fill="#fbcfe8" />
                      {/* Face */}
                      <ellipse cx="50" cy="48" rx="16" ry="18" fill="#fda4af" />
                      {/* Hair / Beard trace */}
                      <path d="M34 46 C34 58 40 68 50 68 C60 68 66 58 66 46 Z" fill="#1e293b" opacity="0.3" />
                      {/* Eyes and subtle smile */}
                      <circle cx="44" cy="46" r="1.5" fill="#1e293b" />
                      <circle cx="56" cy="46" r="1.5" fill="#1e293b" />
                      <path d="M47 56 Q50 59 53 56" stroke="#1e293b" strokeWidth="1.5" fill="none" />
                      {/* Safety Helmet (Construction Worker Hard Hat in Orange) */}
                      <path d="M30 36 C30 18 70 18 70 36 Z" fill="#f97316" />
                      {/* Helmet visor brim */}
                      <path d="M26 34 L74 34 C76 34 76 38 74 38 L26 38 C24 38 24 34 26 34 Z" fill="#ea580c" />
                      {/* Helmet central crest cap */}
                      <path d="M46 22 C46 16 54 16 54 22 L52 35 L48 35 Z" fill="#ea580c" />
                    </svg>
                  )}
                  
                  {/* Subtle watermarked helmet icon context */}
                  <span className="absolute bottom-1 right-1 text-[8px] bg-black/60 text-white font-mono px-1 rounded transform scale-75 opacity-60">
                    ID Badge
                  </span>
                </div>
              </div>

              {/* Names and Credentials Section */}
              <div className="text-center flex flex-col gap-1 z-10">
                <p className="text-[14px] font-bold text-slate-800 leading-tight tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>
                  {nameAr}
                </p>
                <p className="text-[12px] font-bold text-slate-900 uppercase tracking-wide leading-tight mt-0.5">
                  {nameEn}
                </p>
                <p className="text-[13px] font-black text-slate-650 leading-none tracking-widest mt-1 font-mono">
                  {cardCode}
                </p>
              </div>

              {/* Barcode Section (Crisp High-Contrast Vector SVG) */}
              <div className="border-t border-slate-100 pt-3 flex flex-col items-center bg-white px-1">
                <div className="w-full flex justify-center bg-white p-1">
                  {/* Clean SVG render using Code 39 widths */}
                  <svg 
                    width="100%" 
                    height="42" 
                    viewBox={`0 0 ${totalWidth} 42`} 
                    preserveAspectRatio="none"
                    className="overflow-visible"
                  >
                    <g fill="#000000">
                      {rects.map((rect, idx) => (
                        <rect 
                          key={idx} 
                          x={rect.x} 
                          y={0} 
                          width={rect.width} 
                          height={42} 
                        />
                      ))}
                    </g>
                  </svg>
                </div>
                {/* Optional asterisks human-readable text printed at the bottom of standard barcodes */}
                <p className="text-[9px] font-bold tracking-widest text-slate-500 font-mono mt-1 leading-none uppercase">
                  *{cardCode}*
                </p>
              </div>

              {/* Micro authenticating security stamp bottom */}
              <div className="text-[6px] text-center text-slate-400 font-mono pt-1 leading-none tracking-tight">
                AL-TAMDEEN CONTRACTING SECURITY VERIFICATION
              </div>
            </div>

            {/* Practical information box */}
            <div className="w-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 p-3.5 rounded-2xl text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
              <div className="flex gap-2 items-start">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">
                    {lang === 'bn' ? 'সুপারভাইজার স্ক্যান গাইড:' : 'Supervisor Scan Guide:'}
                  </p>
                  <p>
                    {lang === 'bn'
                      ? 'ডিজিটাল আইডি কার্ডটি শতভাগ নিখুঁত ভেক্টর লাইনে তৈরি করা হয়েছে। সুপারভাইজার সকালে বা বিকেলে তার স্ক্যানার ডিভাইস দিয়ে আপনার মোবাইল স্ক্রিনের এই বারকোডটি রিয়েল-টাইমে স্ক্যান করে নিতে পারবেন।'
                      : 'This virtual barcode is drawn in crisp 100% vector SVGs. Your supervisor can instantly scan this directly from your phone screen during morning and evening attendance rolls.'}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. TABBED OR EDIT CONTROLS */}
            <div className="w-full flex flex-col gap-3">
              {isEditing ? (
                /* Edit Form with complete custom options */
                <form onSubmit={handleSaveEdit} className="space-y-3.5 border-t border-slate-100 dark:border-slate-800 pt-4 w-full">
                  <div className="grid grid-cols-1 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                        বাংলা/আরবি নাম (Arabic Full Name):
                      </label>
                      <input 
                        type="text" 
                        value={editNameAr}
                        onChange={(e) => setEditNameAr(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-55 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white"
                        placeholder="যেমন: شهاب مد مد مد"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                        ইংরেজী নাম (English Username):
                      </label>
                      <input 
                        type="text" 
                        value={editNameEn}
                        onChange={(e) => setEditNameEn(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-55 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white"
                        placeholder="যেমন: Shhab Md Md Md"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                        আইডি নাম্বার / কোড (Employee/ID Code):
                      </label>
                      <input 
                        type="text" 
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-55 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white font-mono"
                        placeholder="যেমন: 6697"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">শুধুমাত্র ইংরেজী অক্ষর এবং সংখ্যা টাইপ করুন।</p>
                    </div>
                  </div>

                  {/* Actions inside form edit */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-gradient-to-r from-emerald-505 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border border-emerald-500 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      {lang === 'bn' ? 'পরিবর্তন সেভ করুন' : 'Apply Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Normal visual controls containing Upload Photo, Reset Defaults and Edit Buttons */
                <div className="flex flex-col gap-2.5 w-full">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="flex-1 py-2.5 bg-slate-900 hover:bg-black dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      {lang === 'bn' ? 'আইডি কার্ড তথ্য পরিবর্তন করুন' : 'Edit Employee Details'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={triggerImageUpload}
                      className="p-2.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer"
                      title={lang === 'bn' ? 'ছবি আপলোড করুন' : 'Upload Profile Photo'}
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      className="p-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-450 rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer"
                      title={lang === 'bn' ? 'রিসেট করে মূল কার্ডে ফিরুন' : 'Reset Back to Original Card'}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Modal bottom action info */}
          <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-mono bg-slate-50 dark:bg-slate-900/40">
            <span>DATABASE ENCRYPTION: SECURE LOCAL STORAGE</span>
            <span>VER. 1.04</span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
