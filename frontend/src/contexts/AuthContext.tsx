import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setAccessToken, setUnauthorizedHandler } from "@/lib/api";
import * as authService from "@/services/authService";
import type { AuthUser } from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refreshSession(): Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const data = await authService.refreshRequest();

    if (!data) {
      clearSession();
      return false;
    }

    setTokenState(data.accessToken);
    setUser(data.user);
    return true;
  }, [clearSession]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const data = await authService.refreshRequest();
        if (!active) {
          return;
        }

        if (data) {
          setTokenState(data.accessToken);
          setUser(data.user);
        } else {
          clearSession();
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [clearSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authService.loginRequest(email, password);
    setTokenState(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await authService.logoutRequest();
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user && accessToken),
      isLoading,
      login,
      logout,
      refreshSession,
    }),
    [user, accessToken, isLoading, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }

  return context;
}
