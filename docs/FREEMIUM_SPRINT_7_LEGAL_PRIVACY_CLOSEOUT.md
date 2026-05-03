# Sprint 7 — legal/privacy closeout dla freemium MVP

Data closeoutu: 2026-05-03

## Decyzja

`F7.2` można uznać za wykonane na poziomie produktowego MVP release readiness.

Warunek przed publicznym launch’em: dokumenty powinny zostać zweryfikowane przez prawnika oraz uzupełnione o finalne dane spółki/operatora, kanał kontaktu i ewentualną umowę powierzenia danych.

## Zakres sprawdzony

- Publiczne strony:
  - `/regulamin`,
  - `/polityka-prywatnosci`,
  - `/zasady-publikacji`.
- Publiczne formularze:
  - lead z publicznej oferty,
  - lead z publicznego profilu agenta,
  - wizard `/dodaj-oferte`.
- Publiczne flow operacyjne:
  - public listing submission,
  - verification/check-email,
  - claim listing,
  - abuse report,
  - upload zdjęć publicznych submissionów,
  - public analytics.

## Co zostało domknięte

### 1. Wersjonowanie dokumentów

Dodano centralne `LEGAL_META` w `apps/web/src/lib/legal.ts`:

- `version`,
- `effectiveDate`,
- `contactEmail`,
- `abuseEmail`,
- `supportEmail`.

Publiczne dokumenty pokazują wersję i datę obowiązywania, co ułatwia późniejszy review i audyt zgód.

### 2. Administrator danych i role

Polityka prywatności doprecyzowuje, że dla danych z publicznych formularzy administratorem jest agent albo biuro obsługujące ofertę/profil, a EstateFlow działa jako dostawca narzędzia.

Dopisano też uwagę, że przy produkcyjnym wdrożeniu relacja biuro/agent → EstateFlow powinna zostać opisana w DPA albo równoważnej umowie powierzenia.

### 3. Retencja i usuwanie danych

Dodano centralne `LEGAL_RETENTION` i opisano:

- leady publiczne,
- publiczne zgłoszenia ofert i tymczasowe zdjęcia,
- eventy techniczne i analityczne.

Dokumenty opisują też, że wniosek o usunięcie powinien zawierać URL oferty, identyfikator zgłoszenia albo dane pozwalające odnaleźć rekord.

### 4. Abuse workflow

Zasady publikacji ofert zawierają teraz procedurę weryfikacji zgłoszeń:

- sprawdzenie powodu zgłoszenia,
- sprawdzenie URL oferty,
- weryfikacja danych kontaktowych właściciela/agenta,
- możliwość ręcznego wycofania oferty do czasu wyjaśnienia.

Komponent `PublicListingAbuseReport` pokazuje również mail `abuse@estateflow.pl` jako kanał dla pilnych zgłoszeń.

### 5. Zgody w publicznych formularzach

Status: utrzymane i spójne.

Formularze publiczne korzystają ze wspólnych stałych `LEGAL_COPY` i `LEGAL_LINKS`. Obejmują:

- zgodę na kontakt,
- informację o celu przetwarzania,
- informację o administratorze danych,
- link do polityki prywatności,
- akceptację regulaminu i zasad publikacji przy publicznym dodaniu oferty,
- oświadczenie o prawach do zdjęć i treści.

### 6. Procedura publicznej oferty

Zasady publikacji ofert doprecyzowują:

- prawdziwość i aktualność danych,
- prawo do zdjęć i treści,
- ochronę prywatności,
- zakaz spamu i ofert wprowadzających w błąd,
- zgłoszenia nadużyć,
- usunięcie oferty lub danych.

## Pozostałe ryzyka przed publicznym launch’em

### 1. Review prawnika

Status: wymagane przed publicznym launch’em.

Obecne dokumenty są produkcyjną wersją roboczą MVP, ale nie zastępują formalnego review prawnego.

### 2. Dane operatora i kontakt

Status: placeholder operacyjny.

Adresy `legal@estateflow.pl`, `abuse@estateflow.pl` i `support@estateflow.pl` powinny zostać potwierdzone przed rolloutem. Jeśli operator ma inną nazwę prawną, dokumenty trzeba uzupełnić o finalne dane.

### 3. DPA / powierzenie

Status: wymagane, jeśli EstateFlow działa jako procesor dla biur.

Trzeba przygotować osobny wzór umowy powierzenia albo załącznik do regulaminu dla klientów B2B.

### 4. Retencja techniczna

Status: wymaga decyzji rolloutowej.

Dokumenty opisują kierunek retencji, ale aplikacja nadal potrzebuje operacyjnej decyzji i ewentualnego cleanup job dla nieprzejętych submissionów i zdjęć tymczasowych.

### 5. Manualna obsługa abuse

Status: akceptowalne dla MVP, wymaga playbooka.

Do rollout checklist należy dopisać dzienny przegląd `public_listing_abuse_reported`, SLA reakcji i procedurę ręcznego wycofania oferty.

## Rekomendacja dla kolejnych zadań Sprintu 7

- `F7.3`: monitoring powinien objąć abuse reports, public lead failures, public submission failures, upload failures i claim failures.
- `F7.4`: test plan E2E powinien sprawdzić, czy wszystkie publiczne formularze pokazują zgody i linki legal.
- `F7.5`: release checklist powinna zawierać decyzję o:
  - finalnym operatorze danych,
  - mailboxach legal/support/abuse,
  - DPA,
  - retencji,
  - cleanupie tymczasowych zdjęć,
  - abuse playbooku.

## Finalna rekomendacja

Można przejść dalej w Sprincie 7.

Nie ma blockerów produktowych dla kolejnych zadań release readiness, ale publiczny launch powinien być warunkowany formalnym review prawnym i decyzjami operacyjnymi wymienionymi powyżej.
