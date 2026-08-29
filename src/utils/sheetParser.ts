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
  const lines = csvText.split(/\r?\n/);
  if (lines.length === 0 || !lines[0]) return [];
  
  // Clean headers (remove whitespace and special characters or empty values)
  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map((h, idx) => h.trim() || `column_${idx + 1}`);
  
  const result: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    
    const obj: any = {};
    headers.forEach((header, index) => {
      let val = values[index] !== undefined ? values[index] : '';
      val = val.trim();
      
      // Auto-parse numbers (remove commas or spaces if formatting number)
      const cleanNumStr = val.replace(/[\$,]/g, '');
      if (val !== '' && !isNaN(Number(cleanNumStr))) {
        obj[header] = Number(cleanNumStr);
      } else {
        // Handle boolean
        if (val.toLowerCase() === 'true') obj[header] = true;
        else if (val.toLowerCase() === 'false') obj[header] = false;
        else obj[header] = val;
      }
    });
    result.push(obj);
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
