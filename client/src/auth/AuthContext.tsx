import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../lib/api";

type User = {
  id: string;
  login_id: string;
  name: string;
  permission_level: number;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (login_id: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 앱 시작 시 로그인 유지 확인
  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ user: User }>("/api/auth/me");
        setUser(res.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (login_id, password) => {
        await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ login_id, password }),
        });
        const res = await api<{ user: User }>("/api/auth/me");
        setUser(res.user);
      },
      logout: async () => {
        await api("/api/auth/logout", { method: "POST" });
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
