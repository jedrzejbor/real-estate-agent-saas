# Freemium Sprint 7 - test plan E2E krytycznych scenariuszy

Data przygotowania: 2026-05-03

## Decyzja

`F7.4` jest domknięte dla MVP jako manualny test plan release readiness oraz zestaw automatycznych smoke-checków dostępnych w repo.

Repo nie ma jeszcze Playwright/Cypress ani gotowego uruchamialnego harnessu E2E. Z tego powodu pełne przejście scenariuszy w przeglądarce wymaga uruchomienia stacka lokalnie albo na środowisku staging. Automatyzacja tych scenariuszy powinna wejść jako osobny follow-up przed szerszym rolloutem.

## Zakres krytyczny

Test plan obejmuje scenariusze wymagane przez `F7.4`:

- rejestracja użytkownika i utworzenie workspace,
- onboarding po pierwszym logowaniu,
- utworzenie i publikacja oferty,
- publiczna strona oferty i formularz leadowy,
- egzekucja limitu freemium,
- publiczny wizard dodania oferty,
- weryfikacja email i claim listing,
- abuse report oraz podstawowe legal copy,
- monitoring zdarzeń dla flow publicznych.

## Środowisko testowe

Zalecane środowisko:

- API: `http://localhost:4000/api`
- Web: `http://localhost:3000`
- PostgreSQL: `real_estate_saas`
- `NODE_ENV=development`
- `FRONTEND_URL=http://localhost:3000`
- `NEXT_PUBLIC_API_URL=http://localhost:4000/api`

Uruchomienie:

```bash
docker compose up --build
```

Alternatywnie lokalnie:

```bash
pnpm install
pnpm dev
```

## Dane testowe

Utwórz świeżego użytkownika:

- email: unikalny adres testowy,
- hasło: zgodne z walidacją formularza,
- imię/nazwisko i dane agencji: dowolne dane testowe.

Oferta testowa powinna mieć:

- tytuł publiczny,
- opis bez podejrzanych linków,
- cenę większą od zera,
- metraż większy od zera,
- adres z miastem,
- co najmniej jedno poprawne zdjęcie JPG/PNG/WebP.

## Scenariusze E2E

### E2E-01 Rejestracja i workspace

Kroki:

1. Otwórz `/register`.
2. Zarejestruj nowego użytkownika.
3. Sprawdź przekierowanie do dashboardu.
4. Odśwież stronę.

Oczekiwany wynik:

- użytkownik jest zalogowany po rejestracji,
- API zwraca `agency` i `entitlements`,
- plan użytkownika to `free`,
- dashboard nie wyrzuca błędów auth ani pustego workspace.

Status: do przejścia manualnie na uruchomionym stacku.

### E2E-02 Onboarding

Kroki:

1. Otwórz `/dashboard`.
2. Sprawdź onboarding checklist / empty states.
3. Przejdź do utworzenia pierwszej oferty.
4. Wykonaj akcje sugerowane przez checklistę.

Oczekiwany wynik:

- onboarding prowadzi do realnych ekranów aplikacji,
- kroki nie blokują pracy po odświeżeniu strony,
- analytics przyjmuje zdarzenia onboardingowe bez błędów API.

Status: do przejścia manualnie na uruchomionym stacku.

### E2E-03 Utworzenie i publikacja oferty

Kroki:

1. Wejdź w `/dashboard/listings`.
2. Utwórz ofertę z wymaganymi polami.
3. Dodaj zdjęcie oferty.
4. Opublikuj ofertę z panelu publikacji.
5. Otwórz publiczny link `/oferty/:slug`.

Oczekiwany wynik:

- oferta zapisuje się jako aktywna,
- zdjęcie przechodzi upload i jest widoczne w ofercie,
- publikacja ustawia `publicationStatus = published`, `publicSlug` i `publishedAt`,
- publiczna strona zwraca 200 i pokazuje galerię,
- monitoring loguje `listing_published`.

Status: do przejścia manualnie na uruchomionym stacku.

### E2E-04 Publiczny lead submit

Kroki:

1. Otwórz publiczną ofertę `/oferty/:slug`.
2. Przejdź do formularza kontaktowego.
3. Wyślij formularz z poprawną zgodą kontaktową.
4. Wróć do dashboardu i otwórz `/dashboard/inquiries`.

Oczekiwany wynik:

- formularz przyjmuje lead,
- lead pojawia się na liście zapytań,
- lead zostaje skonwertowany do klienta albo dopasowany do istniejącego,
- brak wycieku danych leadów w publicznym response,
- monitoring loguje `lead_captured`.

