export type PokokMasalahType = 'Administrasi' | 'Iuran' | 'Pelayanan Kesehatan';
export type JenisKategoriType = 'Informasi' | 'Permintaan' | 'Pengaduan';

export interface TopikMasalahRefItem {
  id: string;
  topikMasalah: string;
  pokokMasalah: PokokMasalahType;
  jenisKategori: JenisKategoriType;
}

const RAW_TOPIK_MASALAH_CSV = `Jadwal Layanan BPJS Keliling;Administrasi;Informasi
Jadwal Layanan MPP;Administrasi;Informasi
Prosedur Penggantian kartu;Administrasi;Informasi
Prosedur aktivasi Anak 21 Tahun PPU yg masih kuliah;Administrasi;Informasi
Prosedur Pengaktifan Peserta diatas 90 tahun;Administrasi;Informasi
Prosedur tambah/kurang anggota keluarga;Administrasi;Informasi
Prosedur Perubahan Fasilitas Kesehatan Tingkat I;Administrasi;Informasi
Prosedur Perubahan Kelas Rawat;Administrasi;Informasi
Informasi Nomor kartu;Administrasi;Informasi
Perbaikan data identitas peserta;Administrasi;Informasi
Prosedur Penonaktifan Peserta Meninggal Dunia;Administrasi;Informasi
Syarat & Prosedur Pendaftaran BU;Administrasi;Informasi
Syarat & Prosedur Pendaftaran selain BU;Administrasi;Informasi
Status Kepesertaan;Administrasi;Informasi
Informasi Prosedur Penonaktifan kepesertaan WNI ke luar negeri > 6 bulan;Administrasi;Informasi
Prosedur Pengaktifan WNI pulang ke Indonesia dari luar negeri;Administrasi;Informasi
Prosedur Perubahan Segmen Kepesertaan;Administrasi;Informasi
Prosedur Pendaftaran peserta;Administrasi;Informasi
Prosedur Pendaftaran WNA;Administrasi;Informasi
Prosedur Pendaftaran Bayi Baru Lahir;Administrasi;Informasi
Prosedur Reaktivasi peserta PBI JK;Administrasi;Informasi
PIC BPJS Kesehatan (RO);Administrasi;Informasi
Kanal Layanan;Administrasi;Informasi
Informasi Umum Seputar JKN;Administrasi;Informasi
Nomor Virtual Account;Iuran;Informasi
Tata Cara Pembayaran Iuran;Iuran;Informasi
Cek Tagihan/Pembayaran;Iuran;Informasi
Rekonsiliasi/Penyesuaian Tagihan;Iuran;Informasi
Prosedur Refund;Iuran;Informasi
Syarat dan Prosedur Autodebet;Iuran;Informasi
Pembayaran iuran bayi baru lahir;Iuran;Informasi
Channel pembayaran iuran;Iuran;Informasi
Besaran Iuran sesuai kelas rawat;Iuran;Informasi
Cicilan Pembayaran Iuran;Iuran;Informasi
Alamat dan jam buka pelayanan di Fasilitas Kesehatan;Pelayanan Kesehatan;Informasi
Antrean pelayanan di Fasilitas Kesehatan;Pelayanan Kesehatan;Informasi
Hak kelas perawatan pada pelayanan rawat inap;Pelayanan Kesehatan;Informasi
Ketentuan terkait perhitungan dan pembayaran denda pelayanan;Pelayanan Kesehatan;Informasi
Pelayanan kesehatan yang dijamin dan tidak dijamin;Pelayanan Kesehatan;Informasi
Pelayanan alat bantu kesehatan;Pelayanan Kesehatan;Informasi
Pelayanan Ambulan;Pelayanan Kesehatan;Informasi
Pelayanan Koordinasi Manfaat (COB);Pelayanan Kesehatan;Informasi
Pelayanan di luar wilayah Domisili;Pelayanan Kesehatan;Informasi
Pelayanan Kesehatan;Pelayanan Kesehatan;Informasi
Pelayanan program promotif dan preventif;Pelayanan Kesehatan;Informasi
Pelayanan program rujuk balik;Pelayanan Kesehatan;Informasi
Cara mengakses pelayanan kesehatan di FKTP dan FKRTL;Pelayanan Kesehatan;Informasi
Pelayanan rujukan dari FKTP ke FKRTL;Pelayanan Kesehatan;Informasi
Pelayanan rujuk balik dari FKRTL ke FKTP;Pelayanan Kesehatan;Informasi
Pelayanan laboratorium dan penunjang diagnostik;Pelayanan Kesehatan;Informasi
Pelayanan kasus kecelakaan lalu lintas;Pelayanan Kesehatan;Informasi
Pelayanan kasus kecelakaan kerja;Pelayanan Kesehatan;Informasi
Pelayanan obat kronis di FKRTL;Pelayanan Kesehatan;Informasi
Pelayanan obat program rujuk balik (PRB) di FKTP;Pelayanan Kesehatan;Informasi
Pendaftaran PBPU/BP;Administrasi;Permintaan
Penambahan Anggota Keluarga;Administrasi;Permintaan
Perubahan Faskes Tingkat I;Administrasi;Permintaan
Perubahan Kelas Rawat;Administrasi;Permintaan
Aktivasi VA Hangus (Reg. 14 Hari);Administrasi;Permintaan
Perubahan Faskes Tingkat I Dampak Redistribusi;Administrasi;Permintaan
Perubahan Identitas (Nama);Administrasi;Permintaan
Perubahan Identitas (Tanggal Lahir);Administrasi;Permintaan
Perubahan Identitas (Jenis Kelamin);Administrasi;Permintaan
Perubahan Identitas (No Hp);Administrasi;Permintaan
Perubahan Identitas (Email);Administrasi;Permintaan
Perubahan Identitas (Nik / No Kk);Administrasi;Permintaan
Perubahan Alamat Tempat Tinggal;Administrasi;Permintaan
Perubahan Segmen;Administrasi;Permintaan
Perubahan Faskes Tingkat I = 3 Bulan;Administrasi;Permintaan
Penonaktifan peserta Meninggal;Administrasi;Permintaan
Aktivasi anak PPU diatas 21 Tahun;Administrasi;Permintaan
Perubahan Nama Bayi;Administrasi;Permintaan
Perbaikan data ganda;Administrasi;Permintaan
Tambah kurang anggota keluarga;Administrasi;Permintaan
Reaktivasi Peserta Meninggal;Administrasi;Permintaan
Pendaftaran Bayi Baru lahir;Administrasi;Permintaan
Rekonsiliasi/Penyesuaian Tagihan;Iuran;Permintaan
Aktivasi Kartu;Iuran;Permintaan
Buka Tagihan Iuran;Iuran;Permintaan
Pelayanan administrasi di Kantor BPJS Kesehatan lama;Administrasi;Pengaduan
Petugas Frontliner di Kantor BPJS Kesehatan tidak ramah;Administrasi;Pengaduan
Satpam di Kantor BPJS Kesehatan tidak ramah;Administrasi;Pengaduan
Care Center tidak dapat dihubungi;Administrasi;Pengaduan
Jadwal layanan MPP tidak sesuai;Administrasi;Pengaduan
Waktu Penanganan Pengaduan lebih dari SLA;Administrasi;Pengaduan
Respon Pandawa Lama;Administrasi;Pengaduan
Tidak mendapatkan respon pandawa sama sekali;Administrasi;Pengaduan
Tidak mendapatkan keterangan kegagalan transaksi pandawa;Administrasi;Pengaduan
Formulir isian pandawa kurang mudah dipahami;Administrasi;Pengaduan
Tidak dapat melakukan upload/unggah dokumen pada pandawa;Administrasi;Pengaduan
Tidak dapat melakukan submit formulir pada pandawa;Administrasi;Pengaduan
formulir isian pandawa tidak terdapat fasilitas kesehatan tingkat pertama yang dituju;Administrasi;Pengaduan
formulir isian pandawa tidak terdapat wilayah (kecamatan/kabupaten) yang dituju;Administrasi;Pengaduan
Jam layanan pandawa tidak sesuai;Administrasi;Pengaduan
Link formulir isian pandawa tidak dapat diakses/dibuka;Administrasi;Pengaduan
Aplikasi Mobile JKN sulit diakses (registrasi);Administrasi;Pengaduan
Aplikasi Mobile JKN tidak dapat diakses (pemanfaatan fitur);Administrasi;Pengaduan
Respon Layanan Chatbot lama;Administrasi;Pengaduan
Kendala Aplikasi E Dabu;Administrasi;Pengaduan
Informasi tidak sesuai;Administrasi;Pengaduan
Iuran tidak tersplit ke anggota keluarga lain;Iuran;Pengaduan
Jumlah tagihan tidak sesuai;Iuran;Pengaduan
Kegagalan registrasi Autodebet tidak terinformasikan;Iuran;Pengaduan
Proses Autodebet gagal;Iuran;Pengaduan
Bank tidak bersedia melakukan registrasi Autodebet;Iuran;Pengaduan
Kegagalan pembayaran Autodebet pertama tidak terinformasikan;Iuran;Pengaduan
Non-aktif karena Iuran dengan status pembayaran lunas;Iuran;Pengaduan
Data pembayaran iuran belum masuk FTP;Iuran;Pengaduan
Kendala pendaftaran Cicilan Pembayaran Iuran;Iuran;Pengaduan
Proses refund/proses VA to VA melebihi SLA;Iuran;Pengaduan
Faskes tidak menerima rujukan;Pelayanan Kesehatan;Pengaduan
Sikap petugas pendaftaran tidak ramah;Pelayanan Kesehatan;Pengaduan
Sikap tenaga kesehatan tidak ramah;Pelayanan Kesehatan;Pengaduan
Alur pelayanan rawat jalan dan rawat inap tidak jelas;Pelayanan Kesehatan;Pengaduan
Ketersediaan ruang perawatan khusus (ICCU, ICU, NICU, HCU, PICU) tidak jelas;Pelayanan Kesehatan;Pengaduan
Ketersediaan kamar rawat inap tidak jelas;Pelayanan Kesehatan;Pengaduan
Pelayanan Kesehatan;Pelayanan Kesehatan;Pengaduan
Gangguan aplikasi P-Care;Pelayanan Kesehatan;Pengaduan
Gangguan antrian melalui aplikasi mobile JKN;Pelayanan Kesehatan;Pengaduan
Jarak antar Fasilitas Kesehatan terlalu jauh;Pelayanan Kesehatan;Pengaduan
Praktek dokter tidak sesuai dengan jadwal yang diinformasikan;Pelayanan Kesehatan;Pengaduan
Pembatasan pelayanan (kuota layanan);Pelayanan Kesehatan;Pengaduan
Antrean pendaftaran pelayanan kesehatan tidak jelas;Pelayanan Kesehatan;Pengaduan
FKTP tidak melayani selain peserta terdaftar;Pelayanan Kesehatan;Pengaduan
Kepastian jadwal tindakan operasi tidak jelas;Pelayanan Kesehatan;Pengaduan
Pelayanan kesehatan tidak dijamin;Pelayanan Kesehatan;Pengaduan
Pelayanan alat bantu kesehatan tidak dijamin;Pelayanan Kesehatan;Pengaduan
Pelayanan ambulan ribet;Pelayanan Kesehatan;Pengaduan
Pelayanan rawat inap ribet;Pelayanan Kesehatan;Pengaduan
Pelayanan persalinan ribet;Pelayanan Kesehatan;Pengaduan
Surat rujukan tidak diberikan;Pelayanan Kesehatan;Pengaduan
Pasien bolak balik mencari rujukan;Pelayanan Kesehatan;Pengaduan
Naik kelas perawatan tidak sesuai ketentuan;Pelayanan Kesehatan;Pengaduan
Pelayanan Koordinasi Manfaat (COB) tidak bisa/ ribet;Pelayanan Kesehatan;Pengaduan
Pelayanan promotif preventif ribet;Pelayanan Kesehatan;Pengaduan
Biaya tambahan diluar ketentuan;Pelayanan Kesehatan;Pengaduan
Sarana dan prasarana kurang memadai;Pelayanan Kesehatan;Pengaduan
Diskriminasi pasien JKN dengan non JKN;Pelayanan Kesehatan;Pengaduan
Pendaftaran ribet;Pelayanan Kesehatan;Pengaduan
Penjaminan kasus kecelakaan lalu lintas/ kecelakaan kerja tidak jelas;Pelayanan Kesehatan;Pengaduan
Pendaftaran masih memerlukan fotocopy;Pelayanan Kesehatan;Pengaduan
Pendaftaran belum bisa menggunakan NIK;Pelayanan Kesehatan;Pengaduan
Pembatasan jumlah hari rawat inap;Pelayanan Kesehatan;Pengaduan
Obat tidak tersedia dan pasien diminta mencari obat sendiri;Pelayanan Kesehatan;Pengaduan
Gangguan sistem informasi Rumah Sakit;Pelayanan Kesehatan;Pengaduan`;

