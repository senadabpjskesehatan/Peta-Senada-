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
    title: 'Grafik Volume Tiket per Kantor Cabang',
    icon: 'BarChart2',
    type: 'bar',
    source: 'default',
    sheetUrl: '',
    sheetId: '',
    xAxisColumns: ['name'],
    xAxisColumn: 'name',
    yAxisColumns: ['informasi', 'permintaan', 'pengaduan'],
    isSynced: true
  },
  {
    id: 'chart_2',
    title: 'Grafik Kepatuhan SLA per Kantor Cabang (%)',
    icon: 'TrendingUp',
    type: 'line',
    source: 'default',
    sheetUrl: '',
    sheetId: '',
    xAxisColumns: ['name'],
    xAxisColumn: 'name',
    yAxisColumns: ['slaCompliance'],
    isSynced: true
  },
  {
    id: 'chart_3',
    title: 'Grafik Proporsi Jenis Layanan',
    icon: 'PieIcon',
    type: 'pie',
    source: 'default',
    sheetUrl: '',
    sheetId: '',
    xAxisColumns: ['informasi', 'permintaan', 'pengaduan'],
    xAxisColumn: 'informasi',
    yAxisColumns: ['informasi', 'permintaan', 'pengaduan'],
    pieColumns: ['informasi', 'permintaan', 'pengaduan'],
    isSynced: true
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

export { INDONESIAN_CITIES_COORDINATES, findCityCoordinates, getIslandForCity } from './indonesiaCoordinates';

