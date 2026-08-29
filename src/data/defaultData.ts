import { CityData, Ticket, MonthlyPerformance, DynamicChart } from '../types';

export const DEFAULT_CITIES: CityData[] = [
  { id: '1', name: 'Jakarta', latitude: -6.2088, longitude: 106.8456, informasi: 245, permintaan: 180, pengaduan: 95, total: 520, avgSlaDays: 2.1, slaCompliance: 94 },
  { id: '2', name: 'Surabaya', latitude: -7.2575, longitude: 112.7521, informasi: 140, permintaan: 110, pengaduan: 55, total: 305, avgSlaDays: 2.5, slaCompliance: 91 },
  { id: '3', name: 'Bandung', latitude: -6.9175, longitude: 107.6191, informasi: 125, permintaan: 95, pengaduan: 40, total: 260, avgSlaDays: 1.9, slaCompliance: 96 },
  { id: '4', name: 'Medan', latitude: 3.5952, longitude: 98.6722, informasi: 98, permintaan: 75, pengaduan: 45, total: 218, avgSlaDays: 3.2, slaCompliance: 84 },
  { id: '5', name: 'Makassar', latitude: -5.1477, longitude: 119.4327, informasi: 85, permintaan: 65, pengaduan: 38, total: 188, avgSlaDays: 2.8, slaCompliance: 88 },
  { id: '6', name: 'Semarang', latitude: -6.9667, longitude: 110.4167, informasi: 78, permintaan: 60, pengaduan: 22, total: 160, avgSlaDays: 2.3, slaCompliance: 93 },
  { id: '7', name: 'Palembang', latitude: -2.9761, longitude: 104.7754, informasi: 65, permintaan: 50, pengaduan: 30, total: 145, avgSlaDays: 3.0, slaCompliance: 86 },
  { id: '8', name: 'Denpasar', latitude: -8.6705, longitude: 115.2126, informasi: 72, permintaan: 48, pengaduan: 15, total: 135, avgSlaDays: 1.8, slaCompliance: 97 },
  { id: '9', name: 'Balikpapan', latitude: -1.2654, longitude: 116.8312, informasi: 55, permintaan: 42, pengaduan: 18, total: 115, avgSlaDays: 2.4, slaCompliance: 92 },
  { id: '10', name: 'Yogyakarta', latitude: -7.7956, longitude: 110.3695, informasi: 80, permintaan: 58, pengaduan: 20, total: 158, avgSlaDays: 1.7, slaCompliance: 98 },
  { id: '11', name: 'Pontianak', latitude: -0.0263, longitude: 109.3425, informasi: 48, permintaan: 35, pengaduan: 16, total: 99, avgSlaDays: 2.7, slaCompliance: 89 },
  { id: '12', name: 'Jayapura', latitude: -2.5916, longitude: 140.7181, informasi: 30, permintaan: 25, pengaduan: 19, total: 74, avgSlaDays: 4.1, slaCompliance: 78 },
  { id: '13', name: 'Banda Aceh', latitude: 5.5483, longitude: 95.3238, informasi: 40, permintaan: 28, pengaduan: 12, total: 80, avgSlaDays: 2.9, slaCompliance: 87 },
  { id: '14', name: 'Ambon', latitude: -3.6547, longitude: 128.1906, informasi: 28, permintaan: 20, pengaduan: 10, total: 58, avgSlaDays: 3.5, slaCompliance: 82 },
  { id: '15', name: 'Kupang', latitude: -10.1772, longitude: 123.6077, informasi: 35, permintaan: 22, pengaduan: 15, total: 72, avgSlaDays: 3.3, slaCompliance: 81 }
];

