'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  isPrivateSellerUser,
  PRIVATE_SELLER_HOME_PATH,
} from '@/lib/auth';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardTopbar } from '@/components/dashboard/topbar';

/** Shell layout for all authenticated /dashboard/* pages. */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isPrivateSeller = user ? isPrivateSellerUser(user) : false;
  const canPrivateSellerUseDashboardRoute = pathname === '/dashboard/upgrade';

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
      <DashboardSidebar />
      <div className="flex flex-1 flex-col lg:ml-64">
        <DashboardTopbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
