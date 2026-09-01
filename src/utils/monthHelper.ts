export const INDONESIAN_MONTH_NAMES: Record<string, string> = {
  '01': 'Januari',
  '02': 'Februari',
  '03': 'Maret',
  '04': 'April',
  '05': 'Mei',
  '06': 'Juni',
  '07': 'Juli',
  '08': 'Agustus',
  '09': 'September',
  '10': 'Oktober',
  '11': 'November',
  '12': 'Desember',
};

export interface ParsedMonth {
  mm: string;          // 2-digit format '01' - '12'
  label: string;       // e.g. '01 - Januari'
  name: string;        // e.g. 'Januari'
  monthIndex: number;  // 1 - 12
  raw: string;
}

/**
 * Parses any date, ddmmyyyy string, month string, or number into format 'mm' and rich label.
 * Handles:
 * - ddmmyyyy (e.g. "01052024", "15082024", "31122023")
 * - dmmyyyy (e.g. "1052024" -> "05")
 * - dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy, yyyy-mm-dd
 * - Excel date serials (e.g. 45321)
 * - Numeric months (1 - 12 or 01 - 12)
 * - Indonesian & English month names ("Januari", "Mei", "August", "Sept", etc.)
 */
export function parseMonthValue(val: any): ParsedMonth | null {
  if (val === null || val === undefined || val === '') return null;
  const str = String(val).trim();
  if (!str) return null;

  // 1. Direct 2-digit or 1-digit number 1..12
  if (/^(0?[1-9]|1[0-2])$/.test(str)) {
    const num = parseInt(str, 10);
    const mm = String(num).padStart(2, '0');
    return {
      mm,
      name: INDONESIAN_MONTH_NAMES[mm] || `Bulan ${mm}`,
      label: `${mm} - ${INDONESIAN_MONTH_NAMES[mm] || `Bulan ${mm}`}`,
      monthIndex: num,
      raw: str,
    };
  }

  // 2. 8 digits: ddmmyyyy (e.g., 01052024 -> dd=01, mm=05, yyyy=2024)
  if (/^\d{8}$/.test(str)) {
    const dd = parseInt(str.slice(0, 2), 10);
    const mmStr = str.slice(2, 4);
    const mmNum = parseInt(mmStr, 10);
    const yyyy = parseInt(str.slice(4, 8), 10);
    if (mmNum >= 1 && mmNum <= 12 && dd >= 1 && dd <= 31 && yyyy >= 1900 && yyyy <= 2100) {
      const mm = String(mmNum).padStart(2, '0');
      return {
        mm,
        name: INDONESIAN_MONTH_NAMES[mm] || `Bulan ${mm}`,
        label: `${mm} - ${INDONESIAN_MONTH_NAMES[mm] || `Bulan ${mm}`}`,
        monthIndex: mmNum,
        raw: str,
      };
    }
  }

  // 3. 7 digits: dmmyyyy (e.g., 1052024 -> d=1, mm=05, yyyy=2024)
  if (/^\d{7}$/.test(str)) {
    const d = parseInt(str.slice(0, 1), 10);
    const mmStr = str.slice(1, 3);
    const mmNum = parseInt(mmStr, 10);
    const yyyy = parseInt(str.slice(3, 7), 10);
    if (mmNum >= 1 && mmNum <= 12 && d >= 1 && d <= 9 && yyyy >= 1900 && yyyy <= 2100) {
      const mm = String(mmNum).padStart(2, '0');
      return {
        mm,
        name: INDONESIAN_MONTH_NAMES[mm] || `Bulan ${mm}`,
        label: `${mm} - ${INDONESIAN_MONTH_NAMES[mm] || `Bulan ${mm}`}`,
        monthIndex: mmNum,
        raw: str,
      };
    }
  }

  // 4. Date with delimiters: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    // ISO format: YYYY-MM-DD
    if (parts[0].length === 4 && /^\d{4}$/.test(parts[0])) {
      const mmNum = parseInt(parts[1], 10);
      if (mmNum >= 1 && mmNum <= 12) {
        const mm = String(mmNum).padStart(2, '0');
        return {
          mm,
          name: INDONESIAN_MONTH_NAMES[mm] || `Bulan ${mm}`,
          label: `${mm} - ${INDONESIAN_MONTH_NAMES[mm] || `Bulan ${mm}`}`,
          monthIndex: mmNum,
          raw: str,
        };
      }
    }
    // DD/MM/YYYY or D/M/YYYY
    if (parts[2].length === 4 || parts[2].length === 2) {
      const mmNum = parseInt(parts[1], 10);
      if (mmNum >= 1 && mmNum <= 12) {
        const mm = String(mmNum).padStart(2, '0');
        return {
          mm,
          name: INDONESIAN_MONTH_NAMES[mm] || `Bulan ${mm}`,
          label: `${mm} - ${INDONESIAN_MONTH_NAMES[mm] || `Bulan ${mm}`}`,
          monthIndex: mmNum,
          raw: str,
        };
      }
    }
  }

  // 5. Excel numerical serial date (e.g. 45000)
  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str, 10);
    if (serial > 20000 && serial < 60000) {
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      const mmNum = date.getUTCMonth() + 1;
      const mm = String(mmNum).padStart(2, '0');
      return {
        mm,
        name: INDONESIAN_MONTH_NAMES[mm] || `Bulan ${mm}`,
        label: `${mm} - ${INDONESIAN_MONTH_NAMES[mm] || `Bulan ${mm}`}`,
        monthIndex: mmNum,
        raw: str,
      };
    }
  }

  // 6. Indonesian & English text names
  const monthNameMap: Record<string, string> = {
    januari: '01', january: '01', jan: '01',
    februari: '02', february: '02', feb: '02',
    maret: '03', march: '03', mar: '03',
    april: '04', apr: '04',
    mei: '05', may: '05',
    juni: '06', june: '06', jun: '06',
    juli: '07', july: '07', jul: '07',
    agustus: '08', august: '08', agu: '08', agt: '08', aug: '08',
    september: '09', sept: '09', sep: '09',
    oktober: '10', october: '10', okt: '10', oct: '10',
    november: '11', nov: '11',
    desember: '12', december: '12', des: '12', dec: '12',
  };

  const clean = str.toLowerCase().replace(/[^a-z]/g, '');
  if (monthNameMap[clean]) {
    const mm = monthNameMap[clean];
    const num = parseInt(mm, 10);
    return {
      mm,
      name: INDONESIAN_MONTH_NAMES[mm] || `Bulan ${mm}`,
      label: `${mm} - ${INDONESIAN_MONTH_NAMES[mm] || `Bulan ${mm}`}`,
      monthIndex: num,
      raw: str,
    };
  }

  for (const [k, mm] of Object.entries(monthNameMap)) {
    if (clean.includes(k)) {
      const num = parseInt(mm, 10);
      return {
        mm,
        name: INDONESIAN_MONTH_NAMES[mm] || `Bulan ${mm}`,
        label: `${mm} - ${INDONESIAN_MONTH_NAMES[mm] || `Bulan ${mm}`}`,
        monthIndex: num,
        raw: str,
      };
    }
  }

  // Fallback for custom string
  return {
    mm: str,
    name: str,
    label: str,
    monthIndex: 99,
    raw: str,
  };
}