export const DEFAULT_TICKETS: Ticket[] = [
  { id: 't1', ticketNo: 'TKT-2026-001', title: 'Permohonan Informasi Anggaran 2026', type: 'Informasi', city: 'Jakarta', date: '2026-08-25', slaDays: 3, elapsedDays: 1, status: 'Sedang Diproses', slaStatus: 'On Time' },
  { id: 't2', ticketNo: 'TKT-2026-002', title: 'Pengaduan Kerusakan Jalan Protokol', type: 'Pengaduan', city: 'Surabaya', date: '2026-08-22', slaDays: 5, elapsedDays: 6, status: 'Belum Diproses', slaStatus: 'Overdue' },
  { id: 't3', ticketNo: 'TKT-2026-003', title: 'Permintaan Fogging Nyamuk DBD', type: 'Permintaan', city: 'Bandung', date: '2026-08-24', slaDays: 4, elapsedDays: 2, status: 'Sedang Diproses', slaStatus: 'On Time' },
  { id: 't4', ticketNo: 'TKT-2026-004', title: 'Informasi Prosedur Perizinan Usaha', type: 'Informasi', city: 'Medan', date: '2026-08-20', slaDays: 3, elapsedDays: 3, status: 'Selesai', slaStatus: 'On Time' },
  { id: 't5', ticketNo: 'TKT-2026-005', title: 'Pengaduan Sampah Menumpuk di Pasar', type: 'Pengaduan', city: 'Makassar', date: '2026-08-21', slaDays: 5, elapsedDays: 5, status: 'Sedang Diproses', slaStatus: 'Warning' },
  { id: 't6', ticketNo: 'TKT-2026-006', title: 'Permintaan Penyediaan Tempat Sampah', type: 'Permintaan', city: 'Semarang', date: '2026-08-26', slaDays: 4, elapsedDays: 0, status: 'Belum Diproses', slaStatus: 'On Time' },
  { id: 't7', ticketNo: 'TKT-2026-007', title: 'Informasi Program Beasiswa Kota', type: 'Informasi', city: 'Yogyakarta', date: '2026-08-24', slaDays: 3, elapsedDays: 1, status: 'Selesai', slaStatus: 'On Time' },
  { id: 't8', ticketNo: 'TKT-2026-008', title: 'Pengaduan Lampu Jalan Padam', type: 'Pengaduan', city: 'Palembang', date: '2026-08-19', slaDays: 5, elapsedDays: 7, status: 'Sedang Diproses', slaStatus: 'Overdue' },
  { id: 't9', ticketNo: 'TKT-2026-009', title: 'Permintaan Air Bersih Tangki Darurat', type: 'Permintaan', city: 'Balikpapan', date: '2026-08-25', slaDays: 2, elapsedDays: 1, status: 'Sedang Diproses', slaStatus: 'On Time' },
  { id: 't10', ticketNo: 'TKT-2026-010', title: 'Pengaduan Kebisingan Tempat Hiburan', type: 'Pengaduan', city: 'Denpasar', date: '2026-08-24', slaDays: 5, elapsedDays: 1, status: 'Selesai', slaStatus: 'On Time' }
];

export const MONTHLY_PERFORMANCE: MonthlyPerformance[] = [
  { month: 'Jan', informasi: 420, permintaan: 310, pengaduan: 140, slaOnTime: 780, slaOverdue: 90, satisfactionRate: 88 },
  { month: 'Feb', informasi: 480, permintaan: 340, pengaduan: 160, slaOnTime: 850, slaOverdue: 130, satisfactionRate: 86 },
  { month: 'Mar', informasi: 510, permintaan: 390, pengaduan: 180, slaOnTime: 920, slaOverdue: 160, satisfactionRate: 85 },
  { month: 'Apr', informasi: 450, permintaan: 320, pengaduan: 150, slaOnTime: 830, slaOverdue: 90, satisfactionRate: 89 },
  { month: 'May', informasi: 530, permintaan: 410, pengaduan: 190, slaOnTime: 970, slaOverdue: 160, satisfactionRate: 87 },
  { month: 'Jun', informasi: 590, permintaan: 460, pengaduan: 220, slaOnTime: 1090, slaOverdue: 180, satisfactionRate: 86 },
  { month: 'Jul', informasi: 640, permintaan: 510, pengaduan: 240, slaOnTime: 1220, slaOverdue: 170, satisfactionRate: 90 },
  { month: 'Aug', informasi: 680, permintaan: 540, pengaduan: 250, slaOnTime: 1310, slaOverdue: 160, satisfactionRate: 92 }
];

export const DEFAULT_CHARTS: DynamicChart[] = [
  {
    id: 'chart_1',
    title: 'Tren Volume Bulanan Layanan Informasi',
    type: 'line',
    source: 'default',
    sheetUrl: '',
    sheetId: '',
    xAxisColumn: 'month',
    yAxisColumn: 'informasi',
    isSynced: false
  },
  {
    id: 'chart_2',
    title: 'Perbandingan Jenis Layanan (Bulan Terakhir)',
    type: 'pie',
    source: 'default',
    sheetUrl: '',
    sheetId: '',
    xAxisColumn: 'layanan',
    yAxisColumn: 'total',
    isSynced: false
  },
  {
    id: 'chart_3',
    title: 'Kepatuhan SLA Per Provinsi/Kota Utama',
    type: 'bar',
    source: 'default',
    sheetUrl: '',
    sheetId: '',
    xAxisColumn: 'name',
    yAxisColumn: 'slaCompliance',
    isSynced: false
  }
];

