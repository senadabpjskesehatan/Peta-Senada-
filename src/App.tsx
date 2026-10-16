import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  MapPin,
  Clock,
  BarChart3,
  PlusCircle,
  FileSpreadsheet,
  Globe,
  RefreshCw,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  HelpCircle,
  FileText,
  Info,
  Database,
  Share2,
  ChevronUp,
  ChevronDown,
  Lock,
  Unlock,
  Shield,
  ShieldAlert,
  UserCheck,
  LogOut,
  LogIn,
  Filter,
  Calendar,
  Landmark,
  Building2,
  RotateCcw,
  Hash,
  Table2,
  Users,
  KeyRound
} from 'lucide-react';

import { CityData, Ticket, MonthlyPerformance, DynamicChart, MapSyncConfig, FilterReference, AppUser, UnitUtilizationSummary, UserActivityLog } from './types';
import SearchableFilterSelect from './components/SearchableFilterSelect';
import { computeFilterOptions } from './utils/filterOptions';
import { DEFAULT_CITIES, DEFAULT_TICKETS, MONTHLY_PERFORMANCE, DEFAULT_CHARTS, SAMPLE_SHEETS_CSV, findCityCoordinates, getKepwilForCity } from './data/defaultData';
import { parseNumericValue, fetchSheetData, parseCSV } from './utils/sheetParser';
import { isBulanMatching, isKepwilMatching, isKantorCabangMatching, parseMonthValue, parseFilterValueList } from './utils/monthHelper';
import { extractTopikAndPokokFromRow } from './data/topikMasalahReference';
import SuperMindSenada from './components/SuperMindSenada';
import UserUtilizationAnalytics from './components/UserUtilizationAnalytics';
import { getUserDefaultFilters, getUserDefaultScopeLabel, getUserOfficeOrWilayahLabel } from './utils/userFilterHelper';
import {
  recordUserLogin,
  recordMenuUsage,
  subscribeToUserActivity,
  getUtilizationSummaries,
  getRecentActivityLogs,
} from './lib/activityTracker';
import {
  subscribeToAppSettings,
  subscribeToMapData,
  subscribeToDynamicCharts,
  saveAppSettingsToCloud,
  saveMapDataToCloud,
  saveDynamicChartsToCloud,
  subscribeToUsers,
  saveUsersToCloud,
  DEFAULT_USERS
} from './lib/firebase';

// Component Imports
import IndonesiaMap from './components/IndonesiaMap';
import SlaTracker from './components/SlaTracker';
import MonthlyAnalytics from './components/MonthlyAnalytics';
import DynamicChartItem from './components/DynamicChartItem';
import AdminLoginModal from './components/AdminLoginModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import InitialLoginPage from './components/InitialLoginPage';
import ReferenceManager from './components/ReferenceManager';
import LaporanRekapTable from './components/LaporanRekapTable';
import ReportingPivotTable from './components/ReportingPivotTable';
import UserManagement from './components/UserManagement';
import { SenadaLogo } from './components/SenadaLogo';

const CITIES_STORAGE_KEY = 'indonesia_map_cities_data_v3';
const SYNCED_DEFAULT_CITIES_KEY = 'indonesia_map_synced_default_cities';
const CHARTS_STORAGE_KEY = 'indonesia_map_dynamic_charts_v3';

function safeSaveCitiesToLocalStorage(cities: CityData[]) {
  try {
    // Remove duplicate legacy key to free 50% of localStorage space immediately
    localStorage.removeItem(SYNCED_DEFAULT_CITIES_KEY);
    const fullJson = JSON.stringify(cities);
    if (fullJson.length <= 1500000) {
      localStorage.setItem(CITIES_STORAGE_KEY, fullJson);
      return;
    }
  } catch (e) {
    // Quota exceeded on full payload, fall through to compact payload
  }

  try {
    localStorage.removeItem(SYNCED_DEFAULT_CITIES_KEY);
    localStorage.removeItem('senada_reporting_pivot_tabs_v2');
    const compactCities = cities.map(({ rawRow, ...rest }) => rest);
    localStorage.setItem(CITIES_STORAGE_KEY, JSON.stringify(compactCities));
  } catch (e) {
    // Ignore storage quota error; in-memory state and Firestore hold the data
  }
}

function safeSaveChartsToLocalStorage(charts: DynamicChart[]) {
  try {
    const fullJson = JSON.stringify(charts);
    if (fullJson.length <= 800000) {
      localStorage.setItem(CHARTS_STORAGE_KEY, fullJson);
      return;
    }
  } catch (e) {
    // Fall through to compact charts without heavy syncedData
  }

  try {
    const compactCharts = charts.map(({ syncedData, ...rest }) => rest);
    localStorage.setItem(CHARTS_STORAGE_KEY, JSON.stringify(compactCharts));
  } catch (e) {
    // Ignore storage quota error
  }
}

