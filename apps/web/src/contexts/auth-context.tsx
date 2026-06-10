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
import { useToast } from '@/contexts/toast-context';
import { AnalyticsEventName, trackAnalyticsEvent } from '@/lib/analytics';
import { apiFetch } from '@/lib/api-client';
import { fetchCurrentUser } from '@/lib/account';
import {
  type AuthUser,
  type AuthResponse,
  type LoginFormData,
  type RegisterFormData,
  clearLegacyAuthTokens,
  getAuthenticatedRedirectPath,
} from '@/lib/auth';

// ── Context shape ──

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    data: LoginFormData,
    options?: AuthRedirectOptions,
  ) => Promise<AuthResponse>;
  register: (
    data: RegisterFormData,
    options?: AuthRedirectOptions,
  ) => Promise<AuthResponse>;
  refreshUser: () => Promise<AuthUser | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthRedirectOptions {
  redirectTo?: string;
  skipRedirect?: boolean;
}

// ── Provider ──

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { error: showErrorToast } = useToast();
  const isHandlingUnauthorizedRef = useRef(false);
  const hasShownUnauthorizedToastRef = useRef(false);

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
      clearLegacyAuthTokens();
      setUser(null);
      setIsLoading(false);

      void apiFetch<void>('/auth/logout', {
        method: 'POST',
        skipAuth: true,
      }).catch(() => undefined);

      if (redirectToLogin) {
        router.push('/login');
      }
    },
    [router],
  );

  /** Fetch current user profile from /auth/me and sync context state. */
  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const profile = await fetchCurrentUser();
      setUser(profile);
      return profile;
    } catch {
      const shouldRedirect = pathname?.startsWith('/dashboard') ?? false;
      if (shouldRedirect) {
        notifyAuthorizationLost();
        performLogout(true);
      } else {
        setUser(null);
        setIsLoading(false);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [notifyAuthorizationLost, pathname, performLogout]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      if (isHandlingUnauthorizedRef.current) return;
      isHandlingUnauthorizedRef.current = true;

      const shouldRedirect = pathname?.startsWith('/dashboard') ?? false;

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
    async (data: LoginFormData, options?: AuthRedirectOptions) => {
      const res = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: data,
        skipAuth: true,
      });
      clearLegacyAuthTokens();
      setUser(res.user);
      trackAnalyticsEvent({
        name: AnalyticsEventName.SIGNUP_COMPLETED,
        properties: {
          planCode: res.user.entitlements.plan.code,
          agencyId: res.user.agency?.id ?? null,
        },
      });
      if (!options?.skipRedirect) {
        router.push(
          getAuthenticatedRedirectPath(res.user, options?.redirectTo),
        );
      }
      return res;
    },
    [router],
  );

  const register = useCallback(
    async (data: RegisterFormData, options?: AuthRedirectOptions) => {
      const res = await apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: data,
        skipAuth: true,
      });
      clearLegacyAuthTokens();
      setUser(res.user);
      if (!options?.skipRedirect) {
        router.push(
          getAuthenticatedRedirectPath(res.user, options?.redirectTo),
        );
      }
      return res;
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
      refreshUser,
      logout,
    }),
    [user, isLoading, login, register, refreshUser, logout],
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
