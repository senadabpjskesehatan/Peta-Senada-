export function parseNumericValue(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  let str = String(val).trim();
  if (!str) return 0;

  // Handle common non-numeric placeholder values
  if (/^[-–—\s#N\/A]+$/i.test(str) || /^#REF!|#VALUE!|#NAME\?|#NULL!|#DIV\/0!|NaN|null|undefined$/i.test(str)) {
    return 0;
  }

  // Handle negative numbers wrapped in parenthesis: (123) -> -123
  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  // Remove currency symbols (Rp, IDR, $, €, ¥, etc.), non-breaking spaces (\u00A0), percent (%), and extra whitespace
  str = str.replace(/[RpIDR$€¥%\s\u00A0]/gi, '');

  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    return isNegative ? -num : num;
  }

  // Handle formatted number strings
  // 1. Multiple dots (e.g., "1.041.788") -> thousand separators
  if ((str.match(/\./g) || []).length > 1) {
    str = str.replace(/\./g, '');
  }
  // 2. Multiple commas (e.g., "1,041,788") -> thousand separators
  if ((str.match(/,/g) || []).length > 1) {
    str = str.replace(/,/g, '');
  }

  // 3. Both dot and comma present: "1.041.788,50" or "1,041,788.50"
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf('.') < str.lastIndexOf(',')) {
      // Indonesian / European format: 1.041.788,50 -> dot is thousand, comma is decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,041,788.50 -> comma is thousand, dot is decimal
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Single comma, e.g., "1,041" (thousand) vs "98,5" or "12,50" (decimal)
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1 && !/^0+$/.test(parts[0])) {
      // e.g. "1,234" -> 1234
      str = str.replace(',', '');
    } else {
      // e.g. "98,5" -> 98.5
      str = str.replace(',', '.');
    }
  } else if (str.includes('.')) {
    // Single dot, e.g., "1.041" (thousand in ID locale) vs "98.5" or "12.50" or "0.123" (decimal)
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1 && parts[0] !== '0') {
      // e.g. "1.500" -> 1500 in Indonesian thousands
      str = str.replace('.', '');
    }
  }

  const cleaned = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  return isNegative ? -parsed : parsed;
}

export interface ParsedSpreadsheetUrl {
  spreadsheetId: string | null;
  gid: string | null;
  isPublished: boolean;
  pubId: string | null;
  isDirectCsv: boolean;
}

export function extractSpreadsheetId(url: string): ParsedSpreadsheetUrl {
  if (!url) return { spreadsheetId: null, gid: null, isPublished: false, pubId: null, isDirectCsv: false };
  
  const trimmed = url.trim();

  // Check if it's already a direct CSV URL
  const isDirectCsv = /\.csv($|\?)/i.test(trimmed) || /output=csv|format=csv/i.test(trimmed);

  // Extract GID (sheet tab id) from query or hash
  const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : null;

  // Check for Published to Web Google Sheet: /spreadsheets/d/e/2PACX-... or /spreadsheets/u/X/d/e/2PACX-...
  const pubMatch = trimmed.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch) {
    return {
      spreadsheetId: pubMatch[1],
      gid,
      isPublished: true,
      pubId: pubMatch[1],
      isDirectCsv
    };
  }

  // Check for Standard Google Sheet: /spreadsheets/d/1BxiM... or /spreadsheets/u/X/d/1BxiM...
  const idMatch = trimmed.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9-_]+)/);
  if (idMatch && idMatch[1] !== 'e') {
    return {
      spreadsheetId: idMatch[1],
      gid,
      isPublished: false,
      pubId: null,
      isDirectCsv
    };
  }

  // Check for Drive file view link: /file/d/1BxiM...
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (fileMatch) {
    return {
      spreadsheetId: fileMatch[1],
      gid,
      isPublished: false,
      pubId: null,
      isDirectCsv
    };
  }

  return { spreadsheetId: null, gid, isPublished: false, pubId: null, isDirectCsv };
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  // Clean double quotes
  return result.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
}

