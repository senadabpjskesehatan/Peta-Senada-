import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CityData, DynamicChart, MapSyncConfig } from '../types';
import debounce from 'lodash/debounce';

// Suppress Firestore SDK console backoff retry spam
try {
  setLogLevel('silent');
} catch (e) {
  // ignore
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use the databaseId specified in firebase-applet-config.json if provided
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Global & Persisted flag to prevent further network calls/writes if Firestore quota is exceeded
const QUOTA_STORAGE_KEY = 'firestore_quota_exceeded_timestamp';
let isQuotaExceeded = false;

export function checkQuotaExceeded(): boolean {
  if (isQuotaExceeded) return true;
  try {
    const stored = sessionStorage.getItem(QUOTA_STORAGE_KEY) || localStorage.getItem(QUOTA_STORAGE_KEY);
    if (stored) {
      const timestamp = parseInt(stored, 10);
      // Quota cooldown: 2 hours
      if (Date.now() - timestamp < 2 * 60 * 60 * 1000) {
        isQuotaExceeded = true;
        return true;
      }
    }
  } catch (e) {
    // ignore
  }
  return false;
}

export function markQuotaExceeded() {
  isQuotaExceeded = true;
  try {
    sessionStorage.setItem(QUOTA_STORAGE_KEY, Date.now().toString());
    localStorage.setItem(QUOTA_STORAGE_KEY, Date.now().toString());
  } catch (e) {
    // ignore
  }
}

// Initial check on load
checkQuotaExceeded();

// Collection and Document references
const APP_SETTINGS_DOC = 'app_settings/global';
const MAP_DATA_DOC = 'map_data/cities_and_config';
const CHARTS_DATA_DOC = 'dynamic_charts/all_charts';

export interface CloudAppSettings {
  navOrder?: string[];
  syncInterval?: 'manual' | '15m' | '30m' | '1h' | '1d';
  lastSyncedAt?: string | null;
  volumeThresholds?: { rendahMax: number; sedangMax: number; tinggiMax: number };
  hasSyncedCustomData?: boolean;
  updatedAt?: string;
}

export interface CloudMapData {
  cities?: CityData[];
  syncConfig?: MapSyncConfig;
  hasSyncedCustomData?: boolean;
  updatedAt?: string;
}

export interface CloudChartsData {
  charts?: DynamicChart[];
  updatedAt?: string;
}

/**
 * Realtime listener for Application Settings
 */
export function subscribeToAppSettings(callback: (settings: CloudAppSettings | null) => void) {
  if (checkQuotaExceeded()) {
    return () => {};
  }
  try {
    const docRef = doc(db, 'app_settings', 'global');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data() as CloudAppSettings);
      } else {
        callback(null);
      }
    }, (error: any) => {
      if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota')) {
        markQuotaExceeded();
      }
    });
  } catch (err) {
    return () => {};
  }
}

/**
 * Recursively cleans objects and arrays to remove `undefined` values,
 * which are unsupported by Firebase Firestore setDoc/updateDoc.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) return null as unknown as T;
  if (data === null || typeof data !== 'object') return data;
  if (data instanceof Date) return data.toISOString() as unknown as T;

  if (Array.isArray(data)) {
    return data
      .map(item => sanitizeForFirestore(item))
      .filter(item => item !== undefined) as unknown as T;
  }

  const cleanObj: Record<string, any> = {};
  for (const key of Object.keys(data as Record<string, any>)) {
    const val = (data as Record<string, any>)[key];
    if (val !== undefined) {
      const cleanedVal = sanitizeForFirestore(val);
      if (cleanedVal !== undefined) {
        cleanObj[key] = cleanedVal;
      }
    }
  }
  return cleanObj as T;
}

let pendingAppSettings: Partial<CloudAppSettings> = {};

const executeSaveAppSettings = debounce(async () => {
  if (checkQuotaExceeded() || Object.keys(pendingAppSettings).length === 0) return;
  const payloadToSave = { ...pendingAppSettings };
  pendingAppSettings = {}; // reset
  
  try {
    const docRef = doc(db, 'app_settings', 'global');
    const cleanSettings = sanitizeForFirestore({
      ...payloadToSave,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, cleanSettings, { merge: true });
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota')) {
      markQuotaExceeded();
      return;
    }
    console.error('Failed to save app settings to cloud:', err);
  }
}, 3000, { maxWait: 10000 });

/**
 * Save Application Settings to Firestore
 */
export async function saveAppSettingsToCloud(settings: Partial<CloudAppSettings>) {
  if (checkQuotaExceeded()) return;
  pendingAppSettings = { ...pendingAppSettings, ...settings };
  executeSaveAppSettings();
}

/**
 * Realtime listener for Map Cities & Sheet Sync Config
 */
export function subscribeToMapData(callback: (data: CloudMapData | null) => void) {
  if (checkQuotaExceeded()) {
    return () => {};
  }
  try {
    const docRef = doc(db, 'map_data', 'cities_and_config');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data() as CloudMapData);
      } else {
        callback(null);
      }
    }, (error: any) => {
      if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota')) {
        markQuotaExceeded();
      }
    });
  } catch (err) {
    return () => {};
  }
}

