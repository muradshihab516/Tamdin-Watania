import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Calendar, Trash2, Edit2, Download, Printer, ExternalLink, CalendarDays, FileSpreadsheet, Building, X } from 'lucide-react';
import { WorkLog, FilterPeriod } from '../types';
import { formatGregorianDate, convertGregorianToHijri } from '../utils/dateHelper';
import TamdeenLogo from './TamdeenLogo';
import html2canvas from 'html2canvas';
import { LanguageMode, DICTIONARY } from '../utils/langHelper';

interface WorkLogTableProps {
  id: string;
  logs: WorkLog[];
  onEdit: (log: WorkLog) => void;
  onDelete: (id: string) => void;
  hourlyRate: number;
  otMultiplier: number;
  lang?: LanguageMode;
  hideWages?: boolean;
}

export default function WorkLogTable({ 
  id, 
  logs, 
  onEdit, 
  onDelete, 
  hourlyRate, 
  otMultiplier,
  lang = 'en-ar',
  hideWages = false
}: WorkLogTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<FilterPeriod>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Extract all unique months present in logs (e.g., "2026-05", "2026-04", etc.)
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    logs.forEach(log => {
      if (log.dateGregorian) {
        monthsSet.add(log.dateGregorian.substring(0, 7));
      }
    });
    if (monthsSet.size === 0) {
      monthsSet.add(new Date().toISOString().substring(0, 7));
    }
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [logs]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return availableMonths[0] || new Date().toISOString().substring(0, 7);
  });
  const [exportedImage, setExportedImage] = useState<string | null>(null);

  // Track if availableMonths changed and reset selectedMonth if current one is no longer available
  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // Helper to format "2026-05" into human-friendly language specific month names
  const getMonthName = (yrMo: string) => {
    const [year, month] = yrMo.split('-');
    const monthsEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthsBn = [
      'জানুয়ারী', 'ফেব্রুয়ারী', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const idx = parseInt(month, 10) - 1;
    const monthNameEn = monthsEn[idx] || '';
    const monthNameBn = monthsBn[idx] || '';
    
    if (lang === 'bn') {
      return `${monthNameBn} ${year}`;
    }
    return `${monthNameEn} ${year}`;
  };

  // Sorter configuration
  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => b.dateGregorian.localeCompare(a.dateGregorian));
  }, [logs]);

  // Filtering logs based on criteria
  const filteredLogs = useMemo(() => {
    return sortedLogs.filter(log => {
      // Search matching
      const matchesSearch = 
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.dateHijri.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.dateGregorian.includes(searchTerm);

      if (!matchesSearch) return false;

      // Period matching
      if (period === 'all') return true;

      const logTime = new Date(log.dateGregorian).getTime();
      const now = new Date();
      now.setHours(23, 59, 59, 999); // Set to end of day

      if (period === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        oneWeekAgo.setHours(0, 0, 0, 0);
        return logTime >= oneWeekAgo.getTime() && logTime <= now.getTime();
      }

      if (period === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(now.getDate() - 30);
        oneMonthAgo.setHours(0, 0, 0, 0);
        return logTime >= oneMonthAgo.getTime() && logTime <= now.getTime();
      }

      if (period === 'monthly') {
        return log.dateGregorian.substring(0, 7) === selectedMonth;
      }

      if (period === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        const start = customStartDate ? new Date(customStartDate).getTime() : 0;
        const end = customEndDate ? new Date(customEndDate).getTime() + 86400000 : Infinity; // add 1 day for boundary
        return logTime >= start && logTime <= end;
      }

      return true;
    });
  }, [sortedLogs, searchTerm, period, customStartDate, customEndDate, selectedMonth]);

  // Handle Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    
    const headers = [
      'Gregorian Date',
      'Hijri Date',
      'Company Name',
      'Site Location',
      'Work Description',
      'Regular Hours',
      'Overtime Hours',
      ...(hideWages ? [] : ['Total Earned (Est - OT Only)']),
      'Notes'
    ];

    const rows = filteredLogs.map(log => {
      const hijriInfo = convertGregorianToHijri(log.dateGregorian);
      const displayHijri = hijriInfo.arabic 
        ? `${hijriInfo.arabic} هـ (${lang === 'bn' ? hijriInfo.bengali : hijriInfo.latin})`
        : log.dateHijri;
      return [
        log.dateGregorian,
        displayHijri,
        log.company,
        log.location || 'N/A',
        `"${log.description.replace(/"/g, '""')}"`,
        log.hours,
        log.overtime,
        ...(hideWages ? [] : [log.overtime * hourlyRate * otMultiplier]),
        `"${(log.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `work_log_report_al_tamdin_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print Friendly mode
  const handlePrint = () => {
    window.print();
  };

  // Trigger PNG Export with beautiful background watermark and layout
  const handleExportPNG = async () => {
    if (filteredLogs.length === 0) return;
    setIsExporting(true);
    try {
      const targetElement = document.getElementById('printable-report-card');
      if (!targetElement) {
        throw new Error('Export element not found');
      }

      // Safe responsive scale: use 1.5 on mobile to avoid browser canvas crash/OOM limits
      const isMobileDevice = window.innerWidth < 768;
      const safeScale = isMobileDevice ? 1.5 : 2;

      const canvas = await html2canvas(targetElement, {
        scale: safeScale,
        useCORS: true,
        allowTaint: false, // DO NOT taint the canvas, so toBlob() and toDataURL() work securely!
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          // Force light-theme styling globally on the cloned document
          clonedDoc.documentElement.className = 'light';
          clonedDoc.documentElement.classList.remove('dark');
          
          if (clonedDoc.body) {
            clonedDoc.body.className = 'light';
            clonedDoc.body.classList.remove('dark');
            clonedDoc.body.style.backgroundColor = '#ffffff';
            clonedDoc.body.style.color = '#0c1a30'; // deep dark blue/charcoal
          }

          // Strip the "dark" CSS class from every single element in the cloned tree
          const allClonedNodes = clonedDoc.querySelectorAll('*');
          allClonedNodes.forEach(node => {
            node.classList.remove('dark');
            // Remove dark utilities style selectors
            const element = node as HTMLElement;
            if (element.classList.contains('dark:bg-slate-900')) {
              element.classList.remove('dark:bg-slate-900');
              element.style.backgroundColor = '#ffffff';
            }
            if (element.classList.contains('dark:text-slate-200') || element.classList.contains('dark:text-slate-350')) {
              element.style.color = '#1e293b';
            }
          });

          // Hide any non-export elements like search input and headers
          const elementsToHide = clonedDoc.querySelectorAll('.no-print-export');
          elementsToHide.forEach(el => {
            (el as HTMLElement).style.display = 'none';
          });
          
          // Make sure the watermark is highly visible and beautiful in the image
          const watermarks = clonedDoc.querySelectorAll('.export-watermark');
          watermarks.forEach(wm => {
            (wm as HTMLElement).style.opacity = '0.07'; // increase opacity for printed/image output
          });

          // Ensure forced white background for the cloned body to print properly
          const card = clonedDoc.getElementById('printable-report-card');
          if (card) {
            card.style.backgroundColor = '#ffffff';
            card.style.color = '#0c1a30';
            card.style.setProperty('background-color', '#ffffff', 'important');
            card.style.setProperty('color', '#0c1a30', 'important');
            card.classList.remove('dark:bg-slate-900', 'dark:border-slate-800', 'dark');
          }
        }
      });

      // Synchronously generate raw data URL
      const dataUrl = canvas.toDataURL('image/png');
      setExportedImage(dataUrl);

      // Programmatically attempt standard browser download trigger
      try {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `tamdeen_watania_work_log_${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (browserDlErr) {
        console.warn('Programmatic click-to-download is blocked/unsupported by browser/iframe sandboxes. Fallback save modal will remain open.', browserDlErr);
      }

    } catch (err) {
      console.error('PNG conversion failed:', err);
      alert(lang === 'bn' 
        ? 'পিএনজি ফাইল তৈরি করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন এবং নিচের তালিকাটি বড় স্ক্রিনে রাখুন।' 
        : 'PNG conversion failed. Please try again or rotate your mobile device.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div 
      id="printable-report-card" 
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col relative overflow-hidden"
    >
      {/* Background Watermark Logo (very subtle, displays nicely on screen & gets contrast boosted in PNG/print) */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center -z-10 bg-transparent">
        <div className="export-watermark opacity-[0.025] transition-opacity duration-300">
          <TamdeenLogo showText={false} iconSize={400} className="transform rotate-6" />
        </div>
      </div>

      {/* Corporate Report Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 mb-4 relative z-10 w-full">
        <TamdeenLogo iconSize={42} textColorClass="text-slate-800 dark:text-slate-100 font-black text-sm md:text-base" />
        <div className="text-left sm:text-right font-sans">
          <h1 className="text-xs font-black text-slate-700 dark:text-slate-200 tracking-wider uppercase">
            {lang === 'bn' ? 'অফিসিয়াল কাজের খাতা ও হিসাব রিপোর্ট' : 'Official Work Log History & Records'}
          </h1>
          <p className="text-[10px] text-[#e5b25d] font-bold">আল তামদিন আল ওয়াতানিয়া (التمدين الوطنية)</p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
            {lang === 'bn' ? 'রিপোর্ট তৈরির সময়' : 'Generated / Printed'}: {new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')} (KSA)
          </p>
        </div>
      </div>

      {/* Title & Actions Bar */}
      <div className="no-print-export flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 bg-slate-50/50 dark:bg-slate-800/50 -mx-5 -mt-4 p-4 rounded-t-none">
        <div>
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            {DICTIONARY.tableTitle[lang]} <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 italic">| Filters & Tools</span>
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-3 h-3" />
            {DICTIONARY.tableExportCsv[lang]}
          </button>
          
          <button
            onClick={handlePrint}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-3 h-3" />
            {DICTIONARY.tablePrint[lang]}
          </button>

          <button
            onClick={handleExportPNG}
            disabled={filteredLogs.length === 0 || isExporting}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isExporting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                {lang === 'bn' ? 'পিএনজি হচ্ছে...' : 'Saving PNG...'}
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                {DICTIONARY.tableSavePng[lang]}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search & Filter Inputs */}
      <div className="space-y-4 mb-6 no-print-export">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search box */}
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
            <input
              type="text"
              placeholder={lang === 'bn' ? "যেকোনো বিবরণ বা সাইট খোঁজুন..." : "Search logs (description, site, company)..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs font-sans text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Timeframe selector */}
          <div className="flex gap-1 bg-slate-100/80 dark:bg-slate-800 p-1 rounded-xl md:col-span-2 overflow-x-auto">
            <button
              onClick={() => setPeriod('all')}
              className={`flex-1 text-[11px] font-semibold px-2 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                period === 'all' 
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'bn' ? 'সব দিন' : 'Show All Days'}
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`flex-1 text-[11px] font-semibold px-2 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                period === 'week' 
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'bn' ? 'বিগত ৭ দিন' : 'Last 7 Days'}
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`flex-1 text-[11px] font-semibold px-2 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                period === 'month' 
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'bn' ? 'বিগত ৩০ দিন' : 'Last 30 Days'}
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`flex-1 text-[11px] font-semibold px-2 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                period === 'monthly' 
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'bn' ? 'মাসিক ভিউ' : 'Monthly View'}
            </button>
            <button
              onClick={() => setPeriod('custom')}
              className={`flex-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                period === 'custom' 
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'bn' ? 'কাস্টম সীমা' : 'Custom Interval'}
            </button>
          </div>
        </div>

        {/* Dynamic Month-by-month picker */}
        {period === 'monthly' && (
          <div className="bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 p-4 rounded-xl space-y-2.5 animate-fade-in">
            <div className="flex items-center gap-1.5 text-sky-850 dark:text-sky-400 text-[11px] font-bold">
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>
                {lang === 'bn' ? 'মাসগুলোর আলাদা তালিকা (মাস সিলেক্ট করতে ক্লিক করুন):' : 'Month Selector (Click to filter list / মাস নির্বাচন করুন):'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableMonths.map(m => {
                const isActive = selectedMonth === m;
                const logCount = logs.filter(log => log.dateGregorian.substring(0, 7) === m).length;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMonth(m)}
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-md ring-2 ring-blue-500/20 scale-102'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <div className="flex flex-col items-start leading-tight">
                      <span>{getMonthName(m)}</span>
                      <span className={`text-[9px] font-normal mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-400 dark:text-slate-400'}`}>
                        {logCount} {lang === 'bn' ? 'টি এন্ট্রি' : 'Records'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Date boundaries */}
        {period === 'custom' && (
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-3 rounded-xl flex flex-col sm:flex-row items-center gap-3 animate-fade-in">
            <CalendarDays className="w-4 h-4 text-sky-700 dark:text-sky-400 shrink-0" />
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:mr-2">
              {lang === 'bn' ? 'তারিখের সীমা নির্বাচন করুন:' : 'Select custom date range:'}
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-2.5 text-xs font-sans text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <span className="text-slate-400 dark:text-slate-500 text-xs">{lang === 'bn' ? 'থেকে' : 'to'}</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-2.5 text-xs font-sans text-slate-600 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Table Layer */}
      <div className="overflow-x-auto relative rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse bg-white dark:bg-slate-900">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold tracking-wider">
              {/* Dual Language headers matching the exact Al Tamdin request requirements */}
              <th className="py-2.5 px-3 font-bold font-sans">
                <span className="block text-slate-700 dark:text-slate-200">{lang === 'bn' ? DICTIONARY.tableHeaderDate.bn : 'Date (التاريخ)'}</span>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-normal">Gregorian & Hijri</span>
              </th>
              <th className="py-2.5 px-3 font-bold font-sans">
                <span className="block text-slate-700 dark:text-slate-200">{lang === 'bn' ? DICTIONARY.tableHeaderCompany.bn : 'Company / Site'}</span>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-normal">الشركة والموقع</span>
              </th>
              <th className="py-2.5 px-3 font-bold font-sans min-w-[180px]">
                <span className="block text-slate-700 dark:text-slate-200">{lang === 'bn' ? DICTIONARY.tableHeaderDescription.bn : 'Work Description'}</span>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-normal">تفاصيل وأوصاف العمل</span>
              </th>
              <th className="py-2.5 px-3 font-bold font-sans text-center">
                <span className="block text-slate-700 dark:text-slate-200">{lang === 'bn' ? DICTIONARY.tableHeaderHours.bn : 'Normal Duty'}</span>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-normal">ساعات العمل</span>
              </th>
              <th className="py-2.5 px-3 font-bold font-sans text-center">
                <span className="block text-slate-700 dark:text-slate-200">{lang === 'bn' ? DICTIONARY.tableHeaderOvertime.bn : 'Overtime (O.T.)'}</span>
                <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-normal">الوقت الإضافي</span>
              </th>
              {!hideWages && (
                <th className="py-2.5 px-3 font-bold font-sans text-center font-black">
                  <span className="block text-slate-700 dark:text-slate-200">{lang === 'bn' ? DICTIONARY.tableHeaderEarnings.bn : 'Earnings (Est)'}</span>
                  <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-normal">حساب الدخل التقديري</span>
                </th>
              )}
              <th className="py-2.5 px-3 font-bold font-sans text-right no-print text-slate-700 dark:text-slate-200">
                <span>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={hideWages ? 6 : 7} className="text-center py-10 text-slate-400 dark:text-slate-600 text-xs">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Calendar className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                    <p className="font-semibold text-slate-500 dark:text-slate-400">
                      {lang === 'bn' ? 'কোনো কাজের হিসেব পাওয়া যায়নি' : 'No work hours record found (لا يوجد سجلات)'}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {lang === 'bn' ? 'নতুন কাজ এন্ট্রি করুন বা অন্য ফিল্টার চেষ্টা করুন।' : 'Add a new work record or adjust your filter presets.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => {
                const totalIncome = log.overtime * hourlyRate * otMultiplier;
                const gDateInfo = formatGregorianDate(log.dateGregorian);
                const computedHijri = convertGregorianToHijri(log.dateGregorian);
                const displayHijri = computedHijri.arabic 
                  ? `${computedHijri.arabic}  (${lang === 'bn' ? computedHijri.bengali : computedHijri.latin})`
                  : log.dateHijri;
                
                return (
                  <tr key={log.id} className="hover:bg-blue-50/25 dark:hover:bg-slate-800/25 transition-colors group text-xs">
                    {/* Date Column */}
                    <td className="py-2 px-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {log.dateGregorian}
                        </span>
                        <span className="text-[9px] text-sky-700 dark:text-sky-400 font-bold mt-0.5 whitespace-nowrap leading-tight bg-sky-50 dark:bg-sky-950/30 px-1.5 py-0.5 rounded w-max">
                          {displayHijri}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-tight">
                          {gDateInfo.english.split(',')[0]}
                        </span>
                      </div>
                    </td>

                    {/* Company and Site Location */}
                    <td className="py-2 px-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          {log.company}
                        </span>
                        {log.location && (
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded w-max">
                            Site: {log.location}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Work details description */}
                    <td className="py-2 px-3 font-sans text-xs max-w-sm">
                      <p className="font-medium text-slate-600 dark:text-slate-350 whitespace-pre-line leading-relaxed text-[11px]">
                        {log.description}
                      </p>
                      {log.notes && (
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 italic mt-1 border-l-2 border-slate-200 dark:border-slate-700 pl-1.5">
                          নোট: {log.notes}
                        </p>
                      )}
                    </td>

                    {/* Regular Hours */}
                    <td className="py-2 px-3 text-center">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 justify-center w-7 h-7 rounded-md inline-flex items-center text-xs">
                        {log.hours}
                      </span>
                    </td>

                    {/* Overtime Hours */}
                    <td className="py-2 px-3 text-center">
                      {log.overtime > 0 ? (
                        <span className="font-mono font-extrabold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 justify-center w-7 h-7 rounded-md inline-flex items-center text-xs">
                          +{log.overtime}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 font-normal text-xs">--</span>
                      )}
                    </td>

                    {/* Estimated Wages */}
                    {!hideWages && (
                      <td className="py-2 px-3 text-center">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                          SAR {totalIncome.toFixed(2)}
                        </span>
                      </td>
                    )}

                    {/* Action buttons (Edit/Delete) - hidden on print */}
                    <td className="py-2 px-3 text-right no-print">
                      <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          id={`btn-edit-${log.id}`}
                          onClick={() => onEdit(log)}
                          title="সংশোধন করুন"
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          id={`btn-delete-${log.id}`}
                          onClick={() => {
                            if (window.confirm('আপনি কি নিশ্চিত যে এই হিসাবটি মুছে ফেলতে চান? (Arabic: هل أنت متأكد؟)')) {
                              onDelete(log.id);
                            }
                          }}
                          title="মুছে ফেলুন"
                          className="p-1 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer bar inside the table container */}
      {filteredLogs.length > 0 && (
        <div className="mt-4 bg-slate-50/85 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <div>
            <span className="text-slate-500 dark:text-slate-400">
              {lang === 'bn' ? 'মোট দিন:' : 'Total Days (الأيام):'}{' '}
            </span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
              {filteredLogs.length} {lang === 'bn' ? 'দিন' : 'Days'}
            </span>
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                {lang === 'bn' ? 'মোট ডিউটি ঘন্টা:' : 'Total Duty (ساعات):'}{' '}
              </span>
              <span className="font-mono font-extrabold text-slate-800 dark:text-slate-100">
                {filteredLogs.reduce((acc, log) => acc + log.hours, 0)} {lang === 'bn' ? 'ঘন্টা' : 'h'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                {lang === 'bn' ? 'মোট ওভারটাইম ঘন্টা:' : 'Total OT (إضافي):'}{' '}
              </span>
              <span className="font-mono font-extrabold text-amber-700 dark:text-amber-400">
                {filteredLogs.reduce((acc, log) => acc + log.overtime, 0)} {lang === 'bn' ? 'ঘন্টা' : 'h'}
              </span>
            </div>
            {!hideWages && (
              <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                <span className="text-slate-500 dark:text-slate-400">
                  {lang === 'bn' ? 'আনুমানিক মোট প্রাপ্য (ওভারটাইম):' : 'Total Wages (O.T. Estimate):'}{' '}
                </span>
                <span className="font-mono font-black text-sky-800 dark:text-sky-400">
                  SAR {filteredLogs.reduce((acc, log) => {
                    return acc + (log.overtime * hourlyRate * otMultiplier);
                  }, 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fallback & Mobile Save HUD Modal */}
      {exportedImage && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/40">
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  {lang === 'bn' ? 'রিপোর্ট পিএনজি তৈরি হয়েছে' : 'Report card compiled successfully'}
                </h3>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  {lang === 'bn' ? '✓ সফলভাবে সম্পন্ন হয়েছে' : '✓ Ready to save'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExportedImage(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content / Image Preview */}
            <div className="p-4 overflow-y-auto flex flex-col items-center gap-3.5 bg-slate-100/50 dark:bg-slate-900/20">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-3 text-[11px] text-amber-800 dark:text-amber-300 w-full text-center leading-relaxed">
                <span className="font-extrabold block mb-0.5">
                  {lang === 'bn' ? 'মোবাইল ব্যবহারকারীদের প্রতি পরামর্শ:' : '💡 Simple Tip for Mobile / Iframes:'}
                </span>
                {lang === 'bn' 
                  ? 'আপনার ফোনে ছবিটি সেভ করতে নিচের ছবির উপর কিছুক্ষণ চেপে ধরে রাখুন (Tap & Hold / Long Press) এবং "Save Image" বা "পিকচার ডাউনলোড করুন" সিলেক্ট করুন।' 
                  : 'If the automatic download didn\'t initiate, simply press-and-hold (long press) the image preview below to directly share or save it to your local gallery.'}
              </div>

              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-1 bg-white dark:bg-slate-900 shadow-inner max-w-full relative group">
                <img 
                  src={exportedImage} 
                  alt="Tamdeen Watania Work Log" 
                  className="max-h-[50vh] w-auto max-w-full rounded-lg object-contain"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 bg-slate-900/60 text-white rounded-full p-1 border border-white/25">
                  <Download className="w-4 h-4 animate-bounce" />
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setExportedImage(null)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                {lang === 'bn' ? 'বন্ধ করুন' : 'Dismiss'}
              </button>
              <a
                href={exportedImage}
                download={`tamdeen_watania_work_log_${new Date().toISOString().split('T')[0]}.png`}
                className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold font-sans cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'ডাউনলোড করুন' : 'Force Download'}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
