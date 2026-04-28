'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { GlobalSearch } from './global-search';
import { NotificationsDropdown } from './notifications-dropdown';

export function DashboardTopbar() {
  const { user } = useAuth();

  const firstName = user?.agent?.firstName?.trim() ?? '';
  const lastName = user?.agent?.lastName?.trim() ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  const displayName = fullName || user?.email || 'Użytkownik';

  const initials = fullName
    ? `${firstName.charAt(0)}${lastName.charAt(0) || firstName.charAt(1) || ''}`.toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? '?';

  const planLabel = user?.entitlements?.plan.label;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white/80 px-6 backdrop-blur-md">
      {/* Mobile menu button */}
      <button
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground lg:hidden"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="mx-4 hidden min-w-0 flex-1 md:block lg:mx-8">
        <GlobalSearch />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {planLabel ? (
          <Link href="/dashboard/settings" className="hover:opacity-90">
            <Badge variant={planLabel === 'Free' ? 'muted' : 'gold'}>
              Plan {planLabel}
            </Badge>
          </Link>
        ) : null}

        <NotificationsDropdown />

        {/* User avatar */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </div>
          <span className="hidden text-sm font-medium text-foreground md:block">
            {displayName}
          </span>
        </div>
      </div>
    </header>
  );
}
