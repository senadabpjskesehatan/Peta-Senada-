export function parseNumericValue(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  let str = String(val).trim();
  if (!str) return 0;

  // Remove currency symbols (Rp, $, etc.), non-breaking spaces (\u00A0), and extra whitespace
  str = str.replace(/[Rp$\s\u00A0]/gi, '');

  if (/^-?\d+$/.test(str)) {
    return parseInt(str, 10);
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

  // 3. Both dot and comma: "1.041.788,00" or "1,041,788.00"
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf('.') < str.lastIndexOf(',')) {
      // Indonesian format: 1.041.788,00 -> dot is thousand, comma is decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,041,788.00 -> comma is thousand, dot is decimal
      str = str.replace(/,/g, '');
    }
  } else if (str.includes('.')) {
    // Single dot, e.g., "1.041" or "1041.788" or "1041.5"
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1) {
      str = str.replace('.', '');
    }
  } else if (str.includes(',')) {
    // Single comma, e.g., "1,041" or "1041,788" or "1041,5"
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1) {
      str = str.replace(',', '');
    } else {
      str = str.replace(',', '.');
    }
  }

  const cleaned = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function extractSpreadsheetId(url: string): { spreadsheetId: string | null; gid: string | null } {
  if (!url) return { spreadsheetId: null, gid: null };
  
  // Extract spreadsheet ID
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const spreadsheetId = idMatch ? idMatch[1] : null;
  
  // Extract GID (sheet tab id)
  const gidMatch = url.match(/[#&]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : null;
  
  return { spreadsheetId, gid };
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
  
  // Full RFC 4180 CSV parser supporting unlimited rows, columns, and multi-line quotes
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

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
      // Keep row if it has any content
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow);
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
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return [];

  // Deduplicate and sanitize headers for all columns without limits
  const headerCounts: Record<string, number> = {};
  const rawHeaders = rows[0];
  const maxCols = Math.max(...rows.map(r => r.length));

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
  for (let r = 1; r < rows.length; r++) {
    const rowValues = rows[r];
    const obj: any = {};
    let hasData = false;

    headers.forEach((header, colIdx) => {
      let val = rowValues[colIdx] !== undefined ? rowValues[colIdx] : '';
      val = val.replace(/^"|"$/g, '').replace(/""/g, '"').trim();

      if (val !== '') hasData = true;

      const parsedNum = parseNumericValue(val);
      if (val !== '' && !isNaN(Number(val))) {
        obj[header] = Number(val);
      } else if (val !== '' && typeof val === 'string' && /^-?[\d.,\s\u00A0Rp$]+$/.test(val) && !isNaN(parsedNum)) {
        obj[header] = parsedNum;
      } else {
        if (val.toLowerCase() === 'true') obj[header] = true;
        else if (val.toLowerCase() === 'false') obj[header] = false;
        else obj[header] = val;
      }
    });

    if (hasData) {
      result.push(obj);
    }
  }

  return result;
}

export async function fetchSheetData(url: string, gid?: string): Promise<{ data: any[]; columns: string[] }> {
  const { spreadsheetId, gid: urlGid } = extractSpreadsheetId(url);
  
  if (!spreadsheetId) {
    throw new Error('Link Google Sheet tidak valid. Pastikan format link benar (mengandung /spreadsheets/d/ID)');
  }
  
  const activeGid = gid !== undefined && gid !== "" ? gid : (urlGid || "0");
  
  let csvText = "";

  // Strategy 1: Call backend proxy API which handles fallback gviz & export endpoints
  try {
    const proxyUrl = `/api/fetch-sheet-csv?url=${encodeURIComponent(url)}&gid=${encodeURIComponent(activeGid)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      csvText = await response.text();
    }
  } catch (e) {
    console.warn('Proxy fetch failed, attempting client direct fetch...', e);
  }

  // Strategy 2: Direct client fetch via Google gviz/tq endpoint if proxy failed
  if (!csvText) {
    const directGvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${activeGid}`;
    try {
      const response = await fetch(directGvizUrl);
      if (response.ok) {
        csvText = await response.text();
      }
    } catch (e) {
      console.warn('Direct gviz fetch failed:', e);
    }
  }

  // Strategy 3: Direct export?format=csv
  if (!csvText) {
    const directExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${activeGid}`;
    try {
      const response = await fetch(directExportUrl);
      if (response.ok) {
        csvText = await response.text();
      }
    } catch (e) {
      console.warn('Direct export fetch failed:', e);
    }
  }

  if (!csvText || csvText.includes("<!DOCTYPE html>") || csvText.includes("<html")) {
    throw new Error("Gagal memuat data dari Google Sheet. Pastikan spreadsheet telah diatur ke 'Siapa saja yang memiliki link dapat melihat' (Anyone with link can view).");
  }

  const data = parseCSV(csvText);
  if (data.length === 0) {
    throw new Error('Tidak ada baris data yang ditemukan di sheet ini.');
  }
  
  const columns = Object.keys(data[0]);
  return { data, columns };
}
