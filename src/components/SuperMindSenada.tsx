import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  BrainCircuit,
  Users,
  Workflow,
  Wrench,
  Clock,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Building2,
  Landmark,
  Calendar,
  ShieldCheck,
  Zap,
  Filter,
  Layers,
  Info,
  CheckSquare,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  MessageSquareWarning,
  BookOpenCheck,
} from 'lucide-react';
import { CityData, SmsRecommendationResponse, StrategicRecommendationItem } from '../types';
import { generateFallbackRecommendations, extractBranchMetrics } from '../utils/smsHelper';
import { parseFilterValueList } from '../utils/monthHelper';

interface SuperMindSenadaProps {
  citiesData: CityData[];
  selectedBulan: string | string[];
  onSelectedBulanChange: (b: string | string[]) => void;
  selectedKepwil: string | string[];
  onSelectedKepwilChange: (k: string | string[]) => void;
  selectedKantorCabang: string | string[];
  onSelectedKantorCabangChange: (kc: string | string[]) => void;
  availableBulanList: string[];
  availableKepwilList: string[];
  availableKantorCabangList: string[];
  groupedKantorCabang?: { groupName: string; items: string[] }[];
}

export default function SuperMindSenada({
  citiesData,
  selectedBulan,
  selectedKepwil,
  selectedKantorCabang,
}: SuperMindSenadaProps) {
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  // Active filter tab states inside SMS view
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [kategoriFocus, setKategoriFocus] = useState<'Semua' | 'Pengaduan' | 'Informasi'>('Semua');
  const [timeframeFilter, setTimeframeFilter] = useState<'all' | 'pendek' | 'menengah'>('all');
  const [aspectFilter, setAspectFilter] = useState<'all' | 'people' | 'proses' | 'tools'>('all');
  const [selectedTopikFilter, setSelectedTopikFilter] = useState<string>('Semua');

  const kcList = parseFilterValueList(selectedKantorCabang);
  const kwList = parseFilterValueList(selectedKepwil);
  const blnList = parseFilterValueList(selectedBulan);

  const displayKC = kcList.length > 0 ? kcList.join(', ') : 'Semua Kantor Cabang';
  const displayKEPWIL = kwList.length > 0 ? kwList.join(', ') : 'Semua Wilayah';
  const displayBulan = blnList.length > 0 ? blnList.join(', ') : 'Semua Bulan';

  // Compute aggregate metrics for prompt grounding
  const metricsSummary = useMemo(() => {
    if (!citiesData || citiesData.length === 0) {
      return {
        totalInformasi: 0,
        totalPermintaan: 0,
        totalPengaduan: 0,
        avgSla: 90,
        topCities: [],
        bottomCities: [],
      };
    }
    const totalInformasi = citiesData.reduce((acc, c) => acc + Math.round(Number(c.informasi || 0)), 0);
    const totalPermintaan = citiesData.reduce((acc, c) => acc + Math.round(Number(c.permintaan || 0)), 0);
    const totalPengaduan = citiesData.reduce((acc, c) => acc + Math.round(Number(c.pengaduan || 0)), 0);
    const totalSla = citiesData.reduce((acc, c) => acc + Number(c.slaCompliance || 0), 0);
    const avgSla = Number((totalSla / citiesData.length).toFixed(2));

    const sorted = [...citiesData].sort((a, b) => (b.slaCompliance || 0) - (a.slaCompliance || 0));
    const topCities = sorted.slice(0, 3).map(c => ({ name: c.name, sla: c.slaCompliance }));
    const bottomCities = sorted.slice(-3).map(c => ({ name: c.name, sla: c.slaCompliance }));

    return {
      totalInformasi,
      totalPermintaan,
      totalPengaduan,
      avgSla,
      topCities,
      bottomCities,
    };
  }, [citiesData]);

  // Active Branch Metrics calculated directly from synchronized dataset & Topik Masalah reference
  const activeBranchMetrics = useMemo(() => {
    return extractBranchMetrics(selectedKantorCabang, selectedKepwil, citiesData);
  }, [selectedKantorCabang, selectedKepwil, citiesData]);

  // Initial recommendation state loaded with fallback grounded on Topik Masalah Pengaduan & Informasi
  const [recommendationData, setRecommendationData] = useState<SmsRecommendationResponse>(() => {
    return generateFallbackRecommendations(selectedKantorCabang, selectedKepwil, citiesData, 'Semua', 'Semua');
  });

  // Re-generate or sync fallback when selected branch, kategoriFocus, or topik filter changes locally
  useEffect(() => {
    setRecommendationData(
      generateFallbackRecommendations(selectedKantorCabang, selectedKepwil, citiesData, selectedTopikFilter, kategoriFocus)
    );
  }, [selectedKantorCabang, selectedKepwil, citiesData, selectedTopikFilter, kategoriFocus]);

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
          kantorCabang: kcList.length > 0 ? kcList.join(', ') : 'Semua',
          kepwil: kwList.length > 0 ? kwList.join(', ') : 'Semua',
          selectedBulan: blnList.length > 0 ? blnList.join(', ') : 'Semua',
          selectedTopik: selectedTopikFilter,
          kategoriFocus,
          branchMetrics: activeBranchMetrics,
          citiesSummary: metricsSummary,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        const fallback = generateFallbackRecommendations(selectedKantorCabang, selectedKepwil, citiesData, selectedTopikFilter, kategoriFocus);
        setRecommendationData({
          summary:
            result.data.summary ||
            fallback.summary,
          kesimpulanPendek: result.data.kesimpulanPendek || fallback.kesimpulanPendek,
          aksiUtamaPendek: Array.isArray(result.data.aksiUtamaPendek) && result.data.aksiUtamaPendek.length > 0 ? result.data.aksiUtamaPendek : fallback.aksiUtamaPendek,
          kesimpulanMenengah: result.data.kesimpulanMenengah || fallback.kesimpulanMenengah,
          aksiUtamaMenengah: Array.isArray(result.data.aksiUtamaMenengah) && result.data.aksiUtamaMenengah.length > 0 ? result.data.aksiUtamaMenengah : fallback.aksiUtamaMenengah,
          kantorCabangTarget: kcList.length > 0 ? kcList.join(', ') : 'Seluruh Kantor Cabang',
          kepwilTarget: kwList.length > 0 ? kwList.join(', ') : 'Seluruh KEPWIL',
          overallScore: result.data.overallScore || 85,
          healthStatus: result.data.healthStatus || 'Perlu Perhatian',
          recommendations: (result.data.recommendations || []).filter((r: StrategicRecommendationItem) => r.timeframe === 'pendek' || r.timeframe === 'menengah'),
          generatedAt: new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }),
          isFallback: false,
        });
      } else {
        setRecommendationData(
          generateFallbackRecommendations(selectedKantorCabang, selectedKepwil, citiesData, selectedTopikFilter, kategoriFocus)
        );
      }
    } catch (err) {
      console.warn('Fallback to local algorithm due to server response:', err);
      setRecommendationData(
        generateFallbackRecommendations(selectedKantorCabang, selectedKepwil, citiesData, selectedTopikFilter, kategoriFocus)
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleStepCompleted = (stepKey: string) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepKey]: !prev[stepKey],
    }));
  };

  const handleCopyCard = (item: StrategicRecommendationItem) => {
    const text = `[REKOMENDASI STRATEGI - ${item.timeframeLabel.toUpperCase()} - ASPEK ${item.aspectLabel.toUpperCase()}]
Kesimpulan yang Harus Dilakukan: ${item.title}
Topik Masalah: ${item.topikMasalah || activeBranchMetrics.dominantTopikMasalah} (${item.jenisKategori || '-'} / ${item.pokokMasalah || '-'}${item.topikCount ? ` - ${Math.round(Number(item.topikCount)).toLocaleString('id-ID')} Tiket` : ''})
Unit Layanan: ${item.targetBranch || (kcList.length > 0 ? kcList.join(', ') : 'Seluruh Kantor Cabang')}

Aksi yang Harus Dilakukan:
${item.actionSteps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyFullReport = () => {
    if (!recommendationData) return;

    const report = `=== REKOMENDASI STRATEGI — SUPER MIND SENADA (SMS) ===
Unit Kantor Cabang: ${recommendationData.kantorCabangTarget}
KEPWIL: ${recommendationData.kepwilTarget || 'Semua'}
Tanggal Dibuat: ${recommendationData.generatedAt}

1. JANGKA PENDEK (1 - 3 BULAN)
Kesimpulan yang Harus Dilakukan:
${recommendationData.kesimpulanPendek || '-'}
Aksi Utama yang Harus Dilakukan:
${(recommendationData.aksiUtamaPendek || []).map((a, i) => `  ${i + 1}. ${a}`).join('\n')}

2. JANGKA MENENGAH (4 - 6 BULAN)
Kesimpulan yang Harus Dilakukan:
${recommendationData.kesimpulanMenengah || '-'}
Aksi Utama yang Harus Dilakukan:
${(recommendationData.aksiUtamaMenengah || []).map((a, i) => `  ${i + 1}. ${a}`).join('\n')}

---------------------------------------------------------
RINCIAN AKSI YANG HARUS DILAKUKAN PER ASPEK:
${recommendationData.recommendations
  .map(
    (rec, i) => `
${i + 1}. [${rec.timeframeLabel.toUpperCase()}] - ASPEK: ${rec.aspectLabel.toUpperCase()}
Kesimpulan yang Harus Dilakukan: ${rec.title}
Topik Masalah: ${rec.topikMasalah || '-'} (${rec.jenisKategori || '-'} / ${rec.pokokMasalah || '-'}${rec.topikCount ? ` - ${Math.round(Number(rec.topikCount)).toLocaleString('id-ID')} Tiket` : ''})
Aksi yang Harus Dilakukan:
${rec.actionSteps.map((step, sIdx) => `  ${sIdx + 1}. ${step}`).join('\n')}
`
  )
  .join('\n---------------------------------------------------------\n')}
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

  // Group filtered items by timeframe (only pendek & menengah)
  const groupedByTimeframe = useMemo(() => {
    const map = {
      pendek: [] as StrategicRecommendationItem[],
      menengah: [] as StrategicRecommendationItem[],
    };
    filteredRecommendations.forEach(item => {
      if (item.timeframe === 'pendek') map.pendek.push(item);
      else if (item.timeframe === 'menengah') map.menengah.push(item);
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
    };
  }, [recommendationData]);

  // Topics options for dropdown based on kategoriFocus
  const selectableTopics = useMemo(() => {
    if (kategoriFocus === 'Pengaduan') return activeBranchMetrics.topPengaduanList;
    if (kategoriFocus === 'Informasi') return activeBranchMetrics.topInformasiList;
    return activeBranchMetrics.topTopikList;
  }, [kategoriFocus, activeBranchMetrics]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="sms-super-mind-view">
      {/* HERO BANNER - SMS AI ANALISA PENGADUAN & INFORMASI */}
      <div className="hidden relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 text-white shadow-md">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-blue-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-extrabold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>SUPER MIND SENADA (SMS) — ANALISA PENGADUAN &amp; INFORMASI</span>
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <BrainCircuit className="w-6 h-6 text-indigo-400 shrink-0" />
              <span>Analisa Topik Masalah Pengaduan &amp; Informasi serta Aksi Perbaikan Layanan</span>
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed font-medium">
              Rekomendasi ringkas dan aksi nyata berbasis data Google Sheet untuk <strong>Perbaikan Mutu Layanan</strong> (fokus Pengaduan) serta <strong>Peningkatan Pemahaman &amp; Kepuasan Peserta</strong> (fokus Informasi).
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full lg:w-auto shrink-0">
            <button
              onClick={handleGenerateAiRecommendations}
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60 flex-1 sm:flex-initial"
              id="generate-sms-ai-btn"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Menganalisa...' : 'Analisa & Rekomendasi AI'}</span>
            </button>

            <button
              onClick={handleCopyFullReport}
              className="bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs flex-1 sm:flex-initial"
              title="Salin seluruh laporan ke clipboard"
              id="copy-full-sms-report-btn"
            >
              {copiedReport ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copiedReport ? 'Tersalin!' : 'Salin Laporan'}</span>
            </button>
          </div>
        </div>

        {/* ACTIVE DATASET CONTEXT BAR */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-2 text-slate-300">
            <span className="text-slate-400 font-bold flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              Unit Analisa:
            </span>
            <span className="bg-slate-800/90 border border-slate-700/80 px-2.5 py-1 rounded-lg text-white font-bold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              {displayKC}
            </span>
            {kwList.length > 0 && (
              <span className="bg-slate-800/90 border border-slate-700/80 px-2.5 py-1 rounded-lg text-white font-bold flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                {displayKEPWIL}
              </span>
            )}
            {blnList.length > 0 && (
              <span className="bg-slate-800/90 border border-slate-700/80 px-2.5 py-1 rounded-lg text-white font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                {displayBulan}
              </span>
            )}
          </div>

          <div className="text-xs sm:text-sm text-slate-300 flex items-center gap-3 flex-wrap">
            <span>
              Pengaduan: <strong className="text-rose-400 font-black tabular-nums">{Number(activeBranchMetrics.pengaduan).toLocaleString('id-ID')}</strong>
            </span>
            <span>•</span>
            <span>
              Informasi: <strong className="text-sky-400 font-black tabular-nums">{Number(activeBranchMetrics.informasi).toLocaleString('id-ID')}</strong>
            </span>
            <span>•</span>
            <span>
              Kepatuhan SLA:{' '}
              <strong className="text-emerald-400 font-black tabular-nums">
                {Number(activeBranchMetrics.slaCompliance || 0).toLocaleString('id-ID', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                %
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* PANEL UTAMA: REKOMENDASI PERBAIKAN PENGADUAN & INFORMASI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. REKOMENDASI PERBAIKAN MUTU LAYANAN & KEPUASAN PESERTA (PENGADUAN) */}
        <div className="bg-white border border-rose-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-rose-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <MessageSquareWarning className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-700 block">
                    Fokus 1: Perbaikan Mutu Layanan &amp; Kepuasan Peserta
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">
                    Rekomendasi Perbaikan Topik Pengaduan
                  </h3>
                </div>
              </div>
              <div className="text-right shrink-0 bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-xl">
                <span className="block text-xs font-bold text-rose-700 uppercase">Total Pengaduan</span>
                <span className="block text-xl sm:text-2xl font-black text-rose-700 tabular-nums">
                  {Number(activeBranchMetrics.pengaduan).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Daftar 5 - 10 Rekomendasi Perbaikan Pengaduan */}
            <div className="bg-rose-50/40 border border-rose-200/80 rounded-xl p-4 space-y-3">
              <span className="text-xs sm:text-sm font-black text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-rose-600 shrink-0" />
                Rekomendasi Perbaikan Mutu Layanan &amp; Kepuasan Peserta ({activeBranchMetrics.aksiPengaduanRingkas.length} Rekomendasi):
              </span>
              <ul className="space-y-2.5 text-sm sm:text-base text-slate-800 font-medium">
                {activeBranchMetrics.aksiPengaduanRingkas.map((aksi, i) => (
                  <li key={i} className="flex items-start gap-2.5 bg-white border border-rose-100 rounded-xl px-3.5 py-2.5 shadow-2xs">
                    <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center shrink-0 tabular-nums mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-snug">{aksi}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setKategoriFocus(kategoriFocus === 'Pengaduan' ? 'Semua' : 'Pengaduan');
              setSelectedTopikFilter('Semua');
            }}
            className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-sm transition-all cursor-pointer border flex items-center justify-center gap-2 ${
              kategoriFocus === 'Pengaduan'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
            }`}
          >
            <span>
              {kategoriFocus === 'Pengaduan'
                ? '✓ Menampilkan Rekomendasi Fokus Pengaduan (Klik untuk Semua)'
                : 'Tampilkan Rekomendasi Khusus Topik Pengaduan'}
            </span>
          </button>
        </div>

        {/* 2. REKOMENDASI PENINGKATAN PEMAHAMAN & KEPUASAN PESERTA (INFORMASI) */}
        <div className="bg-white border border-sky-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-sky-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <BookOpenCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700 block">
                    Fokus 2: Peningkatan Pemahaman &amp; Kepuasan Peserta
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">
                    Rekomendasi Perbaikan Topik Informasi
                  </h3>
                </div>
              </div>
              <div className="text-right shrink-0 bg-sky-50 border border-sky-200 px-3.5 py-1.5 rounded-xl">
                <span className="block text-xs font-bold text-sky-700 uppercase">Total Informasi</span>
                <span className="block text-xl sm:text-2xl font-black text-sky-700 tabular-nums">
                  {Number(activeBranchMetrics.informasi).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Daftar 5 - 10 Rekomendasi Perbaikan Informasi */}
            <div className="bg-sky-50/40 border border-sky-200/80 rounded-xl p-4 space-y-3">
              <span className="text-xs sm:text-sm font-black text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-sky-600 shrink-0" />
                Rekomendasi Peningkatan Pemahaman &amp; Kepuasan Peserta ({activeBranchMetrics.aksiInformasiRingkas.length} Rekomendasi):
              </span>
              <ul className="space-y-2.5 text-sm sm:text-base text-slate-800 font-medium">
                {activeBranchMetrics.aksiInformasiRingkas.map((aksi, i) => (
                  <li key={i} className="flex items-start gap-2.5 bg-white border border-sky-100 rounded-xl px-3.5 py-2.5 shadow-2xs">
                    <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 font-black text-xs flex items-center justify-center shrink-0 tabular-nums mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-snug">{aksi}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setKategoriFocus(kategoriFocus === 'Informasi' ? 'Semua' : 'Informasi');
              setSelectedTopikFilter('Semua');
            }}
            className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-sm transition-all cursor-pointer border flex items-center justify-center gap-2 ${
              kategoriFocus === 'Informasi'
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200'
            }`}
          >
            <span>
              {kategoriFocus === 'Informasi'
                ? '✓ Menampilkan Rekomendasi Fokus Informasi (Klik untuk Semua)'
                : 'Tampilkan Rekomendasi Khusus Topik Informasi'}
            </span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROL PANEL */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-xs space-y-3 transition-all">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="w-9 h-9 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 cursor-pointer transition-colors shrink-0"
              title={isFilterExpanded ? 'Sembunyikan Filter' : 'Buka Filter'}
              id="sms-filter-icon-toggle-btn"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm md:text-base font-black text-slate-800">
                  Filter Fokus Analisa, Tahap Waktu &amp; Aspek
                </h3>
                <div className="hidden sm:flex items-center gap-1.5 text-xs">
                  <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-md font-bold">
                    Fokus: {kategoriFocus}
                  </span>
                  <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-md font-bold">
                    Tahap: {timeframeFilter === 'all' ? 'Semua' : timeframeFilter}
                  </span>
                  <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-md font-bold">
                    Aspek: {aspectFilter === 'all' ? 'Semua' : aspectFilter}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-2xs shrink-0"
            id="toggle-sms-filter-btn"
          >
            <span>{isFilterExpanded ? 'Sembunyikan' : 'Buka Filter'}</span>
            {isFilterExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
        </div>

        {isFilterExpanded && (
          <div className="pt-3 border-t border-slate-100 space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 1. FOKUS KATEGORI ANALISA */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  1. Fokus Analisa Topik Masalah
                </label>
                <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200 flex-wrap">
                  <button
                    onClick={() => {
                      setKategoriFocus('Semua');
                      setSelectedTopikFilter('Semua');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      kategoriFocus === 'Semua'
                        ? 'bg-indigo-600 text-white shadow-3xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    Pengaduan &amp; Informasi
                  </button>
                  <button
                    onClick={() => {
                      setKategoriFocus('Pengaduan');
                      setSelectedTopikFilter('Semua');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      kategoriFocus === 'Pengaduan'
                        ? 'bg-rose-600 text-white shadow-3xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    Fokus Pengaduan
                  </button>
                  <button
                    onClick={() => {
                      setKategoriFocus('Informasi');
                      setSelectedTopikFilter('Semua');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      kategoriFocus === 'Informasi'
                        ? 'bg-sky-600 text-white shadow-3xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    Fokus Informasi
                  </button>
                </div>
              </div>

              {/* 2. TIMEFRAME TAB */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  2. Jangka Waktu Rekomendasi Strategi
                </label>
                <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200 flex-wrap">
                  <button
                    onClick={() => setTimeframeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      timeframeFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-3xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    Semua ({recommendationData?.recommendations?.length || 0})
                  </button>
                  <button
                    onClick={() => setTimeframeFilter('pendek')}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      timeframeFilter === 'pendek'
                        ? 'bg-amber-600 text-white shadow-3xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    Jangka Pendek 1-3 Bulan ({aspectStats.pendek})
                  </button>
                  <button
                    onClick={() => setTimeframeFilter('menengah')}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      timeframeFilter === 'menengah'
                        ? 'bg-blue-600 text-white shadow-3xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    Jangka Menengah 4-6 Bulan ({aspectStats.menengah})
                  </button>
                </div>
              </div>

              {/* 3. ASPECT TAB */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  3. Aspek Pelaksanaan
                </label>
                <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200 flex-wrap">
                  <button
                    onClick={() => setAspectFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      aspectFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-3xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setAspectFilter('people')}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      aspectFilter === 'people'
                        ? 'bg-purple-600 text-white shadow-3xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>People ({aspectStats.people})</span>
                  </button>
                  <button
                    onClick={() => setAspectFilter('proses')}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      aspectFilter === 'proses'
                        ? 'bg-emerald-600 text-white shadow-3xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Workflow className="w-3.5 h-3.5" />
                    <span>Proses ({aspectStats.proses})</span>
                  </button>
                  <button
                    onClick={() => setAspectFilter('tools')}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      aspectFilter === 'tools'
                        ? 'bg-sky-600 text-white shadow-3xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Tools ({aspectStats.tools})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* TOPIK MASALAH FILTER SELECTOR FROM GOOGLE SHEET */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                <Zap className="w-4 h-4 text-amber-500" />
                Pilih Topik Masalah Spesifik (Pengaduan / Informasi):
              </label>
              <div className="flex items-center gap-2 flex-1 max-w-2xl">
                <select
                  value={selectedTopikFilter}
                  onChange={e => setSelectedTopikFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  id="sms-topik-masalah-select"
                >
                  <option value="Semua">
                    Semua Topik {kategoriFocus !== 'Semua' ? kategoriFocus : 'Pengaduan & Informasi'} Tertinggi ({selectableTopics.length} Topik)
                  </option>
                  {selectableTopics.map((t, i) => (
                    <option key={`${t.id}-${i}`} value={t.topikMasalah}>
                      #{i + 1} [{t.jenisKategori}] {t.topikMasalah} — {t.pokokMasalah} ({Math.round(Number(t.count)).toLocaleString('id-ID')} Tiket)
                    </option>
                  ))}
                </select>
                {(selectedTopikFilter !== 'Semua' || kategoriFocus !== 'Semua') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTopikFilter('Semua');
                      setKategoriFocus('Semua');
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-bold shrink-0 cursor-pointer"
                  >
                    Reset Fokus
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RECOMMENDATION SECTIONS GROUPED BY 2 TIMEFRAMES */}
      <div className="space-y-8">
        {/* SECTION 1: JANGKA PENDEK (1 - 3 BULAN) */}
        {(timeframeFilter === 'all' || timeframeFilter === 'pendek') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b-2 border-amber-500/80">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-3xs">
                  1
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>1. Jangka Pendek (1 - 3 Bulan)</span>
                    <span className="text-xs text-amber-800 bg-amber-100 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-200">
                      Penanganan Cepat Pengaduan &amp; Kejelasan Informasi
                    </span>
                  </h3>
                </div>
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-amber-800 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200 tabular-nums">
                {groupedByTimeframe.pendek.length} Rekomendasi
              </span>
            </div>

            {/* KESIMPULAN & AKSI YANG HARUS DILAKUKAN - JANGKA PENDEK (1 - 3 BULAN) */}
            {recommendationData && (
              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black uppercase tracking-wider text-amber-900">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    Kesimpulan Jangka Pendek (1 - 3 Bulan) yang Harus Dilakukan:
                  </span>
                  <p className="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed">
                    {recommendationData.kesimpulanPendek}
                  </p>
                </div>

                {recommendationData.aksiUtamaPendek && recommendationData.aksiUtamaPendek.length > 0 && (
                  <div className="pt-2 border-t border-amber-200/80 space-y-2">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-amber-600 shrink-0" />
                      Aksi yang Harus Dilakukan (1 - 3 Bulan):
                    </span>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {recommendationData.aksiUtamaPendek.map((aksi, idx) => (
                        <li
                          key={idx}
                          className="bg-white border border-amber-200/90 rounded-xl px-3.5 py-2.5 flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs"
                        >
                          <span className="w-5 h-5 rounded-md bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0 tabular-nums mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-snug">{aksi}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

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
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-sm text-slate-500 font-medium">
                Tidak ada rekomendasi jangka pendek yang sesuai filter.
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: JANGKA MENENGAH (4 - 6 BULAN) */}
        {(timeframeFilter === 'all' || timeframeFilter === 'menengah') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b-2 border-blue-500/80">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-3xs">
                  2
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>2. Jangka Menengah (4 - 6 Bulan)</span>
                    <span className="text-xs text-blue-800 bg-blue-100 font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
                      Standarisasi Mutu Layanan &amp; Edukasi Terstruktur
                    </span>
                  </h3>
                </div>
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-blue-800 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 tabular-nums">
                {groupedByTimeframe.menengah.length} Rekomendasi
              </span>
            </div>

            {/* KESIMPULAN & AKSI YANG HARUS DILAKUKAN - JANGKA MENENGAH (4 - 6 BULAN) */}
            {recommendationData && (
              <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black uppercase tracking-wider text-blue-900">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    Kesimpulan Jangka Menengah (4 - 6 Bulan) yang Harus Dilakukan:
                  </span>
                  <p className="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed">
                    {recommendationData.kesimpulanMenengah}
                  </p>
                </div>

                {recommendationData.aksiUtamaMenengah && recommendationData.aksiUtamaMenengah.length > 0 && (
                  <div className="pt-2 border-t border-blue-200/80 space-y-2">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                      Aksi yang Harus Dilakukan (4 - 6 Bulan):
                    </span>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {recommendationData.aksiUtamaMenengah.map((aksi, idx) => (
                        <li
                          key={idx}
                          className="bg-white border border-blue-200/90 rounded-xl px-3.5 py-2.5 flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs"
                        >
                          <span className="w-5 h-5 rounded-md bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 tabular-nums mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-snug">{aksi}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

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
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-sm text-slate-500 font-medium">
                Tidak ada rekomendasi jangka menengah yang sesuai filter.
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
      icon: <Users className="w-4 h-4" />,
    },
    proses: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      badge: 'bg-emerald-600 text-white',
      text: 'text-emerald-950',
      icon: <Workflow className="w-4 h-4" />,
    },
    tools: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      badge: 'bg-sky-600 text-white',
      text: 'text-sky-950',
      icon: <Wrench className="w-4 h-4" />,
    },
  }[item.aspect] || {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    badge: 'bg-slate-700 text-white',
    text: 'text-slate-900',
    icon: <Zap className="w-4 h-4" />,
  };

  const isPengaduan = item.jenisKategori?.toLowerCase() === 'pengaduan';

  const impactStyle = {
    Kritis: 'bg-rose-100 text-rose-800 border-rose-200',
    Tinggi: 'bg-amber-100 text-amber-800 border-amber-200',
    Sedang: 'bg-blue-100 text-blue-800 border-blue-200',
  }[item.impactLevel] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group">
      <div className="space-y-3.5">
        {/* CARD TOP BADGES */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide ${aspectColor.badge}`}>
            {aspectColor.icon}
            <span>{item.aspectLabel}</span>
          </span>

          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${impactStyle}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Prioritas: {item.impactLevel}</span>
          </span>
        </div>

        {/* ACUAN TOPIK MASALAH GOOGLE SHEET BADGE */}
        {item.topikMasalah && (
          <div
            className={`rounded-xl p-3 space-y-1.5 border ${
              isPengaduan ? 'bg-rose-50/80 border-rose-200' : 'bg-sky-50/80 border-sky-200'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <span
                className={`text-xs font-black uppercase tracking-wider flex items-center gap-1 ${
                  isPengaduan ? 'text-rose-800' : 'text-sky-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                {isPengaduan ? 'Topik Pengaduan (Mutu Layanan)' : 'Topik Informasi (Pemahaman Peserta)'}
              </span>
              {typeof item.topikCount === 'number' && (
                <span
                  className={`text-xs tabular-nums font-black px-2.5 py-0.5 rounded-md ${
                    isPengaduan ? 'bg-rose-200/80 text-rose-950' : 'bg-sky-200/80 text-sky-950'
                  }`}
                >
                  {Math.round(Number(item.topikCount)).toLocaleString('id-ID')} Tiket
                </span>
              )}
            </div>
            <div className="text-sm font-black text-slate-900">{item.topikMasalah}</div>
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {item.jenisKategori && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                  Kategori: <strong>{item.jenisKategori}</strong>
                </span>
              )}
              {item.pokokMasalah && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                  Pokok: <strong>{item.pokokMasalah}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* KESIMPULAN REKOMENDASI YANG HARUS DILAKUKAN */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
          <span className="block text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">
            Kesimpulan yang Harus Dilakukan:
          </span>
          <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
            {item.title}
          </h4>
        </div>

        {/* ACTION STEPS CHECKLIST */}
        {item.actionSteps && item.actionSteps.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-700">
              <span className="flex items-center gap-1.5 text-slate-900">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                Aksi yang Harus Dilakukan:
              </span>
              {(() => {
                const totalSteps = item.actionSteps.length;
                const doneCount = item.actionSteps.filter((_, idx) => !!completedSteps[`${item.id}-step-${idx}`]).length;
                return (
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold text-xs tabular-nums ${
                      doneCount === totalSteps
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : doneCount > 0
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {doneCount}/{totalSteps} Selesai
                  </span>
                );
              })()}
            </div>

            <ul className="space-y-2">
              {item.actionSteps.map((step, sIdx) => {
                const stepKey = `${item.id}-step-${sIdx}`;
                const isDone = !!completedSteps[stepKey];
                return (
                  <li
                    key={sIdx}
                    onClick={() => onToggleStep(stepKey)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      isDone
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-indigo-50/40 hover:border-indigo-200'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-lg mt-0.5 flex items-center justify-center text-xs font-black shrink-0 tabular-nums transition-colors ${
                        isDone ? 'bg-emerald-600 text-white shadow-3xs' : 'border border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      {isDone ? '✓' : sIdx + 1}
                    </span>
                    <span className={`font-medium text-xs sm:text-sm leading-relaxed ${isDone ? 'line-through text-emerald-800 opacity-80' : ''}`}>
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
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm">
        <span className="text-xs text-slate-600 font-bold truncate">
          Unit: {item.targetBranch || 'Cabang Terpilih'}
        </span>

        <button
          onClick={onCopy}
          className="text-slate-600 hover:text-indigo-600 font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-colors p-1"
          title="Salin rincian rekomendasi"
        >
          {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          <span>{isCopied ? 'Tersalin' : 'Salin Aksi'}</span>
        </button>
      </div>
    </div>
  );
}
