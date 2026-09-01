import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  BrainCircuit, 
  Users, 
  Workflow, 
  Wrench, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  Check, 
  Printer, 
  Building2, 
  Landmark, 
  Calendar, 
  ShieldCheck, 
  Zap, 
  Filter, 
  Layers,
  ArrowRight,
  Info,
  CheckSquare,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { CityData, SmsRecommendationResponse, StrategicRecommendationItem } from '../types';
import { generateFallbackRecommendations, extractBranchMetrics } from '../utils/smsHelper';
import SearchableFilterSelect from './SearchableFilterSelect';

interface SuperMindSenadaProps {
  citiesData: CityData[];
  selectedBulan: string;
  onSelectedBulanChange: (b: string) => void;
  selectedKepwil: string;
  onSelectedKepwilChange: (k: string) => void;
  selectedKantorCabang: string;
  onSelectedKantorCabangChange: (kc: string) => void;
  availableBulanList: string[];
  availableKepwilList: string[];
  availableKantorCabangList: string[];
  groupedKantorCabang?: { groupName: string; items: string[] }[];
}

export default function SuperMindSenada({
  citiesData,
  selectedBulan,
  onSelectedBulanChange,
  selectedKepwil,
  onSelectedKepwilChange,
  selectedKantorCabang,
  onSelectedKantorCabangChange,
  availableBulanList,
  availableKepwilList,
  availableKantorCabangList,
  groupedKantorCabang = [],
}: SuperMindSenadaProps) {
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  // Active filter tab states inside SMS view
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(true);
  const [timeframeFilter, setTimeframeFilter] = useState<'all' | 'pendek' | 'menengah' | 'panjang'>('all');
  const [aspectFilter, setAspectFilter] = useState<'all' | 'people' | 'proses' | 'tools'>('all');

  // Compute aggregate metrics for prompt grounding
  const metricsSummary = useMemo(() => {
    if (!citiesData || citiesData.length === 0) {
      return {
        totalInformasi: 0,
        totalPermintaan: 0,
        totalPengaduan: 0,
        avgSla: 90,
        topCities: [],
        bottomCities: []
      };
    }
    const totalInformasi = citiesData.reduce((acc, c) => acc + (c.informasi || 0), 0);
    const totalPermintaan = citiesData.reduce((acc, c) => acc + (c.permintaan || 0), 0);
    const totalPengaduan = citiesData.reduce((acc, c) => acc + (c.pengaduan || 0), 0);
    const totalSla = citiesData.reduce((acc, c) => acc + (c.slaCompliance || 0), 0);
    const avgSla = Math.round(totalSla / citiesData.length);

    const sorted = [...citiesData].sort((a, b) => (b.slaCompliance || 0) - (a.slaCompliance || 0));
    const topCities = sorted.slice(0, 3).map(c => ({ name: c.name, sla: c.slaCompliance }));
    const bottomCities = sorted.slice(-3).map(c => ({ name: c.name, sla: c.slaCompliance }));

    return {
      totalInformasi,
      totalPermintaan,
      totalPengaduan,
      avgSla,
      topCities,
      bottomCities
    };
  }, [citiesData]);

  // Active Branch Metrics calculated directly from synchronized dataset
  const activeBranchMetrics = useMemo(() => {
    return extractBranchMetrics(selectedKantorCabang, selectedKepwil, citiesData);
  }, [selectedKantorCabang, selectedKepwil, citiesData]);

  // Initial recommendation state loaded with fallback
  const [recommendationData, setRecommendationData] = useState<SmsRecommendationResponse>(() => {
    return generateFallbackRecommendations(selectedKantorCabang, selectedKepwil, citiesData);
  });

  // Re-generate or sync fallback when selected branch changes locally if not loading
  useEffect(() => {
    setRecommendationData((prev) => {
      // Keep Gemini recommendations if already generated custom, but update branch context if needed
      if (prev && !prev.isFallback) {
        return {
          ...prev,
          kantorCabangTarget: selectedKantorCabang !== 'Semua' ? selectedKantorCabang : 'Seluruh Kantor Cabang',
          kepwilTarget: selectedKepwil !== 'Semua' ? selectedKepwil : 'Seluruh KEPWIL',
        };
      }
      return generateFallbackRecommendations(selectedKantorCabang, selectedKepwil, citiesData);
    });
  }, [selectedKantorCabang, selectedKepwil, citiesData]);

  // Fetch AI Recommendations from Server Route using Gemini
  const handleGenerateAiRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/gemini/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kantorCabang: selectedKantorCabang,
          kepwil: selectedKepwil,
          selectedBulan: selectedBulan,
          branchMetrics: activeBranchMetrics,
          citiesSummary: metricsSummary,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setRecommendationData({
          summary: result.data.summary || 'Rekomendasi strategi telah berhasil disusun oleh AI Google.',
          kantorCabangTarget: selectedKantorCabang !== 'Semua' ? selectedKantorCabang : 'Seluruh Kantor Cabang',
          kepwilTarget: selectedKepwil !== 'Semua' ? selectedKepwil : 'Seluruh KEPWIL',
          overallScore: result.data.overallScore || 85,
          healthStatus: result.data.healthStatus || 'Perlu Perhatian',
          recommendations: result.data.recommendations || [],
          generatedAt: new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }),
          isFallback: false,
        });
      } else {
        // Fallback gracefully
        setRecommendationData(generateFallbackRecommendations(selectedKantorCabang, selectedKepwil, citiesData));
      }
    } catch (err) {
      console.warn('Fallback to local algorithm due to server response:', err);
      setRecommendationData(generateFallbackRecommendations(selectedKantorCabang, selectedKepwil, citiesData));
    } finally {
      setLoading(false);
    }
  };

  const toggleStepCompleted = (stepKey: string) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepKey]: !prev[stepKey]
    }));
  };

  const handleCopyCard = (item: StrategicRecommendationItem) => {
    const text = `[REKOMENDASI SMS - ${item.timeframeLabel.toUpperCase()} - ASPEK ${item.aspectLabel.toUpperCase()}]
Judul: ${item.title}
Target Unit: ${item.targetBranch || selectedKantorCabang}
Tingkat Dampak: ${item.impactLevel}

Deskripsi:
${item.description}

Langkah Operasional:
${item.actionSteps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyFullReport = () => {
    if (!recommendationData) return;
    const report = `=== LAPORAN STRATEGI & REKOMENDASI PERBAIKAN SMS (SUPER MIND SENADA) ===
Target Kantor Cabang: ${recommendationData.kantorCabangTarget}
KEPWIL: ${recommendationData.kepwilTarget || 'Semua'}
Skor Kesehatan Operasional: ${recommendationData.overallScore}/100 (${recommendationData.healthStatus})
Tanggal Dibuat: ${recommendationData.generatedAt}

RINGKASAN EKSEKUTIF:
${recommendationData.summary}

---------------------------------------------------------
DAFTAR REKOMENDASI STRATEGIS (3 TAHAP & 3 ASPEK):
${recommendationData.recommendations.map((rec, i) => `
${i + 1}. [${rec.timeframeLabel.toUpperCase()}] - ASPEK: ${rec.aspectLabel.toUpperCase()}
Judul: ${rec.title}
Tingkat Dampak: ${rec.impactLevel}
Deskripsi: ${rec.description}
Langkah Tindakan:
${rec.actionSteps.map((step, sIdx) => `  ${sIdx + 1}. ${step}`).join('\n')}
`).join('\n---------------------------------------------------------\n')}
`;

    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  // Filter recommendations based on tab selections
  const filteredRecommendations = useMemo(() => {
    if (!recommendationData || !recommendationData.recommendations) return [];
    return recommendationData.recommendations.filter(item => {
      const matchTimeframe = timeframeFilter === 'all' || item.timeframe === timeframeFilter;
      const matchAspect = aspectFilter === 'all' || item.aspect === aspectFilter;
      return matchTimeframe && matchAspect;
    });
  }, [recommendationData, timeframeFilter, aspectFilter]);

  // Group filtered items by timeframe
  const groupedByTimeframe = useMemo(() => {
    const map = {
      pendek: [] as StrategicRecommendationItem[],
      menengah: [] as StrategicRecommendationItem[],
      panjang: [] as StrategicRecommendationItem[],
    };
    filteredRecommendations.forEach(item => {
      if (item.timeframe === 'pendek') map.pendek.push(item);
      else if (item.timeframe === 'menengah') map.menengah.push(item);
      else if (item.timeframe === 'panjang') map.panjang.push(item);
    });
    return map;
  }, [filteredRecommendations]);

  const aspectStats = useMemo(() => {
    const list = recommendationData?.recommendations || [];
    return {
      people: list.filter(r => r.aspect === 'people').length,
      proses: list.filter(r => r.aspect === 'proses').length,
      tools: list.filter(r => r.aspect === 'tools').length,
      pendek: list.filter(r => r.timeframe === 'pendek').length,
      menengah: list.filter(r => r.timeframe === 'menengah').length,
      panjang: list.filter(r => r.timeframe === 'panjang').length,
    };
  }, [recommendationData]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="sms-super-mind-view">
      
      {/* HERO BANNER - SMS AI GOOGLE INTEGRATION */}
      <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-4 md:py-4.5 md:px-6 text-white shadow-md">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-blue-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-bold tracking-wide">
                <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                <span>SUPER MIND SENADA (SMS) — GOOGLE GEMINI</span>
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>Rekomendasi Strategis & Perbaikan Kantor Cabang</span>
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed font-normal">
              Diagnosis operasional AI berdasarkan data layanan terintegrasi Senada: <strong>3 Tahap Waktu</strong> (Pendek, Menengah, Panjang) & <strong>3 Aspek Utama</strong> (People, Proses, Tools).
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full lg:w-auto shrink-0">
            <button
              onClick={handleGenerateAiRecommendations}
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60 flex-1 sm:flex-initial"
              id="generate-sms-ai-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Menyusun...' : 'Jana Rekomendasi AI'}</span>
            </button>

            <button
              onClick={handleCopyFullReport}
              className="bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs flex-1 sm:flex-initial"
              title="Salin seluruh laporan ke clipboard"
              id="copy-full-sms-report-btn"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedReport ? 'Tersalin!' : 'Salin Laporan'}</span>
            </button>
          </div>
        </div>

        {/* ACTIVE DATASET CONTEXT BAR */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 text-slate-300 text-[11px]">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Filter className="w-3 h-3 text-indigo-400" />
              Konteks:
            </span>
            <span className="bg-slate-800/90 border border-slate-700/80 px-2 py-0.5 rounded-md text-white font-bold flex items-center gap-1">
              <Building2 className="w-3 h-3 text-blue-400" />
              {selectedKantorCabang !== 'Semua' ? selectedKantorCabang : 'Semua Kantor Cabang'}
            </span>
            {selectedKepwil !== 'Semua' && (
              <span className="bg-slate-800/90 border border-slate-700/80 px-2 py-0.5 rounded-md text-white font-bold flex items-center gap-1">
                <Landmark className="w-3 h-3 text-emerald-400" />
                {selectedKepwil}
              </span>
            )}
            {selectedBulan !== 'Semua' && (
              <span className="bg-slate-800/90 border border-slate-700/80 px-2 py-0.5 rounded-md text-white font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" />
                {selectedBulan}
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-2.5">
            <span>SLA: <strong className="text-emerald-400 font-bold">{metricsSummary.avgSla}%</strong></span>
            <span>•</span>
            <span>Pengaduan: <strong className="text-amber-400 font-bold">{metricsSummary.totalPengaduan}</strong></span>
          </div>
        </div>
      </div>

      {/* FILTER CONTROL PANEL & TARGET BRANCH SELECTOR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-xs space-y-3 transition-all">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="w-8 h-8 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 cursor-pointer transition-colors shrink-0"
              title={isFilterExpanded ? "Sembunyikan Filter" : "Buka Filter"}
              id="sms-filter-icon-toggle-btn"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs md:text-sm font-black text-slate-800">
                  Filter Tahap & Aspek Strategis
                </h3>
                {/* Active filter summary chips */}
                <div className="hidden sm:flex items-center gap-1.5 text-[10px]">
                  <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold truncate max-w-[150px]">
                    KC: {selectedKantorCabang}
                  </span>
                  <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                    Tahap: {timeframeFilter === 'all' ? 'Semua' : timeframeFilter}
                  </span>
                  <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                    Aspek: {aspectFilter === 'all' ? 'Semua' : aspectFilter}
                  </span>
                </div>
              </div>
              <p className="text-[10px] md:text-xs text-slate-500">
                {isFilterExpanded ? "Saring rekomendasi berdasarkan Tahap Waktu atau Aspek Strategis." : "Klik 'Buka Filter' untuk mengubah kriteria penyaringan."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-2xs shrink-0"
            id="toggle-sms-filter-btn"
          >
            <span>{isFilterExpanded ? 'Sembunyikan' : 'Buka Filter'}</span>
            {isFilterExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
        </div>

        {isFilterExpanded && (
          <div className="pt-3 border-t border-slate-100 space-y-4 animate-fadeIn">
            {/* QUICK TAB BUTTONS FOR TIMEFRAME AND ASPECT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* TIMEFRAME TAB */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  1. Tahap Waktu Rekomendasi
                </label>
                <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200 flex-wrap">
                  <button
                    onClick={() => setTimeframeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      timeframeFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-3xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    Semua Tahap ({recommendationData?.recommendations?.length || 0})
                  </button>
                  <button
                    onClick={() => setTimeframeFilter('pendek')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      timeframeFilter === 'pendek'
                        ? 'bg-amber-600 text-white shadow-3xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>Jangka Pendek</span>
                    <span className="text-[10px] opacity-80">({aspectStats.pendek})</span>
                  </button>
                  <button
                    onClick={() => setTimeframeFilter('menengah')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      timeframeFilter === 'menengah'
                        ? 'bg-blue-600 text-white shadow-3xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>Jangka Menengah</span>
                    <span className="text-[10px] opacity-80">({aspectStats.menengah})</span>
                  </button>
                  <button
                    onClick={() => setTimeframeFilter('panjang')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      timeframeFilter === 'panjang'
                        ? 'bg-purple-600 text-white shadow-3xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>Jangka Panjang</span>
                    <span className="text-[10px] opacity-80">({aspectStats.panjang})</span>
                  </button>
                </div>
              </div>

              {/* ASPECT TAB */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  2. Aspek Strategis
                </label>
                <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200 flex-wrap">
                  <button
                    onClick={() => setAspectFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      aspectFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-3xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    Semua Aspek
                  </button>
                  <button
                    onClick={() => setAspectFilter('people')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      aspectFilter === 'people'
                        ? 'bg-purple-600 text-white shadow-3xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>People ({aspectStats.people})</span>
                  </button>
                  <button
                    onClick={() => setAspectFilter('proses')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      aspectFilter === 'proses'
                        ? 'bg-emerald-600 text-white shadow-3xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Workflow className="w-3.5 h-3.5" />
                    <span>Proses ({aspectStats.proses})</span>
                  </button>
                  <button
                    onClick={() => setAspectFilter('tools')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      aspectFilter === 'tools'
                        ? 'bg-sky-600 text-white shadow-3xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Tools ({aspectStats.tools})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SYNCHRONIZED BRANCH METRICS SUMMARY CARD */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 text-white shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <Building2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm md:text-base font-black text-white tracking-tight">
                  Data Kinerja Unit: {activeBranchMetrics.branchName}
                </h3>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                  Data Sinkron Google Sheet / Excel
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kategori Layanan, Penyelesaian SLA, dan Pokok Masalah yang menjadi dasar formulasi strategi AI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80 text-right">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">Total Layanan</span>
              <span className="block text-base font-black text-indigo-300">{activeBranchMetrics.totalLayanan} <span className="text-[10px] text-slate-400 font-normal">Layanan</span></span>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80 text-right">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">SLA Compliance</span>
              <span className={`block text-base font-black ${activeBranchMetrics.slaCompliance >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {activeBranchMetrics.slaCompliance}% <span className="text-[10px] text-slate-400 font-normal">({activeBranchMetrics.avgSlaDays} Hr)</span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* KATEGORI LAYANAN */}
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                1. Kategori Layanan
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Dominan: <strong className="text-indigo-300 capitalize">{activeBranchMetrics.dominantCategory}</strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80">
                <span className="block text-[10px] text-slate-400 font-bold">Informasi</span>
                <span className="block text-sm font-black text-indigo-300 mt-0.5">{activeBranchMetrics.informasi}</span>
                <span className="block text-[9px] text-slate-500">
                  {activeBranchMetrics.totalLayanan > 0 ? Math.round((activeBranchMetrics.informasi / activeBranchMetrics.totalLayanan) * 100) : 0}%
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80">
                <span className="block text-[10px] text-slate-400 font-bold">Permintaan</span>
                <span className="block text-sm font-black text-emerald-300 mt-0.5">{activeBranchMetrics.permintaan}</span>
                <span className="block text-[9px] text-slate-500">
                  {activeBranchMetrics.totalLayanan > 0 ? Math.round((activeBranchMetrics.permintaan / activeBranchMetrics.totalLayanan) * 100) : 0}%
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80">
                <span className="block text-[10px] text-slate-400 font-bold">Pengaduan</span>
                <span className="block text-sm font-black text-rose-300 mt-0.5">{activeBranchMetrics.pengaduan}</span>
                <span className="block text-[9px] text-slate-500">
                  {activeBranchMetrics.totalLayanan > 0 ? Math.round((activeBranchMetrics.pengaduan / activeBranchMetrics.totalLayanan) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* POKOK MASALAH */}
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                2. Pokok Masalah (Root Cause)
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Dominan: <strong className="text-amber-300 capitalize">{activeBranchMetrics.dominantPokokMasalah}</strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80">
                <span className="block text-[10px] text-slate-400 font-bold">Administrasi</span>
                <span className="block text-sm font-black text-blue-300 mt-0.5">{activeBranchMetrics.administrasi}</span>
                <span className="block text-[9px] text-slate-500">
                  {activeBranchMetrics.totalLayanan > 0 ? Math.round((activeBranchMetrics.administrasi / activeBranchMetrics.totalLayanan) * 100) : 0}%
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80">
                <span className="block text-[10px] text-slate-400 font-bold">Iuran</span>
                <span className="block text-sm font-black text-amber-300 mt-0.5">{activeBranchMetrics.iuran}</span>
                <span className="block text-[9px] text-slate-500">
                  {activeBranchMetrics.totalLayanan > 0 ? Math.round((activeBranchMetrics.iuran / activeBranchMetrics.totalLayanan) * 100) : 0}%
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80">
                <span className="block text-[10px] text-slate-400 font-bold">Pel. Kesehatan</span>
                <span className="block text-sm font-black text-emerald-300 mt-0.5">{activeBranchMetrics.pelayananKesehatan}</span>
                <span className="block text-[9px] text-slate-500">
                  {activeBranchMetrics.totalLayanan > 0 ? Math.round((activeBranchMetrics.pelayananKesehatan / activeBranchMetrics.totalLayanan) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY & HEALTH SCORE CARD */}
      {recommendationData && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100 uppercase tracking-wider">
                Ringkasan Diagnosis Eksekutif
              </span>
              <span className="text-xs text-slate-400">• Dibuat pada: {recommendationData.generatedAt}</span>
            </div>
            <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-semibold">
              {recommendationData.summary}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 shrink-0 w-full md:w-auto">
            <div className="text-center px-2">
              <span className="block text-2xl font-black text-slate-900">{recommendationData.overallScore}<span className="text-xs text-slate-500 font-bold">/100</span></span>
              <span className="block text-[10px] font-extrabold uppercase text-slate-500">Skor Kesehatan</span>
            </div>
            <div className="h-9 w-px bg-slate-200" />
            <div>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                recommendationData.healthStatus === 'Optimal'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : recommendationData.healthStatus === 'Perlu Perhatian'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                {recommendationData.healthStatus}
              </span>
              <span className="block text-[10px] text-slate-500 font-semibold mt-1">Status Operasional Unit</span>
            </div>
          </div>
        </div>
      )}

      {/* RECOMMENDATION SECTIONS GROUPED BY TIMEFRAME */}
      <div className="space-y-8">

        {/* SECTION 1: JANGKA PENDEK */}
        {(timeframeFilter === 'all' || timeframeFilter === 'pendek') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-amber-500/80">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-3xs">
                  1
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>Jangka Pendek (1 - 3 Bulan)</span>
                    <span className="text-xs text-amber-700 bg-amber-100 font-extrabold px-2 py-0.5 rounded-full border border-amber-200">
                      Fokus: Quick Wins & SLA Emergency Recovery
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">Tindakan cepat dan taktis untuk menstabilkan beban antrean serta merotasi efisiensi staf.</p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                {groupedByTimeframe.pendek.length} Rekomendasi
              </span>
            </div>

            {groupedByTimeframe.pendek.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {groupedByTimeframe.pendek.map(item => (
                  <RecommendationCard
                    key={item.id}
                    item={item}
                    onCopy={() => handleCopyCard(item)}
                    isCopied={copiedId === item.id}
                    completedSteps={completedSteps}
                    onToggleStep={toggleStepCompleted}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                Tidak ada rekomendasi jangka pendek yang sesuai filter aspek.
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: JANGKA MENENGAH */}
        {(timeframeFilter === 'all' || timeframeFilter === 'menengah') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-blue-500/80">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-3xs">
                  2
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>Jangka Menengah (3 - 6 Bulan)</span>
                    <span className="text-xs text-blue-700 bg-blue-100 font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                      Fokus: Standardisasi SOP & Kapabilitas Perangkat
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">Pembenahan infrastruktur proses, pelatihan berkala, dan konsolidasi sistem informasi.</p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                {groupedByTimeframe.menengah.length} Rekomendasi
              </span>
            </div>

            {groupedByTimeframe.menengah.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {groupedByTimeframe.menengah.map(item => (
                  <RecommendationCard
                    key={item.id}
                    item={item}
                    onCopy={() => handleCopyCard(item)}
                    isCopied={copiedId === item.id}
                    completedSteps={completedSteps}
                    onToggleStep={toggleStepCompleted}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                Tidak ada rekomendasi jangka menengah yang sesuai filter aspek.
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: JANGKA PANJANG */}
        {(timeframeFilter === 'all' || timeframeFilter === 'panjang') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-purple-500/80">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-3xs">
                  3
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>Jangka Panjang (6 - 12+ Bulan)</span>
                    <span className="text-xs text-purple-700 bg-purple-100 font-extrabold px-2 py-0.5 rounded-full border border-purple-200">
                      Fokus: Transformasi Digital & Inovasi AI Berkelanjutan
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">Otomatisasi penuh berbasis AI Google Gemini dan pengembangan budaya operasional unggul.</p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                {groupedByTimeframe.panjang.length} Rekomendasi
              </span>
            </div>

            {groupedByTimeframe.panjang.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {groupedByTimeframe.panjang.map(item => (
                  <RecommendationCard
                    key={item.id}
                    item={item}
                    onCopy={() => handleCopyCard(item)}
                    isCopied={copiedId === item.id}
                    completedSteps={completedSteps}
                    onToggleStep={toggleStepCompleted}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                Tidak ada rekomendasi jangka panjang yang sesuai filter aspek.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// INDIVIDUAL RECOMMENDATION CARD COMPONENT
function RecommendationCard({
  item,
  onCopy,
  isCopied,
  completedSteps,
  onToggleStep,
}: {
  key?: string;
  item: StrategicRecommendationItem;
  onCopy: () => void;
  isCopied: boolean;
  completedSteps: Record<string, boolean>;
  onToggleStep: (key: string) => void;
}) {
  const aspectColor = {
    people: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      badge: 'bg-purple-600 text-white',
      text: 'text-purple-950',
      icon: <Users className="w-3.5 h-3.5" />,
    },
    proses: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      badge: 'bg-emerald-600 text-white',
      text: 'text-emerald-950',
      icon: <Workflow className="w-3.5 h-3.5" />,
    },
    tools: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      badge: 'bg-sky-600 text-white',
      text: 'text-sky-950',
      icon: <Wrench className="w-3.5 h-3.5" />,
    },
  }[item.aspect] || {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    badge: 'bg-slate-700 text-white',
    text: 'text-slate-900',
    icon: <Zap className="w-3.5 h-3.5" />,
  };

  const impactStyle = {
    Kritis: 'bg-rose-100 text-rose-800 border-rose-200',
    Tinggi: 'bg-amber-100 text-amber-800 border-amber-200',
    Sedang: 'bg-blue-100 text-blue-800 border-blue-200',
  }[item.impactLevel] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group">
      <div className="space-y-3">
        {/* CARD TOP BADGES */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wide ${aspectColor.badge}`}>
            {aspectColor.icon}
            <span>{item.aspectLabel}</span>
          </span>

          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${impactStyle}`}>
            <AlertTriangle className="w-3 h-3" />
            <span>Dampak: {item.impactLevel}</span>
          </span>
        </div>

        {/* TITLE & DESCRIPTION */}
        <div>
          <h4 className="text-sm font-extrabold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
            {item.title}
          </h4>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">
            {item.description}
          </p>
        </div>

        {/* TARGET KPI BADGE */}
        {item.kpiTarget && (
          <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-xl p-2.5 flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-700">Target KPI Konkret:</span>
              <span className="block text-xs font-bold text-indigo-950 mt-0.5">{item.kpiTarget}</span>
            </div>
          </div>
        )}

        {/* ACTION STEPS CHECKLIST */}
        {item.actionSteps && item.actionSteps.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
              <span className="flex items-center gap-1.5 text-slate-800">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                Langkah Tindakan Operasional:
              </span>
              {(() => {
                const totalSteps = item.actionSteps.length;
                const doneCount = item.actionSteps.filter((_, idx) => !!completedSteps[`${item.id}-step-${idx}`]).length;
                return (
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    doneCount === totalSteps 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                      : doneCount > 0 
                      ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {doneCount}/{totalSteps} Selesai
                  </span>
                );
              })()}
            </div>

            <ul className="space-y-2 text-xs">
              {item.actionSteps.map((step, sIdx) => {
                const stepKey = `${item.id}-step-${sIdx}`;
                const isDone = !!completedSteps[stepKey];
                return (
                  <li 
                    key={sIdx}
                    onClick={() => onToggleStep(stepKey)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      isDone 
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950' 
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-indigo-50/40 hover:border-indigo-200'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-lg mt-0.5 flex items-center justify-center text-[11px] font-black shrink-0 transition-colors ${
                      isDone ? 'bg-emerald-600 text-white shadow-3xs' : 'border border-slate-300 bg-white text-slate-700'
                    }`}>
                      {isDone ? '✓' : sIdx + 1}
                    </span>
                    <span className={`font-medium text-[11px] leading-relaxed ${isDone ? 'line-through text-emerald-800 opacity-80' : ''}`}>
                      {step}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* CARD FOOTER */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-[10px] text-slate-600 font-bold truncate">
          Unit: {item.targetBranch || 'Cabang Terpilih'}
        </span>

        <button
          onClick={onCopy}
          className="text-slate-500 hover:text-indigo-600 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors p-1"
          title="Salin rincian rekomendasi"
        >
          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
        </button>
      </div>
    </div>
  );
}