let pendingMapData: Partial<CloudMapData> = {};

const executeSaveMapData = debounce(async () => {
  if (checkQuotaExceeded() || Object.keys(pendingMapData).length === 0) return;
  const payloadToSave = { ...pendingMapData };
  pendingMapData = {};
  
  try {
    const docRef = doc(db, 'map_data', 'cities_and_config');
    const payload: Partial<CloudMapData> = {
      ...payloadToSave,
      updatedAt: new Date().toISOString()
    };

    let cleanPayload = sanitizeForFirestore(payload);

    // Document size guard for cities dataset (~750KB limit)
    const MAX_DOC_BYTES = 750000;
    if (JSON.stringify(cleanPayload).length > MAX_DOC_BYTES && cleanPayload.cities) {
      // Omit heavy rawRow from cities payload if dataset size is huge
      cleanPayload.cities = cleanPayload.cities.map(c => {
        const { rawRow, ...rest } = c;
        return rest;
      });
    }

    await setDoc(docRef, cleanPayload, { merge: true });
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota')) {
      markQuotaExceeded();
      return;
    }
    console.error('Failed to save map data to cloud:', err);
  }
}, 5000, { maxWait: 15000 });

/**
 * Save Map Cities & Sync Config to Firestore
 */
export async function saveMapDataToCloud(cities?: CityData[], syncConfig?: MapSyncConfig, hasSyncedCustomData?: boolean) {
  if (checkQuotaExceeded()) return;
  if (cities !== undefined) pendingMapData.cities = cities;
  if (syncConfig !== undefined) pendingMapData.syncConfig = syncConfig;
  if (hasSyncedCustomData !== undefined) pendingMapData.hasSyncedCustomData = hasSyncedCustomData;
  executeSaveMapData();
}

/**
 * Realtime listener for Dynamic Custom Charts configured by Admin
 */
export function subscribeToDynamicCharts(callback: (charts: DynamicChart[] | null) => void) {
  if (checkQuotaExceeded()) {
    return () => {};
  }
  try {
    const docRef = doc(db, 'dynamic_charts', 'all_charts');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as CloudChartsData;
        callback(data.charts || []);
      } else {
        callback(null);
      }
    }, (error: any) => {
      if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota')) {
        markQuotaExceeded();
      }
    });
  } catch (err) {
    return () => {};
  }
}

let pendingCharts: DynamicChart[] | null = null;

const executeSaveCharts = debounce(async () => {
  if (checkQuotaExceeded() || !pendingCharts) return;
  const chartsToSave = pendingCharts;
  pendingCharts = null;
  
  try {
    const docRef = doc(db, 'dynamic_charts', 'all_charts');

    // 1. Deep clean any undefined values
    let cleanCharts = (chartsToSave || []).map(chart => sanitizeForFirestore(chart));

    // 2. Size safety management
    const MAX_DOC_BYTES = 750000; // ~750KB limit to stay comfortably below 1,048,576 bytes limit

    let payload = {
      charts: cleanCharts,
      updatedAt: new Date().toISOString()
    };

    let jsonStr = JSON.stringify(payload);

    // If payload exceeds safe byte limit, truncate syncedData per chart
    if (jsonStr.length > MAX_DOC_BYTES) {
      cleanCharts = cleanCharts.map(c => {
        if (c.syncedData && Array.isArray(c.syncedData) && c.syncedData.length > 150) {
          return {
            ...c,
            syncedData: c.syncedData.slice(0, 150) // Keep top 150 rows in cloud snapshot
          };
        }
        return c;
      });
      payload.charts = cleanCharts;
      jsonStr = JSON.stringify(payload);
    }

    // If still over limit, strip syncedData completely (charts will fall back to re-syncing on client)
    if (jsonStr.length > MAX_DOC_BYTES) {
      cleanCharts = cleanCharts.map(c => {
        const { syncedData, ...rest } = c;
        return rest as DynamicChart;
      });
      payload.charts = cleanCharts;
    }

    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota')) {
      markQuotaExceeded();
      return;
    }

    // Fallback save without syncedData if size error or invalid argument occurred
    if (err?.message?.includes('exceeds the maximum allowed size') || err?.code === 'invalid-argument') {
      try {
        const docRef = doc(db, 'dynamic_charts', 'all_charts');
        const fallbackCharts = (chartsToSave || []).map(c => {
          const { syncedData, ...rest } = c;
          return sanitizeForFirestore(rest as DynamicChart);
        });
        await setDoc(docRef, {
          charts: fallbackCharts,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fallbackErr) {
        console.error('Fallback save for dynamic charts also failed:', fallbackErr);
      }
    }
  }
}, 3000, { maxWait: 10000 });

/**
 * Save Dynamic Charts to Firestore with safety checks for undefined values and document size limits (max 1MB)
 */
export async function saveDynamicChartsToCloud(charts: DynamicChart[]) {
  if (checkQuotaExceeded()) return;
  pendingCharts = charts;
  executeSaveCharts();
}

