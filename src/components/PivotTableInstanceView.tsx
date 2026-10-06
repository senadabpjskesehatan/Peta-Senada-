import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Download,
  Search,
  RotateCcw,
  Sparkles,
  Columns3,
  Building2,
  Calendar,
  Grid3X3,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  X,
  Info,
  Tag,
  Award,
  SlidersHorizontal,
  Layers,
  ArrowUpDown,
  Calculator,
  Filter,
  Edit2,
  Bookmark,
  Check,
  AlertCircle,
  Table,
  Table2,
  TableProperties,
  Copy,
  Sliders,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  MoveVertical,
  Settings2,
  CheckCircle2,
  PlusCircle,
  MoreVertical,
  Save,
  Type,
  Eye,
  ChevronUp,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { CityData } from '../types';
import { parseNumericValue } from '../utils/sheetParser';
import {
  ReportTableInstance,
  PivotValueField,
  AggregationType,
  ValueFormat,
  RowDensity,
  TableFontSize,
  CustomSpreadsheetField
} from './ReportingPivotTable';

interface PivotTableInstanceViewProps {
  table: ReportTableInstance;
  tableIndex: number;
  totalTables: number;
  tabName?: string;
  citiesData: CityData[];
  filteredCities: CityData[];
  availableFields: { key: string; label: string; type: 'dimension' | 'metric'; isCustom?: boolean; sheetColIndex?: number }[];
  customFields: CustomSpreadsheetField[];
  onUpdateTable: (tableId: string, updated: Partial<ReportTableInstance>) => void;
  onDuplicateTable: (table: ReportTableInstance) => void;
  onStartRenameTable: (table: ReportTableInstance) => void;
  onRequestDeleteTable: (table: ReportTableInstance) => void;
  onMoveTable?: (tableId: string, direction: 'up' | 'down') => void;
  onOpenEditCustomVariable: (cf: CustomSpreadsheetField) => void;
  onDeleteCustomVariable: (key: string) => void;
  onOpenAddCustomVariable: () => void;
  onOpenPresetModal: (tableId: string) => void;
  viewMode: 'all' | 'tab';
  isActiveTable: boolean;
  onSelectTable: (tableId: string) => void;
}