export function parseCSV(csvText: string): any[] {
  if (!csvText || !csvText.trim()) return [];
  
  // Strip BOM if present
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  // Full RFC 4180 CSV parser supporting multi-line quotes and unrestricted rows/columns
  const rawRows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        rawRows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rawRows.push(currentRow);
    }
  }

  if (rawRows.length === 0) return [];

  // Intelligent Header Row Detection:
  // Check the first 5 rows to locate the true header row
  // (handles cases where row 1 is a title banner or empty subtitle)
  let headerRowIndex = 0;
  let maxScore = -1000;

  const headerKeywords = [
    'no', 'nomor', 'id', 'bulan', 'month', 'periode', 'bln', 'tgl', 'tanggal', 'date',
    'kepwil', 'wilayah', 'kedeputian', 'kanwil', 'regional',
    'kantor cabang', 'kantor_cabang', 'kc', 'cabang', 'kota', 'kabupaten', 'nama', 'lokasi', 'daerah',
    'layanan', 'informasi', 'info', 'permintaan', 'tindakan', 'pengaduan', 'aduan', 'komplain', 'keluhan',
    'total', 'jumlah', 'grand total', 'sla', 'compliance', 'kepatuhan', 'persen', 'percent', 'target', 'realisasi'
  ];

  const maxScanRows = Math.min(5, rawRows.length);
  for (let r = 0; r < maxScanRows; r++) {
    const row = rawRows[r];
    const nonEmptyCells = row.filter(c => c && String(c).trim().length > 0);
    
    let score = nonEmptyCells.length * 2;
    let textCellCount = 0;
    let numCellCount = 0;

    for (const cell of nonEmptyCells) {
      const cLower = String(cell).toLowerCase().trim();
      const matchesKeyword = headerKeywords.some(kw => {
        if (kw.length <= 3) return cLower === kw;
        return cLower === kw || cLower.includes(kw);
      });

      if (matchesKeyword) {
        score += 8;
      }

      const cleanVal = cLower.replace(/[RpIDR$€¥%\s\u00A0]/g, '');
      const isNum = /^-?\d+([\.,]\d+)?$/.test(cleanVal);
      if (isNum) {
        numCellCount++;
      } else {
        textCellCount++;
      }
    }

    // A real header row contains column titles (strings), NOT numeric data values
    score -= numCellCount * 10;
    score += textCellCount * 3;

    if (score > maxScore) {
      maxScore = score;
      headerRowIndex = r;
    }
  }

  // Deduplicate and sanitize headers
  const rawHeaders = rawRows[headerRowIndex];
  const maxCols = Math.max(...rawRows.slice(headerRowIndex).map(r => r.length));
  const headerCounts: Record<string, number> = {};
  const headers: string[] = [];

  for (let c = 0; c < maxCols; c++) {
    let raw = (rawHeaders[c] || '').replace(/^"|"$/g, '').replace(/""/g, '"').trim();
    if (!raw) raw = `Kolom_${c + 1}`;

    if (headerCounts[raw] !== undefined) {
      headerCounts[raw]++;
      headers.push(`${raw}_${headerCounts[raw]}`);
    } else {
      headerCounts[raw] = 0;
      headers.push(raw);
    }
  }

  const result: any[] = [];
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const rowValues = rawRows[r];
    const obj: any = {};
    let hasData = false;

    headers.forEach((header, colIdx) => {
      let val = rowValues[colIdx] !== undefined ? rowValues[colIdx] : '';
      val = val.replace(/^"|"$/g, '').replace(/""/g, '"').trim();

      if (val !== '') {
        hasData = true;
        const parsedNum = parseNumericValue(val);

        if (/^0\d+$/.test(val)) {
          // Keep string codes/IDs with leading zeros like "01", "005"
          obj[header] = val;
        } else if (/^-?[\d.,\s\u00A0Rp$€¥%]+$/.test(val) && /\d/.test(val)) {
          obj[header] = parsedNum;
        } else if (val.toLowerCase() === 'true') {
          obj[header] = true;
        } else if (val.toLowerCase() === 'false') {
          obj[header] = false;
        } else {
          obj[header] = val;
        }
      } else {
        obj[header] = '';
      }
    });

    if (hasData) {
      result.push(obj);
    }
  }

  return result;
}

/**
 * Helper to parse Google Visualization JSON response (google.visualization.Query.setResponse)
 */
export function parseGvizJson(rawJsonText: string): any[] {
  if (!rawJsonText) return [];
  
  let jsonStr = rawJsonText.trim();
  // Remove wrapping: /*O_o*/\ngoogle.visualization.Query.setResponse(...) or setResponse(...)
  const startIdx = jsonStr.indexOf('{');
  const endIdx = jsonStr.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1) return [];

  jsonStr = jsonStr.substring(startIdx, endIdx + 1);

  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !parsed.table || !parsed.table.cols || !parsed.table.rows) {
      return [];
    }

    const cols: string[] = parsed.table.cols.map((c: any, i: number) => {
      if (c && c.label && String(c.label).trim()) return String(c.label).trim();
      if (c && c.id && String(c.id).trim()) return String(c.id).trim();
      return `Kolom_${i + 1}`;
    });

    const rows: any[] = [];
    for (const r of parsed.table.rows) {
      if (!r || !r.c) continue;
      const obj: any = {};
      let hasData = false;

      r.c.forEach((cell: any, colIdx: number) => {
        const colName = cols[colIdx] || `Kolom_${colIdx + 1}`;
        if (cell && cell.v !== null && cell.v !== undefined) {
          hasData = true;
          obj[colName] = cell.v;
        } else if (cell && cell.f !== null && cell.f !== undefined) {
          hasData = true;
          obj[colName] = cell.f;
        } else {
          obj[colName] = '';
        }
      });

      if (hasData) {
        rows.push(obj);
      }
    }

    return rows;
  } catch (e) {
    console.warn('Failed parsing Gviz JSON:', e);
    return [];
  }
}

