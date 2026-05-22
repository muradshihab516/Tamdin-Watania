/**
 * Language & Translation Helper for Al Tamdin Al Watania Work Log System
 * Supports English, Arabic, and Bengali with keyless automatic translation
 */

export type LanguageMode = 'en-ar' | 'bn';

export interface TranslationDictionary {
  appTitle: { 'en-ar': string; bn: string };
  headerSubtitle: { 'en-ar': string; bn: string };
  guestModeOnly: { 'en-ar': string; bn: string };
  cloudConnected: { 'en-ar': string; bn: string };
  todayDate: { 'en-ar': string; bn: string };
  hijriDate: { 'en-ar': string; bn: string };
  logout: { 'en-ar': string; bn: string };
  settingsTitle: { 'en-ar': string; bn: string };
  settingsHourlyRate: { 'en-ar': string; bn: string };
  settingsHourlyDesc: { 'en-ar': string; bn: string };
  settingsOtMultiplier: { 'en-ar': string; bn: string };
  settingsOtDesc: { 'en-ar': string; bn: string };
  settingsClose: { 'en-ar': string; bn: string };
  
  // Stats
  statDaysTitle: { 'en-ar': string; bn: string };
  statDaysDesc: { 'en-ar': string; bn: string };
  statHoursTitle: { 'en-ar': string; bn: string };
  statHoursDesc: { 'en-ar': string; bn: string };
  statOtTitle: { 'en-ar': string; bn: string };
  statOtDesc: { 'en-ar': string; bn: string };
  statEarningsTitle: { 'en-ar': string; bn: string };
  statEarningsDesc: { 'en-ar': string; bn: string };
  
  // Form fields
  formAddNew: { 'en-ar': string; bn: string };
  formEdit: { 'en-ar': string; bn: string };
  formRecordDetails: { 'en-ar': string; bn: string };
  formEditDetails: { 'en-ar': string; bn: string };
  formDateGregorian: { 'en-ar': string; bn: string };
  formDateHijri: { 'en-ar': string; bn: string };
  formCompany: { 'en-ar': string; bn: string };
  formLocation: { 'en-ar': string; bn: string };
  formDescription: { 'en-ar': string; bn: string };
  formDescriptionPlaceholder: { 'en-ar': string; bn: string };
  formHours: { 'en-ar': string; bn: string };
  formOvertime: { 'en-ar': string; bn: string };
  formPresets: { 'en-ar': string; bn: string };
  formNotes: { 'en-ar': string; bn: string };
  formNotesPlaceholder: { 'en-ar': string; bn: string };
  formSaveBtn: { 'en-ar': string; bn: string };
  formUpdateBtn: { 'en-ar': string; bn: string };
  formSaving: { 'en-ar': string; bn: string };
  formCancel: { 'en-ar': string; bn: string };
  
  // Table & Export
  tableTitle: { 'en-ar': string; bn: string };
  tableSub: { 'en-ar': string; bn: string };
  tableExportCsv: { 'en-ar': string; bn: string };
  tablePrint: { 'en-ar': string; bn: string };
  tableSavePng: { 'en-ar': string; bn: string };
  tableHeaderDate: { 'en-ar': string; bn: string };
  tableHeaderCompany: { 'en-ar': string; bn: string };
  tableHeaderLocation: { 'en-ar': string; bn: string };
  tableHeaderHours: { 'en-ar': string; bn: string };
  tableHeaderOvertime: { 'en-ar': string; bn: string };
  tableHeaderEarnings: { 'en-ar': string; bn: string };
  tableHeaderDescription: { 'en-ar': string; bn: string };
  tableHeaderNotes: { 'en-ar': string; bn: string };
  tableHeaderActions: { 'en-ar': string; bn: string };
  tableNoData: { 'en-ar': string; bn: string };
}