Status: do przejścia manualnie na uruchomionym stacku.

### E2E-05 Limit freemium

Kroki:

1. Na koncie free dodawaj aktywne oferty do osiągnięcia limitu.
2. Spróbuj dodać kolejną ofertę.
3. Sprawdź komunikat w UI.
4. Przejdź do `/dashboard/upgrade`.

Oczekiwany wynik:

- API zwraca kontrolowany błąd `PLAN_LIMIT_REACHED`,
- UI nie pokazuje surowego błędu technicznego,
- użytkownik dostaje jasną ścieżkę upgrade,
- istniejące dane nie są częściowo zapisane po odrzuceniu operacji.

Status: do przejścia manualnie na uruchomionym stacku.

### E2E-06 Publiczny wizard dodania oferty

Kroki:

1. Otwórz `/dodaj-oferte`.
2. Wypełnij dane właściciela, ofertę, adres i zgody.
3. Dodaj poprawne zdjęcie.
4. Wyślij formularz.
5. Sprawdź ekran `/dodaj-oferte/sprawdz-email`.

Oczekiwany wynik:

- formularz wymaga zgody kontaktowej i regulaminu,
- upload zdjęcia przyjmuje tylko bezpieczny typ obrazu,
- submission zapisuje się jako `pending_email_verification`,
- użytkownik widzi ekran oczekiwania na email,
- monitoring loguje `submission_created` i `images_uploaded`.

Status: do przejścia manualnie na uruchomionym stacku.

### E2E-07 Weryfikacja i claim listing

Kroki:

1. Otwórz link weryfikacyjny z emaila lub logów dev mailera.
2. Sprawdź ekran `/dodaj-oferte/potwierdzono`.
3. Przejdź do rejestracji/logowania z claim tokenem.
4. Po zalogowaniu otwórz `/dashboard/claim-listing`.
5. Przejmij ofertę.

Oczekiwany wynik:

- token weryfikacyjny działa tylko raz albo ponownie wydaje claim token dla już zweryfikowanego submissionu,
- claim tworzy ofertę w CRM,
- zdjęcia i adres przechodzą do oferty,
- oferta wymaga review, jeśli moderacja wykryje ryzyko,
- monitoring loguje `submission_verified` i `submission_claimed`.

Status: do przejścia manualnie na uruchomionym stacku.

### E2E-08 Abuse report i legal copy

Kroki:

1. Otwórz publiczną ofertę.
2. Otwórz flow zgłoszenia naruszenia.
3. Wyślij zgłoszenie z poprawną zgodą.
4. Otwórz `/regulamin`, `/polityka-prywatnosci`, `/zasady-publikacji`.

Oczekiwany wynik:

- abuse report jest widoczny z publicznej oferty,
- użytkownik widzi kanał pilnego kontaktu,
- analytics zapisuje `public_listing_abuse_reported`,
- monitoring traktuje abuse jako `abuse_reported`,
- legal pages pokazują wersję dokumentów, kontakt i zasady retencji.

Status: do przejścia manualnie na uruchomionym stacku.

## Negatywne testy bezpieczeństwa

- Publiczny slug z niedozwolonymi znakami powinien zostać odrzucony przez API.
- Brak wymaganych zgód w publicznych formularzach powinien zwrócić czytelny błąd walidacji.
- Upload pliku z fałszywym MIME type powinien zostać odrzucony przez magic-bytes validation.
- Zbyt szybkie wypełnienie publicznego formularza powinno aktywować ochronę antyspamową.
- Wygasły token weryfikacyjny powinien ustawić submission jako expired i zalogować `verification_expired`.
- Niezalogowany użytkownik nie może przejąć submissionu ani wejść w dashboard claim flow.

## Automatyczne bramki wykonane lokalnie

Na potrzeby F7.4 wykonano dostępne bramki techniczne:

- `pnpm --filter api test`
- `pnpm --filter api type-check`
- `pnpm --filter web type-check`
- `git diff --check`

## Luki i follow-up

- Brakuje automatycznego E2E runnera. Rekomendacja: Playwright z projektami `chromium-desktop` i `webkit-mobile`.
- Brakuje seedera danych E2E. Rekomendacja: osobny seed użytkownika free, oferty publikowalnej i submissionu z tokenami.
- Brakuje testowego email sinka. Rekomendacja: Mailpit albo dev email adapter zapisujący verification URL w bazie/logach testowych.
- Manualne przejście scenariuszy powinno być wymagane przed publicznym rolloutem, jeśli staging nie ma jeszcze automatyzacji.
