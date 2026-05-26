import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
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
  serverTimestamp,
  orderBy
} from "firebase/firestore";

// Global Application State Variables
let app, auth, db, googleProvider;
let currentUser = null;
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
  settingsClose: { 'en-ar': 'Close / إغلاق', bn: 'বন্ধ করুন' },
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
  tableTitle: { 'en-ar': 'Detailed Work History & Statements / السجل التاريخи', bn: 'কাজের সুনির্দিষ্ট হিসাব বিবরণী ও ইতিহাস' },
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

// 3. Online/Offline UI translation helper
function translateUI() {
  const t = (key) => DICTIONARY[key] ? DICTIONARY[key][lang] : '';
  
  document.getElementById('nav-app-title').innerText = t('appTitle');
  document.getElementById('nav-app-subtitle').innerText = t('headerSubtitle');
  document.getElementById('txt-lang-label').innerText = lang === 'bn' ? 'English / Arabic' : 'বাংলা';
  document.getElementById('txt-logout').innerText = t('logout');

  // Stats
  document.getElementById('stat-lbl-days').innerText = t('statDaysTitle');
  document.getElementById('stat-desc-days').innerText = t('statDaysDesc');
  document.getElementById('stat-lbl-hours').innerText = t('statHoursTitle');
  document.getElementById('stat-desc-hours').innerText = t('statHoursDesc');
  document.getElementById('stat-lbl-ot').innerText = t('statOtTitle');
  document.getElementById('stat-desc-ot').innerText = t('statOtDesc');
  document.getElementById('stat-lbl-wages').innerHTML = t('statEarningsTitle') + ` <i data-lucide="eye" id="icon-wages-open" class="h-3 w-3 inline cursor-pointer text-slate-400"></i>`;
  document.getElementById('stat-desc-wages').innerText = t('statEarningsDesc');

  // Form Fields Label
  document.getElementById('lbl-form-title').innerText = editingLogId ? t('formEdit') : t('formAddNew');
  document.getElementById('lbl-form-subtitle').innerText = editingLogId ? t('formEditDetails') : t('formRecordDetails');
  document.getElementById('lbl-f-date').innerText = t('formDateGregorian');
  document.getElementById('lbl-f-hijri').innerText = t('formDateHijri');
  document.getElementById('lbl-f-company').innerText = t('formCompany');
  document.getElementById('lbl-f-location').innerText = t('formLocation');
  document.getElementById('lbl-f-hours').innerText = t('formHours');
  document.getElementById('lbl-f-ot').innerText = t('formOvertime');
  document.getElementById('lbl-presets').innerText = t('formPresets');
  document.getElementById('lbl-f-desc').innerText = t('formDescription');
  document.getElementById('field-description').placeholder = t('formDescriptionPlaceholder');
  document.getElementById('lbl-f-notes').innerText = t('formNotes');
  document.getElementById('field-notes').placeholder = t('formNotesPlaceholder');
  document.getElementById('txt-btn-submit').innerText = editingLogId ? t('formUpdateBtn') : t('formSaveBtn');
  document.getElementById('txt-btn-cancel').innerText = t('formCancel');
  document.getElementById('badge-form-action').innerText = editingLogId ? 'EDIT' : 'ADD';

  // Table header/subtitles
  document.getElementById('lbl-tbl-title').innerText = t('tableTitle');
  document.getElementById('lbl-tbl-subtitle').innerText = t('tableSub');
  document.getElementById('txt-export-csv').innerText = t('tableExportCsv');
  document.getElementById('txt-print-btn').innerText = t('tablePrint');

  document.getElementById('th-date').innerText = t('tableHeaderDate');
  document.getElementById('th-company').innerText = t('tableHeaderCompany');
  document.getElementById('th-location').innerText = t('tableHeaderLocation');
  document.getElementById('th-hours').innerText = t('tableHeaderHours');
  document.getElementById('th-ot').innerText = t('tableHeaderOvertime');
  document.getElementById('th-wages').innerText = t('tableHeaderEarnings');
  document.getElementById('th-description').innerText = t('tableHeaderDescription');
  document.getElementById('th-notes').innerText = t('tableHeaderNotes');
  document.getElementById('th-actions').innerText = t('tableHeaderActions');

  // Settings
  document.getElementById('lbl-set-title').innerText = t('settingsTitle');
  document.getElementById('lbl-set-rate').innerText = t('settingsHourlyRate');
  document.getElementById('lbl-set-rate-desc').innerText = t('settingsHourlyDesc');
  document.getElementById('lbl-set-ot').innerText = t('settingsOtMultiplier');
  document.getElementById('lbl-set-ot-desc').innerText = t('settingsOtDesc');
  document.getElementById('lbl-set-save').innerText = t('settingsClose');

  // Translate welcome widgets
  updateWelcomeUI();
  lucide.createIcons();
}

