import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts';
import { Settings, Trash2, Database, FileSpreadsheet, RotateCw, CheckCircle, AlertCircle, BarChart2, TrendingUp, PieChart as PieIcon, Layers, Shield, Globe, Activity, Target, Award, Zap, Hash } from 'lucide-react';
import { DynamicChart, CityData, MonthlyPerformance, DataLabelMode } from '../types';
import { fetchSheetData, parseNumericValue } from '../utils/sheetParser';
import { isBulanMatching, isKepwilMatching, isKantorCabangMatching } from '../utils/monthHelper';

interface DynamicChartItemProps {
  key?: string;
  chart: DynamicChart;
  onUpdate: (id: string, updated: Partial<DynamicChart>) => void;
  onDelete: (id: string) => void;
  localMonthlyData: MonthlyPerformance[];
  localCitiesData: CityData[];
  onExecuteSync?: () => Promise<void>;
  isSyncing?: boolean;
  isAdmin?: boolean;
  onRequestAdminLogin?: () => void;
  selectedBulan?: string | string[];
  selectedKepwil?: string | string[];
  selectedKantorCabang?: string | string[];
}

export default function DynamicChartItem({
  chart,
  onUpdate,
  onDelete,
  localMonthlyData,
  localCitiesData,
  onExecuteSync,
  isSyncing = false,
  isAdmin = false,
  onRequestAdminLogin,
  selectedBulan,
  selectedKepwil,
  selectedKantorCabang
}: DynamicChartItemProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Define default charts colors
  const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981'];

  // Clean, parse, and structure geo-synced cities dataset for charts (strictly aggregated by unique KC name)
  const geoSyncedDataset = useMemo(() => {
    if (!localCitiesData || localCitiesData.length === 0) return [];

    const map: Record<string, {
      id: string;
      name: string;
      informasi: number;
      permintaan: number;
      pengaduan: number;
      total: number;
      slaSum: number;
      slaDaysSum: number;
      count: number;
      extraProps: Record<string, any>;
    }> = {};

    localCitiesData.forEach((c, idx) => {
      const rawName = (c.name || `KC_${idx + 1}`).trim();
      if (!rawName) return;
      const cleanKey = rawName.toLowerCase().trim();

      const info = parseNumericValue(c.informasi);
      const perm = parseNumericValue(c.permintaan);
      const peng = parseNumericValue(c.pengaduan);
      const sla = parseNumericValue(c.slaCompliance) || 90;
      const slaDays = parseNumericValue(c.avgSlaDays) || 2.4;

      if (!map[cleanKey]) {
        map[cleanKey] = {
          id: c.id || `kc_chart_${idx}_${cleanKey}`,
          name: rawName,
          informasi: 0,
          permintaan: 0,
          pengaduan: 0,
          total: 0,
          slaSum: 0,
          slaDaysSum: 0,
          count: 0,
          extraProps: { ...c }
        };
      }

      map[cleanKey].informasi += info;
      map[cleanKey].permintaan += perm;
      map[cleanKey].pengaduan += peng;
      map[cleanKey].slaSum += sla;
      map[cleanKey].slaDaysSum += slaDays;
      map[cleanKey].count += 1;
    });

    return Object.entries(map).map(([_, item]) => {
      const calculatedTotal = item.informasi + item.permintaan + item.pengaduan;
      const total = calculatedTotal > 0 ? calculatedTotal : (parseNumericValue(item.extraProps?.total) || 0);
      const avgSla = item.count > 0 ? Math.round(item.slaSum / item.count) : 90;
      const avgSlaDays = item.count > 0 ? Number((item.slaDaysSum / item.count).toFixed(1)) : 2.4;

      return {
        ...item.extraProps,
        id: item.id,
        name: item.name,
        informasi: item.informasi,
        permintaan: item.permintaan,
        pengaduan: item.pengaduan,
        total: total,
        avgSlaDays: avgSlaDays,
        slaCompliance: Math.min(100, Math.max(0, avgSla))
      };
    });
  }, [localCitiesData]);

  // Filter synced sheet data if filters are active and matching columns exist
  const filteredSyncedData = useMemo(() => {
    if (!chart.syncedData || chart.syncedData.length === 0) return [];
    return chart.syncedData.filter((row: any) => {
      let rowBulan = '';
      let rowKepwil = '';
      let rowKC = '';

      for (const [k, v] of Object.entries(row)) {
        const keyLower = k.toLowerCase().trim();
        const valStr = String(v || '').trim();
        if (/bulan|month|periode|bln/i.test(keyLower) && !rowBulan) {
          rowBulan = valStr;
        }
        if (/kepwil|kedeputian.*wilayah|kanwil|regional/i.test(keyLower) && !rowKepwil) {
          rowKepwil = valStr;
        }
        if (/kantor.*cabang|kc|cabang|kota|city/i.test(keyLower) && !rowKC) {
          rowKC = valStr;
        }
      }

      if (selectedBulan && selectedBulan !== 'Semua' && rowBulan && !isBulanMatching(rowBulan, selectedBulan)) {
        return false;
      }
      if (selectedKepwil && selectedKepwil !== 'Semua' && rowKepwil && !isKepwilMatching(rowKepwil, selectedKepwil)) {
        return false;
      }
      if (selectedKantorCabang && selectedKantorCabang !== 'Semua' && rowKC && !isKantorCabangMatching(rowKC, selectedKantorCabang)) {
        return false;
      }
      return true;
    });
  }, [chart.syncedData, selectedBulan, selectedKepwil, selectedKantorCabang]);

  // Determine active dataset based on selection (Default source uses geo-synced dataset from Google Sheets / Geo Mapping)
  const activeDataset = useMemo(() => {
    if (chart.source === 'sheets') {
      return filteredSyncedData;
    }
    return geoSyncedDataset;
  }, [chart.source, filteredSyncedData, geoSyncedDataset]);

  // Extract available columns based on dataset (dynamically derived from geo-synced data)
  const currentColumns = useMemo(() => {
    if (chart.source === 'sheets') {
      if (chart.columns && chart.columns.length > 0) return chart.columns;
      if (chart.syncedData && chart.syncedData.length > 0) {
        return Object.keys(chart.syncedData[0]);
      }
      return ['name', 'informasi', 'permintaan', 'pengaduan', 'total', 'avgSlaDays', 'slaCompliance'];
    }

    if (geoSyncedDataset && geoSyncedDataset.length > 0) {
      const keys = Object.keys(geoSyncedDataset[0]).filter(k => k !== 'id' && k !== 'latitude' && k !== 'longitude');
      const standardOrder = ['name', 'informasi', 'permintaan', 'pengaduan', 'total', 'avgSlaDays', 'slaCompliance'];
      const extraKeys = keys.filter(k => !standardOrder.includes(k));
      return [...standardOrder.filter(k => keys.includes(k)), ...extraKeys];
    }
    return ['name', 'informasi', 'permintaan', 'pengaduan', 'total', 'avgSlaDays', 'slaCompliance'];
  }, [chart.source, chart.columns, chart.syncedData, geoSyncedDataset]);

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
      const matchedX = columns.find(c => /kc|kantor|kota|city|nama|layanan|kategori/i.test(c)) || columns[0] || '';
      const matchedY = columns.find(c => /jumlah|value|total|info|minta|aduan|persen|sla/i.test(c)) || columns[1] || '';

      onUpdate(chart.id, {
        columns,
        syncedData: data,
        isSynced: true,
        lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
        xAxisColumn: chart.xAxisColumn || matchedX,
        xAxisColumns: chart.xAxisColumns && chart.xAxisColumns.length > 0 ? chart.xAxisColumns : [matchedX],
        yAxisColumn: chart.yAxisColumn || matchedY,
        yAxisColumns: chart.yAxisColumns && chart.yAxisColumns.length > 0 ? chart.yAxisColumns : [matchedY],
        pieColumns: chart.pieColumns && chart.pieColumns.length > 0 ? chart.pieColumns : [matchedX, matchedY]
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
        xAxisColumn: 'name',
        xAxisColumns: ['name'],
        yAxisColumns: ['informasi', 'permintaan', 'pengaduan'],
        pieColumns: ['informasi', 'permintaan', 'pengaduan'],
        yAxisColumn: '',
        isSynced: true,
        syncedData: [],
        columns: []
      });
    } else {
      onUpdate(chart.id, {
        source: newSource,
        xAxisColumn: '',
        xAxisColumns: [],
        yAxisColumns: [],
        pieColumns: [],
        yAxisColumn: '',
        isSynced: false
      });
    }
    setErrorMsg(null);
  };

  const handleDatasetShortcut = (type: 'monthly' | 'cities' | 'services') => {
    if (type === 'monthly') {
      onUpdate(chart.id, { xAxisColumn: 'month', yAxisColumns: ['informasi'] });
    } else if (type === 'cities') {
      onUpdate(chart.id, { xAxisColumn: 'name', yAxisColumns: ['slaCompliance'] });
    } else {
      onUpdate(chart.id, { xAxisColumn: 'layanan', yAxisColumns: ['total'] });
    }
  };

  const currentLabelMode: DataLabelMode = chart.dataLabelMode || (chart.showDataLabels === false ? 'none' : chart.showDataLabels === true ? 'value' : 'none');

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

    const SERIES_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#3b82f6'];

    // PIE CHART SPECIFIC RENDERING (Single Axis with 1 or more columns selected)
    if (chart.type === 'pie') {
      const selectedPieCols = chart.pieColumns && chart.pieColumns.length > 0 
        ? chart.pieColumns 
        : (chart.yAxisColumns && chart.yAxisColumns.length > 0 
            ? Array.from(new Set([...(chart.xAxisColumns || (chart.xAxisColumn ? [chart.xAxisColumn] : [])), ...chart.yAxisColumns]))
            : (chart.xAxisColumns || (chart.xAxisColumn ? [chart.xAxisColumn] : [])));
      const pieCols = Array.from(new Set(selectedPieCols)).filter(Boolean);

      if (pieCols.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-[180px] text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4">
            <AlertCircle className="h-8 w-8 text-amber-500 mb-2 animate-bounce" />
            <p className="text-xs font-bold text-slate-650 text-center">Kolom Belum Dipilih</p>
            <p className="text-[10px] text-slate-400 text-center mt-0.5">Silakan pilih minimal satu kolom untuk grafik lingkaran di pengaturan.</p>
          </div>
        );
      }

      // Check which selected columns are numeric and which are categorical
      const numericCols = pieCols.filter(col => {
        return activeDataset.some(row => {
          const val = row[col];
          if (typeof val === 'number') return true;
          if (typeof val === 'string' && val.trim() !== '') {
            const parsed = parseFloat(val.replace(/[^0-9.-]/g, ''));
            return !isNaN(parsed);
          }
          return false;
        });
      });
      const categoricalCols = pieCols.filter(col => !numericCols.includes(col));

      let pieChartData: { name: string; value: number }[] = [];

      if (categoricalCols.length > 0 && numericCols.length > 0) {
        const agg = new Map<string, number>();
        activeDataset.forEach((row, idx) => {
          const name = categoricalCols.map(c => row[c] !== undefined ? String(row[c]).trim() : '').filter(Boolean).join(' - ') || `Item ${idx + 1}`;
          const sumVal = numericCols.reduce((acc, col) => {
            const raw = row[col];
            const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.-]/g, '')) || 0;
            return acc + num;
          }, 0);
          agg.set(name, (agg.get(name) || 0) + sumVal);
        });
        pieChartData = Array.from(agg.entries()).map(([name, value]) => ({ name, value }));
      } else if (categoricalCols.length === 0 && numericCols.length > 0) {
        if (numericCols.length === 1 && activeDataset.length > 1) {
          const numCol = numericCols[0];
          const labelKey = Object.keys(activeDataset[0] || {}).find(k => k !== numCol && k !== 'id' && isNaN(Number(activeDataset[0][k])));
          pieChartData = activeDataset.map((row, idx) => {
            const name = labelKey && row[labelKey] ? String(row[labelKey]) : `Item ${idx + 1}`;
            const raw = row[numCol];
            const value = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.-]/g, '')) || 0;
            return { name, value };
          });
        } else {
          pieChartData = numericCols.map(col => {
            const total = activeDataset.reduce((acc, row) => {
              const raw = row[col];
              const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.-]/g, '')) || 0;
              return acc + num;
            }, 0);
            return { name: col, value: total };
          });
        }
      } else if (categoricalCols.length > 0 && numericCols.length === 0) {
        const agg = new Map<string, number>();
        activeDataset.forEach((row, idx) => {
          const name = categoricalCols.map(c => row[c] !== undefined ? String(row[c]).trim() : '').filter(Boolean).join(' - ') || `Item ${idx + 1}`;
          agg.set(name, (agg.get(name) || 0) + 1);
        });
        pieChartData = Array.from(agg.entries()).map(([name, value]) => ({ name, value }));
      }

      const totalPieValue = pieChartData.reduce((acc, curr) => acc + (typeof curr.value === 'number' ? curr.value : parseNumericValue(curr.value) || 0), 0);

      const renderPieLabel = (entry: any) => {
        if (currentLabelMode === 'none') return false;
        const val = entry?.value;
        const num = typeof val === 'number' ? val : parseNumericValue(val) || 0;
        if (currentLabelMode === 'percent') {
          const pct = typeof entry?.percent === 'number' 
            ? entry.percent * 100 
            : (totalPieValue > 0 ? (num / totalPieValue) * 100 : 0);
          return `${pct.toFixed(1).replace(/\.0$/, '')}%`;
        }
        return num.toLocaleString('id-ID');
      };

      return (
        <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <Tooltip 
            formatter={(val: any, name: any) => [`${Number(val).toLocaleString('id-ID')}`, String(name)]}
            contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 600, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Pie
            data={pieChartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={65}
            innerRadius={30}
            paddingAngle={2}
            fill="#8884d8"
            label={currentLabelMode !== 'none' ? renderPieLabel : false}
          >
            {pieChartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
            ))}
          </Pie>
          <Legend wrapperStyle={{ fontSize: '10px' }} />
        </PieChart>
      );
    }

    // LINE, BAR, AREA CHARTS
    const xKeys = chart.xAxisColumns && chart.xAxisColumns.length > 0 
      ? chart.xAxisColumns 
      : chart.xAxisColumn 
      ? [chart.xAxisColumn] 
      : [];
    const yKeys = chart.yAxisColumns && chart.yAxisColumns.length > 0 
      ? chart.yAxisColumns 
      : chart.yAxisColumn 
      ? [chart.yAxisColumn] 
      : [];

    if (xKeys.length === 0 || yKeys.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[180px] text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4">
          <AlertCircle className="h-8 w-8 text-amber-500 mb-2 animate-bounce" />
          <p className="text-xs font-bold text-slate-650 text-center">Kolom Belum Dipilih</p>
          <p className="text-[10px] text-slate-400 text-center mt-0.5">Silakan pilih minimal satu Sumbu X dan satu Sumbu Y di pengaturan.</p>
        </div>
      );
    }

    // Prepare data with safeguards and aggregate duplicate X values (summing volume metrics, averaging percentage/SLA metrics)
    const aggregatedMap = new Map<string, { baseRow: any; counts: Record<string, number>; sums: Record<string, number> }>();
    const effectiveXKey = '_combinedX';

    activeDataset.forEach((row, idx) => {
      const parts = xKeys.map(xk => row[xk] !== undefined ? String(row[xk]).trim() : '');
      const rawX = parts.filter(Boolean).join(' - ') || `Item ${idx + 1}`;
      
      if (!aggregatedMap.has(rawX)) {
        const baseRow = { ...row, [effectiveXKey]: rawX };
        const counts: Record<string, number> = {};
        const sums: Record<string, number> = {};

        yKeys.forEach(yk => {
          const rawY = row[yk];
          const numericY = parseNumericValue(rawY);
          sums[yk] = numericY;
          counts[yk] = 1;
        });

        aggregatedMap.set(rawX, { baseRow, counts, sums });
      } else {
        const item = aggregatedMap.get(rawX)!;
        yKeys.forEach(yk => {
          const rawY = row[yk];
          const numericY = parseNumericValue(rawY);
          item.sums[yk] = (item.sums[yk] || 0) + numericY;
          item.counts[yk] = (item.counts[yk] || 0) + 1;
        });
      }
    });

    const formattedData = Array.from(aggregatedMap.values()).map(item => {
      const row = { ...item.baseRow };
      yKeys.forEach(yk => {
        const isAverageMetric = /sla|compliance|persen|percent|kepatuhan|rate|avg/i.test(yk);
        const count = item.counts[yk] || 1;
        const total = item.sums[yk] || 0;
        row[yk] = isAverageMetric ? Number((total / count).toFixed(1)) : total;
      });
      return row;
    });

    const formatDataLabel = (val: any, index?: any) => {
      if (currentLabelMode === 'none') return '';
      const num = typeof val === 'number' ? val : parseNumericValue(val) || 0;
      if (currentLabelMode === 'percent') {
        const row = typeof index === 'number' ? formattedData[index] : (typeof index === 'object' && index?.payload ? index.payload : null);
        if (yKeys.length > 1 && row) {
          let pointTotal = 0;
          yKeys.forEach(yk => {
            pointTotal += (typeof row[yk] === 'number' ? row[yk] : parseNumericValue(row[yk])) || 0;
          });
          if (pointTotal <= 0) return '0%';
          const pct = (num / pointTotal) * 100;
          return `${pct.toFixed(1).replace(/\.0$/, '')}%`;
        } else {
          const yk = yKeys[0] || '';
          const seriesTotal = formattedData.reduce((acc, r) => acc + (typeof r[yk] === 'number' ? r[yk] : parseNumericValue(r[yk]) || 0), 0);
          if (seriesTotal <= 0) return '0%';
          const pct = (num / seriesTotal) * 100;
          return `${pct.toFixed(1).replace(/\.0$/, '')}%`;
        }
      }
      return num.toLocaleString('id-ID');
    };

    // Custom Tooltip for dynamic keys
    const CustomDynamicTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const item = payload[0];
        return (
          <div className="bg-white border border-slate-200 p-2.5 rounded-xl text-[11px] shadow-lg text-slate-800 space-y-1">
            <p className="font-bold text-slate-400 mb-1">{String(item.payload[effectiveXKey])}</p>
            {payload.map((p: any) => (
              <p key={p.dataKey} className="font-bold text-slate-700 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }}></span>
                  {String(p.dataKey)}:
                </span>
                <span className="font-mono text-indigo-650 font-bold">
                  {typeof p.value === 'number' ? p.value.toLocaleString('id-ID') : p.value}
                </span>
              </p>
            ))}
          </div>
        );
      }
      return null;
    };

    switch (chart.type) {
      case 'line':
        return (
          <LineChart data={formattedData} margin={{ top: currentLabelMode !== 'none' ? 18 : 5, right: 10, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={effectiveXKey} stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
            <Tooltip content={<CustomDynamicTooltip />} />
            {yKeys.map((yk, idx) => (
              <Line 
                key={yk} 
                type="monotone" 
                name={yk} 
                dataKey={yk} 
                stroke={SERIES_COLORS[idx % SERIES_COLORS.length]} 
                strokeWidth={2.5} 
                activeDot={{ r: 6 }} 
              >
                {currentLabelMode !== 'none' && (
                  <LabelList 
                    dataKey={yk} 
                    position="top" 
                    offset={6} 
                    fontSize={9} 
                    fill="#334155" 
                    fontWeight={700} 
                    formatter={formatDataLabel as any} 
                  />
                )}
              </Line>
            ))}
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={formattedData} margin={{ top: currentLabelMode !== 'none' ? 18 : 5, right: 10, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={effectiveXKey} stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
            <Tooltip content={<CustomDynamicTooltip />} />
            {yKeys.map((yk, idx) => (
              <Bar 
                key={yk} 
                name={yk} 
                dataKey={yk} 
                fill={SERIES_COLORS[idx % SERIES_COLORS.length]} 
                radius={[3, 3, 0, 0]} 
              >
                {currentLabelMode !== 'none' && (
                  <LabelList 
                    dataKey={yk} 
                    position="top" 
                    offset={4} 
                    fontSize={9} 
                    fill="#334155" 
                    fontWeight={700} 
                    formatter={formatDataLabel as any} 
                  />
                )}
              </Bar>
            ))}
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart data={formattedData} margin={{ top: currentLabelMode !== 'none' ? 18 : 5, right: 10, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={effectiveXKey} stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
            <Tooltip content={<CustomDynamicTooltip />} />
            {yKeys.map((yk, idx) => {
              const color = SERIES_COLORS[idx % SERIES_COLORS.length];
              return (
                <Area 
                  key={yk} 
                  type="monotone" 
                  name={yk} 
                  dataKey={yk} 
                  stroke={color} 
                  fill={color} 
                  fillOpacity={0.25} 
                >
                  {currentLabelMode !== 'none' && (
                    <LabelList 
                      dataKey={yk} 
                      position="top" 
                      offset={6} 
                      fontSize={9} 
                      fill="#334155" 
                      fontWeight={700} 
                      formatter={formatDataLabel as any} 
                    />
                  )}
                </Area>
              );
            })}
            {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />}
          </AreaChart>
        );

      default:
        return null;
    }
  };

  // Render the selected Recharts visualization type
  const renderChartIcon = () => {
    const iconName = chart.icon || (chart.type === 'line' ? 'TrendingUp' : chart.type === 'bar' ? 'BarChart2' : chart.type === 'pie' ? 'PieIcon' : 'Layers');
    switch (iconName) {
      case 'TrendingUp': return <TrendingUp className="text-indigo-600 h-4.5 w-4.5" />;
      case 'BarChart2': return <BarChart2 className="text-teal-600 h-4.5 w-4.5" />;
      case 'PieIcon': return <PieIcon className="text-amber-600 h-4.5 w-4.5" />;
      case 'Layers': return <Layers className="text-purple-600 h-4.5 w-4.5" />;
      case 'Shield': return <Shield className="text-emerald-600 h-4.5 w-4.5" />;
      case 'Globe': return <Globe className="text-blue-600 h-4.5 w-4.5" />;
      case 'Activity': return <Activity className="text-rose-600 h-4.5 w-4.5" />;
      case 'Target': return <Target className="text-orange-600 h-4.5 w-4.5" />;
      case 'Award': return <Award className="text-yellow-600 h-4.5 w-4.5" />;
      case 'Zap': return <Zap className="text-amber-500 h-4.5 w-4.5" />;
      default: return <BarChart2 className="text-slate-600 h-4.5 w-4.5" />;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all group" id={`chart-card-${chart.id}`}>
      
      {/* CHART HEADER */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1">
          {renderChartIcon()}
          
          {isAdmin ? (
            <input
              type="text"
              value={chart.title}
              onChange={(e) => onUpdate(chart.id, { title: e.target.value })}
              className="bg-transparent border-none text-slate-800 font-extrabold text-sm focus:bg-slate-50 px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full font-sans"
              placeholder="Judul Grafik Baru"
              id={`chart-title-input-${chart.id}`}
            />
          ) : (
            <span className="font-extrabold text-slate-800 text-sm px-2 py-1 select-none" id={`chart-title-label-${chart.id}`}>
              {chart.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isAdmin ? (
            <>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`p-1.5 rounded-lg transition-all border cursor-pointer ${showConfig ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'hover:bg-slate-50 border-transparent text-slate-400 hover:text-slate-600'}`}
                title="Setelan grafik (Admin)"
                id={`chart-settings-toggle-${chart.id}`}
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(chart.id)}
                className="p-1.5 hover:bg-rose-50 border border-transparent rounded-lg text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                title="Hapus grafik (Admin)"
                id={`chart-delete-button-${chart.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onRequestAdminLogin}
              className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              title="Mode Tamu (View Only) - Klik untuk Login Admin"
            >
              Mode Tamu (View Only)
            </button>
          )}
        </div>
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

          {/* Title and Icon Menu */}
          <div className="space-y-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <label className="block text-[11px] text-slate-500 font-bold mb-1">Ubah Judul Grafik</label>
            <input
              type="text"
              value={chart.title}
              onChange={(e) => onUpdate(chart.id, { title: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              placeholder="Masukkan judul grafik..."
              id={`chart-title-config-input-${chart.id}`}
            />

            <label className="block text-[11px] text-slate-500 font-bold mt-2 mb-1">Pilih Icon Grafik</label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'TrendingUp', label: 'Tren', icon: TrendingUp },
                { id: 'BarChart2', label: 'Batang', icon: BarChart2 },
                { id: 'PieIcon', label: 'Lingkar', icon: PieIcon },
                { id: 'Layers', label: 'Layer', icon: Layers },
                { id: 'Shield', label: 'Aman', icon: Shield },
                { id: 'Globe', label: 'Global', icon: Globe },
                { id: 'Activity', label: 'Aktivitas', icon: Activity },
                { id: 'Target', label: 'Target', icon: Target },
                { id: 'Award', label: 'Penghargaan', icon: Award },
                { id: 'Zap', label: 'Cepat', icon: Zap },
              ].map(item => {
                const IconComp = item.icon;
                const isSelected = (chart.icon || (chart.type === 'line' ? 'TrendingUp' : chart.type === 'bar' ? 'BarChart2' : chart.type === 'pie' ? 'PieIcon' : 'Layers')) === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onUpdate(chart.id, { icon: item.id })}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${isSelected ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-3xs' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                    title={item.label}
                  >
                    <IconComp className="h-4 w-4" />
                    <span className="text-[9px] font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
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

          {/* Menu Keterangan Label Data Grafik */}
          <div className="bg-white p-3 border border-slate-200 rounded-2xl shadow-2xs space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Hash className="h-4 w-4" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-800 font-bold">Keterangan Label Data Grafik</label>
                <p className="text-[10px] text-slate-400">Pilih opsi keterangan yang ditampilkan pada grafik.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { id: 'none', label: 'Tanpa Keterangan' },
                { id: 'value', label: 'Keterangan Angka' },
                { id: 'percent', label: 'Keterangan Persen' },
              ].map(opt => {
                const isSelected = currentLabelMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdate(chart.id, { 
                      dataLabelMode: opt.id as DataLabelMode, 
                      showDataLabels: opt.id !== 'none' 
                    })}
                    className={`py-2 px-1 rounded-xl font-bold text-[10px] sm:text-[11px] text-center transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                    id={`chart-label-mode-${opt.id}-${chart.id}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data Source Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] text-slate-700 font-bold">Sumber Data Grafik</label>
              <span className="text-[9px] text-slate-400 font-semibold">
                {chart.source === 'default' ? 'Tersinkron dengan Pemetaan Geo' : 'Google Sheet Terpisah'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => handleSourceChange('default')}
                className={`py-2 px-2.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  chart.source === 'default'
                    ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200 ring-1 ring-indigo-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80'
                }`}
                id={`chart-source-default-btn-${chart.id}`}
              >
                <Database className={`h-3.5 w-3.5 ${chart.source === 'default' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>Data Pemetaan Geo (Default)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSourceChange('sheets')}
                className={`py-2 px-2.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  chart.source === 'sheets'
                    ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200 ring-1 ring-emerald-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80'
                }`}
                id={`chart-source-sheets-btn-${chart.id}`}
              >
                <FileSpreadsheet className={`h-3.5 w-3.5 ${chart.source === 'sheets' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Google Sheet Kustom Lain</span>
              </button>
            </div>
          </div>

          {/* IF DEFAULT SOURCE: Show Geo-Synced Sheet Data Status & Quick Re-sync */}
          {chart.source === 'default' && (
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-indigo-600" />
                  Data Sinkronisasi Pemetaan Geo
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {geoSyncedDataset.length} Kantor Cabang
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Grafik ini menggunakan data terintegrasi dari menu Pemetaan Geo. Setiap kali Anda melakukan sinkronisasi atau perubahan data di Google Sheet, visualisasi grafik akan otomatis diperbarui secara langsung.
              </p>
              {onExecuteSync && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => onExecuteSync()}
                    disabled={isSyncing}
                    className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-1.5 px-3 rounded-xl text-[10px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                    id={`chart-resync-geo-btn-${chart.id}`}
                  >
                    <RotateCw className={`h-3.5 w-3.5 text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sedang Sinkron Ulang...' : 'Sinkron Ulang Data dari Google Sheet'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* IF GOOGLE SHEET SOURCE: URL and sync new */}
          {chart.source === 'sheets' && (
            <div className="space-y-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-1">Link Google Sheet Kustom</label>
                <p className="text-[10px] text-slate-400 mb-2">Masukkan URL Google Sheet khusus untuk grafik ini.</p>
                <div className="flex gap-1.5 mt-1">
                  <input
                    type="text"
                    placeholder="Masukkan URL Google Sheet baru..."
                    value={chart.sheetUrl}
                    onChange={(e) => onUpdate(chart.id, { sheetUrl: e.target.value })}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1 min-w-0 font-medium"
                    id={`chart-sheet-url-input-${chart.id}`}
                  />
                  <button
                    type="button"
                    onClick={handleFetchSheetData}
                    disabled={isLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all disabled:opacity-50 flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                    id={`chart-fetch-sheet-${chart.id}`}
                  >
                    {isLoading ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                    <span>Sinkron Data</span>
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-xl flex items-center gap-1.5 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {chart.isSynced && (
                <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-xl flex items-center gap-1.5 font-medium">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Berhasil sinkron {chart.syncedData?.length || 0} baris dari Google Sheet.</span>
                </div>
              )}
            </div>
          )}



          {/* COLUMN CONFIGURATORS */}
          <div className="space-y-3 pt-1">
            {chart.type === 'pie' ? (
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1.5">
                  Pilihan Kolom (Pilih Satu atau Lebih Kolom Data)
                </label>
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1.5 max-h-48 overflow-y-auto">
                  {currentColumns.map(col => {
                    const currentSelected = chart.pieColumns && chart.pieColumns.length > 0
                      ? chart.pieColumns
                      : (chart.yAxisColumns && chart.yAxisColumns.length > 0
                          ? Array.from(new Set([...(chart.xAxisColumns || (chart.xAxisColumn ? [chart.xAxisColumn] : [])), ...chart.yAxisColumns]))
                          : (chart.xAxisColumns || (chart.xAxisColumn ? [chart.xAxisColumn] : [])));
                    const isChecked = currentSelected.includes(col);
                    return (
                      <label key={col} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let updated = [...currentSelected];
                            if (e.target.checked) {
                              if (!updated.includes(col)) updated.push(col);
                            } else {
                              updated = updated.filter(c => c !== col);
                            }
                            onUpdate(chart.id, {
                              pieColumns: updated,
                              yAxisColumns: updated,
                              xAxisColumns: updated,
                              xAxisColumn: updated[0] || '',
                              yAxisColumn: updated[1] || updated[0] || ''
                            });
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span className="font-medium">{col}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Grafik lingkaran menggunakan satu sumbu. Anda dapat memilih 1 atau lebih kolom untuk menyusun irisan.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5">Sumbu X (Pilih Satu atau Lebih Kolom Label)</label>
                  <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1.5 max-h-40 overflow-y-auto">
                    {currentColumns.map(col => {
                      const currentXList = chart.xAxisColumns || (chart.xAxisColumn ? [chart.xAxisColumn] : []);
                      const isChecked = currentXList.includes(col);
                      return (
                        <label key={col} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              let updated = [...currentXList];
                              if (e.target.checked) {
                                if (!updated.includes(col)) updated.push(col);
                              } else {
                                updated = updated.filter(c => c !== col);
                              }
                              onUpdate(chart.id, { xAxisColumns: updated, xAxisColumn: updated[0] || '' });
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span className="font-medium">{col}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5">Sumbu Y (Pilih Satu atau Lebih Kolom Metrik)</label>
                  <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1.5 max-h-40 overflow-y-auto">
                    {currentColumns.map(col => {
                      const currentYList = chart.yAxisColumns || (chart.yAxisColumn ? [chart.yAxisColumn] : []);
                      const isChecked = currentYList.includes(col);
                      return (
                        <label key={col} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              let updated = [...currentYList];
                              if (e.target.checked) {
                                if (!updated.includes(col)) updated.push(col);
                              } else {
                                updated = updated.filter(c => c !== col);
                              }
                              onUpdate(chart.id, { yAxisColumns: updated, yAxisColumn: '' });
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span className="font-medium">{col}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
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
        <span className="capitalize">
          Sumber: {chart.source === 'sheets' ? 'Google Sheet Kustom' : 'Pemetaan Geo (Google Sheet)'}
        </span>
        <span className="text-emerald-600 font-bold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          {chart.source === 'sheets' ? (chart.isSynced ? 'Sheet Synced' : 'Ready') : `${geoSyncedDataset.length} Kantor Cabang`}
        </span>
      </div>

    </div>
  );
}
