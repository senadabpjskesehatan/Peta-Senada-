import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RefreshCw,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  Layers,
  Columns,
  Eye,
  EyeOff,
  MoreVertical,
  HelpCircle,
  Filter,
  FileDown,
  GripVertical,
  CheckSquare,
  Square
} from 'lucide-react';
import { CityData, MapSyncConfig } from '../types';

export interface TableColumnDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'percent';
  isCustom?: boolean;
  isCore?: boolean;
  visible: boolean;
  width?: string;
}

export const GOOGLE_SHEET_DEFAULT_COLUMNS: TableColumnDef[] = [
  { key: 'BULAN', label: 'BULAN', type: 'text', isCore: true, visible: true, width: 'w-32' },
  { key: 'KEPWIL', label: 'KEPWIL', type: 'text', isCore: true, visible: true, width: 'w-48' },
  { key: 'KANTOR CABANG', label: 'KANTOR CABANG', type: 'text', isCore: true, visible: true, width: 'w-48' },
  { key: 'Layanan_Informasi', label: 'Layanan_Informasi', type: 'number', isCore: true, visible: true, width: 'w-36' },
  { key: 'Layanan_Permintaan', label: 'Layanan_Permintaan', type: 'number', isCore: true, visible: true, width: 'w-36' },
  { key: 'Layanan_Pengaduan', label: 'Layanan_Pengaduan', type: 'number', isCore: true, visible: true, width: 'w-36' },
  { key: 'Kepatuhan_SLA', label: 'Kepatuhan_SLA', type: 'percent', isCore: true, visible: true, width: 'w-36' },
];

export const DEFAULT_TABLE_COLUMNS: TableColumnDef[] = GOOGLE_SHEET_DEFAULT_COLUMNS;

export const MONTH_ORDER: Record<string, number> = {
  'januari': 1, 'jan': 1,
  'februari': 2, 'feb': 2,
  'maret': 3, 'mar': 3,
  'april': 4, 'apr': 4,
  'mei': 5, 'may': 5,
  'juni': 6, 'jun': 6,
  'juli': 7, 'jul': 7,
  'agustus': 8, 'agu': 8, 'agt': 8,
  'september': 9, 'sep': 9,
  'oktober': 10, 'okt': 10,
  'november': 11, 'nov': 11,
  'desember': 12, 'des': 12
};

// Universal helper to retrieve cell value across raw Google Sheet keys and mapped CityData properties
export const getRowCellValue = (row: CityData, key: string): any => {
  if (!row) return '';

  // 1. Direct match in rawRow from Google Sheet
  if (row.rawRow && row.rawRow[key] !== undefined && row.rawRow[key] !== null) {
    return row.rawRow[key];
  }

  // 2. Case-insensitive / trimmed match in rawRow
  if (row.rawRow && typeof row.rawRow === 'object') {
    const targetKeyLower = key.trim().toLowerCase();
    for (const [k, v] of Object.entries(row.rawRow)) {
      if (k.trim().toLowerCase() === targetKeyLower && v !== undefined && v !== null) {
        return v;
      }
    }
  }

  // 3. Direct match on CityData model properties
  if ((row as any)[key] !== undefined && (row as any)[key] !== null) {
    return (row as any)[key];
  }

  // 4. Normalized field matching against standard Google Sheet columns
  const clean = key.trim().toLowerCase().replace(/[_\s-]+/g, '');
  if (clean === 'bulan' || clean === 'periode' || clean === 'month') return row.bulan || '';
  if (clean === 'kepwil' || clean === 'wilayah' || clean === 'kedeputian' || clean === 'kedeputianwilayah') return row.kepwil || '';
  if (clean === 'kantorcabang' || clean === 'kc' || clean === 'kota' || clean === 'cabang' || clean === 'name') return row.kantorCabang || row.name || '';
  if (clean.includes('layananinformasi') || clean === 'informasi' || clean === 'info') return row.informasi ?? '';
  if (clean.includes('layananpermintaan') || clean.includes('permintaaninformasi') || clean === 'permintaan') return row.permintaan ?? '';
  if (clean.includes('layananpengaduan') || clean === 'pengaduan') return row.pengaduan ?? '';
  if (clean.includes('kepatuhansla') || clean === 'sla' || clean === 'slacompliance') return row.slaCompliance ?? '';
  if (clean === 'total' || clean.includes('totallayanan')) return row.total ?? '';
  if (clean.includes('avgsla') || clean.includes('rataratasla')) return row.avgSlaDays ?? '';

  return '';
};

// Build synchronized columns strictly according to the reference Google Sheet structure
export const buildSyncedColumns = (data: CityData[], existingCols?: TableColumnDef[]): TableColumnDef[] => {
  // Extract headers directly from rawRow of synced Google Sheet
  const detectedHeaders: string[] = [];
  if (Array.isArray(data)) {
    for (const c of data) {
      if (c.rawRow && typeof c.rawRow === 'object') {
        const keys = Object.keys(c.rawRow).map(k => k.trim()).filter(Boolean);
        if (keys.length > 0) {
          const validKeys = keys.filter(k => !['id', 'latitude', 'longitude', 'rawrow'].includes(k.toLowerCase()));
          if (validKeys.length > 0) {
            detectedHeaders.push(...validKeys);
            break;
          }
        }
      }
    }
  }

  // Pure Google Sheet reference headers
  const targetHeaders = detectedHeaders.length > 0
    ? Array.from(new Set(detectedHeaders))
    : GOOGLE_SHEET_DEFAULT_COLUMNS.map(c => c.key);

  const makeColDef = (header: string, visible = true): TableColumnDef => {
    const lower = header.toLowerCase();
    let type: 'text' | 'number' | 'percent' = 'text';
    if (lower.includes('sla') || lower.includes('%') || lower.includes('kepatuhan')) {
      type = 'percent';
    } else if (
      lower.includes('informasi') ||
      lower.includes('permintaan') ||
      lower.includes('pengaduan') ||
      lower.includes('total') ||
      lower.includes('jumlah') ||
      lower.includes('count') ||
      lower.includes('tiket')
    ) {
      type = 'number';
    }

    let width = 'w-36';
    if (lower.includes('cabang') || lower.includes('kota') || lower.includes('kc')) width = 'w-48';
    else if (lower.includes('kepwil') || lower.includes('wilayah') || lower.includes('kedeputian')) width = 'w-48';
    else if (lower.includes('bulan') || lower.includes('periode')) width = 'w-32';

    return {
      key: header,
      label: header,
      type,
      isCore: true,
      isCustom: false,
      visible,
      width
    };
  };

  if (existingCols && existingCols.length > 0) {
    const targetHeaderSet = new Set(targetHeaders.map(h => h.toLowerCase()));
    // Retain ONLY columns that exist in the Google Sheet data
    const validExisting = existingCols.filter(c => targetHeaderSet.has(c.key.toLowerCase()));

    // Align key and label to current Google Sheet header casing
    const updated: TableColumnDef[] = validExisting.map(c => {
      const match = targetHeaders.find(h => h.toLowerCase() === c.key.toLowerCase()) || c.key;
      return {
        ...c,
        key: match,
        label: match,
        isCustom: false,
        isCore: true
      };
    });

    // Append any newly appeared Google Sheet headers
    targetHeaders.forEach(h => {
      if (!updated.some(c => c.key.toLowerCase() === h.toLowerCase())) {
        updated.push(makeColDef(h, true));
      }
    });

    if (updated.length > 0) return updated;
  }

  return targetHeaders.map(h => makeColDef(h, true));
};

