import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from './useAuth';

export const DataContext = createContext();

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

// Reverse map for converting firestore keys back to local state keys
const LOCAL_KEY_MAP = Object.entries(FIRESTORE_KEY_MAP).reduce((acc, [local, firestore]) => {
  acc[firestore] = local;
  return acc;
}, {});

const DEFAULT_DATA = {
  userFlights: [],
  userAircraft: [],
  userPilots: [],
  userPassengers: [],
  userAccounts: [],
  userVendors: [],
  globalContacts: [],
  userCustomZones: [],
  crewSchedules: {},
  calendarNotes: {},
  calendarViewSettings: {},
  crewOrder: [],
  schedulesGridColorBy: 'tag',
  locationUsage: {},
  departmentExpenses: [],
  gemini_api_key: ''
};

function getOrgDocRef() {
  const isDev = import.meta.env.DEV || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
  const orgName = isDev ? 'dev_sandbox' : 'default';
  return doc(db, 'orgs', orgName);
}

function sanitizeForFirestore(val) {
  if (val === undefined) return null;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    return val.map(item => sanitizeForFirestore(item));
  }
  const clean = {};
  for (const [k, v] of Object.entries(val)) {
    if (v === undefined) continue;
    if (k === 'url' && typeof v === 'string' && v.startsWith('data:')) continue;
    clean[k] = sanitizeForFirestore(v);
  }
  return clean;
}

export const DataProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [data, setData] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Subscribe to Firestore org document — 100% cloud single source of truth
  useEffect(() => {
    if (!currentUser && !auth.currentUser) {
      // Wait for auth to resolve
      return;
    }

    const orgRef = getOrgDocRef();
    const unsubscribe = onSnapshot(orgRef, (snap) => {
      if (snap.exists()) {
        const firestoreData = snap.data();
        setData(prev => {
          const newState = { ...prev };
          Object.entries(firestoreData).forEach(([fsKey, val]) => {
            const lsKey = LOCAL_KEY_MAP[fsKey];
            if (lsKey) {
              newState[lsKey] = val;
            }
          });
          return newState;
        });
      }
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Firestore cloud sync error:", err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const updateData = useCallback(async (key, value) => {
    const fsKey = FIRESTORE_KEY_MAP[key] || key;
    const sanitizedValue = sanitizeForFirestore(value);

    // Optimistic UI update
    setData(prev => ({ ...prev, [key]: value }));

    // Persist directly to Firestore cloud document
    try {
      const orgRef = getOrgDocRef();
      try {
        await updateDoc(orgRef, { [fsKey]: sanitizedValue, _lastUpdated: Date.now() });
      } catch (updateErr) {
        if (updateErr.code === 'not-found' || updateErr.message?.includes('No document to update')) {
          await setDoc(orgRef, { [fsKey]: sanitizedValue, _lastUpdated: Date.now() });
        } else {
          throw updateErr;
        }
      }
    } catch (err) {
      console.error(`Failed to update cloud key ${key}:`, err);
      // Revert optimistic update on failure
      setData(prev => ({ ...prev, [key]: dataRef.current[key] }));
      throw err;
    }
  }, []);

  const updateDataBatch = useCallback(async (updates) => {
    const firestoreUpdates = { _lastUpdated: Date.now() };
    const localKeys = [];

    for (const [key, value] of Object.entries(updates)) {
      const fsKey = FIRESTORE_KEY_MAP[key] || key;
      firestoreUpdates[fsKey] = sanitizeForFirestore(value);
      localKeys.push(key);
    }

    // Optimistic UI update — apply all keys in one state change
    setData(prev => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(updates)) {
        next[key] = value;
      }
      return next;
    });

    // Persist all fields to Firestore in a single write
    try {
      const orgRef = getOrgDocRef();
      try {
        await updateDoc(orgRef, firestoreUpdates);
      } catch (updateErr) {
        if (updateErr.code === 'not-found' || updateErr.message?.includes('No document to update')) {
          await setDoc(orgRef, firestoreUpdates);
        } else {
          throw updateErr;
        }
      }
    } catch (err) {
      console.error(`Failed to batch update cloud keys:`, err);
      // Revert optimistic update on failure
      setData(prev => {
        const next = { ...prev };
        for (const key of localKeys) {
          next[key] = dataRef.current[key];
        }
        return next;
      });
      throw err;
    }
  }, []);

  // Spread ...data into the context value so consumers can destructure
  // either { data, updateData } or { userFlights, updateData } directly
  return (
    <DataContext.Provider value={{ ...data, data, updateData, updateDataBatch, loading, error }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
