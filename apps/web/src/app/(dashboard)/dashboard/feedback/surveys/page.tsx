'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FeatureSurveyList } from '@/components/feedback/feature-survey-list';

export default function ProductFeedbackSurveysPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Ankiety produktowe
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Odpowiedz na aktywne ankiety dotyczące funkcji, priorytetów i
            kierunku rozwoju produktu.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="gap-2 rounded-xl"
          onClick={() => setRefreshKey((current) => current + 1)}
        >
          <RefreshCw className="h-4 w-4" />
          Odśwież
        </Button>
      </div>

      <FeatureSurveyList key={refreshKey} emptyState />
    </div>
  );
}
