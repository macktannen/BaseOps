import { auth, db } from '../firebase';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as fbUpdateProfile,
  updatePassword as fbUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, deleteDoc, DocumentData } from 'firebase/firestore';

const USERS_COLLECTION = 'users';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  roles: string[];
  role: string;
  viewOwnFlightsOnly: boolean;
  notifications: boolean;
  createdAt?: string;
}

export interface SessionUser {
  id: string;
  uid: string;
  name: string;
  email: string;
  roles: string[];
  role: string;
  viewOwnFlightsOnly: boolean;
  notifications?: boolean;
}

function userDocRef(uid: string) {
  return doc(db, USERS_COLLECTION, uid);
}

async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(userDocRef(uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

async function ensureUserProfile(fbUser: FirebaseUser, displayName?: string): Promise<UserProfile> {
  const uid = fbUser.uid;
  const email = (fbUser.email || '').toLowerCase();
  const existing = await getUserProfile(uid);

  if (!existing) {
    const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
    const isFirstUser = usersSnap.empty;

    const profile: UserProfile = {
      uid,
      name: displayName || fbUser.displayName || email.split('@')[0],
      email,
      roles: isFirstUser ? ['admin'] : ['view_only'],
      role: isFirstUser ? 'admin' : 'view_only',
      viewOwnFlightsOnly: false,
      notifications: true,
      createdAt: new Date().toISOString(),
    };
    await setDoc(userDocRef(uid), profile);
    return profile;
  }

  let changed = false;
  if (!Array.isArray(existing.roles)) {
    existing.roles = [existing.role || 'view_only'];
    existing.role = existing.roles[0];
    changed = true;
  }
  if (changed) {
    await updateDoc(userDocRef(uid), { roles: existing.roles, role: existing.role });
  }
  return existing;
}

function buildSessionUser(uid: string, profile: UserProfile): SessionUser {
  return {
    id: uid,
    uid,
    name: profile.name,
    email: profile.email,
    roles: profile.roles,
    role: profile.role,
    viewOwnFlightsOnly: profile.viewOwnFlightsOnly || false,
    notifications: profile.notifications ?? true,
  };
}

export const authService = {
  getUserProfile,

  login: async (email: string, password: string): Promise<SessionUser> => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    const profile = await ensureUserProfile(cred.user);
    return buildSessionUser(uid, profile);
  },

  signup: async (name: string, email: string, password: string): Promise<SessionUser> => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    await fbUpdateProfile(cred.user, { displayName: name });
    const profile = await ensureUserProfile(cred.user, name);
    return buildSessionUser(uid, profile);
  },

  adminCreateUser: async (name: string, email: string, password: string, roles: string | string[]): Promise<UserProfile> => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    await fbUpdateProfile(cred.user, { displayName: name });
    const rolesArr = Array.isArray(roles) ? roles : [roles || 'view_only'];
    const profile: UserProfile = {
      uid,
      name,
      email,
      roles: rolesArr,
      role: rolesArr[0],
      viewOwnFlightsOnly: false,
      notifications: true,
      createdAt: new Date().toISOString(),
    };
    await setDoc(userDocRef(uid), profile);
    return profile;
  },

  logout: async (): Promise<void> => {
    await signOut(auth);
  },

  getCurrentUser: (): SessionUser | null => {
    const fbUser = auth.currentUser;
    if (!fbUser) return null;
    const cached = localStorage.getItem('baseOpsCurrentUser');
    if (cached) {
      try { return JSON.parse(cached); } catch { localStorage.removeItem('baseOpsCurrentUser'); }
    }
    return {
      id: fbUser.uid,
      uid: fbUser.uid,
      name: fbUser.displayName || fbUser.email!.split('@')[0],
      email: fbUser.email!,
      roles: ['view_only'],
      role: 'view_only',
      viewOwnFlightsOnly: false,
    };
  },

  getUsers: async (): Promise<(DocumentData & { id: string })[]> => {
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    const users: (DocumentData & { id: string })[] = [];
    snap.forEach(d => users.push({ id: d.id, ...d.data() }));
    return users;
  },

  deleteUser: async (uid: string): Promise<void> => {
    await deleteDoc(userDocRef(uid));
  },

  updateUserRoles: async (uid: string, roles: string | string[]): Promise<void> => {
    const rolesArr = Array.isArray(roles) ? roles : [roles];
    await updateDoc(userDocRef(uid), { roles: rolesArr, role: rolesArr[0] });
  },

  updateUserRole: async (uid: string, newRole: string): Promise<void> => {
    return authService.updateUserRoles(uid, [newRole]);
  },

  updateProfile: async (uid: string, updates: Partial<UserProfile>): Promise<SessionUser | UserProfile | null> => {
    await updateDoc(userDocRef(uid), updates);
    const fbUser = auth.currentUser;
    if (fbUser && fbUser.uid === uid && updates.name) {
      await fbUpdateProfile(fbUser, { displayName: updates.name });
    }
    const profile = await getUserProfile(uid);
    if (fbUser && fbUser.uid === uid && profile) {
      return buildSessionUser(uid, profile);
    }
    return profile;
  },

  updatePassword: async (_uid: string, currentPassword: string, newPassword: string): Promise<boolean> => {
    const fbUser = auth.currentUser;
    if (!fbUser) throw new Error('Not authenticated');
    const credential = EmailAuthProvider.credential(fbUser.email!, currentPassword);
    await reauthenticateWithCredential(fbUser, credential);
    await fbUpdatePassword(fbUser, newPassword);
    return true;
  },
};