// Elegant template strings illustrating how Google Sheet structure should look like,
// allowing users to copy-paste them or use them to construct test spreadsheets.
export const SAMPLE_SHEETS_CSV = {
  map: `Kota,Layanan_Informasi,Layanan_Permintaan,Layanan_Pengaduan,Kepatuhan_SLA
Jakarta,310,210,120,95
Surabaya,190,140,80,92
Bandung,160,110,50,96
Medan,110,85,60,83
Makassar,95,75,45,86
Semarang,85,70,30,94
Yogyakarta,100,65,25,97
Denpasar,80,55,20,98
Jayapura,45,30,25,75`,
  
  trends: `Bulan,Informasi,Permintaan,Pengaduan,Kepuasan,SLA_OnTime,SLA_Terlambat
Jan,420,310,140,88,780,90
Feb,480,340,160,86,850,130
Mar,510,390,180,85,920,160
Apr,450,320,150,89,830,90
May,530,410,190,87,970,160
Jun,590,460,220,86,1090,180
Jul,640,510,240,90,1220,170
Aug,680,540,250,92,1310,160`
};

export const INDONESIAN_CITIES_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'jakarta': { lat: -6.2088, lon: 106.8456 },
  'surabaya': { lat: -7.2575, lon: 112.7521 },
  'bandung': { lat: -6.9175, lon: 107.6191 },
  'medan': { lat: 3.5952, lon: 98.6722 },
  'makassar': { lat: -5.1477, lon: 119.4327 },
  'semarang': { lat: -6.9667, lon: 110.4167 },
  'palembang': { lat: -2.9761, lon: 104.7754 },
  'denpasar': { lat: -8.6705, lon: 115.2126 },
  'balikpapan': { lat: -1.2654, lon: 116.8312 },
  'yogyakarta': { lat: -7.7956, lon: 110.3695 },
  'pontianak': { lat: -0.0263, lon: 109.3425 },
  'jayapura': { lat: -2.5916, lon: 140.7181 },
  'banda aceh': { lat: 5.5483, lon: 95.3238 },
  'aceh': { lat: 5.5483, lon: 95.3238 },
  'ambon': { lat: -3.6547, lon: 128.1906 },
  'kupang': { lat: -10.1772, lon: 123.6077 },
  'samarinda': { lat: -0.5021, lon: 117.1536 },
  'banjarmasin': { lat: -3.3166, lon: 114.5901 },
  'manado': { lat: 1.4748, lon: 124.8420 },
  'padang': { lat: -0.9471, lon: 100.4172 },
  'pekanbaru': { lat: 0.5071, lon: 101.4478 },
  'jambi': { lat: -1.6101, lon: 103.6131 },
  'bengkulu': { lat: -3.7928, lon: 102.2608 },
  'bandar lampung': { lat: -5.3971, lon: 105.2668 },
  'lampung': { lat: -5.3971, lon: 105.2668 },
  'serang': { lat: -6.1153, lon: 106.1542 },
  'mataram': { lat: -8.5822, lon: 116.1167 },
  'palu': { lat: -0.8917, lon: 119.8707 },
  'kendari': { lat: -3.9722, lon: 122.5149 },
  'gorontalo': { lat: 0.5435, lon: 123.0568 },
  'ternate': { lat: 0.7893, lon: 127.3756 },
  'sorong': { lat: -0.8765, lon: 131.2558 },
  'tarakan': { lat: 3.3267, lon: 117.5891 },
  'malang': { lat: -7.9650, lon: 112.6304 },
  'solo': { lat: -7.5755, lon: 110.8243 },
  'surakarta': { lat: -7.5755, lon: 110.8243 },
  'cirebon': { lat: -6.7320, lon: 108.5523 },
  'bogor': { lat: -6.5971, lon: 106.8060 },
  'bekasi': { lat: -6.2383, lon: 106.9756 },
  'tangerang': { lat: -6.1783, lon: 106.6300 },
  'depok': { lat: -6.4025, lon: 106.7942 },
  'tasikmalaya': { lat: -7.3274, lon: 108.2207 },
  'purwokerto': { lat: -7.4244, lon: 109.2301 },
  'tegal': { lat: -6.8694, lon: 109.1250 },
  'sukabumi': { lat: -6.9277, lon: 106.9300 },
  'kediri': { lat: -7.8167, lon: 112.0167 },
  'jember': { lat: -8.1844, lon: 113.6681 },
  'probolinggo': { lat: -7.7540, lon: 113.2159 },
  'banyuwangi': { lat: -8.2192, lon: 114.3691 },
  'madiun': { lat: -7.6298, lon: 111.5239 },
  'blitar': { lat: -8.0983, lon: 112.1681 },
  'pamekasan': { lat: -7.1598, lon: 113.4831 },
  'sumenep': { lat: -7.0091, lon: 113.8617 },
  'singkawang': { lat: 0.9080, lon: 108.9856 },
  'sintang': { lat: 0.0764, lon: 111.4994 },
  'ketapang': { lat: -1.8504, lon: 109.9725 },
  'sampit': { lat: -2.5350, lon: 112.9554 },
  'pangkalan bun': { lat: -2.6833, lon: 111.6167 },
  'bontang': { lat: 0.1333, lon: 117.5000 },
  'tanjung selor': { lat: 2.8333, lon: 117.3667 },
  'palopo': { lat: -2.9928, lon: 120.1947 },
  'parepare': { lat: -4.0131, lon: 119.6310 },
  'bau-bau': { lat: -5.4667, lon: 122.6000 },
  'baubau': { lat: -5.4667, lon: 122.6000 },
  'bima': { lat: -8.4552, lon: 118.7247 },
  'sumbawa besar': { lat: -8.4975, lon: 117.4244 },
  'maumere': { lat: -8.6231, lon: 122.2131 },
  'ende': { lat: -8.8433, lon: 121.6622 },
  'waingapu': { lat: -9.6547, lon: 120.2642 },
  'atambua': { lat: -9.1086, lon: 124.8911 },
  'meulaboh': { lat: 4.1436, lon: 96.1283 },
  'lhokseumawe': { lat: 5.1801, lon: 97.1507 },
  'langsa': { lat: 4.4714, lon: 97.9678 },
  'subulussalam': { lat: 2.6377, lon: 98.0051 },
  'sibolga': { lat: 1.7388, lon: 98.7892 },
  'pematangsiantar': { lat: 2.9610, lon: 99.0682 },
  'siantar': { lat: 2.9610, lon: 99.0682 },
  'binjai': { lat: 3.6139, lon: 98.4925 },
  'tebing tinggi': { lat: 3.3283, lon: 99.1625 },
  'padangsidimpuan': { lat: 1.3736, lon: 99.2683 },
  'gunungsitoli': { lat: 1.2901, lon: 97.6150 },
  'bukittinggi': { lat: -0.3055, lon: 100.3691 },
  'payakumbuh': { lat: -0.2201, lon: 100.6308 },
  'pariaman': { lat: -0.6272, lon: 100.1204 },
  'solok': { lat: -0.8033, lon: 100.6583 },
  'sawahlunto': { lat: -0.6692, lon: 100.7761 },
  'dumai': { lat: 1.6683, lon: 101.4428 },
  'sungai penuh': { lat: -2.0622, lon: 101.4000 },
  'lubuklinggau': { lat: -3.2952, lon: 102.8610 },
  'pagar alam': { lat: -4.0183, lon: 103.2661 },
  'prabumulih': { lat: -3.4283, lon: 104.2250 },
  'baturaja': { lat: -4.1300, lon: 104.1667 },
  'metro': { lat: -5.1139, lon: 105.3061 },
  'pangkal pinang': { lat: -2.1283, lon: 106.1161 },
  'pangkalpinang': { lat: -2.1283, lon: 106.1161 },
  'tanjung pandan': { lat: -2.7350, lon: 107.6367 },
  'batam': { lat: 1.1301, lon: 104.0528 },
  'tanjung pinang': { lat: 0.9153, lon: 104.4503 },
  'tanjungpinang': { lat: 0.9153, lon: 104.4503 },
};

