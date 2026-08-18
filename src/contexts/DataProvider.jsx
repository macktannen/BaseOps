import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from './useAuth';

export const DataContext = createContext();

const FIRESTORE_KEY_MAP = {
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

function getFlightsCollectionRef() {
  const isDev = import.meta.env.DEV || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
  const orgName = isDev ? 'dev_sandbox' : 'default';
  return collection(db, 'orgs', orgName, 'flights');
}

function getFlightDocRef(flightId) {
  const isDev = import.meta.env.DEV || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
  const orgName = isDev ? 'dev_sandbox' : 'default';
  return doc(db, 'orgs', orgName, 'flights', String(flightId));
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

  // Subscribe to Firestore org document (lists only — no flights)
  useEffect(() => {
    if (!currentUser && !auth.currentUser) return;

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
      console.error("Firestore org sync error:", err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Subscribe to flights subcollection — each flight is its own document
  useEffect(() => {
    if (!currentUser && !auth.currentUser) return;

    const flightsRef = getFlightsCollectionRef();
    const unsubscribe = onSnapshot(flightsRef, (snap) => {
      const flights = [];
      snap.forEach((docSnap) => {
        const flightData = docSnap.data();
        if (flightData && !flightData._deleted) {
          flights.push(flightData);
        }
      });
      flights.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateA < dateB ? -1 : 1;
        const numA = parseInt(a.flightNumber) || 0;
        const numB = parseInt(b.flightNumber) || 0;
        return numA - numB;
      });
      setData(prev => ({ ...prev, userFlights: flights }));
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Firestore flights sync error:", err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Save a single flight to the flights subcollection
  const saveFlight = useCallback(async (flightData) => {
    if (!flightData || !flightData.id) throw new Error('Flight must have an id');
    const sanitized = sanitizeForFirestore({ ...flightData, _lastUpdated: Date.now() });

    // Optimistic UI update
    setData(prev => {
      const flights = [...(prev.userFlights || [])];
      const idx = flights.findIndex(f => String(f.id) === String(flightData.id));
      if (idx >= 0) {
        flights[idx] = sanitized;
      } else {
        flights.push(sanitized);
      }
      return { ...prev, userFlights: flights };
    });

    try {
      const flightRef = getFlightDocRef(flightData.id);
      await setDoc(flightRef, sanitized, { merge: true });
    } catch (err) {
      console.error('Failed to save flight:', err);
      // Revert optimistic update
      setData(prev => {
        const flights = prev.userFlights.filter(f => String(f.id) !== String(flightData.id));
        return { ...prev, userFlights: flights };
      });
      throw err;
    }
  }, []);

  // Save multiple flights in a batch
  const saveFlightsBatch = useCallback(async (flightsArray) => {
    if (!flightsArray || flightsArray.length === 0) return;

    const sanitized = flightsArray.map(f => sanitizeForFirestore({ ...f, _lastUpdated: Date.now() }));

    // Optimistic UI update
    setData(prev => {
      const flightsMap = new Map((prev.userFlights || []).map(f => [String(f.id), f]));
      for (const f of sanitized) {
        flightsMap.set(String(f.id), f);
      }
      return { ...prev, userFlights: Array.from(flightsMap.values()) };
    });

    try {
      // Firestore batch limit is 500, chunk if needed
      for (let i = 0; i < sanitized.length; i += 450) {
        const chunk = sanitized.slice(i, i + 450);
        const batch = writeBatch(db);
        for (const f of chunk) {
          const flightRef = getFlightDocRef(f.id);
          batch.set(flightRef, f, { merge: true });
        }
        await batch.commit();
      }
    } catch (err) {
      console.error('Failed to batch save flights:', err);
      throw err;
    }
  }, []);

  // Delete a single flight from the flights subcollection
  const deleteFlight = useCallback(async (flightId) => {
    if (!flightId) throw new Error('Flight id is required');
    const idStr = String(flightId);

    // Optimistic UI update
    setData(prev => ({
      ...prev,
      userFlights: (prev.userFlights || []).filter(f => String(f.id) !== idStr)
    }));

    try {
      const flightRef = getFlightDocRef(flightId);
      await deleteDoc(flightRef);
    } catch (err) {
      console.error('Failed to delete flight:', err);
      throw err;
    }
  }, []);

  // Write a single key to the org document (for lists, schedules, etc.)
  const updateData = useCallback(async (key, value) => {
    const fsKey = FIRESTORE_KEY_MAP[key] || key;
    const sanitizedValue = sanitizeForFirestore(value);

    setData(prev => ({ ...prev, [key]: value }));

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
      setData(prev => ({ ...prev, [key]: dataRef.current[key] }));
      throw err;
    }
  }, []);

  // Batch write multiple keys to the org document
  const updateDataBatch = useCallback(async (updates) => {
    const firestoreUpdates = { _lastUpdated: Date.now() };
    const localKeys = [];

    for (const [key, value] of Object.entries(updates)) {
      const fsKey = FIRESTORE_KEY_MAP[key] || key;
      firestoreUpdates[fsKey] = sanitizeForFirestore(value);
      localKeys.push(key);
    }

    setData(prev => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(updates)) {
        next[key] = value;
      }
      return next;
    });

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

  return (
    <DataContext.Provider value={{ ...data, data, updateData, updateDataBatch, saveFlight, saveFlightsBatch, deleteFlight, loading, error }}>
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
