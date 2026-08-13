import { db } from '../firebase';
import {
  collection, doc, getDoc, setDoc, updateDoc, deleteDoc,
  getDocs, writeBatch, onSnapshot, query, orderBy
} from 'firebase/firestore';

const COLLECTIONS = {
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
};

function getUserCollection(userId, collectionName) {
  return collection(db, 'users', userId, collectionName);
}

function getUserDoc(userId, collectionName, docId) {
  return doc(db, 'users', userId, collectionName, docId);
}

export async function getUserData(userId, collectionName) {
  const snap = await getDocs(getUserCollection(userId, collectionName));
  const items = [];
  snap.forEach(d => items.push({ id: d.id, ...d.data() }));
  return items;
}

export async function getUserDataMap(userId, collectionName) {
  const snap = await getDocs(getUserCollection(userId, collectionName));
  const map = {};
  snap.forEach(d => { map[d.id] = d.data(); });
  return map;
}

export async function getUserDataField(userId, collectionName, docId) {
  const d = await getDoc(getUserDoc(userId, collectionName, docId));
  return d.exists() ? d.data() : null;
}

export async function setUserData(userId, collectionName, docId, data) {
  await setDoc(getUserDoc(userId, collectionName, docId), data, { merge: true });
}

export async function setUserDataBatch(userId, collectionName, items) {
  const batch = writeBatch(db);
  items.forEach(item => {
    const { id, ...data } = item;
    const ref = doc(getUserCollection(userId, collectionName), id);
    batch.set(ref, data, { merge: true });
  });
  await batch.commit();
}

export async function deleteUserData(userId, collectionName, docId) {
  await deleteDoc(getUserDoc(userId, collectionName, docId));
}

export async function deleteUserDataBatch(userId, collectionName, docIds) {
  const batch = writeBatch(db);
  docIds.forEach(id => {
    batch.delete(doc(getUserCollection(userId, collectionName), id));
  });
  await batch.commit();
}

export function subscribeToCollection(userId, collectionName, callback) {
  return onSnapshot(getUserCollection(userId, collectionName), (snap) => {
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    callback(items);
  });
}

export function subscribeToField(userId, collectionName, docId, callback) {
  return onSnapshot(getUserDoc(userId, collectionName, docId), (d) => {
    callback(d.exists() ? d.data() : null);
  });
}

export { COLLECTIONS };