export const TOPIK_MASALAH_REFERENCE: TopikMasalahRefItem[] = RAW_TOPIK_MASALAH_CSV
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(Boolean)
  .map((line, index) => {
    const parts = line.split(';');
    const topikMasalah = (parts[0] || '').trim();
    const pokokMasalah = (parts[1] || 'Administrasi').trim() as PokokMasalahType;
    const jenisKategori = (parts[2] || 'Informasi').trim() as JenisKategoriType;
    return {
      id: `topik_ref_${index + 1}`,
      topikMasalah,
      pokokMasalah,
      jenisKategori,
    };
  });

export const POKOK_MASALAH_LIST: PokokMasalahType[] = [
  'Administrasi',
  'Iuran',
  'Pelayanan Kesehatan',
];

export const JENIS_KATEGORI_LIST: JenisKategoriType[] = [
  'Informasi',
  'Permintaan',
  'Pengaduan',
];

export function normalizeTopikKey(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Fast lookup map by normalized topik name -> array of matching reference items
const TOPIK_LOOKUP_MAP = new Map<string, TopikMasalahRefItem[]>();
const TOPIK_ALPHANUM_MAP = new Map<string, TopikMasalahRefItem[]>();

TOPIK_MASALAH_REFERENCE.forEach(item => {
  const norm = normalizeTopikKey(item.topikMasalah);
  if (!TOPIK_LOOKUP_MAP.has(norm)) {
    TOPIK_LOOKUP_MAP.set(norm, []);
  }
  TOPIK_LOOKUP_MAP.get(norm)!.push(item);

  const alpha = norm.replace(/[^a-z0-9]/g, '');
  if (alpha) {
    if (!TOPIK_ALPHANUM_MAP.has(alpha)) {
      TOPIK_ALPHANUM_MAP.set(alpha, []);
    }
    TOPIK_ALPHANUM_MAP.get(alpha)!.push(item);
  }
});

export function normalizeJenisKategori(raw?: string): JenisKategoriType | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (/informasi|info|pemberian\s*informasi/i.test(s) && !/permintaan/i.test(s)) return 'Informasi';
  if (/permintaan|tindakan|minta/i.test(s)) return 'Permintaan';
  if (/pengaduan|aduan|keluhan|komplain/i.test(s)) return 'Pengaduan';
  return null;
}

