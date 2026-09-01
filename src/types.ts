export type LayananType = 'Informasi' | 'Permintaan' | 'Pengaduan';

export type TicketStatus = 'Belum Diproses' | 'Sedang Diproses' | 'Selesai';

export type SlaStatus = 'On Time' | 'Warning' | 'Overdue';

export interface CityData {
  id: string;
  name: string;
  latitude: number; // For map visualization mapping
  longitude: number; // For map visualization mapping
  informasi: number;
  permintaan: number;
  pengaduan: number;
  total: number;
  avgSlaDays: number;
  slaCompliance: number; // e.g., 90 for 90%
  bulan?: string;
  kepwil?: string;
  kantorCabang?: string;
  rawRow?: Record<string, any>;
}

export interface Ticket {
  id: string;
  ticketNo: string;
  title: string;
  type: LayananType;
  city: string;
  date: string;
  slaDays: number;
  elapsedDays: number;
  status: TicketStatus;
  slaStatus: SlaStatus;
}

export interface DynamicChart {
  id: string;
  title: string;
  icon?: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  source: 'default' | 'sheets';
  sheetUrl: string;
  sheetId: string;
  xAxisColumn: string;
  xAxisColumns?: string[];
  yAxisColumn?: string;
  yAxisColumns?: string[];
  pieColumns?: string[];
  isSynced: boolean;
  lastSyncedAt?: string;
  syncedData?: any[];
  columns?: string[];
  error?: string;
}

export interface MonthlyPerformance {
  month: string;
  informasi: number;
  permintaan: number;
  pengaduan: number;
  slaOnTime: number;
  slaOverdue: number;
  satisfactionRate: number; // Percentage
}

export interface FilterReference {
  id: string;
  name: string;
  description?: string;
  columnName: string;
  isDynamic?: boolean;
  manualItems: string[];
  placements?: string[];
  showIndicator?: boolean;
  indicatorLabel?: string;
}

export interface MapSyncConfig {
  sheetUrl: string;
  sheetId: string;
  cityColumn: string; // KANTOR CABANG mapping
  bulanColumn?: string; // BULAN mapping
  kepwilColumn?: string; // KEPWIL mapping
  informasiColumn: string;
  permintaanColumn: string;
  pengaduanColumn: string;
  slaColumn: string;
  isSynced: boolean;
  lastSyncedAt?: string;
  error?: string;
}

export interface StrategicRecommendationItem {
  id: string;
  title: string;
  description: string;
  aspect: 'people' | 'proses' | 'tools';
  aspectLabel: 'People' | 'Proses' | 'Tools';
  timeframe: 'pendek' | 'menengah' | 'panjang';
  timeframeLabel: 'Jangka Pendek (1-3 Bulan)' | 'Jangka Menengah (3-6 Bulan)' | 'Jangka Panjang (6-12+ Bulan)';
  impactLevel: 'Tinggi' | 'Sedang' | 'Kritis';
  targetBranch?: string;
  kpiTarget?: string;
  actionSteps: string[];
}

export interface SmsRecommendationResponse {
  summary: string;
  kantorCabangTarget: string;
  kepwilTarget?: string;
  overallScore: number;
  healthStatus: 'Optimal' | 'Perlu Perhatian' | 'Kritis';
  recommendations: StrategicRecommendationItem[];
  generatedAt: string;
  isFallback?: boolean;
}
