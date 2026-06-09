import type { ElementType } from 'react';
import { BookOpenText, MousePointerClick, Percent, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ReportSectionCard } from '@/components/reports/report-section-card';
import type { BlogReportResponse } from '@/lib/reports';

interface ReportsBlogSectionProps {
  data: BlogReportResponse;
}

export function ReportsBlogSection({ data }: ReportsBlogSectionProps) {
  const maxPostValue = Math.max(1, ...data.topPosts.map((post) => post.views));

  return (
    <section className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Blog SEO
          </h2>
          <Badge variant="brand">Ruch i CTA</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Podstawowy raport wejść na artykuły i kliknięć CTA prowadzących do
          konwersji.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={BookOpenText}
          title="Odsłony artykułów"
          value={String(data.summary.articleViews)}
          subtitle="Unikalne odsłony w sesji przeglądarki"
        />
        <MetricCard
          icon={MousePointerClick}
          title="Kliknięcia CTA"
          value={String(data.summary.ctaClicks)}
          subtitle={`${data.summary.ctaClickThroughRate}% CTR z artykułów`}
        />
        <MetricCard
          icon={Send}
          title="Kliknięcia Dodaj ofertę"
          value={String(data.summary.submitListingClicks)}
          subtitle="Najbliższy sygnał intencji leada z bloga"
        />
        <MetricCard
          icon={Percent}
          title="Submit-listing CTR"
          value={`${data.summary.submitListingClickThroughRate}%`}
          subtitle="Kliknięcia dodania oferty / odsłony"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ReportSectionCard
          title="Najlepsze artykuły"
          description="Artykuły z największą liczbą odsłon oraz ich skuteczność CTA."
        >
          <div className="space-y-3">
            {data.topPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Brak danych bloga dla wybranego okresu.
              </p>
            ) : (
              data.topPosts.map((post) => {
                const width = Math.max(
                  4,
                  Math.round((post.views / maxPostValue) * 100),
                );

                return (
                  <div
                    key={post.key}
                    className="space-y-2 rounded-xl border border-border/70 bg-card p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {post.label}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {post.views} odsłon / {post.ctaClicks} kliknięć CTA /{' '}
                          {post.ctaClickThroughRate}% CTR
                        </p>
                      </div>
                      <Badge variant="outline">
                        {post.submitListingClicks} lead
                      </Badge>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ReportSectionCard>

        <ReportSectionCard
          title="CTA"
          description="Które warianty CTA są najczęściej klikane z artykułów."
        >
          <div className="space-y-3">
            {data.ctaVariants.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Brak kliknięć CTA w wybranym okresie.
              </p>
            ) : (
              data.ctaVariants.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-sm"
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold text-foreground">
                    {item.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </ReportSectionCard>
      </div>

      <ReportSectionCard
        title="Uwagi do danych"
        description="Ten widok jest pierwszą iteracją raportu SEO/growth dla bloga."
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          {data.notes.map((note) => (
            <div
              key={note}
              className="rounded-xl bg-muted/40 px-3 py-2 text-foreground/80"
            >
              {note}
            </div>
          ))}
        </div>
      </ReportSectionCard>
    </section>
  );
}

function MetricCard({
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
