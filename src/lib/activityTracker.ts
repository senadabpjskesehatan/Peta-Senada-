import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import debounce from 'lodash/debounce';
import { AppUser, UnitUtilizationSummary, UserActivityLog } from '../types';
import { db, checkQuotaExceeded, markQuotaExceeded } from './firebase';
import { generateInitialUtilizationSummaries, generateInitialActivityLogs, MENU_NAME_MAP } from '../data/defaultActivityData';
import { getUserOfficeOrWilayahLabel } from '../utils/userFilterHelper';

const STORAGE_SUMMARIES_KEY = 'senada_utilization_summaries_v3';
const STORAGE_LOGS_KEY = 'senada_activity_logs_v3';

let inMemorySummaries: UnitUtilizationSummary[] = [];
let inMemoryLogs: UserActivityLog[] = [];
const subscribers = new Set<(data: { summaries: UnitUtilizationSummary[]; logs: UserActivityLog[] }) => void>();

// Load initially from localStorage or generate defaults
function initializeData() {
  if (inMemorySummaries.length > 0) return;

  try {
    const savedSummaries = localStorage.getItem(STORAGE_SUMMARIES_KEY);
    if (savedSummaries) {
      const parsed = JSON.parse(savedSummaries);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemorySummaries = parsed.filter((s: any) => s.role !== 'admin' && s.username?.toLowerCase() !== 'admin');
      }
    }
  } catch (e) {
    console.error('Failed reading saved summaries from storage', e);
  }

  if (inMemorySummaries.length === 0) {
    inMemorySummaries = generateInitialUtilizationSummaries().filter(s => s.role !== 'admin' && s.username?.toLowerCase() !== 'admin');
    try {
      localStorage.setItem(STORAGE_SUMMARIES_KEY, JSON.stringify(inMemorySummaries));
    } catch (e) {}
  }

  try {
    const savedLogs = localStorage.getItem(STORAGE_LOGS_KEY);
    if (savedLogs) {
      const parsed = JSON.parse(savedLogs);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryLogs = parsed.filter((l: any) => l.role !== 'admin' && l.username?.toLowerCase() !== 'admin');
      }
    }
  } catch (e) {
    console.error('Failed reading saved logs from storage', e);
  }

  if (inMemoryLogs.length === 0) {
    inMemoryLogs = generateInitialActivityLogs().filter(l => l.role !== 'admin' && l.username?.toLowerCase() !== 'admin');
    try {
      localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(inMemoryLogs));
    } catch (e) {}
  }
}

initializeData();

function notifySubscribers() {
  const filteredSummaries = inMemorySummaries.filter(s => s.role !== 'admin' && s.username?.toLowerCase() !== 'admin');
  const filteredLogs = inMemoryLogs.filter(l => l.role !== 'admin' && l.username?.toLowerCase() !== 'admin');
  const payload = {
    summaries: filteredSummaries,
    logs: filteredLogs,
  };
  subscribers.forEach(cb => {
    try {
      cb(payload);
    } catch (e) {
      console.error('Activity subscriber error', e);
    }
  });
}

function persistLocally() {
  try {
    localStorage.setItem(STORAGE_SUMMARIES_KEY, JSON.stringify(inMemorySummaries.filter(s => s.role !== 'admin' && s.username?.toLowerCase() !== 'admin')));
    localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(inMemoryLogs.filter(l => l.role !== 'admin' && l.username?.toLowerCase() !== 'admin').slice(0, 100)));
  } catch (e) {
    // quota limit ignore
  }
}

