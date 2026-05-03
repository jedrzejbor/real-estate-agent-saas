# Analiza gotowości po Sprincie 6.5 przed wejściem do Sprintu 7

Data analizy: 2026-05-03

## Decyzja

Możemy przejść do Sprintu 7.

Sprint 6.5 spełnił swój cel: zamknął największe braki produktowe, które mogłyby zmienić Sprint 7 z release readiness w ratowanie core flow. Na ten moment Sprint 7 może skupić się na bezpieczeństwie, testach, monitoringu, checklistach operacyjnych i rollout planie.

Nie widzę blockerów produktowych, które powinny zatrzymać start Sprintu 7. Są natomiast ryzyka release readiness, które trzeba potraktować jako właściwy zakres Sprintu 7.

## Status zakresu Sprintu 6.5

| Zadanie                                   | Status   | Ocena                                                                                        |
| ----------------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `F6.5.1` Zdjęcia oferty end-to-end        | Wykonane | Upload, zarządzanie, limity, zdjęcie główne i publiczny render są domknięte dla MVP.         |
| `F6.5.2` Publiczny wizard `/dodaj-oferte` | Wykonane | Flow zostaje w MVP: wizard, draft, upload zdjęć, submit, check-email i claim path są spięte. |
| `F6.5.3` Abuse report flow                | Wykonane | Publiczny formularz zgłoszenia działa i zapisuje event operacyjny.                           |
| `F6.5.4` Legal copy i zgody               | Wykonane | Formularze publiczne mają zgody, linki prawne i podstawowe strony legal.                     |
| `F6.5.5` Dashboard metryk freemium        | Wykonane | Jest endpoint i widok raportu freemium na podstawie `analytics_events`.                      |
| `F6.5.6` Pricing / upgrade destination    | Wykonane | Upselle i limity prowadzą do `/dashboard/upgrade`, gdzie zapisujemy intent.                  |
| `F6.5.7` Publiczna galeria zdjęć          | Wykonane | Publiczna oferta ma wygodny lightbox, miniatury, klawiaturę i eventy galerii.                |

## Definition of Done Sprintu 6.5

### Zdjęcia ofert działają end-to-end albo zakres release'u jest formalnie ograniczony

Spełnione.

Zdjęcia są obsługiwane w CRM i publicznym wizardzie. Backend waliduje typ, rozmiar i limit zdjęć. Publiczna strona używa zdjęcia głównego jako hero i pełnej galerii jako lightbox. Pozostałe ryzyko dotyczy storage produkcyjnego, nie samego MVP flow.

### Wiadomo, czy publiczny wizard wchodzi do release'u

Spełnione.

Wizard `/dodaj-oferte` wchodzi do release'u. Ma kroki formularza, draft w `localStorage`, upload zdjęć, zgody, honeypot/timing i ekran “sprawdź email”.

### Abuse/legal/analytics mają minimalne działające ścieżki

Spełnione.

Abuse report jest widoczny na publicznej ofercie. Legal copy istnieje w publicznych formularzach i stronach prawnych. Analityka obejmuje publikację, widoki, leady, claim, limity, upgrade intent i galerię.

### Sprint 7 może skupić się na bezpieczeństwie, testach, monitoringu i rollout planie

Spełnione.

Pozostałe tematy nie są już brakami core produktu, tylko typowymi elementami release readiness.

## Co zostało zabezpieczone

- Publiczne uploady mają walidację typu pliku, rozmiaru i liczby plików.
- Publiczne formularze mają honeypot, timing guard, rate limiting i podstawową heurystykę abuse.
- Publiczne leady, submissiony i analytics mają throttle po stronie API.
- Limity planu są egzekwowane backendowo dla ofert, klientów, spotkań i zdjęć.
- UI pokazuje soft warning i hard limit z jasnym CTA do upgrade.
- Publiczne oferty mają abuse report flow.
- Publiczne formularze zawierają zgody i linki do dokumentów legal.
- Publiczne strony ofert mają SEO metadata, OG image fallback i JSON-LD.
- Metryki freemium są mierzalne w raporcie `/dashboard/reports`.
- Upgrade intent nie jest już martwym CTA, tylko prowadzi do `/dashboard/upgrade`.

## Ryzyka, które przechodzą do Sprintu 7

### 1. Storage zdjęć jest lokalny

Status: ryzyko release readiness, nie blocker dla dev/MVP.

Obecnie pliki są zapisywane w lokalnym `uploads`. Przed produkcyjnym rolloutem trzeba zdecydować, czy pierwszy release dopuszcza lokalny storage, czy wymaga S3/R2/signed URLs.

Rekomendacja dla Sprintu 7:

- jeśli rollout jest lokalny/beta i kontrolowany, lokalny storage może zostać tymczasowo,
- jeśli rollout ma być produkcyjny/publiczny, storage obiektowy powinien być blockerem release'u.

### 2. Legal copy jest robocze

Status: blocker przed publicznym launch’em, nie blocker przed Sprintem 7.