function updateWelcomeUI() {
  const lblG = lang === 'bn' ? 'আজ:' : 'Today / اليوم:';
  const lblH = lang === 'bn' ? 'হিজরি:' : 'Hijri Date / هجري:';
  const lblC = lang === 'bn' ? 'ঘড়ি:' : 'Clock / الساعة:';

  document.getElementById('lbl-greg-title').innerText = lblG;
  document.getElementById('lbl-hijri-title').innerText = lblH;
  document.getElementById('lbl-clock-title').innerText = lblC;

  if (currentUser) {
    const welcomeText = lang === 'bn' 
      ? `স্বাগতম, ${currentUser.displayName || 'সম্মানিত কর্মী'} 👋` 
      : `Welcome, ${currentUser.displayName || 'Valued Employee'} 👋`;
    document.getElementById('auth-welcome-title').innerText = welcomeText;
    document.getElementById('auth-status-badge').innerText = lang === 'bn' ? 'সার্ভার সেশন' : 'Online Sync';
    document.getElementById('auth-status-badge').className = "inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-500/10";
    document.getElementById('auth-login-box').classList.add('hidden');
    document.getElementById('btn-logout').classList.remove('hidden');
  } else {
    document.getElementById('auth-welcome-title').innerText = lang === 'bn' ? 'গেস্ট অ্যাকাউন্ট (অফলাইন সেশন)' : 'Offline Guest Mode Account';
    document.getElementById('auth-status-badge').innerText = lang === 'bn' ? 'ডিভাইস অফলাইন' : 'Offline Storage';
    document.getElementById('auth-status-badge').className = "inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    document.getElementById('auth-login-box').classList.remove('hidden');
    document.getElementById('btn-logout').classList.add('hidden');
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
  
  // Clean elements inside the SVG
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

  // Calculate total width and set viewBox dynamically
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

// 6. Statistics Calculations and Bento Dashboard displays
function updateStatistics() {
  const daysCount = currentLogs.length;
  let totalHours = 0;
  let totalOt = 0;

  currentLogs.forEach(log => {
    totalHours += Number(log.hours || 0);
    totalOt += Number(log.overtime || 0);
  });

  const estimatedEarnings = (totalHours * hourlyRate) + (totalOt * hourlyRate * otMultiplier);

  document.getElementById('stat-val-days').innerText = String(daysCount);
  document.getElementById('stat-val-hours').innerText = totalHours.toFixed(1);
  document.getElementById('stat-val-ot').innerText = totalOt.toFixed(1);

  // Mask display earnings configuration
  if (hideWages) {
    document.getElementById('stat-val-wages-container').classList.add('hidden');
    document.getElementById('stat-val-wages-hidden').classList.remove('hidden');
    document.getElementById('icon-wages-open').classList.add('hidden');
    document.getElementById('icon-wages-off').classList.remove('hidden');
  } else {
    document.getElementById('stat-val-wages-container').classList.remove('hidden');
    document.getElementById('stat-val-wages-hidden').classList.add('hidden');
    document.getElementById('stat-val-wages').innerText = `${estimatedEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
    document.getElementById('icon-wages-open').classList.remove('hidden');
    document.getElementById('icon-wages-off').classList.add('hidden');
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

  // Let's get credentials from user-specific local storage first for snappy feedback
  const cardNameEn = localStorage.getItem(getLocalIdKey('name_en')) || (currentUser ? (currentUser.displayName || 'Worker Name') : 'Shhab Md Md Md');
  const cardNameAr = localStorage.getItem(getLocalIdKey('name_ar')) || (currentUser ? 'الاسم الكامل' : 'شهاب مد مد مد');
  const cardCode = localStorage.getItem(getLocalIdKey('code')) || '6697';
  const cardPhoto = localStorage.getItem(getLocalIdKey('photo'));

  nameEnInput.value = cardNameEn;
  nameArInput.value = cardNameAr;
  codeInput.value = cardCode;

  document.getElementById('id-name-en-val').innerText = cardNameEn;
  document.getElementById('id-name-ar-val').innerText = cardNameAr;
  document.getElementById('id-barcode-under').innerText = cardCode;
  drawCode39Barcode(cardCode);

  if (cardPhoto) {
    photoDisplay.src = cardPhoto;
    photoDisplay.classList.remove('hidden');
    photoPlaceholder.classList.add('hidden');
  } else {
    photoDisplay.classList.add('hidden');
    photoPlaceholder.classList.remove('hidden');
  }

  // Display user login login warning for photo sync
  const warn = document.getElementById('section-id-auth-mask');
  if (currentUser) {
    warn.classList.add('hidden');
  } else {
    warn.classList.remove('hidden');
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
  tbody.innerHTML = '';

  const searchQuery = document.getElementById('filter-search').value.toLowerCase();
  const filterMonth = document.getElementById('filter-month').value; // YYYY-MM
  const filterCompany = document.getElementById('filter-company').value;

  const filteredLogs = currentLogs.filter(log => {
    // Search site, description, or notes details
    const textFields = `${log.location || ''} ${log.description || ''} ${log.notes || ''} ${log.company || ''}`.toLowerCase();
    const matchesSearch = !searchQuery || textFields.includes(searchQuery);

    // Month filter check
    const matchesMonth = !filterMonth || (log.dateGregorian && log.dateGregorian.startsWith(filterMonth));

    // Company filter check
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

  if (filteredLogs.length === 0) {
    const noDataText = DICTIONARY['tableNoData'][lang] || 'No records found.';
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="p-8 text-center text-slate-400 dark:text-slate-500 italic">
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

  // Generate table rows dynamically
  filteredLogs.forEach(log => {
    const dateFormatted = formatGregorianDate(log.dateGregorian);
    const dayName = dateFormatted.english ? dateFormatted.english.split(',')[0] : '';
    const dateStr = log.dateGregorian || '';
    const rowId = log.id;

    const computedEstEarnings = (Number(log.hours || 0) * hourlyRate) + (Number(log.overtime || 0) * hourlyRate * otMultiplier);

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
      <td class="p-3.5 text-right font-semibold font-mono whitespace-nowrap text-emerald-600 dark:text-emerald-400">
        ${hideWages ? '•••• SAR' : `${computedEstEarnings.toFixed(2)} SAR`}
      </td>
      <td class="p-3.5 max-w-xs space-y-1">
        <p class="font-semibold text-slate-800 dark:text-slate-200 leading-normal">${log.description || ''}</p>
        ${(log.translationEn && log.translationEn !== log.description) ? `<p class="text-[10px] text-slate-500 italic">En: ${log.translationEn}</p>` : ''}
        ${log.translationAr ? `<p class="text-[10px] text-slate-400 dir-rtl text-right">Ar: ${log.translationAr}</p>` : ''}
      </td>
      <td class="p-3.5 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
        ${log.notes ? `<div class="italic">"${log.notes}"</div>` : ''}
        ${log.supervisor ? `<div class="font-semibold text-[10px] text-emerald-600/95 dark:text-emerald-400/90 flex items-center gap-0.5"><i data-lucide="user" class="h-2.5 w-2.5"></i> ${log.supervisor}</div>` : ''}
      </td>
      <td class="p-3.5 text-center no-print">
        <div class="flex items-center justify-center gap-1.5Packed">
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
  
  // Attach event hooks to individual rows buttons
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
      // 1. Authenticated Firestore DB save
      const colRef = collection(db, 'workLogs');
      if (editingLogId) {
        await setDoc(doc(db, 'workLogs', editingLogId), {
          ...logData,
          userId: currentUser.uid,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await addDoc(colRef, {
          ...logData,
          userId: currentUser.uid,
          createdAt: serverTimestamp()
        });
      }
    } else {
      // 2. Offline LocalStorage Array manipulation for Guest Session
      let stored = JSON.parse(localStorage.getItem('tamdeen_guest_database') || '[]');
      if (editingLogId) {
        stored = stored.map(g => (g.id === editingLogId) ? { ...g, ...logData } : g);
      } else {
        const fakeId = `guest_log_${Date.now()}`;
        stored.push({ id: fakeId, ...logData });
      }
      localStorage.setItem('tamdeen_guest_database', JSON.stringify(stored));
      
      // Load Offline Logs directly
      loadGuestLogs();
    }

    // Reset Form state
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

  // Show translations review frame
  document.getElementById('txt-translated-en').innerText = chosen.translationEn || '';
  document.getElementById('txt-translated-ar').innerText = chosen.translationAr || '';
  document.getElementById('translator-output-block').classList.remove('hidden');

  // Activate Cancel Button
  document.getElementById('btn-form-cancel').classList.remove('hidden');

  // Jump smoothly to the top form view
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
  
  // Today's date default
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

// Loads local guest DB if not logged in
function loadGuestLogs() {
  const data = JSON.parse(localStorage.getItem('tamdeen_guest_database') || '[]');
  // Sort reverse chronologically
  data.sort((a,b) => b.timestamp - a.timestamp);
  currentLogs = data;
  updateStatistics();
  renderTable();
}

// CSV Dynamic generator utility download
function exportLogsToCSV() {
  if (currentLogs.length === 0) {
    alert(lang === 'bn' ? 'রপ্তানি করার জন্য কোনো কাজের তথ্য নেই।' : 'No records available to export.');
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  // CSV Headers row
  csvContent += "Date Gregorian,Date Hijri,Company,Location,Duty Hours,Overtime Hours,Estimated Earned,Description,Notes,Supervisor\n";

  currentLogs.forEach(entry => {
    const est = (Number(entry.hours || 0) * hourlyRate) + (Number(entry.overtime || 0) * hourlyRate * otMultiplier);
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


// MAIN ENTRY POINT INITIALIZATION FUNCTION
async function main() {
  // Load config file securely via local fetch API
  let firebaseConfig;
  try {
    const res = await fetch('./firebase-applet-config.json');
    firebaseConfig = await res.json();
  } catch (err) {
    console.error("Unable to load firebase config coordinates from workspace:", err);
    return;
  }

  // Bootstraps Firebase Native services using modular CDN classes
  app = initializeApp(firebaseConfig);
  
  // Enable offline-data synchronization using persistent caching
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, firebaseConfig.firestoreDatabaseId);

  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();

  // Load local state parameters
  document.getElementById('set-hourly-rate').value = String(hourlyRate);
  document.getElementById('set-ot-multiplier').value = String(otMultiplier);

  // Apply visual theme presets
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
    document.getElementById('icon-theme-light').classList.remove('hidden');
    document.getElementById('icon-theme-dark').classList.add('hidden');
  } else {
    document.documentElement.classList.remove('dark');
    document.getElementById('icon-theme-light').classList.add('hidden');
    document.getElementById('icon-theme-dark').classList.remove('hidden');
  }

  // Set default form date Gregorian to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('field-date').value = today;
  document.getElementById('field-hijri').value = convertGregorianToHijri(today).arabic;

  // Clock Update Interval loop ticker
  setInterval(() => {
    const clockNode = document.getElementById('clock-live');
    if (clockNode) {
      clockNode.innerText = new Date().toLocaleTimeString('en-US', { hour12: false });
    }
  }, 1000);

  // Set real calendar clock descriptions
  const todayConverted = convertGregorianToHijri(today);
  const todayGFormatted = formatGregorianDate(today);
  document.getElementById('clock-gregorian').innerText = lang === 'bn' ? todayGFormatted.bengali : todayGFormatted.english;
  document.getElementById('clock-hijri').innerText = `${todayConverted.arabic} (${lang === 'bn' ? todayConverted.bengali : todayConverted.latin})`;

  // Translator live input hooks
  document.getElementById('field-date').addEventListener('change', (e) => {
    const val = e.target.value;
    document.getElementById('field-hijri').value = convertGregorianToHijri(val).arabic;
  });

  // Slider controls event tick updates
  document.getElementById('field-hours').addEventListener('input', (e) => {
    document.getElementById('txt-hours-val').innerText = `${Number(e.target.value).toFixed(1)} hrs`;
  });
  document.getElementById('field-overtime').addEventListener('input', (e) => {
    document.getElementById('txt-ot-val').innerText = `${Number(e.target.value).toFixed(1)} hrs`;
  });

  // Apply Preset Buttons
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const h = btn.getAttribute('data-h');
      const ot = btn.getAttribute('data-ot');
      document.getElementById('field-hours').value = h;
      document.getElementById('txt-hours-val').innerText = `${Number(h).toFixed(1)} hrs`;
      document.getElementById('field-overtime').value = ot;
      document.getElementById('txt-ot-val').innerText = `${Number(ot).toFixed(1)} hrs`;
    });
  });

  // Toggle Theme controller
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

  // Change Language Toggles
  document.getElementById('btn-lang-toggle').addEventListener('click', () => {
    lang = lang === 'bn' ? 'en-ar' : 'bn';
    localStorage.setItem('al_tamdin_lang', lang);
    // Refresh date layout
    const tG = formatGregorianDate(document.getElementById('field-date').value);
    document.getElementById('clock-gregorian').innerText = lang === 'bn' ? tG.bengali : tG.english;
    
    translateUI();
    syncAndRenderIDCard();
    renderTable();
  });

  // Quick Forms trigger Translate block
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
  });

  // Settings Save Callback
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

  // Modal controls triggers
  document.getElementById('btn-settings-open').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.remove('hidden');
  });
  document.getElementById('btn-settings-close').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
  });

  // Bento mask toggling hook
  document.getElementById('card-estimated-wages').addEventListener('click', (e) => {
    // ignore clicks on the eye icon alone, standard toggle handled
    hideWages = !hideWages;
    localStorage.setItem('al_tamdin_hide_wages', String(hideWages));
    updateStatistics();
    renderTable();
  });

  document.getElementById('btn-toggle-mask-state').addEventListener('click', () => {
    hideWages = !hideWages;
    localStorage.setItem('al_tamdin_hide_wages', String(hideWages));
    const knob = document.getElementById('span-mask-knob');
    if (hideWages) {
      knob.style.transform = 'translateX(0px)';
    } else {
      knob.style.transform = 'translateX(20px)';
    }
    updateStatistics();
    renderTable();
  });

  // Forms management handlers
  document.getElementById('work-log-form').addEventListener('submit', saveWorkLog);
  document.getElementById('btn-form-cancel').addEventListener('click', resetForm);

  // Digital Badge Modal links
  document.getElementById('btn-idcard-open').addEventListener('click', () => {
    document.getElementById('idcard-modal').classList.remove('hidden');
    syncAndRenderIDCard();
  });
  document.getElementById('btn-idcard-close').addEventListener('click', () => {
    document.getElementById('idcard-modal').classList.add('hidden');
  });

  // Photo uploads hooks inside visual Badge
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
    
    // update Firestore too if user is authenticated
    if (currentUser) {
      const uRef = doc(db, 'users', currentUser.uid);
      setDoc(uRef, { photoBase64: null, updatedAt: serverTimestamp() }, { merge: true });
    }
  });

  // Capture Screenshot/Save Badge layout as local PNG
  document.getElementById('btn-id-download').addEventListener('click', () => {
    const node = document.getElementById('badge-capture-container');
    html2canvas(node, {
      scale: 3, // Premium ultra-high definition PDF scaling factor
      useCORS: true,
      allowTaint: true
    }).then(canvas => {
      const dataUrl = canvas.toDataURL('image/png');
      const hrefLink = document.createElement('a');
      hrefLink.download = `Tamdeen_Badge_${document.getElementById('id-name-en-val').innerText.trim()}_${Date.now()}.png`;
      hrefLink.href = dataUrl;
      document.body.appendChild(hrefLink);
      hrefLink.click();
      document.body.removeChild(hrefLink);
    });
  });

  // ID Card Detail save
  document.getElementById('btn-id-save-db').addEventListener('click', async () => {
    const nameEn = document.getElementById('id-edit-en').value.trim();
    const nameAr = document.getElementById('id-edit-ar').value.trim();
    const code = document.getElementById('id-edit-code').value.trim();
    
    // Update Local values first
    localStorage.setItem(getLocalIdKey('name_en'), nameEn);
    localStorage.setItem(getLocalIdKey('name_ar'), nameAr);
    localStorage.setItem(getLocalIdKey('code'), code);

    // Save on Snapshot update and upload to Firestore user record if logged in
    if (currentUser) {
      try {
        const uRef = doc(db, 'users', currentUser.uid);
        const photo = localStorage.getItem(getLocalIdKey('photo')) || null;
        await setDoc(uRef, {
          userId: currentUser.uid,
          nameEn: nameEn,
          nameAr: nameAr,
          cardCode: code,
          photoBase64: photo,
          updatedAt: serverTimestamp()
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
        photoBase64: null,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    syncAndRenderIDCard();
    alert('Restored Card template.');
  });

  // Exports & Prints
  document.getElementById('btn-export-csv').addEventListener('click', exportLogsToCSV);
  
  document.getElementById('btn-print-report').addEventListener('click', () => {
    document.getElementById('print-report-date').innerText = `Generated on: ${new Date().toLocaleString()}`;
    window.print();
  });

  // Filters inputs listeners
  document.getElementById('filter-search').addEventListener('input', renderTable);
  document.getElementById('filter-month').addEventListener('change', renderTable);
  document.getElementById('filter-company').addEventListener('change', renderTable);

  // Authenticate Google PopUp SignIn Trigger links
  document.getElementById('btn-google-login').addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Popup SignIn failed:", err);
    }
  });

  document.getElementById('btn-guest-login').addEventListener('click', () => {
    currentUser = null;
    localStorage.setItem('al_tamdin_guest_mode', 'true');
    loadGuestLogs();
    updateWelcomeUI();
    syncAndRenderIDCard();
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
      localStorage.removeItem('al_tamdin_guest_mode');
      localStorage.removeItem('al_tamdin_cached_user');
      await signOut(auth);
    } catch (err) {
      console.error("SignOut failed:", err);
    }
  });

  // REAL REALTIME AUTH ACTIVE LISTENER STATE OBSERVER
  onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      currentUser = firebaseUser;
      localStorage.setItem('al_tamdin_guest_mode', 'false');
      localStorage.setItem('al_tamdin_cached_user', JSON.stringify({
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName,
        email: firebaseUser.email
      }));

      // Setup Listeners for Firestore Profile Card sync
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

      // Synchronize in real-time user-specific WorkLogs listings from Firestore (offline cached support integrated)
      const q = query(
        collection(db, 'workLogs'), 
        where('userId', '==', firebaseUser.uid)
      );
      
      onSnapshot(q, (snapshot) => {
        const arr = [];
        snapshot.forEach(docSnap => {
          arr.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        // Sort reverse chronologically by timestamp
        arr.sort((a,b) => b.timestamp - a.timestamp);
        
        currentLogs = arr;
        updateStatistics();
        renderTable();
      }, (error) => {
        console.error("Realtime Logs snapshot sync failure: ", error);
      });

    } else {
      currentUser = null;
      // If we have cached logins, load them or fallback to Guest session
      const cached = localStorage.getItem('al_tamdin_cached_user');
      if (cached) {
        try {
          currentUser = JSON.parse(cached);
          loadGuestLogs(); // fallback
        } catch {
          loadGuestLogs();
        }
      } else {
        loadGuestLogs();
      }
    }
    
    updateWelcomeUI();
    syncAndRenderIDCard();
    translateUI();
  });

  translateUI();
}

// Fire up core setup when browser DOM completes loading
window.addEventListener('DOMContentLoaded', main);