// Debounced cloud save to Firestore to minimize writes and stay under quotas
const executeSaveToCloud = debounce(async () => {
  if (checkQuotaExceeded()) return;
  try {
    const docRef = doc(db, 'user_activity', 'global_metrics');
    await setDoc(docRef, {
      summaries: inMemorySummaries.filter(s => s.role !== 'admin' && s.username?.toLowerCase() !== 'admin').slice(0, 80),
      recentLogs: inMemoryLogs.filter(l => l.role !== 'admin' && l.username?.toLowerCase() !== 'admin').slice(0, 50),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota')) {
      markQuotaExceeded();
    }
    console.warn('Cloud activity sync failed, kept in local storage', err?.message);
  }
}, 3000, { maxWait: 8000 });

/**
 * Record user login activity
 */
export function recordUserLogin(user: AppUser) {
  if (!user || user.role === 'admin' || user.username?.toLowerCase() === 'admin') return;
  initializeData();

  const now = new Date().toISOString();
  const identity = getUserOfficeOrWilayahLabel(user);
  const unitId = user.id || `user_${user.username}`;

  // Find or create summary entry
  let found = inMemorySummaries.find(
    s => s.unitId === unitId || s.username.toUpperCase() === user.username.toUpperCase()
  );

  if (found) {
    found.loginCount += 1;
    found.totalPemanfaatan = found.loginCount + found.menuUsageCount;
    found.lastLoginAt = now;
    found.lastActiveAt = now;
    if (user.displayName) found.displayName = user.displayName;
    if (identity.officeName) found.officeName = identity.officeName;
  } else {
    found = {
      unitId,
      username: user.username,
      displayName: user.displayName || identity.officeName,
      role: user.role,
      officeName: identity.officeName,
      loginCount: 1,
      menuUsageCount: 0,
      totalPemanfaatan: 1,
      menuBreakdown: {},
      lastLoginAt: now,
      lastActiveAt: now,
    };
    inMemorySummaries.push(found);
  }

  // Prepend new activity log
  const newLog: UserActivityLog = {
    id: `log_login_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId: unitId,
    username: user.username,
    displayName: user.displayName || identity.officeName,
    role: user.role,
    officeName: identity.officeName,
    type: 'login',
    timestamp: now,
    details: `Login berhasil sebagai ${identity.typeLabel}`,
  };

  inMemoryLogs = [newLog, ...inMemoryLogs.filter(l => l.role !== 'admin' && l.username?.toLowerCase() !== 'admin').slice(0, 99)];

  persistLocally();
  notifySubscribers();
  executeSaveToCloud();
}

/**
 * Record menu utilization activity
 */
export function recordMenuUsage(
  user: AppUser | null | undefined,
  menuId: string,
  menuName?: string
) {
  if (!user || user.role === 'admin' || user.username?.toLowerCase() === 'admin') return;
  initializeData();

  const now = new Date().toISOString();
  const activeUser: AppUser = user;

  const identity = getUserOfficeOrWilayahLabel(activeUser);
  const unitId = activeUser.id || `user_${activeUser.username}`;
  const resolvedMenuName = menuName || MENU_NAME_MAP[menuId] || menuId;

  // Update summary
  let found = inMemorySummaries.find(
    s => s.unitId === unitId || s.username.toUpperCase() === activeUser.username.toUpperCase()
  );

  if (found) {
    found.menuUsageCount += 1;
    found.totalPemanfaatan = found.loginCount + found.menuUsageCount;
    found.lastActiveAt = now;
    if (!found.menuBreakdown) found.menuBreakdown = {};
    found.menuBreakdown[menuId] = (found.menuBreakdown[menuId] || 0) + 1;
  } else if (activeUser.username !== 'Tamu / Umum') {
    found = {
      unitId,
      username: activeUser.username,
      displayName: activeUser.displayName || identity.officeName,
      role: activeUser.role,
      officeName: identity.officeName,
      loginCount: 0,
      menuUsageCount: 1,
      totalPemanfaatan: 1,
      menuBreakdown: { [menuId]: 1 },
      lastLoginAt: now,
      lastActiveAt: now,
    };
    inMemorySummaries.push(found);
  }

  // Prepend new activity log
  const newLog: UserActivityLog = {
    id: `log_menu_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId: unitId,
    username: activeUser.username,
    displayName: activeUser.displayName || identity.officeName,
    role: activeUser.role,
    officeName: identity.officeName,
    type: 'menu_usage',
    menuId,
    menuName: resolvedMenuName,
    timestamp: now,
    details: `Pemanfaatan menu: ${resolvedMenuName}`,
  };

  inMemoryLogs = [newLog, ...inMemoryLogs.filter(l => l.role !== 'admin' && l.username?.toLowerCase() !== 'admin').slice(0, 99)];

  persistLocally();
  notifySubscribers();
  executeSaveToCloud();
}

/**
 * Get current utilization summaries
 */
export function getUtilizationSummaries(): UnitUtilizationSummary[] {
  initializeData();
  return inMemorySummaries.filter(s => s.role !== 'admin' && s.username?.toLowerCase() !== 'admin');
}

/**
 * Get current activity logs
 */
export function getRecentActivityLogs(): UserActivityLog[] {
  initializeData();
  return inMemoryLogs.filter(l => l.role !== 'admin' && l.username?.toLowerCase() !== 'admin');
}

/**
 * Realtime subscription to User Activity & Utilization data
 */
export function subscribeToUserActivity(
  callback: (data: { summaries: UnitUtilizationSummary[]; logs: UserActivityLog[] }) => void
): () => void {
  initializeData();
  subscribers.add(callback);

  // Immediately fire with local state
  callback({
    summaries: [...inMemorySummaries],
    logs: [...inMemoryLogs],
  });

  // Attach cloud listener if available
  let unsubscribeCloud: (() => void) | null = null;
  if (!checkQuotaExceeded()) {
    try {
      const docRef = doc(db, 'user_activity', 'global_metrics');
      unsubscribeCloud = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const cloudData = snap.data();
          if (Array.isArray(cloudData.summaries) && cloudData.summaries.length > 0) {
            // Merge with local state
            const cloudSummaries: UnitUtilizationSummary[] = cloudData.summaries;
            const mergedMap = new Map<string, UnitUtilizationSummary>();

            cloudSummaries.forEach(s => mergedMap.set(s.unitId, s));
            inMemorySummaries.forEach(s => {
              const existing = mergedMap.get(s.unitId);
              if (!existing || (s.totalPemanfaatan > existing.totalPemanfaatan)) {
                mergedMap.set(s.unitId, s);
              }
            });

            inMemorySummaries = Array.from(mergedMap.values());
            if (Array.isArray(cloudData.recentLogs) && cloudData.recentLogs.length > 0) {
              const idSet = new Set(inMemoryLogs.map(l => l.id));
              cloudData.recentLogs.forEach((l: UserActivityLog) => {
                if (!idSet.has(l.id)) {
                  inMemoryLogs.push(l);
                  idSet.add(l.id);
                }
              });
              inMemoryLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              inMemoryLogs = inMemoryLogs.slice(0, 100);
            }

            persistLocally();
            callback({
              summaries: [...inMemorySummaries],
              logs: [...inMemoryLogs],
            });
          }
        }
      }, (error: any) => {
        if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota')) {
          markQuotaExceeded();
        }
      });
    } catch (e) {
      console.warn('Could not connect to live user_activity stream', e);
    }
  }

  return () => {
    subscribers.delete(callback);
    if (unsubscribeCloud) {
      try {
        unsubscribeCloud();
      } catch (e) {}
    }
  };
}
