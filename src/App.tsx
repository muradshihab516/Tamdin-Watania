import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  setDoc,
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { 
  Clock, 
  LogOut, 
  TrendingUp, 
  Briefcase, 
  Settings, 
  UserCheck, 
  Calendar, 
  Building, 
  DollarSign, 
  ShieldAlert, 
  CheckCircle,
  HelpCircle,
  Clock3,
  Globe2,
  CalendarDays,
  Eye,
  EyeOff,
  Sun,
  Moon,
  CreditCard
} from 'lucide-react';

import { auth, db, loginWithGoogle, logoutUser, handleFirestoreError, OperationType } from './lib/firebase';
import { WorkLog } from './types';
import { convertGregorianToHijri, formatGregorianDate } from './utils/dateHelper';
import StatsCard from './components/StatsCard';
import WorkLogForm from './components/WorkLogForm';
import WorkLogTable from './components/WorkLogTable';
import TamdeenLogo from './components/TamdeenLogo';
import IdCard from './components/IdCard';
import { LanguageMode, DICTIONARY } from './utils/langHelper';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [lang, setLang] = useState<LanguageMode>(() => {
    return (localStorage.getItem('al_tamdin_lang') as LanguageMode) || 'en-ar';
  });
  
  // Dark mode toggle state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('al_tamdin_dark_mode') === 'true';
  });
  
  // Custom Wage Calculator stats (Saved to LocalStorage for instant access)
  const [hourlyRate, setHourlyRate] = useState<number>(() => {
    return Number(localStorage.getItem('al_tamdin_hourly_rate') || '15');
  });
  const [otMultiplier, setOtMultiplier] = useState<number>(() => {
    return Number(localStorage.getItem('al_tamdin_ot_multiplier') || '1.5');
  });
  const [hideWages, setHideWages] = useState<boolean>(() => {
    return localStorage.getItem('al_tamdin_hide_wages') !== 'false';
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [currentTodayInfo, setCurrentTodayInfo] = useState({ gDate: '', hDate: '' });

  // Network offline-first states
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncQueueCount, setSyncQueueCount] = useState<number>(() => {
    const qStr = localStorage.getItem('al_tamdin_pending_sync_queue') || '[]';
    try {
      return JSON.parse(qStr).length;
    } catch {
      return 0;
    }
  });

  // Track network status changes dynamically
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync dark mode selection
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('al_tamdin_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('al_tamdin_dark_mode', 'false');
    }
  }, [isDarkMode]);

  // Update today's date info in real-time
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayGregStr = `${year}-${month}-${day}`;
    
    const hijri = convertGregorianToHijri(todayGregStr);
    const gDateFormatted = formatGregorianDate(todayGregStr);

    setCurrentTodayInfo({
      gDate: gDateFormatted.bengali,
      hDate: `${hijri.arabic} (${hijri.bengali})`
    });
  }, []);

  // Sync rate preferences and language to LocalStorage
  useEffect(() => {
    localStorage.setItem('al_tamdin_hourly_rate', String(hourlyRate));
    localStorage.setItem('al_tamdin_ot_multiplier', String(otMultiplier));
    localStorage.setItem('al_tamdin_lang', lang);
    localStorage.setItem('al_tamdin_hide_wages', String(hideWages));
  }, [hourlyRate, otMultiplier, lang, hideWages]);

  // Auth observer with offline login cache recovery
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsGuestMode(false);
        // Cache user profile for offline session recovery
        localStorage.setItem('al_tamdin_cached_user', JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName
        }));
      } else {
        const cachedUserStr = localStorage.getItem('al_tamdin_cached_user');
        const wasGuest = localStorage.getItem('al_tamdin_guest_mode') === 'true';
        if (!wasGuest && cachedUserStr && !isOnline) {
          // Offline auth recovery!
          try {
            const cached = JSON.parse(cachedUserStr);
            setUser(cached as User);
            setIsGuestMode(false);
          } catch (e) {
            setUser(null);
          }
        } else {
          setUser(null);
          if (wasGuest) {
            setIsGuestMode(true);
          }
        }
      }
      setAuthChecking(false);
    });
    return unsubscribe;
  }, [isOnline]);

  // Sync queue management helpers
  const queueSyncAction = (type: 'CREATE' | 'UPDATE' | 'DELETE', logId: string, data?: any) => {
    const queueStr = localStorage.getItem('al_tamdin_pending_sync_queue') || '[]';
    let queue: any[] = [];
    try {
      queue = JSON.parse(queueStr);
    } catch {
      queue = [];
    }
    
    queue.push({
      type,
      logId,
      data: data ? {
        dateGregorian: data.dateGregorian,
        dateHijri: data.dateHijri,
        company: data.company,
        location: data.location || '',
        description: data.description || '',
        hours: Number(data.hours || 0),
        overtime: Number(data.overtime || 0),
        notes: data.notes || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } : null,
      timestamp: Date.now()
    });
    
    localStorage.setItem('al_tamdin_pending_sync_queue', JSON.stringify(queue));
    setSyncQueueCount(queue.length);
  };

  const syncPendingActions = async () => {
    if (!navigator.onLine || !user || isGuestMode) return;
    
    const queueStr = localStorage.getItem('al_tamdin_pending_sync_queue') || '[]';
    let queue: any[] = [];
    try {
      queue = JSON.parse(queueStr);
    } catch {
      queue = [];
    }
    
    if (queue.length === 0) {
      setSyncQueueCount(0);
      return;
    }
    
    setSyncStatus('syncing');
    
    try {
      for (const action of queue) {
        const docRef = doc(db, 'workLogs', action.logId);
        
        if (action.type === 'CREATE') {
          await setDoc(docRef, {
            ...action.data,
            userId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else if (action.type === 'UPDATE') {
          let actualCreatedAt: any = action.data.createdAt;
          try {
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              actualCreatedAt = snap.data().createdAt;
            }
          } catch (fetchErr) {
            console.warn("Could not retrieve original createdAt online:", fetchErr);
          }
          
          await setDoc(docRef, {
            ...action.data,
            userId: user.uid,
            createdAt: actualCreatedAt,
            updatedAt: serverTimestamp()
          });
        } else if (action.type === 'DELETE') {
          await deleteDoc(docRef);
        }
      }
      
      localStorage.setItem('al_tamdin_pending_sync_queue', '[]');
      setSyncQueueCount(0);
      setSyncStatus('synced');
    } catch (err) {
      console.error("Failed to sync some changes to cloud Firestore:", err);
      setSyncStatus('error');
    }
  };

  // Trigger auto sync when back online
  useEffect(() => {
    if (isOnline && user && !isGuestMode) {
      syncPendingActions();
    }
  }, [isOnline, user, isGuestMode]);

  // Real-time synchronization of work logs or load from cache offline
  useEffect(() => {
    let unsubscribeFirestore = () => {};

    if (user && !isGuestMode) {
      if (isOnline) {
        setSyncStatus('syncing');
        const q = query(
          collection(db, 'workLogs'), 
          where('userId', '==', user.uid)
        );

        unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          const docList: WorkLog[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            docList.push({
              id: docSnap.id,
              ...data
            } as WorkLog);
          });
          docList.sort((a,b) => b.dateGregorian.localeCompare(a.dateGregorian));
          setLogs(docList);
          localStorage.setItem('al_tamdin_cached_online_logs', JSON.stringify(docList));
          setSyncStatus('synced');
        }, (error) => {
          setSyncStatus('error');
          handleFirestoreError(error, OperationType.LIST, 'workLogs');
        });
      } else {
        const cachedCloudLogs = localStorage.getItem('al_tamdin_cached_online_logs') || '[]';
        try {
          const parsed = JSON.parse(cachedCloudLogs);
          setLogs(parsed);
          setSyncStatus('idle');
        } catch (e) {
          setLogs([]);
        }
      }
    } else if (isGuestMode) {
      const localLogsStr = localStorage.getItem('al_tamdin_local_logs') || '[]';
      try {
        setLogs(JSON.parse(localLogsStr));
        setSyncStatus('synced');
      } catch (e) {
        setLogs([]);
        setSyncStatus('error');
      }
    } else {
      setLogs([]);
      setSyncStatus('idle');
    }

    return () => unsubscribeFirestore();
  }, [user, isGuestMode, isOnline]);

  // Log in with Google Account
  const handleGoogleLogin = async () => {
    try {
      setAuthChecking(true);
      await loginWithGoogle();
      localStorage.setItem('al_tamdin_guest_mode', 'false');
    } catch (e) {
      console.error(e);
    } finally {
      setAuthChecking(false);
    }
  };

  // Skip Login / Use LocalStorage offline Guest mode
  const handleEnterGuestMode = () => {
    setIsGuestMode(true);
    localStorage.setItem('al_tamdin_guest_mode', 'true');
    setAuthChecking(false);
  };

  // Log Out handler
  const handleLogout = async () => {
    try {
      await logoutUser();
      setIsGuestMode(false);
      localStorage.setItem('al_tamdin_guest_mode', 'false');
      localStorage.removeItem('al_tamdin_cached_user');
      localStorage.removeItem('al_tamdin_cached_online_logs');
      localStorage.removeItem('al_tamdin_pending_sync_queue');
      setSyncQueueCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  // Save (Create or Update) log item with offline fallback
  const handleSaveLog = async (logData: Omit<WorkLog, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (editingLog) {
      const logId = editingLog.id;
      const updatedItem: WorkLog = {
        ...editingLog,
        ...logData,
        updatedAt: new Date().toISOString()
      };

      if (!isGuestMode && user) {
        if (isOnline) {
          const docRef = doc(db, 'workLogs', logId);
          try {
            let actualCreatedAt: any = editingLog.createdAt;
            try {
              const snap = await getDoc(docRef);
              if (snap.exists()) {
                actualCreatedAt = snap.data().createdAt;
              }
            } catch (fetchErr) {
              console.warn("Could not fetch online doc in handleSave:", fetchErr);
            }

            await setDoc(docRef, {
              ...logData,
              userId: user.uid,
              createdAt: actualCreatedAt,
              updatedAt: serverTimestamp()
            });
            setEditingLog(null);
          } catch (error) {
            console.warn("Write failed online, queueing as UPDATE action:", error);
            queueSyncAction('UPDATE', logId, updatedItem);
            
            const updatedList = logs.map(item => item.id === logId ? updatedItem : item);
            setLogs(updatedList);
            localStorage.setItem('al_tamdin_cached_online_logs', JSON.stringify(updatedList));
            setEditingLog(null);
          }
        } else {
          queueSyncAction('UPDATE', logId, updatedItem);
          
          const updatedList = logs.map(item => item.id === logId ? updatedItem : item);
          setLogs(updatedList);
          localStorage.setItem('al_tamdin_cached_online_logs', JSON.stringify(updatedList));
          setEditingLog(null);
        }
      } else {
        const updatedList = logs.map(item => {
          if (item.id === editingLog.id) {
            return {
              ...item,
              ...logData,
              updatedAt: new Date().toISOString()
            };
          }
          return item;
        });
        setLogs(updatedList);
        localStorage.setItem('al_tamdin_local_logs', JSON.stringify(updatedList));
        setEditingLog(null);
      }
    } else {
      const logId = `log_${Date.now()}`;
      const newPayload: WorkLog = {
        id: logId,
        userId: user ? user.uid : 'guest_user',
        ...logData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (!isGuestMode && user) {
        if (isOnline) {
          try {
            const docRef = doc(db, 'workLogs', logId);
            await setDoc(docRef, {
              ...newPayload,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          } catch (error) {
            console.warn("Failed writing CREATE online, queueing:", error);
            queueSyncAction('CREATE', logId, newPayload);
            
            const updatedList = [newPayload, ...logs];
            setLogs(updatedList);
            localStorage.setItem('al_tamdin_cached_online_logs', JSON.stringify(updatedList));
          }
        } else {
          queueSyncAction('CREATE', logId, newPayload);
          
          const updatedList = [newPayload, ...logs];
          setLogs(updatedList);
          localStorage.setItem('al_tamdin_cached_online_logs', JSON.stringify(updatedList));
        }
      } else {
        const localLog: WorkLog = {
          id: logId,
          userId: 'guest_user',
          ...logData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const updatedList = [localLog, ...logs];
        setLogs(updatedList);
        localStorage.setItem('al_tamdin_local_logs', JSON.stringify(updatedList));
      }
    }
  };

  // Delete a log entry with offline fallback
  const handleDeleteLog = async (id: string) => {
    if (!isGuestMode && user) {
      if (isOnline) {
        try {
          await deleteDoc(doc(db, 'workLogs', id));
        } catch (error) {
          console.warn("Delete failed online, queueing DELETE operation:", error);
          queueSyncAction('DELETE', id);
          
          const updatedList = logs.filter(item => item.id !== id);
          setLogs(updatedList);
          localStorage.setItem('al_tamdin_cached_online_logs', JSON.stringify(updatedList));
        }
      } else {
        queueSyncAction('DELETE', id);
        
        const updatedList = logs.filter(item => item.id !== id);
        setLogs(updatedList);
        localStorage.setItem('al_tamdin_cached_online_logs', JSON.stringify(updatedList));
      }
    } else {
      const updatedList = logs.filter(item => item.id !== id);
      setLogs(updatedList);
      localStorage.setItem('al_tamdin_local_logs', JSON.stringify(updatedList));
    }
  };

  // Start editing mode
  const handleStartEdit = (logItem: WorkLog) => {
    setEditingLog(logItem);
    const formElement = document.getElementById('work-form-container');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Cancel edit session
  const handleCancelEdit = () => {
    setEditingLog(null);
  };

  // Calculations for stats totals
  const totalDays = logs.length;
  const totalHours = logs.reduce((acc, curr) => acc + curr.hours, 0);
  const totalOvertime = logs.reduce((acc, curr) => acc + curr.overtime, 0);
  const totalEstimatedEarnings = logs.reduce((acc, curr) => {
    const otWages = curr.overtime * hourlyRate * otMultiplier;
    return acc + otWages;
  }, 0);

  // Authentication Required view (Login Screen)
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-700 rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
          Loading Work Log System...
        </p>
      </div>
    );
  }

  if (!user && !isGuestMode) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden text-slate-850 dark:text-slate-100 transition-colors duration-200">
        {/* Floating Theme Switcher on Login Screen */}
        <div className="absolute top-4 right-4 z-50">
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-905 text-slate-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm flex items-center justify-center"
            title={isDarkMode ? 'লাইট মোড অন করুন' : 'ডার্ক মোড অন করুন'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Decorative background shapes and watermark */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/20 dark:bg-blue-900/10 blur-3xl -z-10" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-200/20 dark:bg-amber-900/10 blur-3xl -z-10" />
        <div className="absolute inset-0 pointer-events-none select-none opacity-[0.015] dark:opacity-[0.008] flex items-center justify-center -z-10">
          <TamdeenLogo showText={false} iconSize={450} className="transform rotate-12" />
        </div>

        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 p-8 shadow-xl relative overflow-hidden transition-colors duration-200">
          {/* Faint card watermark */}
          <div className="absolute -right-20 -bottom-20 pointer-events-none select-none opacity-[0.02]">
            <TamdeenLogo showText={false} iconSize={240} className="transform -rotate-12" />
          </div>

          <div className="text-center mb-8 relative z-10 flex flex-col items-center">
            <TamdeenLogo iconSize={64} textColorClass="text-slate-800 dark:text-slate-100 text-xl font-bold mt-2" centerTextAlign={true} />
            <span className="mt-4 bg-sky-50 dark:bg-sky-950/40 text-sky-850 dark:text-sky-350 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border border-sky-100 dark:border-sky-900/30">
              Al Tamdin Al Watania Work Log
            </span>
            <h1 className="text-xl font-black font-sans text-slate-800 dark:text-slate-100 tracking-tight mt-3">
              কাজের হিসাব ও রসিদ ট্র্যাকার
            </h1>
          </div>

          <div className="space-y-4 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100/80 dark:border-slate-800 mb-8 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-sky-700 dark:text-sky-400" />
              এপ্লিকেশন ফিচারসমূহ:
            </h3>
            <ul className="list-disc list-inside space-y-1 pl-1 font-medium text-slate-600 dark:text-slate-355">
              <li>অটো ইংরেজি তারিখ থেকে আরবি হিজরি রূপান্তর</li>
              <li>ম্যানুয়ালী আগের বা যেকোনো দিনের হিসাব যুক্ত করার সুযোগ</li>
              <li>কোম্পানি বা সাইট স্থান অনুযায়ী কাজের বিবরণ সংরক্ষণ</li>
              <li>ঘন্টা অনুযায়ী মোট কাজের ও ওটি (Overtime) এর হিসাব</li>
              <li>প্রিন্ট এবং এক্সপোর্ট করার রেডিমেড লেআউট</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              id="btn-google-login"
              onClick={handleGoogleLogin}
              className="w-full py-3.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-3 shadow-lg hover:shadow-slate-300 dark:hover:shadow-none transition-all hover:bg-black dark:hover:bg-white cursor-pointer"
            >
              {/* Simple inline Google G SVG */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Google অ্যাকাউন্ট দিয়ে লগইন করুন
            </button>

            <button
              id="btn-guest-mode"
              onClick={handleEnterGuestMode}
              className="w-full py-3 border border-slate-200 dark:border-slate-705 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              লগইন ছাড়া ব্যবহার করুন (অফলাইন মোড)
            </button>
          </div>

          <div className="mt-8 text-center text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            Powered by Firebase Cloud DB
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-16 font-sans relative overflow-hidden transition-colors duration-200">
      {/* 2026 Floating Company Watermark Background */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0 opacity-[0.02] dark:opacity-[0.015] flex items-center justify-center print:hidden">
        <TamdeenLogo showText={false} iconSize={600} className="transform rotate-12 scale-110" />
      </div>
      
      {/* 1. Header Toolbar (Hidden during Print) */}
      <header id="header-nav" className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-2.5 px-4 md:px-6 print:hidden relative z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          
          <div className="flex items-center gap-3">
            <TamdeenLogo iconSize={34} textColorClass="text-slate-800 dark:text-slate-100 font-extrabold text-sm md:text-base" />
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2 flex-wrap">
                {isGuestMode ? (
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-black uppercase tracking-tight py-0.5 px-1.5 rounded border border-slate-200 dark:border-slate-700">
                    Guest Mode (অফলাইন)
                  </span>
                ) : isOnline ? (
                  syncQueueCount > 0 ? (
                    <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase tracking-tight py-0.5 px-1.5 rounded border border-amber-200/50 dark:border-amber-900/30 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {syncQueueCount} Sync Pending (সিঙ্ক বাকি)
                    </span>
                  ) : (
                    <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase tracking-tight py-0.5 px-1.5 rounded border border-emerald-200/50 dark:border-emerald-900/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Cloud Connected (ক্লাউড অনলাইন)
                    </span>
                  )
                ) : (
                  <span className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-[9px] font-black uppercase tracking-tight py-0.5 px-1.5 rounded border border-rose-200/50 dark:border-rose-900/30 flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-550" />
                    Device Offline (ডিভাইস অফলাইন)
                  </span>
                )}
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">• আল তামদিন আল ওয়াতানিয়া খাতা</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* Live Clock display */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded border border-slate-200 dark:border-slate-700/80 text-[10px] font-bold text-slate-550 dark:text-slate-400 font-sans">
              <div className="flex items-center gap-1">
                <Globe2 className="w-3 h-3 text-blue-600 dark:text-blue-450" />
                <span>আজ: {currentTodayInfo.gDate}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-1 font-mono">
                <Clock3 className="w-3 h-3 text-amber-500 dark:text-amber-450" />
                <span className="text-[10px] text-slate-650 dark:text-slate-300">{currentTodayInfo.hDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-705 text-[10px] font-black">
                <button
                  id="lang-btn-enar"
                  onClick={() => setLang('en-ar')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    lang === 'en-ar'
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
                  }`}
                  title="Default English & Arabic Mode"
                >
                  EN / عربي
                </button>
                <button
                  id="lang-btn-bn"
                  onClick={() => setLang('bn')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    lang === 'bn'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
                  }`}
                  title="Bengali Mode (কাজের খাতা বাংলা)"
                >
                  বাংলা
                </button>
              </div>

              {/* Dark Mode Sun/Moon Button */}
              <button
                id="btn-toggle-darkmode"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer"
                title={isDarkMode ? 'লাইট মোড অন করুন' : 'ডার্ক মোড অন করুন'}
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> : <Moon className="w-3.5 h-3.5" />}
              </button>

              <button
                id="btn-toggle-wages"
                onClick={() => setHideWages(!hideWages)}
                className={`p-2 rounded-lg border transition-all cursor-pointer ${
                  hideWages 
                    ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400' 
                    : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                }`}
                title={hideWages ? (lang === 'bn' ? 'টাকার হিসাব দেখুন' : 'Show Wages Calculations (عرض الرواتب)') : (lang === 'bn' ? 'টাকার হিসাব লুকান' : 'Hide Wages Calculations (إخفاء الرواتب)')}
              >
                {hideWages ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>

              <button
                id="btn-settings"
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg border transition-all cursor-pointer ${
                  showSettings 
                    ? 'bg-slate-850 dark:bg-slate-700 border-slate-850 dark:border-slate-700 text-white' 
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 border-slate-200 dark:border-slate-705 text-slate-600 dark:text-slate-350'
                }`}
                title="مجুরি হিসাব সেটিংস"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              {/* Virtual ID Card Button */}
              <button
                id="btn-show-idcard"
                onClick={() => setShowIdCard(true)}
                className="px-3 py-1.5 md:py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 dark:from-amber-600 dark:to-amber-700 text-white font-extrabold rounded-lg text-[10px] md:text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm relative overflow-hidden group active:scale-95"
                title={lang === 'bn' ? 'আমার আইডি কার্ড ও বারকোড' : 'My Virtual ID & Barcode'}
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <CreditCard className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'bn' ? 'আমার আইডি' : 'My ID'}</span>
              </button>

              <div className="bg-slate-100 dark:bg-slate-800/80 rounded-lg p-0.5 flex items-center gap-1.5 border border-transparent dark:border-slate-700/60">
                <div className="px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span className="max-w-[80px] truncate" title={user?.email || 'Guest User'}>
                    {user ? (user.displayName || user.email?.split('@')[0]) : 'Guest'}
                  </span>
                </div>
                <button
                  id="btn-logout"
                  onClick={handleLogout}
                  className="bg-white dark:bg-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 text-slate-400 dark:text-slate-300 p-1 rounded border border-slate-200 dark:border-slate-650 shadow-none transition-colors cursor-pointer"
                  title="লগ আউট করুন"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            </div>

          </div>

        </div>
      </header>

      {/* 2. Print Header Information (Only shown on paper outputs) */}
      <div className="hidden print-only max-w-4xl mx-auto p-4 mb-6 border-b-2 border-slate-800">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black font-sans tracking-tight">
              AL TAMDIN AL WATANIA
            </h1>
            <p className="text-xs text-slate-500">
              WORK HISTORY AND LOG COMPILATION STATEMENT
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-bold text-slate-800">কাজের বিবরণী ও হিসাব রসিদ</h2>
            <p className="text-xs font-mono">Generated on: {new Date().toISOString().split('T')[0]}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 mt-4 text-[11px] font-semibold text-slate-600">
          <div>
            <p>ট্রেড নাম (Employee/Service): {user?.displayName || user?.email || 'Al Tamdin Staff'}</p>
            <p>স্ট্যান্ডার্ড মজুরি হার: SAR {hourlyRate}/hour (OT: x{otMultiplier})</p>
          </div>
          <div className="text-right text-slate-700">
            <p>মোট কাজের এন্ট্রি: {totalDays} দিন</p>
            <p>হিজরি তারিখ সংকলন: Um Al Qura</p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        
        {/* Sync Status Banner */}
        {syncStatus === 'syncing' && (
          <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30 text-[10.5px] font-mono font-bold uppercase rounded-lg px-3 py-2 mb-4 inline-flex items-center gap-2 print:hidden shadow-sm animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            রিয়েলটাইম ক্লাউড সার্ভার সিঙ্ক হচ্ছে (Cloud Syncing)...
          </div>
        )}

        {/* Offline Pending Items Alert Bar */}
        {!isGuestMode && user && syncQueueCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 rounded-xl p-3.5 mb-4 flex flex-col sm:flex-row justify-between items-center gap-3 animate-fade-in text-xs font-semibold print:hidden shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>
                {lang === 'bn' 
                  ? `আপনার কাছে ${syncQueueCount}টি কাজের হিসাব ফোনে সেভ আছে যা এখনো ক্লাউড ডেটাবেইসে জমা হয়নি।` 
                  : `You have ${syncQueueCount} offline records saved locally that are pending cloud synchronization.`}
              </span>
            </div>
            {isOnline ? (
              <button
                type="button"
                onClick={syncPendingActions}
                disabled={syncStatus === 'syncing'}
                className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-lg leading-none cursor-pointer text-xs flex items-center gap-1.5 transition-all shadow-sm duration-150 active:scale-98"
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>সিঙ্ক হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <span>ক্লাউডে সিঙ্ক করুন</span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-widest font-mono font-bold bg-amber-100/50 dark:bg-amber-955/40 px-2 py-0.5 rounded">
                {lang === 'bn' ? 'অনলাইনে আসলে নিজে থেকেই সিঙ্ক হবে' : 'Will sync automatically when connected'}
              </span>
            )}
          </div>
        )}

        {/* 3. Settings Drawer Component (Collapsible helper) */}
        {showSettings && (
          <div id="settings-panel" className="bg-slate-900 text-slate-100 rounded-2xl p-6 mb-6 shadow-md transition-all animate-fade-in print:hidden">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <Settings className="w-4 h-4" />
                সহজ মজুরি হিসাব সেটিংস (Salary Estimation Settings)
              </h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-xs hover:text-white bg-slate-800 px-2 py-1 rounded"
              >
                বন্ধ করুন
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
              <div>
                <label className="block text-slate-400 mb-1.5">
                  ১. প্রতি ঘন্টার সাধারণ বেতন (SAR hourly rate)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">SAR</span>
                  <input
                    id="setting-hourly-rate"
                    type="number"
                    value={hourlyRate}
                    min="0"
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-12 pr-3 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">এটি দিয়ে মাস শেষে বা নির্দিষ্ট সময়ে মোট বেতনের হিসাব করা যাবে।</p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">
                  ২. ওভারটাইম বেতন মাল্টিপ্লায়ার (OT Rate Multiplier)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">Multiplier</span>
                  <input
                    id="setting-ot-multiplier"
                    type="number"
                    step="0.1"
                    value={otMultiplier}
                    min="1"
                    onChange={(e) => setOtMultiplier(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-20 pr-3 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">যেমন: ১.৫ মানে প্রতি ঘন্টা ওভারটাইমে ১.৫ গুন বেতন পাবেন।</p>
              </div>
            </div>
          </div>
        )}

        {/* 4. Statistics Panel (Bento Grid) */}
        <section className={`grid grid-cols-1 sm:grid-cols-2 ${hideWages ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4 mb-6 print:hidden`}>
          <StatsCard
            id="stat-days"
            title="Total Days Logged"
            titleAr="إجمالي الأيام المسجلة"
            value={lang === 'bn' ? `${totalDays} দিন` : `${totalDays} Days`}
            label={lang === 'bn' ? 'সর্বমোট কাজের দিন' : 'Total Days Registered'}
            icon={Calendar}
            colorClass="bg-sky-50 text-sky-700"
          />
          <StatsCard
            id="stat-hours"
            title="Standard Hours Worked"
            titleAr="ساعات العمل العادية"
            value={lang === 'bn' ? `${totalHours} ঘন্টা` : `${totalHours} Hours`}
            label={lang === 'bn' ? 'মোট সাধারণ কার্যকালীন সময়' : 'Normal Working Duration'}
            icon={Briefcase}
            colorClass="bg-emerald-50 text-emerald-700"
          />
          <StatsCard
            id="stat-ot"
            title="Overtime Hours Logged"
            titleAr="ساعات العمل الإضافية"
            value={lang === 'bn' ? `${totalOvertime} ঘন্টা` : `${totalOvertime} Hours`}
            label={lang === 'bn' ? 'মোট অতিরিক্ত ওভারটাইম' : 'Overtime Hours Saved'}
            icon={Clock}
            colorClass="bg-amber-50 text-amber-700"
          />
          {!hideWages && (
            <StatsCard
              id="stat-wages"
              title="Estimated OT Earnings Only"
              titleAr="الدخل التقديري للموقع المستحق (إضافي)"
              value={`SAR ${totalEstimatedEarnings.toFixed(2)}`}
              label={lang === 'bn' ? 'শুধু ওটি (Overtime) হিসাব ফলাফল' : 'O.T. Wages Calculated Only'}
              icon={TrendingUp}
              colorClass="bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400"
            />
          )}
        </section>

        {/* 5. Main Split View Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 alignment-start">
          
          {/* WorkLog Creation / Edit Form (1 col span) */}
          <div id="work-form-container" className="lg:col-span-1 print:hidden">
            <WorkLogForm
              id="form-add-or-edit"
              onSave={handleSaveLog}
              editingLog={editingLog}
              onCancelEdit={handleCancelEdit}
              lang={lang}
              logs={logs}
            />

            {/* Practical instructions panel */}
            <div id="intro-panel" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              <h3 className="font-bold text-slate-705 dark:text-slate-200 text-xs mb-1.5 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                {lang === 'bn' ? 'হিজরি ক্যালেন্ডার তথ্য ও গাইড' : 'Hijri Calendar Information & Guide (معلومات التقويم الهجري)'}
              </h3>
              <p className="mb-2">
                {lang === 'bn' 
                  ? 'আরবি ক্যালেন্ডারের হিসাবটি সৌদি উম্মুল কুরা (Um al-Qura) সিস্টেম অনুসরণ করে তৈরি করা হয়েছে, যা অফিসিয়াল কাজ এবং কোম্পানিতে শতভাগ অ্যাকুরেট থাকে।'
                  : 'The Arabic calendar classification is developed using the authoritative Saudi Um Al-Qura system, ensuring 100% official alignment for corporate records and attendance registration.'}
              </p>
              <p>
                {lang === 'bn'
                  ? 'ইংরেজি তারিখ নির্বাচনের সাথে সাথে সেই দিনের সঠিক আরবি তারিখটি নিচে শো হবে। কোনো কাজের বিবরণ বাদ পড়লে বা সংশোধন করতে চাইলে নিচের তালিকা থেকে সংশোধন বাটন চেপে আপডেট করে নিতে পারবেন।'
                  : 'As soon as a Western date is chosen, the system automatically computes and reflects the corresponding Hijri date. Select "Edit" on any historical item below to make modifications.'}
              </p>
            </div>
          </div>

          {/* WorkLog History List & Printable Table (2 cols span) */}
          <div className="lg:col-span-2">
            <WorkLogTable
              id="work-log-results-table"
              logs={logs}
              onEdit={handleStartEdit}
              onDelete={handleDeleteLog}
              hourlyRate={hourlyRate}
              otMultiplier={otMultiplier}
              lang={lang}
              hideWages={hideWages}
            />
          </div>

        </div>

      </main>

      {/* Footer bar */}
      <footer className="mt-20 border-t border-slate-200 dark:border-slate-800 py-8 bg-white/70 dark:bg-slate-900/40 print:hidden relative z-10 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-3">
          <TamdeenLogo showText={true} textColorClass="text-slate-500 dark:text-slate-400 font-bold" iconSize={26} className="opacity-70" centerTextAlign={true} />
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-sans mt-2 tracking-wide leading-relaxed">
            <p>© 2026 Al Tamdin Al Watania Work Log System • All Rights Reserved</p>
            <p className="mt-1">Developed with zero-trust Firestore cloud architecture. Authorized self use only.</p>
          </div>
        </div>
      </footer>

      {/* 6. Digital ID Card Badge Modal Overlay */}
      <IdCard 
        id="digital-worker-idcard"
        isOpen={showIdCard}
        onClose={() => setShowIdCard(false)}
        lang={lang}
      />

    </div>
  );
}
