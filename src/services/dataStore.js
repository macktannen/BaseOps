import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { notifyKeyChange } from './dataSyncService';

let currentUserId = null;
let unsubOrg = null;
let initialized = false;
let retryTimer = null;

// Key used to persist the offline write queue in localStorage.
const PENDING_SYNC_KEY = '_baseOpsPendingSync';

// Tracks local writes in flight to prevent echo-cancel
const pendingLocalWrites = new Map();

const originalSetItem = localStorage.setItem.bind(localStorage);
const originalGetItem = localStorage.getItem.bind(localStorage);

function isPendingLocalWrite(key) {
  const inFlight = pendingLocalWrites.get(key);
  if (inFlight && Date.now() - inFlight < 4000) return true;
  return getPendingQueue().some(e => e.key === key);
}

function clearPendingWrite(key) {
  pendingLocalWrites.delete(key);
}

function getPendingQueue() {
  try {
    return JSON.parse(originalGetItem(PENDING_SYNC_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePendingQueue(queue) {
  originalSetItem(PENDING_SYNC_KEY, JSON.stringify(queue));
}

function queueForRetry(key, value) {
  const queue = getPendingQueue().filter(e => e.key !== key);
  queue.push({ key, value, ts: Date.now() });
  savePendingQueue(queue);
}

function removeQueuedKey(key) {
  const queue = getPendingQueue();
  const filtered = queue.filter(e => e.key !== key);
  if (filtered.length !== queue.length) savePendingQueue(filtered);
}

export function getPendingQueueLength() {
  return getPendingQueue().length;
}

const LS_KEYS_TO_SYNC = new Set([
  'userFlights', 'userAircraft', 'userPilots', 'userPassengers',
  'userAccounts', 'userVendors', 'globalContacts', 'userCustomZones',
  'crewSchedules', 'calendarNotes', 'calendarViewSettings', 'crewOrder',
  'schedulesGridColorBy', 'locationUsage', 'departmentExpenses',
  'gemini_api_key',
]);

const FIRESTORE_KEY_MAP = {
  'userFlights': 'flights',
  'userAircraft': 'aircraft',
  'userPilots': 'pilots',
  'userPassengers': 'passengers',
  'userAccounts': 'accounts',
  'userVendors': 'vendors',
  'globalContacts': 'contacts',
  'userCustomZones': 'customZones',
  'crewSchedules': 'crewSchedules',
  'calendarNotes': 'calendarNotes',
  'calendarViewSettings': 'calendarViewSettings',
  'crewOrder': 'crewOrder',
  'schedulesGridColorBy': 'schedulesGridColorBy',
  'locationUsage': 'locationUsage',
  'departmentExpenses': 'departmentExpenses',
  'gemini_api_key': 'geminiApiKey',
};

function getOrgDocRef() {
  return doc(db, 'orgs', 'default');
}

export function setUserId(userId) {
  currentUserId = userId;
  if (userId) {
    flushPendingQueue();
    if (!initialized) {
      initStore();
    }
  }
}

export function getUserId() {
  return currentUserId;
}

/**
 * Intelligent flight merge used when recovering from offline un-synced edits.
 */
function mergeFlights(localFlights, remoteFlights) {
  if (!Array.isArray(localFlights) || localFlights.length === 0) return remoteFlights || [];
  if (!Array.isArray(remoteFlights) || remoteFlights.length === 0) return localFlights;

  const merged = [...remoteFlights];
  for (const lFlight of localFlights) {
    const rIdx = merged.findIndex(rf => 
      (rf.id && lFlight.id && String(rf.id) === String(lFlight.id)) ||
      (rf.flightNumber && lFlight.flightNumber && String(rf.flightNumber) === String(lFlight.flightNumber))
    );
    if (rIdx === -1) {
      merged.push(lFlight);
    } else {
      const rFlight = merged[rIdx];
      
      // Merge uploads (union)
      const rUploads = Array.isArray(rFlight.uploads) ? rFlight.uploads : [];
      const lUploads = Array.isArray(lFlight.uploads) ? lFlight.uploads : [];
      const uploadsMap = new Map();
      rUploads.forEach(u => uploadsMap.set(u.id || u.storagePath || u.name, u));
      lUploads.forEach(u => uploadsMap.set(u.id || u.storagePath || u.name, u));
      const mergedUploads = Array.from(uploadsMap.values());

      // Merge expenses (union)
      const rExpenses = Array.isArray(rFlight.expenses) ? rFlight.expenses : [];
      const lExpenses = Array.isArray(lFlight.expenses) ? lFlight.expenses : [];
      const expMap = new Map();
      rExpenses.forEach(e => expMap.set(String(e.id), e));
      lExpenses.forEach(e => {
        const existing = expMap.get(String(e.id));
        if (!existing) {
          expMap.set(String(e.id), e);
        } else {
          // If local has receipts or newer modifications, keep richest
          const existingReceipts = existing.receiptFiles || [];
          const localReceipts = e.receiptFiles || [];
          const mergedReceipts = localReceipts.length >= existingReceipts.length ? localReceipts : existingReceipts;
          expMap.set(String(e.id), {
            ...existing,
            ...e,
            receiptFiles: mergedReceipts,
            receiptCount: Math.max(existing.receiptCount || 0, e.receiptCount || 0, mergedReceipts.length)
          });
        }
      });
      const mergedExpenses = Array.from(expMap.values());

      merged[rIdx] = {
        ...lFlight,
        ...rFlight,
        uploads: mergedUploads,
        expenses: mergedExpenses
      };
    }
  }
  return merged;
}

async function persistKeyToFirestore(key, value) {
  if (!currentUserId) {
    queueForRetry(key, value);
    return false;
  }
  const fsKey = FIRESTORE_KEY_MAP[key] || key;
  try {
    const orgRef = getOrgDocRef();
    await setDoc(orgRef, { [fsKey]: value, _lastUpdated: Date.now() }, { merge: true });
    removeQueuedKey(key);
    return true;
  } catch (err) {
    console.error(`Firestore persist failed for ${key}:`, err);
    queueForRetry(key, value);
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { online: false } }));
    return false;
  }
}

// Retry any queued (unsynced) writes.
async function flushPendingQueue() {
  if (!currentUserId) return;
  const queue = getPendingQueue();
  if (queue.length === 0) return;
  for (const entry of queue) {
    await persistKeyToFirestore(entry.key, entry.value);
  }
  if (getPendingQueue().length === 0) {
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { online: true } }));
  }
}

