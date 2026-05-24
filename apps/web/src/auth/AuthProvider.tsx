import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const SESSION_KEY = "triage-ai-session";
export const TEST_EMAIL = "demo@triage.ai";
export const TEST_PASSWORD = "demo1234";

export type TestSession = {
  email: string;
  name: string;
  createdAt: string;
};

type AuthContextValue = {
  session: TestSession | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): TestSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as TestSession) : null;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<TestSession | null>(() => readSession());

  useEffect(() => {
    setSession(readSession());
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    isAuthenticated: Boolean(session),
    async login(email, password) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== TEST_EMAIL || password !== TEST_PASSWORD) {
        return { ok: false, message: "Неверный email или пароль для тестового доступа." };
      }

      const nextSession: TestSession = {
        email: normalizedEmail,
        name: "Тестовый пользователь",
        createdAt: new Date().toISOString()
      };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
      return { ok: true };
    },
    logout() {
      window.localStorage.removeItem(SESSION_KEY);
      setSession(null);
    }
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
