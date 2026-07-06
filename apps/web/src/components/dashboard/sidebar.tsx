'use client';

import { useEffect, useMemo, useState, type ElementType } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Handshake,
  CalendarCheck,
  ClipboardList,
  BarChart3,
  MessageSquareText,
  MessagesSquare,
  ShieldCheck,
  Settings,
  LogOut,
  ThumbsUp,
  Newspaper,
  CreditCard,
  BookOpenCheck,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/common/logo';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { fetchDashboardToday, type DashboardTodayResponse } from '@/lib/dashboard';
import { cn } from '@/lib/utils';

export interface DashboardNavCounts {
  inquiries: number;
  tasks: number;
  calendar: number;
}

interface DashboardNavItem {
  label: string;
  href: string;
  icon: ElementType;
  exact?: boolean;
  countKey?: keyof DashboardNavCounts;
}

interface DashboardNavGroup {
  label: string;
  items: DashboardNavItem[];
}

const navGroups: DashboardNavGroup[] = [
  {
    label: 'Praca',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
      {
        label: 'Zapytania',
        href: '/dashboard/inquiries',
        icon: MessageSquareText,
        countKey: 'inquiries',
      },
      {
        label: 'Zadania',
        href: '/dashboard/tasks',
        icon: ClipboardList,
        countKey: 'tasks',
      },
      {
        label: 'Kalendarz',
        href: '/dashboard/calendar',
        icon: CalendarCheck,
        countKey: 'calendar',
      },
    ],
  },
  {
    label: 'CRM',
    items: [
      { label: 'Oferty', href: '/dashboard/listings', icon: Building2 },
      { label: 'Klienci', href: '/dashboard/clients', icon: Users },
      { label: 'Transakcje', href: '/dashboard/transactions', icon: Handshake },
    ],
  },
  {
    label: 'Analiza',
    items: [{ label: 'Raporty', href: '/dashboard/reports', icon: BarChart3 }],
  },
  {
    label: 'Rozwój',
    items: [
      {
        label: 'Samouczek',
        href: '/dashboard/tutorial',
        icon: BookOpenCheck,
      },
      {
        label: 'Moje zgłoszenia',
        href: '/dashboard/feedback',
        icon: MessagesSquare,
        exact: true,
      },
      {
        label: 'Ankiety',
        href: '/dashboard/feedback/surveys',
        icon: ClipboardList,
      },
      {
        label: 'Głosowanie',
        href: '/dashboard/feedback/ideas',
        icon: ThumbsUp,
      },
    ],
  },
];

const onboardingNavGroups: DashboardNavGroup[] = [
  {
    label: 'Praca',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
      {
        label: 'Zapytania',
        href: '/dashboard/inquiries',
        icon: MessageSquareText,
        countKey: 'inquiries',
      },
      {
        label: 'Zadania',
        href: '/dashboard/tasks',
        icon: ClipboardList,
        countKey: 'tasks',
      },
      {
        label: 'Kalendarz',
        href: '/dashboard/calendar',
        icon: CalendarCheck,
        countKey: 'calendar',
      },
    ],
  },
  {
    label: 'CRM',
    items: [
      { label: 'Oferty', href: '/dashboard/listings', icon: Building2 },
      { label: 'Klienci', href: '/dashboard/clients', icon: Users },
    ],
  },
  {
    label: 'Start',
    items: [
      {
        label: 'Samouczek',
        href: '/dashboard/tutorial',
        icon: BookOpenCheck,
      },
    ],
  },
];

const adminGroup: DashboardNavGroup = {
  label: 'Admin',
  items: [
    {
      label: 'Feedback',
      href: '/dashboard/admin/feedback',
      icon: ShieldCheck,
    },
    {
      label: 'Analytics',
      href: '/dashboard/admin/analytics',
      icon: BarChart3,
    },
    {
      label: 'Blog',
      href: '/dashboard/blog',
      icon: Newspaper,
    },
    {
      label: 'Moderacja ofert',
      href: '/dashboard/admin/submissions',
      icon: ClipboardList,
    },
    {
      label: 'Plany',
      href: '/dashboard/admin/plans',
      icon: CreditCard,
    },
  ],
};

