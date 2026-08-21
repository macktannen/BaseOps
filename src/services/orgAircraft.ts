import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Aircraft } from '../types';

function getOrgName(): string {
  const isDev = import.meta.env.DEV || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
  return isDev ? 'dev_sandbox' : 'default';
}

export async function fetchFreshAircraft(): Promise<Aircraft[]> {
  try {
    const snap = await getDoc(doc(db, 'orgs', getOrgName()));
    if (!snap.exists()) return [];
    const data = snap.data() as Record<string, unknown>;
    return Array.isArray(data.aircraft) ? (data.aircraft as Aircraft[]) : [];
  } catch (err) {
    console.error('Failed to fetch fresh aircraft:', err);
    return [];
  }
}
