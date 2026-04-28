'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCalendarAppointments } from '@/hooks/use-appointments';
import {
  type Appointment,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
  TYPE_COLORS,
  STATUS_BADGE_VARIANT,
  formatTime,
  formatTimeRange,
  formatDayHeader,
  getCalendarDays,
  groupByDate,
  isToday,
  toLocalDateKey,
} from '@/lib/appointments';
import { Badge } from '@/components/ui/badge';

const MONTHS_PL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

const WEEKDAYS_PL = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

type ViewMode = 'month' | 'list';

type SearchParamsLike = {
  get: (name: string) => string | null;
};

function getCalendarQueryDate(searchParams: SearchParamsLike, fallback: Date) {
  const yearParam = Number(searchParams.get('year'));
  const monthParam = Number(searchParams.get('month'));

  const year =
    Number.isInteger(yearParam) && yearParam >= 2000 && yearParam <= 2100
      ? yearParam
      : fallback.getFullYear();
  const month =
    Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12
      ? monthParam - 1
      : fallback.getMonth();

  return { year, month };
}

export default function CalendarPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const today = useMemo(() => new Date(), []);
  const queryDate = useMemo(
    () => getCalendarQueryDate(searchParams, today),
    [searchParams, today],
  );

  const [year, setYear] = useState(queryDate.year);
  const [month, setMonth] = useState(queryDate.month);
  const [view, setView] = useState<ViewMode>('month');

  useEffect(() => {
    setYear((current) => (current === queryDate.year ? current : queryDate.year));
    setMonth((current) =>
      current === queryDate.month ? current : queryDate.month,
    );
  }, [queryDate.month, queryDate.year]);

  useEffect(() => {
    const nextYear = String(year);
    const nextMonth = String(month + 1);

    if (
      searchParams.get('year') === nextYear &&
      searchParams.get('month') === nextMonth
    ) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('year', nextYear);
    params.set('month', nextMonth);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [month, pathname, router, searchParams, year]);

  const { appointments, isLoading, error, refresh } = useCalendarAppointments(
    year,
    month,
  );

  const grouped = groupByDate(appointments);

  const goToPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Kalendarz
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Zarządzaj swoimi spotkaniami i prezentacjami
          </p>
        </div>
        <Link href="/dashboard/calendar/new">
          <Button size="lg" className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            Nowe spotkanie
          </Button>
        </Link>
      </div>

      {/* Navigation Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-white p-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Dziś
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-3 font-heading text-lg font-semibold">
            {MONTHS_PL[month]} {year}
          </h2>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          <Button
            variant={view === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('month')}
            className="gap-1.5"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Miesiąc
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
            className="gap-1.5"
          >
            <List className="h-3.5 w-3.5" />
            Lista
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={refresh}
          >
            Spróbuj ponownie
          </Button>
        </div>
      ) : view === 'month' ? (
        <MonthView
          year={year}
          month={month}
          grouped={grouped}
        />
      ) : (
        <ListView appointments={appointments} />
      )}
    </div>
  );
}

// ── Month Grid View ──

function MonthView({
  year,
  month,
  grouped,
}: {
  year: number;
  month: number;
  grouped: Map<string, Appointment[]>;
}) {
  const days = getCalendarDays(year, month);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {WEEKDAYS_PL.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((date, i) => {
          const key = toLocalDateKey(date);
          const dayAppointments = grouped.get(key) || [];
          const isCurrentMonth = date.getMonth() === month;
          const today = isToday(date);

          return (
            <div
              key={i}
              className={`min-h-[100px] border-b border-r border-border p-1.5 ${
                !isCurrentMonth ? 'bg-muted/20' : ''
              }`}
            >
              <div
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  today
                    ? 'bg-primary text-primary-foreground'
                    : isCurrentMonth
                      ? 'text-foreground'
                      : 'text-muted-foreground/50'
                }`}
              >
                {date.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayAppointments.slice(0, 3).map((appt) => (
                  <Link
                    key={appt.id}
                    href={`/dashboard/calendar/${appt.id}`}
                    className={`block truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight border ${
                      TYPE_COLORS[appt.type]
                    } hover:opacity-80 transition-opacity`}
                  >
                    {formatTime(appt.startTime)} {appt.title}
                  </Link>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="px-1.5 text-[10px] text-muted-foreground">
                    +{dayAppointments.length - 3} więcej
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── List View ──

function ListView({ appointments }: { appointments: Appointment[] }) {
  const grouped = groupByDate(appointments);
  const sortedDates = Array.from(grouped.keys()).sort();

  if (appointments.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((dateKey) => {
        const dayAppts = grouped.get(dateKey)!;
        const date = new Date(dateKey + 'T00:00:00');

        return (
          <div key={dateKey}>
            <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              {formatDayHeader(date)}
              {isToday(date) && (
                <Badge variant="default" className="text-[10px]">
                  Dzisiaj
                </Badge>
              )}
            </h3>
            <div className="space-y-2">
              {dayAppts.map((appt) => (
                <AppointmentListItem key={appt.id} appointment={appt} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AppointmentListItem({ appointment }: { appointment: Appointment }) {
  return (
    <Link
      href={`/dashboard/calendar/${appointment.id}`}
      className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 transition-all hover:border-primary/30 hover:shadow-sm"
    >
      {/* Time */}
      <div className="flex w-28 shrink-0 flex-col text-sm">
        <span className="font-semibold text-foreground">
          {formatTimeRange(appointment.startTime, appointment.endTime)}
        </span>
      </div>

      {/* Type badge */}
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${TYPE_COLORS[appointment.type]}`}
      >
        {APPOINTMENT_TYPE_LABELS[appointment.type]}
      </span>

      {/* Title & info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">
          {appointment.title}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {appointment.client && (
            <span>
              {appointment.client.firstName} {appointment.client.lastName}
            </span>
          )}
          {appointment.location && <span>{appointment.location}</span>}
        </div>
      </div>

      {/* Status */}
      <Badge
        variant={STATUS_BADGE_VARIANT[appointment.status]}
        className="shrink-0"
      >
        {APPOINTMENT_STATUS_LABELS[appointment.status]}
      </Badge>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white py-16">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <CalendarDays className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-foreground">
        Brak spotkań w tym miesiącu
      </h3>
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
        Dodaj nowe spotkanie, aby rozpocząć planowanie.
      </p>
      <Link href="/dashboard/calendar/new" className="mt-6">
        <Button className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" />
          Zaplanuj spotkanie
        </Button>
      </Link>
    </div>
  );
}