function startRetryTimer() {
  if (retryTimer) return;
  retryTimer = setInterval(() => flushPendingQueue(), 6000);
}

export async function initStore() {
  if (initialized) return;
  if (!currentUserId) {
    // Try to get UID from baseOpsCurrentUser if available
    try {
      const stored = JSON.parse(originalGetItem('baseOpsCurrentUser') || '{}');
      if (stored && (stored.uid || stored.id)) {
        currentUserId = stored.uid || stored.id;
      }
    } catch {}
  }
  if (!currentUserId) return;

  initialized = true;
  startRetryTimer();

  try {
    const orgRef = getOrgDocRef();
    const snap = await getDoc(orgRef);
    if (snap.exists()) {
      const data = snap.data();
      Object.entries(FIRESTORE_KEY_MAP).forEach(([lsKey, fsKey]) => {
        if (data[fsKey] !== undefined && data[fsKey] !== null) {
          const localRaw = originalGetItem(lsKey);
          let localData = null;
          if (localRaw) {
            try { localData = JSON.parse(localRaw); } catch { localData = localRaw; }
          }

          let finalData = data[fsKey];
          // If offline pending writes exist, merge; otherwise remote is authoritative
          if (isPendingLocalWrite(lsKey) && lsKey === 'userFlights' && Array.isArray(localData)) {
            finalData = mergeFlights(localData, data[fsKey]);
          }

          const finalStr = typeof finalData === 'string' ? finalData : JSON.stringify(finalData);
          const localStr = typeof localData === 'string' ? localData : JSON.stringify(localData);

          if (finalStr !== localStr) {
            originalSetItem(lsKey, finalStr);
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('firestore-sync', { detail: { key: lsKey } }));
          }

          if (isPendingLocalWrite(lsKey) && lsKey === 'userFlights' && JSON.stringify(finalData) !== JSON.stringify(data[fsKey])) {
            persistKeyToFirestore('userFlights', finalData);
          }
        } else {
          const existing = originalGetItem(lsKey);
          if (existing) {
            try {
              const parsed = JSON.parse(existing);
              persistKeyToFirestore(lsKey, parsed);
            } catch {
              persistKeyToFirestore(lsKey, existing);
            }
          }
        }
      });
    } else {
      const allData = {};
      let hasData = false;
      LS_KEYS_TO_SYNC.forEach(key => {
        const raw = originalGetItem(key);
        if (raw) {
          hasData = true;
          try {
            allData[FIRESTORE_KEY_MAP[key] || key] = JSON.parse(raw);
          } catch {
            allData[FIRESTORE_KEY_MAP[key] || key] = raw;
          }
        }
      });
      if (hasData) {
        try {
          await setDoc(orgRef, { ...allData, _lastUpdated: Date.now() }, { merge: true });
        } catch (err) {
          console.error('Bulk Firestore seed failed, queueing keys:', err);
          Object.entries(allData).forEach(([fsKey, val]) => {
            const lsKey = Object.keys(FIRESTORE_KEY_MAP).find(k => FIRESTORE_KEY_MAP[k] === fsKey) || fsKey;
            queueForRetry(lsKey, val);
          });
        }
      }
    }

    startRetryTimer();

    // Setup live, real-time snapshot subscription across all devices
    unsubOrg = onSnapshot(orgRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      Object.entries(FIRESTORE_KEY_MAP).forEach(([lsKey, fsKey]) => {
        if (data[fsKey] !== undefined && data[fsKey] !== null) {
          const current = originalGetItem(lsKey);
          let currentParsed = null;
          if (current) {
            try { currentParsed = JSON.parse(current); } catch { currentParsed = current; }
          }

          let finalData = data[fsKey];
          // If this device is currently offline with un-synced writes, merge; otherwise apply remote update immediately
          if (isPendingLocalWrite(lsKey) && lsKey === 'userFlights' && Array.isArray(currentParsed)) {
            finalData = mergeFlights(currentParsed, data[fsKey]);
          }

          const finalStr = typeof finalData === 'string' ? finalData : JSON.stringify(finalData);
          const currentStr = typeof currentParsed === 'string' ? currentParsed : JSON.stringify(currentParsed);

          if (finalStr !== currentStr) {
            originalSetItem(lsKey, finalStr);
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('firestore-sync', { detail: { key: lsKey } }));
          }
        }
      });
    }, (err) => {
      console.error('Firestore realtime onSnapshot error:', err);
    });
  } catch (err) {
    console.error('initStore failed:', err);
  }
}

export function stopRealtimeSync() {
  if (unsubOrg) {
    unsubOrg();
    unsubOrg = null;
  }
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
  initialized = false;
}

// Intercept localStorage.setItem globally to automatically sync to Firestore & broadcast
localStorage.setItem = (key, value) => {
  originalSetItem(key, value);
  notifyKeyChange(key, value);

  if (LS_KEYS_TO_SYNC.has(key)) {
    let parsed;
    try { parsed = JSON.parse(value); } catch { parsed = value; }
    pendingLocalWrites.set(key, Date.now());
    persistKeyToFirestore(key, parsed).finally(() => {
      setTimeout(() => clearPendingWrite(key), 800);
    });
  }
};
