'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/contexts/toast-context';
import { AnalyticsEventName, trackAnalyticsEvent } from '@/lib/analytics';
import {
  type AuthUser,
  type AuthResponse,
  type LoginFormData,
  type RegisterFormData,
  storeTokens,
  clearTokens,
  getStoredTokens,
  getAccessTokenExpiresAt,
  refreshTokens,
} from '@/lib/auth';

// ── Context shape ──

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ──

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { error: showErrorToast } = useToast();
  const isHandlingUnauthorizedRef = useRef(false);
  const hasShownUnauthorizedToastRef = useRef(false);
  const proactiveRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // ── Proactive token refresh ──
  // Schedules a silent refresh 60s before the access token expires.
  // Re-runs every time `user` changes (new tokens stored after login/refresh).
  const scheduleProactiveRefresh = useCallback(() => {
    if (proactiveRefreshTimerRef.current) {
      clearTimeout(proactiveRefreshTimerRef.current);
      proactiveRefreshTimerRef.current = null;
    }

    const expiresAt = getAccessTokenExpiresAt();
    if (!expiresAt) return;

    const msUntilRefresh = expiresAt - Date.now() - 60_000; // 60s before expiry
    if (msUntilRefresh <= 0) return; // already expired or too close

    proactiveRefreshTimerRef.current = setTimeout(async () => {
      try {
        await refreshTokens();
        scheduleProactiveRefresh(); // reschedule for the new token
      } catch {
        // Will be caught by the 401 interceptor on next request
      }
    }, msUntilRefresh);
  }, []);

  useEffect(() => {
    scheduleProactiveRefresh();
    return () => {
      if (proactiveRefreshTimerRef.current) {
        clearTimeout(proactiveRefreshTimerRef.current);
      }
    };
  }, [user, scheduleProactiveRefresh]);

  const notifyAuthorizationLost = useCallback(() => {
    if (hasShownUnauthorizedToastRef.current) return;

    hasShownUnauthorizedToastRef.current = true;

    showErrorToast({
      title: 'Sesja wygasła',
      description: 'Zaloguj się ponownie, aby kontynuować pracę.',
      duration: 5000,
    });

    window.setTimeout(() => {
      hasShownUnauthorizedToastRef.current = false;
    }, 1000);
  }, [showErrorToast]);

  const performLogout = useCallback(
    (redirectToLogin = true) => {
      clearTokens();
      setUser(null);
      setIsLoading(false);

      if (redirectToLogin) {
        router.push('/login');
      }
    },
    [router],
  );

  /** Fetch current user profile from /auth/me. */
  const fetchUser = useCallback(async () => {
    const tokens = getStoredTokens();
    if (!tokens) {
      setIsLoading(false);
      return;
    }

    try {
      const profile = await apiFetch<AuthUser>('/auth/me');
      setUser(profile);
    } catch {
      const shouldRedirect = pathname?.startsWith('/dashboard') ?? false;
      notifyAuthorizationLost();
      performLogout(shouldRedirect);
    } finally {
      setIsLoading(false);
    }
  }, [notifyAuthorizationLost, pathname, performLogout]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      if (isHandlingUnauthorizedRef.current) return;
      isHandlingUnauthorizedRef.current = true;

      const shouldRedirect =
        pathname?.startsWith('/dashboard') || !!getStoredTokens();

      notifyAuthorizationLost();
      performLogout(shouldRedirect);

      window.setTimeout(() => {
        isHandlingUnauthorizedRef.current = false;
      }, 0);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [notifyAuthorizationLost, pathname, performLogout]);

  const login = useCallback(
    async (data: LoginFormData) => {
      const res = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: data,
        skipAuth: true,
      });
      storeTokens(res);
      setUser(res.user);
      trackAnalyticsEvent({
        name: AnalyticsEventName.SIGNUP_COMPLETED,
        properties: {
          planCode: res.user.entitlements.plan.code,
          agencyId: res.user.agency?.id ?? null,
        },
      });
      router.push('/dashboard');
    },
    [router],
  );

  const register = useCallback(
    async (data: RegisterFormData) => {
      const res = await apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: data,
        skipAuth: true,
      });
      storeTokens(res);
      setUser(res.user);
      router.push('/dashboard');
    },
    [router],
  );

  const logout = useCallback(() => {
    performLogout(true);
  }, [performLogout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
