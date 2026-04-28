import {
  Construction,
  ArrowLeft,
  CalendarClock,
} from 'lucide-react';
import Link from 'next/link';

// Map URL segments to Polish labels for nicer headings
const ROUTE_LABELS: Record<string, string> = {
  reports: 'Raporty',
  settings: 'Ustawienia',
  profile: 'Profil',
};

interface ComingSoonPageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function ComingSoonPage({ params }: ComingSoonPageProps) {
  const { slug } = await params;
  const segment = slug?.[0] ?? '';
  const label = ROUTE_LABELS[segment] ?? 'Ta strona';

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-16">
      {/* Icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <Construction className="h-10 w-10 text-primary" />
      </div>

      {/* Content */}
      <h1 className="font-heading text-2xl font-bold text-foreground">
        {label} — w trakcie przygotowania
      </h1>
      <p className="mt-3 max-w-sm text-center text-sm text-muted-foreground">
        Ta funkcjonalność jest aktualnie w budowie i zostanie udostępniona
        wkrótce. Dziękujemy za cierpliwość!
      </p>

      {/* ETA badge */}
      <div className="mt-5 flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
        Planowane w kolejnym etapie rozwoju
      </div>

      {/* Back link */}
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do dashboardu
      </Link>
    </div>
  );
}

// Generate metadata dynamically
export async function generateMetadata({ params }: ComingSoonPageProps) {
  const { slug } = await params;
  const segment = slug?.[0] ?? '';
  const label = ROUTE_LABELS[segment] ?? 'Strona';

  return {
    title: `${label} — wkrótce | EstateFlow`,
  };
}
