import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Global Application State Variables
let app, auth, db, googleProvider;
let currentUser = null;
let isOnlineAuthenticated = false;
let currentLogs = [];
let editingLogId = null;

let lang = localStorage.getItem('al_tamdin_lang') === 'bn' ? 'bn' : 'en-ar';
let isDarkMode = localStorage.getItem('al_tamdin_dark_mode') === 'true';
let hourlyRate = Number(localStorage.getItem('al_tamdin_hourly_rate') || '15');
let otMultiplier = Number(localStorage.getItem('al_tamdin_ot_multiplier') || '1.5');
let hideWages = localStorage.getItem('al_tamdin_hide_wages') !== 'false'; // defaults to true (masked)

// Languages Translation Dictionary Mappings
const DICTIONARY = {
  appTitle: { 'en-ar': 'Al Tamdin Al Watania Work Log (التمدين الوطنية)', bn: 'আল তামদিন আল ওয়াতানিয়া কাজের খাতা' },
  headerSubtitle: { 'en-ar': 'Personal independent work log recorder (سجل عمل مستقل)', bn: 'নিজে ব্যবহারের জন্য ব্যক্তিগত কাজের খাতা' },
  guestModeOnly: { 'en-ar': 'Guest Mode (Offline)', bn: 'গেস্ট মোড (অফলাইন)' },
  cloudConnected: { 'en-ar': 'Cloud Connected (الخدمة السحابية)', bn: 'ক্লাউড কানেক্টেড (সার্ভার)' },
  todayDate: { 'en-ar': 'Today / اليوم:', bn: 'আজ:' },
  hijriDate: { 'en-ar': 'Hijri Date / هجري:', bn: 'হিজরি:' },
  logout: { 'en-ar': 'Log Out (الخروج)', bn: 'লগআউট' },
  settingsTitle: { 'en-ar': 'Salary Estimation Settings (إعدادات الرواتب)', bn: 'সহজ মজুরি হিসাব সেটিংস' },
  settingsHourlyRate: { 'en-ar': 'Standard hourly wage (SAR)', bn: 'প্রতি ঘন্টার সাধারণ বেতন (SAR)' },
  settingsHourlyDesc: { 'en-ar': 'Used to calculate baseline wages for working hours', bn: 'এটি দিয়ে সাধারণ কার্যকালীন সময়ের মোট বেতনের হিসাব করা যাবে।' },
  settingsOtMultiplier: { 'en-ar': 'Overtime Rate Multiplier (x)', bn: 'ওভারটাইম বেতন মাল্টিপ্লায়ার (Multiplier)' },
  settingsOtDesc: { 'en-ar': 'Multiplier for overtime hours (e.g., 1.5 times)', bn: 'যেমন: ১.৫ মানে প্রতি ঘন্টা ওভারটাইমে ১.৫ গুণ বেশি বেতন পাবেন।' },
  settingsClose: { 'en-ar': 'Save Settings / حفظ', bn: 'সেটিংস সেভ করুন' },
  statDaysTitle: { 'en-ar': 'Total Days Logged / إجمالي الأيام', bn: 'সর্বমোট কাজের দিন' },
  statDaysDesc: { 'en-ar': 'Combined calendar days worked', bn: 'মোট কাজের দিন সংখ্যা' },
  statHoursTitle: { 'en-ar': 'Duty Hours Worked / ساعات عادية', bn: 'ডিউটি আওয়ার হিসেব' },
  statHoursDesc: { 'en-ar': 'Total normal working duration hours', bn: 'মোট সাধারণ কার্যকালীন সময়' },
  statOtTitle: { 'en-ar': 'Overtime Logged / ساعات إضافية', bn: 'অতিরিক্ত ওভারটাইম' },
  statOtDesc: { 'en-ar': 'Total overtime hours duration', bn: 'মোট অতিরিক্ত ওভারটাইম সময়' },
  statEarningsTitle: { 'en-ar': 'Estimated Gross Earnings / الدخل التقديري', bn: 'আনুমানিক মোট বেতন ফলাফল' },
  statEarningsDesc: { 'en-ar': 'Wages computed from standard rates + OT', bn: 'ভিত্তি মজুরি ও ওটি গুনের হিসাব' },
  formAddNew: { 'en-ar': 'New Work Details / إدخال جدید', bn: 'নতুন কাজের বিবরণ' },
  formEdit: { 'en-ar': 'Edit Work Details / تعديل البيانات', bn: 'কাজের বিবরণী সংশোধন' },
  formRecordDetails: { 'en-ar': 'Record daily tasks, site, and overtime', bn: 'দৈনিক কাজ, অতিরিক্ত সময় এবং কাজের সাইট এন্ট্রি করুন' },
  formEditDetails: { 'en-ar': 'Modify already stored entry details', bn: 'ইতিমধ্যে সংরক্ষিত এন্ট্রির বিবরণ পরিবর্তন করুন' },
  formDateGregorian: { 'en-ar': 'Gregorian Date / الميلادي', bn: 'ইংরেজি তারিখ' },
  formDateHijri: { 'en-ar': 'Hijri Date / الهجري', bn: 'আরবি হিজরি তারিখ (ঐচ্ছিক)' },
  formCompany: { 'en-ar': 'Company Name / اسم الشركة', bn: 'কোম্পানির নাম' },
  formLocation: { 'en-ar': 'Site Location / موقع العمل', bn: 'কাজের স্লট / সাইট' },
  formDescription: { 'en-ar': 'Work Details / تفاصيل العمل', bn: 'কাজের সুনির্দিষ্ট বিবরণ' },
  formDescriptionPlaceholder: { 'en-ar': 'What tasks did you work on today? (write in EN, AR, or BN)...', bn: 'আজকে কী কী কাজ করেছেন বিস্তারিত লিখুন...' },
  formHours: { 'en-ar': 'Standard Duty Hours / ساعات عادية', bn: 'ডিউটি আওয়ার (Hours)' },
  formOvertime: { 'en-ar': 'Overtime Hours (O.T.) / الوقت الإضافي', bn: 'ওভারটাইম ঘন্টা (O.T.)' },
  formPresets: { 'en-ar': 'Quick Time Presets / ساعات سريعة', bn: 'কুইক আওয়ার প্যানেল (Presets):' },
  formNotes: { 'en-ar': 'Remarks / Notes (ملاحظات)', bn: 'মন্তব্য / নোট (ঐচ্ছিক)' },
  formNotesPlaceholder: { 'en-ar': 'Holiday, Travel time or specific comments...', bn: 'ছুটির দিন, ট্রাভেল টাইম ইত্যাদি...' },
  formSaveBtn: { 'en-ar': 'Save Work Record / حفظ', bn: 'সরাসরি ডাটাবেজে সংরক্ষণ করুন' },
  formUpdateBtn: { 'en-ar': 'Update Work Record / تحديث', bn: 'হিসেব আপডেট করুন' },
  formSaving: { 'en-ar': 'Saving / جاري الحفظ...', bn: 'সংরক্ষণ হচ্ছে...' },
  formCancel: { 'en-ar': 'Cancel / إلغاء', bn: 'বাতিল করুন' },
  tableTitle: { 'en-ar': 'Detailed Work History & Statements / السجل التاريخي', bn: 'কাজের সুনির্দিষ্ট হিসাব বিবরণী ও ইতিহাস' },
  tableSub: { 'en-ar': 'List of latest records, tools, searching & calculations', bn: 'সম্পূর্ণ রেকর্ড তালিকা, সার্চ, ফিল্টারিং এবং অটো হিসাব টুল' },
  tableExportCsv: { 'en-ar': 'Export to CSV / تصدير CSV', bn: 'CSV এক্সপোর্ট' },
  tablePrint: { 'en-ar': 'Print Report / طباعة', bn: 'রিপোর্ট প্রিন্ট করুন' },
  tableSavePng: { 'en-ar': 'Save PNG Report / حفظ كصورة', bn: 'Save PNG (সেভ পিএনজি)' },
  tableHeaderDate: { 'en-ar': 'Date / التاريخ', bn: 'তারিখ (হিজরি)' },
  tableHeaderCompany: { 'en-ar': 'Company / الشركة', bn: 'কোম্পানি' },
  tableHeaderLocation: { 'en-ar': 'Location / الموقع', bn: 'সাইট স্থান' },
  tableHeaderHours: { 'en-ar': 'Standard Hours', bn: 'ডিউটি ঘন্টা' },
  tableHeaderOvertime: { 'en-ar': 'Overtime (OT)', bn: 'ওটি ঘন্টা' },
  tableHeaderEarnings: { 'en-ar': 'Estimated Wages', bn: 'মজুরি হিসাব' },
  tableHeaderDescription: { 'en-ar': 'Work Description / বিবরণ', bn: 'সম্পূর্ণ কাজের বিবরণ' },
  tableHeaderNotes: { 'en-ar': 'Remarks / ملاحظات', bn: 'মন্তব্য / নোট' },
  tableHeaderActions: { 'en-ar': 'Actions / إجراءات', bn: 'ব্যবস্থাপনা' },
  tableNoData: { 'en-ar': 'No records matched your filters. / لا يوجد سجلات مطابقة', bn: 'কোন কাজের হিসাব রেকর্ড পাওয়া যায় নি।' }
};

