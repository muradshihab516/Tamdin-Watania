import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Building, MapPin, Clock, FileText, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';
import { convertGregorianToHijri } from '../utils/dateHelper';
import { WorkLog } from '../types';
import TamdeenLogo from './TamdeenLogo';
import { LanguageMode, DICTIONARY, autoTranslateWork } from '../utils/langHelper';

interface WorkLogFormProps {
  id: string;
  onSave: (logData: Omit<WorkLog, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  editingLog: WorkLog | null;
  onCancelEdit?: () => void;
  lang?: LanguageMode;
  logs?: WorkLog[];
}

export default function WorkLogForm({ id, onSave, editingLog, onCancelEdit, lang = 'en-ar', logs = [] }: WorkLogFormProps) {
  const [dateGregorian, setDateGregorian] = useState('');
  const [dateHijri, setDateHijri] = useState({ arabic: '', latin: '', bengali: '' });
  const [company, setCompany] = useState('Al Tamdin Al Watania');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState<number>(8);
  const [overtime, setOvertime] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const previousLocations = useMemo(() => {
    const locSet = new Set<string>();
    logs.forEach(log => {
      if (log.location && log.location.trim()) {
        locSet.add(log.location.trim());
      }
    });
    return Array.from(locSet).filter(Boolean);
  }, [logs]);

  const previousCompanies = useMemo(() => {
    const compSet = new Set<string>();
    compSet.add('Al Tamdin Al Watania');
    logs.forEach(log => {
      if (log.company && log.company.trim()) {
        compSet.add(log.company.trim());
      }
    });
    return Array.from(compSet).filter(Boolean);
  }, [logs]);

  const handleAutoTranslate = async () => {
    if (!description.trim()) {
      alert(lang === 'bn' ? 'দয়া করে কিছু বিবরণ লিখুন!' : 'Please write some work description first!');
      return;
    }
    setIsTranslating(true);
    try {
      const res = await autoTranslateWork(description);
      const containsBengali = /[\u0980-\u09FF]/.test(description);
      let unifiedDesc = '';
      if (containsBengali) {
        unifiedDesc = `${description.trim()}\n\n[EN] ${res.english.trim()}\n[AR] ${res.arabic.trim()}`;
      } else {
        unifiedDesc = `${description.trim()}\n\n[AR] ${res.arabic.trim()}\n[BN] ${res.bengali.trim()}`;
      }
      setDescription(unifiedDesc);
    } catch (err) {
      console.error('Auto translation failed:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Set default date to today's date in local time
  useEffect(() => {
    if (editingLog) {
      setDateGregorian(editingLog.dateGregorian);
      setCompany(editingLog.company);
      setLocation(editingLog.location || '');
      setDescription(editingLog.description);
      setHours(editingLog.hours);
      setOvertime(editingLog.overtime);
      setNotes(editingLog.notes || '');
    } else {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      setDateGregorian(`${year}-${month}-${day}`);
    }
  }, [editingLog]);

  // Update Hijri date in real-time as Gregorian date changes
  useEffect(() => {
    if (dateGregorian) {
      const hijri = convertGregorianToHijri(dateGregorian);
      setDateHijri(hijri);
    } else {
      setDateHijri({ arabic: '', latin: '', bengali: '' });
    }
  }, [dateGregorian]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    if (!dateGregorian) {
      setErrorMsg('দয়া করে তারিখ নির্বাচন করুন (Arabic: الرجاء تحديد التاريخ)');
      setIsSubmitting(false);
      return;
    }
    if (!company.trim()) {
      setErrorMsg('দয়া করে কোম্পানির নাম লিখুন (Arabic: الرجاء إدخال اسم الشركة)');
      setIsSubmitting(false);
      return;
    }
    if (!description.trim()) {
      setErrorMsg('কাজের বিবরণ পূরণ করা আবশ্যক (Arabic: تفاصيل العمل مطلوبة)');
      setIsSubmitting(false);
      return;
    }
    if (hours < 0 || hours > 24) {
      setErrorMsg('কাজের ঘন্টা ০ থেকে ২৪ এর মধ্যে হতে হবে');
      setIsSubmitting(false);
      return;
    }
    if (overtime < 0 || overtime > 24) {
      setErrorMsg('ওভারটাইম ০ থেকে ২৪ এর মধ্যে হতে হবে');
      setIsSubmitting(false);
      return;
    }

    try {
      await onSave({
        dateGregorian,
        dateHijri: `${dateHijri.arabic} (${dateHijri.bengali})`,
        company: company.trim(),
        location: location.trim(),
        description: description.trim(),
        hours: Number(hours),
        overtime: Number(overtime),
        notes: notes.trim(),
      });

      // Clear form only on fresh insert
      if (!editingLog) {
        setDescription('');
        setOvertime(0);
        setNotes('');
        setLocation('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetQuickHours = (h: number, ot: number) => {
    setHours(h);
    setOvertime(ot);
  };

  return (
    <div 
      id={id}
      className={`bg-white dark:bg-slate-800 border ${editingLog ? 'border-amber-400 ring-2 ring-amber-100 dark:ring-amber-900/20' : 'border-slate-200 dark:border-slate-700'} p-4 shadow-sm rounded-xl relative overflow-hidden`}
    >
      {/* Subtle Form Background Watermark */}
      <div className="absolute -right-14 -bottom-14 pointer-events-none select-none opacity-[0.025] dark:opacity-[0.01] z-0">
        <TamdeenLogo showText={false} iconSize={160} className="transform rotate-12" />
      </div>

      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2.5 mb-3 relative z-10">
        <div>
          <h2 className="text-sm font-black text-slate-700 dark:text-slate-100 font-sans tracking-tight">
            {editingLog ? DICTIONARY.formEdit[lang] : DICTIONARY.formAddNew[lang]}
          </h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-400 font-sans">
            {editingLog ? DICTIONARY.formEditDetails[lang] : DICTIONARY.formRecordDetails[lang]}
          </p>
        </div>
        <div className={`text-right ${editingLog ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
          <h3 className="text-xs font-bold font-sans">
            {editingLog ? (lang === 'bn' ? 'সংশোধন সেশন' : 'Edit Session') : (lang === 'bn' ? 'নতুন এন্ট্রি' : 'New Entry')}
          </h3>
          <p className="text-[9px] font-sans">
            {editingLog ? 'تعديل السجل' : 'حفظ سجل'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 relative z-10">
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg p-2.5 flex gap-2 items-start text-[11px] text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{lang === 'bn' ? 'ত্রুটি' : 'Error'} / Alert:</p>
              <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Date Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex justify-between items-center">
              <span>১. {DICTIONARY.formDateGregorian[lang]}</span>
              <span>التاريخ الميلادي</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                id="form-date-gregorian"
                type="date"
                required
                value={dateGregorian}
                onChange={(e) => setDateGregorian(e.target.value)}
                className="w-full bg-slate-50/55 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pl-8 pr-2 text-xs focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-all font-sans text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex justify-between items-center">
              <span>২. {DICTIONARY.formDateHijri[lang]}</span>
              <span>التاريخ الهجري</span>
            </label>
            <div className="bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 min-h-[32px] flex flex-col justify-center">
              {dateHijri.arabic ? (
                <div className="flex items-center justify-between">
                  {lang === 'bn' ? (
                    <span className="text-[10px] font-mono font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-1 py-0.5 rounded">
                      {dateHijri.bengali}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-1 py-0.5 rounded">
                      {dateHijri.latin}
                    </span>
                  )}
                  <span className="text-xs font-sans font-bold text-slate-700 dark:text-slate-200 tracking-tight dir-rtl">
                    {dateHijri.arabic}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                  {lang === 'bn' ? 'অটো আরবি তারিখ' : 'Automatic Hijri Calculation'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Company & Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex justify-between items-center">
              <span>৩. {DICTIONARY.formCompany[lang]}</span>
              <span>اسم الشركة</span>
            </label>
            <div className="relative">
              <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                id="form-company"
                type="text"
                list="suggested-companies"
                required
                placeholder="Al Tamdin Al Watania"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-slate-50/55 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pl-8 pr-2 text-xs focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-all font-sans text-slate-700 dark:text-slate-200"
              />
              <datalist id="suggested-companies">
                {previousCompanies.map(comp => (
                  <option key={comp} value={comp} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex justify-between items-center">
              <span>৪. {DICTIONARY.formLocation[lang]}</span>
              <span>الموقع / الحقل</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                id="form-location"
                type="text"
                list="suggested-sites"
                placeholder="Site Riyadh"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50/55 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pl-8 pr-2 text-xs focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-all font-sans text-slate-700 dark:text-slate-200"
              />
              <datalist id="suggested-sites">
                {previousLocations.map(loc => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>
            {/* Quick autocomplete pills for previously saved site locations */}
            {previousLocations.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold self-center">
                  {lang === 'bn' ? 'আগের সাইট:' : 'Saved:'}
                </span>
                {previousLocations.slice(0, 5).map(loc => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocation(loc)}
                    className="text-[9px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded transition-all cursor-pointer border border-transparent dark:border-slate-700"
                  >
                    {loc}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Direct Work Description */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex justify-between items-center">
            <span>৫. {DICTIONARY.formDescription[lang]} <span className="text-rose-500">*</span></span>
            <span>تفاصيل العمل</span>
          </label>
          <div className="relative">
            <FileText className="absolute left-2.5 top-2.5 text-slate-400 w-3.5 h-3.5" />
            <textarea
              id="form-description"
              required
              rows={3}
              placeholder={DICTIONARY.formDescriptionPlaceholder[lang]}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50/55 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pl-8 pr-2 text-xs focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-all font-sans text-slate-700 dark:text-slate-200"
            />
          </div>
          
          {/* Slick Client-Side Automatic Translator Trigger Button */}
          <button
            type="button"
            onClick={handleAutoTranslate}
            disabled={isTranslating}
            className="mt-1 pb-1 flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-350 transition-all cursor-pointer disabled:opacity-50 select-none no-print-export"
          >
            {isTranslating ? (
              <>
                <span className="w-2.5 h-2.5 border-2 border-blue-600/30 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
                <span>{lang === 'bn' ? 'অনুবাদ হচ্ছে...' : 'Translating content...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" />
                <span>{lang === 'bn' ? 'ইংরেজি ও আরবিতে অটো অনুবাদ করুন' : 'Auto-Translate (বাংলা, EN, AR) • অনুবাদ করুন'}</span>
              </>
            )}
          </button>
        </div>

        {/* Regular Hours & Overtime */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex justify-between items-center">
              <span>৬. {DICTIONARY.formHours[lang]}</span>
              <span>ساعات عادية</span>
            </label>
            <div className="relative">
              <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                id="form-hours"
                type="number"
                min="0"
                max="24"
                step="0.5"
                required
                value={hours}
                onChange={(e) => setHours(e.target.value !== '' ? Number(e.target.value) : 0)}
                className="w-full bg-slate-50/55 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pl-8 pr-2 text-xs focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-all font-sans text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex justify-between items-center">
              <span>৭. {DICTIONARY.formOvertime[lang]}</span>
              <span>الوقت الإضافي</span>
            </label>
            <div className="relative">
              <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500 w-3.5 h-3.5" />
              <input
                id="form-overtime"
                type="number"
                min="0"
                max="24"
                step="0.5"
                required
                value={overtime}
                onChange={(e) => setOvertime(e.target.value !== '' ? Number(e.target.value) : 0)}
                className="w-full bg-slate-50/55 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pl-8 pr-2 text-xs focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-all font-sans text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Quick select presets */}
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">{DICTIONARY.formPresets[lang]}</span>
          <div className="grid grid-cols-2 gap-1 px-0.5">
            <button
              type="button"
              onClick={() => handleSetQuickHours(8, 0)}
              className="bg-slate-100/80 dark:bg-slate-800 dark:hover:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[10px] font-semibold py-1 rounded transition-colors cursor-pointer"
            >
              {lang === 'bn' ? '৮ ঘন্টা (No OT)' : '8 Hours (No OT)'}
            </button>
            <button
              type="button"
              onClick={() => handleSetQuickHours(8, 2)}
              className="bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-350 text-[10px] font-semibold py-1 rounded transition-colors cursor-pointer border border-transparent dark:border-amber-900/30"
            >
              {lang === 'bn' ? '৮ + ২ ওটি (10h)' : '8 + 2 OT (10h)'}
            </button>
            <button
              type="button"
              onClick={() => handleSetQuickHours(8, 4)}
              className="bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-850 dark:text-orange-350 text-[10px] font-semibold py-1 rounded transition-colors cursor-pointer border border-transparent dark:border-orange-900/30"
            >
              {lang === 'bn' ? '৮ + ৪ ওটি (12h)' : '8 + 4 OT (12h)'}
            </button>
            <button
              type="button"
              onClick={() => handleSetQuickHours(10, 0)}
              className="bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-800 dark:text-purple-350 text-[10px] font-semibold py-1 rounded transition-colors cursor-pointer border border-transparent dark:border-purple-900/30"
            >
              {lang === 'bn' ? '১০ ঘন্টা সরাসরি' : '10 Hours Flat'}
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex justify-between items-center">
            <span>৮. {DICTIONARY.formNotes[lang]}</span>
            <span>ملاحظات</span>
          </label>
          <input
            id="form-notes"
            type="text"
            placeholder={DICTIONARY.formNotesPlaceholder[lang]}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-50/55 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition-all font-sans text-slate-700 dark:text-slate-200"
          />
        </div>

        {/* Submit Actions */}
        <div className="flex gap-2 pt-2">
          {editingLog && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-lg text-xs font-semibold transition-colors flex-1 cursor-pointer"
            >
              {DICTIONARY.formCancel[lang]}
            </button>
          )}

          <button
            id="btn-save-log"
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-1.5 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm flex-[2] cursor-pointer ${
              editingLog 
                ? 'bg-amber-600 hover:bg-amber-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                {DICTIONARY.formSaving[lang]}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                {editingLog ? DICTIONARY.formUpdateBtn[lang] : DICTIONARY.formSaveBtn[lang]}
                <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
