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
  topPengaduanList: AggregatedTopikItem[];
  topInformasiList: AggregatedTopikItem[];
  dominantTopikMasalah: string;
  dominantTopikPokok: string;
  dominantTopikKategori: string;
  dominantTopikCount: number;
  dominantPengaduanTopik: string;
  dominantPengaduanPokok: string;
  dominantPengaduanCount: number;
  dominantInformasiTopik: string;
  dominantInformasiPokok: string;
  dominantInformasiCount: number;
  analisaPengaduanRingkas: string;
  aksiPengaduanRingkas: string[];
  analisaInformasiRingkas: string;
  aksiInformasiRingkas: string[];
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

  let totalInformasi = Math.round(Number(refSummary.byKategori.Informasi || 0));
  let totalPermintaan = Math.round(Number(refSummary.byKategori.Permintaan || 0));
  let totalPengaduan = Math.round(Number(refSummary.byKategori.Pengaduan || 0));
  let administrasi = Math.round(Number(refSummary.byPokokMasalah.Administrasi || 0));
  let iuran = Math.round(Number(refSummary.byPokokMasalah.Iuran || 0));
  let pelayananKesehatan = Math.round(Number(refSummary.byPokokMasalah['Pelayanan Kesehatan'] || 0));

  let totalSla = 0;
  let totalSlaDays = 0;

  if (filtered.length > 0) {
    filtered.forEach(c => {
      totalSla += Number(c.slaCompliance || 0);
      totalSlaDays += Number(c.avgSlaDays || 2.0);
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
  const slaCompliance = Number((totalSla / count).toFixed(2));
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
  if (totalPengaduan >= totalInformasi && totalPengaduan >= totalPermintaan) {
    dominantCategory = 'pengaduan';
  } else if (totalPermintaan >= totalInformasi && totalPermintaan >= totalPengaduan) {
    dominantCategory = 'permintaan';
  }

  // Build top Topik Masalah lists (Pengaduan, Informasi, and Overall)
  const nonZeroPengaduan = refSummary.topikList
    .filter(t => t.jenisKategori === 'Pengaduan' && t.count > 0)
    .sort((a, b) => b.count - a.count);

  const nonZeroInformasi = refSummary.topikList
    .filter(t => t.jenisKategori === 'Informasi' && t.count > 0)
    .sort((a, b) => b.count - a.count);

  const topPengaduanList: AggregatedTopikItem[] =
    nonZeroPengaduan.length > 0
      ? nonZeroPengaduan.slice(0, 10)
      : TOPIK_MASALAH_REFERENCE.filter(t => t.jenisKategori === 'Pengaduan')
          .slice(0, 6)
          .map((item, idx) => ({
            ...item,
            count: Math.max(5, Math.round((totalPengaduan || 60) / (idx + 2))),
            percentageOfTotal: Number((100 / (idx + 4)).toFixed(1)),
            percentageOfCategory: Number((100 / (idx + 2)).toFixed(1)),
          }));

  const topInformasiList: AggregatedTopikItem[] =
    nonZeroInformasi.length > 0
      ? nonZeroInformasi.slice(0, 10)
      : TOPIK_MASALAH_REFERENCE.filter(t => t.jenisKategori === 'Informasi')
          .slice(0, 6)
          .map((item, idx) => ({
            ...item,
            count: Math.max(8, Math.round((totalInformasi || 120) / (idx + 2))),
            percentageOfTotal: Number((100 / (idx + 3)).toFixed(1)),
            percentageOfCategory: Number((100 / (idx + 2)).toFixed(1)),
          }));

  // Combine Pengaduan & Informasi as primary focus for SMS analysis
  const combinedPengaduanInformasi = [...nonZeroPengaduan, ...nonZeroInformasi].sort((a, b) => b.count - a.count);
  const nonZeroAll = refSummary.topikList.filter(t => t.count > 0).sort((a, b) => b.count - a.count);

  const topTopikList: AggregatedTopikItem[] =
    combinedPengaduanInformasi.length > 0
      ? combinedPengaduanInformasi.slice(0, 15)
      : nonZeroAll.length > 0
      ? nonZeroAll.slice(0, 15)
      : [...topPengaduanList.slice(0, 5), ...topInformasiList.slice(0, 5)];

  const topPeng1 = topPengaduanList[0] || {
    topikMasalah: 'Keluhan Pelayanan Fasilitas Kesehatan',
    pokokMasalah: 'Pelayanan Kesehatan',
    jenisKategori: 'Pengaduan',
    count: totalPengaduan || 35,
  };

  const topInfo1 = topInformasiList[0] || {
    topikMasalah: 'Informasi Status Kepesertaan & Tagihan Iuran',
    pokokMasalah: 'Administrasi',
    jenisKategori: 'Informasi',
    count: totalInformasi || 85,
  };

  const top1 = topTopikList[0] || topPeng1;

  const peng2 = topPengaduanList[1] || topPeng1;
  const peng3 = topPengaduanList[2] || topPeng1;
  const info2 = topInformasiList[1] || topInfo1;
  const info3 = topInformasiList[2] || topInfo1;

  const analisaPengaduanRingkas = `Tercatat ${totalPengaduan.toLocaleString('id-ID')} tiket pengaduan di ${branchName}, didominasi topik "${topPeng1.topikMasalah}" (${topPeng1.count.toLocaleString('id-ID')} tiket, pokok masalah ${topPeng1.pokokMasalah}). Fokus utama: percepatan penyelesaian keluhan dan perbaikan mutu layanan di titik kontak peserta.`;

  const aksiPengaduanRingkas = [
    `Selesaikan tiket pengaduan "${topPeng1.topikMasalah}" maksimal < 24 jam melalui jalur eskalasi prioritas (Fast-Track SLA).`,
    `Lakukan koordinasi langsung dengan PIC Faskes/unit terkait pokok masalah ${topPeng1.pokokMasalah} untuk menyelesaikan kendala layanan di lapangan.`,
    `Standarisasi penanganan keluhan "${peng2.topikMasalah}" agar petugas frontline dapat memberikan solusi langsung di kontak pertama.`,
    `Aktifkan peringatan dini (early-warning SLA) pada antrean tiket "${peng3.topikMasalah}" sebelum melewati batas waktu layanan.`,
    `Lakukan konfirmasi penyelesaian ke peserta (closed-loop feedback) untuk memastikan keluhan tuntas dan meningkatkan kepuasan peserta.`,
    `Evaluasi mingguan akar masalah (root-cause) pengaduan berulang pada kategori ${topPeng1.pokokMasalah} bersama pimpinan unit.`,
    `Perkuat supervisi mutu layanan di loket dan kanal pengaduan untuk menjaga Kepatuhan SLA di atas 98,00%.`
  ];

  const analisaInformasiRingkas = `Tercatat ${totalInformasi.toLocaleString('id-ID')} tiket permintaan informasi di ${branchName}, tertinggi pada topik "${topInfo1.topikMasalah}" (${topInfo1.count.toLocaleString('id-ID')} tiket, pokok masalah ${topInfo1.pokokMasalah}). Fokus utama: edukasi proaktif dan penyediaan informasi yang mudah dipahami peserta.`;

  const aksiInformasiRingkas = [
    `Sediakan panduan ringkas (infografis/QR Code) topik "${topInfo1.topikMasalah}" di area ruang tunggu dan loket layanan.`,
    `Bekali petugas frontline dengan skrip jawaban standar 1-lembar yang ringkas, jelas, dan mudah dipahami peserta.`,
    `Kirimkan pesan edukasi proaktif (WhatsApp/kanal digital) terkait "${info2.topikMasalah}" untuk meningkatkan pemahaman peserta.`,
    `Perbarui daftar FAQ interaktif mengenai "${info3.topikMasalah}" (${info3.pokokMasalah}) agar peserta memperoleh informasi secara mandiri.`,
    `Pasang petunjuk alur prosedur layanan ${topInfo1.pokokMasalah} yang jelas di titik informasi untuk mengurangi kebingungan peserta.`,
    `Pastikan petugas melakukan konfirmasi pemahaman kepada peserta di akhir sesi pemberian informasi untuk menjamin kepuasan layanan.`,
    `Lakukan sosialisasi terarah kepada peserta dan badan usaha terkait ketentuan terbaru pada pokok masalah ${topInfo1.pokokMasalah}.`
  ];

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
    topPengaduanList,
    topInformasiList,
    dominantTopikMasalah: top1.topikMasalah,
    dominantTopikPokok: top1.pokokMasalah,
    dominantTopikKategori: top1.jenisKategori,
    dominantTopikCount: Math.round(Number(top1.count || 0)),
    dominantPengaduanTopik: topPeng1.topikMasalah,
    dominantPengaduanPokok: topPeng1.pokokMasalah,
    dominantPengaduanCount: Math.round(Number(topPeng1.count || 0)),
    dominantInformasiTopik: topInfo1.topikMasalah,
    dominantInformasiPokok: topInfo1.pokokMasalah,
    dominantInformasiCount: Math.round(Number(topInfo1.count || 0)),
    analisaPengaduanRingkas,
    aksiPengaduanRingkas,
    analisaInformasiRingkas,
    aksiInformasiRingkas,
    isDirectTopikMatch: refSummary.isDirectTopikMatch,
  };
}

export function generateFallbackRecommendations(
  targetBranch: string | string[] = 'Semua',
  targetKepwil: string | string[] = 'Semua',
  cities: CityData[] = [],
  selectedTopikFilter: string = 'Semua',
  kategoriFocus: 'Semua' | 'Pengaduan' | 'Informasi' = 'Semua'
): SmsRecommendationResponse {
  const m = extractBranchMetrics(targetBranch, targetKepwil, cities);

  const healthStatus: 'Optimal' | 'Perlu Perhatian' | 'Kritis' =
    m.slaCompliance >= 92 ? 'Optimal' : m.slaCompliance >= 82 ? 'Perlu Perhatian' : 'Kritis';

  const overallScore = Math.min(100, Math.max(50, Math.round(m.slaCompliance * 0.9 + (m.avgSlaDays <= 2 ? 8 : 4))));

  // Build alternating pool of Pengaduan (service quality & satisfaction) and Informasi (participant understanding & satisfaction)
  let basePool: AggregatedTopikItem[] = [];
  if (kategoriFocus === 'Pengaduan') {
    basePool = m.topPengaduanList.length > 0 ? m.topPengaduanList : m.topTopikList;
  } else if (kategoriFocus === 'Informasi') {
    basePool = m.topInformasiList.length > 0 ? m.topInformasiList : m.topTopikList;
  } else {
    const maxLen = Math.max(m.topPengaduanList.length, m.topInformasiList.length);
    for (let i = 0; i < maxLen; i++) {
      if (m.topPengaduanList[i]) basePool.push(m.topPengaduanList[i]);
      if (m.topInformasiList[i]) basePool.push(m.topInformasiList[i]);
    }
    if (basePool.length === 0) basePool = m.topTopikList;
  }

  const candidateTopics =
    selectedTopikFilter && selectedTopikFilter !== 'Semua'
      ? [...m.topPengaduanList, ...m.topInformasiList, ...m.topTopikList].filter(
          t =>
            t.topikMasalah.toLowerCase() === selectedTopikFilter.toLowerCase() ||
            t.pokokMasalah.toLowerCase() === selectedTopikFilter.toLowerCase() ||
            t.jenisKategori.toLowerCase() === selectedTopikFilter.toLowerCase()
        )
      : basePool;

  const activeTopics = candidateTopics.length > 0 ? candidateTopics : basePool;

  const pickPengaduanTopic = (idx: number): AggregatedTopikItem => {
    if (selectedTopikFilter !== 'Semua' && activeTopics.length > 0) {
      return activeTopics[idx % activeTopics.length];
    }
    if (kategoriFocus === 'Informasi' && m.topInformasiList.length > 0) {
      return m.topInformasiList[idx % m.topInformasiList.length];
    }
    if (m.topPengaduanList.length > 0) {
      return m.topPengaduanList[idx % m.topPengaduanList.length];
    }
    return activeTopics[idx % Math.max(1, activeTopics.length)];
  };

  const pickInformasiTopic = (idx: number): AggregatedTopikItem => {
    if (selectedTopikFilter !== 'Semua' && activeTopics.length > 0) {
      return activeTopics[idx % activeTopics.length];
    }
    if (kategoriFocus === 'Pengaduan' && m.topPengaduanList.length > 0) {
      return m.topPengaduanList[idx % m.topPengaduanList.length];
    }
    if (m.topInformasiList.length > 0) {
      return m.topInformasiList[idx % m.topInformasiList.length];
    }
    return activeTopics[idx % Math.max(1, activeTopics.length)];
  };

  const p1 = pickPengaduanTopic(0);
  const i1 = pickInformasiTopic(0);
  const p2 = pickPengaduanTopic(1);
  const i2 = pickInformasiTopic(1);
  const p3 = pickPengaduanTopic(2);
  const i3 = pickInformasiTopic(2);

  const kesimpulanPendek = `Fokus Jangka Pendek (1 - 3 Bulan) di ${m.branchName} adalah percepatan penyelesaian langsung pengaduan utama "${p1.topikMasalah}" (${p1.pokokMasalah}) di titik layanan serta penyediaan panduan informasi praktis untuk topik "${i1.topikMasalah}" dan "${i2.topikMasalah}" agar peserta langsung memahami prosedur tanpa kunjungan berulang.`;

  const aksiUtamaPendek: string[] = [
    `Menunjuk petugas PIC khusus (Fast-Track) untuk menyelesaikan pengaduan "${p1.topikMasalah}" pada hari yang sama.`,
    `Menyederhanakan alur penjelasan dan verifikasi layanan pada pokok masalah ${i1.pokokMasalah} di loket maupun kanal non-tatap muka.`,
    `Memasang QR Code panduan visual 1 halaman dan template informasi cepat untuk topik "${i1.topikMasalah}" serta "${i2.topikMasalah}".`,
    `Melakukan konfirmasi penyelesaian (closed-loop) kepada peserta setelah keluhan ditindaklanjuti untuk memastikan kepuasan peserta.`
  ];

  const kesimpulanMenengah = `Fokus Jangka Menengah (4 - 6 Bulan) di ${m.branchName} adalah standarisasi kompetensi petugas layanan, penguatan koordinasi lintas unit dan mitra Faskes untuk mencegah berulangnya keluhan "${p2.topikMasalah}" serta "${p3.topikMasalah}", dan perluasan edukasi digital terstruktur pada topik "${i3.topikMasalah}".`;

  const aksiUtamaMenengah: string[] = [
    `Melaksanakan pelatihan dan penyamaan standar jawaban petugas terkait penanganan kasus "${p2.topikMasalah}" (${p2.pokokMasalah}).`,
    `Menetapkan kesepakatan waktu respon cepat lintas bidang dan mitra Faskes untuk menuntaskan kendala "${p3.topikMasalah}".`,
    `Mengaktifkan pemantauan dini (early warning) antrean tiket dan konten edukasi interaktif untuk topik "${i3.topikMasalah}".`,
    `Melakukan evaluasi berkala bersama mitra layanan guna memperbaiki akar penyebab pengaduan dan meningkatkan mutu layanan.`
  ];

  const recommendations: StrategicRecommendationItem[] = [
    // --- 1. JANGKA PENDEK (1 - 3 BULAN) ---
    {
      id: `rec-p1-${m.branchName}-${p1.id}`,
      title: `Penanganan Prioritas & Respon Cepat Pengaduan "${p1.topikMasalah}"`,
      aspect: 'people',
      aspectLabel: 'People',
      timeframe: 'pendek',
      timeframeLabel: 'Jangka Pendek (1 - 3 Bulan)',
      impactLevel: 'Kritis',
      targetBranch: m.branchName,
      topikMasalah: p1.topikMasalah,
      pokokMasalah: p1.pokokMasalah,
      jenisKategori: p1.jenisKategori,
      topikCount: Math.round(p1.count),
      actionSteps: [
        `Tunjuk PIC khusus penanganan cepat tiket "${p1.topikMasalah}" agar diselesaikan pada hari yang sama.`,
        `Lakukan briefing pagi petugas frontline untuk memprioritaskan tindak lanjut keluhan pada pokok masalah ${p1.pokokMasalah}.`,
        `Hubungi peserta segera setelah pengaduan diselesaikan untuk memastikan solusi sudah diterima dengan jelas.`
      ]
    },
    {
      id: `rec-pr1-${m.branchName}-${i1.id}`,
      title: `Penyederhanaan Alur & Standar Penjelasan "${i1.topikMasalah}"`,
      aspect: 'proses',
      aspectLabel: 'Proses',
      timeframe: 'pendek',
      timeframeLabel: 'Jangka Pendek (1 - 3 Bulan)',
      impactLevel: 'Tinggi',
      targetBranch: m.branchName,
      topikMasalah: i1.topikMasalah,
      pokokMasalah: i1.pokokMasalah,
      jenisKategori: i1.jenisKategori,
      topikCount: Math.round(i1.count),
      actionSteps: [
        `Gunakan lembar panduan 1 halaman yang ringkas dan jelas saat menjelaskan topik "${i1.topikMasalah}" kepada peserta.`,
        `Pangkas alur verifikasi berulang pada layanan ${i1.pokokMasalah} agar waktu layanan lebih cepat.`,
        `Konfirmasi ulang pemahaman peserta di akhir sesi layanan agar tidak terjadi kebingungan atau kunjungan berulang.`
      ]
    },
    {
      id: `rec-t1-${m.branchName}-${i2.id}`,
      title: `Penyediaan Media Edukasi Mandiri & Informasi Cepat "${i2.topikMasalah}"`,
      aspect: 'tools',
      aspectLabel: 'Tools',
      timeframe: 'pendek',
      timeframeLabel: 'Jangka Pendek (1 - 3 Bulan)',
      impactLevel: 'Tinggi',
      targetBranch: m.branchName,
      topikMasalah: i2.topikMasalah,
      pokokMasalah: i2.pokokMasalah,
      jenisKategori: i2.jenisKategori,
      topikCount: Math.round(i2.count),
      actionSteps: [
        `Pasang QR Code dan infografis langkah praktis "${i2.topikMasalah}" di ruang tunggu layanan ${m.branchName}.`,
        `Sediakan template pesan digital berisi panduan ringkas persyaratan dan alur pokok masalah ${i2.pokokMasalah}.`,
        `Kirimkan informasi status tindak lanjut tiket secara proaktif agar peserta mendapatkan kepastian layanan.`
      ]
    },

    // --- 2. JANGKA MENENGAH (4 - 6 BULAN) ---
    {
      id: `rec-p2-${m.branchName}-${p2.id}`,
      title: `Penguatan Kompetensi Petugas dalam Penanganan "${p2.topikMasalah}"`,
      aspect: 'people',
      aspectLabel: 'People',
      timeframe: 'menengah',
      timeframeLabel: 'Jangka Menengah (4 - 6 Bulan)',
      impactLevel: 'Tinggi',
      targetBranch: m.branchName,
      topikMasalah: p2.topikMasalah,
      pokokMasalah: p2.pokokMasalah,
      jenisKategori: p2.jenisKategori,
      topikCount: Math.round(p2.count),
      actionSteps: [
        `Laksanakan pelatihan praktis komunikasi empatik dan solusi cepat untuk kasus "${p2.topikMasalah}".`,
        `Samakan standar jawaban antara petugas loket dan back-office terkait aturan ${p2.pokokMasalah} agar informasi konsisten.`,
        `Lakukan supervisi berkala terhadap kualitas penjelasan dan ketepatan solusi yang diberikan petugas kepada peserta.`
      ]
    },
    {
      id: `rec-pr2-${m.branchName}-${p3.id}`,
      title: `Penguatan Koordinasi Lintas Unit & Mitra Faskes pada "${p3.topikMasalah}"`,
      aspect: 'proses',
      aspectLabel: 'Proses',
      timeframe: 'menengah',
      timeframeLabel: 'Jangka Menengah (4 - 6 Bulan)',
      impactLevel: 'Tinggi',
      targetBranch: m.branchName,
      topikMasalah: p3.topikMasalah,
      pokokMasalah: p3.pokokMasalah,
      jenisKategori: p3.jenisKategori,
      topikCount: Math.round(p3.count),
      actionSteps: [
        `Tetapkan jalur koordinasi cepat antarbidang dan PIC mitra Faskes untuk penyelesaian tiket "${p3.topikMasalah}".`,
        `Adakan evaluasi rutin bulanan bersama mitra layanan untuk menghilangkan kendala berulang pada ${p3.pokokMasalah}.`,
        `Sosialisasikan setiap pembaruan prosedur layanan secara serentak kepada seluruh titik layanan peserta.`
      ]
    },
    {
      id: `rec-t2-${m.branchName}-${i3.id}`,
      title: `Optimalisasi Kanal Edukasi Digital & Pemantauan "${i3.topikMasalah}"`,
      aspect: 'tools',
      aspectLabel: 'Tools',
      timeframe: 'menengah',
      timeframeLabel: 'Jangka Menengah (4 - 6 Bulan)',
      impactLevel: 'Sedang',
      targetBranch: m.branchName,
      topikMasalah: i3.topikMasalah,
      pokokMasalah: i3.pokokMasalah,
      jenisKategori: i3.jenisKategori,
      topikCount: Math.round(i3.count),
      actionSteps: [
        `Aktifkan pengingat otomatis pada sistem pemantauan untuk mencegah keterlambatan tindak lanjut tiket "${i3.topikMasalah}".`,
        `Publikasikan konten edukasi visual dan tanya-jawab ringkas mengenai "${i3.topikMasalah}" melalui kanal informasi resmi.`,
        `Kumpulkan umpan balik pemahaman peserta seusai layanan sebagai dasar penyempurnaan materi informasi.`
      ]
    }
  ];

  return {
    summary: `${kesimpulanPendek} Selanjutnya, ${kesimpulanMenengah}`,
    kesimpulanPendek,
    aksiUtamaPendek,
    kesimpulanMenengah,
    aksiUtamaMenengah,
    kantorCabangTarget: m.branchName,
    kepwilTarget: m.kepwilName,
    overallScore,
    healthStatus,
    recommendations,
    generatedAt: new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }),
    isFallback: true,
  };
}