export const DICTIONARY: TranslationDictionary = {
  appTitle: {
    'en-ar': 'Al Tamdin Al Watania Work Log (التمدين الوطنية)',
    bn: 'আল তামদিন আল ওয়াতানিয়া কাজের খাতা'
  },
  headerSubtitle: {
    'en-ar': 'Personal independent work log recorder (سجل عمل مستقل)',
    bn: 'নিজে ব্যবহারের জন্য ব্যক্তিগত কাজের খাতা'
  },
  guestModeOnly: {
    'en-ar': 'Guest Mode (Offline)',
    bn: 'গেস্ট মোড (অফলাইন)'
  },
  cloudConnected: {
    'en-ar': 'Cloud Connected (الخدمة السحابية)',
    bn: 'ক্লাউড কানেক্টেড (সার্ভার)'
  },
  todayDate: {
    'en-ar': 'Today / اليوم:',
    bn: 'আজ:'
  },
  hijriDate: {
    'en-ar': 'Hijri Date / هجري:',
    bn: 'হিজরি:'
  },
  logout: {
    'en-ar': 'Log Out (الخروج)',
    bn: 'লগআউট'
  },
  settingsTitle: {
    'en-ar': 'Salary Estimation Settings (إعدادات الرواتب)',
    bn: 'সহজ মজুরি হিসাব সেটিংস'
  },
  settingsHourlyRate: {
    'en-ar': 'Standard hourly wage (SAR)',
    bn: 'প্রতি ঘন্টার সাধারণ বেতন (SAR)'
  },
  settingsHourlyDesc: {
    'en-ar': 'Used to calculate baseline wages for working hours',
    bn: 'এটি দিয়ে সাধারণ কার্যকালীন সময়ের মোট বেতনের হিসাব করা যাবে।'
  },
  settingsOtMultiplier: {
    'en-ar': 'Overtime Rate Multiplier (x)',
    bn: 'ওভারটাইম বেতন মাল্টিপ্লায়ার (Multiplier)'
  },
  settingsOtDesc: {
    'en-ar': 'Multiplier for overtime hours (e.g., 1.5 times)',
    bn: 'যেমন: ১.৫ মানে প্রতি ঘন্টা ওভারটাইমে ১.৫ গুণ বেশি বেতন পাবেন।'
  },
  settingsClose: {
    'en-ar': 'Close / إغلاق',
    bn: 'বন্ধ করুন'
  },
  
  // Stats
  statDaysTitle: {
    'en-ar': 'Total Days Logged / إجمالي الأيام',
    bn: 'সর্বমোট কাজের দিন'
  },
  statDaysDesc: {
    'en-ar': 'Combined calendar days worked',
    bn: 'মোট কাজের দিন সংখ্যা'
  },
  statHoursTitle: {
    'en-ar': 'Duty Hours Worked / ساعات عادية',
    bn: 'ডিউটি আওয়ার হিসেব'
  },
  statHoursDesc: {
    'en-ar': 'Total normal working duration hours',
    bn: 'মোট সাধারণ কার্যকালীন সময়'
  },
  statOtTitle: {
    'en-ar': 'Overtime Logged / ساعات إضافية',
    bn: 'অতিরিক্ত ওভারটাইম'
  },
  statOtDesc: {
    'en-ar': 'Total overtime hours duration',
    bn: 'মোট অতিরিক্ত ওভারটাইম সময়'
  },
  statEarningsTitle: {
    'en-ar': 'Estimated Gross Earnings / الدخل التقديري',
    bn: 'আনুমানিক মোট বেতন ফলাফল'
  },
  statEarningsDesc: {
    'en-ar': 'Wages computed from standard rates + OT',
    bn: 'ভিত্তি মজুরি ও ওটি গুনের হিসাব'
  },

  // Form
  formAddNew: {
    'en-ar': 'New Work Details / إدخال جدید',
    bn: 'নতুন কাজের বিবরণ'
  },
  formEdit: {
    'en-ar': 'Edit Work Details / تعديل البيانات',
    bn: 'কাজের বিবরণী সংশোধন'
  },
  formRecordDetails: {
    'en-ar': 'Record daily tasks, site, and overtime',
    bn: 'দৈনিক কাজ, অতিরিক্ত সময় এবং কাজের সাইট এন্ট্রি করুন'
  },
  formEditDetails: {
    'en-ar': 'Modify already stored entry details',
    bn: 'ইতিমধ্যে সংরক্ষিত এন্ট্রির বিবরণ পরিবর্তন করুন'
  },
  formDateGregorian: {
    'en-ar': 'Gregorian Date / الميلادي',
    bn: 'ইংরেজি তারিখ'
  },
  formDateHijri: {
    'en-ar': 'Hijri Date / الهجري',
    bn: 'আরবি হিজরি তারিখ (ঐচ্ছিক)'
  },
  formCompany: {
    'en-ar': 'Company Name / اسم الشركة',
    bn: 'কোম্পানির নাম'
  },
  formLocation: {
    'en-ar': 'Site Location / موقع العمل',
    bn: 'কাজের স্লট / সাইট'
  },
  formDescription: {
    'en-ar': 'Work Details / تفاصيل العمل',
    bn: 'কাজের সুনির্দিষ্ট বিবরণ'
  },
  formDescriptionPlaceholder: {
    'en-ar': 'What tasks did you work on today? (write in EN, AR, or BN)...',
    bn: 'আজকে কী কী কাজ করেছেন বিস্তারিত লিখুন...'
  },
  formHours: {
    'en-ar': 'Standard Duty Hours / ساعات عادية',
    bn: 'ডিউটি আওয়ার (Hours)'
  },
  formOvertime: {
    'en-ar': 'Overtime Hours (O.T.) / الوقت الإضافي',
    bn: 'ওভারটাইম ঘন্টা (O.T.)'
  },
  formPresets: {
    'en-ar': 'Quick Time Presets / ساعات سريعة',
    bn: 'কুইক আওয়ার প্যানেল (Presets):'
  },
  formNotes: {
    'en-ar': 'Remarks / Notes (ملاحظات)',
    bn: 'মন্তব্য / নোট (ঐচ্ছিক)'
  },
  formNotesPlaceholder: {
    'en-ar': 'Holiday, Travel time or specific comments...',
    bn: 'ছুটির দিন, ট্রাভেল টাইম ইত্যাদি...'
  },
  formSaveBtn: {
    'en-ar': 'Save Work Record / حفظ',
    bn: 'সরাসরি ডাটাবেজে সংরক্ষণ করুন'
  },
  formUpdateBtn: {
    'en-ar': 'Update Work Record / تحديث',
    bn: 'হিসেব আপডেট করুন'
  },
  formSaving: {
    'en-ar': 'Saving / جاري الحفظ...',
    bn: 'সংরক্ষণ হচ্ছে...'
  },
  formCancel: {
    'en-ar': 'Cancel / إلغاء',
    bn: 'বাতিল করুন'
  },

  // Table
  tableTitle: {
    'en-ar': 'Detailed Work History & Statements / السجل التاريخي',
    bn: 'কাজের সুনির্দিষ্ট হিসাব বিবরণী ও ইতিহাস'
  },
  tableSub: {
    'en-ar': 'List of latest records, tools, searching & calculations',
    bn: 'সম্পূর্ণ রেকর্ড তালিকা, সার্চ, ফিল্টারিং এবং অটো হিসাব টুল'
  },
  tableExportCsv: {
    'en-ar': 'Export to CSV / تصدير CSV',
    bn: 'CSV এক্সপোর্ট'
  },
  tablePrint: {
    'en-ar': 'Print Report / طباعة',
    bn: 'রিপোর্ট প্রিন্ট করুন'
  },
  tableSavePng: {
    'en-ar': 'Save PNG Report / حفظ كصورة',
    bn: 'Save PNG (সেভ পিএনজি)'
  },
  tableHeaderDate: {
    'en-ar': 'Date / التاريخ',
    bn: 'তারিখ (হিজরি)'
  },
  tableHeaderCompany: {
    'en-ar': 'Company / الشركة',
    bn: 'কোম্পানি'
  },
  tableHeaderLocation: {
    'en-ar': 'Location / الموقع',
    bn: 'সাইট স্থান'
  },
  tableHeaderHours: {
    'en-ar': 'Standard Hours',
    bn: 'ডিউটি ঘন্টা'
  },
  tableHeaderOvertime: {
    'en-ar': 'Overtime (OT)',
    bn: 'ওটি ঘন্টা'
  },
  tableHeaderEarnings: {
    'en-ar': 'Estimated Wages',
    bn: 'মজুরি হিসাব'
  },
  tableHeaderDescription: {
    'en-ar': 'Work Description / বিবরণ',
    bn: 'সম্পূর্ণ কাজের বিবরণ'
  },
  tableHeaderNotes: {
    'en-ar': 'Remarks / ملاحظات',
    bn: 'মন্তব্য / নোট'
  },
  tableHeaderActions: {
    'en-ar': 'Actions / إجراءات',
    bn: 'ব্যবস্থাপনা'
  },
  tableNoData: {
    'en-ar': 'No records matched your filters. / لا يوجد سجلات مطابقة',
    bn: 'কোন কাজের হিসাব রেকর্ড পাওয়া যায় নি।'
  }
};

/**
 * Keyless translation using Google public single translate endpoint.
 * Robust, client-safe, perfect for static architectures like GitHub Pages.
 */
export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text || !text.trim()) return '';
  try {
    // sl=auto detects input language automatically (Bengali, English, Arabic)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('CORS or translation fetch failure');
    const data = await res.json();
    if (data && data[0]) {
      const translatedParts = data[0].map((part: any) => part[0]).filter(Boolean);
      return translatedParts.join(' ');
    }
    return text;
  } catch (error) {
    console.error(`Google single translation error to ${targetLang}:`, error);
    return text;
  }
}

/**
 * Translate a block of text into translation fields for both Arabic & English
 */
export async function autoTranslateWork(text: string): Promise<{ english: string; arabic: string; bengali: string }> {
  // Translate to English
  const english = await translateText(text, 'en');
  // Translate to Arabic
  const arabic = await translateText(text, 'ar');
  // Translate to Bengali (just in case)
  const bengali = await translateText(text, 'bn');
  
  return { english, arabic, bengali };
}
