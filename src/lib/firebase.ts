import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CityData, DynamicChart, MapSyncConfig } from '../types';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Use the databaseId specified in firebase-applet-config.json if provided
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

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
  try {
    const docRef = doc(db, 'app_settings', 'global');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data() as CloudAppSettings);
      } else {
        callback(null);
      }
    }, (error) => {
      console.warn('Firestore app_settings subscription error:', error);
    });
  } catch (err) {
    console.error('Error subscribing to app settings:', err);
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

/**
 * Save Application Settings to Firestore
 */
export async function saveAppSettingsToCloud(settings: Partial<CloudAppSettings>) {
  try {
    const docRef = doc(db, 'app_settings', 'global');
    const cleanSettings = sanitizeForFirestore({
      ...settings,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, cleanSettings, { merge: true });
  } catch (err) {
    console.error('Failed to save app settings to cloud:', err);
  }
}

/**
 * Realtime listener for Map Cities & Sheet Sync Config
 */
export function subscribeToMapData(callback: (data: CloudMapData | null) => void) {
  try {
    const docRef = doc(db, 'map_data', 'cities_and_config');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data() as CloudMapData);
      } else {
        callback(null);
      }
    }, (error) => {
      console.warn('Firestore map_data subscription error:', error);
    });
  } catch (err) {
    console.error('Error subscribing to map data:', err);
    return () => {};
  }
}

/**
 * Save Map Cities & Sync Config to Firestore
 */
export async function saveMapDataToCloud(cities?: CityData[], syncConfig?: MapSyncConfig, hasSyncedCustomData?: boolean) {
  try {
    const docRef = doc(db, 'map_data', 'cities_and_config');
    const payload: Partial<CloudMapData> = {
      updatedAt: new Date().toISOString()
    };
    if (cities !== undefined) payload.cities = cities;
    if (syncConfig !== undefined) payload.syncConfig = syncConfig;
    if (hasSyncedCustomData !== undefined) payload.hasSyncedCustomData = hasSyncedCustomData;

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
  } catch (err) {
    console.error('Failed to save map data to cloud:', err);
  }
}

/**
 * Realtime listener for Dynamic Custom Charts configured by Admin
 */
export function subscribeToDynamicCharts(callback: (charts: DynamicChart[] | null) => void) {
  try {
    const docRef = doc(db, 'dynamic_charts', 'all_charts');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as CloudChartsData;
        callback(data.charts || []);
      } else {
        callback(null);
      }
    }, (error) => {
      console.warn('Firestore dynamic_charts subscription error:', error);
    });
  } catch (err) {
    console.error('Error subscribing to dynamic charts:', err);
    return () => {};
  }
}

/**
 * Save Dynamic Charts to Firestore with safety checks for undefined values and document size limits (max 1MB)
 */
export async function saveDynamicChartsToCloud(charts: DynamicChart[]) {
  try {
    const docRef = doc(db, 'dynamic_charts', 'all_charts');

    // 1. Deep clean any undefined values
    let cleanCharts = (charts || []).map(chart => sanitizeForFirestore(chart));

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
    console.error('Failed to save dynamic charts to cloud:', err);
    // Fallback save without syncedData if size error or invalid argument occurred
    if (err?.message?.includes('exceeds the maximum allowed size') || err?.code === 'invalid-argument') {
      try {
        const docRef = doc(db, 'dynamic_charts', 'all_charts');
        const fallbackCharts = (charts || []).map(c => {
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
}