Dokumenty prawne i zgody są produktowo domknięte, ale wymagają review prawnego przed realnym publicznym udostępnieniem.

Rekomendacja dla Sprintu 7:

- dodać formalny punkt w `F7.2`,
- potwierdzić administratora danych, retencję, podstawy przetwarzania, procedurę usunięcia oferty i DPA, jeśli EstateFlow działa jako procesor.

### 3. Abuse moderation jest ręczna

Status: akceptowalne dla MVP, wymaga procedury operacyjnej.

Zgłoszenia nadużyć zapisują się jako eventy, ale nie ma kolejki moderacyjnej ani automatycznego zdejmowania ofert.

Rekomendacja dla Sprintu 7:

- opisać ręczną procedurę dziennego przeglądu `public_listing_abuse_reported`,
- ustalić SLA reakcji,
- przygotować checklistę ręcznego wyłączenia oferty.

### 4. Publiczny wizard nie ma resend verification w UI

Status: non-blocker.

Backendowy kierunek istnieje, ale ekran “sprawdź email” nie ma jeszcze widocznego resend flow.

Rekomendacja:

- nie blokować Sprintu 7,
- dopisać jako follow-up UX, jeśli testy E2E pokażą tarcie.

### 5. Upgrade flow zapisuje intent, ale nie ma billing lifecycle

Status: świadoma decyzja MVP.

`/dashboard/upgrade` nie zmienia planu i nie pobiera płatności. To poprawne na tym etapie, bo billing jest rozpisany w backlogu `P6-P9`.

Rekomendacja dla Sprintu 7:

- upewnić się, że copy jasno komunikuje “zainteresowanie upgrade”, a nie natychmiastowy zakup,
- zweryfikować, że eventy `upgrade_cta_clicked` mają wystarczający kontekst do ręcznej obsługi.

### 6. Publiczny katalog `/oferty` i mapa są poza release readiness

Status: świadomie poza Sprintem 7.

Pojedyncze publiczne oferty są gotowe jako shareable landing pages. Publiczny katalog i mapa są większym modułem discovery, rozpisanym na Sprint 8 i Sprint 9.

Rekomendacja:

- nie traktować braku katalogu i mapy jako blocker freemium MVP,
- jasno komunikować, że obecny release obsługuje pojedyncze linki ofert, nie marketplace/katalog.

## Rekomendowany zakres Sprintu 7

Sprint 7 powinien wystartować bez dokładania nowych dużych funkcji. Najważniejsze zadania:

1. Security review publicznych endpointów:
   - `/api/listings/public/:slug`,
   - `/api/public-listing-submissions`,
   - `/api/public-listing-submissions/images`,
   - `/api/public-leads`,
   - `/api/analytics/public-listings/:slug/events`,
   - uploady `/uploads`.

2. Upload review:
   - MIME/type validation,
   - rozmiary plików,
   - nazewnictwo plików,
   - publiczne serwowanie `/uploads`,
   - cleanup nieprzejętych submission images,
   - decyzja lokalny storage vs S3/R2.

3. Test plan E2E:
   - rejestracja i onboarding,
   - dodanie oferty w CRM,
   - upload zdjęć i galeria publiczna,
   - publikacja oferty,
   - publiczny lead,
   - publiczny wizard `/dodaj-oferte`,
   - verification/check-email,
   - claim listing,
   - abuse report,
   - limit reached,
   - upgrade intent.

4. Monitoring i alerty:
   - błędy formularzy publicznych,
   - błędy uploadów,
   - failed verification/claim,
   - spike abuse reports,
   - spike rate limitów,
   - upgrade CTA i konwersja do intent submit.

5. Legal/privacy closeout:
   - review dokumentów,
   - finalne dane administratora,
   - procedura usunięcia danych/oferty,
   - procedura obsługi zgłoszeń abuse.

6. Rollout checklist:
   - feature flags,
   - beta cohort,
   - rollback plan,
   - support playbook,
   - decyzja o storage,
   - decyzja o indeksowaniu publicznych ofert.

## Czy coś jeszcze trzeba dopisać przed startem Sprintu 7?

Nie jako blocker.

Warto natomiast uzupełnić `Log sprintu` w `FREEMIUM_SPRINT_PLAN.md`, żeby formalnie zamknąć Sprint 6.5:

- Status sprintu: zakończony,
- Data zamknięcia: 2026-05-03,
- Co dowieźliśmy: zadania `F6.5.1-F6.5.7`,
- Decyzje: katalog jako Sprint 8, mapa jako Sprint 9, billing poza MVP,
- Otwarte tematy: storage produkcyjny, legal review, abuse operations, E2E, monitoring.

## Finalna rekomendacja

Przechodzimy do Sprintu 7.

Warunek: Sprint 7 nie powinien przyjmować katalogu `/oferty`, mapy ani pełnego billing lifecycle jako dodatkowego scope. Te tematy są już poprawnie rozdzielone na Sprint 8, Sprint 9 i backlog płatnych planów. Sprint 7 ma zabezpieczyć release, a nie rozszerzać produkt.
