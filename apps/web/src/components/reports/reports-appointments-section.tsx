import type { ElementType } from 'react';
import {
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  CirclePercent,
  MapPinned,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportSectionCard } from '@/components/reports/report-section-card';
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  type AppointmentStatus,
  type AppointmentType,
} from '@/lib/appointments';
import {
  type AppointmentsBreakdownItem,
  type AppointmentsReportResponse,
} from '@/lib/reports';
import { cn } from '@/lib/utils';

interface ReportsAppointmentsSectionProps {
  data: AppointmentsReportResponse;
}

export function ReportsAppointmentsSection({
  data,
}: ReportsAppointmentsSectionProps) {
  const { summary, breakdowns, notes } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="rounded-full px-3 py-1">
          Raport Spotkania
        </Badge>
        <span className="text-sm text-muted-foreground">
          Trzeci dedykowany pionowy slice raportowy
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={CalendarCheck2}
          title="Spotkania łącznie"
          value={String(summary.totalAppointments)}
          subtitle={`${summary.completedAppointments} zakończonych`}
        />
        <SummaryCard
          icon={CalendarClock}
          title="Zaplanowane"
          value={String(summary.scheduledAppointments)}
          subtitle={`${summary.cancelledAppointments} anulowanych`}
        />
        <SummaryCard
          icon={CalendarX2}
          title="No-show / anulacje"
          value={String(summary.noShowAppointments + summary.cancelledAppointments)}
          subtitle={`${summary.noShowAppointments} no-show`}
        />
        <SummaryCard
          icon={CirclePercent}
          title="Completion rate"
          value={`${summary.completionRate}%`}
          subtitle="Completed / total w okresie"
        />
        <SummaryCard
          icon={UserRound}
          title="Powiązane z klientem"
          value={String(summary.linkedToClient)}
          subtitle="Spotkania z przypisanym klientem"
        />
        <SummaryCard
          icon={MapPinned}
          title="Powiązane z ofertą"
          value={String(summary.linkedToListing)}
          subtitle="Spotkania z przypisaną ofertą"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BreakdownCard
          title="Statusy spotkań"
          items={breakdowns.byStatus}
          getLabel={(item) =>
            APPOINTMENT_STATUS_LABELS[item.key as AppointmentStatus] ?? item.key
          }
          accent="info"
        />
        <BreakdownCard
          title="Typy spotkań"
          items={breakdowns.byType}
          getLabel={(item) =>
            APPOINTMENT_TYPE_LABELS[item.key as AppointmentType] ?? item.key
          }
          accent="emerald"
        />
      </div>

      <ReportSectionCard
        title="Założenia i ograniczenia"
        description="Raport Spotkania korzysta z modelu Appointment i opcjonalnych relacji do klienta / oferty, dlatego część interpretacji filtrowania zależy od kompletności danych relacyjnych."
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          {notes.map((note) => (
            <div
              key={note}
              className="rounded-xl bg-muted/40 px-3 py-2 text-foreground/80"
            >
              {note}
            </div>
          ))}
        </div>
      </ReportSectionCard>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  subtitle,
}: {
  icon: ElementType;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card className="rounded-2xl border border-border shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 pt-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 font-heading text-2xl font-bold text-foreground">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  items,
  getLabel,
  accent,
}: {
  title: string;
  items: AppointmentsBreakdownItem[];
  getLabel: (item: AppointmentsBreakdownItem) => string;
  accent: 'emerald' | 'info';
}) {
  const accentClass = {
    emerald: 'bg-brand-emerald/85',
    info: 'bg-status-info/85',
  }[accent];

  return (
    <Card className="rounded-2xl border border-border shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak danych dla wybranego zakresu.</p>
        ) : (
          items.map((item) => (
            <div key={item.key} className="space-y-2 rounded-xl border border-border/70 bg-muted/10 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">{getLabel(item)}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.count} spotkań • {item.percentage}% udziału
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full px-2.5 py-1">
                  {item.count}
                </Badge>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', accentClass)}
                  style={{ width: `${Math.max(item.percentage, item.count > 0 ? 6 : 0)}%` }}
                />
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <span>Klient: {item.linkedToClient ?? 0}</span>
                <span>Oferta: {item.linkedToListing ?? 0}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
