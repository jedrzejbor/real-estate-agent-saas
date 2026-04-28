import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type ReportsGroupBy,
  type ReportsOverviewBucket,
  formatReportsBucketLabel,
} from '@/lib/reports';
import { cn } from '@/lib/utils';

interface ReportsTrendCardProps {
  title: string;
  description: string;
  totalLabel: string;
  totalValue: number;
  data: ReportsOverviewBucket[];
  metric: keyof Pick<
    ReportsOverviewBucket,
    'newListings' | 'newClients' | 'appointments' | 'completedAppointments'
  >;
  groupBy: ReportsGroupBy;
  tone?: 'emerald' | 'gold' | 'info';
}

export function ReportsTrendCard({
  title,
  description,
  totalLabel,
  totalValue,
  data,
  metric,
  groupBy,
  tone = 'emerald',
}: ReportsTrendCardProps) {
  const maxValue = Math.max(...data.map((bucket) => bucket[metric]), 0);
  const visibleLabelStep = Math.max(1, Math.ceil(data.length / 6));

  const barColorClass = {
    emerald: 'bg-brand-emerald/85',
    gold: 'bg-brand-gold/85',
    info: 'bg-status-info/85',
  }[tone];

  return (
    <Card className="rounded-2xl border border-border shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{totalLabel}</p>
            <p className="font-heading text-2xl font-bold text-foreground">
              {totalValue}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex h-48 items-end gap-1.5 rounded-xl border border-border/70 bg-muted/10 p-3">
          {data.map((bucket, index) => {
            const value = bucket[metric];
            const height = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 10 : 0) : 0;
            const showLabel = index % visibleLabelStep === 0 || index === data.length - 1;

            return (
              <div key={bucket.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <div
                  className="text-[10px] font-medium text-muted-foreground"
                  title={`${formatReportsBucketLabel(bucket)}: ${value}`}
                >
                  {value > 0 ? value : ''}
                </div>
                <div className="flex h-28 w-full items-end">
                  <div
                    className={cn(
                      'w-full rounded-md transition-all duration-200 hover:opacity-90',
                      barColorClass,
                    )}
                    style={{ height: `${height}%` }}
                    title={`${formatReportsBucketLabel(bucket)}: ${value}`}
                  />
                </div>
                <div className="h-8 text-center text-[10px] leading-tight text-muted-foreground">
                  {showLabel ? formatReportsBucketLabelForAxis(bucket.label, groupBy) : ''}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function formatReportsBucketLabelForAxis(
  label: string,
  groupBy: ReportsGroupBy,
): string {
  if (groupBy === 'day') {
    return label.replace('.', '');
  }

  return label;
}
