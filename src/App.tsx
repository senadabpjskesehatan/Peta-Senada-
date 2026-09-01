import React, { useState, useMemo, useEffect } from 'react';
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
  Hash
} from 'lucide-react';

import { CityData, Ticket, MonthlyPerformance, DynamicChart, MapSyncConfig, FilterReference } from './types';
import SearchableFilterSelect from './components/SearchableFilterSelect';
import { computeFilterOptions } from './utils/filterOptions';
import { DEFAULT_CITIES, DEFAULT_TICKETS, MONTHLY_PERFORMANCE, DEFAULT_CHARTS, SAMPLE_SHEETS_CSV, findCityCoordinates, getKepwilForCity } from './data/defaultData';
import { parseNumericValue, fetchSheetData, parseCSV } from './utils/sheetParser';
import { isBulanMatching, isKepwilMatching, isKantorCabangMatching, parseMonthValue, parseFilterValueList } from './utils/monthHelper';
import SuperMindSenada from './components/SuperMindSenada';
import {
  subscribeToAppSettings,
  subscribeToMapData,
  subscribeToDynamicCharts,
  saveAppSettingsToCloud,
  saveMapDataToCloud,
  saveDynamicChartsToCloud,
} from './lib/firebase';

// Component Imports
import IndonesiaMap from './components/IndonesiaMap';
import SlaTracker from './components/SlaTracker';
import MonthlyAnalytics from './components/MonthlyAnalytics';
import DynamicChartItem from './components/DynamicChartItem';
import AdminLoginModal from './components/AdminLoginModal';
import ReferenceManager from './components/ReferenceManager';
import { SenadaLogo } from './components/SenadaLogo';

