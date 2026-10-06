import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  ChevronDown,
  Download,
  RotateCcw,
  Sparkles,
  Columns3,
  Building2,
  Grid3X3,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  X,
  Layers,
  Calculator,
  Edit2,
  Bookmark,
  Check,
  AlertCircle,
  TableProperties,
  Copy,
  Sliders,
  CheckCircle2,
  Save,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  FilePlus,
  FolderPlus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { CityData, MapSyncConfig } from '../types';
import { parseNumericValue } from '../utils/sheetParser';
import { PivotTableInstanceView } from './PivotTableInstanceView';

export type AggregationType = 'SUM' | 'AVERAGE' | 'COUNT' | 'MIN' | 'MAX';
export type ValueFormat = 'number' | 'percent' | 'decimal';

export interface PivotValueField {
  id: string;
  field: string;
  label: string;
  agg: AggregationType;
  format: ValueFormat;
}

export type RowDensity = 'compact' | 'normal' | 'comfortable' | 'spacious';
export type TableFontSize = '11px' | 'xs' | 'sm';

export interface ReportTableInstance {
  id: string;
  name?: string;
  title: string;
  description?: string;
  rowFields: string[];
  columnFields: string[];
  valueFields: PivotValueField[];
  useFilteredData: boolean;
  rowDensity: RowDensity;
  rowPaddingY: number;
  dimColWidth: number;
  metricColWidth: number;
  fontSize: TableFontSize;
  createdAt: string;
}

export interface ReportTab {
  id: string;
  name: string;
  description?: string;
  tables: ReportTableInstance[];
  createdAt: string;
}

export interface CustomSpreadsheetField {
  key: string;
  label: string;
  type: 'dimension' | 'metric';
  varKind: 'poin' | 'kategori';
  sourceColumn?: string;
  sourceColumns?: string[];
  calcMethod: 'group_sum' | 'threshold_scoring' | 'multiplier' | 'range_bins' | 'text_mapping';
  thresholds?: {
    min?: number;
    max?: number;
    label: string;
    output: string | number;
  }[];
  multiplier?: number;
  textMappings?: {
    match: string;
    output: string | number;
  }[];
  defaultValue?: string | number;
}

export interface PivotPreset {
  id: string;
  name: string;
  description: string;
  icon: 'building' | 'calendar' | 'matrix' | 'shield' | 'chart';
  rows: string[];
  columns: string[];
  values: PivotValueField[];
}

const DEFAULT_PRESETS: PivotPreset[] = [
  {
    id: 'rekap-wilayah',
    name: 'Rekapitulasi Wilayah (Kepwil)',
    description: 'Ringkasan total volume layanan dan rata-rata SLA per Kedeputian Wilayah.',
    icon: 'building',
    rows: ['KEPWIL'],
    columns: [],
    values: [
      { id: 'v1', field: 'Layanan_Informasi', label: 'Informasi', agg: 'SUM', format: 'number' },
      { id: 'v2', field: 'Layanan_Permintaan', label: 'Permintaan', agg: 'SUM', format: 'number' },
      { id: 'v3', field: 'Layanan_Pengaduan', label: 'Pengaduan', agg: 'SUM', format: 'number' },
      { id: 'v4', field: 'Total', label: 'Total Layanan', agg: 'SUM', format: 'number' },
      { id: 'v5', field: 'Kepatuhan_SLA', label: 'Rata-rata SLA (%)', agg: 'AVERAGE', format: 'percent' },
    ]
  },
  {
    id: 'matriks-wilayah-bulan',
    name: 'Matriks Wilayah x Bulan',
    description: 'Tabel silang volume total layanan per Wilayah melintasi kolom Bulan.',
    icon: 'matrix',
    rows: ['KEPWIL'],
    columns: ['BULAN'],
    values: [
      { id: 'v1', field: 'Total', label: 'Total Layanan', agg: 'SUM', format: 'number' },
    ]
  },
  {
    id: 'rekap-cabang',
    name: 'Rincian Kantor Cabang',
    description: 'Hierarki Wilayah ke Cabang dengan rincian seluruh jenis layanan.',
    icon: 'chart',
    rows: ['KEPWIL', 'KANTOR CABANG'],
    columns: [],
    values: [
      { id: 'v1', field: 'Total', label: 'Total Layanan', agg: 'SUM', format: 'number' },
      { id: 'v2', field: 'Kepatuhan_SLA', label: 'SLA (%)', agg: 'AVERAGE', format: 'percent' },
      { id: 'v3', field: 'Rata_Rata_Hari_SLA', label: 'Durasi Hari', agg: 'AVERAGE', format: 'decimal' },
    ]
  },
  {
    id: 'evaluasi-sla',
    name: 'Evaluasi Kepatuhan SLA',
    description: 'Fokus analisis persentase kepatuhan SLA dan durasi penyelesaian tiket per wilayah.',
    icon: 'shield',
    rows: ['KEPWIL'],
    columns: [],
    values: [
      { id: 'v1', field: 'Kepatuhan_SLA', label: 'Rata-rata SLA (%)', agg: 'AVERAGE', format: 'percent' },
      { id: 'v2', field: 'Rata_Rata_Hari_SLA', label: 'Rata-rata Hari SLA', agg: 'AVERAGE', format: 'decimal' },
      { id: 'v3', field: 'Total', label: 'Total Tiket', agg: 'SUM', format: 'number' },
    ]
  }
];

const INITIAL_DEFAULT_TABS: ReportTab[] = [
  {
    id: 'tab-1',
    name: 'Ringkasan Layanan',
    description: 'Lembar tab laporan ringkasan volume layanan dan kepatuhan SLA kantor cabang.',
    createdAt: new Date().toISOString(),
    tables: [
      {
        id: 'table-default-1',
        title: 'Tabel 1: Rekap Wilayah & Layanan',
        name: 'Tabel 1: Rekap Wilayah & Layanan',
        description: 'Ringkasan total volume informasi, permintaan, pengaduan & rata-rata SLA per Kedeputian Wilayah.',
        rowFields: ['KEPWIL'],
        columnFields: [],
        valueFields: [
          { id: 'v1', field: 'Layanan_Informasi', label: 'Informasi', agg: 'SUM', format: 'number' },
          { id: 'v2', field: 'Layanan_Permintaan', label: 'Permintaan', agg: 'SUM', format: 'number' },
          { id: 'v3', field: 'Layanan_Pengaduan', label: 'Pengaduan', agg: 'SUM', format: 'number' },
          { id: 'v4', field: 'Total', label: 'Total Layanan', agg: 'SUM', format: 'number' },
          { id: 'v5', field: 'Kepatuhan_SLA', label: 'Rata-rata SLA (%)', agg: 'AVERAGE', format: 'percent' },
        ],
        useFilteredData: false,
        rowDensity: 'normal',
        rowPaddingY: 10,
        dimColWidth: 280,
        metricColWidth: 130,
        fontSize: 'xs',
        createdAt: new Date().toISOString()
      },
      {
        id: 'table-default-2',
        title: 'Tabel 2: Evaluasi Kepatuhan SLA Cabang',
        name: 'Tabel 2: Evaluasi Kepatuhan SLA Cabang',
        description: 'Rincian kepatuhan SLA dan durasi hari penyelesaian per Kantor Cabang.',
        rowFields: ['KEPWIL', 'KANTOR CABANG'],
        columnFields: [],
        valueFields: [
          { id: 'v1', field: 'Total', label: 'Total Layanan', agg: 'SUM', format: 'number' },
          { id: 'v2', field: 'Kepatuhan_SLA', label: 'SLA (%)', agg: 'AVERAGE', format: 'percent' },
          { id: 'v3', field: 'Rata_Rata_Hari_SLA', label: 'Durasi Hari', agg: 'AVERAGE', format: 'decimal' },
        ],
        useFilteredData: false,
        rowDensity: 'normal',
        rowPaddingY: 10,
        dimColWidth: 320,
        metricColWidth: 140,
        fontSize: 'xs',
        createdAt: new Date().toISOString()
      }
    ]
  },
  {
    id: 'tab-2',
    name: 'Analisis SLA & Matriks',
    description: 'Lembar tab analisis mendalam kepatuhan SLA dan tren matriks wilayah melintasi periode bulan.',
    createdAt: new Date().toISOString(),
    tables: [
      {
        id: 'table-default-3',
        title: 'Tabel 1: Evaluasi SLA Per Wilayah',
        name: 'Tabel 1: Evaluasi SLA Per Wilayah',
        description: 'Kepatuhan SLA dan durasi penyelesaian per Kedeputian Wilayah.',
        rowFields: ['KEPWIL'],
        columnFields: [],
        valueFields: [
          { id: 'v1', field: 'Kepatuhan_SLA', label: 'Rata-rata SLA (%)', agg: 'AVERAGE', format: 'percent' },
          { id: 'v2', field: 'Rata_Rata_Hari_SLA', label: 'Rata-rata Hari SLA', agg: 'AVERAGE', format: 'decimal' },
          { id: 'v3', field: 'Total', label: 'Total Tiket', agg: 'SUM', format: 'number' },
        ],
        useFilteredData: false,
        rowDensity: 'normal',
        rowPaddingY: 10,
        dimColWidth: 280,
        metricColWidth: 130,
        fontSize: 'xs',
        createdAt: new Date().toISOString()
      },
      {
        id: 'table-default-4',
        title: 'Tabel 2: Matriks Wilayah x Bulan',
        name: 'Tabel 2: Matriks Wilayah x Bulan',
        description: 'Tabel silang volume total layanan per Wilayah melintasi kolom Bulan.',
        rowFields: ['KEPWIL'],
        columnFields: ['BULAN'],
        valueFields: [
          { id: 'v1', field: 'Total', label: 'Total Layanan', agg: 'SUM', format: 'number' },
        ],
        useFilteredData: false,
        rowDensity: 'normal',
        rowPaddingY: 10,
        dimColWidth: 280,
        metricColWidth: 130,
        fontSize: 'xs',
        createdAt: new Date().toISOString()
      }
    ]
  }
];

