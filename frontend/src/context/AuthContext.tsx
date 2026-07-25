import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { AuthUser } from "../types";
import { api } from "../lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("ragathon_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("ragathon_user");
      }
    }
    setLoading(false);
  }, []);

  function persist(res: LoginResponse) {
    localStorage.setItem("ragathon_token", res.token);
    localStorage.setItem("ragathon_user", JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  }

  async function login(email: string, password: string) {
    const res = await api.post<LoginResponse>("/auth/login", { email, password });
    return persist(res);
  }

  async function register(name: string, email: string, password: string) {
    const res = await api.post<LoginResponse>("/auth/register", { name, email, password });
    return persist(res);
  }

  function logout() {
    localStorage.removeItem("ragathon_token");
    localStorage.removeItem("ragathon_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