const CITIES_STORAGE_KEY = 'indonesia_map_cities_data_v3';
const SYNCED_DEFAULT_CITIES_KEY = 'indonesia_map_synced_default_cities';
const CHARTS_STORAGE_KEY = 'indonesia_map_dynamic_charts_v3';

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

  const [activeMainTab, setActiveMainTab] = useState<'map' | 'tickets' | 'analytics' | 'custom-charts' | 'sms'>('map');
  const [isGlobalFilterExpanded, setIsGlobalFilterExpanded] = useState<boolean>(true);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState<string | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [volumeThresholds, setVolumeThresholds] = useState({
    rendahMax: 500,
    sedangMax: 2500,
    tinggiMax: 5000,
  });

  // Authentication & Guest / Admin Mode state (Default: Guest / Mode Tamu unless previously logged in as admin)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('is_admin_logged_in') === 'true';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    localStorage.setItem('is_admin_logged_in', 'true');
    setSyncStatusToast('Berhasil Login sebagai Administrator (User: senada)');
    setTimeout(() => setSyncStatusToast(null), 3000);
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('is_admin_logged_in');
    setSyncStatusToast('Beralih ke Mode Tamu (View Only)');
    setTimeout(() => setSyncStatusToast(null), 3000);
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
          try {
            localStorage.setItem(SYNCED_DEFAULT_CITIES_KEY, JSON.stringify(mapped));
            localStorage.setItem(CITIES_STORAGE_KEY, JSON.stringify(mapped));
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
        try {
          localStorage.setItem(CHARTS_STORAGE_KEY, JSON.stringify(mapped));
        } catch (e) {}
      }
    });

    // 3. Subscribe to Global App Settings from Cloud Firestore
    const unsubSettings = subscribeToAppSettings((cloudSettings) => {
      if (cloudSettings) {
        setIsCloudConnected(true);
        if (cloudSettings.navOrder && Array.isArray(cloudSettings.navOrder)) {
          const filtered = cloudSettings.navOrder.filter((k: string) => k !== 'analytics' && k !== 'tickets' && k !== 'referensi');
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

    return () => {
      unsubMap();
      unsubCharts();
      unsubSettings();
    };
  }, []);

  // Save cities data to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(CITIES_STORAGE_KEY, JSON.stringify(citiesData));
    } catch (e) {
      console.error('Failed to save cities data to storage', e);
    }
  }, [citiesData]);

  // Save dynamic charts to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(CHARTS_STORAGE_KEY, JSON.stringify(dynamicCharts));
    } catch (e) {
      console.error('Failed to save dynamic charts to storage', e);
    }
  }, [dynamicCharts]);

  // 3 Filter Dropdown States (Bulan, KEPWIL, Kantor Cabang - supports multi-select checklist)
  const [selectedBulan, setSelectedBulan] = useState<string | string[]>('Semua');
  const [selectedKepwil, setSelectedKepwil] = useState<string | string[]>('Semua');
  const [selectedKantorCabang, setSelectedKantorCabang] = useState<string | string[]>('Semua');

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

  // Global aggregate metrics computed on the fly from current Excel / Sheet cities data
  const summaryMetrics = useMemo(() => {
    const totalInformasi = filteredCitiesForMetrics.reduce((acc, c) => acc + parseNumericValue(c.informasi), 0);
    const totalPermintaan = filteredCitiesForMetrics.reduce((acc, c) => acc + parseNumericValue(c.permintaan), 0);
    const totalPengaduan = filteredCitiesForMetrics.reduce((acc, c) => acc + parseNumericValue(c.pengaduan), 0);
    const breakdownSum = totalInformasi + totalPermintaan + totalPengaduan;
    
    // Total tiket is the sum of total in all mapped cities
    const totalTiket = filteredCitiesForMetrics.reduce((acc, c) => {
      const cityTotal = parseNumericValue(c.total) > 0 ? parseNumericValue(c.total) : (parseNumericValue(c.informasi) + parseNumericValue(c.permintaan) + parseNumericValue(c.pengaduan));
      return acc + cityTotal;
    }, 0);

    const finalTotalTiket = Math.max(totalTiket, breakdownSum);

    const pctInformasi = finalTotalTiket > 0 ? ((totalInformasi / finalTotalTiket) * 100).toFixed(1) : '0';
    const pctPermintaan = finalTotalTiket > 0 ? ((totalPermintaan / finalTotalTiket) * 100).toFixed(1) : '0';
    const pctPengaduan = finalTotalTiket > 0 ? ((totalPengaduan / finalTotalTiket) * 100).toFixed(1) : '0';

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
    try {
      localStorage.setItem('has_synced_custom_data', 'true');
      localStorage.setItem(SYNCED_DEFAULT_CITIES_KEY, JSON.stringify(updatedCities));
      localStorage.setItem(CITIES_STORAGE_KEY, JSON.stringify(updatedCities));
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
        const filtered = parsed.filter((key: string) => key !== 'analytics' && key !== 'tickets' && key !== 'referensi');
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

          const infoVal = matchedInfo && row[matchedInfo] !== undefined ? parseNumericValue(row[matchedInfo]) : 0;
          const permVal = matchedPermintaan && row[matchedPermintaan] !== undefined ? parseNumericValue(row[matchedPermintaan]) : 0;
          const pengVal = matchedPengaduan && row[matchedPengaduan] !== undefined ? parseNumericValue(row[matchedPengaduan]) : 0;
          const slaVal = matchedSla && row[matchedSla] !== undefined ? parseNumericValue(row[matchedSla]) : 90;

          const totalFromCol = matchedTotal && row[matchedTotal] !== undefined ? parseNumericValue(row[matchedTotal]) : 0;
          const calculatedTotal = infoVal + permVal + pengVal;
          const total = totalFromCol > 0 ? totalFromCol : calculatedTotal;

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
            slaCompliance: Math.min(100, Math.max(0, slaVal)),
            rawRow: row
          };
        }).filter(Boolean) as CityData[];

        if (mappedCities.length > 0) {
          setCitiesData(mappedCities);
          localStorage.setItem(SYNCED_DEFAULT_CITIES_KEY, JSON.stringify(mappedCities));
          localStorage.setItem(CITIES_STORAGE_KEY, JSON.stringify(mappedCities));
          localStorage.setItem('has_synced_custom_data', 'true');
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
          localStorage.setItem('map_sync_config', JSON.stringify(updatedCfg));
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
      localStorage.setItem('google_sheet_last_synced', nowStr);
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

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden font-sans text-slate-900 selection:bg-blue-500/20 selection:text-slate-900 antialiased">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 relative z-20">
        <div className="p-5 border-b border-slate-800">
          <SenadaLogo size="md" theme="dark" showSubtitle={true} />
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navOrder.filter(k => k !== 'analytics' && k !== 'tickets' && k !== 'referensi').map((tabKey, idx, arr) => {
            const isMap = tabKey === 'map';
            const isRef = tabKey === 'referensi';
            const isSms = tabKey === 'sms';
            const isActive = activeMainTab === tabKey;
            const label = isMap ? 'PETA NASIONAL' : isRef ? 'Referensi Filter' : isSms ? 'SMS (Super Mind Senada)' : 'OVERVIEW';

            return (
              <div
                key={tabKey}
                className={`group relative w-full p-2.5 rounded-lg flex items-center justify-between transition-colors ${
                  isActive 
                    ? isSms ? 'bg-indigo-600/30 text-indigo-300 font-medium border border-indigo-500/40' : 'bg-blue-600/20 text-blue-400 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                id={`tab-${tabKey}-button`}
              >
                <button
                  onClick={() => setActiveMainTab(tabKey as any)}
                  className="flex items-center space-x-2 text-left flex-1 cursor-pointer py-0.5"
                >
                  {isSms ? (
                    <Sparkles className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  ) : (
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-blue-400' : 'bg-slate-600'}`}></div>
                  )}
                  <span className="text-sm font-medium truncate">{label}</span>
                </button>

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
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          {isAdmin ? (
            <div className="bg-slate-800/90 border border-slate-700/80 p-3 rounded-xl flex items-center justify-between gap-2.5">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white shrink-0 shadow-xs text-xs">
                  S
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-white truncate">senada</p>
                    <span className="text-[9px] bg-blue-500/30 text-blue-300 font-extrabold px-1.5 py-0.2 rounded">Admin</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">Akses Penuh (Full Control)</p>
                </div>
              </div>

              <button
                onClick={handleAdminLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                title="Keluar / Logout (Beralih ke Mode Tamu)"
                id="admin-logout-button"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="bg-slate-800/60 border border-slate-700/50 p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate">Mode Tamu</p>
                    <p className="text-[10px] text-slate-400 truncate">Hanya Melihat (View Only)</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                id="admin-login-button"
                title="Masuk sebagai Administrator"
              >
                <LogIn className="h-3.5 w-3.5" />
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
            <h2 className="text-lg font-bold text-slate-800">
              {activeMainTab === 'map' ? 'PETA LAYANAN SENADA' :
               activeMainTab === 'referensi' ? 'Pengaturan Referensi Filter' :
               activeMainTab === 'tickets' ? 'Antrean Laporan & SLA Tindaklanjut' :
               activeMainTab === 'analytics' ? 'Analitik Performa Layanan Bulanan' :
               activeMainTab === 'sms' ? 'SMS (Super Mind Senada) - Rekomendasi Strategis AI' :
               'Visualisasi Grafik Kustom Dinamis'}
            </h2>
            <span className="hidden sm:inline-block text-slate-300">|</span>
            <span className="hidden sm:inline-block text-xs text-slate-400">WIB / WITA / WIT</span>
          </div>
          
          <div className="flex items-center space-x-2.5">
            {syncStatusToast && (
              <span className="text-[11px] bg-slate-800 text-white px-3 py-1 rounded-xl shadow-sm font-medium animate-fade-in hidden xl:inline-block">
                {syncStatusToast}
              </span>
            )}

            <div className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 flex items-center shrink-0 shadow-3xs" title="Cloud Database Firestore terhubung secara live. Data & setting admin tersimpan dan tersinkronisasi di semua perangkat, jaringan & mode tamu.">
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
              className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs active:scale-95"
              id="share-dashboard-link-btn"
              title="Salin Link Dashboard dengan Data Ter-upload"
            >
              <Share2 className="h-3.5 w-3.5 text-indigo-600" />
              <span>{showCopyNotification ? 'Link Tersalin!' : 'Bagikan Link'}</span>
            </button>

              {/* AUTO SYNC GOOGLE SHEET CONTROL GROUP */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl shadow-3xs">
              <div className="flex items-center gap-1 pl-1.5 pr-0.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-[11px] text-slate-500 font-bold hidden md:inline">Auto Sync:</span>
                <select
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(e.target.value as any)}
                  disabled={!isAdmin}
                  className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-3xs disabled:opacity-60"
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer shadow-3xs"
                  id="simulate-data-refresh-button"
                  title={lastSyncedAt ? `Terakhir sinkronisasi: ${lastSyncedAt}` : 'Klik untuk Sinkronisasi Manual Google Sheet'}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Sinkronisasi...' : 'Sync Sekarang'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-3xs"
                  id="simulate-data-refresh-button"
                  title="Login Admin untuk Sinkronisasi Data"
                >
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Sync (Admin)</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT ZONE */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto" id="dashboard-main-content">
          
          {/* ACTIVE FILTER INDICATOR BANNER */}
          {(parseFilterValueList(selectedBulan).length > 0 || parseFilterValueList(selectedKepwil).length > 0 || parseFilterValueList(selectedKantorCabang).length > 0) && (
            <div className="bg-indigo-50/90 border border-indigo-200 rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn shadow-3xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-indigo-600 shrink-0" />
                  Filter Data Aktif:
                </span>
                {parseFilterValueList(selectedBulan).length > 0 && (
                  <span className="bg-white text-indigo-800 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 shadow-3xs flex items-center gap-1">
                    📅 Bulan: <strong>{parseFilterValueList(selectedBulan).join(', ')}</strong>
                  </span>
                )}
                {parseFilterValueList(selectedKepwil).length > 0 && (
                  <span className="bg-white text-emerald-800 font-bold px-2.5 py-1 rounded-lg border border-emerald-200 shadow-3xs flex items-center gap-1">
                    🏛️ KEPWIL: <strong>{parseFilterValueList(selectedKepwil).join(', ')}</strong>
                  </span>
                )}
                {parseFilterValueList(selectedKantorCabang).length > 0 && (
                  <span className="bg-white text-blue-800 font-bold px-2.5 py-1 rounded-lg border border-blue-200 shadow-3xs flex items-center gap-1">
                    🏢 KC: <strong>{parseFilterValueList(selectedKantorCabang).join(', ')}</strong>
                  </span>
                )}
                <span className="text-slate-500 font-medium ml-1">
                  ({filteredCitiesForMetrics.length} Baris Data Terpilih)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedBulan('Semua');
                  setSelectedKepwil('Semua');
                  setSelectedKantorCabang('Semua');
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                id="reset-top-banner-filter-btn"
              >
                Reset Filter
              </button>
            </div>
          )}

          {/* GLOBAL FILTER BAR FOR OTHER PAGES (ANALYTICS, TICKETS, CUSTOM CHARTS) */}
          {activeMainTab !== 'map' && activeMainTab !== 'referensi' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3 animate-fadeIn transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setIsGlobalFilterExpanded(!isGlobalFilterExpanded)}
                    className="w-8 h-8 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 cursor-pointer transition-colors shrink-0"
                    title={isGlobalFilterExpanded ? "Sembunyikan Filter" : "Buka Filter"}
                    id="global-filter-icon-toggle-btn"
                  >
                    <Filter className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-black text-slate-800">Filter Menu Halaman</h4>
                      {/* Active filter summary chips when collapsed or expanded */}
                      <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto text-[10px]">
                        <span className="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-semibold text-indigo-800">
                          Bulan: <strong>{parseFilterValueList(selectedBulan).length > 0 ? parseFilterValueList(selectedBulan).join(', ') : 'Semua'}</strong>
                        </span>
                        <span className="bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-semibold text-emerald-800 truncate max-w-[130px]">
                          KEPWIL: <strong>{parseFilterValueList(selectedKepwil).length > 0 ? parseFilterValueList(selectedKepwil).join(', ') : 'Semua'}</strong>
                        </span>
                        <span className="bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md font-semibold text-blue-800 truncate max-w-[150px]">
                          KC: <strong>{parseFilterValueList(selectedKantorCabang).length > 0 ? parseFilterValueList(selectedKantorCabang).join(', ') : 'Semua'}</strong>
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {isGlobalFilterExpanded ? "Saring data analitik, laporan, dan visualisasi." : "Klik 'Buka Filter' untuk mengubah kriteria penyaringan."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(parseFilterValueList(selectedBulan).length > 0 || parseFilterValueList(selectedKepwil).length > 0 || parseFilterValueList(selectedKantorCabang).length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBulan('Semua');
                        setSelectedKepwil('Semua');
                        setSelectedKantorCabang('Semua');
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span className="hidden md:inline">Reset</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsGlobalFilterExpanded(!isGlobalFilterExpanded)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-2xs"
                    id="toggle-global-filter-btn"
                  >
                    <span>{isGlobalFilterExpanded ? 'Sembunyikan' : 'Buka Filter'}</span>
                    {isGlobalFilterExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                </div>
              </div>

              {/* COLLAPSIBLE CONTROLS */}
              {isGlobalFilterExpanded && (
                <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 animate-fadeIn">
                  <SearchableFilterSelect
                    id="global-filter-bulan"
                    label="1. Filter Periode Bulan"
                    icon={<Calendar className="w-3.5 h-3.5 text-indigo-600" />}
                    value={selectedBulan}
                    onChange={setSelectedBulan}
                    options={availableBulanList}
                    allLabel={`Semua Bulan (${availableBulanList.length})`}
                    colorScheme="indigo"
                    searchPlaceholder="Cari bulan..."
                  />
                  <SearchableFilterSelect
                    id="global-filter-kepwil"
                    label="2. Filter KEPWIL"
                    icon={<Landmark className="w-3.5 h-3.5 text-emerald-600" />}
                    value={selectedKepwil}
                    onChange={(val) => {
                      setSelectedKepwil(val);
                      setSelectedKantorCabang('Semua');
                    }}
                    options={availableKepwilList}
                    allLabel={`Semua Wilayah (${availableKepwilList.length})`}
                    colorScheme="emerald"
                    searchPlaceholder="Cari wilayah..."
                  />
                  <SearchableFilterSelect
                    id="global-filter-kc"
                    label="3. Filter Kantor Cabang (KC)"
                    icon={<Building2 className="w-3.5 h-3.5 text-blue-600" />}
                    value={selectedKantorCabang}
                    onChange={setSelectedKantorCabang}
                    groupedOptions={groupedKantorCabang}
                    options={availableKantorCabangList}
                    allLabel={`Semua Kantor Cabang (${availableKantorCabangList.length})`}
                    colorScheme="blue"
                    searchPlaceholder="Cari Kantor Cabang..."
                  />
                </div>
              )}
            </div>
          )}

          {/* 4-COLUMN SUMMARY METRIC GRID ACCORDING TO EXCEL DATA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
            
            {/* 1. TOTAL TIKET */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow transition-shadow">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold truncate">Total Tiket</span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <h4 className="text-2xl font-black text-slate-900">{summaryMetrics.totalTiket.toLocaleString('id-ID')}</h4>
                  <span className="text-blue-700 text-sm font-extrabold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-3xs">100%</span>
                </div>
              </div>
            </div>

            {/* 2. LAYANAN INFORMASI */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow transition-shadow">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold truncate">Layanan Informasi</span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <h4 className="text-2xl font-black text-slate-900">{summaryMetrics.totalInformasi.toLocaleString('id-ID')}</h4>
                  <span className="text-sky-700 text-sm font-extrabold bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 shadow-3xs">{summaryMetrics.pctInformasi}%</span>
                </div>
              </div>
            </div>

            {/* 3. LAYANAN PERMINTAAN */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow transition-shadow">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold truncate">Layanan Permintaan</span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <h4 className="text-2xl font-black text-slate-900">{summaryMetrics.totalPermintaan.toLocaleString('id-ID')}</h4>
                  <span className="text-amber-700 text-sm font-extrabold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shadow-3xs">{summaryMetrics.pctPermintaan}%</span>
                </div>
              </div>
            </div>

            {/* 4. LAYANAN PENGADUAN */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow transition-shadow">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold truncate">Layanan Pengaduan</span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <h4 className="text-2xl font-black text-slate-900">{summaryMetrics.totalPengaduan.toLocaleString('id-ID')}</h4>
                  <span className="text-rose-700 text-sm font-extrabold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shadow-3xs">{summaryMetrics.pctPengaduan}%</span>
                </div>
              </div>
            </div>

          </div>

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
          </div>



          {/* FOOTER COLOFON */}
          <footer className="mt-8 border-t border-slate-200 pt-6 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 SIPL Monitor - Sistem Informasi & SLA Terpadu. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
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
      />

    </div>
  );
}