interface ReportingPivotTableProps {
  citiesData: CityData[];
  filteredCities: CityData[];
  selectedBulan?: string | string[];
  selectedKepwil?: string | string[];
  selectedKantorCabang?: string | string[];
  availableBulanList: string[];
  availableKepwilList: string[];
  availableKantorCabangList: string[];
  mapSyncConfig?: MapSyncConfig;
}

export const ReportingPivotTable: React.FC<ReportingPivotTableProps> = ({
  citiesData,
  filteredCities,
}) => {
  // =========================================================================
  // 1. TABS MANAGEMENT STATE (Tab Halaman / Workspace Sheets)
  // =========================================================================
  const [tabs, setTabs] = useState<ReportTab[]>(() => {
    try {
      const saved = localStorage.getItem('senada_pivot_report_tabs_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Migration from previous flat tables if available
      const legacyTables = localStorage.getItem('senada_pivot_custom_tables_v3');
      if (legacyTables) {
        const parsedLegacy = JSON.parse(legacyTables);
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
          return [
            {
              id: 'tab-migrated-1',
              name: 'Laporan Utama',
              description: 'Tab halaman kerja laporan pivot.',
              createdAt: new Date().toISOString(),
              tables: parsedLegacy
            }
          ];
        }
      }
    } catch (e) {}
    return INITIAL_DEFAULT_TABS;
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem('senada_pivot_active_tab_id_v4');
      if (savedId) return savedId;
    } catch (e) {}
    return tabs[0]?.id || 'tab-1';
  });

  // Ensure activeTabId always points to a valid tab
  useEffect(() => {
    if (!tabs.some(t => t.id === activeTabId) && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  // Sync tabs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('senada_pivot_report_tabs_v4', JSON.stringify(tabs));
    } catch (e) {}
  }, [tabs]);

  // Sync activeTabId to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('senada_pivot_active_tab_id_v4', activeTabId);
    } catch (e) {}
  }, [activeTabId]);

  // Current active tab object
  const activeTab = useMemo(() => {
    return tabs.find(t => t.id === activeTabId) || tabs[0] || INITIAL_DEFAULT_TABS[0];
  }, [tabs, activeTabId]);

  // Total tables across all tabs
  const totalTablesCount = useMemo(() => {
    return tabs.reduce((acc, t) => acc + (t.tables ? t.tables.length : 0), 0);
  }, [tabs]);

  // Toast / Feedback message
  const [presetSuccessToast, setPresetSuccessToast] = useState<string | null>(null);
  const [presetErrorMessage, setPresetErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (presetSuccessToast) {
      const timer = setTimeout(() => setPresetSuccessToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [presetSuccessToast]);

  // Dynamic Presets (CRUD) with localStorage persistence
  const [presets, setPresets] = useState<PivotPreset[]>(() => {
    try {
      const saved = localStorage.getItem('senada_pivot_presets_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_PRESETS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('senada_pivot_presets_list', JSON.stringify(presets));
    } catch (e) {}
  }, [presets]);

  // Custom Variables (Poin / Kategori berdasar data Google Sheet)
  const [customFields, setCustomFields] = useState<CustomSpreadsheetField[]>(() => {
    try {
      const saved = localStorage.getItem('senada_pivot_custom_variables_simple');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('senada_pivot_custom_variables_simple', JSON.stringify(customFields));
    } catch (e) {}
  }, [customFields]);

  // =========================================================================
  // MODALS STATE: TABS VS TABLES
  // =========================================================================
  // 1. Add Tab Modal State (Tambah Lembar Tab Baru)
  const [isAddTabModalOpen, setIsAddTabModalOpen] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [newTabDesc, setNewTabDesc] = useState('');
  const [newTabTemplate, setNewTabTemplate] = useState<string>('rekap_wilayah');

  // 2. Add Table Modal State (Tambah Tabel Baru ke Tab Aktif)
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableDesc, setNewTableDesc] = useState('');
  const [newTableTemplate, setNewTableTemplate] = useState<string>('copy_current');

  // 3. Rename Tab Modal State
  const [tabToRename, setTabToRename] = useState<ReportTab | null>(null);
  const [renameTabInput, setRenameTabInput] = useState('');

  // 4. Delete Tab Modal State
  const [tabToDelete, setTabToDelete] = useState<ReportTab | null>(null);

  // 5. Rename Table Modal State
  const [tableToRename, setTableToRename] = useState<ReportTableInstance | null>(null);
  const [renameTableInput, setRenameTableInput] = useState('');

  // 6. Delete Table Modal State
  const [tableToDelete, setTableToDelete] = useState<ReportTableInstance | null>(null);

  // 7. Custom Variable Modal State
  const [isAddVarModalOpen, setIsAddVarModalOpen] = useState(false);
  const [editingCustomKey, setEditingCustomKey] = useState<string | null>(null);
  const [newVarName, setNewVarName] = useState('');
  const [newVarKind, setNewVarKind] = useState<'poin' | 'kategori'>('poin');
  const [newVarSourceCol, setNewVarSourceCol] = useState('Kepatuhan_SLA');
  const [newVarSourceCols, setNewVarSourceCols] = useState<string[]>(['Layanan_Informasi', 'Layanan_Permintaan', 'Layanan_Pengaduan']);
  const [newVarMethod, setNewVarMethod] = useState<'group_sum' | 'threshold_scoring' | 'multiplier' | 'range_bins' | 'text_mapping'>('group_sum');
  const [newVarThresholds, setNewVarThresholds] = useState<{ min?: number; max?: number; label: string; output: string | number }[]>([
    { min: 95, max: undefined, label: 'Sangat Baik (≥95%)', output: 100 },
    { min: 90, max: 94.99, label: 'Baik (90-94%)', output: 85 },
    { min: 80, max: 89.99, label: 'Cukup (80-89%)', output: 70 },
    { min: undefined, max: 79.99, label: 'Kurang (<80%)', output: 50 },
  ]);
  const [newVarMultiplier, setNewVarMultiplier] = useState<number>(10);
  const [newVarTextMappings, setNewVarTextMappings] = useState<{ match: string; output: string | number }[]>([]);

  // 8. Preset Manager Modal State
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [activePresetTableId, setActivePresetTableId] = useState<string | null>(null);

  // Helper to extract value of any field key from CityData row
  const getRowValue = (row: CityData, key: string): any => {
    if (!row) return '';
    if (key === 'KEPWIL' || key === 'kepwil') return row.kepwil || (row.rawRow && (row.rawRow['KEPWIL'] || row.rawRow['Kepwil'])) || 'Wilayah Lain';
    if (key === 'KANTOR CABANG' || key === 'kantorCabang' || key === 'name') return row.name || row.kantorCabang || (row.rawRow && (row.rawRow['KANTOR CABANG'] || row.rawRow['Cabang'])) || '-';
    if (key === 'BULAN' || key === 'bulan') return row.bulan || (row.rawRow && (row.rawRow['BULAN'] || row.rawRow['Bulan'])) || 'Semua Periode';
    if (key === 'Layanan_Informasi' || key === 'informasi') return row.informasi ?? (row.rawRow && parseNumericValue(row.rawRow['Layanan_Informasi'])) ?? 0;
    if (key === 'Layanan_Permintaan' || key === 'permintaan') return row.permintaan ?? (row.rawRow && parseNumericValue(row.rawRow['Layanan_Permintaan'])) ?? 0;
    if (key === 'Layanan_Pengaduan' || key === 'pengaduan') return row.pengaduan ?? (row.rawRow && parseNumericValue(row.rawRow['Layanan_Pengaduan'])) ?? 0;
    if (key === 'Total' || key === 'total') return row.total ?? (row.rawRow && parseNumericValue(row.rawRow['Total'])) ?? 0;
    if (key === 'Kepatuhan_SLA' || key === 'slaCompliance') return row.slaCompliance ?? (row.rawRow && parseNumericValue(row.rawRow['Kepatuhan_SLA'])) ?? 0;
    if (key === 'Rata_Rata_Hari_SLA' || key === 'avgSlaDays') return row.avgSlaDays ?? (row.rawRow && parseNumericValue(row.rawRow['Rata_Rata_Hari_SLA'])) ?? 0;

    if (row.rawRow && row.rawRow[key] !== undefined) {
      return row.rawRow[key];
    }
    return '';
  };

  // Build list of all available fields from Sheet and Custom variables in exact Google Sheet column order
  const availableFields = useMemo(() => {
    const sheetColKeys: string[] = [];
    const seen = new Set<string>();

    const firstRowWithRaw = citiesData.find(r => r.rawRow && Object.keys(r.rawRow).length > 0);
    if (firstRowWithRaw && firstRowWithRaw.rawRow) {
      Object.keys(firstRowWithRaw.rawRow).forEach(k => {
        const trimmedKey = k.trim();
        const lower = trimmedKey.toLowerCase();
        if (!seen.has(lower) && !lower.startsWith('_') && lower !== 'id') {
          seen.add(lower);
          sheetColKeys.push(trimmedKey);
        }
      });
    }

    citiesData.forEach(r => {
      if (r.rawRow) {
        Object.keys(r.rawRow).forEach(k => {
          const trimmedKey = k.trim();
          const lower = trimmedKey.toLowerCase();
          if (!seen.has(lower) && !lower.startsWith('_') && lower !== 'id') {
            seen.add(lower);
            sheetColKeys.push(trimmedKey);
          }
        });
      }
    });

    if (sheetColKeys.length === 0) {
      const canonicalOrder = [
        'BULAN',
        'KEPWIL',
        'KANTOR CABANG',
        'Layanan_Informasi',
        'Layanan_Permintaan',
        'Layanan_Pengaduan',
        'Total',
        'Kepatuhan_SLA',
        'Rata_Rata_Hari_SLA',
      ];
      canonicalOrder.forEach(k => {
        seen.add(k.toLowerCase());
        sheetColKeys.push(k);
      });
    }

    const list: { key: string; label: string; type: 'dimension' | 'metric'; isCustom?: boolean; sheetColIndex?: number }[] = [];

    sheetColKeys.forEach((colKey, colIdx) => {
      let isNumeric = false;
      for (const r of citiesData) {
        let val: any = undefined;
        if (r.rawRow && r.rawRow[colKey] !== undefined) {
          val = r.rawRow[colKey];
        } else if (colKey === 'Layanan_Informasi' || colKey.toLowerCase() === 'informasi') {
          val = r.informasi;
        } else if (colKey === 'Layanan_Permintaan' || colKey.toLowerCase() === 'permintaan') {
          val = r.permintaan;
        } else if (colKey === 'Layanan_Pengaduan' || colKey.toLowerCase() === 'pengaduan') {
          val = r.pengaduan;
        } else if (colKey === 'Total' || colKey.toLowerCase() === 'total') {
          val = r.total;
        } else if (colKey === 'Kepatuhan_SLA' || colKey.toLowerCase() === 'slacompliance') {
          val = r.slaCompliance;
        } else if (colKey === 'Rata_Rata_Hari_SLA' || colKey.toLowerCase() === 'avgsladays') {
          val = r.avgSlaDays;
        }

        if (val !== undefined && val !== null && String(val).trim() !== '') {
          if (typeof val === 'number') {
            isNumeric = true;
            break;
          }
          const str = String(val).trim();
          const clean = str.replace(/[RpIDR$€¥%\s\u00A0]/g, '');
          if (/^-?\d+([\.,]\d+)?$/.test(clean) && !/^0\d+$/.test(str)) {
            isNumeric = true;
            break;
          }
        }
      }

      const lower = colKey.toLowerCase();
      if (lower.includes('sla') || lower.includes('informasi') || lower.includes('permintaan') || lower.includes('pengaduan') || lower.includes('total') || lower.includes('jumlah') || lower.includes('target') || lower.includes('realisasi')) {
        isNumeric = true;
      }
      if (lower === 'kepwil' || lower.includes('wilayah') || lower === 'kantor cabang' || lower === 'kc' || lower === 'cabang' || lower === 'bulan' || lower === 'periode' || lower === 'tahun') {
        isNumeric = false;
      }

      let label = colKey;
      if (colKey === 'KEPWIL') label = 'KEPWIL (Kedeputian Wilayah)';
      else if (colKey === 'BULAN') label = 'BULAN (Periode)';
      else if (colKey === 'Layanan_Informasi') label = 'Layanan Informasi';
      else if (colKey === 'Layanan_Permintaan') label = 'Layanan Permintaan';
      else if (colKey === 'Layanan_Pengaduan') label = 'Layanan Pengaduan';
      else if (colKey === 'Total') label = 'Total Layanan';
      else if (colKey === 'Kepatuhan_SLA') label = 'Kepatuhan SLA (%)';
      else if (colKey === 'Rata_Rata_Hari_SLA') label = 'Rata-rata Hari SLA';

      list.push({
        key: colKey,
        label,
        type: isNumeric ? 'metric' : 'dimension',
        sheetColIndex: colIdx + 1,
      });
    });

    customFields.forEach((cf, idx) => {
      list.push({
        key: cf.key,
        label: cf.label,
        type: cf.type,
        isCustom: true,
        sheetColIndex: sheetColKeys.length + idx + 1,
      });
    });

    return list;
  }, [citiesData, customFields]);

  // =========================================================================
  // TAB CRUD HANDLERS (Halaman Tab)
  // =========================================================================
  const handleOpenAddTabModal = () => {
    setNewTabName(`Tab ${tabs.length + 1}: Lembar Analisis`);
    setNewTabDesc('Halaman tab kerja laporan baru.');
    setNewTabTemplate('rekap_wilayah');
    setIsAddTabModalOpen(true);
  };

  const handleConfirmAddTab = () => {
    if (!newTabName.trim()) return;

    const newTabId = `tab_${Date.now()}`;
    let initialTables: ReportTableInstance[] = [];

    if (newTabTemplate === 'rekap_wilayah') {
      initialTables = [
        {
          id: `tbl_${Date.now()}_1`,
          title: 'Tabel 1: Rekap Wilayah & Layanan',
          name: 'Tabel 1: Rekap Wilayah & Layanan',
          description: 'Ringkasan total volume informasi, permintaan, pengaduan & rata-rata SLA per Wilayah.',
          rowFields: ['KEPWIL'],
          columnFields: [],
          valueFields: [
            { id: `v1_${Date.now()}`, field: 'Layanan_Informasi', label: 'Informasi', agg: 'SUM', format: 'number' },
            { id: `v2_${Date.now()}`, field: 'Layanan_Permintaan', label: 'Permintaan', agg: 'SUM', format: 'number' },
            { id: `v3_${Date.now()}`, field: 'Layanan_Pengaduan', label: 'Pengaduan', agg: 'SUM', format: 'number' },
            { id: `v4_${Date.now()}`, field: 'Total', label: 'Total Layanan', agg: 'SUM', format: 'number' },
            { id: `v5_${Date.now()}`, field: 'Kepatuhan_SLA', label: 'Rata-rata SLA (%)', agg: 'AVERAGE', format: 'percent' },
          ],
          useFilteredData: false,
          rowDensity: 'normal',
          rowPaddingY: 10,
          dimColWidth: 280,
          metricColWidth: 130,
          fontSize: 'xs',
          createdAt: new Date().toISOString()
        }
      ];
    } else if (newTabTemplate === 'evaluasi_sla') {
      initialTables = [
        {
          id: `tbl_${Date.now()}_1`,
          title: 'Tabel 1: Evaluasi Kepatuhan SLA',
          name: 'Tabel 1: Evaluasi Kepatuhan SLA',
          description: 'Analisis persentase kepatuhan SLA dan durasi penyelesaian tiket per wilayah.',
          rowFields: ['KEPWIL'],
          columnFields: [],
          valueFields: [
            { id: `v1_${Date.now()}`, field: 'Kepatuhan_SLA', label: 'Rata-rata SLA (%)', agg: 'AVERAGE', format: 'percent' },
            { id: `v2_${Date.now()}`, field: 'Rata_Rata_Hari_SLA', label: 'Rata-rata Hari SLA', agg: 'AVERAGE', format: 'decimal' },
            { id: `v3_${Date.now()}`, field: 'Total', label: 'Total Tiket', agg: 'SUM', format: 'number' },
          ],
          useFilteredData: false,
          rowDensity: 'normal',
          rowPaddingY: 10,
          dimColWidth: 280,
          metricColWidth: 130,
          fontSize: 'xs',
          createdAt: new Date().toISOString()
        }
      ];
    } else if (newTabTemplate === 'copy_current' && activeTab) {
      initialTables = activeTab.tables.map((t, idx) => ({
        ...t,
        id: `tbl_${Date.now()}_${idx}`,
        title: `${t.title || t.name}`,
        name: `${t.name || t.title}`,
        valueFields: t.valueFields.map((v, vIdx) => ({ ...v, id: `v_${Date.now()}_${idx}_${vIdx}` })),
        createdAt: new Date().toISOString()
      }));
    } else {
      // Blank
      initialTables = [
        {
          id: `tbl_${Date.now()}_1`,
          title: 'Tabel 1: Tabel Kosong',
          name: 'Tabel 1: Tabel Kosong',
          description: 'Tabel pivot baru siap diatur sesuai kebutuhan.',
          rowFields: ['KEPWIL'],
          columnFields: [],
          valueFields: [
            { id: `v1_${Date.now()}`, field: 'Total', label: 'Total Layanan', agg: 'SUM', format: 'number' }
          ],
          useFilteredData: false,
          rowDensity: 'normal',
          rowPaddingY: 10,
          dimColWidth: 280,
          metricColWidth: 130,
          fontSize: 'xs',
          createdAt: new Date().toISOString()
        }
      ];
    }

    const newTabObj: ReportTab = {
      id: newTabId,
      name: newTabName.trim(),
      description: newTabDesc.trim() || 'Lembar tab laporan pivot.',
      tables: initialTables,
      createdAt: new Date().toISOString()
    };

    setTabs(prev => [...prev, newTabObj]);
    setActiveTabId(newTabId);
    setPresetSuccessToast(`Tab "${newTabName.trim()}" berhasil dibuat dan siap digunakan!`);
    setIsAddTabModalOpen(false);
    setNewTabName('');
    setNewTabDesc('');
  };

  const handleStartRenameTab = (t: ReportTab) => {
    setTabToRename(t);
    setRenameTabInput(t.name);
  };

  const handleConfirmRenameTab = () => {
    if (!tabToRename || !renameTabInput.trim()) return;
    setTabs(prev => prev.map(t => {
      if (t.id === tabToRename.id) {
        return { ...t, name: renameTabInput.trim() };
      }
      return t;
    }));
    setPresetSuccessToast(`Nama tab berhasil diubah menjadi "${renameTabInput.trim()}"`);
    setTabToRename(null);
  };

  const handleDuplicateTab = (tabToDup: ReportTab) => {
    const dupId = `tab_${Date.now()}`;
    const dupName = `${tabToDup.name} (Salinan)`;
    const dupTab: ReportTab = {
      ...tabToDup,
      id: dupId,
      name: dupName,
      createdAt: new Date().toISOString(),
      tables: tabToDup.tables.map((t, idx) => ({
        ...t,
        id: `tbl_${Date.now()}_${idx}`,
        title: `${t.title || t.name}`,
        name: `${t.name || t.title}`,
        valueFields: t.valueFields.map((v, vIdx) => ({ ...v, id: `v_${Date.now()}_${idx}_${vIdx}` })),
        createdAt: new Date().toISOString()
      }))
    };
    setTabs(prev => [...prev, dupTab]);
    setActiveTabId(dupId);
    setPresetSuccessToast(`Tab "${dupName}" beserta seluruh tabel di dalamnya berhasil diduplikasi!`);
  };

  const handleRequestDeleteTab = (t: ReportTab) => {
    setTabToDelete(t);
  };

  const handleConfirmDeleteTab = () => {
    if (!tabToDelete) return;
    if (tabs.length <= 1) {
      setPresetErrorMessage('Tidak dapat menghapus satu-satunya tab yang tersisa.');
      setTabToDelete(null);
      return;
    }

    const nextTabs = tabs.filter(t => t.id !== tabToDelete.id);
    setTabs(nextTabs);
    if (activeTabId === tabToDelete.id) {
      setActiveTabId(nextTabs[0].id);
    }
    setPresetSuccessToast(`Tab "${tabToDelete.name}" telah dihapus.`);
    setTabToDelete(null);
  };

  // =========================================================================
  // TABLE CRUD HANDLERS INSIDE THE ACTIVE TAB (Tabel dalam Satu Halaman Tab)
  // =========================================================================
  const handleOpenAddTableModal = () => {
    const curCount = activeTab.tables ? activeTab.tables.length : 0;
    setNewTableName(`Tabel ${curCount + 1}: Laporan Baru`);
    setNewTableDesc('Tabel pivot analisis kustom.');
    setNewTableTemplate('copy_current');
    setIsAddTableModalOpen(true);
  };

  const handleConfirmAddTable = () => {
    if (!newTableName.trim()) return;

    const sourceTable = activeTab.tables[activeTab.tables.length - 1] || activeTab.tables[0];
    let baseRows = ['KEPWIL'];
    let baseCols: string[] = [];
    let baseVals: PivotValueField[] = [
      { id: `v1_${Date.now()}`, field: 'Total', label: 'Total Layanan', agg: 'SUM', format: 'number' },
      { id: `v2_${Date.now()}`, field: 'Kepatuhan_SLA', label: 'Rata-rata SLA (%)', agg: 'AVERAGE', format: 'percent' },
    ];

    if (newTableTemplate === 'blank') {
      baseRows = ['KEPWIL'];
      baseCols = [];
      baseVals = [];
    } else if (newTableTemplate === 'rekap_wilayah') {
      baseRows = ['KEPWIL'];
      baseCols = [];
      baseVals = [
        { id: `v1_${Date.now()}`, field: 'Layanan_Informasi', label: 'Informasi', agg: 'SUM', format: 'number' },
        { id: `v2_${Date.now()}`, field: 'Layanan_Permintaan', label: 'Permintaan', agg: 'SUM', format: 'number' },
        { id: `v3_${Date.now()}`, field: 'Layanan_Pengaduan', label: 'Pengaduan', agg: 'SUM', format: 'number' },
        { id: `v4_${Date.now()}`, field: 'Total', label: 'Total Layanan', agg: 'SUM', format: 'number' },
        { id: `v5_${Date.now()}`, field: 'Kepatuhan_SLA', label: 'Rata-rata SLA (%)', agg: 'AVERAGE', format: 'percent' },
      ];
    } else if (newTableTemplate === 'evaluasi_sla') {
      baseRows = ['KEPWIL'];
      baseCols = [];
      baseVals = [
        { id: `v1_${Date.now()}`, field: 'Kepatuhan_SLA', label: 'Rata-rata SLA (%)', agg: 'AVERAGE', format: 'percent' },
        { id: `v2_${Date.now()}`, field: 'Rata_Rata_Hari_SLA', label: 'Rata-rata Hari SLA', agg: 'AVERAGE', format: 'decimal' },
        { id: `v3_${Date.now()}`, field: 'Total', label: 'Total Tiket', agg: 'SUM', format: 'number' },
      ];
    } else if (newTableTemplate === 'matriks_bulan') {
      baseRows = ['KEPWIL'];
      baseCols = ['BULAN'];
      baseVals = [
        { id: `v1_${Date.now()}`, field: 'Total', label: 'Total Layanan', agg: 'SUM', format: 'number' },
      ];
    } else if (sourceTable && (newTableTemplate === 'copy_current' || newTableTemplate === 'current')) {
      baseRows = [...sourceTable.rowFields];
      baseCols = [...sourceTable.columnFields];
      baseVals = sourceTable.valueFields.map((v, i) => ({ ...v, id: `v_${Date.now()}_${i}` }));
    }

    const newId = `table_${Date.now()}`;
    const newTableObj: ReportTableInstance = {
      id: newId,
      title: newTableName.trim(),
      name: newTableName.trim(),
      description: newTableDesc.trim() || 'Tabel analisis pivot kustom.',
      rowFields: baseRows,
      columnFields: baseCols,
      valueFields: baseVals,
      useFilteredData: false,
      rowDensity: 'normal',
      rowPaddingY: 10,
      dimColWidth: 280,
      metricColWidth: 130,
      fontSize: 'xs',
      createdAt: new Date().toISOString()
    };

    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTab.id) {
        return {
          ...tab,
          tables: [...(tab.tables || []), newTableObj]
        };
      }
      return tab;
    }));

    setPresetSuccessToast(`Tabel baru "${newTableName.trim()}" berhasil ditambahkan ke Tab "${activeTab.name}"!`);
    setIsAddTableModalOpen(false);
    setNewTableName('');
    setNewTableDesc('');

    setTimeout(() => {
      const el = document.getElementById(`pivot-table-card-${newId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const handleUpdateTableInstance = (tableId: string, updated: Partial<ReportTableInstance>) => {
    setTabs(prev => prev.map(tab => {
      const hasTable = tab.tables && tab.tables.some(t => t.id === tableId);
      if (!hasTable) return tab;
      return {
        ...tab,
        tables: tab.tables.map(t => t.id === tableId ? { ...t, ...updated } : t)
      };
    }));
  };

  const handleDuplicateTable = (tableToDup: ReportTableInstance) => {
    const dupId = `table_${Date.now()}`;
    const dupName = `${tableToDup.name || tableToDup.title} (Salinan)`;
    const dupObj: ReportTableInstance = {
      ...tableToDup,
      id: dupId,
      title: dupName,
      name: dupName,
      valueFields: tableToDup.valueFields.map((v, i) => ({ ...v, id: `v_${Date.now()}_${i}` })),
      createdAt: new Date().toISOString()
    };

    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTab.id) {
        return {
          ...tab,
          tables: [...(tab.tables || []), dupObj]
        };
      }
      return tab;
    }));

    setPresetSuccessToast(`Tabel "${dupName}" berhasil diduplikasi ke dalam tab "${activeTab.name}"!`);

    setTimeout(() => {
      const el = document.getElementById(`pivot-table-card-${dupId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const handleStartRenameTable = (t: ReportTableInstance) => {
    setTableToRename(t);
    setRenameTableInput(t.name || t.title || '');
  };

  const handleConfirmRenameTable = () => {
    if (!tableToRename || !renameTableInput.trim()) return;
    setTabs(prev => prev.map(tab => ({
      ...tab,
      tables: tab.tables.map(t => {
        if (t.id === tableToRename.id) {
          return { ...t, title: renameTableInput.trim(), name: renameTableInput.trim() };
        }
        return t;
      })
    })));
    setPresetSuccessToast(`Nama tabel berhasil diubah menjadi "${renameTableInput.trim()}"`);
    setTableToRename(null);
  };

  const handleRequestDeleteTable = (t: ReportTableInstance) => {
    setTableToDelete(t);
  };

  const handleConfirmDeleteTable = () => {
    if (!tableToDelete) return;
    if (activeTab.tables.length <= 1) {
      setPresetErrorMessage('Tab harus memiliki minimal 1 tabel.');
      setTableToDelete(null);
      return;
    }

    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTab.id) {
        return {
          ...tab,
          tables: tab.tables.filter(t => t.id !== tableToDelete.id)
        };
      }
      return tab;
    }));

    setPresetSuccessToast(`Tabel "${tableToDelete.name || tableToDelete.title}" telah dihapus dari tab.`);
    setTableToDelete(null);
  };

  const handleMoveTable = (tableId: string, direction: 'up' | 'down') => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTab.id) return tab;
      const curTables = [...tab.tables];
      const idx = curTables.findIndex(t => t.id === tableId);
      if (idx === -1) return tab;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= curTables.length) return tab;

      const temp = curTables[idx];
      curTables[idx] = curTables[targetIdx];
      curTables[targetIdx] = temp;

      return {
        ...tab,
        tables: curTables
      };
    }));
  };

  // =========================================================================
  // EXCEL EXPORT HANDLERS (Active Tab vs All Tabs)
  // =========================================================================
  const handleExportActiveTabToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const currentTabTables = activeTab.tables || [];

      if (currentTabTables.length === 0) {
        setPresetErrorMessage('Tab ini tidak memiliki tabel untuk diekspor.');
        return;
      }

      currentTabTables.forEach((table, tableIndex) => {
        const activeData = table.useFilteredData ? filteredCities : citiesData;
        const rowFields = table.rowFields || ['KEPWIL'];
        const columnFields = table.columnFields || [];
        const valueFields = table.valueFields || [];
        const aoa: any[][] = [];

        const tableName = table.name || table.title || `Tabel ${tableIndex + 1}`;
        aoa.push([`TAB: ${activeTab.name}`]);
        aoa.push([tableName]);
        aoa.push([table.description || 'Laporan Pivot Table Senada']);
        aoa.push([`Dibuat: ${new Date().toLocaleString('id-ID')} | Total Data: ${activeData.length} baris`]);
        aoa.push([]);

        // Build hierarchy groups
        const colField = columnFields[0];
        let colValues: string[] = [];
        if (colField) {
          const set = new Set<string>();
          activeData.forEach(r => {
            const val = String(getRowValue(r, colField) || 'N/A');
            set.add(val);
          });
          colValues = Array.from(set).sort((a, b) => a.localeCompare(b));
        }

        interface GroupNode {
          key: string;
          level: number;
          label: string;
          fullPath: string;
          rows: CityData[];
          children: Record<string, GroupNode>;
        }

        const rootGroups: Record<string, GroupNode> = {};
        activeData.forEach(row => {
          let currentMap = rootGroups;
          let pathSoFar = '';
          rowFields.forEach((rf, idx) => {
            const val = String(getRowValue(row, rf) || 'N/A');
            pathSoFar = pathSoFar ? `${pathSoFar} > ${val}` : val;
            if (!currentMap[val]) {
              currentMap[val] = {
                key: val,
                level: idx,
                label: val,
                fullPath: pathSoFar,
                rows: [],
                children: {}
              };
            }
            currentMap[val].rows.push(row);
            currentMap = currentMap[val].children;
          });
        });

        const calcAgg = (rows: CityData[], fieldKey: string, agg: AggregationType): number => {
          if (!rows.length) return 0;
          const values = rows.map(r => parseNumericValue(getRowValue(r, fieldKey)));
          switch (agg) {
            case 'SUM': return values.reduce((acc, v) => acc + v, 0);
            case 'AVERAGE': return values.length > 0 ? values.reduce((acc, v) => acc + v, 0) / values.length : 0;
            case 'COUNT': return rows.length;
            case 'MIN': return values.length ? Math.min(...values) : 0;
            case 'MAX': return values.length ? Math.max(...values) : 0;
            default: return 0;
          }
        };

        interface FlatRow {
          label: string;
          level: number;
          cellValues: Record<string, Record<string, number>>;
          rowTotals: Record<string, number>;
        }
        const flatRows: FlatRow[] = [];

        const processGroup = (group: GroupNode) => {
          const cellValues: Record<string, Record<string, number>> = {};
          const rowTotals: Record<string, number> = {};

          valueFields.forEach(vf => {
            rowTotals[vf.id] = calcAgg(group.rows, vf.field, vf.agg);
          });

          if (colField && colValues.length > 0) {
            colValues.forEach(cv => {
              const colFilteredRows = group.rows.filter(r => String(getRowValue(r, colField) || 'N/A') === cv);
              cellValues[cv] = {};
              valueFields.forEach(vf => {
                cellValues[cv][vf.id] = calcAgg(colFilteredRows, vf.field, vf.agg);
              });
            });
          } else {
            cellValues['default'] = {};
            valueFields.forEach(vf => {
              cellValues['default'][vf.id] = rowTotals[vf.id];
            });
          }

          flatRows.push({
            label: group.label,
            level: group.level,
            cellValues,
            rowTotals
          });

          Object.values(group.children).forEach(child => processGroup(child));
        };

        Object.values(rootGroups).forEach(g => processGroup(g));

        // Grand Totals
        const grandTotals: Record<string, Record<string, number>> = {};
        const grandRowTotals: Record<string, number> = {};
        valueFields.forEach(vf => {
          grandRowTotals[vf.id] = calcAgg(activeData, vf.field, vf.agg);
        });

        if (colField && colValues.length > 0) {
          colValues.forEach(cv => {
            const colFilteredRows = activeData.filter(r => String(getRowValue(r, colField) || 'N/A') === cv);
            grandTotals[cv] = {};
            valueFields.forEach(vf => {
              grandTotals[cv][vf.id] = calcAgg(colFilteredRows, vf.field, vf.agg);
            });
          });
        } else {
          grandTotals['default'] = {};
          valueFields.forEach(vf => {
            grandTotals['default'][vf.id] = grandRowTotals[vf.id];
          });
        }

        // Header Rows
        if (colField && colValues.length > 0) {
          const h1: any[] = [rowFields.map(rf => availableFields.find(f => f.key === rf)?.label || rf).join(' > ')];
          colValues.forEach(cv => {
            h1.push(cv);
            for (let i = 1; i < valueFields.length; i++) h1.push('');
          });
          h1.push('TOTAL KESELURUHAN');
          for (let i = 1; i < valueFields.length; i++) h1.push('');
          aoa.push(h1);

          const h2: any[] = [''];
          colValues.forEach(() => {
            valueFields.forEach(vf => h2.push(vf.label));
          });
          valueFields.forEach(vf => h2.push(vf.label));
          aoa.push(h2);
        } else {
          const h: any[] = [rowFields.map(rf => availableFields.find(f => f.key === rf)?.label || rf).join(' > ')];
          valueFields.forEach(vf => h.push(vf.label));
          aoa.push(h);
        }

        // Data Rows
        flatRows.forEach(row => {
          const indent = '  '.repeat(row.level);
          const rData: any[] = [`${indent}${row.label}`];

          if (colField && colValues.length > 0) {
            colValues.forEach(cv => {
              valueFields.forEach(vf => {
                const num = row.cellValues[cv]?.[vf.id] ?? 0;
                rData.push(vf.format === 'percent' ? Number(num.toFixed(1)) : Math.round(num));
              });
            });
            valueFields.forEach(vf => {
              const num = row.rowTotals[vf.id] ?? 0;
              rData.push(vf.format === 'percent' ? Number(num.toFixed(1)) : Math.round(num));
            });
          } else {
            valueFields.forEach(vf => {
              const num = row.cellValues['default']?.[vf.id] ?? 0;
              rData.push(vf.format === 'percent' ? Number(num.toFixed(1)) : Math.round(num));
            });
          }
          aoa.push(rData);
        });

        // Grand Total Row
        const gtRow: any[] = ['TOTAL KESELURUHAN (GRAND TOTAL)'];
        if (colField && colValues.length > 0) {
          colValues.forEach(cv => {
            valueFields.forEach(vf => {
              const num = grandTotals[cv]?.[vf.id] ?? 0;
              gtRow.push(vf.format === 'percent' ? Number(num.toFixed(1)) : Math.round(num));
            });
          });
          valueFields.forEach(vf => {
            const num = grandRowTotals[vf.id] ?? 0;
            gtRow.push(vf.format === 'percent' ? Number(num.toFixed(1)) : Math.round(num));
          });
        } else {
          valueFields.forEach(vf => {
            const num = grandTotals['default']?.[vf.id] ?? 0;
            gtRow.push(vf.format === 'percent' ? Number(num.toFixed(1)) : Math.round(num));
          });
        }
        aoa.push(gtRow);

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const colWidths = aoa[aoa.length - 2]?.map(() => ({ wch: 18 })) || [];
        colWidths[0] = { wch: 34 };
        ws['!cols'] = colWidths;

        let cleanName = tableName.replace(/[\\/?*[\]]/g, '').slice(0, 28).trim();
        if (!cleanName) cleanName = `Tabel_${tableIndex + 1}`;
        if (wb.SheetNames.includes(cleanName)) {
          cleanName = `${cleanName}_${tableIndex + 1}`.slice(0, 31);
        }

        XLSX.utils.book_append_sheet(wb, ws, cleanName);
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const cleanTabName = activeTab.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      XLSX.writeFile(wb, `Laporan_${cleanTabName}_${dateStr}.xlsx`);
      setPresetSuccessToast(`Berhasil mengekspor semua tabel dalam tab "${activeTab.name}" ke Excel!`);
    } catch (err: any) {
      console.error(err);
      setPresetErrorMessage(`Gagal mengekspor: ${err?.message || 'Terjadi kesalahan'}`);
    }
  };

  const handleExportAllTabsToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      tabs.forEach((tab, tabIdx) => {
        const currentTabTables = tab.tables || [];

        currentTabTables.forEach((table, tableIndex) => {
          const activeData = table.useFilteredData ? filteredCities : citiesData;
          const rowFields = table.rowFields || ['KEPWIL'];
          const columnFields = table.columnFields || [];
          const valueFields = table.valueFields || [];
          const aoa: any[][] = [];

          const tableName = table.name || table.title || `Tabel ${tableIndex + 1}`;
          aoa.push([`TAB ${tabIdx + 1}: ${tab.name}`]);
          aoa.push([tableName]);
          aoa.push([table.description || 'Laporan Pivot Table Senada']);
          aoa.push([`Dibuat: ${new Date().toLocaleString('id-ID')} | Total Data: ${activeData.length} baris`]);
          aoa.push([]);

          // Build hierarchy groups
          const colField = columnFields[0];
          let colValues: string[] = [];
          if (colField) {
            const set = new Set<string>();
            activeData.forEach(r => {
              const val = String(getRowValue(r, colField) || 'N/A');
              set.add(val);
            });
            colValues = Array.from(set).sort((a, b) => a.localeCompare(b));
          }

          interface GroupNode {
            key: string;
            level: number;
            label: string;
            fullPath: string;
            rows: CityData[];
            children: Record<string, GroupNode>;
          }

          const rootGroups: Record<string, GroupNode> = {};
          activeData.forEach(row => {
            let currentMap = rootGroups;
            let pathSoFar = '';
            rowFields.forEach((rf, idx) => {
              const val = String(getRowValue(row, rf) || 'N/A');
              pathSoFar = pathSoFar ? `${pathSoFar} > ${val}` : val;
              if (!currentMap[val]) {
                currentMap[val] = {
                  key: val,
                  level: idx,
                  label: val,
                  fullPath: pathSoFar,
                  rows: [],
                  children: {}
                };
              }
              currentMap[val].rows.push(row);
              currentMap = currentMap[val].children;
            });
          });

          const calcAgg = (rows: CityData[], fieldKey: string, agg: AggregationType): number => {
            if (!rows.length) return 0;
            const values = rows.map(r => parseNumericValue(getRowValue(r, fieldKey)));
            switch (agg) {
              case 'SUM': return values.reduce((acc, v) => acc + v, 0);
              case 'AVERAGE': return values.length > 0 ? values.reduce((acc, v) => acc + v, 0) / values.length : 0;
              case 'COUNT': return rows.length;
              case 'MIN': return values.length ? Math.min(...values) : 0;
              case 'MAX': return values.length ? Math.max(...values) : 0;
              default: return 0;
            }
          };

          interface FlatRow {
            label: string;
            level: number;
            cellValues: Record<string, Record<string, number>>;
            rowTotals: Record<string, number>;
          }
          const flatRows: FlatRow[] = [];

          const processGroup = (group: GroupNode) => {
            const cellValues: Record<string, Record<string, number>> = {};
            const rowTotals: Record<string, number> = {};

            valueFields.forEach(vf => {
              rowTotals[vf.id] = calcAgg(group.rows, vf.field, vf.agg);
            });

            if (colField && colValues.length > 0) {
              colValues.forEach(cv => {
                const colFilteredRows = group.rows.filter(r => String(getRowValue(r, colField) || 'N/A') === cv);
                cellValues[cv] = {};
                valueFields.forEach(vf => {
                  cellValues[cv][vf.id] = calcAgg(colFilteredRows, vf.field, vf.agg);
                });
              });
            } else {
              cellValues['default'] = {};
              valueFields.forEach(vf => {
                cellValues['default'][vf.id] = rowTotals[vf.id];
              });
            }

            flatRows.push({
              label: group.label,
              level: group.level,
              cellValues,
              rowTotals
            });

            Object.values(group.children).forEach(child => processGroup(child));
          };

          Object.values(rootGroups).forEach(g => processGroup(g));

          // Grand Totals
          const grandTotals: Record<string, Record<string, number>> = {};
          const grandRowTotals: Record<string, number> = {};
          valueFields.forEach(vf => {
            grandRowTotals[vf.id] = calcAgg(activeData, vf.field, vf.agg);
          });

          if (colField && colValues.length > 0) {
            colValues.forEach(cv => {
              const colFilteredRows = activeData.filter(r => String(getRowValue(r, colField) || 'N/A') === cv);
              grandTotals[cv] = {};
              valueFields.forEach(vf => {
                grandTotals[cv][vf.id] = calcAgg(colFilteredRows, vf.field, vf.agg);
              });
            });
          } else {
            grandTotals['default'] = {};
            valueFields.forEach(vf => {
              grandTotals['default'][vf.id] = grandRowTotals[vf.id];
            });
          }

          // Header Rows
          if (colField && colValues.length > 0) {
            const h1: any[] = [rowFields.map(rf => availableFields.find(f => f.key === rf)?.label || rf).join(' > ')];
            colValues.forEach(cv => {
              h1.push(cv);
              for (let i = 1; i < valueFields.length; i++) h1.push('');
            });
            h1.push('TOTAL KESELURUHAN');
            for (let i = 1; i < valueFields.length; i++) h1.push('');
            aoa.push(h1);

            const h2: any[] = [''];
            colValues.forEach(() => {
              valueFields.forEach(vf => h2.push(vf.label));
            });
            valueFields.forEach(vf => h2.push(vf.label));
            aoa.push(h2);
          } else {
            const h: any[] = [rowFields.map(rf => availableFields.find(f => f.key === rf)?.label || rf).join(' > ')];
            valueFields.forEach(vf => h.push(vf.label));
            aoa.push(h);
          }

          // Data Rows
          flatRows.forEach(row => {
            const indent = '  '.repeat(row.level);
            const rData: any[] = [`${indent}${row.label}`];

            if (colField && colValues.length > 0) {
              colValues.forEach(cv => {
                valueFields.forEach(vf => {
                  const num = row.cellValues[cv]?.[vf.id] ?? 0;
                  rData.push(vf.format === 'percent' ? Number(num.toFixed(1)) : Math.round(num));
                });
              });
              valueFields.forEach(vf => {
                const num = row.rowTotals[vf.id] ?? 0;
                rData.push(vf.format === 'percent' ? Number(num.toFixed(1)) : Math.round(num));
              });
            } else {
              valueFields.forEach(vf => {
                const num = row.cellValues['default']?.[vf.id] ?? 0;
                rData.push(vf.format === 'percent' ? Number(num.toFixed(1)) : Math.round(num));
              });
            }
            aoa.push(rData);
          });

          // Grand Total Row
          const gtRow: any[] = ['TOTAL KESELURUHAN (GRAND TOTAL)'];
          if (colField && colValues.length > 0) {
            colValues.forEach(cv => {
              valueFields.forEach(vf => {
                const num = grandTotals[cv]?.[vf.id] ?? 0;
                gtRow.push(vf.format === 'percent' ? Number(num.toFixed(1)) : Math.round(num));
              });
            });
            valueFields.forEach(vf => {
              const num = grandRowTotals[vf.id] ?? 0;
              gtRow.push(vf.format === 'percent' ? Number(num.toFixed(1)) : Math.round(num));
            });
          } else {
            valueFields.forEach(vf => {
              const num = grandTotals['default']?.[vf.id] ?? 0;
              gtRow.push(vf.format === 'percent' ? Number(num.toFixed(1)) : Math.round(num));
            });
          }
          aoa.push(gtRow);

          const ws = XLSX.utils.aoa_to_sheet(aoa);
          const colWidths = aoa[aoa.length - 2]?.map(() => ({ wch: 18 })) || [];
          colWidths[0] = { wch: 34 };
          ws['!cols'] = colWidths;

          let cleanName = `T${tabIdx + 1}_${tableName}`.replace(/[\\/?*[\]]/g, '').slice(0, 28).trim();
          if (wb.SheetNames.includes(cleanName)) {
            cleanName = `${cleanName}_${tableIndex + 1}`.slice(0, 31);
          }

          XLSX.utils.book_append_sheet(wb, ws, cleanName);
        });
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Laporan_Semua_Tab_Pivot_${dateStr}.xlsx`);
      setPresetSuccessToast(`Berhasil mengekspor seluruh ${tabs.length} tab (${totalTablesCount} tabel) ke 1 file Excel!`);
    } catch (err: any) {
      console.error(err);
      setPresetErrorMessage(`Gagal mengekspor: ${err?.message || 'Terjadi kesalahan'}`);
    }
  };

  // Custom Variable Handlers
  const handleOpenEditCustomVariable = (cf: CustomSpreadsheetField) => {
    setEditingCustomKey(cf.key);
    setNewVarName(cf.label);
    setNewVarKind(cf.varKind || (cf.type === 'metric' ? 'poin' : 'kategori'));
    setNewVarMethod(cf.calcMethod || 'group_sum');
    setNewVarSourceCol(cf.sourceColumn || 'Kepatuhan_SLA');
    setNewVarSourceCols(cf.sourceColumns || (cf.sourceColumn ? [cf.sourceColumn] : ['Layanan_Informasi', 'Layanan_Permintaan', 'Layanan_Pengaduan']));
    if (cf.thresholds) setNewVarThresholds(cf.thresholds);
    if (cf.multiplier !== undefined) setNewVarMultiplier(cf.multiplier);
    if (cf.textMappings) setNewVarTextMappings(cf.textMappings);
    setIsAddVarModalOpen(true);
  };

  const handleDeleteCustomVariable = (keyToDelete: string) => {
    setCustomFields(prev => prev.filter(f => f.key !== keyToDelete));
    // Remove from all tables in all tabs
    setTabs(prev => prev.map(tab => ({
      ...tab,
      tables: tab.tables.map(t => ({
        ...t,
        rowFields: t.rowFields.filter(k => k !== keyToDelete),
        columnFields: t.columnFields.filter(k => k !== keyToDelete),
        valueFields: t.valueFields.filter(v => v.field !== keyToDelete)
      }))
    })));
  };

  const handleSaveCustomVariable = () => {
    if (!newVarName.trim()) {
      alert('Mohon masukkan nama variabel.');
      return;
    }

    if (editingCustomKey) {
      setCustomFields(prev => prev.map(cf => {
        if (cf.key === editingCustomKey) {
          return {
            ...cf,
            label: newVarName.trim(),
            type: newVarKind === 'poin' ? 'metric' : 'dimension',
            varKind: newVarKind,
            sourceColumn: newVarMethod === 'group_sum' ? newVarSourceCols[0] : newVarSourceCol,
            sourceColumns: newVarMethod === 'group_sum' ? newVarSourceCols : undefined,
            calcMethod: newVarMethod,
            thresholds: newVarThresholds,
            multiplier: newVarMultiplier,
            textMappings: newVarTextMappings,
          };
        }
        return cf;
      }));
    } else {
      const key = `custom_${Date.now()}`;
      const newField: CustomSpreadsheetField = {
        key,
        label: newVarName.trim(),
        type: newVarKind === 'poin' ? 'metric' : 'dimension',
        varKind: newVarKind,
        sourceColumn: newVarMethod === 'group_sum' ? newVarSourceCols[0] : newVarSourceCol,
        sourceColumns: newVarMethod === 'group_sum' ? newVarSourceCols : undefined,
        calcMethod: newVarMethod,
        thresholds: newVarThresholds,
        multiplier: newVarMultiplier,
        textMappings: newVarTextMappings,
      };
      setCustomFields(prev => [...prev, newField]);
    }

    setIsAddVarModalOpen(false);
    setEditingCustomKey(null);
    setNewVarName('');
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* =========================================================================
          0. MASTER DASHBOARD HEADER WITH TAB & TABLE MANAGEMENT
          ========================================================================= */}
      <div className="w-full bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden sticky top-2 z-30">
        {/* Top Header Bar */}
        <div className="bg-slate-900 px-5 py-3.5 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
              <TableProperties className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Laporan Pivot Table Multi-Tab</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                  {tabs.length} Tab Halaman
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {totalTablesCount} Total Tabel
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Kelola lembar tab kerja mandiri dan tambahkan beberapa tabel pivot di dalam setiap tab.
              </p>
            </div>
          </div>

          {/* Master Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* 1. Export All Tabs Excel */}
            <button
              type="button"
              onClick={handleExportAllTabsToExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 shadow-xs transition-all cursor-pointer"
              title="Download seluruh tab dan tabel ke dalam 1 file Excel multi-sheet"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Semua Tab (.xlsx)</span>
            </button>

            {/* 2. + Tambah Tabel ke Tab Aktif */}
            <button
              type="button"
              onClick={handleOpenAddTableModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 shadow-xs transition-all cursor-pointer"
              title={`Tambah tabel pivot baru ke dalam tab "${activeTab.name}"`}
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Tabel ke Tab Ini</span>
            </button>
          </div>
        </div>

        {/* TAB WORKSPACE SELECTOR BAR (LEMBAR TAB HALAMAN) */}
        <div className="bg-slate-950 px-4 pt-2.5 pb-0 flex items-center justify-between gap-3 overflow-x-auto select-none border-t border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0">
            <div className="flex items-center gap-1.5 py-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
                Lembar Tab:
              </span>

              {tabs.map((tab, idx) => {
                const isActive = tab.id === activeTabId;
                const tabTableCount = tab.tables ? tab.tables.length : 0;

                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    onDoubleClick={() => handleStartRenameTab(tab)}
                    className={`group relative flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t-2 shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-white text-slate-900 border-emerald-500 shadow-md ring-1 ring-slate-200/50'
                        : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border-transparent'
                    }`}
                    title="Klik untuk membuka tab ini (Klik 2x untuk ganti nama tab)"
                  >
                    <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-bold font-mono ${
                      isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>

                    <span className="max-w-[150px] truncate">{tab.name}</span>

                    {/* Table count in this tab badge */}
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {tabTableCount} tbl
                    </span>

                    {/* Quick Tab Actions */}
                    <div className="flex items-center gap-0.5 ml-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRenameTab(tab);
                        }}
                        className={`p-1 rounded hover:bg-slate-200/90 transition-colors ${
                          isActive ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Ubah nama tab ini"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateTab(tab);
                        }}
                        className={`p-1 rounded hover:bg-slate-200/90 transition-colors ${
                          isActive ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Duplikat tab ini beserta tabel di dalamnya"
                      >
                        <Copy className="w-2.5 h-2.5" />
                      </button>
                      {tabs.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestDeleteTab(tab);
                          }}
                          className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Hapus tab ini"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* + Tambah Tab Button in Tab Bar */}
              <button
                type="button"
                onClick={handleOpenAddTabModal}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-t-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border-t-2 border-emerald-400 shadow-sm transition-all shrink-0 cursor-pointer"
                title="Tambah lembar tab/halaman baru"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Tab</span>
              </button>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 shrink-0 pb-1">
            <span>Tab Aktif: <strong className="text-emerald-400">{tabs.findIndex(t => t.id === activeTabId) + 1} dari {tabs.length}</strong></span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          1. ACTIVE TAB CONTENT: BANNER & LIST OF TABLES IN THIS TAB
          ========================================================================= */}
      <div className="w-full flex flex-col gap-6">
        {/* Tab Header Banner */}
        <div className="w-full bg-linear-to-r from-slate-900 to-slate-850 rounded-2xl p-4 sm:p-5 text-white border border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-lg shrink-0">
              #{tabs.findIndex(t => t.id === activeTab.id) + 1}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{activeTab.name}</span>
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {activeTab.tables?.length || 0} Tabel dalam Tab Ini
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {activeTab.description || 'Halaman tab kerja dengan tabel-tabel pivot kustom.'}
              </p>
            </div>
          </div>

          {/* Action buttons on this active tab */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportActiveTabToExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Download semua tabel dalam tab ini ke 1 file Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Tab Ini (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => handleStartRenameTab(activeTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Ubah nama tab ini"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Ubah Nama Tab</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddTableModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 shadow-xs transition-all cursor-pointer"
              title="Tambahkan tabel analisis lain dalam halaman tab ini"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Tabel Baru</span>
            </button>
          </div>
        </div>

        {/* LIST OF TABLES INSIDE THIS ACTIVE TAB */}
        <div className="flex flex-col gap-6">
          {activeTab.tables && activeTab.tables.length > 0 ? (
            activeTab.tables.map((table, index) => (
              <PivotTableInstanceView
                key={table.id}
                table={table}
                tableIndex={index}
                totalTables={activeTab.tables.length}
                tabName={activeTab.name}
                citiesData={citiesData}
                filteredCities={filteredCities}
                availableFields={availableFields}
                customFields={customFields}
                onUpdateTable={handleUpdateTableInstance}
                onDuplicateTable={handleDuplicateTable}
                onStartRenameTable={handleStartRenameTable}
                onRequestDeleteTable={handleRequestDeleteTable}
                onMoveTable={handleMoveTable}
                onOpenEditCustomVariable={handleOpenEditCustomVariable}
                onDeleteCustomVariable={handleDeleteCustomVariable}
                onOpenAddCustomVariable={() => {
                  setEditingCustomKey(null);
                  setNewVarName('');
                  setIsAddVarModalOpen(true);
                }}
                onOpenPresetModal={(tId) => {
                  setActivePresetTableId(tId);
                  setIsPresetModalOpen(true);
                }}
                viewMode="all"
                isActiveTable={true}
                onSelectTable={() => {}}
              />
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center flex flex-col items-center justify-center gap-3">
              <TableProperties className="w-10 h-10 text-slate-300" />
              <h4 className="text-sm font-bold text-slate-700">Belum Ada Tabel di Tab Ini</h4>
              <p className="text-xs text-slate-400 max-w-md">
                Klik tombol "+ Tambah Tabel Baru" untuk mulai menambahkan tabel pivot ke dalam tab "{activeTab.name}".
              </p>
              <button
                type="button"
                onClick={handleOpenAddTableModal}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Tabel Pertama</span>
              </button>
            </div>
          )}

          {/* Quick Add Table Card at the Bottom of Tab Page */}
          <div
            onClick={handleOpenAddTableModal}
            className="w-full py-6 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl bg-white hover:bg-indigo-50/40 text-slate-600 hover:text-indigo-700 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer shadow-2xs group"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-100 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <div className="text-center">
              <span className="text-xs font-bold block">
                + Tambah Tabel Baru ke Tab "{activeTab.name}"
              </span>
              <span className="text-[11px] text-slate-400">
                Tambahkan tabel pivot analisis lain di halaman tab ini
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL A: TAMBAH TAB / LEMBAR HALAMAN BARU
          ========================================================================= */}
      {isAddTabModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">Tambah Lembar Tab / Halaman Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTabModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lembar Tab:
                </label>
                <input
                  type="text"
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  placeholder="Contoh: Tab 3: Monitoring Cabang Tertentu"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-semibold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan Tab (Opsional):
                </label>
                <textarea
                  value={newTabDesc}
                  onChange={(e) => setNewTabDesc(e.target.value)}
                  rows={2}
                  placeholder="Deskripsi singkat tujuan analisis tab ini..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tabel Awal untuk Tab Baru Ini:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="tabTemplateChoice"
                      value="rekap_wilayah"
                      checked={newTabTemplate === 'rekap_wilayah'}
                      onChange={() => setNewTabTemplate('rekap_wilayah')}
                      className="accent-emerald-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Template Rekapitulasi Wilayah (Standar)</span>
                      <span className="text-[11px] text-slate-500">Otomatis membuat 1 tabel rekap informasi, permintaan, pengaduan & SLA</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="tabTemplateChoice"
                      value="evaluasi_sla"
                      checked={newTabTemplate === 'evaluasi_sla'}
                      onChange={() => setNewTabTemplate('evaluasi_sla')}
                      className="accent-emerald-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Template Evaluasi Kepatuhan SLA</span>
                      <span className="text-[11px] text-slate-500">1 tabel analisis persentase kepatuhan & durasi hari SLA</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="tabTemplateChoice"
                      value="copy_current"
                      checked={newTabTemplate === 'copy_current'}
                      onChange={() => setNewTabTemplate('copy_current')}
                      className="accent-emerald-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Salin Susunan Tab Saat Ini ("{activeTab.name}")</span>
                      <span className="text-[11px] text-slate-500">Menduplikasi seluruh tabel dari tab aktif ke tab baru</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="tabTemplateChoice"
                      value="blank"
                      checked={newTabTemplate === 'blank'}
                      onChange={() => setNewTabTemplate('blank')}
                      className="accent-emerald-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Tabel Kosong (Mulai dari Awal)</span>
                      <span className="text-[11px] text-slate-500">Hanya baris Wilayah dan 1 metrik total</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTabModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddTab}
                  disabled={!newTabName.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Buat Tab Baru</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL B: TAMBAH TABEL BARU KE TAB AKTIF
          ========================================================================= */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TableProperties className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold">
                  Tambah Tabel ke Tab: <span className="text-emerald-400">"{activeTab.name}"</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTableModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Tabel:
                </label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="Contoh: Tabel 3: Rincian Pengaduan Khusus"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-semibold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan Singkat Tabel (Opsional):
                </label>
                <textarea
                  value={newTableDesc}
                  onChange={(e) => setNewTableDesc(e.target.value)}
                  rows={2}
                  placeholder="Deskripsi singkat isi laporan tabel ini..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mulai Dari Template Tabel:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="templateChoice"
                      value="copy_current"
                      checked={newTableTemplate === 'copy_current'}
                      onChange={() => setNewTableTemplate('copy_current')}
                      className="accent-indigo-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Salin Susunan Tabel Terakhir di Tab Ini</span>
                      <span className="text-[11px] text-slate-500">Menduplikasi susunan baris, kolom silang, dan metrik tabel sebelumnya</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="templateChoice"
                      value="rekap_wilayah"
                      checked={newTableTemplate === 'rekap_wilayah'}
                      onChange={() => setNewTableTemplate('rekap_wilayah')}
                      className="accent-indigo-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Rekapitulasi Wilayah (Informasi, Permintaan, Pengaduan)</span>
                      <span className="text-[11px] text-slate-500">Tabel standar volume lengkap per Kedeputian Wilayah</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="templateChoice"
                      value="matriks_bulan"
                      checked={newTableTemplate === 'matriks_bulan'}
                      onChange={() => setNewTableTemplate('matriks_bulan')}
                      className="accent-indigo-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Matriks Silang Wilayah x Bulan</span>
                      <span className="text-[11px] text-slate-500">Tabel silang volume total melintasi periode bulan</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="templateChoice"
                      value="blank"
                      checked={newTableTemplate === 'blank'}
                      onChange={() => setNewTableTemplate('blank')}
                      className="accent-indigo-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">Tabel Kosong (Mulai dari Awal)</span>
                      <span className="text-[11px] text-slate-500">Hanya baris Wilayah (KEPWIL), pilih dan pasang kolom sendiri</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTableModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddTable}
                  disabled={!newTableName.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambahkan Tabel ke Tab</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL C: GANTI NAMA TAB
          ========================================================================= */}
      {tabToRename && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Ubah Nama Tab</h3>
              </div>
              <button
                type="button"
                onClick={() => setTabToRename(null)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lembar Tab:
                </label>
                <input
                  type="text"
                  value={renameTabInput}
                  onChange={(e) => setRenameTabInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-semibold"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTabToRename(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRenameTab}
                  disabled={!renameTabInput.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Nama Tab</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL D: KONFIRMASI HAPUS TAB
          ========================================================================= */}
      {tabToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Hapus Tab "{tabToDelete.name}"?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Apakah Anda yakin ingin menghapus seluruh tab ini beserta <strong>{tabToDelete.tables?.length || 0} tabel</strong> di dalamnya? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTabToDelete(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTab}
                className="px-3.5 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer"
              >
                Ya, Hapus Tab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL E: GANTI NAMA TABEL
          ========================================================================= */}
      {tableToRename && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Ubah Nama Tabel</h3>
              </div>
              <button
                type="button"
                onClick={() => setTableToRename(null)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Baru:
                </label>
                <input
                  type="text"
                  value={renameTableInput}
                  onChange={(e) => setRenameTableInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-semibold"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTableToRename(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRenameTable}
                  disabled={!renameTableInput.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL F: KONFIRMASI HAPUS TABEL DARI TAB
          ========================================================================= */}
      {tableToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Hapus Tabel Ini dari Tab?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Apakah Anda yakin ingin menghapus <strong>"{tableToDelete.name || tableToDelete.title}"</strong> dari tab "{activeTab.name}"?
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTableToDelete(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTable}
                className="px-3.5 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL G: TAMBAH / EDIT VARIABEL KUSTOM
          ========================================================================= */}
      {isAddVarModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold">
                  {editingCustomKey ? 'Edit Kolom / Variabel Kustom' : 'Buat Kolom / Variabel Kustom Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVarModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kolom / Variabel:
                </label>
                <input
                  type="text"
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value)}
                  placeholder="Contoh: Total Gabungan Layanan, Skor Bintang, dll"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-purple-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jenis Variabel:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewVarKind('poin');
                      setNewVarMethod('group_sum');
                    }}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      newVarKind === 'poin'
                        ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-400 text-purple-950 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="block font-bold">🔢 Poin / Angka (Metrik)</span>
                    <span className="text-[10px] text-slate-500 block">Dapat dijumlahkan, dirata-rata (SUM/AVG)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewVarKind('kategori');
                      setNewVarMethod('range_bins');
                    }}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      newVarKind === 'kategori'
                        ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-400 text-purple-950 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="block font-bold">🔤 Kategori / Teks (Dimensi)</span>
                    <span className="text-[10px] text-slate-500 block">Bisa dijadikan Baris atau Kolom Silang</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Metode Kalkulasi:
                </label>
                <select
                  value={newVarMethod}
                  onChange={(e) => setNewVarMethod(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-purple-500"
                >
                  <option value="group_sum">➕ Pengelompokan & Penjumlahan Beberapa Kolom (Group Sum)</option>
                  <option value="threshold_scoring">🎯 Skor Bertingkat Berdasarkan Nilai Angka</option>
                  <option value="multiplier">✖️ Pengali (Multiplier xN)</option>
                  <option value="range_bins">🏷️ Klasifikasi Rentang Nilai (Tinggi / Sedang / Rendah)</option>
                </select>
              </div>

              {/* Group sum column checkboxes */}
              {newVarMethod === 'group_sum' && (
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200">
                  <span className="text-xs font-bold text-purple-950 block mb-2">
                    Pilih Kolom-kolom yang ingin dijumlahkan bersama:
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {['Layanan_Informasi', 'Layanan_Permintaan', 'Layanan_Pengaduan', 'Total', 'Rata_Rata_Hari_SLA'].map(col => {
                      const isChecked = newVarSourceCols.includes(col);
                      return (
                        <label key={col} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                if (newVarSourceCols.length > 1) {
                                  setNewVarSourceCols(newVarSourceCols.filter(c => c !== col));
                                }
                              } else {
                                setNewVarSourceCols([...newVarSourceCols, col]);
                              }
                            }}
                            className="accent-purple-600 rounded"
                          />
                          <span>{col.replace(/_/g, ' ')}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddVarModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomVariable}
                  disabled={!newVarName.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Variabel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK */}
      {presetSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-500 flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{presetSuccessToast}</span>
        </div>
      )}

      {presetErrorMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-rose-500 flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom-5 duration-200">
          <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
          <span>{presetErrorMessage}</span>
          <button
            type="button"
            onClick={() => setPresetErrorMessage(null)}
            className="ml-2 text-rose-300 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportingPivotTable;