export async function fetchSheetData(url: string, gid?: string): Promise<{ data: any[]; columns: string[] }> {
  if (!url || !url.trim()) {
    throw new Error('Link Google Sheet kosong. Silakan masukkan link spreadsheet.');
  }

  const parsedUrl = extractSpreadsheetId(url);
  const activeGid = gid !== undefined && gid !== "" ? gid : (parsedUrl.gid || "0");
  
  // If it's a direct CSV URL
  if (parsedUrl.isDirectCsv && !parsedUrl.spreadsheetId) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const csv = await resp.text();
        if (csv && !csv.includes('<!DOCTYPE html>') && !csv.includes('<html')) {
          const data = parseCSV(csv);
          if (data.length > 0) {
            return { data, columns: Object.keys(data[0]) };
          }
        }
      }
    } catch (e) {
      console.warn('Direct CSV fetch failed, continuing with proxy...', e);
    }
  }

  let csvText = "";
  let rawJsonText = "";

  // Strategy 1: Call backend proxy API which handles fallback gviz, pub, & export endpoints
  try {
    const proxyUrl = `/api/fetch-sheet-csv?url=${encodeURIComponent(url)}&gid=${encodeURIComponent(activeGid)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const text = await response.text();
      if (text && !text.includes('<!DOCTYPE html>') && !text.includes('<html')) {
        if (text.includes('google.visualization.Query.setResponse') || (text.startsWith('{') && text.includes('"table"'))) {
          rawJsonText = text;
        } else {
          csvText = text;
        }
      }
    }
  } catch (e) {
    console.warn('Proxy fetch failed, attempting client direct fetch...', e);
  }

  // Strategy 2: Direct client fetch via published endpoints if published sheet
  if (!csvText && !rawJsonText && parsedUrl.isPublished && parsedUrl.pubId) {
    const pubUrls = [
      `https://docs.google.com/spreadsheets/d/e/${parsedUrl.pubId}/pub?gid=${activeGid}&single=true&output=csv`,
      `https://docs.google.com/spreadsheets/d/e/${parsedUrl.pubId}/pub?output=csv&gid=${activeGid}`,
      `https://docs.google.com/spreadsheets/d/e/${parsedUrl.pubId}/pub?output=csv`
    ];

    for (const pUrl of pubUrls) {
      try {
        const response = await fetch(pUrl);
        if (response.ok) {
          const text = await response.text();
          if (text && !text.includes('<!DOCTYPE html>') && !text.includes('<html')) {
            csvText = text;
            break;
          }
        }
      } catch (e) {
        // continue to next
      }
    }
  }

  // Strategy 3: Direct client fetch via Google export endpoint
  if (!csvText && !rawJsonText && parsedUrl.spreadsheetId) {
    const directExportUrl = `https://docs.google.com/spreadsheets/d/${parsedUrl.spreadsheetId}/export?format=csv&gid=${activeGid}`;
    try {
      const response = await fetch(directExportUrl);
      if (response.ok) {
        const text = await response.text();
        if (text && !text.includes('<!DOCTYPE html>') && !text.includes('<html')) {
          csvText = text;
        }
      }
    } catch (e) {
      console.warn('Direct export fetch failed:', e);
    }
  }

  // Strategy 4: Direct client fetch via Google gviz/tq CSV endpoint
  if (!csvText && !rawJsonText && parsedUrl.spreadsheetId) {
    const directGvizUrl = `https://docs.google.com/spreadsheets/d/${parsedUrl.spreadsheetId}/gviz/tq?tqx=out:csv&tq=select%20*&gid=${activeGid}`;
    try {
      const response = await fetch(directGvizUrl);
      if (response.ok) {
        const text = await response.text();
        if (text && !text.includes('<!DOCTYPE html>') && !text.includes('<html')) {
          csvText = text;
        }
      }
    } catch (e) {
      console.warn('Direct gviz CSV fetch failed:', e);
    }
  }

  // Strategy 5: Direct client fetch via Google gviz/tq JSON endpoint
  if (!csvText && !rawJsonText && parsedUrl.spreadsheetId) {
    const directGvizJsonUrl = `https://docs.google.com/spreadsheets/d/${parsedUrl.spreadsheetId}/gviz/tq?tqx=out:json&gid=${activeGid}`;
    try {
      const response = await fetch(directGvizJsonUrl);
      if (response.ok) {
        const text = await response.text();
        if (text && text.includes('google.visualization.Query.setResponse')) {
          rawJsonText = text;
        }
      }
    } catch (e) {
      console.warn('Direct gviz JSON fetch failed:', e);
    }
  }

  // Parse Gviz JSON if available
  if (rawJsonText) {
    const parsedData = parseGvizJson(rawJsonText);
    if (parsedData.length > 0) {
      return { data: parsedData, columns: Object.keys(parsedData[0]) };
    }
  }

  // Parse CSV if available
  if (csvText && !csvText.includes('<!DOCTYPE html>') && !csvText.includes('<html')) {
    const data = parseCSV(csvText);
    if (data.length > 0) {
      return { data, columns: Object.keys(data[0]) };
    }
  }

  // If both failed, provide informative error
  throw new Error(
    "Gagal memuat data dari Google Sheet. Pastikan spreadsheet telah diatur ke 'Siapa saja yang memiliki link dapat melihat' (General Access: Anyone with the link can view) pada menu Bagikan (Share) di Google Sheet."
  );
}
