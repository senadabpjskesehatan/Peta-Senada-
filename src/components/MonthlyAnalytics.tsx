import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { Info, HelpCircle, FileText, ArrowUpRight, TrendingUp, Sparkles, Award } from 'lucide-react';
import { CityData, MonthlyPerformance } from '../types';
import { parseNumericValue } from '../utils/sheetParser';

interface MonthlyAnalyticsProps {
  citiesData: CityData[];
  monthlyData: MonthlyPerformance[];
}

export default function MonthlyAnalytics({ citiesData, monthlyData }: MonthlyAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'volume' | 'sla' | 'satisfaction'>('volume');

  // Calculate global statistics across all cities
  const serviceTotals = useMemo(() => {
    let informasi = 0;
    let permintaan = 0;
    let pengaduan = 0;

    citiesData.forEach(c => {
      informasi += parseNumericValue(c.informasi);
      permintaan += parseNumericValue(c.permintaan);
      pengaduan += parseNumericValue(c.pengaduan);
    });

    const total = informasi + permintaan + pengaduan;
    const pctInfo = total > 0 ? Math.round((informasi / total) * 100) : 0;
    const pctMinta = total > 0 ? Math.round((permintaan / total) * 100) : 0;
    const pctAdu = total > 0 ? Math.round((pengaduan / total) * 100) : 0;

    return { informasi, permintaan, pengaduan, total, pctInfo, pctMinta, pctAdu };
  }, [citiesData]);

  // Pie chart data for current service types distribution
  const pieData = useMemo(() => {
    return [
      { name: 'Layanan Informasi', value: serviceTotals.informasi, color: '#6366f1' }, // Indigo
      { name: 'Permintaan Tindakan', value: serviceTotals.permintaan, color: '#14b8a6' }, // Teal
      { name: 'Pengaduan Layanan', value: serviceTotals.pengaduan, color: '#f59e0b' }, // Amber
    ];
  }, [serviceTotals]);

  // Generate automated analytical insights based on current datasets
  const insights = useMemo(() => {
    if (monthlyData.length < 2) return [];

    const lastMonth = monthlyData[monthlyData.length - 1];
    const prevMonth = monthlyData[monthlyData.length - 2];

    const lastTotal = lastMonth.informasi + lastMonth.permintaan + lastMonth.pengaduan;
    const prevTotal = prevMonth.informasi + prevMonth.permintaan + prevMonth.pengaduan;

    const pctChange = lastTotal > 0 ? Number((((lastTotal - prevTotal) / prevTotal) * 100).toFixed(1)) : 0;
    const changeDirection = pctChange >= 0 ? 'meningkat' : 'menurun';

    // Best and worst SLA compliant months
    let bestSlaMonth = monthlyData[0];
    let worstSlaMonth = monthlyData[0];

    monthlyData.forEach(m => {
      const currentSlaRate = m.slaOnTime / (m.slaOnTime + m.slaOverdue);
      const bestSlaRate = bestSlaMonth.slaOnTime / (bestSlaMonth.slaOnTime + bestSlaMonth.slaOverdue);
      const worstSlaRate = worstSlaMonth.slaOnTime / (worstSlaMonth.slaOnTime + worstSlaMonth.slaOverdue);

      if (currentSlaRate > bestSlaRate) bestSlaMonth = m;
      if (currentSlaRate < worstSlaRate) worstSlaMonth = m;
    });

    return [
      {
        id: 'ins_1',
        title: `Pertumbuhan Volume Laporan MoM`,
        desc: `Volume laporan bulan terakhir (${lastMonth.month}) mencapai ${lastTotal} laporan, ${changeDirection} ${Math.abs(pctChange)}% dibanding bulan ${prevMonth.month} (${prevTotal} laporan).`,
        type: pctChange >= 0 ? 'warning' : 'success'
      },
      {
        id: 'ins_2',
        title: `Performa Kepatuhan SLA Tertinggi`,
        desc: `Efisiensi penanganan terbaik tercatat pada bulan ${bestSlaMonth.month} dengan tingkat kepatuhan SLA mencapai ${Math.round((bestSlaMonth.slaOnTime / (bestSlaMonth.slaOnTime + bestSlaMonth.slaOverdue)) * 100)}%, ditopang respon cepat unit daerah.`,
        type: 'success'
      },
      {
        id: 'ins_3',
        title: `Rekomendasi Alokasi Unit`,
        desc: `Dominasi laporan ${serviceTotals.pctInfo}% berupa Layanan Informasi menyarankan penambahan asisten tanya-jawab virtual (AI Chatbot) guna mereduksi beban operator manual hingga 40%.`,
        type: 'info'
      }
    ];
  }, [monthlyData, serviceTotals]);

  // Format custom tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg text-xs text-slate-800">
          <p className="font-bold text-slate-800 mb-2">{label}</p>
          {payload.map((pld: any) => (
            <div key={pld.name} className="flex items-center gap-4 justify-between mt-1">
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pld.color }}></span>
                {pld.name}:
              </span>
              <span className="font-bold text-slate-800 font-mono">
                {pld.value} {pld.name.includes('Rate') || pld.name.includes('Kepatuhan') ? '%' : ''}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="analytics-summary-section" className="space-y-6">
      
      {/* 3-COLUMN METRICS WITH PERCENTAGE (JUMLAH & PERSENTASE) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LAYANAN INFORMASI */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Info className="h-5 w-5" />
            </div>
            <span className="text-2xl font-black font-mono text-indigo-600">{serviceTotals.pctInfo}%</span>
          </div>
          <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Layanan Informasi</span>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 mt-1">{serviceTotals.informasi} <span className="text-xs text-slate-400 font-normal">laporan</span></h2>
          
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000" style={{ width: `${serviceTotals.pctInfo}%` }}></div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 block font-medium">Pemberian edukasi, data regulasi, dan FAQ publik.</p>
        </div>

        {/* PERMINTAAN */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl group-hover:bg-teal-500/10 transition-all"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl border border-teal-100">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-2xl font-black font-mono text-teal-600">{serviceTotals.pctMinta}%</span>
          </div>
          <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Permintaan Tindakan</span>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 mt-1">{serviceTotals.permintaan} <span className="text-xs text-slate-400 font-normal">laporan</span></h2>
          
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-teal-600 h-full rounded-full transition-all duration-1000" style={{ width: `${serviceTotals.pctMinta}%` }}></div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 block font-medium">Permohonan bantuan lapangan, armada, atau perizinan fisik.</p>
        </div>

        {/* PENGADUAN */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <HelpCircle className="h-5 w-5" />
            </div>
            <span className="text-2xl font-black font-mono text-amber-600">{serviceTotals.pctAdu}%</span>
          </div>
          <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Pengaduan Layanan</span>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 mt-1">{serviceTotals.pengaduan} <span className="text-xs text-slate-400 font-normal">laporan</span></h2>
          
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${serviceTotals.pctAdu}%` }}></div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 block font-medium">Kritik, keluhan kerusakan fasilitas umum, atau pelanggaran.</p>
        </div>

      </div>

      {/* MONTHLY PERFORMANCE REPORT CARD & VISUALIZATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* RECHARTS TREND VIEWER: 8-columns */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between text-slate-800">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="text-indigo-600 h-5 w-5" />
                  Grafik Analitik Performa Bulanan
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Tren pertumbuhan jumlah laporan dan evaluasi penanganan operasional.</p>
              </div>

              {/* View Toggles */}
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setActiveTab('volume')}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeTab === 'volume' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-150'}`}
                >
                  Volume Laporan
                </button>
                <button
                  onClick={() => setActiveTab('sla')}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeTab === 'sla' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-150'}`}
                >
                  Target SLA
                </button>
                <button
                  onClick={() => setActiveTab('satisfaction')}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeTab === 'satisfaction' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-150'}`}
                >
                  Tingkat Kepuasan
                </button>
              </div>
            </div>

            {/* CHART WRAPPER */}
            <div className="h-[280px] w-full" id="monthly-analytics-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                {activeTab === 'volume' ? (
                  // STACKED AREA CHART FOR VOLUME
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInfo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMinta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAdu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                    <Area type="monotone" name="Layanan Informasi" dataKey="informasi" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorInfo)" stackId="1" />
                    <Area type="monotone" name="Permintaan Tindakan" dataKey="permintaan" stroke="#14b8a6" strokeWidth={2} fillOpacity={1} fill="url(#colorMinta)" stackId="1" />
                    <Area type="monotone" name="Pengaduan Layanan" dataKey="pengaduan" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorAdu)" stackId="1" />
                  </AreaChart>
                ) : activeTab === 'sla' ? (
                  // GROUPED BAR CHART FOR SLA COMPLIANCE
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                    <Bar name="SLA Selesai Tepat Waktu" dataKey="slaOnTime" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar name="SLA Terlambat/Overdue" dataKey="slaOverdue" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  // LINE CHART FOR CUSTOMER SATISFACTION RATE
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSatisfaction" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis domain={[50, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                    <Area type="monotone" name="Tingkat Kepuasan Publik" dataKey="satisfactionRate" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSatisfaction)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center text-[10px] text-slate-400">
            <span>Pembaharuan Terakhir: Realtime sesuai laporan masuk</span>
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-indigo-500" /> Didukung mesin analitik visual</span>
          </div>
        </div>

        {/* ANALYTICAL INSIGHT REPORT: 4-columns */}
        <div className="lg:col-span-4 bg-slate-50/70 rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs">
          <div>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-slate-200/80 pb-3">
              <Sparkles className="text-violet-600 h-5 w-5" />
              Laporan Analitis & Saran
            </h3>

            {/* Insights Stack */}
            <div className="space-y-4">
              {insights.map((ins) => {
                let colorClass = 'border-slate-200 bg-white text-slate-700 shadow-2xs';
                let tagColor = 'text-slate-600';
                
                if (ins.type === 'success') {
                  colorClass = 'border-emerald-200 bg-emerald-50/30 text-emerald-850 shadow-2xs';
                  tagColor = 'text-emerald-700';
                } else if (ins.type === 'warning') {
                  colorClass = 'border-amber-200 bg-amber-50/30 text-amber-850 shadow-2xs';
                  tagColor = 'text-amber-700';
                } else if (ins.type === 'info') {
                  colorClass = 'border-violet-200 bg-violet-50/30 text-violet-850 shadow-2xs';
                  tagColor = 'text-violet-700';
                }

                return (
                  <div key={ins.id} className={`p-3.5 rounded-2xl border text-xs leading-relaxed transition-all hover:scale-[1.01] ${colorClass}`}>
                    <h4 className={`font-bold flex items-center gap-1.5 mb-1 ${tagColor}`}>
                      <Award className="h-4.5 w-4.5" />
                      {ins.title}
                    </h4>
                    <p className="text-slate-600 font-sans leading-relaxed text-[11px]">{ins.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 p-3 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 shadow-2xs">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-[10px]">
              <span className="font-bold text-slate-800 block">Saran Optimalisasi Alur Kerja:</span>
              <span className="text-slate-500 block mt-0.5">Ubah prioritas penanganan untuk pengaduan dengan sisa SLA &lt; 24 jam.</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