// 1. Convert Gregorian date string (YYYY-MM-DD) into Arabic & Bengali Hijri format
function convertGregorianToHijri(dateStr) {
  if (!dateStr) return { arabic: '', latin: '', bengali: '' };
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { arabic: '', latin: '', bengali: '' };
  }

  try {
    let y = date.getFullYear();
    let m = date.getMonth() + 1;
    let d = date.getDate();

    if (m <= 2) {
      y -= 1;
      m += 12;
    }

    const A = Math.floor(y / 100);
    const B = Math.floor(A / 4);
    const C = 2 - A + B;
    const E = Math.floor(365.25 * (y + 4716));
    const F = Math.floor(30.6001 * (m + 1));
    const jd = C + d + E + F - 1524.5;

    const ksaAdjustment = 1.0; 
    const totalDays = jd - 1948439.5 + ksaAdjustment;

    let cycles = Math.floor(totalDays / 10631);
    let rem = totalDays % 10631;
    if (rem < 0) {
      rem += 10631;
      cycles -= 1;
    }

    const isLeapYearInCycle = (yr) => [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29].includes(yr);

    let yearInCycle = 1;
    let daysAccumulated = 0;
    while (yearInCycle <= 30) {
      const yearDays = isLeapYearInCycle(yearInCycle) ? 355 : 354;
      if (daysAccumulated + yearDays > rem) {
        break;
      }
      daysAccumulated += yearDays;
      yearInCycle++;
    }

    const hYear = cycles * 30 + yearInCycle;
    const dayInYear = rem - daysAccumulated;

    const monthDays = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, isLeapYearInCycle(yearInCycle) ? 30 : 29];
    let hMonth = 0;
    let hDay = Math.floor(dayInYear) + 1;

    while (hMonth < 12 && hDay > monthDays[hMonth]) {
      hDay -= monthDays[hMonth];
      hMonth++;
    }

    const hMonth1Based = hMonth + 1;

    const HIJRI_MONTHS_EN = [
      "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
      "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
      "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
    ];

    const HIJRI_MONTHS_AR = [
      "محرم", "صفر", "ربيع الأول", "ربيع الآخر",
      "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
      "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
    ];

    const HIJRI_MONTHS_BN = [
      "মহররম", "সফর", "রবিউল আউয়াল", "রবিউস সানি",
      "জমাদিউল আউয়াল", "জমাদিউস সানি", "রজব", "শাবান",
      "রমজান", "শাওয়াল", "জিলকদ", "জিলহজ"
    ];

    const toArabicDigits = (num) => {
      const b = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      return String(num).split('').map(c => b[parseInt(c)] || c).join('');
    };

    const toBengaliDigits = (num) => {
      const b = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return String(num).split('').map(c => b[parseInt(c)] || c).join('');
    };

    const finalMonthEn = HIJRI_MONTHS_EN[hMonth1Based - 1] || "Hijri Month";
    const finalMonthAr = HIJRI_MONTHS_AR[hMonth1Based - 1] || "الشهر الهجري";
    const finalMonthBn = HIJRI_MONTHS_BN[hMonth1Based - 1] || "হিজরি মাস";

    const arabic = `${toArabicDigits(hDay)} ${finalMonthAr} ${toArabicDigits(hYear)}`;
    const latin = `${hDay} ${finalMonthEn} ${hYear}`;
    const bengali = `${toBengaliDigits(hDay)} ${finalMonthBn} ${toBengaliDigits(hYear)}`;

    return { arabic, latin, bengali };
  } catch (error) {
    return { arabic: 'التاريخ الهجري', latin: 'Hijri Date', bengali: 'হিজরি তারিখ' };
  }
}

// 2. Format Gregorian date in Bengali and English
function formatGregorianDate(dateStr) {
  if (!dateStr) return { english: '', bengali: '' };
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { english: '', bengali: '' };

  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const english = new Intl.DateTimeFormat('en-US', options).format(date);
  const bengali = new Intl.DateTimeFormat('bn-BD', options).format(date);
  return { english, bengali };
}

// Mask Wages UI styling sincronization knob
function updateMaskWagesUI() {
  const btnToggleMask = document.getElementById('btn-toggle-mask-state');
  const knob = document.getElementById('span-mask-knob');
  if (!btnToggleMask || !knob) return;

  if (hideWages) {
    knob.style.transform = 'translateX(20px)';
    btnToggleMask.classList.add('bg-brand-500');
    btnToggleMask.classList.remove('bg-slate-200', 'dark:bg-slate-800');
  } else {
    knob.style.transform = 'translateX(0px)';
    btnToggleMask.classList.remove('bg-brand-500');
    btnToggleMask.classList.add('bg-slate-200', 'dark:bg-slate-800');
  }
}

// 3. Online/Offline UI translation helper
function translateUI() {
  const t = (key) => DICTIONARY[key] ? DICTIONARY[key][lang] : '';
  
  const safeSetText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };

  const safeSetPlaceholder = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.placeholder = val;
  };

  const safeSetHtml = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = val;
  };

  safeSetText('nav-app-title', t('appTitle'));
  safeSetText('nav-app-subtitle', t('headerSubtitle'));
  safeSetText('txt-lang-label', lang === 'bn' ? 'English / Arabic' : 'বাংলা');
  safeSetText('txt-logout', t('logout'));

  // Stats
  safeSetText('stat-lbl-days', t('statDaysTitle'));
  safeSetText('stat-desc-days', t('statDaysDesc'));
  safeSetText('stat-lbl-hours', t('statHoursTitle'));
  safeSetText('stat-desc-hours', t('statHoursDesc'));
  safeSetText('stat-lbl-ot', t('statOtTitle'));
  safeSetText('stat-desc-ot', t('statOtDesc'));
  
  const earningsLabel = document.getElementById('stat-lbl-wages');
  if (earningsLabel) {
    earningsLabel.innerHTML = t('statEarningsTitle') + ` <i data-lucide="eye" id="icon-wages-open" class="h-3 w-3 inline cursor-pointer text-slate-400"></i>`;
  }
  safeSetText('stat-desc-wages', t('statEarningsDesc'));

  // Form Fields Label
  safeSetText('lbl-form-title', editingLogId ? t('formEdit') : t('formAddNew'));
  safeSetText('lbl-form-subtitle', editingLogId ? t('formEditDetails') : t('formRecordDetails'));
  safeSetText('lbl-f-date', t('formDateGregorian'));
  safeSetText('lbl-f-hijri', t('formDateHijri'));
  safeSetText('lbl-f-company', t('formCompany'));
  safeSetText('lbl-f-location', t('formLocation'));
  safeSetText('lbl-f-hours', t('formHours'));
  safeSetText('lbl-f-ot', t('formOvertime'));
  safeSetText('lbl-presets', t('formPresets'));
  safeSetText('lbl-f-desc', t('formDescription'));
  safeSetPlaceholder('field-description', t('formDescriptionPlaceholder'));
  safeSetText('lbl-f-notes', t('formNotes'));
  safeSetPlaceholder('field-notes', t('formNotesPlaceholder'));
  safeSetText('txt-btn-submit', editingLogId ? t('formUpdateBtn') : t('formSaveBtn'));
  safeSetText('txt-btn-cancel', t('formCancel'));
  safeSetText('badge-form-action', editingLogId ? 'EDIT' : 'ADD');

  // Table header/subtitles
  safeSetText('lbl-tbl-title', t('tableTitle'));
  safeSetText('lbl-tbl-subtitle', t('tableSub'));
  safeSetText('txt-export-csv', t('tableExportCsv'));
  safeSetText('txt-print-btn', t('tablePrint'));

  const savePngLabel = document.getElementById('txt-save-png');
  if (savePngLabel) {
    savePngLabel.innerText = t('tableSavePng') || 'Save PNG Report';
  }

  safeSetText('th-date', t('tableHeaderDate'));
  safeSetText('th-company', t('tableHeaderCompany'));
  safeSetText('th-location', t('tableHeaderLocation'));
  safeSetText('th-hours', t('tableHeaderHours'));
  safeSetText('th-ot', t('tableHeaderOvertime'));
  safeSetText('th-wages', t('tableHeaderEarnings'));
  safeSetText('th-description', t('tableHeaderDescription'));
  safeSetText('th-notes', t('tableHeaderNotes'));
  safeSetText('th-actions', t('tableHeaderActions'));

  // Settings
  safeSetText('lbl-set-title', t('settingsTitle'));
  safeSetText('lbl-set-rate', t('settingsHourlyRate'));
  safeSetText('lbl-set-rate-desc', t('settingsHourlyDesc'));
  safeSetText('lbl-set-ot', t('settingsOtMultiplier'));
  safeSetText('lbl-set-ot-desc', t('settingsOtDesc'));
  safeSetText('lbl-set-save', t('settingsClose'));

  updateWelcomeUI();
  updateMaskWagesUI();
  lucide.createIcons();
}

