import { createContext, useContext, useState, type ReactNode } from "react";
import type { User } from "../types/index.js";
import { api } from "./api.js";

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): User | null {
  const raw = localStorage.getItem("aocc_user");
  return raw ? (JSON.parse(raw) as User) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser());

  async function login(email: string, password: string) {
    const res = await api.post<{ token: string; user: { id: string; email: string; role: User["role"] } }>(
      "/auth/login",
      { email, password }
    );
    const authedUser: User = { sub: res.user.id, email: res.user.email, role: res.user.role };
    localStorage.setItem("aocc_token", res.token);
    localStorage.setItem("aocc_user", JSON.stringify(authedUser));
    setUser(authedUser);
  }

  function logout() {
    localStorage.removeItem("aocc_token");
    localStorage.removeItem("aocc_user");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
