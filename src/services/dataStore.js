import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

let currentUserId = null;
let unsubOrg = null;
let initialized = false;
let retryTimer = null;

// Key used to persist the offline write queue in localStorage.
const PENDING_SYNC_KEY = '_baseOpsPendingSync';

// Tracks which localStorage keys currently have a Firestore write in flight.
// Used to avoid onSnapshot / initStore reverting a freshly-saved local change
// with stale Firestore data during the brief window before the remote write lands.
const pendingWrites = {};

function isPendingLocalWrite(key) {
  if (pendingWrites[key]) return true;
  // A queued (unsynced) local write must also win over stale remote data.
  return getPendingQueue().some(e => e.key === key);
}

function clearPendingWrite(key) {
  delete pendingWrites[key];
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
}

export function getUserId() {
  return currentUserId;
}

async function persistKeyToFirestore(key, value) {
  if (!currentUserId) return false;
  const fsKey = FIRESTORE_KEY_MAP[key] || key;
  try {
    const orgRef = getOrgDocRef();
    await setDoc(orgRef, { [fsKey]: value }, { merge: true });
    removeQueuedKey(key);
    return true;
  } catch (err) {
    console.error(`Firestore persist failed for ${key}:`, err);
    queueForRetry(key, value);
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { online: false } }));
    return false;
  }
}

// Retry any queued (unsynced) writes. Called on login and on a timer.
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
  retryTimer = setInterval(() => flushPendingQueue(), 10000);
}

export async function initStore() {
  if (initialized || !currentUserId) return;
  initialized = true;
  startRetryTimer();

  try {
    const orgRef = getOrgDocRef();
    const snap = await getDoc(orgRef);
    if (snap.exists()) {
      const data = snap.data();
      Object.entries(FIRESTORE_KEY_MAP).forEach(([lsKey, fsKey]) => {
        if (data[fsKey] !== undefined && data[fsKey] !== null) {
          const localRaw = localStorage.getItem(lsKey);
          let localData = null;
          if (localRaw) {
            try { localData = JSON.parse(localRaw); } catch { localData = localRaw; }
          }
          const firestoreStr = JSON.stringify(data[fsKey]);
          const localStr = JSON.stringify(localData);
          if (firestoreStr !== localStr && !isPendingLocalWrite(lsKey)) {
            if (typeof data[fsKey] === 'string') {
              localStorage.setItem(lsKey, data[fsKey]);
            } else {
              localStorage.setItem(lsKey, JSON.stringify(data[fsKey]));
            }
          }
        } else {
          const existing = localStorage.getItem(lsKey);
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
        const raw = localStorage.getItem(key);
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
          await setDoc(orgRef, allData, { merge: true });
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

    unsubOrg = onSnapshot(orgRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      Object.entries(FIRESTORE_KEY_MAP).forEach(([lsKey, fsKey]) => {
        if (data[fsKey] !== undefined && data[fsKey] !== null) {
          const current = localStorage.getItem(lsKey);
          let currentParsed = null;
          if (current) {
            try { currentParsed = JSON.parse(current); } catch { currentParsed = current; }
          }
          if (JSON.stringify(data[fsKey]) !== JSON.stringify(currentParsed) && !isPendingLocalWrite(lsKey)) {
            if (typeof data[fsKey] === 'string') {
              localStorage.setItem(lsKey, data[fsKey]);
            } else {
              localStorage.setItem(lsKey, JSON.stringify(data[fsKey]));
            }
            window.dispatchEvent(new CustomEvent('firestore-sync', { detail: { key: lsKey } }));
          }
        }
      });
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

const originalSetItem = localStorage.setItem.bind(localStorage);
const originalGetItem = localStorage.getItem.bind(localStorage);
localStorage.setItem = (key, value) => {
  originalSetItem(key, value);
  if (LS_KEYS_TO_SYNC.has(key)) {
    let parsed;
    try { parsed = JSON.parse(value); } catch { parsed = value; }
    pendingWrites[key] = true;
    const p = persistKeyToFirestore(key, parsed);
    p.finally(() => clearPendingWrite(key));
    // Safety: never block sync on a stuck write.
    setTimeout(() => clearPendingWrite(key), 5000);
  }
};
