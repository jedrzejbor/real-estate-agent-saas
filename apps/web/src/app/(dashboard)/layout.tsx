'use client';

import { useAuth } from '@/contexts/auth-context';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardTopbar } from '@/components/dashboard/topbar';

/** Shell layout for all authenticated /dashboard/* pages. */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
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

  return (
    <div className="flex min-h-screen bg-[#F5F5F4]">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col lg:ml-64">
        <DashboardTopbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
