import Link from 'next/link';
import { ArrowRight, MailCheck, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CheckEmailPageProps {
  searchParams: Promise<{
    account?: string;
    email?: string;
    expiresAt?: string;
  }>;
}

export default async function PublicListingSubmissionCheckEmailPage({
  searchParams,
}: CheckEmailPageProps) {
  const params = await searchParams;
  const email = params.email;
  const isPrivateSeller = params.account === 'private_seller';

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
            {email ? ` na adres ${email}` : ''}.{' '}
            {isPrivateSeller
              ? 'Po kliknięciu linku zgłoszenie zostanie potwierdzone i zostanie w Twoim panelu właściciela.'
              : 'Po kliknięciu linku pokażemy Ci możliwość założenia konta albo zalogowania się i przejęcia oferty do CRM.'}
          </p>
          <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-left">
            <p className="text-sm font-semibold text-foreground">
              {isPrivateSeller
                ? 'Status: ogłoszenie przypisane do Twojego konta'
                : 'Status: oferta trafiła do weryfikacji emaila'}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {isPrivateSeller
                ? 'Gdy potwierdzisz adres email, pokażemy zgłoszenie w panelu właściciela ze statusem weryfikacji. Stamtąd możesz wrócić do ogłoszenia i śledzić jego publikację.'
                : 'Gdy potwierdzisz adres email, oferta będzie gotowa do przejęcia. Jeżeli przejdzie automatyczną kontrolę treści, po przejęciu może pojawić się publicznie w katalogu; w przeciwnym razie zostanie sprawdzona przed publikacją.'}
            </p>
          </div>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {isPrivateSeller ? (
              <Link href="/seller">
                <Button className="h-10 rounded-xl">Przejdź do panelu</Button>
              </Link>
            ) : null}
            <Link href="/oferty">
              <Button variant="outline" className="h-10 gap-2 rounded-xl">
                <Search className="h-4 w-4" />
                Przejdź do katalogu ofert
              </Button>
            </Link>
            <Link href="/dodaj-oferte">
              <Button variant="outline" className="h-10 rounded-xl">
                Dodaj kolejną ofertę
              </Button>
            </Link>
            {!isPrivateSeller ? (
              <Link href="/">
                <Button className="h-10 rounded-xl">
                  Wróć na stronę główną
                </Button>
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
