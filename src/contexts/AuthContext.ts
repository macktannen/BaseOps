import { createContext } from 'react';

interface AuthContextValue {
  currentUser: {
    id: string;
    uid: string;
    name: string;
    email: string;
    roles: string[];
    role: string;
    viewOwnFlightsOnly: boolean;
    notifications?: boolean;
  } | null;
  login: (email: string, password: string) => Promise<unknown>;
  signup: (name: string, email: string, password: string) => Promise<unknown>;
  logout: () => Promise<void>;
  updateProfile: (updates: { name?: string }) => Promise<void>;
  can: (permission: string) => boolean;
  isAdmin: boolean;
  hasRole: (role: string) => boolean;
  getUserRoles: () => string[];
}

export const AuthContext = createContext<AuthContextValue | null>(null);