/**
 * Helper to match any row's bulan value with the selected filter
 */
export function isBulanMatching(rowBulanVal: any, filterBulan: string): boolean {
  if (!filterBulan || filterBulan === 'Semua') return true;
  if (rowBulanVal === null || rowBulanVal === undefined || rowBulanVal === '') return false;

  const rowParsed = parseMonthValue(rowBulanVal);
  const filterParsed = parseMonthValue(filterBulan);

  if (rowParsed && filterParsed) {
    return rowParsed.mm === filterParsed.mm;
  }

  const rStr = String(rowBulanVal).trim().toLowerCase();
  const fStr = String(filterBulan).trim().toLowerCase();

  return rStr === fStr;
}

/**
 * Helper to match any row's KEPWIL value with the selected filter
 */
export function isKepwilMatching(rowKepwilVal: any, filterKepwil: string): boolean {
  if (!filterKepwil || filterKepwil === 'Semua') return true;
  if (!rowKepwilVal) return false;

  const rStr = String(rowKepwilVal).trim().toLowerCase();
  const fStr = String(filterKepwil).trim().toLowerCase();

  if (rStr === fStr) return true;

  // Extract Roman numeral or digits from KEPWIL
  // e.g. "KEPWIL IV", "Kedeputian Wilayah IV (DKI Jakarta & Banten)", "KEPWIL IV - DKI Jakarta & Banten"
  const extractKepwilKey = (s: string) => {
    const romanMatch = s.match(/\b(XI|XII|VIII|VII|VI|IV|IX|III|II|V|X|I|\d+)\b/i);
    return romanMatch ? romanMatch[1].toUpperCase() : null;
  };

  const rKey = extractKepwilKey(rStr);
  const fKey = extractKepwilKey(fStr);

  if (rKey && fKey && rKey === fKey) {
    return true;
  }

  return rStr.includes(fStr) || fStr.includes(rStr);
}

/**
 * Helper to match any row's Kantor Cabang / KC value with the selected filter
 */
export function isKantorCabangMatching(rowKCVal: any, filterKC: string): boolean {
  if (!filterKC || filterKC === 'Semua') return true;
  if (!rowKCVal) return false;

  const rStr = String(rowKCVal).trim().toLowerCase();
  const fStr = String(filterKC).trim().toLowerCase();

  if (rStr === fStr) return true;

  const cleanRow = rStr.replace(/^(kantor\s*cabang|kc|cabang)\s+/i, '').trim();
  const cleanFilter = fStr.replace(/^(kantor\s*cabang|kc|cabang)\s+/i, '').trim();

  return cleanRow === cleanFilter || cleanRow.includes(cleanFilter) || cleanFilter.includes(cleanRow);
}

/**
 * Returns formatted mm (e.g. '01', '05', etc.)
 */
export function formatMonthToMM(val: any): string {
  const parsed = parseMonthValue(val);
  return parsed ? parsed.mm : String(val || '').trim();
}

/**
 * Returns display label for Bulan dropdown (e.g. '01 - Januari', '05 - Mei', etc.)
 */
export function formatMonthDisplay(val: any): string {
  const parsed = parseMonthValue(val);
  return parsed ? parsed.label : String(val || '').trim();
}
