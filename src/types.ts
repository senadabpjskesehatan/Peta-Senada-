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
  type: 'line' | 'bar' | 'pie' | 'area';
  source: 'default' | 'sheets';
  sheetUrl: string;
  sheetId: string;
  xAxisColumn: string;
  yAxisColumn: string;
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

export interface MapSyncConfig {
  sheetUrl: string;
  sheetId: string;
  cityColumn: string;
  informasiColumn: string;
  permintaanColumn: string;
  pengaduanColumn: string;
  slaColumn: string;
  isSynced: boolean;
  lastSyncedAt?: string;
  error?: string;
}
