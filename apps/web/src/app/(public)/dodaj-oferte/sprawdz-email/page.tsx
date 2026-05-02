import Link from 'next/link';
import { ArrowRight, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CheckEmailPageProps {
  searchParams: Promise<{ email?: string; expiresAt?: string }>;
}

export default async function PublicListingSubmissionCheckEmailPage({
  searchParams,
}: CheckEmailPageProps) {
  const params = await searchParams;
  const email = params.email;

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-4 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          EstateFlow
          <ArrowRight className="h-4 w-4" />
        </Link>

        <section className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-heading text-2xl font-bold">
            Sprawdź email, żeby potwierdzić ofertę
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Wysłaliśmy link weryfikacyjny
            {email ? ` na adres ${email}` : ''}. Po kliknięciu linku pokażemy Ci
            możliwość założenia konta albo zalogowania się i przejęcia oferty do
            CRM.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/dodaj-oferte">
              <Button variant="outline" className="h-10 rounded-xl">
                Dodaj kolejną ofertę
              </Button>
            </Link>
            <Link href="/">
              <Button className="h-10 rounded-xl">Wróć na stronę główną</Button>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
