import { CityData, SmsRecommendationResponse, StrategicRecommendationItem } from '../types';
import { parseNumericValue } from './sheetParser';
import { parseFilterValueList, isKantorCabangMatching, isKepwilMatching } from './monthHelper';
import {
  aggregateByKategoriAndPokok,
  AggregatedTopikItem,
  TOPIK_MASALAH_REFERENCE,
} from '../data/topikMasalahReference';

export interface BranchPerformanceMetrics {
  branchName: string;
  kepwilName: string;
  totalLayanan: number;
  informasi: number;
  permintaan: number;
  pengaduan: number;
  slaCompliance: number;
  avgSlaDays: number;
  administrasi: number;
  iuran: number;
  pelayananKesehatan: number;
  dominantPokokMasalah: 'administrasi' | 'iuran' | 'pelayananKesehatan';
  dominantCategory: 'informasi' | 'permintaan' | 'pengaduan';
  topTopikList: AggregatedTopikItem[];
  dominantTopikMasalah: string;
  dominantTopikPokok: string;
  dominantTopikKategori: string;
  dominantTopikCount: number;
  isDirectTopikMatch: boolean;
}

export function extractBranchMetrics(
  targetBranch: string | string[] = 'Semua',
  targetKepwil: string | string[] = 'Semua',
  cities: CityData[] = []
): BranchPerformanceMetrics {
  const branchList = parseFilterValueList(targetBranch);
  const kepwilList = parseFilterValueList(targetKepwil);

  const branchName = branchList.length > 0 ? branchList.join(', ') : 'Seluruh Kantor Cabang';
  const kepwilName = kepwilList.length > 0 ? kepwilList.join(', ') : 'Seluruh Wilayah';

  // Filter matching cities
  let filtered = cities;
  if (branchList.length > 0) {
    filtered = cities.filter(c => 
      isKantorCabangMatching(c.kantorCabang, targetBranch) ||
      isKantorCabangMatching(c.name, targetBranch)
    );
    if (filtered.length === 0) {
      filtered = cities.filter(c => isKantorCabangMatching(c.name, targetBranch));
    }
  } else if (kepwilList.length > 0) {
    filtered = cities.filter(c => isKepwilMatching(c.kepwil, targetKepwil));
  }

  if (filtered.length === 0) {
    filtered = cities;
  }

  // Use synchronized Topik Masalah & Pokok Masalah aggregation from Google Sheet data
  const refSummary = aggregateByKategoriAndPokok(filtered, parseNumericValue);

  let totalInformasi = refSummary.byKategori.Informasi;
  let totalPermintaan = refSummary.byKategori.Permintaan;
  let totalPengaduan = refSummary.byKategori.Pengaduan;
  let administrasi = refSummary.byPokokMasalah.Administrasi;
  let iuran = refSummary.byPokokMasalah.Iuran;
  let pelayananKesehatan = refSummary.byPokokMasalah['Pelayanan Kesehatan'];

  let totalSla = 0;
  let totalSlaDays = 0;

  if (filtered.length > 0) {
    filtered.forEach(c => {
      totalSla += (c.slaCompliance || 0);
      totalSlaDays += (c.avgSlaDays || 2.0);
    });
  } else {
    totalInformasi = 245;
    totalPermintaan = 180;
    totalPengaduan = 95;
    totalSla = 92;
    totalSlaDays = 2.1;
    administrasi = 230;
    iuran = 170;
    pelayananKesehatan = 120;
  }

  const count = filtered.length || 1;
  const totalLayanan = totalInformasi + totalPermintaan + totalPengaduan;
  const slaCompliance = Math.round(totalSla / count);
  const avgSlaDays = Number((totalSlaDays / count).toFixed(1));

  // Determine dominant Pokok Masalah
  let dominantPokokMasalah: 'administrasi' | 'iuran' | 'pelayananKesehatan' = 'administrasi';
  if (iuran >= administrasi && iuran >= pelayananKesehatan) {
    dominantPokokMasalah = 'iuran';
  } else if (pelayananKesehatan >= administrasi && pelayananKesehatan >= iuran) {
    dominantPokokMasalah = 'pelayananKesehatan';
  }

  // Determine dominant Category
  let dominantCategory: 'informasi' | 'permintaan' | 'pengaduan' = 'informasi';
  if (totalPermintaan >= totalInformasi && totalPermintaan >= totalPengaduan) {
    dominantCategory = 'permintaan';
  } else if (totalPengaduan >= totalInformasi && totalPengaduan >= totalPermintaan) {
    dominantCategory = 'pengaduan';
  }

  // Build top Topik Masalah list from Google Sheet reference
  const nonZeroTopik = refSummary.topikList.filter(t => t.count > 0);
  const topTopikList: AggregatedTopikItem[] =
    nonZeroTopik.length > 0
      ? nonZeroTopik.slice(0, 15)
      : TOPIK_MASALAH_REFERENCE.slice(0, 10).map((item, idx) => ({
          ...item,
          count: Math.max(5, Math.round((totalLayanan || 100) / (idx + 4))),
          percentageOfTotal: Number((100 / (idx + 4)).toFixed(1)),
          percentageOfCategory: Number((100 / (idx + 2)).toFixed(1)),
        }));

  const top1 = topTopikList[0] || {
    topikMasalah: 'Perubahan Data Peserta',
    pokokMasalah: 'Administrasi',
    jenisKategori: 'Permintaan',
    count: administrasi || 50,
  };

  return {
    branchName,
    kepwilName,
    totalLayanan,
    informasi: totalInformasi,
    permintaan: totalPermintaan,
    pengaduan: totalPengaduan,
    slaCompliance,
    avgSlaDays,
    administrasi,
    iuran,
    pelayananKesehatan,
    dominantPokokMasalah,
    dominantCategory,
    topTopikList,
    dominantTopikMasalah: top1.topikMasalah,
    dominantTopikPokok: top1.pokokMasalah,
    dominantTopikKategori: top1.jenisKategori,
    dominantTopikCount: top1.count,
    isDirectTopikMatch: refSummary.isDirectTopikMatch,
  };
}

