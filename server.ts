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
      const trimmed = url.trim();
      let spreadsheetId: string | null = null;
      let pubId: string | null = null;
      let isPublished = false;

      const pubMatch = trimmed.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/e\/([a-zA-Z0-9-_]+)/);
      if (pubMatch) {
        pubId = pubMatch[1];
        isPublished = true;
      } else {
        const idMatch = trimmed.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9-_]+)/);
        if (idMatch && idMatch[1] !== 'e') {
          spreadsheetId = idMatch[1];
        } else {
          const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
          if (fileMatch) spreadsheetId = fileMatch[1];
        }
      }

      if (!spreadsheetId && !pubId) {
        return res.status(400).json({ error: "Format link Google Sheet tidak valid." });
      }

      const candidateUrls = isPublished && pubId ? [
        `https://docs.google.com/spreadsheets/d/e/${pubId}/pubhtml`,
        `https://docs.google.com/spreadsheets/d/e/${pubId}/htmlview`
      ] : [
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/pubhtml`,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`
      ];

      const sheets: { id: string; name: string }[] = [];
      const seen = new Set<string>();

      const cleanSheetName = (rawName: string): string => {
        let name = rawName.replace(/<[^>]*>/g, "").trim();
        if ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'"))) {
          name = name.slice(1, -1);
        }
        try {
          name = JSON.parse(`"${name}"`);
        } catch (e) {}
        
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
          const htmlBtnRegex = /id=["']sheet-button-(\d+)["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi;
          let match: RegExpExecArray | null;
          while ((match = htmlBtnRegex.exec(text)) !== null) {
            addSheet(match[1], match[2]);
          }

          // Pattern 2: HTML links with gid in pubhtml / htmlview
          const htmlGidRegex = /<a[^>]*href=["'][^"']*(?:gid=|\#gid=)(\d+)[^"']*["'][^>]*>([^<]+)<\/a>/gi;
          while ((match = htmlGidRegex.exec(text)) !== null) {
            addSheet(match[1], match[2]);
          }

          // Pattern 3: Explicit sheetId property in Google Sheets JS model
          const jsonSheetIdRegex = /"sheetId"\s*:\s*(\d+)\s*,\s*"title"\s*:\s*"([^"]+)"/gi;
          while ((match = jsonSheetIdRegex.exec(text)) !== null) {
            addSheet(match[1], match[2]);
          }

          const jsonSheetIdRevRegex = /"title"\s*:\s*"([^"]+)"\s*,\s*"sheetId"\s*:\s*(\d+)/gi;
          while ((match = jsonSheetIdRevRegex.exec(text)) !== null) {
            addSheet(match[2], match[1]);
          }

          // Pattern 4: Nested properties object
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
      const trimmed = url.trim();
      let spreadsheetId: string | null = null;
      let pubId: string | null = null;
      let isPublished = false;

      const pubMatch = trimmed.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/e\/([a-zA-Z0-9-_]+)/);
      if (pubMatch) {
        pubId = pubMatch[1];
        isPublished = true;
      } else {
        const idMatch = trimmed.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9-_]+)/);
        if (idMatch && idMatch[1] !== 'e') {
          spreadsheetId = idMatch[1];
        } else {
          const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
          if (fileMatch) spreadsheetId = fileMatch[1];
        }
      }

      // Direct URL fetch if it's already an export link or direct file
      if (trimmed.startsWith("http") && (trimmed.includes(".csv") || trimmed.includes("output=csv") || trimmed.includes("format=csv"))) {
        try {
          const directResp = await fetch(trimmed);
          if (directResp.ok) {
            const dText = await directResp.text();
            if (dText && !dText.includes("<!DOCTYPE html>") && !dText.includes("<html")) {
              res.setHeader("Content-Type", "text/csv; charset=utf-8");
              return res.send(dText);
            }
          }
        } catch (e) {
          // continue to candidates
        }
      }

      if (!spreadsheetId && !pubId) {
        return res.status(400).json({ error: "Format link Google Sheet tidak valid." });
      }

      const activeGid = typeof gid === "string" && gid ? gid : "0";

      const candidateUrls = isPublished && pubId ? [
        `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?gid=${activeGid}&single=true&output=csv`,
        `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv&gid=${activeGid}`,
        `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv`
      ] : [
        // Attempt 1: Direct full export endpoint
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${activeGid}`,
        // Attempt 2: gviz/tq endpoint with explicit select *
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&tq=${encodeURIComponent('select *')}&gid=${activeGid}`,
        // Attempt 3: pub?output=csv endpoint
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/pub?output=csv&gid=${activeGid}`,
        // Attempt 4: gviz/tq json fallback
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&gid=${activeGid}`
      ];

      let csvText = "";
      let fetchSuccess = false;

      for (const targetUrl of candidateUrls) {
        try {
          const resp = await fetch(targetUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/csv,text/plain,application/json,*/*"
            }
          });
          if (resp.ok) {
            const text = await resp.text();
            // Check if returned content is not HTML login/denied page
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
          error: "Gagal mengambil data CSV Google Sheet. Pastikan spreadsheet diatur ke 'Siapa saja yang memiliki link dapat melihat' (General Access: Anyone with the link can view) pada menu Bagikan (Share)."
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
      const { kantorCabang, kepwil, selectedBulan, selectedTopik, branchMetrics, citiesSummary } = req.body;

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
      const topTopikList: Array<{
        topikMasalah: string;
        pokokMasalah: string;
        jenisKategori: string;
        count: number;
        percentageOfTotal: number;
      }> = Array.isArray(bm.topTopikList) ? bm.topTopikList.slice(0, 10) : [];

      const topTopikFormatted = topTopikList.length > 0
        ? topTopikList
            .map(
              (t, idx) =>
                `   ${idx + 1}. Topik Masalah: "${t.topikMasalah}" | Pokok Masalah: ${t.pokokMasalah} | Kategori: ${t.jenisKategori} | Jumlah: ${t.count} tiket (${t.percentageOfTotal}%)`
            )
            .join("\n")
        : "   1. Topik Masalah: Perubahan Data Peserta | Pokok Masalah: Administrasi | Kategori: Permintaan";

      const prompt = `Anda adalah konsultan manajemen strategis dan AI Layanan Publik profesional (Super Mind Senada - SMS).
Tugas Anda adalah memberikan rekomendasi perbaikan dan strategi operasional yang MENGACU LANGSUNG PADA DATA GOOGLE SHEET BERDASARKAN TOPIK MASALAH BERIKUT:

Target Kantor Cabang: ${targetName}
KEPWIL: ${kepwil || bm.kepwilName || 'Semua'}
Bulan/Periode: ${selectedBulan || 'Semua'}
Fokus Filter Topik Masalah: ${selectedTopik && selectedTopik !== 'Semua' ? selectedTopik : 'Top 10 Topik Masalah Tertinggi'}

DATA SINKRON GOOGLE SHEET KINERJA UNIT (${targetName}):
1. Jumlah Layanan (Total): ${bm.totalLayanan || (citiesSummary?.totalInformasi + citiesSummary?.totalPermintaan + citiesSummary?.totalPengaduan) || 0} tiket
2. Penyelesaian SLA: ${bm.slaCompliance || citiesSummary?.avgSla || 0}% Compliance (Rata-rata Durasi SLA: ${bm.avgSlaDays || 2.0} Hari)
3. Rincian Jumlah Layanan per Jenis Kategori:
   - Layanan Informasi: ${bm.informasi || citiesSummary?.totalInformasi || 0} tiket
   - Layanan Permintaan: ${bm.permintaan || citiesSummary?.totalPermintaan || 0} tiket
   - Layanan Pengaduan: ${bm.pengaduan || citiesSummary?.totalPengaduan || 0} tiket
4. Rincian Pengelompokan Pokok Masalah:
   - Pokok Masalah Administrasi: ${bm.administrasi || 0} tiket
   - Pokok Masalah Iuran: ${bm.iuran || 0} tiket
   - Pokok Masalah Pelayanan Kesehatan: ${bm.pelayananKesehatan || 0} tiket
5. DAFTAR TOP TOPIK MASALAH DARI GOOGLE SHEET (ACUAN UTAMA REKOMENDASI):
${topTopikFormatted}

PERINTAH KHUSUS KONTEN REKOMENDASI BERDASARKAN TOPIK MASALAH:
- Setiap item rekomendasi WAJIB mengacu secara spesifik pada salah satu Topik Masalah dari daftar Google Sheet di atas (isi field topikMasalah, pokokMasalah, jenisKategori, dan topikCount sesuai data di atas).
- Jika Fokus Filter Topik Masalah adalah "${selectedTopik && selectedTopik !== 'Semua' ? selectedTopik : 'Semua'}", prioritaskan pembahasan mendalam untuk topik masalah tersebut di seluruh tahap waktu dan aspek.
- WAJIB menyebutkan nama Topik Masalah beserta angka jumlah tiketnya dari Google Sheet secara eksplisit pada Judul (title), Deskripsi (description), Target KPI (kpiTarget), dan Langkah Tindakan (actionSteps).
- LANGKAH TINDAKAN OPERASIONAL (actionSteps) Harus SANGAT KONKRET, PRAKTIS, & SANGAT MUDAH DIPAHAMI:
  * Tuliskan setiap instruksi tindakan dengan format perintah operasional langsung yang menyebutkan Topik Masalahnya (Contoh: "Briefing Pagi Jam 07:45: Evaluasi target penyelesaian tiket topik '${bm.dominantTopikMasalah || 'Perubahan Data Peserta'}'...", "Rotasi Jam Puncak 10:00-14:00: Tugaskan 2 verifikator khusus pokok masalah ${bm.dominantTopikPokok || 'Administrasi'}...", "Pasang QR Code Panduan Mandiri topik '${bm.dominantTopikMasalah || 'Perubahan Data Peserta'}' di ruang tunggu...").

SYARAT WAJIB STRUKTUR OUTPUT:
1. Rekomendasi dibagi menjadi 3 Tahap Waktu:
   - Jangka Pendek (1 - 3 Bulan): Taktis, respon cepat penguraian antrean Topik Masalah tertinggi.
   - Jangka Menengah (3 - 6 Bulan): Standardisasi SOP lintas bidang, upskilling petugas pada Topik Masalah dominan, sistem peringatan dini.
   - Jangka Panjang (6 - 12+ Bulan): Pencegahan hulu (preventive action) dan otomatisasi penyelesaian mandiri berbasis Topik Masalah.
2. Setiap Tahap Waktu WAJIB mencakup 3 Aspek Utama:
   - People (aspect: "people", aspectLabel: "People")
   - Proses (aspect: "proses", aspectLabel: "Proses")
   - Tools (aspect: "tools", aspectLabel: "Tools")

Hasilkan tepat 9 item rekomendasi (3 per Tahap Waktu: pendek, menengah, panjang; masing-masing mencakup aspek people, proses, dan tools).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
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
                    topikMasalah: { type: Type.STRING },
                    pokokMasalah: { type: Type.STRING },
                    jenisKategori: { type: Type.STRING },
                    topikCount: { type: Type.NUMBER },
                    actionSteps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: [
                    "id",
                    "title",
                    "description",
                    "aspect",
                    "aspectLabel",
                    "timeframe",
                    "timeframeLabel",
                    "impactLevel",
                    "topikMasalah",
                    "pokokMasalah",
                    "jenisKategori",
                    "actionSteps"
                  ]
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