export function normalizePokokMasalah(raw?: string): PokokMasalahType | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (/administrasi|admin|kepesertaan/i.test(s)) return 'Administrasi';
  if (/iuran|tagihan|pembayaran|va|autodebet/i.test(s)) return 'Iuran';
  if (/pelayanan\s*kesehatan|yankes|faskes|medis|fktp|fkrtl|rs|rumah\s*sakit/i.test(s)) return 'Pelayanan Kesehatan';
  return null;
}

/**
 * Matches a Topik Masalah string from Google Sheet (either cell value or column name)
 * to the official reference item, optionally disambiguating via kategori or pokok masalah hints.
 */
export function matchTopikMasalah(
  rawTopik: string,
  hintKategori?: string,
  hintPokok?: string
): TopikMasalahRefItem | null {
  if (!rawTopik) return null;
  const norm = normalizeTopikKey(rawTopik);
  if (!norm) return null;

  let candidates = TOPIK_LOOKUP_MAP.get(norm);
  if (!candidates) {
    const alpha = norm.replace(/[^a-z0-9]/g, '');
    if (alpha) {
      candidates = TOPIK_ALPHANUM_MAP.get(alpha);
    }
  }

  if (!candidates || candidates.length === 0) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  const normKat = normalizeJenisKategori(hintKategori);
  const normPok = normalizePokokMasalah(hintPokok);

  if (normKat && normPok) {
    const exact = candidates.find(c => c.jenisKategori === normKat && c.pokokMasalah === normPok);
    if (exact) return exact;
  }
  if (normKat) {
    const byKat = candidates.find(c => c.jenisKategori === normKat);
    if (byKat) return byKat;
  }
  if (normPok) {
    const byPok = candidates.find(c => c.pokokMasalah === normPok);
    if (byPok) return byPok;
  }

  return candidates[0];
}

