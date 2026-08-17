import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthSession, CurrentUser } from "@arutech/shared-types";
import { apiFetch, clearTokens, getAccessToken, getRefreshToken, storeTokens } from "./api-client";

interface AuthContextValue {
  user: CurrentUser | null;
  /** True only while the very first session check (on app launch) is in flight. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await apiFetch<CurrentUser>("/users/me");
      setUser(me);
    } catch {
      // apiFetch already cleared the stored tokens on an unrecoverable 401
      setUser(null);
    }
  }, []);

  useEffect(() => {
    loadUser().finally(() => setLoading(false));
  }, [loadUser]);

  const login = useCallback(async (email: string, password: string) => {
    const session = await apiFetch<AuthSession>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      { skipAuth: true },
    );
    await storeTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    const me = await apiFetch<CurrentUser>("/users/me");
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    // Best-effort server-side revocation (POST /auth/logout — the same
    // endpoint the web app's logout route calls) before wiping local
    // state; a failed network call must never leave the UI stuck signed
    // in, so local tokens are cleared regardless of whether this succeeds.
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) await apiFetch("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) });
    } catch {
      // already logged out from the client's perspective either way
    }
    await clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser: loadUser }),
    [user, loading, login, logout, loadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth() must be used inside <AuthProvider>");
  return context;
}
