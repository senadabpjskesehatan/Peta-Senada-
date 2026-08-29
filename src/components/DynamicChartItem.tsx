import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Settings, Trash2, Database, FileSpreadsheet, RotateCw, CheckCircle, AlertCircle, BarChart2, TrendingUp, PieChart as PieIcon, Layers } from 'lucide-react';
import { DynamicChart, CityData, MonthlyPerformance } from '../types';
import { fetchSheetData, parseNumericValue } from '../utils/sheetParser';

interface DynamicChartItemProps {
  key?: string;
  chart: DynamicChart;
  onUpdate: (id: string, updated: Partial<DynamicChart>) => void;
  onDelete: (id: string) => void;
  localMonthlyData: MonthlyPerformance[];
  localCitiesData: CityData[];
}

export default function DynamicChartItem({
  chart,
  onUpdate,
  onDelete,
  localMonthlyData,
  localCitiesData
}: DynamicChartItemProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Define default charts colors
  const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981'];

  // Calculate local service type ratios for pie chart option
  const localServiceRatios = useMemo(() => {
    let informasi = 0;
    let permintaan = 0;
    let pengaduan = 0;
    localCitiesData.forEach(c => {
      informasi += parseNumericValue(c.informasi);
      permintaan += parseNumericValue(c.permintaan);
      pengaduan += parseNumericValue(c.pengaduan);
    });
    return [
      { layanan: 'Layanan Informasi', total: informasi },
      { layanan: 'Permintaan Tindakan', total: permintaan },
      { layanan: 'Pengaduan Layanan', total: pengaduan }
    ];
  }, [localCitiesData]);

  // Determine active dataset based on selection
  const activeDataset = useMemo(() => {
    if (chart.source === 'sheets') {
      return chart.syncedData || [];
    }

    // Default sources based on coordinate column configuration
    if (chart.xAxisColumn === 'layanan') {
      return localServiceRatios;
    }
    if (chart.xAxisColumn === 'name') {
      return localCitiesData;
    }
    return localMonthlyData;
  }, [chart, localMonthlyData, localCitiesData, localServiceRatios]);

  // Extract available columns based on dataset
  const currentColumns = useMemo(() => {
    if (chart.source === 'sheets') {
      return chart.columns || [];
    }
    if (chart.xAxisColumn === 'layanan') {
      return ['layanan', 'total'];
    }
    if (chart.xAxisColumn === 'name') {
      return ['name', 'informasi', 'permintaan', 'pengaduan', 'total', 'slaCompliance'];
    }
    return ['month', 'informasi', 'permintaan', 'pengaduan', 'slaOnTime', 'slaOverdue', 'satisfactionRate'];
  }, [chart]);

  // Fetch Columns & Rows from Google Sheet for this specific chart
  const handleFetchSheetData = async () => {
    if (!chart.sheetUrl) {
      setErrorMsg('Masukkan Link Google Sheet terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { data, columns } = await fetchSheetData(chart.sheetUrl);
      
      // Attempt smart column bindings
      const matchedX = columns.find(c => /bulan|month|tanggal|date|kota|city|layanan|kategori/i.test(c)) || columns[0] || '';
      const matchedY = columns.find(c => /jumlah|value|total|persen|sla/i.test(c)) || columns[1] || '';

      onUpdate(chart.id, {
        columns,
        syncedData: data,
        isSynced: true,
        lastSyncedAt: new Date().toLocaleTimeString(),
        xAxisColumn: chart.xAxisColumn || matchedX,
        yAxisColumn: chart.yAxisColumn || matchedY,
      });

    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal sinkronisasi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch source triggers defaults adjustment
  const handleSourceChange = (newSource: 'default' | 'sheets') => {
    if (newSource === 'default') {
      onUpdate(chart.id, {
        source: newSource,
        xAxisColumn: 'month',
        yAxisColumn: 'informasi',
        isSynced: false,
        syncedData: undefined,
        columns: undefined
      });
    } else {
      onUpdate(chart.id, {
        source: newSource,
        xAxisColumn: '',
        yAxisColumn: '',
        isSynced: false
      });
    }
    setErrorMsg(null);
  };

  const handleDatasetShortcut = (type: 'monthly' | 'cities' | 'services') => {
    if (type === 'monthly') {
      onUpdate(chart.id, { xAxisColumn: 'month', yAxisColumn: 'informasi' });
    } else if (type === 'cities') {
      onUpdate(chart.id, { xAxisColumn: 'name', yAxisColumn: 'slaCompliance' });
    } else {
      onUpdate(chart.id, { xAxisColumn: 'layanan', yAxisColumn: 'total' });
    }
  };

  // Render the selected Recharts visualization type
  const renderChart = () => {
    if (activeDataset.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[180px] text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4">
          <Database className="h-8 w-8 text-slate-300 mb-2 animate-pulse" />
          <p className="text-xs font-bold text-slate-650 text-center">Data Kosong / Belum Dihubungkan</p>
          <p className="text-[10px] text-slate-400 text-center mt-0.5">Buka setelan grafik untuk mengatur sumber data.</p>
        </div>
      );
    }

    const xKey = chart.xAxisColumn;
    const yKey = chart.yAxisColumn;

    if (!xKey || !yKey) {
      return (
        <div className="flex flex-col items-center justify-center h-[180px] text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4">
          <AlertCircle className="h-8 w-8 text-amber-500 mb-2 animate-bounce" />
          <p className="text-xs font-bold text-slate-650 text-center">Kolom Belum Dipilih</p>
          <p className="text-[10px] text-slate-400 text-center mt-0.5">Silakan pilih kolom Sumbu X dan Sumbu Y di pengaturan.</p>
        </div>
      );
    }

    // Prepare data with safeguards and aggregate duplicate X values (summing Y values) with date in text format
    const aggregatedMap = new Map<string, any>();

    activeDataset.forEach((row, idx) => {
      const rawX = row[xKey] !== undefined ? String(row[xKey]).trim() : `Item ${idx + 1}`;
      const rawY = row[yKey];
      const numericY = typeof rawY === 'number' ? rawY : parseFloat(String(rawY).replace(/[^0-9.-]/g, '')) || 0;

      if (aggregatedMap.has(rawX)) {
        const existing = aggregatedMap.get(rawX);
        existing[yKey] = (existing[yKey] || 0) + numericY;
      } else {
        aggregatedMap.set(rawX, {
          ...row,
          [xKey]: rawX,
          [yKey]: numericY
        });
      }
    });

    const formattedData = Array.from(aggregatedMap.values());

    // Custom Tooltip for dynamic keys
    const CustomDynamicTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const item = payload[0];
        return (
          <div className="bg-white border border-slate-200 p-2.5 rounded-xl text-[11px] shadow-lg text-slate-800">
            <p className="font-bold text-slate-400 mb-1">{String(item.payload[xKey])}</p>
            <p className="font-bold text-slate-700">
              {String(yKey)}: <span className="font-mono text-indigo-650">{item.value}</span>
            </p>
          </div>
        );
      }
      return null;
    };

    switch (chart.type) {
      case 'line':
        return (
          <LineChart data={formattedData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={xKey} stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
            <Tooltip content={<CustomDynamicTooltip />} />
            <Line type="monotone" name={yKey} dataKey={yKey} stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 6 }} />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={formattedData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={xKey} stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
            <Tooltip content={<CustomDynamicTooltip />} />
            <Bar name={yKey} dataKey={yKey} fill="#14b8a6" radius={[3, 3, 0, 0]} />
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart data={formattedData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
            <defs>
              <linearGradient id={`colorGrad-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={xKey} stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
            <Tooltip content={<CustomDynamicTooltip />} />
            <Area type="monotone" name={yKey} dataKey={yKey} stroke="#8b5cf6" strokeWidth={2} fill={`url(#colorGrad-${chart.id})`} />
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <Tooltip content={<CustomDynamicTooltip />} />
            <Pie
              data={formattedData}
              dataKey={yKey}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={65}
              innerRadius={30}
              paddingAngle={2}
              fill="#8884d8"
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all group" id={`chart-card-${chart.id}`}>
      
      {/* CHART HEADER */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1">
          {chart.type === 'line' ? <TrendingUp className="text-indigo-600 h-4.5 w-4.5" /> :
           chart.type === 'bar' ? <BarChart2 className="text-teal-600 h-4.5 w-4.5" /> :
           chart.type === 'pie' ? <PieIcon className="text-amber-600 h-4.5 w-4.5" /> :
           <Layers className="text-purple-600 h-4.5 w-4.5" />}
          
          <input
            type="text"
            value={chart.title}
            onChange={(e) => onUpdate(chart.id, { title: e.target.value })}
            className="bg-transparent border-none text-slate-800 font-extrabold text-sm focus:bg-slate-55 px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full font-sans"
            placeholder="Judul Grafik Baru"
            id={`chart-title-input-${chart.id}`}
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 rounded-lg transition-all border cursor-pointer ${showConfig ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'hover:bg-slate-50 border-transparent text-slate-400 hover:text-slate-600'}`}
            title="Setelan grafik"
            id={`chart-settings-toggle-${chart.id}`}
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(chart.id)}
            className="p-1.5 hover:bg-rose-50 border border-transparent rounded-lg text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
            title="Hapus grafik"
            id={`chart-delete-button-${chart.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* QUICK DATASET & GOOGLE SHEET SYNC SELECTOR BAR */}
      <div className="flex items-center justify-between gap-2 bg-slate-50/90 px-3 py-2 rounded-xl border border-slate-200/85 text-xs mb-3 shadow-3xs">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Database className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          <span className="text-[10px] text-slate-500 font-bold shrink-0">Data:</span>
          <select
            value={chart.source === 'sheets' ? 'sheets' : chart.xAxisColumn}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'sheets') {
                onUpdate(chart.id, { source: 'sheets' });
              } else if (val === 'month') {
                onUpdate(chart.id, { source: 'default', xAxisColumn: 'month', yAxisColumn: 'informasi' });
              } else if (val === 'name') {
                onUpdate(chart.id, { source: 'default', xAxisColumn: 'name', yAxisColumn: 'slaCompliance' });
              } else if (val === 'layanan') {
                onUpdate(chart.id, { source: 'default', xAxisColumn: 'layanan', yAxisColumn: 'total' });
              }
            }}
            className="bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate cursor-pointer shadow-3xs w-full"
            title="Pilih Sumber Data Grafik"
          >
            <option value="month">Data Bulanan Tersinkron</option>
            <option value="name">Data Kota & Cabang</option>
            <option value="layanan">Rasio Kategori Layanan</option>
            <option value="sheets">{chart.isSynced ? `Google Sheet (${chart.syncedData?.length || 0} baris tersinkron)` : 'Google Sheet (Tambah/Sinkron Data Baru)'}</option>
          </select>
        </div>
        
        <button
          type="button"
          onClick={() => {
            onUpdate(chart.id, { source: 'sheets' });
            setShowConfig(true);
          }}
          className="text-[10px] text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors shrink-0 flex items-center gap-1 cursor-pointer shadow-3xs"
          title="Sinkron Kembali atau Tambah Data Baru Google Sheet"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-600" />
          <span>{chart.isSynced ? 'Sinkron Ulang' : 'Sinkron Sheet'}</span>
        </button>
      </div>

      {/* RENDER DYNAMIC CHART AREA */}
      <div className="relative h-[200px] w-full mt-2" id={`chart-render-${chart.id}`}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* CHART CONFIGURATION COLLAPSIBLE DRAWER */}
      {showConfig && (
        <div className="mt-4 p-4 border-t border-slate-100 bg-slate-50/70 rounded-2xl space-y-4 animate-slideDown text-xs text-slate-650 relative z-30 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-2">
            <span className="font-bold text-slate-850 uppercase tracking-wider text-[10px]">Konfigurasi Grafik</span>
            <span className="text-[10px] text-slate-400 font-mono">ID: {chart.id}</span>
          </div>

          {/* Chart Type */}
          <div>
            <label className="block text-[11px] text-slate-500 font-bold mb-1.5">Tipe Visualisasi</label>
            <div className="grid grid-cols-4 gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              {(['line', 'bar', 'pie', 'area'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onUpdate(chart.id, { type: t })}
                  className={`py-1.5 rounded-lg capitalize font-bold text-[10px] transition-all cursor-pointer ${chart.type === t ? 'bg-white text-slate-800 shadow-2xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {t === 'pie' ? 'lingkar' : t === 'area' ? 'wilayah' : t === 'bar' ? 'batang' : 'garis'}
                </button>
              ))}
            </div>
          </div>

          {/* Data Source Toggle */}
          <div>
            <label className="block text-[11px] text-slate-500 font-bold mb-1.5">Sumber Data</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleSourceChange('default')}
                className={`py-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer ${chart.source === 'default' ? 'bg-white text-slate-800 shadow-2xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Database className="h-3.5 w-3.5" />
                Data Lokal
              </button>
              <button
                type="button"
                onClick={() => handleSourceChange('sheets')}
                className={`py-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer ${chart.source === 'sheets' ? 'bg-white text-slate-800 shadow-2xs border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Google Sheet
              </button>
            </div>
          </div>

          {/* IF DEFAULT SOURCE: Show presets */}
          {chart.source === 'default' && (
            <div className="space-y-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <p className="text-[10px] text-slate-500 font-bold mb-1.5">Pilih Kumpulan Data Lokal:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleDatasetShortcut('monthly')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${chart.xAxisColumn === 'month' ? 'bg-indigo-50 text-indigo-700 border-indigo-250' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-650'}`}
                >
                  Tren Laporan Bulanan
                </button>
                <button
                  type="button"
                  onClick={() => handleDatasetShortcut('cities')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${chart.xAxisColumn === 'name' ? 'bg-indigo-50 text-indigo-700 border-indigo-250' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-650'}`}
                >
                  Kepatuhan SLA Kota
                </button>
                <button
                  type="button"
                  onClick={() => handleDatasetShortcut('services')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${chart.xAxisColumn === 'layanan' ? 'bg-indigo-50 text-indigo-700 border-indigo-250' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-650'}`}
                >
                  Rasio Kategori Layanan
                </button>
              </div>
            </div>
          )}

          {/* IF GOOGLE SHEET SOURCE: URL and sync */}
          {chart.source === 'sheets' && (
            <div className="space-y-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-1">Link Google Sheets</label>
                <div className="flex gap-1.5 mt-1">
                  <input
                    type="text"
                    placeholder="Masukkan link Google Sheet..."
                    value={chart.sheetUrl}
                    onChange={(e) => onUpdate(chart.id, { sheetUrl: e.target.value })}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 min-w-0 font-medium"
                    id={`chart-sheet-url-input-${chart.id}`}
                  />
                  <button
                    type="button"
                    onClick={handleFetchSheetData}
                    disabled={isLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all disabled:opacity-50 flex items-center gap-0.5 shrink-0 cursor-pointer shadow-2xs"
                    id={`chart-fetch-sheet-${chart.id}`}
                  >
                    {isLoading ? <RotateCw className="h-3 w-3 animate-spin" /> : 'Sinkron'}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[10px] flex gap-1 items-start">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {chart.isSynced && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-[10px] flex items-center gap-1 justify-between">
                  <span className="flex items-center gap-1 font-bold">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Terhubung ({chart.syncedData?.length} baris)
                  </span>
                  <span className="text-[8px] text-slate-400 font-mono">SLA: {chart.lastSyncedAt}</span>
                </div>
              )}
            </div>
          )}

          {/* COLUMN CONFIGURATORS */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1.5">Sumbu X (Label)</label>
              <select
                value={chart.xAxisColumn}
                onChange={(e) => onUpdate(chart.id, { xAxisColumn: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                id={`chart-xaxis-select-${chart.id}`}
              >
                <option value="">-- Pilih Kolom X --</option>
                {currentColumns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1.5">Sumbu Y (Metrik)</label>
              <select
                value={chart.yAxisColumn}
                onChange={(e) => onUpdate(chart.id, { yAxisColumn: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                id={`chart-yaxis-select-${chart.id}`}
              >
                <option value="">-- Pilih Kolom Y --</option>
                {currentColumns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-4 rounded-xl text-[10px] transition-colors cursor-pointer shadow-2xs"
              id={`close-config-button-${chart.id}`}
            >
              Simpan & Selesai
            </button>
          </div>
        </div>
      )}

      {/* CHART SUBFOOTER STATS */}
      <div className="mt-4 border-t border-slate-100 pt-2 flex items-center justify-between text-[9px] text-slate-400 font-medium">
        <span className="capitalize">Sumber: {chart.source === 'sheets' ? 'Google Sheet' : 'Sistem Lokal'}</span>
        {chart.source === 'sheets' && chart.isSynced && (
          <span className="text-emerald-600 font-bold flex items-center gap-0.5">
            <span className="w-1 h-1 rounded-full bg-emerald-500"></span> Synced
          </span>
        )}
      </div>

    </div>
  );
}
