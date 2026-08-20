import React, { useState, useEffect, ReactNode } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { authService, SessionUser } from '../services/authService';
import { can as permCan, isAdmin as permIsAdmin, hasRole, getUserRoles } from '../services/permissionService';
import { AuthContext } from './AuthContext';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = await authService.getUserProfile(fbUser.uid);
        if (!isMounted) return;

        if (profile) {
          const user: SessionUser = {
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
        } else {
          localStorage.removeItem('baseOpsCurrentUser');
          setCurrentUser(null);
        }
      } else {
        if (!isMounted) return;
        localStorage.removeItem('baseOpsCurrentUser');
        setCurrentUser(null);
      }
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const user = await authService.login(email, password);
    localStorage.setItem('baseOpsCurrentUser', JSON.stringify(user));
    setCurrentUser(user);
    return user;
  };

  const signup = async (name: string, email: string, password: string) => {
    const user = await authService.signup(name, email, password);
    localStorage.setItem('baseOpsCurrentUser', JSON.stringify(user));
    setCurrentUser(user);
    return user;
  };

  const logout = async () => {
    await authService.logout();
    localStorage.removeItem('baseOpsCurrentUser');
    setCurrentUser(null);
  };

  const updateProfile = async (updates: { name?: string }) => {
    const updatedUser = await authService.updateProfile(currentUser!.id || currentUser!.uid, updates);
    localStorage.setItem('baseOpsCurrentUser', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser as SessionUser);
  };

  const can = (permission: string) => permCan(currentUser, permission);

  const value = {
    currentUser,
    login,
    signup,
    logout,
    updateProfile,
    can,
    isAdmin: permIsAdmin(currentUser),
    hasRole: (role: string) => hasRole(currentUser, role),
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
