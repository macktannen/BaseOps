import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { authService } from '../services/authService';
import { can as permCan, isAdmin as permIsAdmin, hasRole, getUserRoles } from '../services/permissionService';
import { AuthContext } from './AuthContext';
import { setUserId, initStore, stopRealtimeSync } from '../services/dataStore';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUserId(fbUser.uid);
        const profile = await authService.getUserProfile(fbUser.uid);
        if (profile) {
          const user = {
            id: fbUser.uid,
            uid: fbUser.uid,
            name: profile.name,
            email: profile.email,
            roles: profile.roles,
            role: profile.role,
            viewOwnFlightsOnly: profile.viewOwnFlightsOnly || false,
            notifications: profile.notifications ?? true,
          };
          localStorage.setItem('baseOpsCurrentUser', JSON.stringify(user));
          setCurrentUser(user);
          await initStore();
        } else {
          localStorage.removeItem('baseOpsCurrentUser');
          setCurrentUser(null);
        }
      } else {
        localStorage.removeItem('baseOpsCurrentUser');
        setCurrentUser(null);
        stopRealtimeSync();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const user = await authService.login(email, password);
    localStorage.setItem('baseOpsCurrentUser', JSON.stringify(user));
    setCurrentUser(user);
    await initStore();
    return user;
  };

  const signup = async (name, email, password) => {
    const user = await authService.signup(name, email, password);
    localStorage.setItem('baseOpsCurrentUser', JSON.stringify(user));
    setCurrentUser(user);
    await initStore();
    return user;
  };

  const logout = async () => {
    await authService.logout();
    localStorage.removeItem('baseOpsCurrentUser');
    setCurrentUser(null);
    stopRealtimeSync();
  };

  const updateProfile = async (updates) => {
    const updatedUser = await authService.updateProfile(currentUser.id || currentUser.uid, updates);
    localStorage.setItem('baseOpsCurrentUser', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
  };

  const can = (permission) => permCan(currentUser, permission);

  const value = {
    currentUser,
    login,
    signup,
    logout,
    updateProfile,
    can,
    isAdmin: permIsAdmin(currentUser),
    hasRole: (role) => hasRole(currentUser, role),
    getUserRoles: () => getUserRoles(currentUser),
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