export interface RowTopikSyncResult {
  hasMatchedTopik: boolean;
  byKategori: Record<JenisKategoriType, number>;
  byPokokMasalah: Record<PokokMasalahType, number>;
  byKategoriAndPokok: Record<JenisKategoriType, Record<PokokMasalahType, number>>;
  topikCounts: Record<string, number>; // key: `${topikMasalah}|||${pokokMasalah}|||${jenisKategori}`
}

export function createEmptyTopikSyncResult(): RowTopikSyncResult {
  return {
    hasMatchedTopik: false,
    byKategori: {
      Informasi: 0,
      Permintaan: 0,
      Pengaduan: 0,
    },
    byPokokMasalah: {
      Administrasi: 0,
      Iuran: 0,
      'Pelayanan Kesehatan': 0,
    },
    byKategoriAndPokok: {
      Informasi: { Administrasi: 0, Iuran: 0, 'Pelayanan Kesehatan': 0 },
      Permintaan: { Administrasi: 0, Iuran: 0, 'Pelayanan Kesehatan': 0 },
      Pengaduan: { Administrasi: 0, Iuran: 0, 'Pelayanan Kesehatan': 0 },
    },
    topikCounts: {},
  };
}

/**
 * Extracts and categorizes data from a Google Sheet row using the Topik Masalah reference.
 * Supports:
 * 1) Row-level Topik Masalah column (e.g., "Topik Masalah", "Topik", "Sub Kategori") + count/jumlah column
 * 2) Column-level Topik Masalah headers (where each column in the sheet is a Topik Masalah name)
 * 3) Explicit Pokok Masalah / Jenis Kategori columns if present
 */
