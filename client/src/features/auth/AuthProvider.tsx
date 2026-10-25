import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, postJson } from "../../lib/api";
import type { User } from "../../types/domain";
import { demoUser, isDemoModeEnabled, setDemoMode, useDemoModeShortcut } from "../demo/demoMode";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useDemoModeShortcut();

  useEffect(() => {
    if (isDemoModeEnabled()) {
      setUser(demoUser);
      setLoading(false);
      return;
    }

    api<{ user: User }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("fairshare_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleDemoChange() {
      if (isDemoModeEnabled()) {
        setUser(demoUser);
        setLoading(false);
      } else {
        localStorage.removeItem("fairshare_token");
        setUser(null);
        setLoading(false);
      }
    }

    window.addEventListener("fairshare-demo-change", handleDemoChange);
    return () => window.removeEventListener("fairshare-demo-change", handleDemoChange);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password) {
        const data = await postJson<{ user: User; token?: string }>("/api/auth/login", { email, password });
        if (data.token) {
          localStorage.setItem("fairshare_token", data.token);
        }
        setUser(data.user);
      },
      async signup(name, email, password) {
        const data = await postJson<{ user: User; token?: string }>("/api/auth/signup", { name, email, password });
        if (data.token) {
          localStorage.setItem("fairshare_token", data.token);
        }
        setUser(data.user);
      },
      async logout() {
        if (isDemoModeEnabled()) {
          setDemoMode(false);
          localStorage.removeItem("fairshare_token");
          setUser(null);
          return;
        }
        try {
          await postJson<void>("/api/auth/logout", {});
        } finally {
          localStorage.removeItem("fairshare_token");
          setUser(null);
        }
      }
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