export const PivotTableInstanceView: React.FC<PivotTableInstanceViewProps> = ({
  table,
  tableIndex,
  totalTables,
  tabName,
  citiesData,
  filteredCities,
  availableFields,
  customFields,
  onUpdateTable,
  onDuplicateTable,
  onStartRenameTable,
  onRequestDeleteTable,
  onMoveTable,
  onOpenEditCustomVariable,
  onDeleteCustomVariable,
  onOpenAddCustomVariable,
  onOpenPresetModal,
  viewMode,
  isActiveTable,
  onSelectTable,
}) => {
  // Local state for this table instance
  const [isFieldPanelOpen, setIsFieldPanelOpen] = useState(false);
  const [isSizeMenuOpen, setIsSizeMenuOpen] = useState(false);
  const [isTableCollapsed, setIsTableCollapsed] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [collapsedRows, setCollapsedRows] = useState<Record<string, boolean>>({});

  // Column Resizing State
  const [isResizing, setIsResizing] = useState<{
    type: 'dim' | 'metric';
    startX: number;
    startWidth: number;
  } | null>(null);

  const rowDensity = table.rowDensity || 'normal';
  const rowPaddingY = table.rowPaddingY ?? 10;
  const dimColWidth = table.dimColWidth || 280;
  const metricColWidth = table.metricColWidth || 130;
  const fontSize = table.fontSize || 'xs';
  const rowFields = table.rowFields || ['KEPWIL'];
  const columnFields = table.columnFields || [];
  const valueFields = table.valueFields || [];
  const useFilteredData = table.useFilteredData || false;

  // Active data source for this table
  const activeData = useFilteredData ? filteredCities : citiesData;

  // Toggle collapse row hierarchy
  const toggleCollapse = (rowPath: string) => {
    setCollapsedRows(prev => ({
      ...prev,
      [rowPath]: !prev[rowPath]
    }));
  };

  const expandAll = () => setCollapsedRows({});
  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    activeData.forEach(row => {
      const p = String(row.KEPWIL || 'N/A');
      next[p] = true;
    });
    setCollapsedRows(next);
  };

  // Drag Resizer Handlers
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - isResizing.startX;
      const newWidth = Math.max(isResizing.type === 'dim' ? 160 : 75, isResizing.startWidth + delta);

      if (isResizing.type === 'dim') {
        onUpdateTable(table.id, { dimColWidth: newWidth });
      } else {
        onUpdateTable(table.id, { metricColWidth: newWidth });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, table.id, onUpdateTable]);

  // Size quick handlers
  const handleSetDensity = (density: RowDensity, px: number) => {
    onUpdateTable(table.id, { rowDensity: density, rowPaddingY: px });
  };

  const handleResetSizes = () => {
    onUpdateTable(table.id, {
      rowDensity: 'normal',
      rowPaddingY: 10,
      dimColWidth: 280,
      metricColWidth: 130,
      fontSize: 'xs',
    });
  };

  // Helper to extract value from row (including custom fields)
  const getRowValue = (row: CityData, fieldKey: string): any => {
    if (!row) return '';
    // 1. Standard Fields
    if (fieldKey === 'KEPWIL' || fieldKey === 'kepwil') return row.kepwil || (row.rawRow && (row.rawRow['KEPWIL'] || row.rawRow['Kepwil'] || row.rawRow['Wilayah'])) || 'Wilayah Lain';
    if (fieldKey === 'KANTOR CABANG' || fieldKey === 'kantorCabang' || fieldKey === 'name') return row.name || row.kantorCabang || (row.rawRow && (row.rawRow['KANTOR CABANG'] || row.rawRow['Cabang'])) || '-';
    if (fieldKey === 'BULAN' || fieldKey === 'bulan') return row.bulan || (row.rawRow && (row.rawRow['BULAN'] || row.rawRow['Bulan'] || row.rawRow['Periode'])) || 'Semua Periode';
    if (fieldKey === 'TAHUN' || fieldKey === 'tahun') return (row.rawRow && (row.rawRow['TAHUN'] || row.rawRow['Tahun'])) || '2025';
    if (fieldKey === 'Layanan_Informasi' || fieldKey === 'informasi') return row.informasi ?? (row.rawRow && parseNumericValue(row.rawRow['Layanan_Informasi'] || row.rawRow['Informasi'])) ?? 0;
    if (fieldKey === 'Layanan_Permintaan' || fieldKey === 'permintaan') return row.permintaan ?? (row.rawRow && parseNumericValue(row.rawRow['Layanan_Permintaan'] || row.rawRow['Permintaan'])) ?? 0;
    if (fieldKey === 'Layanan_Pengaduan' || fieldKey === 'pengaduan') return row.pengaduan ?? (row.rawRow && parseNumericValue(row.rawRow['Layanan_Pengaduan'] || row.rawRow['Pengaduan'])) ?? 0;
    if (fieldKey === 'Total' || fieldKey === 'total') return row.total ?? (row.rawRow && parseNumericValue(row.rawRow['Total'] || row.rawRow['TOTAL'])) ?? 0;
    if (fieldKey === 'Kepatuhan_SLA' || fieldKey === 'slaCompliance') return row.slaCompliance ?? (row.rawRow && parseNumericValue(row.rawRow['Kepatuhan_SLA'] || row.rawRow['SLA'])) ?? 0;
    if (fieldKey === 'Rata_Rata_Hari_SLA' || fieldKey === 'avgSlaDays') return row.avgSlaDays ?? (row.rawRow && parseNumericValue(row.rawRow['Rata_Rata_Hari_SLA'] || row.rawRow['Rata-Rata Hari SLA'])) ?? 0;

    // 2. Custom Spreadsheet Fields
    const custom = customFields.find(cf => cf.key === fieldKey);
    if (!custom) return (row as any)[fieldKey] || 0;

    // Calculation Method A: Group Sum (Sum multiple columns)
    if (custom.calcMethod === 'group_sum') {
      const sourceCols = custom.sourceColumns || (custom.sourceColumn ? [custom.sourceColumn] : []);
      if (sourceCols.length === 0) return 0;
      return sourceCols.reduce((acc, col) => {
        const val = parseNumericValue(getRowValue(row, col));
        return acc + val;
      }, 0);
    }

    // Calculation Method B: Threshold Scoring
    if (custom.calcMethod === 'threshold_scoring' || custom.calcMethod === 'range_bins') {
      const sourceCol = custom.sourceColumn || 'Kepatuhan_SLA';
      const rawVal = parseNumericValue(getRowValue(row, sourceCol));

      if (custom.thresholds && custom.thresholds.length > 0) {
        for (const t of custom.thresholds) {
          const minPass = t.min === undefined || rawVal >= t.min;
          const maxPass = t.max === undefined || rawVal <= t.max;
          if (minPass && maxPass) {
            return t.output;
          }
        }
      }
      return custom.defaultValue !== undefined ? custom.defaultValue : 0;
    }

    // Calculation Method C: Multiplier
    if (custom.calcMethod === 'multiplier') {
      const sourceCol = custom.sourceColumn || 'Total';
      const rawVal = parseNumericValue(getRowValue(row, sourceCol));
      const mult = custom.multiplier ?? 1;
      return rawVal * mult;
    }

    // Calculation Method D: Text Mapping
    if (custom.calcMethod === 'text_mapping') {
      const sourceCol = custom.sourceColumn || 'KEPWIL';
      const rawVal = String(getRowValue(row, sourceCol) || '').trim().toLowerCase();
      if (custom.textMappings) {
        for (const tm of custom.textMappings) {
          if (rawVal === tm.match.trim().toLowerCase()) {
            return tm.output;
          }
        }
      }
      return custom.defaultValue !== undefined ? custom.defaultValue : 'Lainnya';
    }

    return (row as any)[fieldKey] || 0;
  };

  // Add field to zone helper
  const addFieldToZone = (fieldKey: string, zone: 'row' | 'column' | 'value') => {
    const f = availableFields.find(item => item.key === fieldKey);
    if (!f) return;

    if (zone === 'row') {
      if (!rowFields.includes(fieldKey)) {
        const nextRows = [...rowFields, fieldKey];
        const nextCols = columnFields.filter(k => k !== fieldKey);
        onUpdateTable(table.id, { rowFields: nextRows, columnFields: nextCols });
      }
    } else if (zone === 'column') {
      if (!columnFields.includes(fieldKey)) {
        const nextCols = [...columnFields, fieldKey];
        const nextRows = rowFields.filter(k => k !== fieldKey);
        onUpdateTable(table.id, { columnFields: nextCols, rowFields: nextRows });
      }
    } else if (zone === 'value') {
      const nextVals: PivotValueField[] = [
        ...valueFields,
        {
          id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          field: fieldKey,
          label: f.label,
          agg: f.type === 'metric' && fieldKey.toLowerCase().includes('sla') ? 'AVERAGE' : f.type === 'metric' ? 'SUM' : 'COUNT',
          format: fieldKey.toLowerCase().includes('sla') ? 'percent' : 'number'
        }
      ];
      onUpdateTable(table.id, { valueFields: nextVals });
    }
  };

  // Compute Pivot Cross-Tabulation Matrix
  const pivotData = useMemo(() => {
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
      if (tableSearch.trim()) {
        const query = tableSearch.toLowerCase();
        const matches = rowFields.some(rf => {
          const val = String(getRowValue(row, rf) || '').toLowerCase();
          return val.includes(query);
        });
        if (!matches) return;
      }

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
        case 'SUM':
          return values.reduce((acc, v) => acc + v, 0);
        case 'AVERAGE':
          return values.length > 0 ? values.reduce((acc, v) => acc + v, 0) / values.length : 0;
        case 'COUNT':
          return rows.length;
        case 'MIN':
          return values.length ? Math.min(...values) : 0;
        case 'MAX':
          return values.length ? Math.max(...values) : 0;
        default:
          return 0;
      }
    };

    interface FlattenedRow {
      key: string;
      label: string;
      level: number;
      fullPath: string;
      hasChildren: boolean;
      isCollapsed: boolean;
      cellValues: Record<string, Record<string, number>>;
      rowTotals: Record<string, number>;
    }

    const flatRows: FlattenedRow[] = [];

    const processGroup = (group: GroupNode) => {
      const hasChildren = Object.keys(group.children).length > 0;
      const isCollapsed = !!collapsedRows[group.fullPath];

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
        key: group.key,
        label: group.label,
        level: group.level,
        fullPath: group.fullPath,
        hasChildren,
        isCollapsed,
        cellValues,
        rowTotals
      });

      if (hasChildren && !isCollapsed) {
        Object.values(group.children).forEach(child => processGroup(child));
      }
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

    // Dynamic ranges for heat contour
    const metricRanges: Record<string, { min: number; max: number }> = {};
    valueFields.forEach(vf => {
      let min = Infinity;
      let max = -Infinity;
      flatRows.forEach(row => {
        if (colValues.length > 0) {
          colValues.forEach(cv => {
            const val = row.cellValues[cv]?.[vf.id];
            if (typeof val === 'number' && !isNaN(val)) {
              if (val < min) min = val;
              if (val > max) max = val;
            }
          });
        } else {
          const val = row.cellValues['default']?.[vf.id];
          if (typeof val === 'number' && !isNaN(val)) {
            if (val < min) min = val;
            if (val > max) max = val;
          }
        }
      });
      if (min === Infinity) min = 0;
      if (max === -Infinity) max = 0;
      metricRanges[vf.id] = { min, max };
    });

    return {
      colValues,
      flatRows,
      grandTotals,
      grandRowTotals,
      metricRanges
    };
  }, [activeData, rowFields, columnFields, valueFields, tableSearch, collapsedRows, customFields]);

  // Format cell value
  const formatVal = (val: number | undefined, format: ValueFormat): string => {
    if (val === undefined || isNaN(val)) return '-';
    if (format === 'percent') {
      return `${val.toFixed(1)}%`;
    }
    if (format === 'decimal') {
      return val.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    }
    return Math.round(val).toLocaleString('id-ID');
  };

  const getMetricCategory = (vf: PivotValueField): 'sla' | 'info' | 'permintaan' | 'pengaduan' | 'total' | 'custom' | 'general' => {
    const fLower = (vf.field || '').toLowerCase();
    const lLower = (vf.label || '').toLowerCase();
    if (fLower.includes('sla') || lLower.includes('sla') || vf.format === 'percent' || lLower.includes('kepatuhan')) {
      return 'sla';
    }
    if (fLower.includes('info') || lLower.includes('info')) return 'info';
    if (fLower.includes('permintaan') || lLower.includes('permintaan') || fLower.includes('minta')) return 'permintaan';
    if (fLower.includes('pengaduan') || lLower.includes('pengaduan') || fLower.includes('adu')) return 'pengaduan';
    if (fLower.includes('total') || lLower.includes('total')) return 'total';
    if (customFields.some(cf => cf.key === vf.field) || lLower.includes('poin') || lLower.includes('skor')) return 'custom';
    return 'general';
  };

  const renderCellContour = (
    val: number | undefined,
    vf: PivotValueField,
    isGrandTotal = false,
    isRowTotal = false,
    isTopLevel = false
  ) => {
    const formatted = formatVal(val, vf.format);
    if (val === undefined || isNaN(val) || formatted === '-') {
      return <span className="text-slate-300 font-mono text-xs">-</span>;
    }

    if (isGrandTotal) {
      return (
        <span className="font-mono font-bold text-xs text-slate-100">
          {formatted}
        </span>
      );
    }

    const isPercent = vf.format === 'percent' || (vf.field || '').toLowerCase().includes('sla') || (vf.label || '').toLowerCase().includes('sla') || (vf.label || '').toLowerCase().includes('kepatuhan');
    const range = pivotData.metricRanges?.[vf.id] || { min: 0, max: 100 };
    const span = range.max - range.min;
    const ratio = span > 0 ? (val - range.min) / span : 0.5;

    let contourBg = 'bg-slate-50/70 border-slate-200/80 text-slate-800';
    let dotColor = 'bg-slate-400';

    if (isPercent) {
      if (val >= 95 || ratio >= 0.75) {
        contourBg = isTopLevel ? 'bg-emerald-200/90 text-emerald-950 font-extrabold border-emerald-400' : 'bg-emerald-100/80 text-emerald-900 font-bold border-emerald-300';
        dotColor = 'bg-emerald-600';
      } else if (val >= 85 || ratio >= 0.45) {
        contourBg = isTopLevel ? 'bg-amber-200/90 text-amber-950 font-bold border-amber-400' : 'bg-amber-100/70 text-amber-900 font-medium border-amber-300';
        dotColor = 'bg-amber-600';
      } else {
        contourBg = isTopLevel ? 'bg-rose-200/90 text-rose-950 font-bold border-rose-400' : 'bg-rose-100/70 text-rose-900 font-medium border-rose-300';
        dotColor = 'bg-rose-600';
      }
    } else {
      if (val === 0) {
        contourBg = 'bg-slate-50/40 text-slate-400 border-slate-200';
        dotColor = 'bg-slate-300';
      } else if (ratio >= 0.7) {
        contourBg = isTopLevel ? 'bg-rose-200/90 text-rose-950 font-extrabold border-rose-400' : 'bg-rose-100/80 text-rose-900 font-bold border-rose-300';
        dotColor = 'bg-rose-600';
      } else if (ratio >= 0.35) {
        contourBg = isTopLevel ? 'bg-amber-200/90 text-amber-950 font-bold border-amber-400' : 'bg-amber-100/70 text-amber-900 font-medium border-amber-300';
        dotColor = 'bg-amber-600';
      } else {
        contourBg = isTopLevel ? 'bg-emerald-200/90 text-emerald-950 font-bold border-emerald-400' : 'bg-emerald-100/70 text-emerald-900 font-medium border-emerald-300';
        dotColor = 'bg-emerald-600';
      }
    }

    return (
      <div className={`inline-flex items-center justify-end gap-1 px-1.5 py-0.5 rounded border text-right font-mono transition-all duration-150 ${contourBg} ${isRowTotal ? 'shadow-2xs ring-1 ring-indigo-200/60' : ''}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
        <span className="truncate">{formatted}</span>
      </div>
    );
  };

  // Export Single Table to Excel
  const handleExportThisTable = () => {
    const wb = XLSX.utils.book_new();
    const aoa: any[][] = [];

    // Header 1: Title
    aoa.push([table.name || table.title || `Tabel ${tableIndex + 1}`]);
    aoa.push([table.description || 'Laporan Pivot Table Senada']);
    aoa.push([`Dibuat: ${new Date().toLocaleString('id-ID')} | Total Data: ${activeData.length} baris`]);
    aoa.push([]);

    const colField = columnFields[0];
    const { colValues, flatRows, grandTotals, grandRowTotals } = pivotData;

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

    const cleanSheetName = (table.name || table.title || `Tabel_${tableIndex + 1}`).replace(/[\\/?*[\]]/g, '').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, cleanSheetName);

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${cleanSheetName}_${dateStr}.xlsx`);
  };

  const tableName = table.name || table.title || `Tabel ${tableIndex + 1}`;

  return (
    <div
      id={`pivot-table-card-${table.id}`}
      className={`w-full bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs scroll-mt-24 ${
        isActiveTable ? 'border-emerald-400 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
      }`}
      onClick={() => {
        if (!isActiveTable) onSelectTable(table.id);
      }}
    >
      {/* 1. TABLE CARD HEADER */}
      <div className="bg-slate-900 text-white px-5 py-3.5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3">
          {/* Table Number Badge */}
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs shrink-0 shadow-xs">
            #{tableIndex + 1}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-1.5">
                <span>{tableName}</span>
              </h3>

              {/* Status Badges */}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700/60">
                {rowFields.length} Baris • {valueFields.length} Metrik
              </span>

              {columnFields.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-900/80 text-indigo-300 border border-indigo-700/60">
                  Kolom Silang: {columnFields.join(', ')}
                </span>
              )}

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {rowDensity === 'compact' ? '6px Ringkas' : rowDensity === 'spacious' ? '22px Luas' : '10px Standar'}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              {table.description || 'Tabel analisis pivot interaktif dengan kontur warna dan hierarki data.'}
            </p>
          </div>
        </div>

        {/* Action Controls for this Table Card */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* 1. Toggle Field Builder Panel */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsFieldPanelOpen(!isFieldPanelOpen);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              isFieldPanelOpen
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Buka/tutup panel pengaturan kolom baris, kolom silang, dan metrik nilai"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isFieldPanelOpen ? 'Tutup Field' : 'Atur Field'}</span>
          </button>

          {/* 2. Size & Density Customizer Popover Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSizeMenuOpen(!isSizeMenuOpen);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                isSizeMenuOpen
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Atur kerapatan baris (density), lebar kolom dimensi, lebar nilai, dan ukuran huruf"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Ukuran</span>
            </button>

            {/* Size Popover Dropdown */}
            {isSizeMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 text-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Ukuran Tabel #{tableIndex + 1}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSizeMenuOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 1. Row Density */}
                <div className="mb-3.5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <MoveVertical className="w-3 h-3 text-emerald-600" />
                      Tinggi Baris:
                    </span>
                    <span className="font-mono text-[11px] font-bold text-emerald-700">{rowPaddingY}px</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    {[
                      { id: 'compact', label: 'Ringkas', px: 6 },
                      { id: 'normal', label: 'Standar', px: 10 },
                      { id: 'comfortable', label: 'Luas', px: 16 },
                      { id: 'spacious', label: 'Ekstra', px: 22 },
                    ].map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleSetDensity(d.id as RowDensity, d.px)}
                        className={`py-1 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                          rowDensity === d.id
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-500 ring-1 ring-emerald-400'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="26"
                    value={rowPaddingY}
                    onChange={(e) => onUpdateTable(table.id, { rowPaddingY: Number(e.target.value) })}
                    className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 2. Dim Col Width */}
                <div className="mb-3.5">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <MoveHorizontal className="w-3 h-3 text-indigo-600" />
                      Lebar Kolom Dimensi:
                    </span>
                    <span className="font-mono text-[11px] font-bold text-indigo-700">{dimColWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="180"
                    max="480"
                    step="10"
                    value={dimColWidth}
                    onChange={(e) => onUpdateTable(table.id, { dimColWidth: Number(e.target.value) })}
                    className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 3. Metric Col Width */}
                <div className="mb-3.5">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <MoveHorizontal className="w-3 h-3 text-amber-600" />
                      Lebar Kolom Nilai:
                    </span>
                    <span className="font-mono text-[11px] font-bold text-amber-700">{metricColWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="260"
                    step="5"
                    value={metricColWidth}
                    onChange={(e) => onUpdateTable(table.id, { metricColWidth: Number(e.target.value) })}
                    className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 4. Font Size */}
                <div className="mb-3">
                  <span className="text-xs font-semibold text-slate-700 block mb-1.5">Ukuran Teks:</span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: '11px', label: 'Kecil (11px)' },
                      { id: 'xs', label: 'Standar (12px)' },
                      { id: 'sm', label: 'Besar (13px)' },
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => onUpdateTable(table.id, { fontSize: f.id as TableFontSize })}
                        className={`py-1 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                          fontSize === f.id
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetSizes}
                  className="w-full py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset ke Standar</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Export Excel This Table */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleExportThisTable();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-2xs transition-all cursor-pointer"
            title="Download tabel ini ke format Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* 4. Edit Title / Rename */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartRenameTable(table);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title="Ganti nama tabel ini"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* 5. Duplicate Table */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateTable(table);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title="Duplikat tabel ini dalam tab"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* 5b. Move Up / Down Table (if more than 1 table in tab) */}
          {totalTables > 1 && onMoveTable && (
            <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
              <button
                type="button"
                disabled={tableIndex <= 0}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveTable(table.id, 'up');
                }}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Pindahkan tabel ini ke atas"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                disabled={tableIndex >= totalTables - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveTable(table.id, 'down');
                }}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Pindahkan tabel ini ke bawah"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* 6. Delete Table (if more than 1) */}
          {totalTables > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRequestDeleteTable(table);
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/80 text-rose-300 hover:text-rose-100 border border-slate-700 transition-colors cursor-pointer"
              title="Hapus tabel ini dari tab"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 7. Collapse/Expand Table Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsTableCollapsed(!isTableCollapsed);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer ml-1"
            title={isTableCollapsed ? 'Buka tampilan tabel' : 'Lipat tabel'}
          >
            {isTableCollapsed ? <ChevronDown className="w-4 h-4 text-emerald-400" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. FIELD CONFIGURATION PANEL (EXPANDABLE) */}
      {isFieldPanelOpen && !isTableCollapsed && (
        <div className="bg-slate-100/90 border-b border-slate-200 p-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 5 Cols: Available Google Sheet Columns */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Daftar Kolom Google Sheet</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Urutan kolom sesuai Google Sheet (Kolom 1 - {availableFields.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenAddCustomVariable}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-200 transition-colors cursor-pointer"
                  >
                    + Variabel Kustom
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {availableFields.map((f, fIdx) => {
                    const isRow = rowFields.includes(f.key);
                    const isCol = columnFields.includes(f.key);
                    const customObj = f.isCustom ? customFields.find(cf => cf.key === f.key) : null;
                    const colNum = f.sheetColIndex !== undefined ? f.sheetColIndex : fIdx + 1;

                    return (
                      <div
                        key={f.key}
                        className="group flex items-center justify-between bg-slate-50 hover:bg-slate-100/90 px-2 py-1.5 rounded-lg border border-slate-200/80 text-xs transition-colors gap-2"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                          <span className="text-[9px] px-1 py-0.5 rounded bg-slate-200 text-slate-600 font-mono font-bold shrink-0" title={`Kolom ${colNum} di Google Sheet`}>
                            #{colNum}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                            f.type === 'metric' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {f.type === 'metric' ? '123' : 'Abc'}
                          </span>
                          <span className="truncate font-medium text-slate-700 text-xs" title={f.label}>
                            {f.label}
                          </span>
                          {f.isCustom && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 text-purple-700 font-bold shrink-0">
                              Kustom
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {f.isCustom && customObj && (
                            <div className="flex items-center gap-0.5 mr-1 pr-1 border-r border-slate-200">
                              <button
                                type="button"
                                onClick={() => onOpenEditCustomVariable(customObj)}
                                className="p-1 rounded bg-slate-200 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 cursor-pointer"
                                title="Edit Kolom Kustom"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteCustomVariable(f.key)}
                                className="p-1 rounded bg-slate-200 hover:bg-rose-100 text-slate-600 hover:text-rose-700 cursor-pointer"
                                title="Hapus Kolom Kustom"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => addFieldToZone(f.key, 'row')}
                            disabled={isRow}
                            className={`py-0.5 px-2 rounded text-[10px] font-bold transition-all ${
                              isRow
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold cursor-default'
                                : 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 shadow-2xs cursor-pointer'
                            }`}
                          >
                            {isRow ? '✓ Baris' : '+ Baris'}
                          </button>
                          <button
                            type="button"
                            onClick={() => addFieldToZone(f.key, 'column')}
                            disabled={isCol}
                            className={`py-0.5 px-2 rounded text-[10px] font-bold transition-all ${
                              isCol
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-300 font-extrabold cursor-default'
                                : 'bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 shadow-2xs cursor-pointer'
                            }`}
                          >
                            {isCol ? '✓ Kolom' : '+ Kolom'}
                          </button>
                          <button
                            type="button"
                            onClick={() => addFieldToZone(f.key, 'value')}
                            className="py-0.5 px-2 rounded text-[10px] font-bold bg-white hover:bg-amber-50 text-amber-800 hover:text-amber-900 border border-slate-200 shadow-2xs transition-all cursor-pointer"
                          >
                            + Nilai
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 7 Cols: Quadrants */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Baris */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Baris ({rowFields.length})</span>
                  </span>
                </div>
                <div className="flex-1 space-y-1 max-h-48 overflow-y-auto">
                  {rowFields.length === 0 ? (
                    <div className="text-[10px] text-slate-400 p-2 text-center border border-dashed border-slate-200 rounded">
                      Pilih field di kiri lalu klik +Baris
                    </div>
                  ) : (
                    rowFields.map((rf, idx) => (
                      <div
                        key={rf}
                        className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200 px-2 py-1 rounded text-xs text-emerald-950 font-medium"
                      >
                        <span className="truncate">{idx + 1}. {availableFields.find(f => f.key === rf)?.label || rf}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateTable(table.id, { rowFields: rowFields.filter(k => k !== rf) })}
                          className="text-emerald-700 hover:text-rose-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 2. Kolom Silang */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Kolom Silang ({columnFields.length})</span>
                  </span>
                </div>
                <div className="flex-1 space-y-1 max-h-48 overflow-y-auto">
                  {columnFields.length === 0 ? (
                    <div className="text-[10px] text-slate-400 p-2 text-center border border-dashed border-slate-200 rounded">
                      (Opsional) misal: Bulan
                    </div>
                  ) : (
                    columnFields.map(cf => (
                      <div
                        key={cf}
                        className="flex items-center justify-between bg-indigo-50/70 border border-indigo-200 px-2 py-1 rounded text-xs text-indigo-950 font-medium"
                      >
                        <span className="truncate">{availableFields.find(f => f.key === cf)?.label || cf}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateTable(table.id, { columnFields: columnFields.filter(k => k !== cf) })}
                          className="text-indigo-700 hover:text-rose-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 3. Nilai */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-amber-600" />
                    <span>Nilai ({valueFields.length})</span>
                  </span>
                </div>
                <div className="flex-1 space-y-1 max-h-48 overflow-y-auto">
                  {valueFields.length === 0 ? (
                    <div className="text-[10px] text-slate-400 p-2 text-center border border-dashed border-slate-200 rounded">
                      Pilih field di kiri lalu klik +Nilai
                    </div>
                  ) : (
                    valueFields.map(vf => (
                      <div
                        key={vf.id}
                        className="flex items-center justify-between bg-amber-50/70 border border-amber-200 px-2 py-1 rounded text-xs text-amber-950"
                      >
                        <span className="truncate mr-1 font-semibold">{vf.label}</span>
                        <div className="flex items-center gap-1">
                          <select
                            value={vf.agg}
                            onChange={(e) => {
                              const newAgg = e.target.value as AggregationType;
                              onUpdateTable(table.id, {
                                valueFields: valueFields.map(v => v.id === vf.id ? { ...v, agg: newAgg } : v)
                              });
                            }}
                            className="bg-white border border-amber-300 rounded text-[9px] font-bold text-amber-800 px-1 py-0.5"
                          >
                            <option value="SUM">SUM</option>
                            <option value="AVERAGE">AVG</option>
                            <option value="COUNT">COUNT</option>
                            <option value="MIN">MIN</option>
                            <option value="MAX">MAX</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => onUpdateTable(table.id, { valueFields: valueFields.filter(v => v.id !== vf.id) })}
                            className="text-amber-800 hover:text-rose-600 p-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TABLE BODY / SPREADSHEET GRID */}
      {!isTableCollapsed && (
        <div className="flex flex-col">
          {/* Sub-toolbar: Search & Filter Sync */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Expand / Collapse all tree */}
              <div className="flex items-center gap-1 border border-slate-200 rounded bg-white p-0.5">
                <button
                  type="button"
                  onClick={expandAll}
                  className="px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Buka Semua Baris
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Tutup Rincian
                </button>
              </div>

              {/* Follow Dashboard Filter checkbox */}
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 select-none text-[11px]">
                <input
                  type="checkbox"
                  checked={useFilteredData}
                  onChange={(e) => onUpdateTable(table.id, { useFilteredData: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span>Ikuti filter dashboard (bulan/wilayah)</span>
              </label>
            </div>

            {/* Local Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Cari baris pada tabel ini..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
              />
              {tableSearch && (
                <button
                  type="button"
                  onClick={() => setTableSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* SPREADSHEET TABLE CONTAINER */}
          <div className="overflow-auto max-h-[580px] relative select-none">
            <table className={`w-full border-collapse text-left font-sans ${fontSize === '11px' ? 'text-[11px]' : fontSize === 'sm' ? 'text-sm' : 'text-xs'}`}>
              {/* Header */}
              <thead className="sticky top-0 z-10 bg-slate-900 text-white shadow-xs">
                {columnFields.length > 0 && pivotData.colValues.length > 0 ? (
                  <>
                    <tr className="border-b border-slate-800 text-center font-bold">
                      <th
                        rowSpan={2}
                        style={{ width: `${dimColWidth}px`, minWidth: `${dimColWidth}px`, maxWidth: `${dimColWidth}px` }}
                        className="p-3 text-left font-bold text-indigo-200 bg-slate-950 border-r border-slate-800 tracking-wide relative group"
                      >
                        <div className="flex items-center gap-1.5 pr-2 truncate">
                          <span className="w-2 h-2 rounded bg-indigo-400 shrink-0" />
                          <span className="truncate">{rowFields.map(rf => availableFields.find(f => f.key === rf)?.label || rf).join(' › ')}</span>
                        </div>
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setIsResizing({ type: 'dim', startX: e.clientX, startWidth: dimColWidth });
                          }}
                          className="absolute right-0 top-0 bottom-0 w-2 hover:w-3.5 bg-slate-700/0 hover:bg-emerald-500/80 cursor-col-resize z-20 transition-all"
                          title="Geser untuk mengubah lebar kolom dimensi"
                        />
                      </th>
                      {pivotData.colValues.map(cv => (
                        <th
                          key={cv}
                          colSpan={valueFields.length}
                          className="p-2 border-r border-slate-700/80 bg-slate-800 text-slate-100 uppercase tracking-wider text-[11px] font-bold"
                        >
                          {cv}
                        </th>
                      ))}
                      <th
                        colSpan={valueFields.length}
                        className="p-2 bg-emerald-950 text-emerald-300 font-extrabold border-l-2 border-emerald-500/70 uppercase tracking-wider text-[11px]"
                      >
                        TOTAL
                      </th>
                    </tr>
                    <tr className="border-b border-slate-800 text-right text-[11px]">
                      {pivotData.colValues.map(cv => (
                        <React.Fragment key={cv}>
                          {valueFields.map(vf => {
                            const cat = getMetricCategory(vf);
                            return (
                              <th
                                key={vf.id}
                                style={{ width: `${metricColWidth}px`, minWidth: `${metricColWidth}px` }}
                                className="p-2 border-r border-slate-800 font-semibold text-slate-200 bg-slate-850 relative group"
                              >
                                <div className="flex items-center justify-end gap-1 pr-1 truncate">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    cat === 'sla' ? 'bg-emerald-400' :
                                    cat === 'info' ? 'bg-sky-400' :
                                    cat === 'permintaan' ? 'bg-amber-400' :
                                    cat === 'pengaduan' ? 'bg-rose-400' :
                                    cat === 'total' ? 'bg-indigo-400' :
                                    cat === 'custom' ? 'bg-purple-400' : 'bg-slate-400'
                                  }`} />
                                  <span className="truncate" title={vf.label}>{vf.label}</span>
                                </div>
                                <div
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setIsResizing({ type: 'metric', startX: e.clientX, startWidth: metricColWidth });
                                  }}
                                  className="absolute right-0 top-0 bottom-0 w-2 hover:w-3.5 bg-slate-700/0 hover:bg-amber-500/80 cursor-col-resize z-20 transition-all"
                                  title="Geser untuk mengubah lebar kolom metrik"
                                />
                              </th>
                            );
                          })}
                        </React.Fragment>
                      ))}
                      {valueFields.map(vf => (
                        <th
                          key={`tot-${vf.id}`}
                          style={{ width: `${metricColWidth}px`, minWidth: `${metricColWidth}px` }}
                          className="p-2 bg-emerald-950/90 text-emerald-200 font-bold border-r border-emerald-900/60 border-l border-emerald-800/40 relative group"
                        >
                          <div className="flex items-center justify-end gap-1 pr-1 truncate">
                            <span className="truncate" title={`Total ${vf.label}`}>{vf.label}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </>
                ) : (
                  <tr className="border-b border-slate-800 text-[11px]">
                    <th
                      style={{ width: `${dimColWidth}px`, minWidth: `${dimColWidth}px`, maxWidth: `${dimColWidth}px` }}
                      className="p-3 text-left font-bold text-indigo-200 bg-slate-950 border-r border-slate-800 tracking-wide relative group"
                    >
                      <div className="flex items-center gap-1.5 pr-2 truncate">
                        <span className="w-2 h-2 rounded bg-indigo-400 shrink-0" />
                        <span className="truncate">{rowFields.map(rf => availableFields.find(f => f.key === rf)?.label || rf).join(' › ')}</span>
                      </div>
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setIsResizing({ type: 'dim', startX: e.clientX, startWidth: dimColWidth });
                        }}
                        className="absolute right-0 top-0 bottom-0 w-2 hover:w-3.5 bg-slate-700/0 hover:bg-emerald-500/80 cursor-col-resize z-20 transition-all"
                        title="Geser untuk mengubah lebar kolom dimensi"
                      />
                    </th>
                    {valueFields.map(vf => {
                      const cat = getMetricCategory(vf);
                      return (
                        <th
                          key={vf.id}
                          style={{ width: `${metricColWidth}px`, minWidth: `${metricColWidth}px` }}
                          className="p-3 text-right font-bold text-slate-200 border-l border-slate-800 bg-slate-900 relative group"
                        >
                          <div className="flex items-center justify-end gap-1.5 pr-1 truncate">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              cat === 'sla' ? 'bg-emerald-400' :
                              cat === 'info' ? 'bg-sky-400' :
                              cat === 'permintaan' ? 'bg-amber-400' :
                              cat === 'pengaduan' ? 'bg-rose-400' :
                              cat === 'total' ? 'bg-indigo-400' :
                              cat === 'custom' ? 'bg-purple-400' : 'bg-slate-400'
                            }`} />
                            <span className="text-slate-100 truncate">{vf.label}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700 shrink-0">
                              {vf.agg}
                            </span>
                          </div>
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setIsResizing({ type: 'metric', startX: e.clientX, startWidth: metricColWidth });
                            }}
                            className="absolute right-0 top-0 bottom-0 w-2 hover:w-3.5 bg-slate-700/0 hover:bg-amber-500/80 cursor-col-resize z-20 transition-all"
                            title="Geser untuk mengubah lebar kolom metrik"
                          />
                        </th>
                      );
                    })}
                  </tr>
                )}
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-200 bg-white">
                {pivotData.flatRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={1 + (columnFields.length > 0 ? (pivotData.colValues.length + 1) * valueFields.length : valueFields.length)}
                      className="p-8 text-center text-slate-400"
                    >
                      <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-semibold">Tidak ada baris data yang cocok dengan kriteria filter pivot.</p>
                    </td>
                  </tr>
                ) : (
                  pivotData.flatRows.map(row => {
                    const isTopLevel = row.level === 0;

                    return (
                      <tr
                        key={row.fullPath}
                        className={`transition-colors ${
                          isTopLevel
                            ? 'bg-slate-100/70 hover:bg-slate-200/60 font-bold text-slate-900 border-t-2 border-b border-slate-300'
                            : row.level === 1
                            ? 'bg-white hover:bg-slate-50 text-slate-800 font-medium'
                            : 'bg-slate-50/40 hover:bg-slate-100/60 text-slate-700'
                        }`}
                      >
                        {/* Row Dim Label */}
                        <td
                          style={{
                            width: `${dimColWidth}px`,
                            minWidth: `${dimColWidth}px`,
                            maxWidth: `${dimColWidth}px`,
                            paddingTop: `${rowPaddingY}px`,
                            paddingBottom: `${rowPaddingY}px`
                          }}
                          className="px-2.5 border-r border-slate-200/90"
                        >
                          <div
                            className="flex items-center gap-1.5 truncate"
                            style={{ paddingLeft: `${row.level * 18}px` }}
                          >
                            {row.hasChildren ? (
                              <button
                                type="button"
                                onClick={() => toggleCollapse(row.fullPath)}
                                className="w-4 h-4 rounded hover:bg-slate-300/80 text-slate-600 flex items-center justify-center shrink-0 cursor-pointer"
                              >
                                {row.isCollapsed ? (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            ) : (
                              <span className="w-4 h-4 shrink-0 flex items-center justify-center text-slate-300">
                                •
                              </span>
                            )}
                            <span className="truncate" title={row.label}>{row.label}</span>
                          </div>
                        </td>

                        {/* Values */}
                        {columnFields.length > 0 && pivotData.colValues.length > 0 ? (
                          <>
                            {pivotData.colValues.map(cv => (
                              <React.Fragment key={cv}>
                                {valueFields.map(vf => {
                                  const val = row.cellValues[cv]?.[vf.id];
                                  return (
                                    <td
                                      key={vf.id}
                                      style={{
                                        width: `${metricColWidth}px`,
                                        minWidth: `${metricColWidth}px`,
                                        paddingTop: `${rowPaddingY}px`,
                                        paddingBottom: `${rowPaddingY}px`
                                      }}
                                      className="px-2 text-right border-r border-slate-200"
                                    >
                                      {renderCellContour(val, vf, false, false, isTopLevel)}
                                    </td>
                                  );
                                })}
                              </React.Fragment>
                            ))}
                            {valueFields.map(vf => {
                              const val = row.rowTotals[vf.id];
                              return (
                                <td
                                  key={`tot-${vf.id}`}
                                  style={{
                                    width: `${metricColWidth}px`,
                                    minWidth: `${metricColWidth}px`,
                                    paddingTop: `${rowPaddingY}px`,
                                    paddingBottom: `${rowPaddingY}px`
                                  }}
                                  className="px-2 text-right font-mono font-bold bg-indigo-50/30 border-r border-slate-300 border-l border-indigo-100"
                                >
                                  {renderCellContour(val, vf, false, true, isTopLevel)}
                                </td>
                              );
                            })}
                          </>
                        ) : (
                          valueFields.map(vf => {
                            const val = row.cellValues['default']?.[vf.id];
                            return (
                              <td
                                key={vf.id}
                                style={{
                                  width: `${metricColWidth}px`,
                                  minWidth: `${metricColWidth}px`,
                                  paddingTop: `${rowPaddingY}px`,
                                  paddingBottom: `${rowPaddingY}px`
                                }}
                                className="px-2.5 text-right border-l border-slate-200"
                              >
                                {renderCellContour(val, vf, false, false, isTopLevel)}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Grand Total Footer */}
              {pivotData.flatRows.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-slate-950 text-white font-extrabold shadow-inner border-t-2 border-emerald-500">
                  <tr className="text-xs">
                    <td
                      style={{
                        width: `${dimColWidth}px`,
                        minWidth: `${dimColWidth}px`,
                        maxWidth: `${dimColWidth}px`,
                        paddingTop: `${rowPaddingY + 2}px`,
                        paddingBottom: `${rowPaddingY + 2}px`
                      }}
                      className="px-3 border-r border-slate-800 text-emerald-300 uppercase tracking-wider text-[11px]"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="truncate">TOTAL KESELURUHAN</span>
                      </div>
                    </td>

                    {columnFields.length > 0 && pivotData.colValues.length > 0 ? (
                      <>
                        {pivotData.colValues.map(cv => (
                          <React.Fragment key={cv}>
                            {valueFields.map(vf => {
                              const val = pivotData.grandTotals[cv]?.[vf.id];
                              return (
                                <td
                                  key={vf.id}
                                  style={{
                                    width: `${metricColWidth}px`,
                                    minWidth: `${metricColWidth}px`,
                                    paddingTop: `${rowPaddingY + 2}px`,
                                    paddingBottom: `${rowPaddingY + 2}px`
                                  }}
                                  className="px-2 text-right border-r border-slate-800"
                                >
                                  {renderCellContour(val, vf, true)}
                                </td>
                              );
                            })}
                          </React.Fragment>
                        ))}
                        {valueFields.map(vf => {
                          const val = pivotData.grandRowTotals[vf.id];
                          return (
                            <td
                              key={`tot-${vf.id}`}
                              style={{
                                width: `${metricColWidth}px`,
                                minWidth: `${metricColWidth}px`,
                                paddingTop: `${rowPaddingY + 2}px`,
                                paddingBottom: `${rowPaddingY + 2}px`
                              }}
                              className="px-2 text-right bg-emerald-950/90 text-emerald-200 border-r border-emerald-800 border-l-2 border-emerald-500/70"
                            >
                              {renderCellContour(val, vf, true)}
                            </td>
                          );
                        })}
                      </>
                    ) : (
                      valueFields.map(vf => {
                        const val = pivotData.grandTotals['default']?.[vf.id];
                        return (
                          <td
                            key={vf.id}
                            style={{
                              width: `${metricColWidth}px`,
                              minWidth: `${metricColWidth}px`,
                              paddingTop: `${rowPaddingY + 2}px`,
                              paddingBottom: `${rowPaddingY + 2}px`
                            }}
                            className="px-2.5 text-right border-l border-slate-800"
                          >
                            {renderCellContour(val, vf, true)}
                          </td>
                        );
                      })
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