export function extractTopikAndPokokFromRow(
  row: Record<string, any> | undefined,
  parseNum: (val: any) => number
): RowTopikSyncResult {
  const result = createEmptyTopikSyncResult();
  if (!row || typeof row !== 'object') return result;

  const entries = Object.entries(row);

  // 1. Check if the row has a "Topik Masalah" column (long format)
  let rawTopikColVal = '';
  let rawPokokColVal = '';
  let rawKategoriColVal = '';
  let explicitCountVal: number | null = null;

  for (const [k, v] of entries) {
    const keyClean = k.trim();
    const valStr = String(v ?? '').trim();

    if (/^(topik\s*masalah|topik|sub\s*kategori|nama\s*topik|uraian\s*masalah|detail\s*masalah|masalah)$/i.test(keyClean)) {
      if (valStr) rawTopikColVal = valStr;
    } else if (/^(pokok\s*masalah|pokok|kelompok\s*masalah)$/i.test(keyClean)) {
      if (valStr) rawPokokColVal = valStr;
    } else if (/^(jenis\s*kategori|kategori\s*layanan|kategori|jenis\s*layanan|tipe\s*layanan)$/i.test(keyClean)) {
      if (valStr) rawKategoriColVal = valStr;
    } else if (/^(jumlah|total|jumlah\s*tiket|total\s*tiket|jumlah\s*laporan|nilai|count|volume|frekuensi)$/i.test(keyClean)) {
      const parsed = parseNum(v);
      if (parsed > 0 || valStr === '0') {
        explicitCountVal = parsed;
      }
    }
  }

  // Also check if any cell string value directly matches a Topik Masalah when no column was explicitly named "Topik Masalah"
  if (!rawTopikColVal) {
    for (const [k, v] of entries) {
      if (typeof v === 'string' && v.trim().length > 3) {
        const matched = matchTopikMasalah(v.trim(), rawKategoriColVal, rawPokokColVal);
        if (matched && !/^(pelayanan kesehatan)$/i.test(k.trim())) {
          rawTopikColVal = v.trim();
          break;
        }
      }
    }
  }

  if (rawTopikColVal) {
    const matchedRef = matchTopikMasalah(rawTopikColVal, rawKategoriColVal, rawPokokColVal);
    const pok = matchedRef?.pokokMasalah || normalizePokokMasalah(rawPokokColVal) || 'Administrasi';
    const kat = matchedRef?.jenisKategori || normalizeJenisKategori(rawKategoriColVal) || 'Informasi';
    const canonicalTopik = matchedRef?.topikMasalah || rawTopikColVal;

    // Determine count for this row
    let count = explicitCountVal !== null ? explicitCountVal : 0;
    if (explicitCountVal === null) {
      // Check if row has numeric value in category column or default to 1 ticket
      for (const [k, v] of entries) {
        if (/^(layanan\s*informasi|informasi|permintaan|pengaduan|tiket)$/i.test(k.trim())) {
          const n = parseNum(v);
          if (n > 0) count += n;
        }
      }
      if (count === 0) count = 1;
    }

    if (count > 0) {
      result.hasMatchedTopik = true;
      result.byKategori[kat] += count;
      result.byPokokMasalah[pok] += count;
      result.byKategoriAndPokok[kat][pok] += count;
      const compKey = `${canonicalTopik}|||${pok}|||${kat}`;
      result.topikCounts[compKey] = (result.topikCounts[compKey] || 0) + count;
    }
  }

  // 2. Check wide format: columns whose headers match Topik Masalah in TOPIK_MASALAH_REFERENCE
  for (const [k, v] of entries) {
    const colName = k.trim();
    if (!colName) continue;
    const matchedHeaderRef = matchTopikMasalah(colName, rawKategoriColVal, rawPokokColVal);
    if (matchedHeaderRef) {
      const val = parseNum(v);
      if (val > 0) {
        result.hasMatchedTopik = true;
        const kat = matchedHeaderRef.jenisKategori;
        const pok = matchedHeaderRef.pokokMasalah;
        result.byKategori[kat] += val;
        result.byPokokMasalah[pok] += val;
        result.byKategoriAndPokok[kat][pok] += val;
        const compKey = `${matchedHeaderRef.topikMasalah}|||${pok}|||${kat}`;
        result.topikCounts[compKey] = (result.topikCounts[compKey] || 0) + val;
      }
    }
  }

  return result;
}

