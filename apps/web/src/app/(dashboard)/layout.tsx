'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  isPrivateSellerUser,
  PRIVATE_SELLER_HOME_PATH,
} from '@/lib/auth';
import {
  DashboardMobileBottomNav,
  DashboardSidebar,
  useDashboardNavCounts,
} from '@/components/dashboard/sidebar';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { PlanLimitStatusBanner } from '@/components/growth/plan-limit-status-banner';

/** Shell layout for all authenticated /dashboard/* pages. */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const isPrivateSeller = user ? isPrivateSellerUser(user) : false;
  const canPrivateSellerUseDashboardRoute = pathname === '/dashboard/upgrade';
  const shouldShowGlobalLimitBanner = !hasContextualLimitBanner(pathname);
  const isAdminRoute =
    user?.role === 'admin' &&
    (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/dashboard/blog'));
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);
  const navCounts = useDashboardNavCounts(!isLoading && Boolean(user) && !isPrivateSeller);

  useEffect(() => {
    if (
      !isLoading &&
      isPrivateSeller &&
      !canPrivateSellerUseDashboardRoute
    ) {
      router.replace(PRIVATE_SELLER_HOME_PATH);
    }
  }, [canPrivateSellerUseDashboardRoute, isLoading, isPrivateSeller, router]);

  if (
    isLoading ||
    (isPrivateSeller && !canPrivateSellerUseDashboardRoute)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    // Middleware handles redirect, but just in case show nothing
    return null;
  }

  if (isPrivateSeller) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar
        isMobileOpen={isMobileNavOpen}
        onMobileClose={closeMobileNav}
        counts={navCounts}
      />
      <div className="flex flex-1 flex-col lg:ml-64">
        <DashboardTopbar onMenuClick={() => setIsMobileNavOpen(true)} />
        <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pt-6 lg:pb-6">
          <div className="space-y-6">
            {shouldShowGlobalLimitBanner ? (
              <PlanLimitStatusBanner
                user={user}
                source="dashboard_global_limit_state"
              />
            ) : null}
            {isAdminRoute ? <AdminModeBanner pathname={pathname} /> : null}
            {children}
          </div>
        </main>
        <DashboardMobileBottomNav counts={navCounts} />
      </div>
    </div>
  );
}

function AdminModeBanner({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col gap-2 border-y border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">Tryb administratora</p>
          <p className="text-xs leading-5 text-amber-800">
            Zmiany w tym obszarze mogą wpływać na plany, limity, widoczność
            publiczną albo dane użytkowników.
          </p>
        </div>
      </div>
      <span className="text-xs font-medium text-amber-800">{pathname}</span>
    </div>
  );
}

function hasContextualLimitBanner(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard/listings') ||
    pathname.startsWith('/dashboard/clients') ||
    pathname.startsWith('/dashboard/calendar')
  );
}