function updateWelcomeUI() {
  const lblG = lang === 'bn' ? 'আজ:' : 'Today / اليوم:';
  const lblH = lang === 'bn' ? 'হিজরি:' : 'Hijri Date / هجري:';
  const lblC = lang === 'bn' ? 'ঘড়ি:' : 'Clock / الساعة:';

  const gregEl = document.getElementById('lbl-greg-title');
  if (gregEl) gregEl.innerText = lblG;
  const hijriEl = document.getElementById('lbl-hijri-title');
  if (hijriEl) hijriEl.innerText = lblH;
  const clockEl = document.getElementById('lbl-clock-title');
  if (clockEl) clockEl.innerText = lblC;

  const authBadge = document.getElementById('auth-status-badge');
  const welcomeTitle = document.getElementById('auth-welcome-title');
  const loginBox = document.getElementById('auth-login-box');
  const btnLogoutNode = document.getElementById('btn-logout');

  if (currentUser) {
    const welcomeText = lang === 'bn' 
      ? `স্বাগতম, ${currentUser.displayName || 'সম্মানিত কর্মী'} 👋` 
      : `Welcome, ${currentUser.displayName || 'Valued Employee'} 👋`;
    if (welcomeTitle) welcomeTitle.innerText = welcomeText;
    if (authBadge) {
      if (isOnlineAuthenticated) {
        authBadge.innerText = lang === 'bn' ? 'সার্ভার সেশন' : 'Online Sync';
        authBadge.className = "inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-500/10";
      } else {
        authBadge.innerText = lang === 'bn' ? 'সংরক্ষিত সেশন (অফলাইন)' : 'Cached Session (Offline)';
        authBadge.className = "inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-500/10";
      }
    }
    if (loginBox) loginBox.classList.add('hidden');
    if (btnLogoutNode) btnLogoutNode.classList.remove('hidden');
  } else {
    if (welcomeTitle) welcomeTitle.innerText = lang === 'bn' ? 'গেস্ট অ্যাকাউন্ট (অফলাইন সেশন)' : 'Offline Guest Mode Account';
    if (authBadge) {
      authBadge.innerText = lang === 'bn' ? 'ডিভাইস অফলাইন' : 'Offline Storage';
      authBadge.className = "inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    }
    if (loginBox) loginBox.classList.remove('hidden');
    if (btnLogoutNode) btnLogoutNode.classList.add('hidden');
  }
}

// 4. API-driven auto-translator (Bengali <=> English <=> Arabic) utilizing Google single endpoint
async function translateText(text, targetLang) {
  if (!text || !text.trim()) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (data && data[0]) {
      return data[0].map(part => part[0]).filter(Boolean).join(' ');
    }
    return text;
  } catch {
    return text;
  }
}

// 5. Code 39 Dynamic Real Barcode drawing algorithm mapped to SVGs vectors
const CODE39_MAP = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', '*': '010010100'
};

function drawCode39Barcode(text) {
  const svg = document.getElementById('id-barcode-svg');
  if (!svg) return;
  
  svg.innerHTML = '';
  const upperText = `*${text.trim().toUpperCase()}*`;
  let currentX = 0;
  const narrowWidth = 1.0;
  const wideWidth = 2.5;
  const gapWidth = 1.0;
  const height = 24;

  const rects = [];

  for (let i = 0; i < upperText.length; i++) {
    const char = upperText[i];
    const pattern = CODE39_MAP[char] || CODE39_MAP['*'];

    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pattern[j] === '1';
      const elementWidth = isWide ? wideWidth : narrowWidth;

      if (isBar) {
        rects.push({ x: currentX, width: elementWidth });
      }
      currentX += elementWidth;
    }
    currentX += gapWidth;
  }

  const totalWidth = currentX - gapWidth;
  svg.setAttribute('viewBox', `0 0 ${totalWidth} ${height}`);

  rects.forEach(r => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(r.x));
    rect.setAttribute('y', '0');
    rect.setAttribute('width', String(r.width));
    rect.setAttribute('height', String(height));
    rect.setAttribute('fill', 'currentColor');
    svg.appendChild(rect);
  });
}

// 5.5 Filtered Logs Helper Configuration
function getFilteredLogs() {
  const searchInput = document.getElementById('filter-search');
  const monthInput = document.getElementById('filter-month');
  const companyInput = document.getElementById('filter-company');
  
  const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
  const filterMonth = monthInput ? monthInput.value : '';
  const filterCompany = companyInput ? companyInput.value : '';

  return currentLogs.filter(log => {
    const textFields = `${log.location || ''} ${log.description || ''} ${log.notes || ''} ${log.company || ''}`.toLowerCase();
    const matchesSearch = !searchQuery || textFields.includes(searchQuery);
    const matchesMonth = !filterMonth || (log.dateGregorian && log.dateGregorian.startsWith(filterMonth));

    let matchesCompany = true;
    if (filterCompany) {
      if (filterCompany === 'Other') {
        matchesCompany = log.company !== 'Al Tamdin Al Watania' && log.company !== 'Tamdeen Sub-Contracting';
      } else {
        matchesCompany = log.company === filterCompany;
      }
    }

    return matchesSearch && matchesMonth && matchesCompany;
  });
}

// 6. Statistics Calculations and Bento Dashboard displays (supporting filtered month views)
function updateStatistics(logsToUse = null) {
  const targetLogs = logsToUse !== null ? logsToUse : getFilteredLogs();
  const daysCount = targetLogs.length;
  let totalHours = 0;
  let totalOt = 0;

  targetLogs.forEach(log => {
    totalHours += Number(log.hours || 0);
    totalOt += Number(log.overtime || 0);
  });

  const estimatedEarnings = totalOt * hourlyRate * otMultiplier;

  document.getElementById('stat-val-days').innerText = String(daysCount);
  document.getElementById('stat-val-hours').innerText = totalHours.toFixed(1);
  document.getElementById('stat-val-ot').innerText = totalOt.toFixed(1);

  const wagesContainer = document.getElementById('stat-val-wages-container');
  const wagesHidden = document.getElementById('stat-val-wages-hidden');
  const iconOpen = document.getElementById('icon-wages-open');
  const iconOff = document.getElementById('icon-wages-off');

  if (hideWages) {
    if (wagesContainer) wagesContainer.classList.add('hidden');
    if (wagesHidden) wagesHidden.classList.remove('hidden');
    if (iconOpen) iconOpen.classList.add('hidden');
    if (iconOff) iconOff.classList.remove('hidden');
  } else {
    if (wagesContainer) wagesContainer.classList.remove('hidden');
    if (wagesHidden) wagesHidden.classList.add('hidden');
    const wagesElement = document.getElementById('stat-val-wages');
    if (wagesElement) wagesElement.innerText = `${estimatedEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
    if (iconOpen) iconOpen.classList.remove('hidden');
    if (iconOff) iconOff.classList.add('hidden');
  }
}

// 7. Virtual ID Card state management + Firestore user-specific syncing & base64 image scaling
function getLocalIdKey(key) {
  return currentUser ? `tamdeen_id_${currentUser.uid}_${key}` : `tamdeen_id_guest_${key}`;
}

async function syncAndRenderIDCard() {
  const nameEnInput = document.getElementById('id-edit-en');
  const nameArInput = document.getElementById('id-edit-ar');
  const codeInput = document.getElementById('id-edit-code');
  const photoDisplay = document.getElementById('id-photo-display');
  const photoPlaceholder = document.getElementById('id-photo-placeholder');

  const cardNameEn = localStorage.getItem(getLocalIdKey('name_en')) || (currentUser ? (currentUser.displayName || 'Worker Name') : 'Shhab Md Md Md');
  const cardNameAr = localStorage.getItem(getLocalIdKey('name_ar')) || (currentUser ? 'العامل المحترم' : 'شهاب مد مد مد');
  const cardCode = localStorage.getItem(getLocalIdKey('code')) || '6697';
  const cardPhoto = localStorage.getItem(getLocalIdKey('photo'));

  if (nameEnInput) nameEnInput.value = cardNameEn;
  if (nameArInput) nameArInput.value = cardNameAr;
  if (codeInput) codeInput.value = cardCode;

  const displayEn = document.getElementById('id-name-en-val');
  const displayAr = document.getElementById('id-name-ar-val');
  const displayBarcodeText = document.getElementById('id-barcode-under');

  if (displayEn) displayEn.innerText = cardNameEn;
  if (displayAr) displayAr.innerText = cardNameAr;
  if (displayBarcodeText) displayBarcodeText.innerText = cardCode;
  
  drawCode39Barcode(cardCode);

  if (cardPhoto) {
    if (photoDisplay) {
      photoDisplay.src = cardPhoto;
      photoDisplay.classList.remove('hidden');
    }
    if (photoPlaceholder) photoPlaceholder.classList.add('hidden');
  } else {
    if (photoDisplay) photoDisplay.classList.add('hidden');
    if (photoPlaceholder) photoPlaceholder.classList.remove('hidden');
  }

  const warn = document.getElementById('section-id-auth-mask');
  if (warn) {
    if (currentUser) {
      warn.classList.add('hidden');
    } else {
      warn.classList.remove('hidden');
    }
  }
}

// Compress base64 images so they sit neatly inside local storage & Firestore limits (under 100KB)
function compressImageAndSave(file) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 200;
      const scaleSize = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scaleSize;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const base64String = canvas.toDataURL('image/jpeg', 0.82); // compressed JPEG quality
      
      // Save locally
      localStorage.setItem(getLocalIdKey('photo'), base64String);
      syncAndRenderIDCard();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

// 8. Work Records Table Renderer (featuring search filtration & months filtering)
function renderTable() {
  const tbody = document.getElementById('records-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  const filteredLogs = getFilteredLogs();

  // Dynamically update the bento cards dashboard with the overall calculations of this filtered view
  updateStatistics(filteredLogs);

  if (filteredLogs.length === 0) {
    const noDataText = DICTIONARY['tableNoData'][lang] || 'No records found.';
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="p-8 text-center text-slate-400 dark:text-slate-500 italic">
          <div class="flex flex-col items-center justify-center gap-1">
            <i data-lucide="shield-alert" class="h-5 w-5 text-slate-400 mb-1"></i>
            <span>${noDataText}</span>
          </div>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  // Generate table rows dynamically (without showing any estimated wages values or calculations per row)
  filteredLogs.forEach(log => {
    const dateFormatted = formatGregorianDate(log.dateGregorian);
    const dayName = dateFormatted.english ? dateFormatted.english.split(',')[0] : '';
    const dateStr = log.dateGregorian || '';
    const rowId = log.id;

    const row = document.createElement('tr');
    row.className = "hover:bg-slate-100/40 dark:hover:bg-slate-900/40 transition-colors border-b border-slate-100 dark:border-slate-850 text-slate-700 dark:text-slate-300";
    row.innerHTML = `
      <td class="p-3.5">
        <div class="font-bold text-slate-900 dark:text-white">${dateStr}</div>
        <div class="text-[10px] text-slate-400 font-mono mt-0.5">${dayName} / ${log.dateHijri || ''}</div>
      </td>
      <td class="p-3.5 font-semibold text-slate-800 dark:text-slate-300">
        ${log.company || 'Al Tamdin'}
      </td>
      <td class="p-3.5">
        <div class="inline-flex items-center gap-1 rounded bg-slate-50 dark:bg-slate-950 px-2 py-1 border border-slate-200 dark:border-slate-800 font-medium">
          <i data-lucide="building" class="h-3 w-3 text-slate-400"></i>
          <span>${log.location || 'Not Specified'}</span>
        </div>
      </td>
      <td class="p-3.5 text-center font-bold text-slate-900 dark:text-slate-100">
        ${Number(log.hours || 0).toFixed(1)}
      </td>
      <td class="p-3.5 text-center font-bold text-amber-600 dark:text-amber-400">
        ${Number(log.overtime || 0) > 0 ? `+${Number(log.overtime).toFixed(1)}` : '0.0'}
      </td>
      <td class="p-3.5 max-w-xs space-y-1">
        <p class="font-semibold text-slate-800 dark:text-slate-200 leading-normal">${log.description || ''}</p>
        ${(log.translationEn && log.translationEn !== log.description) ? `<p class="text-[10px] text-slate-500 italic">En: ${log.translationEn}</p>` : ''}
        ${log.translationAr ? `<p class="text-[10px] text-slate-400 dir-rtl text-right">Ar: ${log.translationAr}</p>` : ''}
      </td>
      <td class="p-3.5 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
        ${log.notes ? `<div class="italic">"${log.notes}"</div>` : ''}
        ${log.supervisor ? `<div class="font-semibold text-[10px] text-emerald-600/95 dark:text-emerald-450 flex items-center gap-0.5"><i data-lucide="user" class="h-2.5 w-2.5"></i> ${log.supervisor}</div>` : ''}
      </td>
      <td class="p-3.5 text-center no-print">
        <div class="flex items-center justify-center gap-1.5">
          <button class="btn-edit-record p-1.5 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/25 dark:hover:bg-blue-950/45 text-blue-600 cursor-pointer" data-id="${rowId}" title="Edit log">
            <i data-lucide="edit-3" class="h-3.5 w-3.5"></i>
          </button>
          <button class="btn-delete-record p-1.5 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/25 dark:hover:bg-red-950/45 text-red-600 cursor-pointer" data-id="${rowId}" title="Delete log">
            <i data-lucide="x" class="h-3.5 w-3.5"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  lucide.createIcons();
  
  document.querySelectorAll('.btn-edit-record').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = b.getAttribute('data-id');
      startEditLog(id);
    });
  });

  document.querySelectorAll('.btn-delete-record').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = b.getAttribute('data-id');
      deleteWorkLog(id);
    });
  });
}

