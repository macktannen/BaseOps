import { db } from '../firebase';
import {
  collection, doc, getDoc, setDoc, deleteDoc,
  getDocs, writeBatch, onSnapshot, DocumentData
} from 'firebase/firestore';

export const COLLECTIONS = {
  flights: 'userFlights',
  aircraft: 'userAircraft',
  pilots: 'userPilots',
  passengers: 'userPassengers',
  accounts: 'userAccounts',
  vendors: 'userVendors',
  contacts: 'globalContacts',
  customZones: 'userCustomZones',
  crewSchedules: 'crewSchedules',
  calendarNotes: 'calendarNotes',
  calendarViewSettings: 'calendarViewSettings',
  crewOrder: 'crewOrder',
  schedulesGridColorBy: 'schedulesGridColorBy',
  locationUsage: 'locationUsage',
  departmentExpenses: 'departmentExpenses',
  geminiApiKey: 'gemini_api_key',
  users: 'baseOpsUsers',
  currentUser: 'baseOpsCurrentUser',
} as const;

function getUserCollection(userId: string, collectionName: string) {
  return collection(db, 'users', userId, collectionName);
}

function getUserDoc(userId: string, collectionName: string, docId: string) {
  return doc(db, 'users', userId, collectionName, docId);
}

export async function getUserData(userId: string, collectionName: string): Promise<(DocumentData & { id: string })[]> {
  const snap = await getDocs(getUserCollection(userId, collectionName));
  const items: (DocumentData & { id: string })[] = [];
  snap.forEach(d => items.push({ id: d.id, ...d.data() }));
  return items;
}

export async function getUserDataMap(userId: string, collectionName: string): Promise<Record<string, DocumentData>> {
  const snap = await getDocs(getUserCollection(userId, collectionName));
  const map: Record<string, DocumentData> = {};
  snap.forEach(d => { map[d.id] = d.data(); });
  return map;
}

export async function getUserDataField(userId: string, collectionName: string, docId: string): Promise<DocumentData | null> {
  const d = await getDoc(getUserDoc(userId, collectionName, docId));
  return d.exists() ? d.data() : null;
}

export async function setUserData(userId: string, collectionName: string, docId: string, data: DocumentData): Promise<void> {
  await setDoc(getUserDoc(userId, collectionName, docId), data, { merge: true });
}

export async function setUserDataBatch(userId: string, collectionName: string, items: (DocumentData & { id: string })[]): Promise<void> {
  const batch = writeBatch(db);
  items.forEach(item => {
    const { id, ...data } = item;
    const ref = doc(getUserCollection(userId, collectionName), id);
    batch.set(ref, data, { merge: true });
  });
  await batch.commit();
}

export async function deleteUserData(userId: string, collectionName: string, docId: string): Promise<void> {
  await deleteDoc(getUserDoc(userId, collectionName, docId));
}

export async function deleteUserDataBatch(userId: string, collectionName: string, docIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  docIds.forEach(id => {
    batch.delete(doc(getUserCollection(userId, collectionName), id));
  });
  await batch.commit();
}

export function subscribeToCollection(
  userId: string,
  collectionName: string,
  callback: (items: (DocumentData & { id: string })[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(getUserCollection(userId, collectionName), (snap) => {
    const items: (DocumentData & { id: string })[] = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    callback(items);
  }, onError || ((_err) => { /* default: silently handle */ }));
}

export function subscribeToField(
  userId: string,
  collectionName: string,
  docId: string,
  callback: (data: DocumentData | null) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(getUserDoc(userId, collectionName, docId), (d) => {
    callback(d.exists() ? d.data() : null);
  }, onError || ((_err) => { /* default: silently handle */ }));
}