interface LaporanRekapTableProps {
  citiesData: CityData[];
  filteredCities: CityData[];
  onCitiesDataChange: (updated: CityData[]) => void;
  mapSyncConfig?: MapSyncConfig;
  googleSheetUrl?: string;
  lastSyncedAt?: string | null;
  onExecuteSync: () => Promise<void> | void;
  isRefreshing: boolean;
  isAdmin: boolean;
  onRequestAdminLogin: () => void;
  selectedBulan: string | string[];
  selectedKepwil: string | string[];
  selectedKantorCabang: string | string[];
  onSelectedBulanChange: (val: string | string[]) => void;
  onSelectedKepwilChange: (val: string | string[]) => void;
  onSelectedKantorCabangChange: (val: string | string[]) => void;
  availableBulanList: string[];
  availableKepwilList: string[];
  availableKantorCabangList: string[];
}

export const LaporanRekapTable: React.FC<LaporanRekapTableProps> = ({
  citiesData,
  filteredCities,
  onCitiesDataChange,
  mapSyncConfig,
  googleSheetUrl,
  lastSyncedAt,
  onExecuteSync,
  isRefreshing,
  isAdmin,
  onRequestAdminLogin,
  selectedBulan,
  selectedKepwil,
  selectedKantorCabang,
  onSelectedBulanChange,
  onSelectedKepwilChange,
  onSelectedKantorCabangChange,
  availableBulanList,
  availableKepwilList,
  availableKantorCabangList
}) => {
  // Local editable copy of data for table
  const [tableData, setTableData] = useState<CityData[]>(citiesData);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  // Sync with prop updates if not currently modified in draft
  useEffect(() => {
    if (!isDirty) {
      setTableData(citiesData);
    }
  }, [citiesData, isDirty]);

  // Dynamic columns definition containing strictly variables present in synced Google Sheet data
  const [columns, setColumns] = useState<TableColumnDef[]>(() => {
    const saved = localStorage.getItem('senada_laporan_sheet_columns_v4');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return buildSyncedColumns(citiesData, parsed);
        }
      } catch (e) {}
    }
    return buildSyncedColumns(citiesData);
  });

  // Keep columns strictly synchronized with available variables in data
  useEffect(() => {
    setColumns(prev => buildSyncedColumns(citiesData, prev));
  }, [citiesData]);

  // Persist columns whenever modified
  useEffect(() => {
    localStorage.setItem('senada_laporan_sheet_columns_v4', JSON.stringify(columns));
  }, [columns]);

  // Toggle grouping / merging identical values for BULAN, KEPWIL, KANTOR CABANG
  const [isMergeSameValues, setIsMergeSameValues] = useState<boolean>(true);

  // Helper functions for identifying grouping columns
  const isBulanKey = (k: string) => {
    const clean = k.toLowerCase().replace(/[_\s-]+/g, '');
    return clean === 'bulan' || clean === 'periode' || clean === 'month' || clean === 'bln';
  };

  const isKepwilKey = (k: string) => {
    const clean = k.toLowerCase().replace(/[_\s-]+/g, '');
    return clean === 'kepwil' || clean === 'wilayah' || clean === 'kedeputian' || clean === 'kedeputianwilayah' || clean === 'kanwil';
  };

  const isKcKey = (k: string) => {
    const clean = k.toLowerCase().replace(/[_\s-]+/g, '');
    return clean === 'kantorcabang' || clean === 'kc' || clean === 'cabang' || clean === 'kota' || clean === 'name';
  };

  const isGroupKey = (k: string) => isBulanKey(k) || isKepwilKey(k) || isKcKey(k);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBulan, setFilterBulan] = useState<string>(() => {
    if (Array.isArray(selectedBulan)) return selectedBulan[0] || 'Semua';
    return selectedBulan || 'Semua';
  });
  const [filterKepwil, setFilterKepwil] = useState<string>(() => {
    if (Array.isArray(selectedKepwil)) return selectedKepwil[0] || 'Semua';
    return selectedKepwil || 'Semua';
  });
  const [filterKantorCabang, setFilterKantorCabang] = useState<string>(() => {
    if (Array.isArray(selectedKantorCabang)) return selectedKantorCabang[0] || 'Semua';
    return selectedKantorCabang || 'Semua';
  });

  // Keep synchronized if parent filter props change
  useEffect(() => {
    if (selectedBulan) {
      const b = Array.isArray(selectedBulan) ? (selectedBulan[0] || 'Semua') : selectedBulan;
      setFilterBulan(b);
    }
  }, [selectedBulan]);

  useEffect(() => {
    if (selectedKepwil) {
      const k = Array.isArray(selectedKepwil) ? (selectedKepwil[0] || 'Semua') : selectedKepwil;
      setFilterKepwil(k);
    }
  }, [selectedKepwil]);

  useEffect(() => {
    if (selectedKantorCabang) {
      const c = Array.isArray(selectedKantorCabang) ? (selectedKantorCabang[0] || 'Semua') : selectedKantorCabang;
      setFilterKantorCabang(c);
    }
  }, [selectedKantorCabang]);

  const handleBulanChange = (val: string) => {
    setFilterBulan(val);
    onSelectedBulanChange?.(val);
    setCurrentPage(1);
  };

  const handleKepwilChange = (val: string) => {
    setFilterKepwil(val);
    onSelectedKepwilChange?.(val);
    setCurrentPage(1);
  };

  const handleKantorCabangChange = (val: string) => {
    setFilterKantorCabang(val);
    onSelectedKantorCabangChange?.(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilterBulan('Semua');
    setFilterKepwil('Semua');
    setFilterKantorCabang('Semua');
    setSearchQuery('');
    onSelectedBulanChange?.('Semua');
    onSelectedKepwilChange?.('Semua');
    onSelectedKantorCabangChange?.('Semua');
    setCurrentPage(1);
  };

  // Dynamic Kantor Cabang options for dropdown based on active Kepwil
  const dynamicCabangList = useMemo(() => {
    let source = tableData;
    if (filterKepwil && filterKepwil !== 'Semua') {
      source = source.filter(r => (r.kepwil || getRowCellValue(r, 'KEPWIL') || '').toLowerCase().includes(filterKepwil.toLowerCase()));
    }
    const set = new Set<string>();
    source.forEach(r => {
      const c = String(r.kantorCabang || r.name || getRowCellValue(r, 'KANTOR CABANG') || '').trim();
      if (c) set.add(c);
    });
    if (set.size > 0) return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
    return availableKantorCabangList || [];
  }, [tableData, filterKepwil, availableKantorCabangList]);

  // Default sorting: hierarchically by Bulan -> Kepwil -> Kantor Cabang
  const [sortField, setSortField] = useState<string>('BULAN');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const [editingColumnKey, setEditingColumnKey] = useState<string | null>(null);
  const [editingColumnLabel, setEditingColumnLabel] = useState('');

  const [isColumnVisibilityOpen, setIsColumnVisibilityOpen] = useState(false);
  // Drag and drop states for column manager popover and table headers
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);
  const [dragOverColIndex, setDragOverColIndex] = useState<number | null>(null);
  const [draggedHeaderKey, setDraggedHeaderKey] = useState<string | null>(null);
  const [dragOverHeaderKey, setDragOverHeaderKey] = useState<string | null>(null);
  const [isAddRowOpen, setIsAddRowOpen] = useState(false);
  const [newRowData, setNewRowData] = useState<Partial<CityData>>({
    name: '',
    kantorCabang: '',
    kepwil: 'KEPWIL JAWA BARAT',
    bulan: 'Januari',
    informasi: 0,
    permintaan: 0,
    pengaduan: 0,
    total: 0,
    slaCompliance: 90,
    avgSlaDays: 2.0
  });

  // Inline editing state: { rowId: string, field: string }
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editCellValue, setEditCellValue] = useState<string>('');

  // Export dropdown state
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered & Sorted Data with strict grouping
  const processedData = useMemo(() => {
    let result = [...tableData];

    // 1. Search query filter across all fields
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(row => {
        const matchesCore = (
          (row.name && row.name.toLowerCase().includes(q)) ||
          (row.kantorCabang && row.kantorCabang.toLowerCase().includes(q)) ||
          (row.kepwil && row.kepwil.toLowerCase().includes(q)) ||
          (row.bulan && row.bulan.toLowerCase().includes(q))
        );
        if (matchesCore) return true;
        if (row.rawRow && Object.values(row.rawRow).some(v => String(v).toLowerCase().includes(q))) return true;
        return columns.some(c => String(getRowCellValue(row, c.key)).toLowerCase().includes(q));
      });
    }

    // 2. Filter by Bulan (hanya menampilkan bulan yang sama)
    if (filterBulan && filterBulan !== 'Semua') {
      result = result.filter(r => {
        const val = String(getRowCellValue(r, 'BULAN') || r.bulan || '').trim().toLowerCase();
        return val === filterBulan.trim().toLowerCase();
      });
    }

    // 3. Filter by Kepwil (hanya menampilkan kepwil yang sama)
    if (filterKepwil && filterKepwil !== 'Semua') {
      result = result.filter(r => {
        const val = String(getRowCellValue(r, 'KEPWIL') || r.kepwil || '').trim().toLowerCase();
        return val.includes(filterKepwil.trim().toLowerCase());
      });
    }

    // 4. Filter by Kantor Cabang (hanya menampilkan nama kantor cabang yang sama)
    if (filterKantorCabang && filterKantorCabang !== 'Semua') {
      result = result.filter(r => {
        const val = String(getRowCellValue(r, 'KANTOR CABANG') || r.kantorCabang || r.name || '').trim().toLowerCase();
        return val === filterKantorCabang.trim().toLowerCase();
      });
    }

    // 5. Sorting & Grouping
    result.sort((a, b) => {
      // If user sorted by a non-grouping column (e.g. numeric metrics), sort by that first
      if (sortField && !isGroupKey(sortField)) {
        let valA: any = getRowCellValue(a, sortField);
        let valB: any = getRowCellValue(b, sortField);

        if (typeof valA === 'number' && typeof valB === 'number') {
          const diff = sortDirection === 'asc' ? valA - valB : valB - valA;
          if (diff !== 0) return diff;
        } else {
          const strA = String(valA || '').toLowerCase();
          const strB = String(valB || '').toLowerCase();
          if (strA !== strB) {
            return sortDirection === 'asc' ? strA.localeCompare(strB, 'id') : strB.localeCompare(strA, 'id');
          }
        }
      }

      // Strict grouping hierarchy:
      // Rank 1: BULAN (ordered chronologically by month)
      const valBulanA = String(getRowCellValue(a, 'BULAN') || a.bulan || '').trim().toLowerCase();
      const valBulanB = String(getRowCellValue(b, 'BULAN') || b.bulan || '').trim().toLowerCase();
      if (valBulanA !== valBulanB) {
        const mIdxA = MONTH_ORDER[valBulanA] ?? 99;
        const mIdxB = MONTH_ORDER[valBulanB] ?? 99;
        const dir = (isBulanKey(sortField) && sortDirection === 'desc') ? -1 : 1;
        if (mIdxA !== mIdxB) {
          return (mIdxA - mIdxB) * dir;
        }
        return valBulanA.localeCompare(valBulanB, 'id') * dir;
      }

      // Rank 2: KEPWIL (within the same Bulan)
      const valKepwilA = String(getRowCellValue(a, 'KEPWIL') || a.kepwil || '').trim();
      const valKepwilB = String(getRowCellValue(b, 'KEPWIL') || b.kepwil || '').trim();
      if (valKepwilA.toLowerCase() !== valKepwilB.toLowerCase()) {
        const dir = (isKepwilKey(sortField) && sortDirection === 'desc') ? -1 : 1;
        return valKepwilA.localeCompare(valKepwilB, 'id') * dir;
      }

      // Rank 3: KANTOR CABANG (within the same Kepwil and Bulan)
      const valKcA = String(getRowCellValue(a, 'KANTOR CABANG') || a.kantorCabang || a.name || '').trim();
      const valKcB = String(getRowCellValue(b, 'KANTOR CABANG') || b.kantorCabang || b.name || '').trim();
      if (valKcA.toLowerCase() !== valKcB.toLowerCase()) {
        const dir = (isKcKey(sortField) && sortDirection === 'desc') ? -1 : 1;
        return valKcA.localeCompare(valKcB, 'id') * dir;
      }

      return 0;
    });

    return result;
  }, [tableData, searchQuery, filterBulan, filterKepwil, filterKantorCabang, sortField, sortDirection, isMergeSameValues, columns]);

  // Paginated data
  const totalPages = Math.ceil(processedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    if (pageSize >= processedData.length) return processedData;
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  // Computation of cell rowSpans for merging identical data on BULAN, KEPWIL, KANTOR CABANG
  const rowSpans = useMemo(() => {
    const result: Record<number, Record<string, { rowSpan: number; isMerged: boolean }>> = {};

    if (!isMergeSameValues || paginatedData.length === 0) {
      return result;
    }

    paginatedData.forEach((_, idx) => {
      result[idx] = {};
    });

    const visibleGroupCols = columns.filter(c => c.visible && isGroupKey(c.key));
    const bulanCol = visibleGroupCols.find(c => isBulanKey(c.key));
    const kepwilCol = visibleGroupCols.find(c => isKepwilKey(c.key));
    const kcCol = visibleGroupCols.find(c => isKcKey(c.key));

    // Level 1: BULAN - merge all identical consecutive months
    if (bulanCol) {
      const bKey = bulanCol.key;
      let startIdx = 0;
      while (startIdx < paginatedData.length) {
        let count = 1;
        const valA = String(getRowCellValue(paginatedData[startIdx], bKey) || paginatedData[startIdx].bulan || '').trim().toLowerCase();
        while (startIdx + count < paginatedData.length) {
          const valB = String(getRowCellValue(paginatedData[startIdx + count], bKey) || paginatedData[startIdx + count].bulan || '').trim().toLowerCase();
          if (valA !== '' && valA === valB) {
            count++;
          } else {
            break;
          }
        }
        result[startIdx][bKey] = { rowSpan: count, isMerged: count > 1 };
        for (let s = 1; s < count; s++) {
          result[startIdx + s][bKey] = { rowSpan: 0, isMerged: true };
        }
        startIdx += count;
      }
    }

    // Level 2: KEPWIL - merge all identical consecutive kepwil within same bulan
    if (kepwilCol) {
      const kKey = kepwilCol.key;
      const bKey = bulanCol ? bulanCol.key : null;
      let startIdx = 0;
      while (startIdx < paginatedData.length) {
        let count = 1;
        const valA = String(getRowCellValue(paginatedData[startIdx], kKey) || paginatedData[startIdx].kepwil || '').trim().toLowerCase();
        const bValA = bKey ? String(getRowCellValue(paginatedData[startIdx], bKey) || paginatedData[startIdx].bulan || '').trim().toLowerCase() : '';

        while (startIdx + count < paginatedData.length) {
          const valB = String(getRowCellValue(paginatedData[startIdx + count], kKey) || paginatedData[startIdx + count].kepwil || '').trim().toLowerCase();
          const bValB = bKey ? String(getRowCellValue(paginatedData[startIdx + count], bKey) || paginatedData[startIdx + count].bulan || '').trim().toLowerCase() : '';

          if (valA !== '' && valA === valB && (!bKey || bValA === bValB)) {
            count++;
          } else {
            break;
          }
        }
        result[startIdx][kKey] = { rowSpan: count, isMerged: count > 1 };
        for (let s = 1; s < count; s++) {
          result[startIdx + s][kKey] = { rowSpan: 0, isMerged: true };
        }
        startIdx += count;
      }
    }

    // Level 3: KANTOR CABANG - merge all identical consecutive cabang within same kepwil and same bulan
    if (kcCol) {
      const cKey = kcCol.key;
      const kKey = kepwilCol ? kepwilCol.key : null;
      const bKey = bulanCol ? bulanCol.key : null;
      let startIdx = 0;
      while (startIdx < paginatedData.length) {
        let count = 1;
        const valA = String(getRowCellValue(paginatedData[startIdx], cKey) || paginatedData[startIdx].kantorCabang || paginatedData[startIdx].name || '').trim().toLowerCase();
        const kValA = kKey ? String(getRowCellValue(paginatedData[startIdx], kKey) || paginatedData[startIdx].kepwil || '').trim().toLowerCase() : '';
        const bValA = bKey ? String(getRowCellValue(paginatedData[startIdx], bKey) || paginatedData[startIdx].bulan || '').trim().toLowerCase() : '';

        while (startIdx + count < paginatedData.length) {
          const valB = String(getRowCellValue(paginatedData[startIdx + count], cKey) || paginatedData[startIdx + count].kantorCabang || paginatedData[startIdx + count].name || '').trim().toLowerCase();
          const kValB = kKey ? String(getRowCellValue(paginatedData[startIdx + count], kKey) || paginatedData[startIdx + count].kepwil || '').trim().toLowerCase() : '';
          const bValB = bKey ? String(getRowCellValue(paginatedData[startIdx + count], bKey) || paginatedData[startIdx + count].bulan || '').trim().toLowerCase() : '';

          if (valA !== '' && valA === valB && (!kKey || kValA === kValB) && (!bKey || bValA === bValB)) {
            count++;
          } else {
            break;
          }
        }
        result[startIdx][cKey] = { rowSpan: count, isMerged: count > 1 };
        for (let s = 1; s < count; s++) {
          result[startIdx + s][cKey] = { rowSpan: 0, isMerged: true };
        }
        startIdx += count;
      }
    }

    return result;
  }, [paginatedData, columns, isMergeSameValues]);

  // Compute summary totals for current view
  const summaryMetrics = useMemo(() => {
    const totalRows = processedData.length;
    let sumInfo = 0;
    let sumPerm = 0;
    let sumPeng = 0;
    let sumTotal = 0;
    let sumSla = 0;

    processedData.forEach(r => {
      sumInfo += Number(getRowCellValue(r, 'Layanan_Informasi')) || r.informasi || 0;
      sumPerm += Number(getRowCellValue(r, 'Layanan_Permintaan')) || r.permintaan || 0;
      sumPeng += Number(getRowCellValue(r, 'Layanan_Pengaduan')) || r.pengaduan || 0;
      sumTotal += Number(getRowCellValue(r, 'total')) || r.total || (sumInfo + sumPerm + sumPeng) || 0;
      sumSla += Number(getRowCellValue(r, 'Kepatuhan_SLA')) || r.slaCompliance || 0;
    });

    const avgSla = totalRows > 0 ? (sumSla / totalRows).toFixed(1) : '0';

    return {
      totalRows,
      sumInfo,
      sumPerm,
      sumPeng,
      sumTotal,
      avgSla
    };
  }, [processedData]);

  // Handler to initiate inline cell edit
  const handleStartCellEdit = (rowId: string, field: string, currentValue: any) => {
    setEditingCell({ rowId, field });
    setEditCellValue(currentValue !== undefined && currentValue !== null ? String(currentValue) : '');
  };

  // Handler to commit inline cell edit
  const handleCommitCellEdit = () => {
    if (!editingCell) return;
    const { rowId, field } = editingCell;

    setTableData(prev => {
      return prev.map(row => {
        if (row.id !== rowId) return row;

        const updatedRow = { ...row };
        const targetCol = columns.find(c => c.key === field);
        const colType = targetCol ? targetCol.type : 'text';

        let parsedVal: any = editCellValue;
        if (colType === 'number' || colType === 'percent') {
          parsedVal = parseFloat(editCellValue.replace(/,/g, '.')) || 0;
        }

        // Store in rawRow for exact Google Sheet key preservation
        updatedRow.rawRow = {
          ...(updatedRow.rawRow || {}),
          [field]: parsedVal
        };

        // Also synchronize to mapped CityData model fields
        const cleanField = field.trim().toLowerCase().replace(/[_\s-]+/g, '');
        if (cleanField === 'kantorcabang' || cleanField === 'kc' || cleanField === 'name') {
          updatedRow.kantorCabang = parsedVal;
          updatedRow.name = parsedVal;
        } else if (cleanField === 'kepwil' || cleanField === 'wilayah') {
          updatedRow.kepwil = parsedVal;
        } else if (cleanField === 'bulan' || cleanField === 'periode') {
          updatedRow.bulan = parsedVal;
        } else if (cleanField.includes('informasi')) {
          updatedRow.informasi = Number(parsedVal) || 0;
        } else if (cleanField.includes('permintaan')) {
          updatedRow.permintaan = Number(parsedVal) || 0;
        } else if (cleanField.includes('pengaduan')) {
          updatedRow.pengaduan = Number(parsedVal) || 0;
        } else if (cleanField.includes('sla')) {
          updatedRow.slaCompliance = Number(parsedVal) || 0;
        }

        if (field in updatedRow) {
          (updatedRow as any)[field] = parsedVal;
        }

        // Auto-recalculate total if info/perm/peng changed
        if (cleanField.includes('informasi') || cleanField.includes('permintaan') || cleanField.includes('pengaduan')) {
          updatedRow.total = (updatedRow.informasi || 0) + (updatedRow.permintaan || 0) + (updatedRow.pengaduan || 0);
        }

        return updatedRow;
      });
    });

    setIsDirty(true);
    setEditingCell(null);
    setEditCellValue('');
  };

  // Handler to cancel cell edit
  const handleCancelCellEdit = () => {
    setEditingCell(null);
    setEditCellValue('');
  };

  // Delete a row
  const handleDeleteRow = (rowId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus baris data ini?')) {
      setTableData(prev => prev.filter(r => r.id !== rowId));
      setIsDirty(true);
    }
  };

  // Duplicate a row
  const handleDuplicateRow = (row: CityData) => {
    const newId = `row_${Date.now()}_copy`;
    const newRow: CityData = {
      ...row,
      id: newId,
      name: `${row.name} (Salinan)`,
      kantorCabang: `${row.kantorCabang || row.name} (Salinan)`,
    };
    setTableData(prev => [newRow, ...prev]);
    setIsDirty(true);
  };

  // Save changes to Central State (LocalStorage + Cloud Firestore)
  const handleSaveChanges = () => {
    onCitiesDataChange(tableData);
    setIsDirty(false);
    setSaveSuccessToast('Perubahan tabel rekap berhasil disimpan ke Cloud!');
    setTimeout(() => setSaveSuccessToast(null), 3000);
  };

  // Reset to original synchronized Google Sheet data
  const handleResetToSyncedData = () => {
    if (confirm('Kembalikan data ke kondisi sinkronisasi awal Google Sheet? Perubahan yang belum disimpan akan dibatalkan.')) {
      setTableData(citiesData);
      setIsDirty(false);
      setSaveSuccessToast('Data berhasil dikembalikan ke hasil sinkronisasi Google Sheet.');
      setTimeout(() => setSaveSuccessToast(null), 3000);
    }
  };

  // Add new row submit
  const handleAddNewRowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRowData.kantorCabang?.trim()) {
      alert('Nama Kantor Cabang / Kota wajib diisi.');
      return;
    }

    const calculatedTotal = (Number(newRowData.informasi) || 0) + (Number(newRowData.permintaan) || 0) + (Number(newRowData.pengaduan) || 0);
    const newRow: CityData = {
      id: `row_custom_${Date.now()}`,
      name: newRowData.kantorCabang.trim(),
      kantorCabang: newRowData.kantorCabang.trim(),
      kepwil: newRowData.kepwil || 'KEPWIL WILAYAH',
      bulan: newRowData.bulan || 'Januari',
      latitude: -6.2088,
      longitude: 106.8456,
      informasi: Number(newRowData.informasi) || 0,
      permintaan: Number(newRowData.permintaan) || 0,
      pengaduan: Number(newRowData.pengaduan) || 0,
      total: calculatedTotal > 0 ? calculatedTotal : (Number(newRowData.total) || 0),
      slaCompliance: Number(newRowData.slaCompliance) || 90,
      avgSlaDays: Number(newRowData.avgSlaDays) || 2.0,
      rawRow: {}
    };

    setTableData(prev => [newRow, ...prev]);
    setIsDirty(true);
    setIsAddRowOpen(false);
    setNewRowData({
      name: '',
      kantorCabang: '',
      kepwil: 'KEPWIL JAWA BARAT',
      bulan: 'Januari',
      informasi: 0,
      permintaan: 0,
      pengaduan: 0,
      total: 0,
      slaCompliance: 90,
      avgSlaDays: 2.0
    });
  };

  // Rename column header
  const handleRenameColumn = (key: string, newLabel: string) => {
    if (!newLabel.trim()) return;
    setColumns(prev => prev.map(c => c.key === key ? { ...c, label: newLabel.trim() } : c));
    setEditingColumnKey(null);
  };

  // Delete column
  const handleDeleteColumn = (key: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus kolom ini dari tabel?')) {
      setColumns(prev => prev.filter(c => c.key !== key));
    }
  };

  // Toggle column visibility
  const toggleColumnVisibility = (key: string) => {
    setColumns(prev => prev.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
  };

  // Select all columns in checklist
  const handleSelectAllColumns = () => {
    setColumns(prev => prev.map(c => ({ ...c, visible: true })));
  };

  // Deselect all columns in checklist (keep at least the primary column visible)
  const handleDeselectAllColumns = () => {
    setColumns(prev => prev.map((c, idx) => ({ ...c, visible: idx === 0 })));
  };

  // Reset columns order and visibility to default
  const handleResetColumnsDefault = () => {
    if (confirm('Kembalikan susunan dan visibilitas kolom ke standar awal?')) {
      setColumns(buildSyncedColumns(citiesData));
    }
  };

  // Move column order (accessible button fallback)
  const moveColumn = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;
    const newCols = [...columns];
    const temp = newCols[index];
    newCols[index] = newCols[targetIndex];
    newCols[targetIndex] = temp;
    setColumns(newCols);
  };

  // Column Drag-and-Drop Handlers in the "Atur Kolom" popover
  const handleColDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleColDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColIndex !== index) {
      setDragOverColIndex(index);
    }
  };

  const handleColDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedColIndex === null || draggedColIndex === targetIndex) {
      setDraggedColIndex(null);
      setDragOverColIndex(null);
      return;
    }

    setColumns(prev => {
      const updated = [...prev];
      const [movedItem] = updated.splice(draggedColIndex, 1);
      updated.splice(targetIndex, 0, movedItem);
      return updated;
    });

    setDraggedColIndex(null);
    setDragOverColIndex(null);
  };

  const handleColDragEnd = () => {
    setDraggedColIndex(null);
    setDragOverColIndex(null);
  };

  // Table Header Drag-and-Drop Handlers (directly on table header cells)
  const handleHeaderDragStart = (e: React.DragEvent, colKey: string) => {
    setDraggedHeaderKey(colKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colKey);
  };

  const handleHeaderDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverHeaderKey !== colKey) {
      setDragOverHeaderKey(colKey);
    }
  };

  const handleHeaderDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedHeaderKey || draggedHeaderKey === targetKey) {
      setDraggedHeaderKey(null);
      setDragOverHeaderKey(null);
      return;
    }

    setColumns(prev => {
      const fromIdx = prev.findIndex(c => c.key === draggedHeaderKey);
      const toIdx = prev.findIndex(c => c.key === targetKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const updated = [...prev];
      const [movedItem] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, movedItem);
      return updated;
    });

    setDraggedHeaderKey(null);
    setDragOverHeaderKey(null);
  };

  const handleHeaderDragEnd = () => {
    setDraggedHeaderKey(null);
    setDragOverHeaderKey(null);
  };

  // Sort toggle handler
  const handleSort = (key: string) => {
    if (sortField === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(key);
      setSortDirection('asc');
    }
  };

  // ===================== EXCEL DOWNLOAD GENERATOR =====================
  const handleDownloadExcel = (downloadFilteredOnly = false) => {
    const dataToExport = downloadFilteredOnly ? processedData : tableData;
    const visibleCols = columns.filter(c => c.visible);

    if (dataToExport.length === 0) {
      alert('Tidak ada data untuk diunduh.');
      return;
    }

    // Build header row and mapping
    const headerRow = visibleCols.map(c => c.label);

    // Build data rows
    const dataRows = dataToExport.map(row => {
      return visibleCols.map(col => {
        let val = (row as any)[col.key];
        if (val === undefined && row.rawRow && row.rawRow[col.key] !== undefined) {
          val = row.rawRow[col.key];
        }
        if (val === undefined || val === null) return '';
        if (col.type === 'number' || col.type === 'percent') {
          return Number(val) || 0;
        }
        return String(val);
      });
    });

    // Compute summary row for Excel
    const summaryRow = visibleCols.map((col, idx) => {
      if (idx === 0) return 'TOTAL / RATA-RATA';
      if (col.key === 'informasi') return summaryMetrics.sumInfo;
      if (col.key === 'permintaan') return summaryMetrics.sumPerm;
      if (col.key === 'pengaduan') return summaryMetrics.sumPeng;
      if (col.key === 'total') return summaryMetrics.sumTotal;
      if (col.key === 'slaCompliance') return `${summaryMetrics.avgSla}%`;
      return '';
    });

    // Create Worksheet via AOA (Array of Arrays)
    const aoa = [
      ['LAPORAN REKAPITULASI LAYANAN DAN KEPATUHAN SLA - SENADA'],
      [`Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB`],
      [`Sumber Data: ${googleSheetUrl || 'Sinkronisasi Google Sheet'}`],
      [`Jumlah Data: ${dataToExport.length} baris`],
      [], // Empty row
      headerRow,
      ...dataRows,
      summaryRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set dynamic column widths
    const colWidths = visibleCols.map(col => {
      return { wch: Math.max(col.label.length + 4, 16) };
    });
    ws['!cols'] = colWidths;

    // Create workbook and append sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Layanan');

    // Generate filename
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `Laporan_Rekap_Layanan_Senada_${dateStamp}.xlsx`;

    XLSX.writeFile(wb, fileName);
    setIsExportMenuOpen(false);
  };

  // CSV Export option
  const handleDownloadCSV = () => {
    const visibleCols = columns.filter(c => c.visible);
    const headers = visibleCols.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');
    const rows = processedData.map(row => {
      return visibleCols.map(col => {
        let val = (row as any)[col.key];
        if (val === undefined && row.rawRow && row.rawRow[col.key] !== undefined) {
          val = row.rawRow[col.key];
        }
        val = val === undefined || val === null ? '' : String(val);
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Rekap_Senada_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  const visibleColumns = columns.filter(c => c.visible);

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      
      {/* TOP NOTIFICATION TOAST */}
      {saveSuccessToast && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-md text-sm font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{saveSuccessToast}</span>
          </div>
          <button onClick={() => setSaveSuccessToast(null)} className="text-emerald-100 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}



      {/* COLUMN VISIBILITY / MANAGER POPOVER WITH CHECKLIST & DRAG-AND-DROP (STRICTLY GOOGLE SHEET DATA REFERENCE) */}
      {isColumnVisibilityOpen && (
        <div 
          className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-xl space-y-3.5 animate-fadeIn" 
          id="column-visibility-manager-panel"
        >
          {/* HEADER: STRICT GOOGLE SHEET REFERENCE */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs shrink-0">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    Pengaturan Kolom Referensi Google Sheet
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {columns.filter(c => c.visible).length}/{columns.length} Aktif
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hanya memuat variabel data yang bersumber langsung dari Google Sheet. Tidak ada opsi di luar data referensi.
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS: SELECT ALL, UNSELECT ALL, RESET, CLOSE */}
            <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
              <button
                type="button"
                onClick={handleSelectAllColumns}
                className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Tampilkan semua variabel Google Sheet"
                id="select-all-columns-btn"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Pilih Semua</span>
              </button>
              <button
                type="button"
                onClick={handleDeselectAllColumns}
                className="text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Sembunyikan semua kecuali kolom identitas"
                id="deselect-all-columns-btn"
              >
                <Square className="h-3.5 w-3.5" />
                <span>Sembunyikan</span>
              </button>
              <button
                type="button"
                onClick={handleResetColumnsDefault}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Kembalikan urutan kolom sesuai urutan header Google Sheet"
                id="reset-columns-default-btn"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset ke Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => setIsColumnVisibilityOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup Pengaturan Kolom"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* STRICT GOOGLE SHEET REFERENCE COLUMNS LIST */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2">
            {columns.map((col, idx) => {
              const isDraggingThis = draggedColIndex === idx;
              const isOverThis = dragOverColIndex === idx;

              return (
                <div 
                  key={col.key}
                  draggable={true}
                  onDragStart={(e) => handleColDragStart(e, idx)}
                  onDragOver={(e) => handleColDragOver(e, idx)}
                  onDragEnd={handleColDragEnd}
                  onDrop={(e) => handleColDrop(e, idx)}
                  className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 transition-all select-none text-xs ${
                    isDraggingThis
                      ? 'opacity-30 border-dashed border-emerald-500 bg-emerald-50'
                      : isOverThis
                      ? 'border-emerald-600 ring-2 ring-emerald-400/40 bg-emerald-50 shadow-md'
                      : col.visible 
                      ? 'bg-emerald-50/40 border-emerald-200/90 hover:border-emerald-300' 
                      : 'bg-slate-50/70 border-slate-200/80 opacity-60 hover:opacity-90'
                  }`}
                >
                  {/* LEFT: GRIP + CHECKBOX + GOOGLE SHEET COLUMN LABEL */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div 
                      className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-emerald-700 transition-colors shrink-0"
                      title="Geser posisi urutan kolom"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() => toggleColumnVisibility(col.key)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span 
                          className={`block truncate font-mono text-[11px] transition-colors ${
                            col.visible ? 'text-slate-900 font-bold' : 'text-slate-400 font-normal'
                          }`} 
                          title={col.label}
                        >
                          {col.label}
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* RIGHT: TYPE INDICATOR BADGE & NUDGE CONTROLS */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border ${
                      col.type === 'percent'
                        ? 'bg-emerald-100/70 text-emerald-800 border-emerald-200'
                        : col.type === 'number'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {col.type === 'percent' ? '% SLA' : col.type === 'number' ? 'Numerik' : 'Teks'}
                    </span>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveColumn(idx, 'left')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded hover:bg-slate-200/60 transition-colors"
                      title="Pindahkan ke kiri"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === columns.length - 1}
                      onClick={() => moveColumn(idx, 'right')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded hover:bg-slate-200/60 transition-colors"
                      title="Pindahkan ke kanan"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FOOTER CONFIRMATION: 100% GOOGLE SHEET REFERENCE */}
          <div className="pt-2 border-t border-emerald-100/70 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Daftar kolom 100% tersinkron dengan skema data Google Sheet aktif.</span>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
              <GripVertical className="h-3 w-3 text-emerald-500" />
              Tarik atau gunakan panah untuk mengatur urutan kolom
            </span>
          </div>
        </div>
      )}

      {/* ACTION & FILTER TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        {/* ROW 1: ACTIONS & CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* LEFT: STATUS & DIRTY SAVE / RESET */}
          <div className="flex items-center gap-2 flex-wrap">
            {isDirty ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Perubahan Belum Disimpan
                </span>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Simpan perubahan tabel ke Database Cloud"
                  id="save-table-changes-btn"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Simpan</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToSyncedData}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-2.5 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer border border-slate-200"
                  title="Batal & kembalikan ke data awal Google Sheet"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                  {processedData.length} baris data
                </span>
                {lastSyncedAt && (
                  <span className="hidden sm:inline text-[11px] text-slate-400">
                    Sinkron: {lastSyncedAt}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: ACTION BUTTONS GROUP */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* SYNC FROM GOOGLE SHEET BUTTON */}
            <button
              type="button"
              onClick={() => onExecuteSync()}
              disabled={isRefreshing}
              className={`font-bold py-1.5 px-3 rounded-xl text-xs border transition-all flex items-center gap-1.5 cursor-pointer ${
                isRefreshing 
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
              }`}
              title="Perbarui data terbaru langsung dari Google Sheet"
              id="resync-sheets-from-laporan-btn"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Menyinkronkan...' : 'Sinkron Sheet'}</span>
            </button>

            {/* TOGGLE GABUNG DATA SAMA (BULAN, KEPWIL, KANTOR CABANG) */}
            <button
              type="button"
              onClick={() => setIsMergeSameValues(!isMergeSameValues)}
              className={`font-bold py-1.5 px-3 rounded-xl text-xs border transition-all flex items-center gap-1.5 cursor-pointer ${
                isMergeSameValues 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs hover:bg-indigo-700' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
              }`}
              title="Gabungkan baris data yang sama pada kolom Bulan, Kepwil, dan Kantor Cabang"
              id="toggle-merge-same-values-btn"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{isMergeSameValues ? 'Gabungan Baris: Aktif' : 'Gabung Baris Sama'}</span>
            </button>

            {/* ADD ROW BUTTON */}
            <button
              type="button"
              onClick={() => setIsAddRowOpen(true)}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Tambah baris baru ke tabel rekap"
              id="add-row-laporan-btn"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Baris</span>
            </button>

            {/* COLUMN VISIBILITY / ARRANGE BUTTON */}
            <button
              type="button"
              onClick={() => setIsColumnVisibilityOpen(!isColumnVisibilityOpen)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-1.5 px-3 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="Atur kolom yang ditampilkan"
              id="toggle-column-visibility-btn"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-600" />
              <span>Atur Kolom</span>
            </button>

            {/* EXCEL DOWNLOAD MENU DROPDOWN */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                id="download-excel-laporan-btn"
                title="Unduh data tabel dalam format Excel (.xlsx)"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Excel</span>
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fadeIn">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800">Menu Unduh Laporan</p>
                    <p className="text-[10px] text-slate-500">Pilih format ekspor spreadsheet</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadExcel(false)}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    id="export-all-excel-btn"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <div>
                      <span className="block font-bold">Download Semua Data (.xlsx)</span>
                      <span className="text-[10px] text-slate-400">Seluruh {tableData.length} baris data tersinkron</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadExcel(true)}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    id="export-filtered-excel-btn"
                  >
                    <Filter className="h-4 w-4 text-indigo-600" />
                    <div>
                      <span className="block font-bold">Download Data Terfilter (.xlsx)</span>
                      <span className="text-[10px] text-slate-400">{processedData.length} baris sesuai filter & pencarian</span>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    id="export-csv-btn"
                  >
                    <FileDown className="h-4 w-4 text-slate-500" />
                    <span>Download CSV (.csv)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ROW 2: SEARCH & FILTERS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-3 flex-wrap flex-1 min-w-[280px]">
            {/* SEARCH INPUT */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari KC, KEPWIL, Periode, Nilai..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                id="laporan-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* FILTER 1: BULAN */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <span>📅</span> Bulan:
              </span>
              <select
                value={filterBulan}
                onChange={(e) => handleBulanChange(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 hover:border-slate-300 transition-colors"
                id="filter-table-bulan-select"
              >
                <option value="Semua">Semua Bulan</option>
                {availableBulanList.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* FILTER 2: KEPWIL */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <span>🏛️</span> KEPWIL:
              </span>
              <select
                value={filterKepwil}
                onChange={(e) => handleKepwilChange(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 hover:border-slate-300 transition-colors"
                id="filter-table-kepwil-select"
              >
                <option value="Semua">Semua KEPWIL</option>
                {availableKepwilList.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            {/* FILTER 3: KANTOR CABANG */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <span>🏢</span> Kantor Cabang:
              </span>
              <select
                value={filterKantorCabang}
                onChange={(e) => handleKantorCabangChange(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 hover:border-slate-300 transition-colors max-w-[200px]"
                id="filter-table-kantorcabang-select"
              >
                <option value="Semua">Semua Kantor Cabang</option>
                {dynamicCabangList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* RESET FILTER BUTTON */}
            {(filterBulan !== 'Semua' || filterKepwil !== 'Semua' || filterKantorCabang !== 'Semua' || searchQuery) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset semua filter ke default"
                id="reset-table-filters-btn"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>

          {/* PAGE SIZE SELECTOR */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Baris per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={10000}>Semua</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE DATA CONTAINER (SCROLLABLE & INLINE EDITABLE) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-left border-collapse text-xs">
            {/* TABLE HEADER */}
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 select-none">
                <th className="py-3 px-3.5 font-bold w-12 text-center text-slate-400">No</th>
                
                {visibleColumns.map((col) => {
                  const isEditingThisHeader = editingColumnKey === col.key;
                  const isDraggingHeader = draggedHeaderKey === col.key;
                  const isOverHeader = dragOverHeaderKey === col.key;

                  return (
                    <th 
                      key={col.key} 
                      draggable={!isEditingThisHeader}
                      onDragStart={(e) => handleHeaderDragStart(e, col.key)}
                      onDragOver={(e) => handleHeaderDragOver(e, col.key)}
                      onDragEnd={handleHeaderDragEnd}
                      onDrop={(e) => handleHeaderDrop(e, col.key)}
                      className={`py-3 px-3.5 font-black text-slate-800 border-r border-slate-200/60 transition-all select-none ${col.width || ''} ${
                        isDraggingHeader ? 'opacity-30 bg-indigo-100 scale-95' : ''
                      } ${
                        isOverHeader ? 'bg-indigo-100/90 ring-2 ring-indigo-500 ring-inset shadow-inner' : ''
                      }`}
                      title="Klik untuk mengurutkan (sort), atau tarik header kolom ini untuk menggeser posisinya"
                    >
                      <div className="flex items-center justify-between gap-1.5 group">
                        {isEditingThisHeader ? (
                          <div className="flex items-center gap-1 min-w-[120px]">
                            <input
                              type="text"
                              value={editingColumnLabel}
                              onChange={(e) => setEditingColumnLabel(e.target.value)}
                              className="bg-white border border-indigo-400 px-2 py-0.5 rounded text-xs text-slate-800 font-bold focus:outline-none w-full"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameColumn(col.key, editingColumnLabel);
                                if (e.key === 'Escape') setEditingColumnKey(null);
                              }}
                            />
                            <button
                              onClick={() => handleRenameColumn(col.key, editingColumnLabel)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => setEditingColumnKey(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="flex items-center gap-1.5 cursor-pointer truncate flex-1"
                            onClick={() => handleSort(col.key)}
                            title={`Urutkan berdasarkan ${col.label} (atau geser untuk memindahkan posisi kolom)`}
                          >
                            <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600 cursor-grab active:cursor-grabbing shrink-0 transition-colors" />
                            <span className="truncate">{col.label}</span>
                            {sortField === col.key ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 shrink-0" />
                            )}
                          </div>
                        )}

                        {!isEditingThisHeader && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingColumnKey(col.key);
                              setEditingColumnLabel(col.label);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-slate-200 cursor-pointer"
                            title="Ubah nama kolom"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}

                <th className="py-3 px-3.5 font-bold w-24 text-center text-slate-600">Aksi</th>
              </tr>
            </thead>

            {/* TABLE BODY */}
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rowIdx) => {
                  const absoluteIndex = (currentPage - 1) * pageSize + rowIdx + 1;

                  // Group boundary checks for clear visual division between months and kepwil
                  const isNewBulanGroup = rowIdx > 0 && String(getRowCellValue(row, 'BULAN') || row.bulan || '').trim().toLowerCase() !== String(getRowCellValue(paginatedData[rowIdx - 1], 'BULAN') || paginatedData[rowIdx - 1].bulan || '').trim().toLowerCase();
                  const isNewKepwilGroup = !isNewBulanGroup && rowIdx > 0 && String(getRowCellValue(row, 'KEPWIL') || row.kepwil || '').trim().toLowerCase() !== String(getRowCellValue(paginatedData[rowIdx - 1], 'KEPWIL') || paginatedData[rowIdx - 1].kepwil || '').trim().toLowerCase();

                  return (
                    <tr 
                      key={row.id}
                      className={`transition-colors group ${
                        isNewBulanGroup 
                          ? 'border-t-2 border-emerald-600 bg-emerald-50/15 hover:bg-emerald-50/40' 
                          : isNewKepwilGroup 
                          ? 'border-t border-slate-300 hover:bg-slate-50/60' 
                          : 'hover:bg-indigo-50/30'
                      }`}
                    >
                      {/* ROW NUMBER */}
                      <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {absoluteIndex}
                      </td>

                      {/* CELLS PER COLUMN */}
                      {visibleColumns.map((col) => {
                        const isMergeCol = isMergeSameValues && isGroupKey(col.key);
                        const spanInfo = isMergeCol && rowSpans[rowIdx] ? rowSpans[rowIdx][col.key] : null;

                        // If merged under a previous row's cell, do not render a separate td
                        if (spanInfo && spanInfo.rowSpan === 0) {
                          return null;
                        }

                        const cellRowSpan = spanInfo && spanInfo.rowSpan > 1 ? spanInfo.rowSpan : undefined;
                        const isEditingThisCell = editingCell?.rowId === row.id && editingCell?.field === col.key;
                        let cellValue = getRowCellValue(row, col.key);

                        if (cellValue === undefined || cellValue === null) cellValue = '';

                        const isPercentCol = col.type === 'percent' || col.key.toLowerCase().includes('sla');
                        const isNumberCol = col.type === 'number' || (!isPercentCol && typeof cellValue === 'number');
                        const isBulan = isBulanKey(col.key);
                        const isKepwil = isKepwilKey(col.key);
                        const isKc = isKcKey(col.key);

                        return (
                          <td 
                            key={col.key}
                            rowSpan={cellRowSpan}
                            className={`py-2 px-3.5 text-slate-700 border-r border-slate-100/60 font-medium relative ${
                              cellRowSpan && cellRowSpan > 1
                                ? 'bg-slate-50/90 align-top font-semibold text-slate-900 border-b border-slate-200 shadow-2xs'
                                : ''
                            }`}
                            onDoubleClick={() => handleStartCellEdit(row.id, col.key, cellValue)}
                          >
                            {isEditingThisCell ? (
                              <div className="flex items-center gap-1 min-w-[80px]">
                                <input
                                  type={isNumberCol || isPercentCol ? 'number' : 'text'}
                                  value={editCellValue}
                                  onChange={(e) => setEditCellValue(e.target.value)}
                                  onBlur={handleCommitCellEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCommitCellEdit();
                                    if (e.key === 'Escape') handleCancelCellEdit();
                                  }}
                                  className="w-full bg-white border-2 border-emerald-600 rounded px-2 py-1 text-xs text-slate-900 font-semibold focus:outline-none shadow-xs"
                                  autoFocus
                                />
                                <button
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={handleCommitCellEdit}
                                  className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div 
                                className="flex items-center justify-between gap-1 group/cell cursor-pointer py-1"
                                onClick={() => handleStartCellEdit(row.id, col.key, cellValue)}
                                title="Klik untuk mengedit data ini"
                              >
                                {isPercentCol ? (
                                  <div className="flex items-center gap-1.5 font-mono font-bold">
                                    <span className={`px-2 py-0.5 rounded-md border text-[11px] ${
                                      Number(cellValue) >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                      Number(cellValue) >= 85 ? 'bg-amber-50 text-amber-700 border-amber-300' :
                                      'bg-rose-50 text-rose-700 border-rose-300'
                                    }`}>
                                      {cellValue !== '' ? `${cellValue}%` : '-'}
                                    </span>
                                  </div>
                                ) : isNumberCol ? (
                                  <span className="font-mono font-bold text-slate-900">
                                    {typeof cellValue === 'number' ? cellValue.toLocaleString('id-ID') : (!isNaN(Number(cellValue)) && cellValue !== '' ? Number(cellValue).toLocaleString('id-ID') : cellValue)}
                                  </span>
                                ) : isBulan ? (
                                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                    <span className="font-extrabold text-emerald-950 bg-emerald-100/90 text-[11px] px-2.5 py-1 rounded-lg border border-emerald-300 shadow-3xs uppercase tracking-wide inline-flex items-center gap-1 shrink-0">
                                      <span>📅</span> {String(cellValue)}
                                    </span>
                                    {cellRowSpan && cellRowSpan > 1 && (
                                      <span 
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-3xs shrink-0" 
                                        title={`Bulan sama digabungkan (${cellRowSpan} baris)`}
                                      >
                                        {cellRowSpan} baris
                                      </span>
                                    )}
                                  </div>
                                ) : isKepwil ? (
                                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                    <span className="font-bold text-slate-800 text-[12px] inline-flex items-center gap-1 shrink-0">
                                      <span className="text-slate-400">🏛️</span> {String(cellValue)}
                                    </span>
                                    {cellRowSpan && cellRowSpan > 1 && (
                                      <span 
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 shrink-0" 
                                        title={`Kepwil sama digabungkan (${cellRowSpan} baris)`}
                                      >
                                        {cellRowSpan} baris
                                      </span>
                                    )}
                                  </div>
                                ) : isKc ? (
                                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                    <span className="font-semibold text-slate-900 text-[12px] inline-flex items-center gap-1">
                                      <span className="text-slate-400">🏢</span> {String(cellValue)}
                                    </span>
                                    {cellRowSpan && cellRowSpan > 1 && (
                                      <span 
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 shrink-0" 
                                        title={`Kantor Cabang sama digabungkan (${cellRowSpan} baris)`}
                                      >
                                        {cellRowSpan} baris
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="truncate max-w-[200px]" title={String(cellValue)}>
                                      {String(cellValue) || <span className="text-slate-300 italic">-</span>}
                                    </span>
                                    {cellRowSpan && cellRowSpan > 1 && (
                                      <span 
                                        className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100/70 text-emerald-800 border border-emerald-200/90 shrink-0" 
                                        title={`Nilai sama digabungkan (${cellRowSpan} baris)`}
                                      >
                                        {cellRowSpan} baris
                                      </span>
                                    )}
                                  </div>
                                )}

                                <Edit2 className="h-3 w-3 text-slate-300 opacity-0 group-hover/cell:opacity-100 hover:text-emerald-600 transition-opacity shrink-0 ml-1" />
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* ACTIONS PER ROW */}
                      <td className="py-2 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(row)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Duplikasi baris ini"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus baris ini"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <HelpCircle className="h-8 w-8 text-slate-300" />
                      <p className="font-semibold text-sm text-slate-600">Tidak ada data ditemukan</p>
                      <p className="text-xs text-slate-400">Silakan ubah filter pencarian atau sinkronkan data dari Google Sheet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

            {/* TABLE FOOTER SUMMARY ROW */}
            {paginatedData.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                  <td className="py-3 px-3.5 text-center text-slate-500 font-mono">Σ</td>
                  {visibleColumns.map((col, cIdx) => {
                    const cleanKey = col.key.toLowerCase().replace(/[_\s-]+/g, '');
                    
                    if (cleanKey.includes('cabang') || cleanKey.includes('kantor') || (cIdx === 0 && !col.key.toLowerCase().includes('bulan'))) {
                      return <td key={col.key} className="py-3 px-3.5 font-black uppercase text-slate-800">Total / Rekap</td>;
                    }
                    if (cleanKey.includes('informasi')) {
                      return <td key={col.key} className="py-3 px-3.5 font-mono font-black text-indigo-950">{summaryMetrics.sumInfo.toLocaleString('id-ID')}</td>;
                    }
                    if (cleanKey.includes('permintaan')) {
                      return <td key={col.key} className="py-3 px-3.5 font-mono font-black text-teal-950">{summaryMetrics.sumPerm.toLocaleString('id-ID')}</td>;
                    }
                    if (cleanKey.includes('pengaduan')) {
                      return <td key={col.key} className="py-3 px-3.5 font-mono font-black text-amber-950">{summaryMetrics.sumPeng.toLocaleString('id-ID')}</td>;
                    }
                    if (cleanKey === 'total' || cleanKey.includes('totallayanan')) {
                      return <td key={col.key} className="py-3 px-3.5 font-mono font-black text-blue-700">{summaryMetrics.sumTotal.toLocaleString('id-ID')}</td>;
                    }
                    if (cleanKey.includes('sla')) {
                      return <td key={col.key} className="py-3 px-3.5 font-mono font-black text-emerald-700">{summaryMetrics.avgSla}%</td>;
                    }
                    if (col.type === 'number') {
                      const totalVal = processedData.reduce((acc, r) => acc + (Number(getRowCellValue(r, col.key)) || 0), 0);
                      return <td key={col.key} className="py-3 px-3.5 font-mono font-black text-slate-800">{totalVal.toLocaleString('id-ID')}</td>;
                    }
                    return <td key={col.key} className="py-3 px-3.5 text-slate-400">-</td>;
                  })}
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <div className="border-t border-slate-200 px-4 py-3 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Menampilkan <strong>{processedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> hingga <strong>{Math.min(currentPage * pageSize, processedData.length)}</strong> dari <strong>{processedData.length}</strong> data
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Sebelumnya</span>
            </button>

            <span className="px-3 py-1 font-bold text-slate-800 bg-white border border-slate-200 rounded-lg">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <span>Berikutnya</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: TAMBAH BARIS BARU */}
      {isAddRowOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Plus className="h-5 w-5" />
                </span>
                <h4 className="text-base font-bold text-slate-900">Tambah Baris Rekap Baru</h4>
              </div>
              <button onClick={() => setIsAddRowOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewRowSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Kantor Cabang / Kota *</label>
                <input
                  type="text"
                  required
                  value={newRowData.kantorCabang}
                  onChange={(e) => setNewRowData({ ...newRowData, kantorCabang: e.target.value })}
                  placeholder="Contoh: KC Bandung, KC Surabaya"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">KEPWIL / Regional</label>
                  <input
                    type="text"
                    value={newRowData.kepwil}
                    onChange={(e) => setNewRowData({ ...newRowData, kepwil: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bulan / Periode</label>
                  <input
                    type="text"
                    value={newRowData.bulan}
                    onChange={(e) => setNewRowData({ ...newRowData, bulan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Layanan Informasi</label>
                  <input
                    type="number"
                    value={newRowData.informasi}
                    onChange={(e) => setNewRowData({ ...newRowData, informasi: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Permintaan Tindakan</label>
                  <input
                    type="number"
                    value={newRowData.permintaan}
                    onChange={(e) => setNewRowData({ ...newRowData, permintaan: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pengaduan Layanan</label>
                  <input
                    type="number"
                    value={newRowData.pengaduan}
                    onChange={(e) => setNewRowData({ ...newRowData, pengaduan: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kepatuhan SLA (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newRowData.slaCompliance}
                    onChange={(e) => setNewRowData({ ...newRowData, slaCompliance: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rata-rata Hari SLA</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRowData.avgSlaDays}
                    onChange={(e) => setNewRowData({ ...newRowData, avgSlaDays: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddRowOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Tambahkan ke Tabel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LaporanRekapTable;
