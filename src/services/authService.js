import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as fbUpdateProfile,
  updatePassword as fbUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { setUserId } from './dataStore';

const USERS_COLLECTION = 'users';

function userDocRef(uid) {
  return doc(db, USERS_COLLECTION, uid);
}

async function getUserProfile(uid) {
  const snap = await getDoc(userDocRef(uid));
  return snap.exists() ? snap.data() : null;
}

async function ensureUserProfile(fbUser, displayName) {
  const uid = fbUser.uid;
  const email = fbUser.email;
  const existing = await getUserProfile(uid);

  if (!existing) {
    const profile = {
      uid,
      name: displayName || fbUser.displayName || email.split('@')[0],
      email,
      roles: email === 'chadmckie@gmail.com' ? ['admin'] : ['view_only'],
      role: email === 'chadmckie@gmail.com' ? 'admin' : 'view_only',
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
  if (email === 'chadmckie@gmail.com' && !existing.roles.includes('admin')) {
    existing.roles = ['admin'];
    existing.role = 'admin';
    changed = true;
  }
  if (changed) {
    await updateDoc(userDocRef(uid), { roles: existing.roles, role: existing.role });
  }
  return existing;
}

function buildSessionUser(uid, profile) {
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

  login: async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    const profile = await ensureUserProfile(cred.user);
    setUserId(uid);
    return buildSessionUser(uid, profile);
  },

  signup: async (name, email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    await fbUpdateProfile(cred.user, { displayName: name });
    const profile = await ensureUserProfile(cred.user, name);
    setUserId(uid);
    return buildSessionUser(uid, profile);
  },

  adminCreateUser: async (name, email, password, roles) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    await fbUpdateProfile(cred.user, { displayName: name });
    const rolesArr = Array.isArray(roles) ? roles : [roles || 'view_only'];
    const profile = {
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

  logout: async () => {
    await signOut(auth);
    setUserId(null);
  },

  getCurrentUser: () => {
    const fbUser = auth.currentUser;
    if (!fbUser) return null;
    const cached = localStorage.getItem('baseOpsCurrentUser');
    if (cached) {
      try { return JSON.parse(cached); } catch {}
    }
    return {
      id: fbUser.uid,
      uid: fbUser.uid,
      name: fbUser.displayName || fbUser.email.split('@')[0],
      email: fbUser.email,
      roles: ['view_only'],
      role: 'view_only',
      viewOwnFlightsOnly: false,
    };
  },

  getUsers: async () => {
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    const users = [];
    snap.forEach(d => users.push({ id: d.id, ...d.data() }));
    return users;
  },

  deleteUser: async (uid) => {
    await deleteDoc(userDocRef(uid));
  },

  updateUserRoles: async (uid, roles) => {
    const rolesArr = Array.isArray(roles) ? roles : [roles];
    await updateDoc(userDocRef(uid), { roles: rolesArr, role: rolesArr[0] });
  },

  updateUserRole: async (uid, newRole) => {
    return authService.updateUserRoles(uid, [newRole]);
  },

  updateProfile: async (uid, updates) => {
    await updateDoc(userDocRef(uid), updates);
    const fbUser = auth.currentUser;
    if (fbUser && fbUser.uid === uid && updates.name) {
      await fbUpdateProfile(fbUser, { displayName: updates.name });
    }
    const profile = await getUserProfile(uid);
    if (fbUser && fbUser.uid === uid) {
      return buildSessionUser(uid, profile);
    }
    return profile;
  },

  updatePassword: async (uid, currentPassword, newPassword) => {
    const fbUser = auth.currentUser;
    if (!fbUser) throw new Error('Not authenticated');
    const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
    await reauthenticateWithCredential(fbUser, credential);
    await fbUpdatePassword(fbUser, newPassword);
    return true;
  },

  saveUsers: async (users) => {
    console.warn('saveUsers called — use individual update methods instead');
  },
};
