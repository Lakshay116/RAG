import { createContext, useContext, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { roleCapabilities, SessionUser } from "./roles";

interface AuthContextValue {
  user: SessionUser | null;
  token: string | null;
  setSession: (token: string, user: SessionUser) => void;
  logout: () => void;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "rag_token";
const USER_KEY = "rag_user";

function loadUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<SessionUser | null>(() => loadUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      setSession: (nextToken, nextUser) => {
        setToken(nextToken);
        setUser(nextUser);
        localStorage.setItem(TOKEN_KEY, nextToken);
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      },
      logout: () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      },
      can: (permission) => (user ? roleCapabilities[user.role].includes(permission) : false)
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
