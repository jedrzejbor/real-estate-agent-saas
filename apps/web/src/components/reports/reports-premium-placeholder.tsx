'use client';

import Link from 'next/link';
import { Crown, LockKeyhole } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReportSectionCard } from './report-section-card';

interface ReportsPremiumPlaceholderProps {
  title: string;
  description: string;
  ctaLabel?: string;
}

export function ReportsPremiumPlaceholder({
  title,
  description,
  ctaLabel = 'Zobacz plan i limity',
}: ReportsPremiumPlaceholderProps) {
  return (
    <ReportSectionCard
      title={title}
      description={description}
      className="border-[#D4A853]/25 bg-[#FFF9E6]/40"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="gold">Premium</Badge>
          <Badge variant="outline">Upgrade required</Badge>
        </div>

        <div className="rounded-xl border border-[#D4A853]/25 bg-white/80 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF9E6] text-[#B8922F]">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Rozszerz raportowanie zespołu
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Ten raport jest poza zakresem planu Free. Po upgrade odblokujesz głębszą analizę spotkań i obłożenia kalendarza.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#D4A853]/30 bg-[#FFF9E6]/30 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LockKeyhole className="h-4 w-4 text-[#B8922F]" />
            Raport pozostaje zablokowany w planie Free.
          </div>
          <Link href="/dashboard/settings">
            <Button variant="outline">{ctaLabel}</Button>
          </Link>
        </div>
      </div>
    </ReportSectionCard>
  );
}
