import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Link2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Publiczne oferty | EstateFlow',
  description: 'Publiczne strony ofert EstateFlow.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function PublicListingsIndexPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF9] px-5 py-12 text-[#1C1917]">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Link2 className="h-6 w-6" />
        </div>
        <h1 className="mt-5 font-heading text-2xl font-semibold">
          Brakuje identyfikatora oferty
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Publiczny adres powinien zawierać slug konkretnej oferty, na przykład
          `/oferty/nazwa-oferty-miasto`.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do EstateFlow
        </Link>
      </section>
    </main>
  );
}
