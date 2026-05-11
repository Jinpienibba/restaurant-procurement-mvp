import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const TOKEN_KEY = 'procurement_token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) return undefined;

    let cancelled = false;
     (async () => {
       try {
         const me = await api('/auth/me', { token });
         if (cancelled) return;
         setUser({ id: me.userId, email: me.email });
       } catch {
         if (cancelled) return;
         logout();
       }
     })();

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

   const login = useCallback(async (email, password) => {
     const data = await api('/auth/login', {
       method: 'POST',
       body: { email, password },
     });
     localStorage.setItem(TOKEN_KEY, data.token);
     setToken(data.token);
     setUser(data.user);
     return data;
   }, []);

   const signup = useCallback(async (payload) => {
     const data = await api('/auth/signup', {
       method: 'POST',
       body: payload,
     });
     localStorage.setItem(TOKEN_KEY, data.token);
     setToken(data.token);
     setUser(data.user);
     return data;
   }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      signup,
      logout,
    }),
    [token, user, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
