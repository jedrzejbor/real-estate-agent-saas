import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, ShieldCheck } from 'lucide-react';
import { Container } from '@/components/layout';
import { FeatureSurveyList } from '@/components/feedback/feature-survey-list';
import { PublicProductFeedbackForm } from '@/components/feedback/public-product-feedback-form';

export const metadata: Metadata = {
  title: 'Feedback | EstateFlow',
  description:
    'Zgłoś błąd, zaproponuj funkcję albo podziel się opinią o EstateFlow.',
};

export default function FeedbackPage() {
  return (
    <Container className="py-10 lg:py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do EstateFlow
      </Link>

      <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquare className="h-6 w-6" />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase text-primary">
            Feedback produktowy
          </p>
          <h1 className="mt-2 max-w-xl font-heading text-4xl font-bold leading-tight text-foreground sm:text-5xl">
            Pomóż nam poprawić EstateFlow
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Zgłoś błąd, opisz brakującą funkcję albo daj znać, co było niejasne.
            Czytamy feedback jako materiał do triage produktu i kolejnych
            decyzji roadmapowych.
          </p>

          <div className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-heading text-lg font-semibold">
                  Feedback a zgłoszenie naruszenia
                </h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Ten formularz dotyczy działania aplikacji. Jeśli chcesz
                  zgłosić fałszywą ofertę, naruszenie praw albo problem prawny,
                  użyj formularza zgłoszenia na stronie konkretnej oferty.
                </p>
              </div>
            </div>
          </div>
        </section>

        <PublicProductFeedbackForm />
      </div>

      <FeatureSurveyList publicMode className="mt-8" />
    </Container>
  );
}