export function generateFallbackRecommendations(
  targetBranch: string | string[] = 'Semua',
  targetKepwil: string | string[] = 'Semua',
  cities: CityData[] = [],
  selectedTopikFilter: string = 'Semua'
): SmsRecommendationResponse {
  const m = extractBranchMetrics(targetBranch, targetKepwil, cities);

  const healthStatus: 'Optimal' | 'Perlu Perhatian' | 'Kritis' = 
    m.slaCompliance >= 92 ? 'Optimal' : m.slaCompliance >= 82 ? 'Perlu Perhatian' : 'Kritis';
  
  const overallScore = Math.min(100, Math.max(50, Math.round(m.slaCompliance * 0.9 + (m.avgSlaDays <= 2 ? 8 : 4))));

  // Select reference topics from Google Sheet data (filtered by selectedTopikFilter if active)
  const candidateTopics =
    selectedTopikFilter && selectedTopikFilter !== 'Semua'
      ? m.topTopikList.filter(
          t =>
            t.topikMasalah.toLowerCase() === selectedTopikFilter.toLowerCase() ||
            t.pokokMasalah.toLowerCase() === selectedTopikFilter.toLowerCase() ||
            t.jenisKategori.toLowerCase() === selectedTopikFilter.toLowerCase()
        )
      : m.topTopikList;

  const activeTopics = candidateTopics.length > 0 ? candidateTopics : m.topTopikList;
  const pickTopic = (idx: number): AggregatedTopikItem => {
    if (activeTopics.length === 0) {
      return {
        id: `fallback-${idx}`,
        topikMasalah: 'Perubahan Data Peserta',
        pokokMasalah: 'Administrasi',
        jenisKategori: 'Permintaan',
        count: m.administrasi || 25,
        percentageOfTotal: 25,
        percentageOfCategory: 40,
      };
    }
    return activeTopics[idx % activeTopics.length];
  };

  const t1 = pickTopic(0);
  const t2 = pickTopic(1);
  const t3 = pickTopic(2);
  const t4 = pickTopic(3);
  const t5 = pickTopic(4);
  const t6 = pickTopic(5);
  const t7 = pickTopic(6);
  const t8 = pickTopic(7);
  const t9 = pickTopic(8);

  const pokokMasalahText = 
    m.dominantPokokMasalah === 'iuran' 
      ? `Iuran (${m.iuran.toLocaleString('id-ID')} tiket)`
      : m.dominantPokokMasalah === 'pelayananKesehatan'
      ? `Pelayanan Kesehatan (${m.pelayananKesehatan.toLocaleString('id-ID')} tiket)`
      : `Administrasi (${m.administrasi.toLocaleString('id-ID')} tiket)`;

  const recommendations: StrategicRecommendationItem[] = [
    // --- JANGKA PENDEK (1 - 3 BULAN) ---
    {
      id: `rec-p1-${m.branchName}-${t1.id}`,
      title: `Langkah 1 (SDM): Satgas Respon Cepat Topik "${t1.topikMasalah}"`,
      description: `Berdasarkan sinkronisasi Google Sheet di ${m.branchName}, topik masalah "${t1.topikMasalah}" (${t1.jenisKategori} - ${t1.pokokMasalah}) mendominasi dengan ${t1.count.toLocaleString('id-ID')} tiket (${t1.percentageOfTotal}% dari total ${m.totalLayanan.toLocaleString('id-ID')} layanan). Diperlukan penugasan tim khusus frontline untuk memangkas durasi SLA dari ${m.avgSlaDays} hari.`,
      aspect: 'people',
      aspectLabel: 'People',
      timeframe: 'pendek',
      timeframeLabel: 'Jangka Pendek (1-3 Bulan)',
      impactLevel: 'Kritis',
      targetBranch: m.branchName,
      topikMasalah: t1.topikMasalah,
      pokokMasalah: t1.pokokMasalah,
      jenisKategori: t1.jenisKategori,
      topikCount: t1.count,
      kpiTarget: `Penyelesaian ${t1.count.toLocaleString('id-ID')} Tiket "${t1.topikMasalah}" < 1.5 Hari`,
      actionSteps: [
        `Briefing Pagi (07:45 WIB): Tetapkan target harian penguraian antrean topik "${t1.topikMasalah}" (${t1.count.toLocaleString('id-ID')} tiket pada kategori ${t1.jenisKategori}).`,
        `Rotasi Jam Sibuk (10:00 - 14:00): Tugaskan 2 petugas verifikator khusus menangani pokok masalah ${t1.pokokMasalah} agar tidak terjadi penumpukan.`,
        `Tunjuk 1 PIC eskalasi langsung untuk menyelesaikan kendala teknis pada topik "${t1.topikMasalah}" di hari yang sama (One-Day Service).`
      ]
    },
    {
      id: `rec-pr1-${m.branchName}-${t2.id}`,
      title: `Langkah 2 (Proses): SOP Fast-Track Penanganan "${t2.topikMasalah}"`,
      description: `Menyederhanakan alur verifikasi dan tindak lanjut pada topik "${t2.topikMasalah}" (Kategori ${t2.jenisKategori} - Pokok Masalah ${t2.pokokMasalah}) yang tercatat sebanyak ${t2.count.toLocaleString('id-ID')} tiket (${t2.percentageOfTotal}%) pada data Google Sheet ${m.branchName}.`,
      aspect: 'proses',
      aspectLabel: 'Proses',
      timeframe: 'pendek',
      timeframeLabel: 'Jangka Pendek (1-3 Bulan)',
      impactLevel: 'Tinggi',
      targetBranch: m.branchName,
      topikMasalah: t2.topikMasalah,
      pokokMasalah: t2.pokokMasalah,
      jenisKategori: t2.jenisKategori,
      topikCount: t2.count,
      kpiTarget: `SLA Compliance Topik "${t2.topikMasalah}" Naik dari ${m.slaCompliance}% ke > ${Math.min(99, m.slaCompliance + 6)}%`,
      actionSteps: [
        `Terapkan jalur cepat (Fast-Track < 24 jam) khusus untuk ${t2.count.toLocaleString('id-ID')} laporan bertopik "${t2.topikMasalah}".`,
        `Pangkas tahapan validasi berulang pada kategori ${t2.jenisKategori} (${t2.pokokMasalah}) menggunakan daftar periksa (checklist) baku.`,
        `Lakukan evaluasi harian pukul 16:30 WIB terhadap tiket "${t2.topikMasalah}" dan "${t1.topikMasalah}" yang mendekati batas SLA.`
      ]
    },
    {
      id: `rec-t1-${m.branchName}-${t3.id}`,
      title: `Langkah 3 (Tools): Kanal Panduan Mandiri & Auto-Reply Topik "${t3.topikMasalah}"`,
      description: `Mengurangi beban antrean loket untuk topik "${t3.topikMasalah}" (${t3.jenisKategori} - ${t3.pokokMasalah} sebanyak ${t3.count.toLocaleString('id-ID')} tiket) melalui penyediaan panduan mandiri QR Code dan notifikasi status otomatis di ${m.branchName}.`,
      aspect: 'tools',
      aspectLabel: 'Tools',
      timeframe: 'pendek',
      timeframeLabel: 'Jangka Pendek (1-3 Bulan)',
      impactLevel: 'Tinggi',
      targetBranch: m.branchName,
      topikMasalah: t3.topikMasalah,
      pokokMasalah: t3.pokokMasalah,
      jenisKategori: t3.jenisKategori,
      topikCount: t3.count,
      kpiTarget: `Reduksi Tiket Berulang "${t3.topikMasalah}" (${t3.count.toLocaleString('id-ID')} Tiket) Sebesar 35%`,
      actionSteps: [
        `Pasang Standing Banner QR Code berisi panduan syarat & solusi cepat topik "${t3.topikMasalah}" di ruang tunggu ${m.branchName}.`,
        `Aktifkan template respon cepat WhatsApp/PANDAWAsa untuk menjawab pertanyaan dan permintaan terkait "${t3.topikMasalah}".`,
        `Sediakan Kios Cek Mandiri di area depan untuk verifikasi awal pokok masalah ${t3.pokokMasalah}.`
      ]
    },

    // --- JANGKA MENENGAH (3 - 6 BULAN) ---
    {
      id: `rec-p2-${m.branchName}-${t4.id}`,
      title: `Langkah 4 (SDM): Upskilling & Sertifikasi Petugas pada Topik "${t4.topikMasalah}"`,
      description: `Meningkatkan akurasi penyelesaian petugas ${m.branchName} dalam menangani topik masalah "${t4.topikMasalah}" (${t4.pokokMasalah} - ${t4.jenisKategori}, ${t4.count.toLocaleString('id-ID')} tiket) serta kasus "${t5.topikMasalah}" (${t5.count.toLocaleString('id-ID')} tiket).`,
      aspect: 'people',
      aspectLabel: 'People',
      timeframe: 'menengah',
      timeframeLabel: 'Jangka Menengah (3-6 Bulan)',
      impactLevel: 'Sedang',
      targetBranch: m.branchName,
      topikMasalah: t4.topikMasalah,
      pokokMasalah: t4.pokokMasalah,
      jenisKategori: t4.jenisKategori,
      topikCount: t4.count,
      kpiTarget: `Zero Error & Kepuasan Layanan Topik "${t4.topikMasalah}" > 94%`,
      actionSteps: [
        `Gelar Workshop Bedah Kasus 2x sebulan yang berfokus pada penyelesaian tuntas topik "${t4.topikMasalah}" (${t4.count.toLocaleString('id-ID')} tiket).`,
        `Latih petugas frontline & back-office dalam komunikasi empatik untuk menekan eskalasi pada kategori ${t4.jenisKategori}.`,
        `Terapkan uji kompetensi bulanan terkait regulasi terbaru pokok masalah ${t4.pokokMasalah}.`
      ]
    },
    {
      id: `rec-pr2-${m.branchName}-${t5.id}`,
      title: `Langkah 5 (Proses): Integrasi Lintas Bidang untuk Topik "${t5.topikMasalah}"`,
      description: `Menghilangkan hambatan koordinasi antar-unit dalam memproses topik "${t5.topikMasalah}" (${t5.jenisKategori} - ${t5.pokokMasalah}, ${t5.count.toLocaleString('id-ID')} tiket) di ${m.branchName} melalui SLA disposisi elektronik.`,
      aspect: 'proses',
      aspectLabel: 'Proses',
      timeframe: 'menengah',
      timeframeLabel: 'Jangka Menengah (3-6 Bulan)',
      impactLevel: 'Tinggi',
      targetBranch: m.branchName,
      topikMasalah: t5.topikMasalah,
      pokokMasalah: t5.pokokMasalah,
      jenisKategori: t5.jenisKategori,
      topikCount: t5.count,
      kpiTarget: `Pemangkasan Waktu Koordinasi Topik "${t5.topikMasalah}" Sebesar 40%`,
      actionSteps: [
        `Digitalisasi dokumen pendukung untuk ${t5.count.toLocaleString('id-ID')} tiket topik "${t5.topikMasalah}" agar dapat diakses lintas bidang secara real-time.`,
        `Tetapkan batas waktu respon antarbidang maksimal 2 jam untuk kasus pokok masalah ${t5.pokokMasalah}.`,
        `Lakukan audit mutu berkala setiap tanggal 15 terhadap penyelesaian topik "${t5.topikMasalah}" dan "${t4.topikMasalah}".`
      ]
    },
    {
      id: `rec-t2-${m.branchName}-${t6.id}`,
      title: `Langkah 6 (Tools): Early Warning System & Tracking Topik "${t6.topikMasalah}"`,
      description: `Membangun sistem peringatan dini pada dashboard Google Sheet Senada untuk memantau lonjakan tiket topik "${t6.topikMasalah}" (${t6.jenisKategori} - ${t6.pokokMasalah}, ${t6.count.toLocaleString('id-ID')} tiket) di ${m.branchName}.`,
      aspect: 'tools',
      aspectLabel: 'Tools',
      timeframe: 'menengah',
      timeframeLabel: 'Jangka Menengah (3-6 Bulan)',
      impactLevel: 'Sedang',
      targetBranch: m.branchName,
      topikMasalah: t6.topikMasalah,
      pokokMasalah: t6.pokokMasalah,
      jenisKategori: t6.jenisKategori,
      topikCount: t6.count,
      kpiTarget: `Deteksi Dini Anomaly Lonjakan Topik "${t6.topikMasalah}" < 15 Menit`,
      actionSteps: [
        `Konfigurasi indikator peringatan otomatis apabila volume topik "${t6.topikMasalah}" (${t6.count.toLocaleString('id-ID')} tiket) melampaui ambang batas harian.`,
        `Sinkronkan tabel referensi 147 Topik Masalah dengan laporan Google Sheet cabang setiap 15 menit.`,
        `Integrasikan dasbor pemantauan Faskes & kepesertaan untuk menekan berulangnya masalah "${t6.topikMasalah}".`
      ]
    },

    // --- JANGKA PANJANG (6 - 12+ BULAN) ---
    {
      id: `rec-p3-${m.branchName}-${t7.id}`,
      title: `Langkah 7 (SDM): Spesialisasi Tim Ahli & KPI Berbasis Topik "${t7.topikMasalah}"`,
      description: `Membangun budaya kerja berbasis analitik topik masalah di ${m.branchName}, dengan menjadikan penurunan kasus "${t7.topikMasalah}" (${t7.count.toLocaleString('id-ID')} tiket) dan "${t1.topikMasalah}" (${t1.count.toLocaleString('id-ID')} tiket) sebagai indikator kinerja utama staf.`,
      aspect: 'people',
      aspectLabel: 'People',
      timeframe: 'panjang',
      timeframeLabel: 'Jangka Panjang (6-12+ Bulan)',
      impactLevel: 'Sedang',
      targetBranch: m.branchName,
      topikMasalah: t7.topikMasalah,
      pokokMasalah: t7.pokokMasalah,
      jenisKategori: t7.jenisKategori,
      topikCount: t7.count,
      kpiTarget: `Konsistensi SLA > 97% pada Seluruh Topik ${t7.pokokMasalah}`,
      actionSteps: [
        `Tetapkan KPI individu petugas berdasarkan kecepatan dan ketuntasan penyelesaian topik "${t7.topikMasalah}" serta "${t1.topikMasalah}".`,
        `Berikan apresiasi bulanan bagi tim dengan rasio pengaduan berulang terendah pada pokok masalah ${t7.pokokMasalah}.`,
        `Lakukan berbagi praktik terbaik (knowledge sharing) antar-KC dalam satu KEPWIL terkait solusi permanen topik "${t7.topikMasalah}".`
      ]
    },
    {
      id: `rec-pr3-${m.branchName}-${t8.id}`,
      title: `Langkah 8 (Proses): Pencegahan Hulu (Preventive Action) Topik "${t8.topikMasalah}"`,
      description: `Transformasi proses dari reaktif menjadi preventif untuk mengeliminasi akar penyebab munculnya topik "${t8.topikMasalah}" (${t8.jenisKategori} - ${t8.pokokMasalah}, ${t8.count.toLocaleString('id-ID')} tiket) di wilayah kerja ${m.branchName}.`,
      aspect: 'proses',
      aspectLabel: 'Proses',
      timeframe: 'panjang',
      timeframeLabel: 'Jangka Panjang (6-12+ Bulan)',
      impactLevel: 'Kritis',
      targetBranch: m.branchName,
      topikMasalah: t8.topikMasalah,
      pokokMasalah: t8.pokokMasalah,
      jenisKategori: t8.jenisKategori,
      topikCount: t8.count,
      kpiTarget: `Penurunan Volume Tiket Hulu "${t8.topikMasalah}" Sebesar 50% YoY`,
      actionSteps: [
        `Gunakan tren historis Google Sheet untuk memprediksi dan mencegah lonjakan topik "${t8.topikMasalah}" sebelum periode puncak.`,
        `Perbaiki proses rekonsiliasi data otomatis di hulu bersama mitra/Faskes/Badan Usaha terkait pokok masalah ${t8.pokokMasalah}.`,
        `Standarkan audit kepatuhan preventif triwulanan sehingga peserta tidak perlu lagi mengajukan tiket "${t8.topikMasalah}".`
      ]
    },
    {
      id: `rec-t3-${m.branchName}-${t9.id}`,
      title: `Langkah 9 (Tools): Otomatisasi AI Senada untuk Penyelesaian Mandiri "${t9.topikMasalah}"`,
      description: `Mengimplementasikan asisten pintar berbasis pengetahuan 147 Topik Masalah yang mampu memproses langsung topik "${t9.topikMasalah}" (${t9.jenisKategori} - ${t9.pokokMasalah}, ${t9.count.toLocaleString('id-ID')} tiket) dan "${t1.topikMasalah}" (${t1.count.toLocaleString('id-ID')} tiket) secara end-to-end.`,
      aspect: 'tools',
      aspectLabel: 'Tools',
      timeframe: 'panjang',
      timeframeLabel: 'Jangka Panjang (6-12+ Bulan)',
      impactLevel: 'Kritis',
      targetBranch: m.branchName,
      topikMasalah: t9.topikMasalah,
      pokokMasalah: t9.pokokMasalah,
      jenisKategori: t9.jenisKategori,
      topikCount: t9.count,
      kpiTarget: `Otomatisasi Penyelesaian Mandiri Topik "${t9.topikMasalah}" & "${t1.topikMasalah}" > 85%`,
      actionSteps: [
        `Integrasikan basis pengetahuan 147 Topik Masalah BPJS Kesehatan ke sistem layanan mandiri digital di ${m.branchName}.`,
        `Aktifkan fitur verifikasi & penyelesaian otomatis tanpa antrean loket untuk topik "${t9.topikMasalah}" dan "${t1.topikMasalah}".`,
        `Evaluasi akurasi rekomendasi AI setiap bulan berdasarkan umpan balik data Google Sheet terbaru.`
      ]
    }
  ];

  const top3SummaryText = activeTopics
    .slice(0, 3)
    .map((t, i) => `#${i + 1} ${t.topikMasalah} (${t.count.toLocaleString('id-ID')} tiket - ${t.jenisKategori}/${t.pokokMasalah})`)
    .join(', ');

  return {
    summary: `Berdasarkan data sinkronisasi Google Sheet untuk ${m.branchName} (${m.totalLayanan.toLocaleString('id-ID')} total tiket, SLA Compliance: ${m.slaCompliance}%, Rerata SLA: ${m.avgSlaDays} hari), rekomendasi strategis AI difokuskan langsung pada Top Topik Masalah tertinggi: ${top3SummaryText}, dengan pokok masalah dominan ${pokokMasalahText}.`,
    kantorCabangTarget: m.branchName,
    kepwilTarget: m.kepwilName,
    overallScore,
    healthStatus,
    recommendations,
    generatedAt: new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }),
    isFallback: true,
  };
}