const mobileBottomItems: DashboardNavItem[] = [
  { label: 'Dzisiaj', href: '/dashboard', icon: LayoutDashboard, exact: true },
  {
    label: 'Zapytania',
    href: '/dashboard/inquiries',
    icon: MessageSquareText,
    countKey: 'inquiries',
  },
  {
    label: 'Kalendarz',
    href: '/dashboard/calendar',
    icon: CalendarCheck,
    countKey: 'calendar',
  },
  {
    label: 'Zadania',
    href: '/dashboard/tasks',
    icon: ClipboardList,
    countKey: 'tasks',
  },
] as const;

const bottomItems = [
  { label: 'Ustawienia', href: '/dashboard/settings', icon: Settings },
] as const;

export function DashboardSidebar({
  isMobileOpen = false,
  onMobileClose,
  counts,
}: {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  counts: DashboardNavCounts;
}) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const isInitialOnboarding = useInitialOnboardingPeriod(user?.createdAt);
  const visibleGroups = useMemo(
    () => {
      if (user?.role === 'admin') {
        return [...navGroups, adminGroup];
      }

      return isInitialOnboarding ? onboardingNavGroups : navGroups;
    },
    [isInitialOnboarding, user?.role],
  );

  useEffect(() => {
    onMobileClose?.();
  }, [onMobileClose, pathname]);

  return (
    <>
      {isMobileOpen ? (
        <button
          type="button"
          aria-label="Zamknij menu"
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[86vw] flex-col border-r border-border bg-card shadow-xl transition-transform duration-200 lg:z-40 lg:w-64 lg:translate-x-0 lg:shadow-none',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-6">
        <Link href="/dashboard">
          <Logo size="sm" />
        </Link>
        <button
          type="button"
          aria-label="Zamknij menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          onClick={onMobileClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <DashboardNavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  count={item.countKey ? counts[item.countKey] : 0}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-border px-3 py-4 space-y-1">
        {bottomItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Wyloguj się
        </button>
      </div>
    </aside>
    </>
  );
}

export function DashboardMobileBottomNav({
  counts,
}: {
  counts: DashboardNavCounts;
}) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-md lg:hidden"
      aria-label="Szybka nawigacja dashboardu"
    >
      <div className="grid grid-cols-4 gap-1">
        {mobileBottomItems.map((item) => {
          const isActive = isNavItemActive(pathname, item);
          const count = item.countKey ? counts[item.countKey] : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.68rem] font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="max-w-full truncate">{item.label}</span>
              {count > 0 ? (
                <span className="absolute right-3 top-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[0.6rem] leading-4 text-destructive-foreground">
                  {formatNavCount(count)}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function DashboardNavLink({
  item,
  pathname,
  count,
}: {
  item: DashboardNavItem;
  pathname: string;
  count: number;
}) {
  const isActive = isNavItemActive(pathname, item);

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {count > 0 ? (
        <Badge variant="destructive" className="rounded-full px-2 py-0 text-[0.68rem]">
          {formatNavCount(count)}
        </Badge>
      ) : null}
    </Link>
  );
}

export function useDashboardNavCounts(enabled = true): DashboardNavCounts {
  const [today, setToday] = useState<DashboardTodayResponse | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;

    fetchDashboardToday()
      .then((result) => {
        if (isMounted) {
          setToday(result);
        }
      })
      .catch(() => {
        if (isMounted) {
          setToday(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  return useMemo(() => {
    const items = today?.items ?? [];

    return {
      inquiries: items.filter((item) => item.type === 'public_lead').length,
      tasks: items.filter((item) => item.type === 'task').length,
      calendar: items.filter((item) => item.type === 'appointment').length,
    };
  }, [today?.items]);
}

function isNavItemActive(pathname: string, item: DashboardNavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function formatNavCount(value: number): string {
  return value > 9 ? '9+' : String(value);
}

function useInitialOnboardingPeriod(createdAt?: string): boolean {
  const [isInitialOnboarding, setIsInitialOnboarding] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsInitialOnboarding(
        isInInitialOnboardingPeriod(createdAt, Date.now()),
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [createdAt]);

  return isInitialOnboarding;
}

function isInInitialOnboardingPeriod(
  createdAt: string | undefined,
  nowMs: number,
): boolean {
  if (!createdAt) {
    return false;
  }

  const createdAtMs = new Date(createdAt).getTime();

  if (!Number.isFinite(createdAtMs)) {
    return false;
  }

  const onboardingPeriodMs = 7 * 24 * 60 * 60 * 1000;

  return nowMs - createdAtMs < onboardingPeriodMs;
}
