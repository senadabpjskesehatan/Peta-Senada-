import { UnitUtilizationSummary, UserActivityLog } from '../types';
import { REFERENCE_USERS } from './referenceUsers';

export interface MenuDefinition {
  id: string;
  name: string;
  shortName: string;
  category: string;
}

export const SYSTEM_MENUS: MenuDefinition[] = [
  { id: 'map', name: 'Peta Layanan SENADA', shortName: 'Peta', category: 'Monitoring' },
  { id: 'tickets', name: 'Antrean & Tracking SLA Laporan', shortName: 'SLA Tiket', category: 'Operasional' },
  { id: 'analytics', name: 'Tren Bulanan & Analitik Performa', shortName: 'Analitik', category: 'Analisis' },
  { id: 'sms', name: 'Super Mind Senada (AI Strategis)', shortName: 'SuperMind AI', category: 'Kecerdasan Buatan' },
  { id: 'reporting', name: 'Reporting Pivot Table Excel', shortName: 'Reporting', category: 'Laporan' },
  { id: 'custom-charts', name: 'Visualisasi Grafik Kustom Dinamis', shortName: 'Grafik', category: 'Visualisasi' },
  { id: 'referensi', name: 'Pengaturan Referensi Filter', shortName: 'Referensi', category: 'Konfigurasi' },
  { id: 'users', name: 'Manajemen User & Hak Akses', shortName: 'User', category: 'Keamanan' },
];

export const MENU_NAME_MAP: Record<string, string> = {
  'map': 'Peta Layanan SENADA',
  'tickets': 'Tracking SLA Tiket',
  'analytics': 'Tren Bulanan & Analitik',
  'sms': 'Super Mind Senada (AI)',
  'reporting': 'Reporting Pivot Table',
  'custom-charts': 'Visualisasi Grafik Kustom',
  'referensi': 'Referensi Filter',
  'users': 'Manajemen User',
};

