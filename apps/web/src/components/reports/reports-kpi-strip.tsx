import type { ElementType } from 'react';
import {
  Building2,
  CalendarCheck,
  CircleDollarSign,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatPricePL } from '@/lib/dashboard';
import {
  formatReportsDelta,
  getReportsDeltaTone,
  type ReportsOverviewComparison,
  type ReportsOverviewSummary,
} from '@/lib/reports';
import { cn } from '@/lib/utils';

interface ReportsKpiStripProps {
  summary: ReportsOverviewSummary;
  comparison: ReportsOverviewComparison;
}

export function ReportsKpiStrip({
  summary,
  comparison,
}: ReportsKpiStripProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Nowe oferty"
        value={String(summary.newListings)}
        subtitle={`${summary.activeListings} aktywnych teraz`}
        delta={comparison.deltas.newListings}
        icon={Building2}
        tone="emerald"
      />
      <KpiCard
        label="Nowi klienci"
        value={String(summary.newClients)}
        subtitle={`${summary.activeClients} aktywnych / negocjujących`}
        delta={comparison.deltas.newClients}
        icon={Users}
        tone="gold"
      />
      <KpiCard
        label="Spotkania"
        value={String(summary.appointments)}
        subtitle={`${summary.completedAppointments} zakończonych`}
        delta={comparison.deltas.appointments}
        icon={CalendarCheck}
        tone="info"
      />
      <KpiCard
        label="Wartość portfela"
        value={formatPricePL(summary.portfolioValue)}
        subtitle="Aktywne oferty w bieżącym zakresie"
        delta={comparison.deltas.portfolioValue}
        icon={CircleDollarSign}
        tone="terracotta"
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  subtitle,
  delta,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  subtitle: string;
  delta: ReportsOverviewComparison['deltas'][keyof ReportsOverviewComparison['deltas']];
  icon: ElementType;
  tone: 'emerald' | 'gold' | 'info' | 'terracotta';
}) {
  const toneClass = {
    emerald: 'bg-brand-emerald-light text-brand-emerald',
    gold: 'bg-brand-gold-light text-brand-gold-dark',
    info: 'bg-status-info-bg text-status-info',
    terracotta: 'bg-orange-50 text-brand-terracotta',
  }[tone];
  const deltaTone = getReportsDeltaTone(delta);

  return (
    <Card className="rounded-2xl border border-border shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 pt-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 font-heading text-2xl font-bold text-foreground">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          <p
            className={cn(
              'mt-2 text-xs font-medium',
              deltaTone === 'positive' && 'text-brand-emerald',
              deltaTone === 'negative' && 'text-brand-terracotta',
              deltaTone === 'neutral' && 'text-muted-foreground',
            )}
          >
            {formatReportsDelta(delta)}
          </p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
