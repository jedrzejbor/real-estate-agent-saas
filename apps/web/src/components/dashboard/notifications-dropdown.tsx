'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Bell,
  Building2,
  CalendarClock,
  CircleAlert,
  MessageSquareText,
  UserRoundPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/use-notifications';
import {
  type NotificationCategory,
  type NotificationItem,
} from '@/lib/notifications';
import { formatRelativeTime } from '@/lib/dashboard';
import { cn } from '@/lib/utils';

const CATEGORY_ICON: Record<NotificationCategory, typeof CalendarClock> = {
  appointment: CalendarClock,
  client: UserRoundPlus,
  listing: Building2,
  public_lead: MessageSquareText,
};

const VARIANT_STYLES = {
  info: 'bg-sky-50 text-sky-700',
  warning: 'bg-amber-50 text-amber-700',
  success: 'bg-emerald-50 text-emerald-700',
} as const;

export function NotificationsDropdown() {
  const router = useRouter();
  const { notifications, unreadItems, isLoading, error, refresh, markAsRead } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [animatingIds, setAnimatingIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const startReadAnimation = async (id: string) => {
    setAnimatingIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
    await new Promise((resolve) => window.setTimeout(resolve, 220));
  };

  const stopReadAnimation = (id: string) => {
    setAnimatingIds((current) => current.filter((item) => item !== id));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen) {
      await refresh();
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadItems.length === 0) return;

    setIsMarkingRead(true);
    try {
      await markAsRead(unreadItems.map((item) => item.id));
    } finally {
      setIsMarkingRead(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted"
        aria-label="Powiadomienia"
        onClick={handleToggle}
      >
        <Bell className="h-5 w-5" />
        {notifications.unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {notifications.unreadCount > 9 ? '9+' : notifications.unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[24rem] overflow-hidden rounded-2xl border border-border bg-white shadow-xl ring-1 ring-black/5">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Powiadomienia
              </p>
              <p className="text-xs text-muted-foreground">
                Najważniejsze komunikaty systemowe i przypomnienia.
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleMarkAllAsRead()}
                disabled={isMarkingRead || unreadItems.length === 0}
              >
                Oznacz wszystko
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void refresh()}>
                Odśwież
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Ładowanie powiadomień...
            </div>
          ) : error ? (
            <div className="px-4 py-6 text-sm text-destructive">{error}</div>
          ) : notifications.items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              Brak nowych powiadomień. Wszystko wygląda dobrze.
            </div>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto p-2">
              {notifications.items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  isAnimating={animatingIds.includes(item.id)}
                  isBusy={isMarkingRead}
                  onMarkAsRead={async (id) => {
                    setIsMarkingRead(true);
                    try {
                      await startReadAnimation(id);
                      await markAsRead([id]);
                    } finally {
                      stopReadAnimation(id);
                      setIsMarkingRead(false);
                    }
                  }}
                  onNavigate={async (href, id) => {
                    if (!href) {
                      setIsOpen(false);
                      return;
                    }

                    if (!item.isRead) {
                      setIsMarkingRead(true);
                      try {
                        await startReadAnimation(id);
                        await markAsRead([id]);
                      } finally {
                        stopReadAnimation(id);
                        setIsMarkingRead(false);
                      }
                    }

                    setIsOpen(false);
                    router.push(href);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function NotificationRow({
  item,
  isAnimating,
  isBusy,
  onMarkAsRead,
  onNavigate,
}: {
  item: NotificationItem;
  isAnimating: boolean;
  isBusy: boolean;
  onMarkAsRead: (id: string) => Promise<void>;
  onNavigate: (href: string | undefined, id: string) => Promise<void>;
}) {
  const Icon = CATEGORY_ICON[item.category] ?? CircleAlert;
  const content = (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl px-3 py-3 transition-[opacity,transform,background-color,filter] duration-300 ease-out hover:bg-muted/60',
        isAnimating ? 'scale-[0.985] opacity-50 saturate-75' : '',
        item.isRead ? 'opacity-70' : '',
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          VARIANT_STYLES[item.variant],
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-foreground">{item.title}</p>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatRelativeTime(item.createdAt)}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {item.description}
        </p>
      </div>
      {!item.isRead ? (
        <button
          type="button"
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Oznacz jako przeczytane"
          disabled={isBusy}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void onMarkAsRead(item.id);
          }}
        >
          <Check className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );

  if (!item.href) {
    return content;
  }

  return (
    <Link
      href={item.href}
      onClick={(event) => {
        event.preventDefault();
        void onNavigate(item.href, item.id);
      }}
    >
      {content}
    </Link>
  );
}
