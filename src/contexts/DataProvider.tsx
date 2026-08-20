import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, writeBatch, getDocs, DocumentData } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from './useAuth';
import { validateFlight } from '../services/validation';

interface DataContextValue {
  userFlights: DocumentData[];
  userAircraft: DocumentData[];
  userPilots: DocumentData[];
  userPassengers: DocumentData[];
  userAccounts: DocumentData[];
  userVendors: DocumentData[];
  globalContacts: DocumentData[];
  userCustomZones: DocumentData[];
  crewSchedules: Record<string, string>;
  calendarNotes: Record<string, unknown>;
  calendarViewSettings: Record<string, unknown>;
  crewOrder: string[];
  schedulesGridColorBy: string;
  locationUsage: Record<string, number>;
  departmentExpenses: DocumentData[];
  gemini_api_key: string;
  data: DataContextState;
  updateData: (key: string, value: unknown) => Promise<void>;
  updateDataBatch: (updates: Record<string, unknown>) => Promise<void>;
  saveFlight: (flightData: DocumentData & { id: string | number }) => Promise<void>;
  saveFlightsBatch: (flightsArray: (DocumentData & { id: string | number })[]) => Promise<void>;
  deleteFlight: (flightId: string | number) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

interface DataContextState {
  userFlights: DocumentData[];
  userAircraft: DocumentData[];
  userPilots: DocumentData[];
  userPassengers: DocumentData[];
  userAccounts: DocumentData[];
  userVendors: DocumentData[];
  globalContacts: DocumentData[];
  userCustomZones: DocumentData[];
  crewSchedules: Record<string, string>;
  calendarNotes: Record<string, unknown>;
  calendarViewSettings: Record<string, unknown>;
  crewOrder: string[];
  schedulesGridColorBy: string;
  locationUsage: Record<string, number>;
  departmentExpenses: DocumentData[];
  gemini_api_key: string;
}

export const DataContext = createContext<DataContextValue | null>(null);

const FIRESTORE_KEY_MAP: Record<string, string> = {
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

const LOCAL_KEY_MAP: Record<string, string> = Object.entries(FIRESTORE_KEY_MAP).reduce((acc, [local, firestore]) => {
  acc[firestore] = local;
  return acc;
}, {} as Record<string, string>);

const DEFAULT_DATA: DataContextState = {
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

function getOrgName(): string {
  const isDev = import.meta.env.DEV || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
  return isDev ? 'dev_sandbox' : 'default';
}

function getOrgDocRef() {
  return doc(db, 'orgs', getOrgName());
}

function getFlightsCollectionRef() {
  return collection(db, 'orgs', getOrgName(), 'flights');
}

function getFlightDocRef(flightId: string | number) {
  return doc(db, 'orgs', getOrgName(), 'flights', String(flightId));
}

function sanitizeForFirestore(val: unknown): unknown {
  if (val === undefined) return null;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    return val.map(item => sanitizeForFirestore(item));
  }
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
    if (v === undefined) continue;
    if (k === 'url' && typeof v === 'string' && v.startsWith('data:')) continue;
    clean[k] = sanitizeForFirestore(v);
  }
  return clean;
}

async function migrateFlightsToSubcollection() {
  try {
    const orgRef = getOrgDocRef();
    const orgSnap = await import('firebase/firestore').then(m => m.getDoc(orgRef));
    if (!orgSnap.exists()) return;

    const orgData = orgSnap.data();
    const legacyFlights = orgData.flights;

    if (!legacyFlights || !Array.isArray(legacyFlights) || legacyFlights.length === 0) return;

    const flightsRef = getFlightsCollectionRef();
    const existingSnap = await getDocs(flightsRef);
    if (!existingSnap.empty) {
      await updateDoc(orgRef, { flights: null });
      return;
    }

    for (const flight of legacyFlights) {
      if (flight && flight.id) {
        const flightRef = getFlightDocRef(flight.id);
        await setDoc(flightRef, sanitizeForFirestore(flight));
      }
    }

    await updateDoc(orgRef, { flights: null });
  } catch (err) {
    console.error('Flight migration failed:', err);
  }
}

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider = ({ children }: DataProviderProps) => {
  const authContext = useAuth();
  const currentUser = authContext?.currentUser;
  const [data, setData] = useState<DataContextState>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!currentUser && !auth.currentUser) return;

