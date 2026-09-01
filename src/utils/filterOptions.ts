import { CityData, MapSyncConfig } from '../types';
import { parseMonthValue, isBulanMatching, isKepwilMatching } from './monthHelper';
import { getKepwilForCity } from '../data/defaultData';

export interface SearchableOptionGroup {
  groupName: string;
  items: string[];
}

export function computeFilterOptions(currentCities: CityData[], sheetRawRows: any[] = [], syncConfig: MapSyncConfig, selectedBulan: string = 'Semua', selectedKepwil: string = 'Semua') {
  // 1. Bulan list
  const monthMap = new Map<string, { label: string; monthIndex: number }>();
  const processRawBulan = (raw: string) => {
    if (!raw) return;
    const parsed = parseMonthValue(raw);
    if (parsed) {
      if (!monthMap.has(parsed.label)) {
        monthMap.set(parsed.label, { label: parsed.label, monthIndex: parsed.monthIndex });
      }
    } else if (!monthMap.has(raw)) {
      monthMap.set(raw, { label: raw, monthIndex: 99 });
    }
  };

  currentCities.forEach(c => {
    let b = c.bulan;
    if (!b && c.rawRow) {
      for (const [k, v] of Object.entries(c.rawRow)) {
        if (/bulan|month|periode|bln/i.test(k.trim())) { b = String(v || '').trim(); break; }
      }
    }
    if (b) processRawBulan(b);
  });
  sheetRawRows.forEach(row => {
    for (const [k, v] of Object.entries(row)) {
      if (/bulan|month|periode|bln/i.test(k.trim())) {
        const val = String(v || '').trim();
        if (val) processRawBulan(val);
      }
    }
  });

  const availableBulanList = monthMap.size === 0 ? [
    '01 - Januari', '02 - Februari', '03 - Maret', '04 - April',
    '05 - Mei', '06 - Juni', '07 - Juli', '08 - Agustus',
    '09 - September', '10 - Oktober', '11 - November', '12 - Desember'
  ] : Array.from(monthMap.values()).sort((a, b) => {
    if (a.monthIndex !== b.monthIndex) return a.monthIndex - b.monthIndex;
    return a.label.localeCompare(b.label, undefined, { numeric: true });
  }).map(m => m.label);

  // 2. Kepwil list
  const explicitKepwilSet = new Set<string>();

  const extractExplicitKepwil = (row: any): string => {
    if (!row) return '';
    if (syncConfig.kepwilColumn && row[syncConfig.kepwilColumn] !== undefined) {
      const v = String(row[syncConfig.kepwilColumn]).trim();
      if (v) return v;
    }
    for (const [k, v] of Object.entries(row)) {
      if (/kepwil|kedeputian|wilayah|kanwil|regional/i.test(k.trim()) && !/cabang|kc/i.test(k.trim())) {
        const val = String(v || '').trim();
        if (val) return val;
      }
    }
    return '';
  };

  currentCities.forEach(c => {
    let kw = extractExplicitKepwil(c.rawRow);
    if (!kw && c.kepwil) kw = c.kepwil.trim();
    if (kw) explicitKepwilSet.add(kw);
  });

  sheetRawRows.forEach(row => {
    const kw = extractExplicitKepwil(row);
    if (kw) explicitKepwilSet.add(kw);
  });

  const kepwilSet = new Set<string>();

  if (explicitKepwilSet.size > 0) {
    // Dataset has explicit Kepwil column data: use ONLY explicit values
    explicitKepwilSet.forEach(k => kepwilSet.add(k));
  } else if (currentCities.length > 0) {
    // No explicit Kepwil column found in dataset: fallback to inferring from city names
    currentCities.forEach(c => {
      const kw = getKepwilForCity(c.kantorCabang || c.name || '');
      if (kw) kepwilSet.add(kw);
    });
  }

  const availableKepwilList = kepwilSet.size === 0 && currentCities.length === 0 ? [
    'KEPWIL I - Aceh & Sumatera Utara',
    'KEPWIL II - Riau, Kepri, Sumbar & Jambi',
    'KEPWIL III - Sumsel, Babel, Bengkulu & Lampung',
    'KEPWIL IV - DKI Jakarta & Banten',
    'KEPWIL V - Jawa Barat',
    'KEPWIL VI - Jawa Tengah & D.I. Yogyakarta',
    'KEPWIL VII - Jawa Timur',
    'KEPWIL VIII - Bali & Nusa Tenggara',
    'KEPWIL IX - Kalimantan',
    'KEPWIL X - Sulawesi & Maluku Utara',
    'KEPWIL XI - Papua & Maluku',
  ] : Array.from(kepwilSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // 3. Kantor Cabang grouped
  const groupsMap = new Map<string, Set<string>>();
  const allKCSet = new Set<string>();

  currentCities.forEach(c => {
    let kw = c.kepwil || getKepwilForCity(c.kantorCabang || c.name || '') || 'Lainnya';
    let kc = c.kantorCabang || c.name || '';
    if (!kc) return;
    if (!groupsMap.has(kw)) groupsMap.set(kw, new Set<string>());
    groupsMap.get(kw)!.add(kc);
    if (selectedKepwil === 'Semua' || isKepwilMatching(kw, selectedKepwil)) {
      allKCSet.add(kc);
    }
  });

  const groupedKantorCabang: SearchableOptionGroup[] = [];
  Array.from(groupsMap.keys()).sort().forEach(groupName => {
    if (selectedKepwil !== 'Semua' && !isKepwilMatching(groupName, selectedKepwil)) return;
    const items = Array.from(groupsMap.get(groupName) || []).sort();
    if (items.length > 0) groupedKantorCabang.push({ groupName, items });
  });

  const availableKantorCabangList = Array.from(allKCSet).sort();

  return { availableBulanList, availableKepwilList, availableKantorCabangList, groupedKantorCabang };
}
