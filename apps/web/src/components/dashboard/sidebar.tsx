'use client';

import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarCheck,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/common/logo';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Oferty', href: '/dashboard/listings', icon: Building2 },
  { label: 'Klienci', href: '/dashboard/clients', icon: Users },
  { label: 'Kalendarz', href: '/dashboard/calendar', icon: CalendarCheck },
  { label: 'Raporty', href: '/dashboard/reports', icon: BarChart3 },
] as const;

const bottomItems = [
  { label: 'Ustawienia', href: '/dashboard/settings', icon: Settings },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-white lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/dashboard">
          <Logo size="sm" />
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

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
  );
}
