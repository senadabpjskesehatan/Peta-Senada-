import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Endpoint to fetch sheet tabs metadata from a public Google Sheet without API keys
  app.get("/api/get-sheets", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing Google Sheet URL" });
    }

    try {
      // Extract spreadsheet ID from link
      const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const spreadsheetId = idMatch ? idMatch[1] : null;

      if (!spreadsheetId) {
        return res.status(400).json({ error: "Format link Google Sheet tidak valid." });
      }

      const candidateUrls = [
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/pubhtml`,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`
      ];

      const sheets: { id: string; name: string }[] = [];
      const seen = new Set<string>();

      const cleanSheetName = (rawName: string): string => {
        let name = rawName.replace(/<[^>]*>/g, "").trim();
        // Strip leading/trailing quotes if present
        if ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'"))) {
          name = name.slice(1, -1);
        }
        try {
          name = JSON.parse(`"${name}"`);
        } catch (e) {}
        
        // Unescape HTML entities & unicode escape codes
        name = name
          .replace(/&amp;/g, "&")
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\\u0026/g, "&")
          .replace(/\\u0027/g, "'")
          .replace(/\\"/g, '"');

        return name.trim();
      };

      const addSheet = (id: string | number, name: string) => {
        const cleanedId = String(id).trim();
        const cleanedName = cleanSheetName(name);
        
        if (
          cleanedId !== "" &&
          /^\d+$/.test(cleanedId) &&
          cleanedName &&
          !seen.has(cleanedId) &&
          cleanedName.length > 0 &&
          cleanedName.length < 100 &&
          !cleanedName.includes("{") &&
          !cleanedName.includes("}") &&
          !cleanedName.includes("function") &&
          !cleanedName.startsWith("http")
        ) {
          seen.add(cleanedId);
          sheets.push({ id: cleanedId, name: cleanedName });
        }
      };

      for (const targetUrl of candidateUrls) {
        try {
          const resp = await fetch(targetUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept-Language": "en-US,en;q=0.9,id;q=0.8"
            }
          });
          if (!resp.ok) continue;

          const text = await resp.text();

          // Pattern 1: HTML sheet-button list items in htmlview / pubhtml
          // e.g. <li id="sheet-button-0" class="shim"><a href="#gid=0">Nama Sheet</a></li>
          const htmlBtnRegex = /id=["']sheet-button-(\d+)["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi;
          let match: RegExpExecArray | null;
          while ((match = htmlBtnRegex.exec(text)) !== null) {
            addSheet(match[1], match[2]);
          }

          // Pattern 2: HTML links with gid in pubhtml / htmlview
          // e.g. <a href="?gid=123456&single=true">Nama Sheet</a> or href="#gid=123456">Nama Sheet</a>
          const htmlGidRegex = /<a[^>]*href=["'][^"']*(?:gid=|\#gid=)(\d+)[^"']*["'][^>]*>([^<]+)<\/a>/gi;
          while ((match = htmlGidRegex.exec(text)) !== null) {
            addSheet(match[1], match[2]);
          }

          // Pattern 3: Explicit sheetId property in Google Sheets JS model (ONLY sheetId, not generic id)
          // e.g. "sheetId": 123456, "title": "Nama Sheet"
          const jsonSheetIdRegex = /"sheetId"\s*:\s*(\d+)\s*,\s*"title"\s*:\s*"([^"]+)"/gi;
          while ((match = jsonSheetIdRegex.exec(text)) !== null) {
            addSheet(match[1], match[2]);
          }

          const jsonSheetIdRevRegex = /"title"\s*:\s*"([^"]+)"\s*,\s*"sheetId"\s*:\s*(\d+)/gi;
          while ((match = jsonSheetIdRevRegex.exec(text)) !== null) {
            addSheet(match[2], match[1]);
          }

          // Pattern 4: Nested properties object
          // e.g. "properties":{"sheetId":123456,"title":"Nama Sheet"}
          const jsonNestedRegex = /"properties"\s*:\s*\{\s*"sheetId"\s*:\s*(\d+)\s*,\s*"title"\s*:\s*"([^"]+)"/gi;
          while ((match = jsonNestedRegex.exec(text)) !== null) {
            addSheet(match[1], match[2]);
          }

          if (sheets.length > 0) {
            break;
          }
        } catch (e) {
          console.warn("Failed fetching metadata from candidate URL:", targetUrl, e);
        }
      }

      // Fallback if no sheets were found at all
      if (sheets.length === 0) {
        sheets.push({ id: "0", name: "Sheet1" });
      }

      res.json({ sheets });
    } catch (err: any) {
      console.error("Error fetching sheet metadata:", err);
      res.status(500).json({ error: err.message || "Gagal memproses metadata spreadsheet" });
    }
  });

  // Endpoint to proxy CSV data from public Google Sheet with fallback strategies
  app.get("/api/fetch-sheet-csv", async (req, res) => {
    const { url, gid } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing Google Sheet URL" });
    }

    try {
      const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const spreadsheetId = idMatch ? idMatch[1] : null;

      if (!spreadsheetId) {
        return res.status(400).json({ error: "Format link Google Sheet tidak valid." });
      }

      const activeGid = typeof gid === "string" && gid ? gid : "0";

      // Attempt 1: Direct full export endpoint (returns all rows and columns without any gviz query limits)
      const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${activeGid}`;
      // Attempt 2: gviz/tq endpoint with explicit select * for full row/col extraction
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&tq=${encodeURIComponent('select *')}&gid=${activeGid}`;
      // Attempt 3: pub?output=csv endpoint
      const pubUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/pub?output=csv&gid=${activeGid}`;

      const candidateUrls = [exportUrl, gvizUrl, pubUrl];
      let csvText = "";
      let fetchSuccess = false;

      for (const targetUrl of candidateUrls) {
        try {
          const resp = await fetch(targetUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/csv,text/plain,*/*"
            }
          });
          if (resp.ok) {
            const text = await resp.text();
            // Check if returned content looks like HTML login page or valid CSV
            if (text && !text.includes("<!DOCTYPE html>") && !text.includes("<html")) {
              csvText = text;
              fetchSuccess = true;
              break;
            }
          }
        } catch (e) {
          console.warn("CSV candidate fetch failed:", targetUrl, e);
        }
      }

      if (!fetchSuccess || !csvText.trim()) {
        return res.status(400).json({
          error: "Gagal mengambil data CSV Google Sheet. Pastikan spreadsheet diatur ke 'Siapa saja yang memiliki link dapat melihat' (Anyone with the link can view)."
        });
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.send(csvText);
    } catch (err: any) {
      console.error("Error in /api/fetch-sheet-csv:", err);
      res.status(500).json({ error: err.message || "Gagal mengambil data CSV." });
    }
  });

  // Endpoint for SMS (Super Mind Senada) AI recommendations via Google Gemini
  app.post("/api/gemini/recommendations", async (req, res) => {
    try {
      const { kantorCabang, kepwil, selectedBulan, branchMetrics, citiesSummary } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(200).json({
          success: false,
          isFallback: true,
          message: "GEMINI_API_KEY belum dikonfigurasi di lingkungan server.",
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const bm = branchMetrics || {};
      const targetName = kantorCabang || bm.branchName || 'Seluruh Kantor Cabang';

      const prompt = `Anda adalah konsultan manajemen strategis dan AI Layanan Publik profesional (Super Mind Senada - SMS).
Tugas Anda adalah memberikan rekomendasi perbaikan dan strategi operasional yang DIBUAT KHUSUS (TAILORED) UNTUK KANTOR CABANG SINKRON DENGAN DATA KONKRET BERIKUT:

Target Kantor Cabang: ${targetName}
KEPWIL: ${kepwil || bm.kepwilName || 'Semua'}
Bulan/Periode: ${selectedBulan || 'Semua'}

DATA SINKRON KINERJA UNIT (${targetName}):
1. Jumlah Layanan (Total): ${bm.totalLayanan || citiesSummary?.totalInformasi + citiesSummary?.totalPermintaan + citiesSummary?.totalPengaduan || 0} layanan
2. Penyelesaian SLA: ${bm.slaCompliance || citiesSummary?.avgSla || 0}% Compliance (Rata-rata Durasi SLA: ${bm.avgSlaDays || 2.0} Hari)
3. Rincian Jumlah Layanan per Kategori:
   - Layanan Informasi: ${bm.informasi || citiesSummary?.totalInformasi || 0}
   - Layanan Permintaan: ${bm.permintaan || citiesSummary?.totalPermintaan || 0}
   - Layanan Pengaduan: ${bm.pengaduan || citiesSummary?.totalPengaduan || 0}
4. Rincian Pokok Masalah (Root Cause Issues):
   - Pokok Masalah Administrasi (Kepesertaan/Data): ${bm.administrasi || 0} kasus
   - Pokok Masalah Iuran (Pembayaran/Tagihan/Autodebet): ${bm.iuran || 0} kasus
   - Pokok Masalah Pelayanan Kesehatan (Faskes/RS/Klaim): ${bm.pelayananKesehatan || 0} kasus

PERINTAH KHUSUS KONTEN REKOMENDASI:
- Buat rekomendasi yang UNIK dan BERBEDA-BEDA untuk Kantor Cabang ini!
- WAJIB menyebutkan angka-angka konkret dari data di atas secara eksplisit pada setiap deskripsi rekomendasi, target KPI, dan langkah tindakan (Jumlah Layanan, % SLA, Informasi, Permintaan, Pengaduan, Administrasi, Iuran, dan Pelayanan Kesehatan).
- Berikan analisis penyebab dan solusi taktis jika pokok masalah ${bm.dominantPokokMasalah || 'Administrasi'} atau pengaduan tergolong tinggi.
- LANGKAH TINDAKAN OPERASIONAL (actionSteps) Harus SANGAT KONKRET, PRAKTIS, & SANGAT MUDAH DIPAHAMI:
  * Tuliskan setiap instruksi tindakan dengan format perintah operasional langsung (Contoh: "Briefing Pagi Jam 07:45: Evaluasi target penyelesaian 15 berkas pengaduan...", "Rotasi Jam Puncak 10:00-14:00: Alihkan 2 staf back-office ke loket bantuan...", "Pasang Banner QR Code 'Cek Status Mandiri' di ruang tunggu...").
  * Hindari bahasa jargon teoritis yang abstrak. Gunakan langkah 1, 2, 3 yang spesifik, ada angka targetnya, waktu pelaksanaan, dan penanggung jawab yang jelas.

SYARAT WAJIB STRUKTUR OUTPUT:
1. Rekomendasi dibagi menjadi 3 Tahap Waktu:
   - Jangka Pendek (1 - 3 Bulan): Taktis, respon cepat, pembenahan antrean & alokasi jam sibuk staf.
   - Jangka Menengah (3 - 6 Bulan): Standardisasi SOP, capacity building, koordinasi KEPWIL, integrasi tools monitoring.
   - Jangka Panjang (6 - 12+ Bulan): Transformasi digital penuh, otomatisasi AI Senada, budaya kerja berbasis analitik.
2. Setiap Tahap Waktu WAJIB mencakup 3 Aspek Utama:
   - People: SDM, pelatihan empati/krisis, rotasi jam sibuk, budaya layanan, reskilling.
   - Proses: SOP layanan, alur tindak lanjut pengaduan, fast-track SLA escalation, audit kualitas.
   - Tools: Perangkat IT, dashboard monitoring Senada, otomatisasi WhatsApp/PWA, Kios Mandiri.

Hasilkan minimal 9 item rekomendasi (3 per Tahap Waktu, mencakup aspek People, Proses, dan Tools).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              overallScore: { type: Type.NUMBER },
              healthStatus: { type: Type.STRING },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    aspect: { type: Type.STRING },
                    aspectLabel: { type: Type.STRING },
                    timeframe: { type: Type.STRING },
                    timeframeLabel: { type: Type.STRING },
                    impactLevel: { type: Type.STRING },
                    targetBranch: { type: Type.STRING },
                    kpiTarget: { type: Type.STRING },
                    actionSteps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: ["id", "title", "description", "aspect", "aspectLabel", "timeframe", "timeframeLabel", "impactLevel", "actionSteps"]
                }
              }
            },
            required: ["summary", "overallScore", "healthStatus", "recommendations"]
          }
        }
      });

      const text = response.text || "";
      const parsed = JSON.parse(text);
      return res.json({
        success: true,
        data: parsed
      });
    } catch (err: any) {
      console.error("Error generating Gemini SMS recommendations:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Gagal memproses rekomendasi AI Gemini"
      });
    }
  });

  // Serve static assets and frontend pages
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