export const findCityCoordinates = (rawName: string): { lat: number; lon: number } => {
  if (!rawName) return { lat: -6.2088, lon: 106.8456 };
  const rawLower = rawName.toLowerCase().trim();

  if (INDONESIAN_CITIES_COORDINATES[rawLower]) {
    return INDONESIAN_CITIES_COORDINATES[rawLower];
  }

  const clean = rawLower
    .replace(/^(kc[u|p]?|kantor\s+cabang|cabang|kota|kabupaten|kab\.|wilayah|daerah)\s+/i, '')
    .replace(/\s+(branch|cabang|selatan|utara|timur|barat|pusat|\d+)$/gi, '')
    .trim();

  if (clean && INDONESIAN_CITIES_COORDINATES[clean]) {
    return INDONESIAN_CITIES_COORDINATES[clean];
  }

  const dictKeys = Object.keys(INDONESIAN_CITIES_COORDINATES);
  for (const key of dictKeys) {
    if ((clean && (clean.includes(key) || key.includes(clean))) || rawLower.includes(key)) {
      return INDONESIAN_CITIES_COORDINATES[key];
    }
  }

  const defMatch = DEFAULT_CITIES.find(c => {
    const cn = c.name.toLowerCase();
    return (clean && (clean.includes(cn) || cn.includes(clean))) || rawLower.includes(cn);
  });

  if (defMatch) {
    return { lat: defMatch.latitude, lon: defMatch.longitude };
  }

  return { lat: -6.2088, lon: 106.8456 };
};
