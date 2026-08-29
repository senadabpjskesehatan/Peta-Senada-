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
  ChevronDown
} from 'lucide-react';

import { CityData, Ticket, MonthlyPerformance, DynamicChart } from './types';
import { DEFAULT_CITIES, DEFAULT_TICKETS, MONTHLY_PERFORMANCE, DEFAULT_CHARTS, SAMPLE_SHEETS_CSV, findCityCoordinates } from './data/defaultData';
import { parseNumericValue, fetchSheetData, parseCSV } from './utils/sheetParser';

// Component Imports
import IndonesiaMap from './components/IndonesiaMap';
import SlaTracker from './components/SlaTracker';
import MonthlyAnalytics from './components/MonthlyAnalytics';
import DynamicChartItem from './components/DynamicChartItem';

const CITIES_STORAGE_KEY = 'indonesia_map_cities_data_v3';

export default function App() {
  // Global Unified States initialized with localStorage persistence
  const [citiesData, setCitiesData] = useState<CityData[]>(() => {
    try {
      const saved = localStorage.getItem(CITIES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved cities data', e);
    }
    return DEFAULT_CITIES;
  });

  const [ticketsData, setTicketsData] = useState<Ticket[]>(DEFAULT_TICKETS);
  const [monthlyData, setMonthlyData] = useState<MonthlyPerformance[]>(MONTHLY_PERFORMANCE);
  const [dynamicCharts, setDynamicCharts] = useState<DynamicChart[]>(DEFAULT_CHARTS);
  const [activeMainTab, setActiveMainTab] = useState<'map' | 'tickets' | 'analytics' | 'custom-charts'>('map');
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState<string | null>(null);

  // Save cities data to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(CITIES_STORAGE_KEY, JSON.stringify(citiesData));
    } catch (e) {
      console.error('Failed to save cities data to storage', e);
    }
  }, [citiesData]);

  // Global aggregate metrics computed on the fly from current Excel / Sheet cities data
  const summaryMetrics = useMemo(() => {
    const totalInformasi = citiesData.reduce((acc, c) => acc + parseNumericValue(c.informasi), 0);
    const totalPermintaan = citiesData.reduce((acc, c) => acc + parseNumericValue(c.permintaan), 0);
    const totalPengaduan = citiesData.reduce((acc, c) => acc + parseNumericValue(c.pengaduan), 0);
    
    // Total tiket is the sum of total in all mapped cities
    const totalTiket = citiesData.reduce((acc, c) => {
      const cityTotal = parseNumericValue(c.total) > 0 ? parseNumericValue(c.total) : (parseNumericValue(c.informasi) + parseNumericValue(c.permintaan) + parseNumericValue(c.pengaduan));
      return acc + cityTotal;
    }, 0);

    const pctInformasi = totalTiket > 0 ? ((totalInformasi / totalTiket) * 100).toFixed(1) : '0';
    const pctPermintaan = totalTiket > 0 ? ((totalPermintaan / totalTiket) * 100).toFixed(1) : '0';
    const pctPengaduan = totalTiket > 0 ? ((totalPengaduan / totalTiket) * 100).toFixed(1) : '0';

    return {
      totalTiket,
      totalInformasi,
      pctInformasi,
      totalPermintaan,
      pctPermintaan,
      totalPengaduan,
      pctPengaduan
    };
  }, [citiesData]);

  // Handler to modify/update cities from map component (Google Sheets mapping)
  const handleCitiesDataChange = (updatedCities: CityData[]) => {
    setCitiesData(updatedCities);
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
      xAxisColumn: 'month',
      yAxisColumn: 'informasi',
      isSynced: false,
    };
    setDynamicCharts([...dynamicCharts, newChart]);
    setActiveMainTab('custom-charts');
  };

  // Update specific custom chart
  const handleUpdateChart = (chartId: string, updatedFields: Partial<DynamicChart>) => {
    setDynamicCharts(
      dynamicCharts.map(c => (c.id === chartId ? { ...c, ...updatedFields } : c))
    );
  };

  // Delete custom chart
  const handleDeleteChart = (chartId: string) => {
    setDynamicCharts(dynamicCharts.filter(c => c.id !== chartId));
  };

  // Navigation order state for moveable/draggable nav items
  const [navOrder, setNavOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('sidebar_nav_order');
    return saved ? JSON.parse(saved) : ['map', 'analytics', 'custom-charts'];
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
  };

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
  }, [syncInterval]);

  useEffect(() => {
    if (googleSheetUrl) {
      localStorage.setItem('google_sheet_sync_url', googleSheetUrl);
    }
  }, [googleSheetUrl]);

  // Core Sync Execution Engine for Google Sheet & Feed
  const handleExecuteSync = async (overrideUrl?: string) => {
    const storedUrl = localStorage.getItem('google_sheet_sync_url') || '';
    const targetUrl = overrideUrl !== undefined ? overrideUrl : (googleSheetUrl || storedUrl);
    setIsRefreshing(true);

    try {
      if (targetUrl && targetUrl.trim()) {
        const { data, columns } = await fetchSheetData(targetUrl);
        if (data && data.length > 0) {
          const matchedKC = columns.find(c => /kc|kantor.*cabang|cabang|kota|city|daerah|wilayah|lokasi|kabupaten|nama/i.test(c)) || columns[0] || '';
          const matchedInfo = columns.find(c => /info|layanan.*info|informasi/i.test(c)) || '';
          const matchedPermintaan = columns.find(c => /minta|layanan.*minta|permintaan|tindakan/i.test(c)) || '';
          const matchedPengaduan = columns.find(c => /aduan|layanan.*aduan|pengaduan|komplain/i.test(c)) || '';
          const matchedSla = columns.find(c => /sla|compliance|kepatuhan|persen|percent/i.test(c)) || '';

          const mappedCities: CityData[] = data.map((row, idx) => {
            const rawName = String(row[matchedKC] || `KC_${idx + 1}`).trim();
            const infoVal = matchedInfo && row[matchedInfo] !== undefined ? parseNumericValue(row[matchedInfo]) : 0;
            const permVal = matchedPermintaan && row[matchedPermintaan] !== undefined ? parseNumericValue(row[matchedPermintaan]) : 0;
            const pengVal = matchedPengaduan && row[matchedPengaduan] !== undefined ? parseNumericValue(row[matchedPengaduan]) : 0;
            const slaVal = matchedSla && row[matchedSla] !== undefined ? parseNumericValue(row[matchedSla]) : 90;

            const existingCity = citiesData.find(c => c.name.toLowerCase() === rawName.toLowerCase());
            const coords = existingCity ? { lat: existingCity.latitude, lon: existingCity.longitude } : findCityCoordinates(rawName);

            return {
              id: existingCity?.id || `city_${idx}_${Date.now()}`,
              name: rawName,
              latitude: coords.lat,
              longitude: coords.lon,
              informasi: infoVal,
              permintaan: permVal,
              pengaduan: pengVal,
              total: infoVal + permVal + pengVal,
              avgSlaDays: existingCity?.avgSlaDays || 2.5,
              slaCompliance: slaVal
            };
          });

          if (mappedCities.length > 0) {
            setCitiesData(mappedCities);
          }
        }
      } else {
        // Fallback to sample spreadsheet acuan data so numbers update strictly from Google Sheet source acuan
        const sampleRaw = parseCSV(SAMPLE_SHEETS_CSV.map);
        if (sampleRaw && sampleRaw.length > 0) {
          const mappedCities: CityData[] = sampleRaw.map((row, idx) => {
            const rawName = String(row['Kota'] || row['KC'] || `KC_${idx + 1}`).trim();
            const infoVal = parseNumericValue(row['Layanan_Informasi'] || row['Layanan Informasi']);
            const permVal = parseNumericValue(row['Layanan_Permintaan'] || row['Permintaan Tindakan']);
            const pengVal = parseNumericValue(row['Layanan_Pengaduan'] || row['Pengaduan Layanan']);
            const slaVal = parseNumericValue(row['Kepatuhan_SLA'] || row['Kepatuhan SLA']) || 90;

            const existingCity = citiesData.find(c => c.name.toLowerCase() === rawName.toLowerCase());
            const coords = existingCity ? { lat: existingCity.latitude, lon: existingCity.longitude } : findCityCoordinates(rawName);

            return {
              id: existingCity?.id || `city_${idx}_${Date.now()}`,
              name: rawName,
              latitude: coords.lat,
              longitude: coords.lon,
              informasi: infoVal,
              permintaan: permVal,
              pengaduan: pengVal,
              total: infoVal + permVal + pengVal,
              avgSlaDays: existingCity?.avgSlaDays || 2.5,
              slaCompliance: slaVal
            };
          });
          setCitiesData(mappedCities);
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
      setSyncStatusToast(`Sukses sinkronisasi (${nowStr})`);
      setTimeout(() => setSyncStatusToast(null), 3500);
    } catch (err: any) {
      console.error('Sheet Sync Error:', err);
      setSyncStatusToast(`Gagal sync: ${err.message || 'Error koneksi Google Sheet'}`);
      setTimeout(() => setSyncStatusToast(null), 4000);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-Sync Timer Effect
  useEffect(() => {
    if (syncInterval === 'manual') return;

    let intervalMs = 0;
    if (syncInterval === '15m') intervalMs = 15 * 60 * 1000;
    else if (syncInterval === '30m') intervalMs = 30 * 60 * 1000;
    else if (syncInterval === '1h') intervalMs = 60 * 60 * 1000;
    else if (syncInterval === '1d') intervalMs = 24 * 60 * 60 * 1000;

    if (intervalMs <= 0) return;

    const intervalId = setInterval(() => {
      handleExecuteSync();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [syncInterval, googleSheetUrl]);

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
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight text-blue-400 flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-blue-400" />
            SIPL Monitor
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Sistem Informasi & SLA</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navOrder.map((tabKey, idx) => {
            const isMap = tabKey === 'map';
            const isAnalytics = tabKey === 'analytics';
            const isActive = activeMainTab === tabKey;
            const label = isMap ? 'Pemetaan Geo' : isAnalytics ? 'Analitik Performa' : `Konfigurasi Chart (${dynamicCharts.length})`;

            return (
              <div
                key={tabKey}
                className={`group relative w-full p-2.5 rounded-lg flex items-center justify-between transition-colors ${
                  isActive ? 'bg-blue-600/20 text-blue-400 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                id={`tab-${tabKey}-button`}
              >
                <button
                  onClick={() => setActiveMainTab(tabKey as any)}
                  className="flex items-center space-x-3 text-left flex-1 cursor-pointer py-0.5"
                >
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-400' : 'bg-slate-600'}`}></div>
                  <span className="text-sm font-medium">{label}</span>
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
                    disabled={idx === navOrder.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveNavItem(idx, 'down');
                    }}
                    className={`p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white ${idx === navOrder.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 bg-slate-800 p-3 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white">A</div>
            <div>
              <p className="text-xs font-semibold text-white">Admin Pusat</p>
              <p className="text-[10px] text-slate-400">Kementerian Infokom</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden relative z-10">
        
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800">
              {activeMainTab === 'map' ? 'Overview Layanan Nasional (Peta)' :
               activeMainTab === 'tickets' ? 'Antrean Laporan & SLA Tindaklanjut' :
               activeMainTab === 'analytics' ? 'Analitik Performa Layanan Bulanan' : 'Visualisasi Grafik Kustom Dinamis'}
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

            <div className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 flex items-center shrink-0 shadow-3xs" title="Data hasil upload/sync tersimpan di database browser dan akan selalu muncul saat link di-share">
              <Database className="w-3.5 h-3.5 text-emerald-600 mr-1.5 shrink-0" />
              <span>Database Sync Active</span>
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
                  className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-3xs"
                  id="auto-sync-interval-select"
                  title="Pilih Waktu Auto Sync dengan Google Sheet"
                >
                  <option value="manual">Sync Manual</option>
                  <option value="15m">15 Menit</option>
                  <option value="30m">30 Menit</option>
                  <option value="1h">1 Jam</option>
                  <option value="1d">1 Hari</option>
                </select>
              </div>

              {/* TARGETED BUTTON ID */}
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
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT ZONE */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto" id="dashboard-main-content">
          
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
            {/* VIEW 1: MAPS AND GEOGRAPHICS */}
            {activeMainTab === 'map' && (
              <div className="animate-fadeIn">
                <IndonesiaMap
                  onCitiesDataChange={handleCitiesDataChange}
                  currentCities={citiesData}
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

            {/* VIEW 4: DYNAMIC CUSTOM CHARTS LIST */}
            {activeMainTab === 'custom-charts' && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* INSTRUCTIONS HEADER */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <BarChart3 className="text-blue-600 h-5 w-5" />
                      Menu Visualisasi Grafik Kustom Dinamis
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tambahkan grafik garis, batang, lingkaran, atau wilayah. Hubungkan tiap grafik secara independen ke data sistem lokal atau sinkronisasi dengan link Google Sheet pilihan Anda.
                    </p>
                  </div>

                  <button
                    onClick={handleAddNewChart}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-5 rounded-lg text-xs transition-colors shadow-sm shrink-0 flex items-center gap-1.5 cursor-pointer"
                    id="add-new-chart-inner-button"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Tambah Grafik Baru
                  </button>
                </div>

                {/* DYNAMIC CHARTS BENTO GRID */}
                {dynamicCharts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="custom-charts-grid">
                    {dynamicCharts.map(chart => (
                      <DynamicChartItem
                        key={chart.id}
                        chart={chart}
                        onUpdate={handleUpdateChart}
                        onDelete={handleDeleteChart}
                        localMonthlyData={monthlyData}
                        localCitiesData={citiesData}
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

    </div>
  );
}