    migrateFlightsToSubcollection();

    const orgRef = getOrgDocRef();
    const unsubscribe = onSnapshot(orgRef, (snap) => {
      if (snap.exists()) {
        const firestoreData = snap.data();
        setData(prev => {
          const newState = { ...prev };
          Object.entries(firestoreData).forEach(([fsKey, val]) => {
            const lsKey = LOCAL_KEY_MAP[fsKey];
            if (lsKey) {
              (newState as Record<string, unknown>)[lsKey] = val;
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

  useEffect(() => {
    if (!currentUser && !auth.currentUser) return;

    const flightsRef = getFlightsCollectionRef();
    const unsubscribe = onSnapshot(flightsRef, (snap) => {
      const flights: DocumentData[] = [];
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

  const saveFlight = useCallback(async (flightData: DocumentData & { id: string | number }) => {
    if (!flightData || !flightData.id) throw new Error('Flight must have an id');
    const sanitized = sanitizeForFirestore({ ...flightData, _lastUpdated: Date.now() }) as DocumentData;

    const validation = validateFlight(sanitized);
    if (!validation.success) {
      console.error('Flight validation failed:', validation.error);
      throw new Error(`Invalid flight data: ${validation.error.issues.map((e: { message: string }) => e.message).join(', ')}`);
    }

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
      setData(prev => {
        const flights = prev.userFlights.filter(f => String(f.id) !== String(flightData.id));
        return { ...prev, userFlights: flights };
      });
      throw err;
    }
  }, []);

  const saveFlightsBatch = useCallback(async (flightsArray: (DocumentData & { id: string | number })[]) => {
    if (!flightsArray || flightsArray.length === 0) return;

    const sanitized = flightsArray.map(f => sanitizeForFirestore({ ...f, _lastUpdated: Date.now() }) as DocumentData);

    setData(prev => {
      const flightsMap = new Map((prev.userFlights || []).map(f => [String(f.id), f]));
      for (const f of sanitized) {
        flightsMap.set(String(f.id), f);
      }
      return { ...prev, userFlights: Array.from(flightsMap.values()) };
    });

    try {
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

  const deleteFlight = useCallback(async (flightId: string | number) => {
    if (!flightId) throw new Error('Flight id is required');
    const idStr = String(flightId);

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

  const updateData = useCallback(async (key: string, value: unknown) => {
    const fsKey = FIRESTORE_KEY_MAP[key] || key;
    const sanitizedValue = sanitizeForFirestore(value);

    setData(prev => ({ ...prev, [key]: value }));

    try {
      const orgRef = getOrgDocRef();
      try {
        await updateDoc(orgRef, { [fsKey]: sanitizedValue, _lastUpdated: Date.now() });
      } catch (updateErr) {
        if ((updateErr as { code?: string }).code === 'not-found' || (updateErr as Error).message?.includes('No document to update')) {
          await setDoc(orgRef, { [fsKey]: sanitizedValue, _lastUpdated: Date.now() });
        } else {
          throw updateErr;
        }
      }
    } catch (err) {
      console.error(`Failed to update cloud key ${key}:`, err);
      setData(prev => ({ ...prev, [key]: (dataRef.current as unknown as Record<string, unknown>)[key] }));
      throw err;
    }
  }, []);

  const updateDataBatch = useCallback(async (updates: Record<string, unknown>) => {
    const firestoreUpdates: Record<string, unknown> = { _lastUpdated: Date.now() };
    const localKeys: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
      const fsKey = FIRESTORE_KEY_MAP[key] || key;
      firestoreUpdates[fsKey] = sanitizeForFirestore(value);
      localKeys.push(key);
    }

    setData(prev => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(updates)) {
        (next as unknown as Record<string, unknown>)[key] = value;
      }
      return next;
    });

    try {
      const orgRef = getOrgDocRef();
      try {
        await updateDoc(orgRef, firestoreUpdates);
      } catch (updateErr) {
        if ((updateErr as { code?: string }).code === 'not-found' || (updateErr as Error).message?.includes('No document to update')) {
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
        (next as unknown as Record<string, unknown>)[key] = (dataRef.current as unknown as Record<string, unknown>)[key];
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

export const useData = (): DataContextValue => {
  const context = useContext(DataContext);
  if (context === null) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