// 9. CRUD Operations (Supports Real-time Cloud Auth matching / Guest local storage offline backup)
async function saveWorkLog(e) {
  e.preventDefault();
  
  const gDate = document.getElementById('field-date').value;
  const hDate = document.getElementById('field-hijri').value;
  const comp = document.getElementById('field-company').value;
  const loc = document.getElementById('field-location').value;
  const sup = document.getElementById('field-supervisor').value;
  const hrs = Number(document.getElementById('field-hours').value);
  const ot = Number(document.getElementById('field-overtime').value);
  const desc = document.getElementById('field-description').value;
  const notes = document.getElementById('field-notes').value;

  const translatedEn = document.getElementById('txt-translated-en').innerText;
  const translatedAr = document.getElementById('txt-translated-ar').innerText;

  const logData = {
    dateGregorian: gDate,
    dateHijri: hDate,
    company: comp,
    location: loc,
    supervisor: sup,
    hours: hrs,
    overtime: ot,
    description: desc,
    notes: notes,
    translationEn: translatedEn && !translatedEn.includes('Not translated') ? translatedEn : desc,
    translationAr: translatedAr && !translatedAr.includes('لم يُترجم') ? translatedAr : desc,
    timestamp: Date.now()
  };

  const btn = document.getElementById('btn-form-submit');
  btn.disabled = true;
  const origText = btn.innerHTML;
  btn.innerText = lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...';

  try {
    if (currentUser) {
      if (editingLogId) {
        await setDoc(doc(db, 'workLogs', editingLogId), {
          ...logData,
          userId: currentUser.uid,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await addDoc(collection(db, 'workLogs'), {
          ...logData,
          userId: currentUser.uid,
          createdAt: serverTimestamp()
        });
      }
    } else {
      let stored = JSON.parse(localStorage.getItem('tamdeen_guest_database') || '[]');
      if (editingLogId) {
        stored = stored.map(g => (g.id === editingLogId) ? { ...g, ...logData } : g);
      } else {
        const fakeId = `guest_log_${Date.now()}`;
        stored.push({ id: fakeId, ...logData });
      }
      localStorage.setItem('tamdeen_guest_database', JSON.stringify(stored));
      loadGuestLogs();
    }

    resetForm();
  } catch (err) {
    console.error("Failed storing daily record entry:", err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = origText;
  }
}

function startEditLog(id) {
  const chosen = currentLogs.find(l => l.id === id);
  if (!chosen) return;

  editingLogId = id;
  
  document.getElementById('field-edit-id').value = id;
  document.getElementById('field-date').value = chosen.dateGregorian || '';
  document.getElementById('field-hijri').value = chosen.dateHijri || '';
  document.getElementById('field-company').value = chosen.company || 'Al Tamdin Al Watania';
  document.getElementById('field-location').value = chosen.location || '';
  document.getElementById('field-supervisor').value = chosen.supervisor || '';
  
  document.getElementById('field-hours').value = String(chosen.hours);
  document.getElementById('txt-hours-val').innerText = `${Number(chosen.hours).toFixed(1)} hrs`;
  
  document.getElementById('field-overtime').value = String(chosen.overtime);
  document.getElementById('txt-ot-val').innerText = `${Number(chosen.overtime).toFixed(1)} hrs`;

  document.getElementById('field-description').value = chosen.description || '';
  document.getElementById('field-notes').value = chosen.notes || '';

  document.getElementById('txt-translated-en').innerText = chosen.translationEn || '';
  document.getElementById('txt-translated-ar').innerText = chosen.translationAr || '';
  document.getElementById('translator-output-block').classList.remove('hidden');

  document.getElementById('btn-form-cancel').classList.remove('hidden');
  document.getElementById('form-container').scrollIntoView({ behavior: 'smooth' });

  translateUI();
}

async function deleteWorkLog(id) {
  const confText = lang === 'bn' ? 'আপনি কি কাজের বিবরণীটি ডিলিট করতে চান?' : 'Are you sure you want to delete this daily work log record?';
  if (!window.confirm(confText)) return;

  try {
    if (currentUser) {
      await deleteDoc(doc(db, 'workLogs', id));
    } else {
      let stored = JSON.parse(localStorage.getItem('tamdeen_guest_database') || '[]');
      stored = stored.filter(l => l.id !== id);
      localStorage.setItem('tamdeen_guest_database', JSON.stringify(stored));
      loadGuestLogs();
    }
  } catch (err) {
    console.error("Firestore delete error occurred:", err);
  }
}

function resetForm() {
  editingLogId = null;
  document.getElementById('work-log-form').reset();
  
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('field-date').value = today;
  document.getElementById('field-hijri').value = convertGregorianToHijri(today).arabic;

  document.getElementById('txt-hours-val').innerText = '8.0 hrs';
  document.getElementById('field-hours').value = '8';
  document.getElementById('txt-ot-val').innerText = '0.0 hrs';
  document.getElementById('field-overtime').value = '0';

  document.getElementById('translator-output-block').classList.add('hidden');
  document.getElementById('btn-form-cancel').classList.add('hidden');

  translateUI();
}

function loadGuestLogs() {
  const data = JSON.parse(localStorage.getItem('tamdeen_guest_database') || '[]');
  data.sort((a,b) => b.timestamp - a.timestamp);
  currentLogs = data;
  updateStatistics();
  renderTable();
}

function exportLogsToCSV() {
  if (currentLogs.length === 0) {
    alert(lang === 'bn' ? 'রপ্তানি করার জন্য কোনো কাজের তথ্য নেই।' : 'No records available to export.');
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Date Gregorian,Date Hijri,Company,Location,Duty Hours,Overtime Hours,Estimated Earned,Description,Notes,Supervisor\n";

  currentLogs.forEach(entry => {
    const est = Number(entry.overtime || 0) * hourlyRate * otMultiplier;
    const row = [
      entry.dateGregorian || '',
      entry.dateHijri || '',
      `"${(entry.company || 'Al Tamdin').replace(/"/g, '""')}"`,
      `"${(entry.location || '').replace(/"/g, '""')}"`,
      entry.hours || 0,
      entry.overtime || 0,
      est.toFixed(2),
      `"${(entry.description || '').replace(/"/g, '""')}"`,
      `"${(entry.notes || '').replace(/"/g, '""')}"`,
      `"${(entry.supervisor || '').replace(/"/g, '""')}"`
    ].join(",");
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Al_Tamdin_WorkLog_Statement_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Handle login/authentication failure with beautiful, bilingual visual errors & clear guidelines
function handleAuthError(err) {
  const errorContainer = document.getElementById('auth-error-container');
  if (!errorContainer) return;

  errorContainer.classList.remove('hidden');

  const currentDomain = window.location.hostname || "your-domain.github.io";
  let errorTitleEn = "Google Sign-In Failed";
  let errorTitleBn = "গুগল লগইন ব্যর্থ হয়েছে";
  let errorMsgEn = "";
  let errorMsgBn = "";

  const isUnauthorizedDomain = err && (err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('unauthorized-domain')));
  const isPopupBlocked = err && (err.code === 'auth/popup-blocked' || (err.message && err.message.includes('popup-blocked')));

  if (isUnauthorizedDomain) {
    errorTitleEn = "GitHub Pages / Custom Domain Security Blocked";
    errorTitleBn = "গিটহাব পেজ বা ডোমেন সিকিউরিটি ব্লক নোটিশ";
    errorMsgEn = `Since you have deployed this project to a custom hosting or GitHub Pages (<strong>${currentDomain}</strong>), Google Auth is blocked until you authorize this domain in your Firebase general project settings. <br/><br/><strong>To quickly solve this:</strong><br/>1. Go to your <strong>Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized Domains</strong>.<br/>2. Click <strong>"Add domain"</strong> and input: <code class="bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded font-mono text-xs">${currentDomain}</code>.<br/>3. Re-press the Google Login button and it will authorize instantly!`;
    errorMsgBn = `আপনি প্রজেক্টটি গিটহাব পেজে (<strong>${currentDomain}</strong>) বা আপনার নিজস্ব সার্ভার ডোমেনে হোস্ট করে চালাচ্ছেন। নিরাপত্তার কারণে ফায়ারবেস (Firebase Auth) এই ডোমেনটি থেকে গুগল লগইন সাময়িকভাবে ব্লক করেছে।<br/><br/><strong>সমাধান করার সহজ নিয়ম:</strong><br/>১. আপনার <strong>Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized Domains</strong> অপশনে যান।<br/>২. <strong>"Add domain"</strong> এ ক্লিক করুন এবং আপনার ডোমেনটি টাইপ করে যুক্ত করুন: <code class="bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded font-mono text-xs">${currentDomain}</code>।<br/>৩. এরপর আবার গুগলে লগইন করার চেষ্টা করুন, এটি সাথে সাথে কাজ করবে!`;
  } else if (isPopupBlocked) {
    errorTitleEn = "Popup Window Blocked by Web Browser";
    errorTitleBn = "ব্রাউজার পপআপ ব্লক করেছে";
    errorMsgEn = "Your internet browser has blocked the login popup window. Please enable popups in your browser settings or run this page directly in Standard Chrome/Safari/Edge.";
    errorMsgBn = "আপনার ব্রাউজারটি লগইন পপআপ পেজটি ব্লক করেছে। অনুগ্রহ করে ব্রাউজার সেটিংস থেকে পপআপ চালু (Allow Popups) করুন অথবা ক্রোম বা সাফারি ব্রাউজারে সাইটটি ওপেন করে চেষ্টা করুন।";
  } else {
    const codeStr = err && err.code ? err.code : 'auth/unknown';
    const rawMsg = err && err.message ? err.message : JSON.stringify(err);
    errorTitleEn = "Could Not Connect Authentication Session";
    errorTitleBn = "ডিজিটাল সেশন শুরু করা যায়নি";
    errorMsgEn = `An authentication issue occurred: <code class="bg-rose-50 dark:bg-slate-850 px-1 py-0.5 rounded text-rose-600 dark:text-rose-450 text-xs font-mono">${codeStr}</code>. <br/><br/>Please double check your internet connection or use <strong>Offline Guest Mode</strong> to save all entries securely on your device space.`;
    errorMsgBn = `লগইন প্রক্রিয়ায় ত্রুটি ধরা পড়েছে: <code class="bg-rose-50 dark:bg-slate-850 px-1 py-0.5 rounded text-rose-600 dark:text-rose-450 text-xs font-mono">${codeStr}</code>। <br/><br/>অনুগ্রহ করে ইন্টারনেট চেক করুন অথবা ডেটা ডিভাইস মেমোরিতে সরাসরি সেভ করতে <strong>'অফলাইন গেস্ট মোড' (Guest Mode)</strong> চাপুন।`;
  }

  errorContainer.innerHTML = `
    <div class="p-4 sm:p-5 rounded-xl border border-rose-200 dark:border-rose-950/40 bg-rose-50/50 dark:bg-rose-950/15 text-slate-800 dark:text-slate-205 shadow-sm animate-fade-in space-y-3 font-sans">
      <div class="flex items-start gap-3">
        <div class="p-1 px-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/45 text-rose-600 dark:text-rose-400 mt-0.5 self-start">
          <i data-lucide="shield-alert" class="h-4 w-4"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-extrabold text-xs sm:text-sm text-rose-900 dark:text-rose-400 flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span>${lang === 'bn' ? errorTitleBn : errorTitleEn}</span>
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 dark:text-rose-450 text-rose-700 font-mono font-medium mt-1 sm:mt-0 max-w-max uppercase tracking-wider">${err.code || 'error-code'}</span>
          </h3>
          <div class="text-[11px] sm:text-xs text-slate-650 dark:text-slate-300 mt-2 hover:text-slate-900 dark:hover:text-white transition-colors leading-relaxed font-normal">
            ${lang === 'bn' ? errorMsgBn : errorMsgEn}
          </div>
        </div>
        <button id="btn-close-auth-error-block" class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer self-start transition-colors" title="Close warning">
          <i data-lucide="x" class="h-4 w-4"></i>
        </button>
      </div>
      <div class="flex items-center gap-1.5 pt-2 border-t border-rose-200/40 dark:border-rose-950/25 text-[10px] sm:text-[11px] text-slate-450">
        <i data-lucide="info" class="h-3 w-3 text-indigo-500"></i>
        <span>${lang === 'bn' ? "টিপস: অফলাইন গেস্ট ব্যবহারকালে আপনার কোনো ডাটা ডিলিট হবে না, সবই ব্রাউজারে থাকবে!" : "Tip: Switching to Guest Mode will keep all your logs saved reliably inside your personal device!"}</span>
      </div>
    </div>
  `;

  lucide.createIcons();

  document.getElementById('btn-close-auth-error-block').addEventListener('click', () => {
    errorContainer.classList.add('hidden');
  });
}

// MAIN ENTRY POINT INITIALIZATION FUNCTION
async function main() {
  // Config parameters with direct hardcoded coordinates as guaranteed fallback 
  let firebaseConfig = {
    projectId: "argon-arch-k07pf",
    appId: "1:371346864380:web:53cb9f0402a61657917f79",
    apiKey: "AIzaSyC_QwusU_BVLepqeU5tmYIje33ZLbzxZo4",
    authDomain: "argon-arch-k07pf.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-34d566d3-d34a-4f97-a33e-771b649ed148",
    storageBucket: "argon-arch-k07pf.firebasestorage.app",
    messagingSenderId: "371346864380"
  };

  try {
    const res = await fetch('./firebase-applet-config.json');
    if (res.ok) {
      const fetched = await res.json();
      firebaseConfig = { ...firebaseConfig, ...fetched };
    }
  } catch (err) {
    console.warn("Could not fetch firebase config, using hardcoded fallback config values.", err);
  }

  // Initialise
  app = initializeApp(firebaseConfig);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, firebaseConfig.firestoreDatabaseId);

  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();

  // Load config form elements
  const sliderHrs = document.getElementById('field-hours');
  const sliderOt = document.getElementById('field-overtime');
  const txtHrsVal = document.getElementById('txt-hours-val');
  const txtOtVal = document.getElementById('txt-ot-val');

  document.getElementById('set-hourly-rate').value = String(hourlyRate);
  document.getElementById('set-ot-multiplier').value = String(otMultiplier);

  // Theme support
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
    document.getElementById('icon-theme-light').classList.remove('hidden');
    document.getElementById('icon-theme-dark').classList.add('hidden');
  } else {
    document.documentElement.classList.remove('dark');
    document.getElementById('icon-theme-light').classList.add('hidden');
    document.getElementById('icon-theme-dark').classList.remove('hidden');
  }

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('field-date').value = today;
  document.getElementById('field-hijri').value = convertGregorianToHijri(today).arabic;

  // Real Clock loop
  setInterval(() => {
    const clockNode = document.getElementById('clock-live');
    if (clockNode) {
      clockNode.innerText = new Date().toLocaleTimeString('en-US', { hour12: false });
    }
  }, 1000);

  const todayConverted = convertGregorianToHijri(today);
  const todayGFormatted = formatGregorianDate(today);
  document.getElementById('clock-gregorian').innerText = lang === 'bn' ? todayGFormatted.bengali : todayGFormatted.english;
  document.getElementById('clock-hijri').innerText = `${todayConverted.arabic} (${lang === 'bn' ? todayConverted.bengali : todayConverted.latin})`;

  document.getElementById('field-date').addEventListener('change', (e) => {
    const val = e.target.value;
    document.getElementById('field-hijri').value = convertGregorianToHijri(val).arabic;
  });

  if (sliderHrs && txtHrsVal) {
    sliderHrs.addEventListener('input', (e) => {
      txtHrsVal.innerText = `${Number(e.target.value).toFixed(1)} hrs`;
    });
  }
  if (sliderOt && txtOtVal) {
    sliderOt.addEventListener('input', (e) => {
      txtOtVal.innerText = `${Number(e.target.value).toFixed(1)} hrs`;
    });
  }

  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const h = btn.getAttribute('data-h');
      const ot = btn.getAttribute('data-ot');
      if (sliderHrs) {
        sliderHrs.value = h;
        txtHrsVal.innerText = `${Number(h).toFixed(1)} hrs`;
      }
      if (sliderOt) {
        sliderOt.value = ot;
        txtOtVal.innerText = `${Number(ot).toFixed(1)} hrs`;
      }
    });
  });

  document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('al_tamdin_dark_mode', 'true');
      document.getElementById('icon-theme-light').classList.remove('hidden');
      document.getElementById('icon-theme-dark').classList.add('hidden');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('al_tamdin_dark_mode', 'false');
      document.getElementById('icon-theme-light').classList.add('hidden');
      document.getElementById('icon-theme-dark').classList.remove('hidden');
    }
  });

  document.getElementById('btn-lang-toggle').addEventListener('click', () => {
    lang = lang === 'bn' ? 'en-ar' : 'bn';
    localStorage.setItem('al_tamdin_lang', lang);
    const tG = formatGregorianDate(document.getElementById('field-date').value);
    document.getElementById('clock-gregorian').innerText = lang === 'bn' ? tG.bengali : tG.english;
    
    translateUI();
    syncAndRenderIDCard();
    renderTable();
  });

  document.getElementById('btn-auto-translate').addEventListener('click', async () => {
    const descText = document.getElementById('field-description').value;
    if (!descText) return;
    const btn = document.getElementById('btn-auto-translate');
    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerText = lang === 'bn' ? 'অনুবাদ হচ্ছে...' : 'Translating...';

    const en = await translateText(descText, 'en');
    const ar = await translateText(descText, 'ar');

    document.getElementById('txt-translated-en').innerText = en;
    document.getElementById('txt-translated-ar').innerText = ar;
    document.getElementById('translator-output-block').classList.remove('hidden');

    btn.disabled = false;
    btn.innerHTML = orig;
    lucide.createIcons();
  });

  document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    hourlyRate = Number(document.getElementById('set-hourly-rate').value || '15');
    otMultiplier = Number(document.getElementById('set-ot-multiplier').value || '1.5');
    localStorage.setItem('al_tamdin_hourly_rate', String(hourlyRate));
    localStorage.setItem('al_tamdin_ot_multiplier', String(otMultiplier));
    
    document.getElementById('settings-modal').classList.add('hidden');
    updateStatistics();
    renderTable();
  });

  document.getElementById('btn-settings-open').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.remove('hidden');
  });
  document.getElementById('btn-settings-close').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
  });

  // Mask status changes
  document.getElementById('card-estimated-wages').addEventListener('click', (e) => {
    hideWages = !hideWages;
    localStorage.setItem('al_tamdin_hide_wages', String(hideWages));
    updateStatistics();
    updateMaskWagesUI();
    renderTable();
  });

  document.getElementById('btn-toggle-mask-state').addEventListener('click', () => {
    hideWages = !hideWages;
    localStorage.setItem('al_tamdin_hide_wages', String(hideWages));
    updateStatistics();
    updateMaskWagesUI();
    renderTable();
  });

  document.getElementById('work-log-form').addEventListener('submit', saveWorkLog);
  document.getElementById('btn-form-cancel').addEventListener('click', resetForm);

  document.getElementById('btn-idcard-open').addEventListener('click', () => {
    document.getElementById('idcard-modal').classList.remove('hidden');
    syncAndRenderIDCard();
  });
  document.getElementById('btn-idcard-close').addEventListener('click', () => {
    document.getElementById('idcard-modal').classList.add('hidden');
  });

  document.getElementById('btn-photo-trigger').addEventListener('click', () => {
    document.getElementById('id-photo-file').click();
  });
  
  document.getElementById('id-photo-file').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImageAndSave(file);
    }
  });

  document.getElementById('btn-photo-remove').addEventListener('click', () => {
    localStorage.removeItem(getLocalIdKey('photo'));
    syncAndRenderIDCard();
    if (currentUser) {
      const uRef = doc(db, 'users', currentUser.uid);
      setDoc(uRef, { photoBase64: null }, { merge: true });
    }
  });

  // Save ID Card Badge PNG Screenshot
  document.getElementById('btn-id-download').addEventListener('click', () => {
    const node = document.getElementById('badge-capture-container');
    const b = document.getElementById('btn-id-download');
    b.disabled = true;
    const orig = b.innerHTML;
    b.innerHTML = `<i data-lucide="loader-2" class="h-3 w-3 animate-spin"></i> Saving...`;
    lucide.createIcons();

    html2canvas(node, {
      scale: 3,
      useCORS: true,
      allowTaint: true
    }).then(canvas => {
      const dataUrl = canvas.toDataURL('image/png');
      const hrefLink = document.createElement('a');
      hrefLink.download = `Tamdeen_Badge_${(document.getElementById('id-name-en-val').innerText || 'Worker').trim()}_${Date.now()}.png`;
      hrefLink.href = dataUrl;
      document.body.appendChild(hrefLink);
      hrefLink.click();
      document.body.removeChild(hrefLink);
    }).finally(() => {
      b.disabled = false;
      b.innerHTML = orig;
      lucide.createIcons();
    });
  });

  // Save Report Statement Table PNG Screenshot in executive-level white paper layout
  document.getElementById('btn-save-as-png').addEventListener('click', () => {
    const b = document.getElementById('btn-save-as-png');
    b.disabled = true;
    const orig = b.innerHTML;
    b.innerHTML = `<i data-lucide="loader-2" class="h-4 w-4 animate-spin text-emerald-500"></i> Saving...`;
    lucide.createIcons();

    // 1. Filter current logs exactly like how they are filtered on the screen
    const searchQuery = document.getElementById('filter-search').value.toLowerCase();
    const filterMonth = document.getElementById('filter-month').value; // YYYY-MM
    const filterCompany = document.getElementById('filter-company').value;

    const filteredLogs = currentLogs.filter(log => {
      const textFields = `${log.location || ''} ${log.description || ''} ${log.notes || ''} ${log.company || ''}`.toLowerCase();
      const matchesSearch = !searchQuery || textFields.includes(searchQuery);
      const matchesMonth = !filterMonth || (log.dateGregorian && log.dateGregorian.startsWith(filterMonth));

      let matchesCompany = true;
      if (filterCompany) {
        if (filterCompany === 'Other') {
          matchesCompany = log.company !== 'Al Tamdin Al Watania' && log.company !== 'Tamdeen Sub-Contracting';
        } else {
          matchesCompany = log.company === filterCompany;
        }
      }

      return matchesSearch && matchesMonth && matchesCompany;
    });

    // 2. Fetch employee details from ID badge logic
    const cardNameEn = localStorage.getItem(getLocalIdKey('name_en')) || (currentUser ? (currentUser.displayName || 'Valued Worker') : 'Shhab Md Md Md');
    const cardNameAr = localStorage.getItem(getLocalIdKey('name_ar')) || (currentUser ? 'العامل المحترم' : 'شهاب مد مد مد');
    const cardCode = localStorage.getItem(getLocalIdKey('code')) || '6697';

    // 3. Calculate statistics over these filtered values
    let totalHours = 0;
    let totalOt = 0;
    filteredLogs.forEach(entry => {
      totalHours += Number(entry.hours || 0);
      totalOt += Number(entry.overtime || 0);
    });
    const estOtWages = totalOt * hourlyRate * otMultiplier;

    // 4. Formulate the Statement period label
    let statementPeriod = 'ALL RECORDED PERIODS';
    if (filterMonth) {
      const [year, month] = filterMonth.split('-');
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      statementPeriod = `${monthNames[parseInt(month) - 1].toUpperCase()} ${year}`;
    }

    const todayDateStr = new Date().toISOString().split('T')[0];
    const hijriConverted = convertGregorianToHijri(todayDateStr);

    // 5. Construct highly polished HTML template wrapper representing legal paper statement report
    const paperReport = document.createElement('div');
    paperReport.id = 'dynamic-paper-report-export';
    paperReport.className = 'bg-white text-slate-900 p-8 flex flex-col font-sans';
    // Style element so it renders beautifully in standard dimensions offscreen without bloating page size
    paperReport.style.position = 'absolute';
    paperReport.style.left = '-9999px';
    paperReport.style.top = '0';
    paperReport.style.width = '1000px';
    paperReport.style.boxSizing = 'border-box';

    // Populate paper template with exact official design blocks
    let rowsHtml = '';
    if (filteredLogs.length === 0) {
      rowsHtml = `
        <tr>
          <td colspan="6" class="border border-slate-300 p-6 text-center italic text-slate-400 text-xs">
            No work records matched your filters.
          </td>
        </tr>
      `;
    } else {
      filteredLogs.forEach(log => {
        const formattedDate = formatGregorianDate(log.dateGregorian).english;
        const dayWord = formattedDate ? formattedDate.split(',')[0] : '';
        
        rowsHtml += `
          <tr class="border-b border-slate-300 text-[11px] text-slate-800 leading-normal">
            <td class="border border-slate-300 p-2 font-mono whitespace-nowrap">
              <div class="font-bold text-slate-950">${log.dateGregorian || ''}</div>
              <div class="text-[9px] text-slate-550 font-sans mt-0.5">${dayWord} / ${log.dateHijri || ''}</div>
            </td>
            <td class="border border-slate-300 p-2 font-semibold">
              ${log.company || 'Al Tamdin Al Watania'}
            </td>
            <td class="border border-slate-300 p-2">
              <div class="text-slate-700 font-medium">${log.location || 'Not Specified'}</div>
            </td>
            <td class="border border-slate-300 p-2 text-center font-bold">
              ${Number(log.hours || 0).toFixed(1)}
            </td>
            <td class="border border-slate-300 p-2 text-center font-bold text-indigo-700">
              ${Number(log.overtime || 0).toFixed(1)}
            </td>
            <td class="border border-slate-300 p-2 text-left space-y-1 max-w-[280px]">
              <div class="font-semibold text-slate-900 leading-normal">${log.description || ''}</div>
              ${(log.translationEn && log.translationEn !== log.description) ? `<div class="text-[9px] text-slate-500 italic">En: ${log.translationEn}</div>` : ''}
              ${log.translationAr ? `<div class="text-[9px] text-slate-550 text-right dir-rtl">Ar: ${log.translationAr}</div>` : ''}
              ${log.notes ? `<div class="text-[9px] text-slate-500 italic border-t border-slate-100 pt-0.5">Note: ${log.notes}</div>` : ''}
              ${log.supervisor ? `<div class="text-[9px] font-bold text-emerald-600">Supv: ${log.supervisor}</div>` : ''}
            </td>
          </tr>
        `;
      });
    }

    paperReport.innerHTML = `
      <!-- BRAND LETTERHEAD HEADER -->
      <div class="flex items-start justify-between border-b-4 border-slate-900 pb-4 mb-5">
        <div class="flex items-center gap-4">
          <!-- Corporate Vector Logo -->
          <div class="flex items-center justify-center p-3 rounded-xl bg-slate-900 text-white w-14 h-14 shadow-sm">
            <svg class="w-9 h-9" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
          </div>
          <div>
            <h1 class="font-extrabold text-2xl tracking-wider text-slate-900 leading-none">AL TAMDIN AL WATANIA</h1>
            <p class="font-bold text-xs tracking-wide text-slate-700 mt-1 uppercase">شركة التمدين الوطنية للمقاولات العامة والتشغيل</p>
            <p class="text-[10px] text-slate-500 mt-0.5">Kingdom of Saudi Arabia (الخدمات التخصصية بالعمل والمقاولات)</p>
          </div>
        </div>
        <div class="text-right">
          <div class="inline-block bg-slate-100 text-slate-900 border border-slate-300 font-bold px-3 py-1 text-[10px] uppercase tracking-widest rounded-md">
            OFFICIAL LOGS STATEMENT
          </div>
          <p class="text-xs text-slate-700 font-bold mt-2 uppercase">Period: ${statementPeriod}</p>
          <p class="text-[10px] text-slate-500 mt-1">${todayDateStr} | ${hijriConverted.arabic}</p>
        </div>
      </div>

      <!-- WORKER DETAILS & ACCOUNT INFO -->
      <div class="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs mb-5">
        <div>
          <h2 class="font-extrabold text-slate-905 uppercase tracking-wider text-[10px] text-slate-400 mb-1.5">Employee Information / معلومات الموظف</h2>
          <div class="space-y-1">
            <p class="text-slate-800"><span class="font-semibold text-slate-500">Name (English):</span> <span class="font-bold text-slate-950">${cardNameEn}</span></p>
            <p class="text-slate-800"><span class="font-semibold text-slate-500">Name (Arabic):</span> <span class="font-bold text-slate-950">${cardNameAr}</span></p>
            <p class="text-slate-800"><span class="font-semibold text-slate-500">ID / Badge Code:</span> <span class="font-bold font-mono text-slate-950 text-indigo-700">${cardCode}</span></p>
          </div>
        </div>
        <div class="border-l border-slate-200 pl-4">
          <h2 class="font-extrabold text-slate-905 uppercase tracking-wider text-[10px] text-slate-400 mb-1.5">Document Metadata / بيانات التوثيق</h2>
          <div class="space-y-1">
            <p class="text-slate-800"><span class="font-semibold text-slate-500">Document Ref ID:</span> <span class="font-mono text-slate-950 font-bold">ATW-${cardCode}-${Date.now().toString().slice(-6)}</span></p>
            <p class="text-slate-800"><span class="font-semibold text-slate-500">Export Method:</span> <span class="text-slate-900 font-medium">Standard Digital Document Sheet</span></p>
            <p class="text-slate-800"><span class="font-semibold text-slate-500">Wage Estimation Base:</span> <span class="text-slate-900 font-bold">${hourlyRate} SAR/hr | Overtime Rate: ${otMultiplier}x</span></p>
          </div>
        </div>
      </div>

      <!-- OVERVIEW BENTO STATS -->
      <div class="grid grid-cols-4 gap-3 mb-5">
        <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
          <p class="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Total Work Days</p>
          <p class="text-base font-extrabold text-slate-900 mt-0.5">${filteredLogs.length} Days</p>
          <p class="text-[8px] text-slate-500 mt-0.5">সব দিন এন্ট্রি</p>
        </div>
        <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
          <p class="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Duty Hours</p>
          <p class="text-base font-extrabold text-slate-900 mt-0.5">${totalHours.toFixed(1)} Hrs</p>
          <p class="text-[8px] text-slate-500 mt-0.5">সাধারণ ডিউটি ঘন্টা</p>
        </div>
        <div class="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
          <p class="text-[9px] font-bold text-amber-800 uppercase tracking-wider">Overtime Hours</p>
          <p class="text-base font-extrabold text-amber-900 mt-0.5">+${totalOt.toFixed(1)} Hrs</p>
          <p class="text-[8px] text-amber-700 mt-0.5">মোট অতিরিক্ত সময়</p>
        </div>
        <div class="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
          <p class="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">OT Estim. Earnings</p>
          <p class="text-base font-extrabold text-emerald-950 mt-0.5">${estOtWages.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR</p>
          <p class="text-[8px] text-emerald-700 mt-0.5">ওভারটাইমের মোট বেতন</p>
        </div>
      </div>

      <!-- DATA STATEMENT TABLE (COMPACT SMALL MARGINS) -->
      <div class="mb-6">
        <table class="w-full text-left text-xs border-collapse border border-slate-300">
          <thead>
            <tr class="bg-slate-100 text-slate-900 font-bold text-[10px] tracking-wider uppercase border-b border-slate-300">
              <th class="border border-slate-300 p-2 text-left" style="width: 13%">Date Gregorian</th>
              <th class="border border-slate-300 p-2 text-left" style="width: 15%">Company</th>
              <th class="border border-slate-300 p-2 text-left" style="width: 15%">Site Location</th>
              <th class="border border-slate-300 p-2 text-center" style="width: 11%">Duty Hrs</th>
              <th class="border border-slate-300 p-2 text-center" style="width: 11%">OT Hrs</th>
              <th class="border border-slate-300 p-2 text-left" style="width: 35%">Work Duties & Description</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <!-- TABLE SUMMARY ROW WITH DOUBLE BORDER FOOTER STYLE -->
            <tr class="bg-slate-50 font-bold border-t-2 border-slate-800 text-xs text-slate-900">
              <td colspan="3" class="border border-slate-300 p-2 text-left uppercase">
                Statement Summarized Totals:
              </td>
              <td class="border border-slate-300 p-2 text-center font-mono">
                ${totalHours.toFixed(1)}
              </td>
              <td class="border border-slate-300 p-2 text-center font-mono text-indigo-700">
                ${totalOt.toFixed(1)}
              </td>
              <td class="border border-slate-300 p-2 text-slate-500 font-normal italic text-[10px]">
                Calculated Overtime Hours Compensation Only. Standard monthly basic salary not added to tabular rows.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- PROFESSIONAL SIGNATURES BLOCK -->
      <div class="grid grid-cols-2 gap-8 pt-10 pb-4">
        <div class="text-center">
          <div class="border-b border-slate-300 w-48 mx-auto pb-8"></div>
          <p class="text-[10px] font-bold text-slate-500 mt-2">Worker Signature / توقيع الموظف</p>
        </div>
        <div class="text-center">
          <div class="border-b border-slate-300 w-48 mx-auto pb-8"></div>
          <p class="text-[10px] font-bold text-slate-500 mt-2">Official Supervisor Seal & Signature / ختم واعتماد الشركة</p>
        </div>
      </div>

      <!-- DOCUMENT SUBFOOTER -->
      <div class="border-t border-slate-200 pt-3 text-center text-[9px] text-slate-400 flex items-center justify-between">
        <span>* Verified Personal Work Record - Digital Snapshot Sheet - Al Tamdin Al Watania *</span>
        <span class="font-mono">Reference ID: REF-TAM-${cardCode}-${Date.now().toString().slice(-4)}</span>
      </div>
    `;

    document.body.appendChild(paperReport);

    // Give browser a brief moment to render, then call html2canvas
    setTimeout(() => {
      html2canvas(paperReport, {
        scale: 2.2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      }).then(canvas => {
        const dataUrl = canvas.toDataURL('image/png');
        const hrefLink = document.createElement('a');
        hrefLink.download = `Al_Tamdin_Work_Statement_${cardNameEn.replace(/\s+/g, '_')}_${Date.now()}.png`;
        hrefLink.href = dataUrl;
        document.body.appendChild(hrefLink);
        hrefLink.click();
        document.body.removeChild(hrefLink);
      }).catch(err => {
        console.error("HTML2Canvas compilation failed:", err);
        alert('Could not save template paper report as PNG image.');
      }).finally(() => {
        document.body.removeChild(paperReport);
        b.disabled = false;
        b.innerHTML = orig;
        lucide.createIcons();
      });
    }, 150);
  });

  // Save ID Card details
  document.getElementById('btn-id-save-db').addEventListener('click', async () => {
    const nameEn = document.getElementById('id-edit-en').value.trim();
    const nameAr = document.getElementById('id-edit-ar').value.trim();
    const code = document.getElementById('id-edit-code').value.trim();
    
    localStorage.setItem(getLocalIdKey('name_en'), nameEn);
    localStorage.setItem(getLocalIdKey('name_ar'), nameAr);
    localStorage.setItem(getLocalIdKey('code'), code);

    if (currentUser) {
      try {
        const uRef = doc(db, 'users', currentUser.uid);
        const photo = localStorage.getItem(getLocalIdKey('photo')) || null;
        await setDoc(uRef, {
          userId: currentUser.uid,
          nameEn: nameEn,
          nameAr: nameAr,
          cardCode: code,
          photoBase64: photo
        }, { merge: true });
        
        alert(lang === 'bn' ? 'তথ্য সফলভাবে সার্ভারে সেভ হয়েছে!' : 'Details synced & secured on Firestore database!');
      } catch (err) {
        alert("Firestore error: " + err.message);
      }
    } else {
      alert(lang === 'bn' ? 'মোবাইল মেমোরিতে তথ্য সেভ হয়েছে!' : 'Saved in device memory/offline cookies!');
    }
    syncAndRenderIDCard();
    document.getElementById('idcard-modal').classList.add('hidden');
  });

  document.getElementById('btn-id-reset').addEventListener('click', async () => {
    const conf = lang === 'bn' ? 'আপনি কি আদি আইডি কার্ডের তথ্যে ফিরে যেতে চান?' : 'Do you want to restore card back to default worker state?';
    if (!confirm(conf)) return;

    localStorage.removeItem(getLocalIdKey('name_en'));
    localStorage.removeItem(getLocalIdKey('name_ar'));
    localStorage.removeItem(getLocalIdKey('code'));
    localStorage.removeItem(getLocalIdKey('photo'));

    if (currentUser) {
      const uRef = doc(db, 'users', currentUser.uid);
      await setDoc(uRef, {
        userId: currentUser.uid,
        nameEn: currentUser.displayName || 'Worker Name',
        nameAr: 'الاسم الكامل',
        cardCode: '6697',
        photoBase64: null
      }, { merge: true });
    }

    syncAndRenderIDCard();
    alert('Restored Card template.');
  });

  document.getElementById('btn-export-csv').addEventListener('click', exportLogsToCSV);
  
  document.getElementById('btn-print-report').addEventListener('click', () => {
    document.getElementById('print-report-date').innerText = `Generated on: ${new Date().toLocaleString()}`;
    window.print();
  });

  document.getElementById('filter-search').addEventListener('input', renderTable);
  document.getElementById('filter-month').addEventListener('change', renderTable);
  document.getElementById('filter-company').addEventListener('change', renderTable);

  document.getElementById('btn-google-login').addEventListener('click', async () => {
    try {
      // Clear previous error message
      const errorContainer = document.getElementById('auth-error-container');
      if (errorContainer) errorContainer.classList.add('hidden');

      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Popup SignIn failed:", err);
      handleAuthError(err);
    }
  });

  document.getElementById('btn-guest-login').addEventListener('click', () => {
    currentUser = null;
    localStorage.setItem('al_tamdin_guest_mode', 'true');
    
    // Clear previous error message
    const errorContainer = document.getElementById('auth-error-container');
    if (errorContainer) errorContainer.classList.add('hidden');

    loadGuestLogs();
    updateWelcomeUI();
    syncAndRenderIDCard();
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
      localStorage.removeItem('al_tamdin_guest_mode');
      localStorage.removeItem('al_tamdin_cached_user');
      
      const errorContainer = document.getElementById('auth-error-container');
      if (errorContainer) errorContainer.classList.add('hidden');

      await signOut(auth);
    } catch (err) {
      console.error("SignOut failed:", err);
    }
  });

  // Pre-load from cache immediately on startup to prevent flicker while Auth is loading (especially while offline)
  const preGuestMode = localStorage.getItem('al_tamdin_guest_mode') === 'true';
  const preCachedUser = localStorage.getItem('al_tamdin_cached_user');
  if (!preGuestMode && preCachedUser) {
    try {
      currentUser = JSON.parse(preCachedUser);
      isOnlineAuthenticated = false; 
      const stored = localStorage.getItem(`tamdeen_user_database_${currentUser.uid}`);
      if (stored) {
        currentLogs = JSON.parse(stored);
      } else {
        currentLogs = [];
      }
    } catch (e) {
      console.error("Boot cached session load failed:", e);
      currentUser = null;
    }
  } else {
    currentUser = null;
    isOnlineAuthenticated = false;
    const stored = localStorage.getItem('tamdeen_guest_database') || '[]';
    try {
      currentLogs = JSON.parse(stored);
    } catch {
      currentLogs = [];
    }
  }
  updateWelcomeUI();
  syncAndRenderIDCard();
  updateStatistics();
  renderTable();

  onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      currentUser = firebaseUser;
      isOnlineAuthenticated = true;
      localStorage.setItem('al_tamdin_guest_mode', 'false');
      localStorage.setItem('al_tamdin_cached_user', JSON.stringify({
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName,
        email: firebaseUser.email
      }));

      // Hide auth errors on successful login
      const errorContainer = document.getElementById('auth-error-container');
      if (errorContainer) errorContainer.classList.add('hidden');

      const uRef = doc(db, 'users', firebaseUser.uid);
      onSnapshot(uRef, (snap) => {
        if (snap.exists()) {
          const uData = snap.data();
          if (uData.nameEn) localStorage.setItem(`tamdeen_id_${firebaseUser.uid}_name_en`, uData.nameEn);
          if (uData.nameAr) localStorage.setItem(`tamdeen_id_${firebaseUser.uid}_name_ar`, uData.nameAr);
          if (uData.cardCode) localStorage.setItem(`tamdeen_id_${firebaseUser.uid}_code`, uData.cardCode);
          if (uData.photoBase64) {
            localStorage.setItem(`tamdeen_id_${firebaseUser.uid}_photo`, uData.photoBase64);
          } else {
            localStorage.removeItem(`tamdeen_id_${firebaseUser.uid}_photo`);
          }
          syncAndRenderIDCard();
        }
      });

      const q = query(
        collection(db, 'workLogs'), 
        where('userId', '==', firebaseUser.uid)
      );
      
      onSnapshot(q, (snapshot) => {
        const arr = [];
        snapshot.forEach(docSnap => {
          arr.push({ id: docSnap.id, ...docSnap.data() });
        });
        arr.sort((a,b) => b.timestamp - a.timestamp);
        
        currentLogs = arr;
        localStorage.setItem(`tamdeen_user_database_${firebaseUser.uid}`, JSON.stringify(arr));
        
        updateStatistics();
        renderTable();
      }, (error) => {
        console.error("Realtime Logs snapshot failure: ", error);
      });

    } else {
      isOnlineAuthenticated = false;
      const guestModeState = localStorage.getItem('al_tamdin_guest_mode') === 'true';
      const cached = localStorage.getItem('al_tamdin_cached_user');
      
      if (!guestModeState && cached) {
        try {
          currentUser = JSON.parse(cached);
          const stored = localStorage.getItem(`tamdeen_user_database_${currentUser.uid}`);
          if (stored) {
            currentLogs = JSON.parse(stored);
          } else {
            currentLogs = [];
          }
          updateStatistics();
          renderTable();
        } catch (e) {
          console.error("Failed to load cached offline user session logs:", e);
          currentUser = null;
          loadGuestLogs();
        }
      } else {
        currentUser = null;
        loadGuestLogs();
      }
    }
    
    updateWelcomeUI();
    syncAndRenderIDCard();
    translateUI();
  });

  translateUI();
}

window.addEventListener('DOMContentLoaded', main);