export default function App() {
  // Global Unified States initialized with localStorage persistence (prioritizing synced default data from Google Sheet with verified coordinates)
  const [citiesData, setCitiesData] = useState<CityData[]>(() => {
    try {
      const syncedDefault = localStorage.getItem(SYNCED_DEFAULT_CITIES_KEY);
      if (syncedDefault) {
        const parsed = JSON.parse(syncedDefault);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(c => {
            const resolved = findCityCoordinates(c.name);
            return {
              ...c,
              latitude: resolved ? resolved.lat : (c.latitude || -6.2088),
              longitude: resolved ? resolved.lon : (c.longitude || 106.8456)
            };
          });
        }
      }
      const saved = localStorage.getItem(CITIES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(c => {
            const resolved = findCityCoordinates(c.name);
            return {
              ...c,
              latitude: resolved ? resolved.lat : (c.latitude || -6.2088),
              longitude: resolved ? resolved.lon : (c.longitude || 106.8456)
            };
          });
        }
      }
    } catch (e) {
      console.error('Failed to load saved cities data', e);
    }
    return DEFAULT_CITIES;
  });

  const [ticketsData, setTicketsData] = useState<Ticket[]>(DEFAULT_TICKETS);
  const [monthlyData, setMonthlyData] = useState<MonthlyPerformance[]>(MONTHLY_PERFORMANCE);
  const [dynamicCharts, setDynamicCharts] = useState<DynamicChart[]>(() => {
    try {
      const savedCharts = localStorage.getItem(CHARTS_STORAGE_KEY);
      if (savedCharts) {
        const parsed = JSON.parse(savedCharts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(ch => ({
            ...ch,
            source: ch.source || 'default',
            xAxisColumns: ch.xAxisColumns || (ch.xAxisColumn ? [ch.xAxisColumn] : ['name']),
            xAxisColumn: ch.xAxisColumn || 'name',
            yAxisColumns: ch.yAxisColumns && ch.yAxisColumns.length > 0 ? ch.yAxisColumns : ['informasi', 'permintaan', 'pengaduan'],
            pieColumns: ch.pieColumns && ch.pieColumns.length > 0 ? ch.pieColumns : ['informasi', 'permintaan', 'pengaduan'],
            isSynced: true
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load saved charts', e);
    }
    return DEFAULT_CHARTS;
  });
  const [mapSyncConfig, setMapSyncConfig] = useState<MapSyncConfig>(() => {
    try {
      const saved = localStorage.getItem('map_sync_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      sheetUrl: localStorage.getItem('google_sheet_sync_url') || '',
      sheetId: '',
      cityColumn: '',
      informasiColumn: '',
      permintaanColumn: '',
      pengaduanColumn: '',
      slaColumn: '',
      isSynced: false,
    };
  });

  const [activeMainTab, setActiveMainTab] = useState<'map' | 'tickets' | 'analytics' | 'custom-charts' | 'sms' | 'reporting' | 'users' | 'pemanfaatan'>('map');
  const [activitySummaries, setActivitySummaries] = useState<UnitUtilizationSummary[]>(() => getUtilizationSummaries());
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>(() => getRecentActivityLogs());

  useEffect(() => {
    const unsub = subscribeToUserActivity((data) => {
      setActivitySummaries(data.summaries);
      setActivityLogs(data.logs);
    });
    return () => unsub();
  }, []);

  const [isGlobalFilterExpanded, setIsGlobalFilterExpanded] = useState<boolean>(false);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState<string | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [volumeThresholds, setVolumeThresholds] = useState({
    rendahMax: 500,
    sedangMax: 2500,
    tinggiMax: 5000,
  });

  // User Management State (Persisted in localStorage and synchronized with Cloud Firestore)
  const [usersData, setUsersData] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem('senada_users_list_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 20) return parsed;
      }
    } catch (e) {}
    try {
      localStorage.setItem('senada_users_list_v2', JSON.stringify(DEFAULT_USERS));
    } catch (e) {}
    return DEFAULT_USERS;
  });

  const handleUsersChange = (newUsers: AppUser[]) => {
    setUsersData(newUsers);
    try {
      localStorage.setItem('senada_users_list_v2', JSON.stringify(newUsers));
    } catch (e) {}
    saveUsersToCloud(newUsers);
  };

  // Current logged in user info (stored in sessionStorage so closing the tab/window logs out)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('app_current_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    if (sessionStorage.getItem('is_admin_logged_in') === 'true') {
      return {
        id: 'user_admin_senada',
        username: 'senada',
        role: 'admin',
        status: 'aktif',
        password: '150bisa'
      };
    }
    return null;
  });

  // Application Login State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('app_is_logged_in') === 'true';
  });

  // Authentication & Guest / Admin Mode state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('is_admin_logged_in') === 'true';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Idle timeout (30 minutes) & session management
  useEffect(() => {
    if (!isLoggedIn) return;

    if (!sessionStorage.getItem('session_last_activity')) {
      sessionStorage.setItem('session_last_activity', Date.now().toString());
    }

    const updateActivity = () => {
      sessionStorage.setItem('session_last_activity', Date.now().toString());
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll', 'click'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    const checkInterval = setInterval(() => {
      const lastAct = sessionStorage.getItem('session_last_activity');
      if (lastAct) {
        const elapsed = Date.now() - parseInt(lastAct, 10);
        const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
        if (elapsed > TIMEOUT_MS) {
          handleAppLogout();
          setSyncStatusToast('Sesi Anda telah berakhir karena tidak ada aktivitas selama 30 menit. Silakan login kembali.');
          setTimeout(() => setSyncStatusToast(null), 6000);
        }
      }
    }, 15000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(checkInterval);
    };
  }, [isLoggedIn]);

  // 3 Filter Dropdown States (Bulan, KEPWIL, Kantor Cabang - supports multi-select checklist)
  const [selectedBulan, setSelectedBulan] = useState<string | string[]>('Semua');
  const [selectedKepwil, setSelectedKepwil] = useState<string | string[]>('Semua');
  const [selectedKantorCabang, setSelectedKantorCabang] = useState<string | string[]>('Semua');
  const hasInitializedUserDefault = useRef(false);

  // Enforce access control for User Kepwil & Kantor Cabang (allowed 'map', 'custom-charts' (OVERVIEW), 'sms', and 'pemanfaatan')
  useEffect(() => {
    if (isLoggedIn && !isAdmin && activeMainTab !== 'map' && activeMainTab !== 'custom-charts' && activeMainTab !== 'sms' && activeMainTab !== 'pemanfaatan') {
      setActiveMainTab('map');
    }
  }, [isLoggedIn, isAdmin, activeMainTab]);

  // Track menu utilization when user switches tabs
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      recordMenuUsage(currentUser, activeMainTab);
    }
  }, [activeMainTab, isLoggedIn, currentUser]);

  const handleAppLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    const isAdm = user.role === 'admin';
    setIsAdmin(isAdm);
    sessionStorage.setItem('app_is_logged_in', 'true');
    sessionStorage.setItem('is_admin_logged_in', isAdm ? 'true' : 'false');
    sessionStorage.setItem('app_current_user', JSON.stringify(user));
    sessionStorage.setItem('session_last_activity', Date.now().toString());

    // Clean up any old localStorage login keys
    localStorage.removeItem('app_is_logged_in');
    localStorage.removeItem('is_admin_logged_in');
    localStorage.removeItem('app_current_user');

    // Record login activity in tracker
    recordUserLogin(user);

    // Resolve full filter options to apply default data based on user role (Kepwil or Kantor Cabang)
    const allOpts = computeFilterOptions(citiesData, [], mapSyncConfig, 'Semua', 'Semua');
    const defaultFilters = getUserDefaultFilters(
      user,
      allOpts.availableKepwilList,
      allOpts.availableKantorCabangList,
      citiesData
    );
    setSelectedBulan('Semua');
    setSelectedKepwil(defaultFilters.kepwil);
    setSelectedKantorCabang(defaultFilters.kantorCabang);
    hasInitializedUserDefault.current = true;

    if (isAdm) {
      setSyncStatusToast(`Berhasil Login sebagai Administrator (${user.username}) - Data Nasional`);
    } else if (user.role === 'kepwil') {
      setSyncStatusToast(`Berhasil Login sebagai User Kepwil (${user.username}) - Menampilkan Data Default: ${user.displayName || user.username}`);
    } else {
      setSyncStatusToast(`Berhasil Login sebagai User Kantor Cabang (${user.username}) - Menampilkan Data Default: ${user.displayName || user.username}`);
    }

    if (!isAdm && activeMainTab !== 'map' && activeMainTab !== 'custom-charts' && activeMainTab !== 'sms' && activeMainTab !== 'pemanfaatan') {
      setActiveMainTab('map');
    }
    setTimeout(() => setSyncStatusToast(null), 4000);
  };

  const handleAppLogout = () => {
    hasInitializedUserDefault.current = false;
    setIsLoggedIn(false);
    setIsAdmin(false);
    setCurrentUser(null);
    setSelectedBulan('Semua');
    setSelectedKepwil('Semua');
    setSelectedKantorCabang('Semua');
    sessionStorage.removeItem('app_is_logged_in');
    sessionStorage.removeItem('is_admin_logged_in');
    sessionStorage.removeItem('app_current_user');
    sessionStorage.removeItem('session_last_activity');
    localStorage.removeItem('app_is_logged_in');
    localStorage.removeItem('is_admin_logged_in');
    localStorage.removeItem('app_current_user');
    setSyncStatusToast('Anda telah keluar dari aplikasi');
    setTimeout(() => setSyncStatusToast(null), 3000);
  };

  const handleAdminLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    setIsAdmin(true);
    setSelectedBulan('Semua');
    setSelectedKepwil('Semua');
    setSelectedKantorCabang('Semua');
    sessionStorage.setItem('is_admin_logged_in', 'true');
    sessionStorage.setItem('app_current_user', JSON.stringify(user));
    sessionStorage.setItem('session_last_activity', Date.now().toString());
    // Record admin login in tracker
    recordUserLogin(user);
    setSyncStatusToast(`Berhasil Login sebagai Administrator (${user.username}) - Data Nasional`);
    setTimeout(() => setSyncStatusToast(null), 3000);
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('is_admin_logged_in');
    setSyncStatusToast('Beralih ke Mode Pengguna');
    setTimeout(() => setSyncStatusToast(null), 3000);
  };

  // User Account Dropdown Menu & Self Reset Password state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);

  // Close user dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleSelfPasswordResetSuccess = (newPassword: string) => {
    if (!currentUser) return;

    const updatedUser: AppUser = {
      ...currentUser,
      password: newPassword,
      updatedAt: new Date().toISOString(),
    };

    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('app_current_user', JSON.stringify(updatedUser));
    } catch (e) {}

    // Update inside usersData state
    const updatedUsers = usersData.map(u => 
      u.id === currentUser.id || u.username.toLowerCase() === currentUser.username.toLowerCase()
        ? { ...u, password: newPassword, updatedAt: new Date().toISOString() }
        : u
    );

    handleUsersChange(updatedUsers);
    setIsResetPasswordModalOpen(false);
    setSyncStatusToast(`Password akun "${currentUser.username}" berhasil dirubah!`);
    setTimeout(() => setSyncStatusToast(null), 4000);
  };

  // Real-time Firestore Subscriptions for Multi-Device and Guest Synchronization
  useEffect(() => {
    // 1. Subscribe to Map Data from Cloud Firestore
    const unsubMap = subscribeToMapData((cloudMap) => {
      if (cloudMap) {
        setIsCloudConnected(true);
        if (cloudMap.syncConfig) {
          setMapSyncConfig(cloudMap.syncConfig);
          if (cloudMap.syncConfig.sheetUrl) {
            setGoogleSheetUrl(cloudMap.syncConfig.sheetUrl);
            try {
              localStorage.setItem('google_sheet_sync_url', cloudMap.syncConfig.sheetUrl);
            } catch (e) {}
          }
          try {
            localStorage.setItem('map_sync_config', JSON.stringify(cloudMap.syncConfig));
          } catch (e) {}
        }
        if (cloudMap.cities && Array.isArray(cloudMap.cities) && cloudMap.cities.length > 0) {
          const mapped = cloudMap.cities.map(c => {
            const resolved = findCityCoordinates(c.name);
            return {
              ...c,
              latitude: resolved ? resolved.lat : (c.latitude || -6.2088),
              longitude: resolved ? resolved.lon : (c.longitude || 106.8456)
            };
          });
          setCitiesData(mapped);
          safeSaveCitiesToLocalStorage(mapped);
          try {
            localStorage.setItem('has_synced_custom_data', 'true');
          } catch (e) {}
        }
      }
    });

    // 2. Subscribe to Dynamic Custom Charts from Cloud Firestore
    const unsubCharts = subscribeToDynamicCharts((cloudCharts) => {
      if (cloudCharts && Array.isArray(cloudCharts) && cloudCharts.length > 0) {
        setIsCloudConnected(true);
        const mapped = cloudCharts.map(ch => ({
          ...ch,
          source: ch.source || 'default',
          xAxisColumns: ch.xAxisColumns || (ch.xAxisColumn ? [ch.xAxisColumn] : ['name']),
          xAxisColumn: ch.xAxisColumn || 'name',
          yAxisColumns: ch.yAxisColumns && ch.yAxisColumns.length > 0 ? ch.yAxisColumns : ['informasi', 'permintaan', 'pengaduan'],
          pieColumns: ch.pieColumns && ch.pieColumns.length > 0 ? ch.pieColumns : ['informasi', 'permintaan', 'pengaduan'],
          isSynced: true
        }));
        setDynamicCharts(mapped);
        safeSaveChartsToLocalStorage(mapped);
      }
    });

    // 3. Subscribe to Global App Settings from Cloud Firestore
    const unsubSettings = subscribeToAppSettings((cloudSettings) => {
      if (cloudSettings) {
        setIsCloudConnected(true);
        if (cloudSettings.navOrder && Array.isArray(cloudSettings.navOrder)) {
          const filtered = cloudSettings.navOrder.filter((k: string) => k !== 'analytics' && k !== 'tickets' && k !== 'referensi' && k !== 'laporan' && k !== 'reporting');
          if (!filtered.includes('sms')) {
            filtered.push('sms');
          }
          if (filtered.length > 0) setNavOrder(filtered);
        }
        if (cloudSettings.syncInterval) {
          setSyncInterval(cloudSettings.syncInterval as any);
        }
        if (cloudSettings.lastSyncedAt) {
          setLastSyncedAt(cloudSettings.lastSyncedAt);
        }
        if (cloudSettings.volumeThresholds && (cloudSettings.volumeThresholds as any).rendahMax) {
          setVolumeThresholds(cloudSettings.volumeThresholds as any);
        }
      }
    });

    // 4. Subscribe to User Management Accounts from Cloud Firestore
    const unsubUsers = subscribeToUsers((cloudUsers) => {
      if (cloudUsers && Array.isArray(cloudUsers) && cloudUsers.length > 20) {
        setUsersData(cloudUsers);
        try {
          localStorage.setItem('senada_users_list_v2', JSON.stringify(cloudUsers));
        } catch (e) {}
      } else {
        // Automatically push all reference users to cloud if not already synced
        saveUsersToCloud(DEFAULT_USERS);
      }
    });

    return () => {
      unsubMap();
      unsubCharts();
      unsubSettings();
      unsubUsers();
    };
  }, []);

  // Save cities data to localStorage whenever updated
  useEffect(() => {
    safeSaveCitiesToLocalStorage(citiesData);
  }, [citiesData]);

  // Save dynamic charts to localStorage whenever updated
  useEffect(() => {
    safeSaveChartsToLocalStorage(dynamicCharts);
  }, [dynamicCharts]);


  // Filtered dataset for global metrics calculation according to active dropdown filters
  const filteredCitiesForMetrics = useMemo(() => {
    return citiesData.filter(c => {
      let rowBulan = (c.bulan || '').trim();
      if (!rowBulan && c.rawRow) {
        if (mapSyncConfig.bulanColumn && c.rawRow[mapSyncConfig.bulanColumn]) {
          rowBulan = String(c.rawRow[mapSyncConfig.bulanColumn]).trim();
        }
        if (!rowBulan) {
          for (const [k, v] of Object.entries(c.rawRow)) {
            if (/bulan|month|periode|bln/i.test(k.trim())) {
              rowBulan = String(v || '').trim();
              if (rowBulan) break;
            }
          }
        }
      }

      let rowKepwil = '';
      if (c.rawRow) {
        if (mapSyncConfig.kepwilColumn && c.rawRow[mapSyncConfig.kepwilColumn] !== undefined) {
          rowKepwil = String(c.rawRow[mapSyncConfig.kepwilColumn]).trim();
        }
        if (!rowKepwil) {
          for (const [k, v] of Object.entries(c.rawRow)) {
            if (/^kepwil$/i.test(k.trim())) {
              rowKepwil = String(v || '').trim();
              if (rowKepwil) break;
            }
          }
        }
        if (!rowKepwil) {
          for (const [k, v] of Object.entries(c.rawRow)) {
            if (/kepwil|kedeputian.*wilayah|kantor.*wilayah|wilayah|kanwil|regional/i.test(k.trim())) {
              rowKepwil = String(v || '').trim();
              if (rowKepwil) break;
            }
          }
        }
      }
      if (!rowKepwil) rowKepwil = (c.kepwil || '').trim();
      if (!rowKepwil && !mapSyncConfig.kepwilColumn) rowKepwil = getKepwilForCity(c.kantorCabang || c.name || '');

      let rowKC = '';
      if (c.rawRow) {
        if (mapSyncConfig.cityColumn && c.rawRow[mapSyncConfig.cityColumn] !== undefined) {
          rowKC = String(c.rawRow[mapSyncConfig.cityColumn]).trim();
        }
        if (!rowKC) {
          for (const [k, v] of Object.entries(c.rawRow)) {
            if (/^kantor cabang$|^kc$/i.test(k.trim())) {
              rowKC = String(v || '').trim();
              if (rowKC) break;
            }
          }
        }
        if (!rowKC) {
          for (const [k, v] of Object.entries(c.rawRow)) {
            if (/kantor.*cabang|kc|cabang|kota|city|lokasi|daerah/i.test(k.trim())) {
              rowKC = String(v || '').trim();
              if (rowKC) break;
            }
          }
        }
      }
      if (!rowKC) rowKC = (c.kantorCabang || '').trim();
      if (!rowKC) rowKC = (c.name || '').trim();

      if (selectedBulan !== 'Semua' && !isBulanMatching(rowBulan, selectedBulan)) {
        return false;
      }
      if (selectedKepwil !== 'Semua' && !isKepwilMatching(rowKepwil, selectedKepwil)) {
        return false;
      }
      if (selectedKantorCabang !== 'Semua' && !isKantorCabangMatching(rowKC, selectedKantorCabang)) {
        return false;
      }
      return true;
    });
  }, [citiesData, selectedBulan, selectedKepwil, selectedKantorCabang, mapSyncConfig]);

  const { availableBulanList, availableKepwilList, availableKantorCabangList, groupedKantorCabang } = useMemo(() => {
    return computeFilterOptions(citiesData, [], mapSyncConfig, selectedBulan, selectedKepwil);
  }, [citiesData, mapSyncConfig, selectedBulan, selectedKepwil]);

  // Complete list of all Kepwil and Kantor Cabang across the dataset (unconstrained by current filter selection)
  const { allAvailableKepwilList, allAvailableKantorCabangList } = useMemo(() => {
    const opts = computeFilterOptions(citiesData, [], mapSyncConfig, 'Semua', 'Semua');
    return {
      allAvailableKepwilList: opts.availableKepwilList,
      allAvailableKantorCabangList: opts.availableKantorCabangList
    };
  }, [citiesData, mapSyncConfig]);

  // Synchronize initial default filters for logged-in Kepwil or Kantor Cabang user on initial session restore
  useEffect(() => {
    if (isLoggedIn && currentUser && currentUser.role !== 'admin' && !hasInitializedUserDefault.current) {
      if (allAvailableKepwilList.length > 0 || allAvailableKantorCabangList.length > 0 || citiesData.length > 0) {
        const defaults = getUserDefaultFilters(
          currentUser,
          allAvailableKepwilList,
          allAvailableKantorCabangList,
          citiesData
        );
        setSelectedKepwil(defaults.kepwil);
        setSelectedKantorCabang(defaults.kantorCabang);
        hasInitializedUserDefault.current = true;
      }
    }
  }, [isLoggedIn, currentUser, allAvailableKepwilList, allAvailableKantorCabangList, citiesData]);

  const handleResetToUserDefault = () => {
    if (currentUser && currentUser.role !== 'admin') {
      const defaults = getUserDefaultFilters(
        currentUser,
        allAvailableKepwilList,
        allAvailableKantorCabangList,
        citiesData
      );
      setSelectedBulan('Semua');
      setSelectedKepwil(defaults.kepwil);
      setSelectedKantorCabang(defaults.kantorCabang);
      setSyncStatusToast(`Filter dikembalikan ke data default: ${getUserDefaultScopeLabel(currentUser)}`);
      setTimeout(() => setSyncStatusToast(null), 3500);
    } else {
      setSelectedBulan('Semua');
      setSelectedKepwil('Semua');
      setSelectedKantorCabang('Semua');
    }
  };

  // Global aggregate metrics computed on the fly from current Excel / Sheet cities data
  const summaryMetrics = useMemo(() => {
    let totalInformasi = 0;
    let totalPermintaan = 0;
    let totalPengaduan = 0;
    let totalTiket = 0;

    filteredCitiesForMetrics.forEach(c => {
      let infoVal = parseNumericValue(c.informasi);
      let permVal = parseNumericValue(c.permintaan);
      let pengVal = parseNumericValue(c.pengaduan);

      if (infoVal === 0 && permVal === 0 && pengVal === 0 && c.rawRow) {
        const extracted = extractTopikAndPokokFromRow(c.rawRow, parseNumericValue);
        if (extracted.hasMatchedTopik) {
          infoVal = extracted.byKategori.Informasi;
          permVal = extracted.byKategori.Permintaan;
          pengVal = extracted.byKategori.Pengaduan;
        }
      }

      totalInformasi += Math.round(Number(infoVal));
      totalPermintaan += Math.round(Number(permVal));
      totalPengaduan += Math.round(Number(pengVal));

      const cityTotal = parseNumericValue(c.total) > 0 ? parseNumericValue(c.total) : (infoVal + permVal + pengVal);
      totalTiket += Math.round(Number(cityTotal));
    });

    const breakdownSum = totalInformasi + totalPermintaan + totalPengaduan;
    const finalTotalTiket = Math.max(totalTiket, breakdownSum);

    const pctInformasi = finalTotalTiket > 0 ? Math.round((totalInformasi / finalTotalTiket) * 100) : 0;
    const pctPermintaan = finalTotalTiket > 0 ? Math.round((totalPermintaan / finalTotalTiket) * 100) : 0;
    const pctPengaduan = finalTotalTiket > 0 ? Math.round((totalPengaduan / finalTotalTiket) * 100) : 0;

    return {
      totalTiket: finalTotalTiket,
      totalInformasi,
      pctInformasi,
      totalPermintaan,
      pctPermintaan,
      totalPengaduan,
      pctPengaduan
    };
  }, [filteredCitiesForMetrics]);

  // Handler to modify/update cities from map component (Google Sheets mapping / Excel upload)
  const handleCitiesDataChange = (updatedCities: CityData[], updatedConfig?: MapSyncConfig) => {
    setCitiesData(updatedCities);
    safeSaveCitiesToLocalStorage(updatedCities);
    try {
      localStorage.setItem('has_synced_custom_data', 'true');
    } catch (e) {}
    
    if (updatedConfig) {
      setMapSyncConfig(updatedConfig);
      try {
        localStorage.setItem('map_sync_config', JSON.stringify(updatedConfig));
      } catch (e) {}
      saveMapDataToCloud(updatedCities, updatedConfig, true);
    } else {
      saveMapDataToCloud(updatedCities, mapSyncConfig, true);
    }
  };

  // Add a new dynamic custom chart
  const handleAddNewChart = () => {
    const chartId = `chart_${Date.now()}`;
    const newChart: DynamicChart = {
      id: chartId,
      title: `Grafik Kustom #${dynamicCharts.length + 1}`,
      type: 'bar',
      source: 'default',
      sheetUrl: '',
      sheetId: '',
      xAxisColumn: 'name',
      xAxisColumns: ['name'],
      yAxisColumns: ['informasi', 'permintaan', 'pengaduan'],
      pieColumns: ['informasi', 'permintaan', 'pengaduan'],
      isSynced: true,
    };
    const updatedCharts = [...dynamicCharts, newChart];
    setDynamicCharts(updatedCharts);
    saveDynamicChartsToCloud(updatedCharts);
    setActiveMainTab('custom-charts');
  };

  // Update specific custom chart
  const handleUpdateChart = (chartId: string, updatedFields: Partial<DynamicChart>) => {
    const updatedCharts = dynamicCharts.map(c => (c.id === chartId ? { ...c, ...updatedFields } : c));
    setDynamicCharts(updatedCharts);
    saveDynamicChartsToCloud(updatedCharts);
  };

  // Delete custom chart
  const handleDeleteChart = (chartId: string) => {
    const updatedCharts = dynamicCharts.filter(c => c.id !== chartId);
    setDynamicCharts(updatedCharts);
    saveDynamicChartsToCloud(updatedCharts);
  };

  // Toggle data numbers/labels across all custom charts
  const handleToggleAllDataLabels = () => {
    const allShown = dynamicCharts.length > 0 && dynamicCharts.every(c => (c.dataLabelMode || (c.showDataLabels ? 'value' : 'none')) !== 'none');
    const nextMode = allShown ? 'none' : 'value';
    const updatedCharts = dynamicCharts.map(c => ({
      ...c,
      dataLabelMode: nextMode as any,
      showDataLabels: nextMode !== 'none'
    }));
    setDynamicCharts(updatedCharts);
    saveDynamicChartsToCloud(updatedCharts);
  };

  // Navigation order state for moveable/draggable nav items
  const [navOrder, setNavOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('sidebar_nav_order');
    const defaultOrder = ['map', 'custom-charts', 'sms'];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const filtered = parsed.filter((key: string) => key !== 'analytics' && key !== 'tickets' && key !== 'referensi' && key !== 'laporan' && key !== 'reporting');
        if (!filtered.includes('sms')) {
          filtered.push('sms');
        }
        return filtered.length > 0 ? filtered : defaultOrder;
      } catch (e) {
        console.error('Failed to parse sidebar nav order', e);
      }
    }
    return defaultOrder;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_nav_order', JSON.stringify(navOrder));
  }, [navOrder]);

  const moveNavItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...navOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setNavOrder(newOrder);
    saveAppSettingsToCloud({ navOrder: newOrder });
  };

  const [filterReferences, setFilterReferences] = useState<FilterReference[]>(() => {
    const saved = localStorage.getItem('indonesia_map_filter_references');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: 'ref_bulan', name: 'Bulan', description: 'Referensi bulan untuk filter.', columnName: 'BULAN', isDynamic: true, manualItems: [] },
      { id: 'ref_kepwil', name: 'KEPWIL', description: 'Kantor wilayah.', columnName: 'KEPWIL', isDynamic: true, manualItems: [] },
      { id: 'ref_kc', name: 'Kantor Cabang', description: 'Cabang pada wilayah tertentu.', columnName: 'KANTOR CABANG', isDynamic: true, manualItems: [] }
    ];
  });

  useEffect(() => {
    localStorage.setItem('indonesia_map_filter_references', JSON.stringify(filterReferences));
  }, [filterReferences]);

  // Keep filterReferences column names automatically synchronized with mapSyncConfig
  useEffect(() => {
    if (mapSyncConfig && mapSyncConfig.isSynced) {
      setFilterReferences(prev => {
        let changed = false;
        const updated = prev.map(ref => {
          if ((ref.id === 'ref_kepwil' || /kepwil/i.test(ref.name)) && mapSyncConfig.kepwilColumn && ref.columnName !== mapSyncConfig.kepwilColumn) {
            changed = true;
            return { ...ref, columnName: mapSyncConfig.kepwilColumn };
          }
          if ((ref.id === 'ref_bulan' || /bulan/i.test(ref.name)) && mapSyncConfig.bulanColumn && ref.columnName !== mapSyncConfig.bulanColumn) {
            changed = true;
            return { ...ref, columnName: mapSyncConfig.bulanColumn };
          }
          if ((ref.id === 'ref_kc' || /kantor\s*cabang|kc/i.test(ref.name)) && mapSyncConfig.cityColumn && ref.columnName !== mapSyncConfig.cityColumn) {
            changed = true;
            return { ...ref, columnName: mapSyncConfig.cityColumn };
          }
          return ref;
        });
        return changed ? updated : prev;
      });
    }
  }, [mapSyncConfig?.isSynced, mapSyncConfig?.kepwilColumn, mapSyncConfig?.bulanColumn, mapSyncConfig?.cityColumn]);

  // Google Sheet Auto-Sync & Interval States
  const [syncInterval, setSyncInterval] = useState<'manual' | '15m' | '30m' | '1h' | '1d'>(() => {
    return (localStorage.getItem('google_sheet_sync_interval') as any) || 'manual';
  });
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(() => {
    return localStorage.getItem('google_sheet_sync_url') || '';
  });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return localStorage.getItem('google_sheet_last_synced') || null;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncStatusToast, setSyncStatusToast] = useState<string | null>(null);

  // Persist sync interval & URL options
  useEffect(() => {
    localStorage.setItem('google_sheet_sync_interval', syncInterval);
    if (isAdmin) {
      saveAppSettingsToCloud({ syncInterval });
    }
  }, [syncInterval]);

  useEffect(() => {
    if (googleSheetUrl) {
      localStorage.setItem('google_sheet_sync_url', googleSheetUrl);
    }
  }, [googleSheetUrl]);

  // Core Sync Execution Engine for Google Sheet & Feed
  const handleExecuteSync = async (overrideUrl?: string) => {
    const storedUrl = localStorage.getItem('google_sheet_sync_url') || '';
    const targetUrl = overrideUrl !== undefined ? overrideUrl : (googleSheetUrl || mapSyncConfig?.sheetUrl || storedUrl);
    
    // If no target URL provided: NEVER reset to sample/dummy data.
    // Retain current custom / synced data completely.
    if (!targetUrl || !targetUrl.trim()) {
      setSyncStatusToast('Tidak ada link Google Sheet aktif. Data tersimpan di Cloud dipertahankan.');
      setTimeout(() => setSyncStatusToast(null), 3000);
      return;
    }

    setIsRefreshing(true);

    try {
      const activeSheetId = mapSyncConfig?.sheetId || undefined;
      const { data, columns } = await fetchSheetData(targetUrl, activeSheetId);
      if (data && data.length > 0) {
        const findColumnByPriority = (priorities: RegExp[]): string => {
          for (const regex of priorities) {
            const found = columns.find(c => regex.test(c.trim()));
            if (found) return found;
          }
          return '';
        };

        const matchedBulan = mapSyncConfig.bulanColumn || findColumnByPriority([
          /^(bulan|month|periode|bln)$/i,
          /^(bulan|month|periode|bln|tanggal|tgl|waktu|date)/i,
          /(bulan|month|periode|bln)/i
        ]);

        const matchedKepwil = mapSyncConfig.kepwilColumn || findColumnByPriority([
          /^(kepwil|kedeputian\s*wilayah|kantor\s*wilayah|kanwil|regional)$/i,
          /(kepwil|kedeputian\s*wilayah|kantor\s*wilayah|kanwil|regional)/i,
          /^(wilayah)$/i,
          /(wilayah)/i
        ]);

        const matchedKC = mapSyncConfig.cityColumn || findColumnByPriority([
          /^(nama\s*)?(kantor\s*cabang|kc)$/i,
          /(kantor\s*cabang|kc\b|nama\s*kc|nama\s*cabang)/i,
          /^(cabang|nama\s*kantor)$/i,
          /^(kota|kabupaten|nama\s*kota|nama\s*kabupaten|daerah|lokasi)$/i,
          /(cabang|kota|kabupaten|lokasi)/i
        ]) || columns.find(c => c !== matchedBulan && c !== matchedKepwil && !/no|nomor|id|total|jumlah|sla/i.test(c)) || columns[0] || '';

        const matchedInfo = mapSyncConfig.informasiColumn || findColumnByPriority([
          /^(layanan\s*informasi|informasi|pemberian\s*informasi|info)$/i,
          /(layanan\s*informasi|informasi\b|info\b)/i
        ]);

        const matchedPermintaan = mapSyncConfig.permintaanColumn || findColumnByPriority([
          /^(permintaan\s*informasi|permintaan\s*tindakan|layanan\s*permintaan|permintaan|tindakan)$/i,
          /(permintaan|tindakan|minta)/i
        ]);

        const matchedPengaduan = mapSyncConfig.pengaduanColumn || findColumnByPriority([
          /^(pengaduan\s*peserta|layanan\s*pengaduan|pengaduan|aduan|komplain|keluhan)$/i,
          /(pengaduan|aduan|komplain|keluhan)/i
        ]);

        const matchedTotal = findColumnByPriority([
          /^(total\s*layanan|total\s*tiket|total\s*permohonan|total|jumlah|grand\s*total)$/i,
          /(total|jumlah)/i
        ]);

        const matchedSla = mapSyncConfig.slaColumn || findColumnByPriority([
          /^(kepatuhan\s*sla|persen\s*sla|sla\s*\(%\)|%\s*sla|sla\s*compliance|rata-rata\s*sla|sla)$/i,
          /(sla|compliance|kepatuhan|persen|percent)/i
        ]);

        const mappedCities: CityData[] = data.map((row, idx) => {
          const rawName = String(row[matchedKC] || '').trim();
          if (!rawName) return null;

          // Ignore summary rows like TOTAL, JUMLAH, GRAND TOTAL
          if (/^(total|jumlah|grand\s*total|subtotal|rata-rata|average|total\s*keseluruhan)$/i.test(rawName)) {
            return null;
          }

          let rawBulan = matchedBulan ? String(row[matchedBulan] || '').trim() : '';
          if (!rawBulan) {
            for (const [k, v] of Object.entries(row)) {
              if (/bulan|month|periode|bln/i.test(k.trim())) {
                const val = String(v || '').trim();
                if (val) { rawBulan = val; break; }
              }
            }
          }

          let rawKepwil = matchedKepwil ? String(row[matchedKepwil] || '').trim() : '';
          if (!rawKepwil) {
            for (const [k, v] of Object.entries(row)) {
              if (/kepwil|kedeputian|wilayah|kanwil/i.test(k.trim()) && !/cabang|kc/i.test(k.trim())) {
                const val = String(v || '').trim();
                if (val) { rawKepwil = val; break; }
              }
            }
          }
          if (!rawKepwil) {
            rawKepwil = getKepwilForCity(rawName);
          }

          const existingCity = citiesData.find(c => c.name.toLowerCase() === rawName.toLowerCase());
          const foundCoords = findCityCoordinates(rawName);
          const lat = foundCoords ? foundCoords.lat : (existingCity ? existingCity.latitude : -6.2088);
          const lon = foundCoords ? foundCoords.lon : (existingCity ? existingCity.longitude : 106.8456);

          let infoVal = matchedInfo && row[matchedInfo] !== undefined ? parseNumericValue(row[matchedInfo]) : 0;
          let permVal = matchedPermintaan && row[matchedPermintaan] !== undefined ? parseNumericValue(row[matchedPermintaan]) : 0;
          let pengVal = matchedPengaduan && row[matchedPengaduan] !== undefined ? parseNumericValue(row[matchedPengaduan]) : 0;
          let slaVal = matchedSla && row[matchedSla] !== undefined ? parseNumericValue(row[matchedSla]) : 90;
          if (slaVal > 0 && slaVal <= 1) {
            slaVal = Number((slaVal * 100).toFixed(2));
          } else if (slaVal > 100 && slaVal <= 10000) {
            slaVal = Number((slaVal / 100).toFixed(2));
          } else {
            slaVal = Number(slaVal.toFixed(2));
          }

          const topikSync = extractTopikAndPokokFromRow(row, parseNumericValue);
          if (topikSync.hasMatchedTopik && infoVal === 0 && permVal === 0 && pengVal === 0) {
            infoVal = topikSync.byKategori.Informasi;
            permVal = topikSync.byKategori.Permintaan;
            pengVal = topikSync.byKategori.Pengaduan;
          }

          const totalFromCol = matchedTotal && row[matchedTotal] !== undefined ? parseNumericValue(row[matchedTotal]) : 0;
          const calculatedTotal = infoVal + permVal + pengVal;
          const total = calculatedTotal > 0 ? calculatedTotal : totalFromCol;

          const parsedBulan = parseMonthValue(rawBulan);
          const normalizedBulan = parsedBulan ? parsedBulan.label : rawBulan;

          return {
            id: `row_${idx}_${rawName.replace(/[^a-z0-9]/gi, '_')}`,
            name: rawName,
            kantorCabang: rawName,
            bulan: normalizedBulan,
            kepwil: rawKepwil,
            latitude: lat,
            longitude: lon,
            informasi: infoVal,
            permintaan: permVal,
            pengaduan: pengVal,
            total,
            avgSlaDays: 2.4,
            slaCompliance: Number(Math.min(100, Math.max(0, slaVal)).toFixed(2)),
            rawRow: row,
            ...(topikSync.hasMatchedTopik ? {
              pokokMasalahBreakdown: topikSync.byKategoriAndPokok,
              topikBreakdown: topikSync.topikCounts,
            } : {}),
          };
        }).filter(Boolean) as CityData[];

        if (mappedCities.length > 0) {
          setCitiesData(mappedCities);
          safeSaveCitiesToLocalStorage(mappedCities);
          try {
            localStorage.setItem('has_synced_custom_data', 'true');
          } catch (e) {}
          const updatedCfg: MapSyncConfig = {
            ...mapSyncConfig,
            sheetUrl: targetUrl,
            bulanColumn: matchedBulan,
            kepwilColumn: matchedKepwil,
            cityColumn: matchedKC,
            informasiColumn: matchedInfo,
            permintaanColumn: matchedPermintaan,
            pengaduanColumn: matchedPengaduan,
            slaColumn: matchedSla,
            isSynced: true,
            lastSyncedAt: new Date().toLocaleTimeString('id-ID')
          };
          setMapSyncConfig(updatedCfg);
          try {
            localStorage.setItem('map_sync_config', JSON.stringify(updatedCfg));
          } catch (e) {}
          saveMapDataToCloud(mappedCities, updatedCfg, true);
        }
      }

      // Update active ticket SLA states
      setTicketsData(prev => prev.map(t => {
        if (t.status === 'Selesai') return t;
        const newElapsed = t.elapsedDays + 1;
        let newSlaStatus = t.slaStatus;
        if (newElapsed >= t.slaDays) {
          newSlaStatus = 'Overdue';
        } else if (newElapsed >= t.slaDays - 1) {
          newSlaStatus = 'Warning';
        }
        return {
          ...t,
          elapsedDays: newElapsed,
          slaStatus: newSlaStatus
        };
      }));

      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
      setLastSyncedAt(nowStr);
      try {
        localStorage.setItem('google_sheet_last_synced', nowStr);
      } catch (e) {}
      saveAppSettingsToCloud({ lastSyncedAt: nowStr });
      setSyncStatusToast(`Sukses sinkronisasi Google Sheet (${nowStr})`);
      setTimeout(() => setSyncStatusToast(null), 3500);
    } catch (err: any) {
      console.error('Sheet Sync Error:', err);
      // NEVER reset existing data on sync error! Keep existing citiesData
      setSyncStatusToast(`Gagal sync: ${err.message || 'Error koneksi Google Sheet'}. Data lama tetap aman.`);
      setTimeout(() => setSyncStatusToast(null), 4000);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-Sync Timer Effect - ONLY triggers if a valid sheetUrl is registered
  useEffect(() => {
    if (syncInterval === 'manual') return;

    let intervalMs = 0;
    if (syncInterval === '15m') intervalMs = 15 * 60 * 1000;
    else if (syncInterval === '30m') intervalMs = 30 * 60 * 1000;
    else if (syncInterval === '1h') intervalMs = 60 * 60 * 1000;
    else if (syncInterval === '1d') intervalMs = 24 * 60 * 60 * 1000;

    if (intervalMs <= 0) return;

    const intervalId = setInterval(() => {
      const activeUrl = googleSheetUrl || mapSyncConfig?.sheetUrl || localStorage.getItem('google_sheet_sync_url');
      if (activeUrl && activeUrl.trim()) {
        handleExecuteSync(activeUrl);
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [syncInterval, googleSheetUrl, mapSyncConfig]);

  // Helper list of city names for adding tickets form
  const cityNames = useMemo(() => {
    return citiesData.map(c => c.name);
  }, [citiesData]);

  // Copy template reference helpers
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setShowCopyDialog(label);
    setTimeout(() => setShowCopyDialog(null), 2500);
  };

  // If user is not logged in, display the initial login page with key metrics and 10 top services
  if (!isLoggedIn) {
    return (
      <InitialLoginPage
        citiesData={citiesData}
        users={usersData}
        onLoginSuccess={handleAppLoginSuccess}
      />
    );
  }

  const accessibleNavTabs = (() => {
    if (isAdmin) {
      const base = navOrder.filter(k => k !== 'analytics' && k !== 'tickets' && k !== 'referensi' && k !== 'laporan' && k !== 'reporting');
      if (!base.includes('pemanfaatan')) {
        base.push('pemanfaatan');
      }
      if (!base.includes('users')) {
        base.push('users');
      }
      return base;
    }
    // User Kepwil and User Kantor Cabang can access 'map', 'custom-charts' (OVERVIEW), 'sms', and 'pemanfaatan'
    return ['map', 'custom-charts', 'sms', 'pemanfaatan'];
  })();

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden font-sans text-slate-900 selection:bg-blue-500/20 selection:text-slate-900 antialiased">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 relative z-20">
        <div className="p-5 border-b border-slate-800">
          <SenadaLogo size="md" theme="dark" showSubtitle={true} />
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {accessibleNavTabs.map((tabKey, idx, arr) => {
            const isMap = tabKey === 'map';
            const isRef = tabKey === 'referensi';
            const isSms = tabKey === 'sms';
            const isReporting = tabKey === 'reporting';
            const isUsers = tabKey === 'users';
            const isPemanfaatan = tabKey === 'pemanfaatan';
            const isActive = activeMainTab === tabKey;
            const label = isMap 
              ? 'PETA NASIONAL' 
              : isRef 
              ? 'Referensi Filter' 
              : isSms 
              ? 'SMS (Super Mind Senada)' 
              : isReporting
              ? 'REPORTING'
              : isUsers
              ? 'MANAJEMEN USER'
              : isPemanfaatan
              ? 'PEMANFAATAN USER'
              : 'OVERVIEW';

            return (
              <div
                key={tabKey}
                className={`group relative w-full p-2.5 rounded-lg flex items-center justify-between transition-colors ${
                  isActive 
                    ? isSms 
                      ? 'bg-indigo-600/30 text-indigo-300 font-medium border border-indigo-500/40' 
                      : isReporting
                      ? 'bg-emerald-600/25 text-emerald-300 font-medium border border-emerald-500/40'
                      : isUsers
                      ? 'bg-blue-600/25 text-blue-300 font-medium border border-blue-500/40'
                      : isPemanfaatan
                      ? 'bg-amber-600/25 text-amber-300 font-medium border border-amber-500/40'
                      : 'bg-blue-600/20 text-blue-400 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                id={`tab-${tabKey}-button`}
              >
                <button
                  onClick={() => setActiveMainTab(tabKey as any)}
                  className="flex items-center space-x-2.5 text-left flex-1 cursor-pointer py-1"
                >
                  {isSms ? (
                    <Sparkles className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  ) : isReporting ? (
                    <Table2 className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  ) : isUsers ? (
                    <Users className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                  ) : isPemanfaatan ? (
                    <Award className={`w-5 h-5 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                  ) : (
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? 'bg-blue-400' : 'bg-slate-600'}`}></div>
                  )}
                  <span className="text-sm sm:text-base font-bold truncate">{label}</span>
                  {isUsers && (
                    <span className="text-[10px] bg-blue-500/25 text-blue-300 font-extrabold px-1.5 py-0.5 rounded ml-auto">
                      Admin
                    </span>
                  )}
                  {isPemanfaatan && (
                    <span className="text-[10px] bg-amber-500/25 text-amber-300 font-extrabold px-1.5 py-0.5 rounded ml-auto">
                      Top 5
                    </span>
                  )}
                </button>

                {isAdmin && !isUsers && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-0.5 transition-opacity">
                    <button
                      title="Geser ke atas"
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveNavItem(idx, 'up');
                      }}
                      className={`p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title="Geser ke bawah"
                      disabled={idx === arr.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveNavItem(idx, 'down');
                      }}
                      className={`p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white ${idx === arr.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="hidden p-4 border-t border-slate-800">
          {isAdmin ? (
            <div className="bg-slate-800/90 border border-slate-700/80 p-3 rounded-xl flex items-center justify-between gap-2.5">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white shrink-0 shadow-xs text-xs">
                  {(currentUser?.username || 'senada').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-white truncate">{currentUser?.username || 'senada'}</p>
                    <span className="text-[9px] bg-blue-500/30 text-blue-300 font-extrabold px-1.5 py-0.2 rounded">Admin</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">Akses Penuh Seluruh Menu</p>
                </div>
              </div>

              <button
                onClick={handleAppLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                title="Keluar / Logout (Kembali ke Halaman Awal)"
                id="admin-logout-button"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="bg-slate-800/60 border border-slate-700/50 p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    currentUser?.role === 'kepwil'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : currentUser?.role === 'kantor_pusat'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  }`}>
                    {(currentUser?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-bold text-slate-200 truncate">{currentUser?.username || 'Pengguna'}</p>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                        currentUser?.role === 'kepwil'
                          ? 'bg-emerald-500/30 text-emerald-300'
                          : currentUser?.role === 'kantor_pusat'
                          ? 'bg-indigo-500/30 text-indigo-300'
                          : 'bg-sky-500/30 text-sky-300'
                      }`}>
                        {currentUser?.role === 'kepwil' ? 'Kepwil' : currentUser?.role === 'kantor_pusat' ? 'Kantor Pusat' : 'Kantor Cabang'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">Akses: View & Filter Saja</p>
                  </div>
                </div>

                <button
                  onClick={handleAppLogout}
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                  title="Keluar / Logout Aplikasi"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full bg-slate-700/60 hover:bg-slate-700 text-slate-200 font-bold py-1.5 px-3 rounded-lg text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer border border-slate-600/50"
                id="admin-login-button"
                title="Masuk sebagai Administrator"
              >
                <LogIn className="h-3.5 w-3.5 text-blue-400" />
                <span>Login Admin</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden relative z-10">
        
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">
              {activeMainTab === 'map' ? 'PETA LAYANAN SENADA' :
               activeMainTab === 'referensi' ? 'Pengaturan Referensi Filter' :
               activeMainTab === 'tickets' ? 'Antrean Laporan & SLA Tindaklanjut' :
               activeMainTab === 'analytics' ? 'Analitik Performa Layanan Bulanan' :
               activeMainTab === 'sms' ? 'SMS (Super Mind Senada) - Rekomendasi Strategis AI' :
               activeMainTab === 'reporting' ? 'REPORTING - PIVOT TABLE EXCEL' :
               activeMainTab === 'users' ? 'MANAJEMEN USER & HAK AKSES' :
               activeMainTab === 'pemanfaatan' ? 'PEMANFAATAN APLIKASI KEPWIL & KANTOR CABANG' :
               'Visualisasi Grafik Kustom Dinamis'}
            </h2>
            <span className="hidden sm:inline-block text-slate-300">|</span>
          </div>
          
          <div className="flex items-center space-x-2.5">

            <div className="hidden bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 items-center shrink-0 shadow-3xs" title="Cloud Database Firestore terhubung secara live. Data & setting admin tersimpan dan tersinkronisasi di semua perangkat, jaringan & mode tamu.">
              <Database className="w-3.5 h-3.5 text-emerald-600 mr-1.5 shrink-0" />
              <span className="flex items-center gap-1.5">
                <span>Cloud Firestore</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-emerald-600 font-medium hidden lg:inline">Live Multi-Device</span>
              </span>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setShowCopyNotification(true);
                setTimeout(() => setShowCopyNotification(false), 2500);
              }}
              className="hidden bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all items-center gap-1.5 cursor-pointer shadow-3xs active:scale-95"
              id="share-dashboard-link-btn"
              title="Salin Link Dashboard dengan Data Ter-upload"
            >
              <Share2 className="h-3.5 w-3.5 text-indigo-600" />
              <span>{showCopyNotification ? 'Link Tersalin!' : 'Bagikan Link'}</span>
            </button>

              {/* AUTO SYNC GOOGLE SHEET CONTROL GROUP */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl shadow-3xs">
              <div className="flex items-center gap-1.5 pl-1.5 pr-0.5">
                <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs sm:text-sm text-slate-600 font-bold hidden md:inline">Auto Sync:</span>
                <select
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(e.target.value as any)}
                  disabled={!isAdmin}
                  className="bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-800 px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-3xs disabled:opacity-60"
                  id="auto-sync-interval-select"
                  title={isAdmin ? "Pilih Waktu Auto Sync dengan Google Sheet" : "Login Admin untuk mengubah waktu auto sync"}
                >
                  <option value="manual">Sync Manual</option>
                  <option value="15m">15 Menit</option>
                  <option value="30m">30 Menit</option>
                  <option value="1h">1 Jam</option>
                  <option value="1d">1 Hari</option>
                </select>
              </div>

              {/* TARGETED BUTTON ID */}
              {isAdmin ? (
                <button
                  onClick={() => handleExecuteSync()}
                  disabled={isRefreshing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer shadow-3xs"
                  id="simulate-data-refresh-button"
                  title={lastSyncedAt ? `Terakhir sinkronisasi: ${lastSyncedAt}` : 'Klik untuk Sinkronisasi Manual Google Sheet'}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Sinkronisasi...' : 'Sync Sekarang'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-3xs"
                  id="simulate-data-refresh-button"
                  title="Login Admin untuk Sinkronisasi Data"
                >
                  <Lock className="h-4 w-4 text-slate-500" />
                  <span>Sync (Admin)</span>
                </button>
              )}
            </div>

            {/* HEADER ACCOUNT & LOGOUT MENU WITH RESET PASSWORD SUB-OPTION */}
            <div className="relative" ref={userMenuRef}>
              {(() => {
                const userInfo = getUserOfficeOrWilayahLabel(currentUser);
                return (
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={`border text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-2.5 cursor-pointer shadow-3xs active:scale-95 ${
                      isUserMenuOpen
                        ? 'bg-slate-100 border-slate-300 text-slate-900 ring-2 ring-blue-500/20'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                    id="header-logout-button"
                    title={`Akun: ${userInfo.userName} | ${userInfo.officeName} (Klik untuk Logout / Rubah Password)`}
                    aria-expanded={isUserMenuOpen}
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black text-white text-xs shrink-0 shadow-3xs ${
                        currentUser?.role === 'admin'
                          ? 'bg-gradient-to-br from-indigo-500 to-blue-600'
                          : currentUser?.role === 'kepwil'
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                          : 'bg-gradient-to-br from-sky-500 to-blue-500'
                      }`}
                    >
                      {(userInfo.userName || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col text-left leading-tight min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 text-xs truncate max-w-[110px] sm:max-w-[140px]">
                          {userInfo.userName}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0 ${
                            currentUser?.role === 'admin'
                              ? 'bg-indigo-100 text-indigo-700'
                              : currentUser?.role === 'kepwil'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {currentUser?.role === 'admin' ? 'Admin' : currentUser?.role === 'kepwil' ? 'Kepwil' : 'KC'}
                        </span>
                      </div>
                      <div
                        className="text-[10px] sm:text-[11px] font-semibold text-slate-500 truncate max-w-[130px] sm:max-w-[190px] flex items-center gap-1 mt-0.5"
                        title={userInfo.officeName}
                      >
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{userInfo.officeName}</span>
                      </div>
                    </div>
                    <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg ml-0.5 shrink-0">
                      <LogOut className="w-3 h-3 text-rose-500" />
                      Logout
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                        isUserMenuOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>
                );
              })()}

              {/* DROPDOWN MENU */}
              {isUserMenuOpen && (() => {
                const userInfo = getUserOfficeOrWilayahLabel(currentUser);
                return (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fadeIn text-xs">
                    {/* USER SUMMARY */}
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60 rounded-t-2xl">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs shrink-0 shadow-3xs ${
                          currentUser?.role === 'admin'
                            ? 'bg-gradient-to-br from-indigo-500 to-blue-600'
                            : currentUser?.role === 'kepwil'
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                            : 'bg-gradient-to-br from-sky-500 to-blue-500'
                        }`}
                      >
                        {(userInfo.userName || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 text-sm truncate">
                            {userInfo.userName}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                              currentUser?.role === 'admin'
                                ? 'bg-indigo-100 text-indigo-700'
                                : currentUser?.role === 'kepwil'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {userInfo.typeLabel}
                          </span>
                        </div>
                        <div
                          className="flex items-center gap-1 text-[11px] text-slate-600 font-semibold truncate mt-0.5"
                          title={userInfo.officeName}
                        >
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{userInfo.officeName}</span>
                        </div>
                      </div>
                    </div>

                  <div className="py-1">
                    {/* SUB-OPTION 1: RUBAH PASSWORD */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsResetPasswordModalOpen(true);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-amber-50/80 transition-colors flex items-center gap-3 cursor-pointer group text-slate-700 hover:text-amber-900"
                      id="menu-item-reset-password"
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 group-hover:text-amber-950 block text-xs sm:text-sm">
                          Rubah Password
                        </span>
                        <span className="text-[11px] text-slate-400 group-hover:text-amber-800/80 block">
                          Masukkan password lama & buat password baru
                        </span>
                      </div>
                    </button>

                    {/* SUB-OPTION 2: LOGOUT */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleAppLogout();
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-rose-50/80 transition-colors flex items-center gap-3 cursor-pointer group text-slate-700 hover:text-rose-900 border-t border-slate-100 mt-1"
                      id="menu-item-logout"
                    >
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 group-hover:bg-rose-200 transition-colors">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 group-hover:text-rose-950 block text-xs sm:text-sm">
                          Keluar Aplikasi
                        </span>
                        <span className="text-[11px] text-slate-400 group-hover:text-rose-800/80 block">
                          Logout ke halaman awal
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              );
            })()}
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT ZONE */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto" id="dashboard-main-content">
          
          {/* ACTIVE FILTER INDICATOR BANNER */}
          {activeMainTab !== 'reporting' && activeMainTab !== 'pemanfaatan' && (parseFilterValueList(selectedBulan).length > 0 || parseFilterValueList(selectedKepwil).length > 0 || parseFilterValueList(selectedKantorCabang).length > 0) && (
            <div className="bg-indigo-50/90 border border-indigo-200 rounded-2xl p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 text-sm animate-fadeIn shadow-3xs">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-indigo-600 shrink-0" />
                  Filter Data Aktif:
                </span>
                {currentUser?.role === 'kepwil' && (
                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold px-2.5 py-0.5 rounded-lg text-xs shadow-3xs flex items-center gap-1">
                    🏛️ Data Default User Kepwil ({currentUser.username})
                  </span>
                )}
                {currentUser?.role === 'kantor_cabang' && (
                  <span className="bg-blue-100 text-blue-900 border border-blue-300 font-extrabold px-2.5 py-0.5 rounded-lg text-xs shadow-3xs flex items-center gap-1">
                    🏢 Data Default User KC ({currentUser.displayName || currentUser.username})
                  </span>
                )}
                {parseFilterValueList(selectedBulan).length > 0 && (
                  <span className="bg-white text-indigo-800 font-bold px-3 py-1 rounded-lg border border-indigo-200 shadow-3xs flex items-center gap-1">
                    📅 Bulan: <strong>{parseFilterValueList(selectedBulan).join(', ')}</strong>
                  </span>
                )}
                {parseFilterValueList(selectedKepwil).length > 0 && (
                  <span className="bg-white text-emerald-800 font-bold px-3 py-1 rounded-lg border border-emerald-200 shadow-3xs flex items-center gap-1">
                    🏛️ KEPWIL: <strong>{parseFilterValueList(selectedKepwil).join(', ')}</strong>
                  </span>
                )}
                {parseFilterValueList(selectedKantorCabang).length > 0 && (
                  <span className="bg-white text-blue-800 font-bold px-3 py-1 rounded-lg border border-blue-200 shadow-3xs flex items-center gap-1">
                    🏢 KC: <strong>{parseFilterValueList(selectedKantorCabang).join(', ')}</strong>
                  </span>
                )}
                <span className="text-slate-600 font-semibold ml-1 tabular-nums">
                  ({Number(filteredCitiesForMetrics.length).toLocaleString('id-ID')} Baris Data Terpilih)
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetToUserDefault}
                className="text-sm text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                id="reset-top-banner-filter-btn"
              >
                {currentUser?.role !== 'admin' ? 'Kembali ke Default Akun' : 'Reset Filter'}
              </button>
            </div>
          )}

          {/* GLOBAL FILTER BAR FOR OTHER PAGES (ANALYTICS, TICKETS, CUSTOM CHARTS) */}
          {activeMainTab !== 'map' && activeMainTab !== 'referensi' && activeMainTab !== 'reporting' && activeMainTab !== 'users' && activeMainTab !== 'pemanfaatan' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 animate-fadeIn transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setIsGlobalFilterExpanded(!isGlobalFilterExpanded)}
                    className="w-10 h-10 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 cursor-pointer transition-colors shrink-0"
                    title={isGlobalFilterExpanded ? "Sembunyikan Filter" : "Buka Filter"}
                    id="global-filter-icon-toggle-btn"
                  >
                    <Filter className="w-5 h-5" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base sm:text-lg font-black text-slate-800">Filter Menu Halaman</h4>
                      {/* Active filter summary chips when collapsed or expanded */}
                      <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto text-xs">
                        <span className="bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md font-semibold text-indigo-800">
                          Bulan: <strong>{parseFilterValueList(selectedBulan).length > 0 ? parseFilterValueList(selectedBulan).join(', ') : 'Semua'}</strong>
                        </span>
                        <span className="bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-md font-semibold text-emerald-800 truncate max-w-[150px]">
                          KEPWIL: <strong>{parseFilterValueList(selectedKepwil).length > 0 ? parseFilterValueList(selectedKepwil).join(', ') : 'Semua'}</strong>
                        </span>
                        <span className="bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-md font-semibold text-blue-800 truncate max-w-[170px]">
                          KC: <strong>{parseFilterValueList(selectedKantorCabang).length > 0 ? parseFilterValueList(selectedKantorCabang).join(', ') : 'Semua'}</strong>
                        </span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                      {isGlobalFilterExpanded ? "Saring data analitik, laporan, dan visualisasi." : "Klik 'Buka Filter' untuk mengubah kriteria penyaringan."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(parseFilterValueList(selectedBulan).length > 0 || parseFilterValueList(selectedKepwil).length > 0 || parseFilterValueList(selectedKantorCabang).length > 0) && (
                    <button
                      type="button"
                      onClick={handleResetToUserDefault}
                      className="text-xs sm:text-sm text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1.5 cursor-pointer bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{currentUser?.role !== 'admin' ? 'Reset Default' : 'Reset'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsGlobalFilterExpanded(!isGlobalFilterExpanded)}
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl border transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-2xs"
                    id="toggle-global-filter-btn"
                  >
                    <span>{isGlobalFilterExpanded ? 'Sembunyikan' : 'Buka Filter'}</span>
                    {isGlobalFilterExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                </div>
              </div>

              {/* COLLAPSIBLE CONTROLS */}
              {isGlobalFilterExpanded && (
                <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3.5 animate-fadeIn">
                  <SearchableFilterSelect
                    id="global-filter-bulan"
                    label="1. Filter Periode Bulan"
                    icon={<Calendar className="w-4 h-4 text-indigo-600" />}
                    value={selectedBulan}
                    onChange={setSelectedBulan}
                    options={availableBulanList}
                    allLabel={`Semua Bulan (${Number(availableBulanList.length).toLocaleString('id-ID')})`}
                    colorScheme="indigo"
                    searchPlaceholder="Cari bulan..."
                  />
                  <SearchableFilterSelect
                    id="global-filter-kepwil"
                    label="2. Filter KEPWIL"
                    icon={<Landmark className="w-4 h-4 text-emerald-600" />}
                    value={selectedKepwil}
                    onChange={(val) => {
                      setSelectedKepwil(val);
                      setSelectedKantorCabang('Semua');
                    }}
                    options={availableKepwilList}
                    allLabel={`Semua Wilayah (${Number(availableKepwilList.length).toLocaleString('id-ID')})`}
                    colorScheme="emerald"
                    searchPlaceholder="Cari wilayah..."
                  />
                  <SearchableFilterSelect
                    id="global-filter-kc"
                    label="3. Filter Kantor Cabang (KC)"
                    icon={<Building2 className="w-4 h-4 text-blue-600" />}
                    value={selectedKantorCabang}
                    onChange={setSelectedKantorCabang}
                    groupedOptions={groupedKantorCabang}
                    options={availableKantorCabangList}
                    allLabel={`Semua Kantor Cabang (${Number(availableKantorCabangList.length).toLocaleString('id-ID')})`}
                    colorScheme="blue"
                    searchPlaceholder="Cari Kantor Cabang..."
                  />
                </div>
              )}
            </div>
          )}

          {/* 4-COLUMN SUMMARY METRIC GRID ACCORDING TO EXCEL DATA */}
          {activeMainTab !== 'reporting' && activeMainTab !== 'users' && activeMainTab !== 'pemanfaatan' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
              
              {/* 1. TOTAL TIKET */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow transition-shadow">
                <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <FileSpreadsheet className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs sm:text-sm text-slate-600 uppercase tracking-wider block font-extrabold truncate">Total Tiket</span>
                  <div className="flex items-baseline justify-between mt-1 gap-2">
                    <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">{Number(summaryMetrics.totalTiket).toLocaleString('id-ID')}</h4>
                    <span className="text-blue-700 text-xs sm:text-sm font-extrabold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-3xs">Tiket</span>
                  </div>
                </div>
              </div>

              {/* 2. LAYANAN INFORMASI */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow transition-shadow">
                <div className="p-3.5 bg-sky-50 text-sky-600 rounded-xl shrink-0">
                  <HelpCircle className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs sm:text-sm text-slate-600 uppercase tracking-wider block font-extrabold truncate">Layanan Informasi</span>
                  <div className="flex items-baseline justify-between mt-1 gap-2">
                    <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">{Number(summaryMetrics.totalInformasi).toLocaleString('id-ID')}</h4>
                    <span className="text-sky-700 text-xs sm:text-sm font-extrabold bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 shadow-3xs">Tiket</span>
                  </div>
                </div>
              </div>

              {/* 3. LAYANAN PERMINTAAN */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow transition-shadow">
                <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                  <FileText className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs sm:text-sm text-slate-600 uppercase tracking-wider block font-extrabold truncate">Layanan Permintaan</span>
                  <div className="flex items-baseline justify-between mt-1 gap-2">
                    <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">{Number(summaryMetrics.totalPermintaan).toLocaleString('id-ID')}</h4>
                    <span className="text-amber-700 text-xs sm:text-sm font-extrabold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shadow-3xs">Tiket</span>
                  </div>
                </div>
              </div>

              {/* 4. LAYANAN PENGADUAN */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow transition-shadow">
                <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs sm:text-sm text-slate-600 uppercase tracking-wider block font-extrabold truncate">Layanan Pengaduan</span>
                  <div className="flex items-baseline justify-between mt-1 gap-2">
                    <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">{Number(summaryMetrics.totalPengaduan).toLocaleString('id-ID')}</h4>
                    <span className="text-rose-700 text-xs sm:text-sm font-extrabold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shadow-3xs">Tiket</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* DYNAMIC COMPONENT LOADER BASED ON ACTIVE TAB */}
          <div>
            {/* VIEW: REFERENCE MANAGER */}
            {activeMainTab === 'referensi' && (
              <div className="animate-fadeIn">
                <ReferenceManager
                  references={filterReferences}
                  onReferencesChange={setFilterReferences}
                  mapSyncConfig={mapSyncConfig}
                  citiesData={citiesData}
                />
              </div>
            )}

            {/* VIEW 1: MAPS AND GEOGRAPHICS */}
            {activeMainTab === 'map' && (
              <div className="animate-fadeIn">
                <IndonesiaMap
                  onCitiesDataChange={handleCitiesDataChange}
                  currentCities={citiesData}
                  isAdmin={isAdmin}
                  onRequestAdminLogin={() => setIsLoginModalOpen(true)}
                  volumeThresholds={volumeThresholds}
                  onVolumeThresholdsChange={(t) => {
                    setVolumeThresholds(t);
                    saveAppSettingsToCloud({ volumeThresholds: t });
                  }}
                  syncConfig={mapSyncConfig}
                  onSyncConfigChange={(cfg) => {
                    setMapSyncConfig(cfg);
                    localStorage.setItem('map_sync_config', JSON.stringify(cfg));
                    if (cfg.sheetUrl) {
                      setGoogleSheetUrl(cfg.sheetUrl);
                      localStorage.setItem('google_sheet_sync_url', cfg.sheetUrl);
                    }
                    saveMapDataToCloud(citiesData, cfg, true);
                  }}
                  selectedBulan={selectedBulan}
                  onSelectedBulanChange={setSelectedBulan}
                  selectedKepwil={selectedKepwil}
                  onSelectedKepwilChange={setSelectedKepwil}
                  selectedKantorCabang={selectedKantorCabang}
                  onSelectedKantorCabangChange={setSelectedKantorCabang}
                  filterReferences={filterReferences}
                  currentUser={currentUser}
                  onResetToUserDefault={handleResetToUserDefault}
                />
              </div>
            )}

            {/* VIEW 2: SLA AND QUEUE WORKLOAD */}
            {activeMainTab === 'tickets' && (
              <div className="animate-fadeIn">
                <SlaTracker
                  tickets={ticketsData}
                  onTicketsChange={setTicketsData}
                  availableCities={cityNames}
                />
              </div>
            )}

            {/* VIEW 3: MONTHLY PERFORMANCE ANALYTICS */}
            {activeMainTab === 'analytics' && (
              <div className="animate-fadeIn">
                <MonthlyAnalytics
                  citiesData={citiesData}
                  monthlyData={monthlyData}
                />
              </div>
            )}

            {/* VIEW 4: DYNAMIC CUSTOM CHARTS LIST (OVERVIEW) */}
            {activeMainTab === 'custom-charts' && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* INSTRUCTIONS & SYNC HEADER */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <BarChart3 className="text-blue-600 h-5 w-5" />
                      Halaman OVERVIEW & Visualisasi Kustom
                    </h3>
                    <p className="text-xs text-slate-500 max-w-2xl">
                      Halaman OVERVIEW ini terhubung penuh secara real-time dengan PETA NASIONAL. Filter periode bulan, KEPWIL, Kantor Cabang, dan aksi sinkronisasi data Google Sheets berlaku otomatis di seluruh halaman.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    <button
                      onClick={handleToggleAllDataLabels}
                      className={`font-bold py-2 px-3.5 rounded-xl text-xs transition-colors shadow-2xs shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                        dynamicCharts.length > 0 && dynamicCharts.every(c => c.showDataLabels)
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                      id="toggle-all-chart-labels-button"
                      title="Tampilkan atau sembunyikan nilai angka data pada semua grafik"
                    >
                      <Hash className={`h-4 w-4 ${dynamicCharts.length > 0 && dynamicCharts.every(c => c.showDataLabels) ? 'text-white' : 'text-indigo-600'}`} />
                      <span>{dynamicCharts.length > 0 && dynamicCharts.every(c => c.showDataLabels) ? 'Angka: Semua On' : 'Tampilkan Angka Grafik'}</span>
                    </button>

                    {isAdmin ? (
                      <button
                        onClick={() => handleExecuteSync()}
                        disabled={isRefreshing}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Sinkronkan data dengan Google Sheets"
                        id="overview-sync-button"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>{isRefreshing ? 'Sinkronisasi...' : 'Sync Data'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsLoginModalOpen(true)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-xl text-xs transition-colors border border-slate-200 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        title="Login Admin untuk Sinkronisasi"
                      >
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                        <span>Sync (Admin)</span>
                      </button>
                    )}

                    {isAdmin ? (
                      <button
                        onClick={handleAddNewChart}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-sm shrink-0 flex items-center gap-1.5 cursor-pointer"
                        id="add-new-chart-inner-button"
                        title="Tambah Grafik Baru (Admin)"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Tambah Grafik Baru
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsLoginModalOpen(true)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-xl text-xs transition-colors border border-slate-200 shadow-2xs shrink-0 flex items-center gap-1.5 cursor-pointer"
                        id="add-new-chart-inner-button"
                        title="Login Admin untuk Menambah Grafik"
                      >
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                        Tambah Grafik (Admin)
                      </button>
                    )}
                  </div>
                </div>

                {/* DYNAMIC CHARTS BENTO GRID */}
                {dynamicCharts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="custom-charts-grid">
                    {dynamicCharts.map(chart => (
                      <DynamicChartItem
                        key={chart.id}
                        chart={chart}
                        onUpdate={handleUpdateChart}
                        onDelete={handleDeleteChart}
                        localMonthlyData={monthlyData}
                        localCitiesData={filteredCitiesForMetrics}
                        onExecuteSync={() => handleExecuteSync()}
                        isSyncing={isRefreshing}
                        isAdmin={isAdmin}
                        onRequestAdminLogin={() => setIsLoginModalOpen(true)}
                        selectedBulan={selectedBulan}
                        selectedKepwil={selectedKepwil}
                        selectedKantorCabang={selectedKantorCabang}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-dashed border-slate-250 rounded-2xl py-16 px-4 text-center shadow-sm">
                    <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-3 animate-pulse" />
                    <h4 className="font-bold text-slate-700 text-sm">Tidak Ada Grafik Kustom</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Klik tombol di atas untuk membuat visualisasi baru yang terintegrasi dengan Google Sheets.</p>
                  </div>
                )}

              </div>
            )}

            {/* VIEW 5: SMS (SUPER MIND SENADA) REKOMENDASI AI GOOGLE */}
            {activeMainTab === 'sms' && (
              <SuperMindSenada
                citiesData={filteredCitiesForMetrics}
                selectedBulan={selectedBulan}
                onSelectedBulanChange={setSelectedBulan}
                selectedKepwil={selectedKepwil}
                onSelectedKepwilChange={setSelectedKepwil}
                selectedKantorCabang={selectedKantorCabang}
                onSelectedKantorCabangChange={setSelectedKantorCabang}
                availableBulanList={availableBulanList}
                availableKepwilList={availableKepwilList}
                availableKantorCabangList={availableKantorCabangList}
                groupedKantorCabang={groupedKantorCabang}
              />
            )}

            {/* VIEW 6: REPORTING DENGAN FITUR PIVOT TABLE EXCEL */}
            {activeMainTab === 'reporting' && (
              <ReportingPivotTable
                citiesData={citiesData}
                filteredCities={filteredCitiesForMetrics}
                selectedBulan={selectedBulan}
                selectedKepwil={selectedKepwil}
                selectedKantorCabang={selectedKantorCabang}
                availableBulanList={availableBulanList}
                availableKepwilList={availableKepwilList}
                availableKantorCabangList={availableKantorCabangList}
                mapSyncConfig={mapSyncConfig}
              />
            )}

            {/* VIEW 7: LAPORAN REKAPITULASI DATA TABEL (LEGACY) */}
            {(activeMainTab as string) === 'laporan' && (
              <LaporanRekapTable
                citiesData={citiesData}
                filteredCities={filteredCitiesForMetrics}
                onCitiesDataChange={handleCitiesDataChange}
                mapSyncConfig={mapSyncConfig}
                googleSheetUrl={googleSheetUrl}
                lastSyncedAt={lastSyncedAt}
                onExecuteSync={handleExecuteSync}
                isRefreshing={isRefreshing}
                isAdmin={isAdmin}
                onRequestAdminLogin={() => setIsLoginModalOpen(true)}
                selectedBulan={selectedBulan}
                selectedKepwil={selectedKepwil}
                selectedKantorCabang={selectedKantorCabang}
                onSelectedBulanChange={setSelectedBulan}
                onSelectedKepwilChange={setSelectedKepwil}
                onSelectedKantorCabangChange={setSelectedKantorCabang}
                availableBulanList={availableBulanList}
                availableKepwilList={availableKepwilList}
                availableKantorCabangList={availableKantorCabangList}
              />
            )}

            {/* VIEW 8: MANAJEMEN USER & HAK AKSES */}
            {activeMainTab === 'users' && isAdmin && (
              <div className="animate-fadeIn">
                <UserManagement
                  users={usersData}
                  onUsersChange={handleUsersChange}
                  currentUserId={currentUser?.id}
                />
              </div>
            )}

            {/* VIEW 9: PEMANFAATAN SISTEM KEPWIL & KANTOR CABANG */}
            {activeMainTab === 'pemanfaatan' && (
              <div className="animate-fadeIn">
                <UserUtilizationAnalytics
                  summaries={activitySummaries}
                  logs={activityLogs}
                  currentUser={currentUser}
                  onRefresh={() => {
                    setActivitySummaries(getUtilizationSummaries());
                    setActivityLogs(getRecentActivityLogs());
                    setSyncStatusToast('Data pemanfaatan berhasil disinkronkan');
                    setTimeout(() => setSyncStatusToast(null), 2500);
                  }}
                  onNavigateMenu={(menuId) => {
                    if (isAdmin || menuId === 'map' || menuId === 'custom-charts' || menuId === 'sms' || menuId === 'pemanfaatan') {
                      setActiveMainTab(menuId as any);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* FOOTER COLOFON */}
          <footer className="mt-8 border-t border-slate-200 pt-6 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 SIPL Monitor - Sistem Informasi & SLA Terpadu. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              Live Data Engine Running (v4.2.0)
            </p>
          </footer>

        </div>
      </main>

      {/* ADMIN AUTHENTICATION LOGIN MODAL */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
        users={usersData}
      />

      {/* USER SELF RESET PASSWORD MODAL */}
      <ResetPasswordModal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        currentUser={currentUser}
        onSuccess={handleSelfPasswordResetSuccess}
      />

    </div>
  );
}