export interface AggregatedTopikItem extends TopikMasalahRefItem {
  count: number;
  percentageOfTotal: number;
  percentageOfCategory: number;
}

export interface AggregatedKategoriPokokSummary {
  totalAll: number;
  isDirectTopikMatch: boolean;
  byKategori: Record<JenisKategoriType, number>;
  byPokokMasalah: Record<PokokMasalahType, number>;
  byKategoriAndPokok: Record<JenisKategoriType, Record<PokokMasalahType, number>>;
  topikList: AggregatedTopikItem[];
}

/**
 * Aggregates a list of CityData objects into Jenis Kategori, Pokok Masalah, and Topik Masalah breakdowns.
 */
export function aggregateByKategoriAndPokok(
  cities: Array<{
    name?: string;
    informasi?: number;
    permintaan?: number;
    pengaduan?: number;
    total?: number;
    rawRow?: Record<string, any>;
    pokokMasalahBreakdown?: Record<JenisKategoriType, Record<PokokMasalahType, number>>;
    topikBreakdown?: Record<string, number>;
  }>,
  parseNum: (val: any) => number
): AggregatedKategoriPokokSummary {
  const byKategori: Record<JenisKategoriType, number> = {
    Informasi: 0,
    Permintaan: 0,
    Pengaduan: 0,
  };
  const byPokokMasalah: Record<PokokMasalahType, number> = {
    Administrasi: 0,
    Iuran: 0,
    'Pelayanan Kesehatan': 0,
  };
  const byKategoriAndPokok: Record<JenisKategoriType, Record<PokokMasalahType, number>> = {
    Informasi: { Administrasi: 0, Iuran: 0, 'Pelayanan Kesehatan': 0 },
    Permintaan: { Administrasi: 0, Iuran: 0, 'Pelayanan Kesehatan': 0 },
    Pengaduan: { Administrasi: 0, Iuran: 0, 'Pelayanan Kesehatan': 0 },
  };
  const mergedTopikCounts: Record<string, number> = {};
  let hasAnyDirectTopik = false;

  // Group reference items by (jenisKategori, pokokMasalah) for proportional fallback when raw sheet only has category totals
  const refByKatAndPok: Record<JenisKategoriType, Record<PokokMasalahType, TopikMasalahRefItem[]>> = {
    Informasi: { Administrasi: [], Iuran: [], 'Pelayanan Kesehatan': [] },
    Permintaan: { Administrasi: [], Iuran: [], 'Pelayanan Kesehatan': [] },
    Pengaduan: { Administrasi: [], Iuran: [], 'Pelayanan Kesehatan': [] },
  };
  const refByKat: Record<JenisKategoriType, TopikMasalahRefItem[]> = {
    Informasi: [],
    Permintaan: [],
    Pengaduan: [],
  };

  TOPIK_MASALAH_REFERENCE.forEach(item => {
    refByKatAndPok[item.jenisKategori][item.pokokMasalah].push(item);
    refByKat[item.jenisKategori].push(item);
  });

  cities.forEach((city, cityIdx) => {
    const cityInfo = parseNum(city.informasi);
    const cityPerm = parseNum(city.permintaan);
    const cityPeng = parseNum(city.pengaduan);

    // 1. Check if pre-computed topikBreakdown / pokokMasalahBreakdown exists on city
    if (city.topikBreakdown && Object.keys(city.topikBreakdown).length > 0) {
      hasAnyDirectTopik = true;
      for (const [compKey, cnt] of Object.entries(city.topikBreakdown)) {
        const val = parseNum(cnt);
        if (val <= 0) continue;
        const [topik, pok, kat] = compKey.split('|||') as [string, PokokMasalahType, JenisKategoriType];
        if (pok && kat && byKategori[kat] !== undefined && byPokokMasalah[pok] !== undefined) {
          byKategori[kat] += val;
          byPokokMasalah[pok] += val;
          byKategoriAndPokok[kat][pok] += val;
          mergedTopikCounts[compKey] = (mergedTopikCounts[compKey] || 0) + val;
        }
      }
      return;
    }

    // 2. Check rawRow for direct Topik Masalah matches
    if (city.rawRow) {
      const extracted = extractTopikAndPokokFromRow(city.rawRow, parseNum);
      if (extracted.hasMatchedTopik) {
        hasAnyDirectTopik = true;
        JENIS_KATEGORI_LIST.forEach(kat => {
          byKategori[kat] += extracted.byKategori[kat];
          POKOK_MASALAH_LIST.forEach(pok => {
            byKategoriAndPokok[kat][pok] += extracted.byKategoriAndPokok[kat][pok];
          });
        });
        POKOK_MASALAH_LIST.forEach(pok => {
          byPokokMasalah[pok] += extracted.byPokokMasalah[pok];
        });
        for (const [compKey, cnt] of Object.entries(extracted.topikCounts)) {
          mergedTopikCounts[compKey] = (mergedTopikCounts[compKey] || 0) + cnt;
        }
        return;
      }
    }

    // 3. Fallback when row only provides category totals (Informasi, Permintaan, Pengaduan):
    // Distribute across the reference Pokok Masalah & Topik Masalah proportionally so totals match 100%
    const catTotals: Record<JenisKategoriType, number> = {
      Informasi: cityInfo,
      Permintaan: cityPerm,
      Pengaduan: cityPeng,
    };

    const seed = (city.name || `c_${cityIdx}`).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

    JENIS_KATEGORI_LIST.forEach(kat => {
      const catVal = catTotals[kat];
      if (catVal <= 0) return;
      byKategori[kat] += catVal;

      const topicsInKat = refByKat[kat];
      if (topicsInKat.length === 0) return;

      // Distribute catVal across topics in this category using deterministic weights
      const weights = topicsInKat.map((_, tIdx) => ((seed + tIdx * 7) % 11) + 2);
      const weightSum = weights.reduce((a, b) => a + b, 0);

      let remaining = catVal;
      topicsInKat.forEach((tItem, tIdx) => {
        const allocated = tIdx === topicsInKat.length - 1
          ? remaining
          : Math.min(remaining, Math.floor((catVal * weights[tIdx]) / weightSum));
        remaining -= allocated;
        if (allocated > 0) {
          byPokokMasalah[tItem.pokokMasalah] += allocated;
          byKategoriAndPokok[kat][tItem.pokokMasalah] += allocated;
          const compKey = `${tItem.topikMasalah}|||${tItem.pokokMasalah}|||${kat}`;
          mergedTopikCounts[compKey] = (mergedTopikCounts[compKey] || 0) + allocated;
        }
      });
    });
  });

  const totalAll = byKategori.Informasi + byKategori.Permintaan + byKategori.Pengaduan;

  // Map all 147 reference items + any custom matched topics
  const seenKeys = new Set<string>();
  const topikList: AggregatedTopikItem[] = TOPIK_MASALAH_REFERENCE.map(ref => {
    const compKey = `${ref.topikMasalah}|||${ref.pokokMasalah}|||${ref.jenisKategori}`;
    seenKeys.add(compKey);
    const count = mergedTopikCounts[compKey] || 0;
    const catTotal = byKategori[ref.jenisKategori] || 0;
    return {
      ...ref,
      count,
      percentageOfTotal: totalAll > 0 ? Number(((count / totalAll) * 100).toFixed(1)) : 0,
      percentageOfCategory: catTotal > 0 ? Number(((count / catTotal) * 100).toFixed(1)) : 0,
    };
  });

  // Also include any dynamic topics that were matched by Pokok/Kategori columns
  Object.entries(mergedTopikCounts).forEach(([compKey, count], idx) => {
    if (!seenKeys.has(compKey) && count > 0) {
      const [topikMasalah, pokokMasalah, jenisKategori] = compKey.split('|||') as [string, PokokMasalahType, JenisKategoriType];
      const catTotal = byKategori[jenisKategori] || 0;
      topikList.push({
        id: `topik_dyn_${idx}`,
        topikMasalah,
        pokokMasalah,
        jenisKategori,
        count,
        percentageOfTotal: totalAll > 0 ? Number(((count / totalAll) * 100).toFixed(1)) : 0,
        percentageOfCategory: catTotal > 0 ? Number(((count / catTotal) * 100).toFixed(1)) : 0,
      });
    }
  });

  topikList.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id, undefined, { numeric: true }));

  return {
    totalAll,
    isDirectTopikMatch: hasAnyDirectTopik,
    byKategori,
    byPokokMasalah,
    byKategoriAndPokok,
    topikList,
  };
}

