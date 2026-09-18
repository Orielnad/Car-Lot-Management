import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from './api';
import type { AuthenticatedUser, LoginResponse, RoleName } from './types';

const USER_STORAGE_KEY = 'carlot.user';

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: RoleName[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredUser(): AuthenticatedUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthenticatedUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(() =>
    getToken() ? loadStoredUser() : null,
  );

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      async login(email: string, password: string) {
        const result = await api.post<LoginResponse>('/auth/login', { email, password });
        setToken(result.accessToken);
        setUser(result.user);
      },
      logout() {
        clearToken();
        setUser(null);
      },
      hasRole(...roles: RoleName[]) {
        return user !== null && roles.some((role) => user.roles.includes(role));
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
