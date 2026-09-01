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
 * Save Application Settings to Firestore
 */
export async function saveAppSettingsToCloud(settings: Partial<CloudAppSettings>) {
  try {
    const docRef = doc(db, 'app_settings', 'global');
    await setDoc(docRef, {
      ...settings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
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

    await setDoc(docRef, payload, { merge: true });
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
 * Save Dynamic Charts to Firestore
 */
export async function saveDynamicChartsToCloud(charts: DynamicChart[]) {
  try {
    const docRef = doc(db, 'dynamic_charts', 'all_charts');
    await setDoc(docRef, {
      charts,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('Failed to save dynamic charts to cloud:', err);
  }
}