// Seed baseline utilization data for Kedeputian Wilayah & Kantor Cabang
export function generateInitialUtilizationSummaries(): UnitUtilizationSummary[] {
  const summaries: UnitUtilizationSummary[] = [];

  // 0. Kantor Pusat
  summaries.push({
    unitId: 'user_kantor_pusat_1',
    username: 'PUSAT',
    displayName: 'KANTOR PUSAT BPJS KESEHATAN',
    role: 'kantor_pusat',
    officeName: 'KANTOR PUSAT BPJS KESEHATAN',
    loginCount: 45,
    menuUsageCount: 230,
    totalPemanfaatan: 275,
    menuBreakdown: { 'map': 95, 'sms': 80, 'custom-charts': 55, 'pemanfaatan': 40 },
    lastLoginAt: '2026-10-15T08:30:00.000Z',
    lastActiveAt: '2026-10-15T10:15:00.000Z',
  });

  // 1. Kedeputian Wilayah (1 s/d 14)
  const kepwilSeeds: Array<{ num: number; logins: number; menuUses: number; parentName: string }> = [
    { num: 4, logins: 52, menuUses: 268, parentName: 'KEDEPUTIAN WILAYAH IV (DKI Jakarta & Banten)' },
    { num: 5, logins: 47, menuUses: 245, parentName: 'KEDEPUTIAN WILAYAH V (Jawa Barat)' },
    { num: 7, logins: 44, menuUses: 231, parentName: 'KEDEPUTIAN WILAYAH VII (Jawa Timur)' },
    { num: 1, logins: 39, menuUses: 198, parentName: 'KEDEPUTIAN WILAYAH I (Sumatera Utara & DI Aceh)' },
    { num: 6, logins: 36, menuUses: 182, parentName: 'KEDEPUTIAN WILAYAH VI (Jawa Tengah & DIY)' },
    { num: 3, logins: 32, menuUses: 164, parentName: 'KEDEPUTIAN WILAYAH III (Sumsel, Babel & Bengkulu)' },
    { num: 2, logins: 29, menuUses: 147, parentName: 'KEDEPUTIAN WILAYAH II (Riau, Kepri, Sumbar & Jambi)' },
    { num: 8, logins: 28, menuUses: 139, parentName: 'KEDEPUTIAN WILAYAH VIII (Kalimantan)' },
    { num: 11, logins: 26, menuUses: 132, parentName: 'KEDEPUTIAN WILAYAH XI (Bali, NTB & NTT)' },
    { num: 12, logins: 25, menuUses: 126, parentName: 'KEDEPUTIAN WILAYAH XII (Sulawesi Selatan, Barat & Tenggara)' },
    { num: 9, logins: 22, menuUses: 114, parentName: 'KEDEPUTIAN WILAYAH IX (Sulawesi Utara, Tengah & Gorontalo)' },
    { num: 10, logins: 20, menuUses: 105, parentName: 'KEDEPUTIAN WILAYAH X (Maluku & Maluku Utara)' },
    { num: 13, logins: 18, menuUses: 94, parentName: 'KEDEPUTIAN WILAYAH XIII (Papua & Papua Barat)' },
    { num: 14, logins: 16, menuUses: 88, parentName: 'KEDEPUTIAN WILAYAH XIV (Papua Selatan & Pegunungan)' },
  ];

  for (const item of kepwilSeeds) {
    const unitId = `user_kepwil_${item.num}`;
    const username = `KEPWIL ${item.num}`;
    summaries.push({
      unitId,
      username,
      displayName: item.parentName,
      role: 'kepwil',
      officeName: item.parentName,
      loginCount: 0,
      menuUsageCount: 0,
      totalPemanfaatan: 0,
      menuBreakdown: {},
      lastLoginAt: '',
      lastActiveAt: '',
    });
  }

  // 2. Kantor Cabang (Sample KC units with active usage)
  const kcSeeds: Array<{
    code: string;
    name: string;
    kepwilNum: number;
  }> = [
    { code: '401', name: 'KC JAKARTA PUSAT', kepwilNum: 4 },
    { code: '701', name: 'KC SURABAYA', kepwilNum: 7 },
    { code: '501', name: 'KC BANDUNG', kepwilNum: 5 },
    { code: '101', name: 'KC BANDA ACEH', kepwilNum: 1 },
    { code: '1201', name: 'KC MAKASSAR', kepwilNum: 12 },
    { code: '601', name: 'KC SEMARANG', kepwilNum: 6 },
    { code: '102', name: 'KC MEDAN', kepwilNum: 1 },
    { code: '1101', name: 'KC DENPASAR', kepwilNum: 11 },
    { code: '301', name: 'KC PALEMBANG', kepwilNum: 3 },
    { code: '801', name: 'KC BALIKPAPAN', kepwilNum: 8 },
    { code: '201', name: 'KC PEKANBARU', kepwilNum: 2 },
    { code: '901', name: 'KC MANADO', kepwilNum: 9 },
    { code: '1301', name: 'KC JAYAPURA', kepwilNum: 13 },
    { code: '1001', name: 'KC AMBON', kepwilNum: 10 },
  ];

  for (const item of kcSeeds) {
    const unitId = `user_kc_${item.code}`;
    summaries.push({
      unitId,
      username: item.code,
      displayName: item.name,
      role: 'kantor_cabang',
      officeName: item.name,
      parentKepwil: `KEDEPUTIAN WILAYAH ${item.kepwilNum}`,
      loginCount: 0,
      menuUsageCount: 0,
      totalPemanfaatan: 0,
      menuBreakdown: {},
      lastLoginAt: '',
      lastActiveAt: '',
    });
  }

  // Populate remaining reference KC users with 0 default
  const existingCodes = new Set(kcSeeds.map(k => k.code));
  for (const refUser of REFERENCE_USERS) {
    if (refUser.role === 'kantor_cabang' && !existingCodes.has(refUser.username)) {
      summaries.push({
        unitId: refUser.id,
        username: refUser.username,
        displayName: refUser.displayName || `KC ${refUser.username}`,
        role: 'kantor_cabang',
        officeName: refUser.displayName || `KC ${refUser.username}`,
        loginCount: 0,
        menuUsageCount: 0,
        totalPemanfaatan: 0,
        menuBreakdown: {},
        lastLoginAt: '',
        lastActiveAt: '',
      });
    }
  }

  return summaries;
}

export function generateInitialActivityLogs(): UserActivityLog[] {
  return [];
}
