# Public listing submission wizard

Projekt uproszczonego wizardu publicznego dodania oferty bez konta.

Ten dokument domyka `F5.1` i jest kontraktem UX / produktowym pod zadania `F5.2`-`F5.7`.

## Cel

Pozwolić właścicielowi nieruchomości albo agentowi spoza systemu dodać ofertę w 3-5 minut, bez zakładania konta na starcie. Po weryfikacji emaila oferta może zostać opublikowana jako publiczna strona, a użytkownik może później przejąć ją do CRM przez claim flow.

Najważniejsza zasada: wizard zbiera tylko dane potrzebne do utworzenia sensownego publicznego draftu. Pełne CRM, zaawansowane SEO, statusy, notatki i pipeline pojawiają się dopiero po claimie.

## Publiczny entry point

Rekomendowana ścieżka:

- `/dodaj-oferte` jako publiczny wizard.
- Po wysłaniu: `/dodaj-oferte/sprawdz-email`.
- Po kliknięciu linku email: `/dodaj-oferte/potwierdzono?token=...`.
- Po publikacji / claimie: CTA do `/register?claimToken=...` albo `/login?claimToken=...`.

Alternatywne ścieżki techniczne:

- `/public/submit-listing` jest mniej przyjazne marketingowo.
- `/oferty/dodaj` jest czytelne, ale może mylić się z katalogiem ofert.

Decyzja MVP: użyć `/dodaj-oferte`.

## Wizard UX

Wizard powinien być mobile-first, jednowątkowy i odporny na przerwanie. Krok zapisuje się lokalnie w `localStorage`, ale backendowy draft powstaje dopiero po finalnym submitcie w `F5.2`.

### Krok 1: Podstawy

Cel: sprawdzić, czy użytkownik ma realną ofertę.

Pola wymagane:

- `transactionType`: sprzedaż / wynajem,
- `propertyType`: mieszkanie, dom, działka, lokal, biuro, garaż,
- `city`,
- `price`,
- `title`.

Pola opcjonalne:

- `district`,
- `street`,
- `showExactAddressOnPublicPage`, domyślnie `false`.

Walidacja:

- cena > 0,
- miasto wymagane,
- tytuł 10-120 znaków,
- ulica nie jest wymagana na publicznym etapie.

### Krok 2: Parametry

Cel: zebrać tylko dane, które wpływają na jakość publicznej karty.

Pola warunkowe:

- `areaM2`: wymagane dla mieszkania, domu, lokalu, biura, garażu,
- `plotAreaM2`: wymagane dla domu i działki,
- `rooms`: wymagane dla mieszkania i domu,
- `floor`, `totalFloors`: tylko mieszkanie / lokal / biuro,
- `yearBuilt`: opcjonalne,
- `description`: opcjonalne, ale promowane jako rekomendowane.

Walidacja:

- powierzchnie > 0,
- pokoje 1-99,
- rok budowy 1800 - bieżący rok + 5,
- opis maksymalnie 3000 znaków.

### Krok 3: Zdjęcia

Cel: zwiększyć szansę publikacji i claimu, ale nie blokować użytkownika zbyt wcześnie.

MVP:

- minimum 1 zdjęcie rekomendowane, ale nie twardo wymagane,
- maksymalnie 15 zdjęć, zgodnie z limitem freemium,
- pierwsze zdjęcie jako główne,
- obsługa drag and drop i natywnego mobile picker,
- akceptowane `jpg`, `jpeg`, `png`, `webp`,
- limit pojedynczego pliku: 10 MB,
- limit całej paczki: 80 MB.

Jeśli użytkownik nie doda zdjęć, wizard pokazuje ostrzeżenie i pozwala kontynuować.

### Krok 4: Kontakt i zgody

Cel: umożliwić weryfikację, publikację i późniejszy claim.

Pola wymagane:

- `ownerName`,
- `email`,
- `phone`,
- `contactConsent`,
- `termsConsent`.

Pola opcjonalne:

- `marketingConsent`,
- `agencyName`, jeśli dodaje agent / biuro.

Walidacja:

- email poprawny,
- telefon 6-30 znaków po normalizacji,
- zgody wymagane oddzielnie,
- honeypot `website` ukryty dla ludzi.

### Krok 5: Podsumowanie

Cel: finalne sprawdzenie i wysyłka.

Sekcje:

- podstawowe dane oferty,
- lokalizacja,
- parametry,
- zdjęcia,
- kontakt,
- widoczność adresu.

Akcje:

- `Wyślij do weryfikacji`,
- `Wróć i popraw`,
- po submitcie informacja: „Sprawdź email, żeby potwierdzić publikację”.

## Minimalny model submission

`F5.2` powinno dodać osobną encję, np. `PublicListingSubmission`, zamiast od razu tworzyć `Listing`.

Rekomendowane pola:

- `id`,
- `status`: `draft`, `pending_email_verification`, `verified`, `published`, `claimed`, `rejected`, `expired`,
- `source`: `public_wizard`,
- `claimTokenHash`,
- `verificationTokenHash`,
- `verificationExpiresAt`,
- `verifiedAt`,
- `claimedAt`,
- `publishedListingId`,
- `ownerName`,
- `email`,
- `phone`,
- `agencyName`,
- `contactConsent`,
- `termsConsent`,
- `marketingConsent`,
- `ipHash`,
- `userAgent`,
- `metadata`,
- `payload`.

`payload` powinien trzymać wersję danych sprzed claimu:

- `listing`: pola zgodne z uproszczonym `CreateListingDto`,
- `publicSettings`: publiczny tytuł/opis, widoczność adresu, branding,
- `address`,
- `images`: tymczasowe assety lub upload references,
- `utm` i `referrer`.

## API kontrakty

### `POST /api/public-listing-submissions`

Publiczny endpoint do finalnego submitu wizardu.

Zwraca:

- `id`,
- `status`,
- `emailMasked`,
- `expiresAt`.

Nie zwraca tokenów jawnych.

### `POST /api/public-listing-submissions/:id/resend-verification`

Publiczny endpoint do ponownej wysyłki emaila.

Wymagane zabezpieczenia:

- rate limit per IP,
- rate limit per submission,
- neutralna odpowiedź, żeby nie ujawniać emaili.

### `POST /api/public-listing-submissions/verify`

Przyjmuje `token`, oznacza submission jako `verified`, a w MVP może od razu utworzyć publiczną ofertę w stanie wymagającym claimu / moderacji.

### `POST /api/public-listing-submissions/claim`

Chroniony endpoint dla zalogowanego użytkownika. Przypina submission albo utworzoną ofertę do workspace.

## Mapowanie do `Listing`

Po weryfikacji albo claimie system tworzy `Listing` z wartościami:

- `title` z wizardu,
- `publicTitle` = `title`,
- `description` i `publicDescription` z wizardu,
- `publicationStatus`: docelowo `published`, ale tylko jeśli przejdzie reguły moderacji,
- `status`: `active` dla opublikowanej oferty lub `draft` dla wymagającej review,
- `showExactAddressOnPublicPage`: zgodnie z wyborem użytkownika,
- `estateflowBrandingEnabled`: `true` dla darmowego flow,
- `agentId`: dopiero po claimie albo do technicznego agenta systemowego, jeśli publikacja przed kontem jest wymagana.

Decyzja do F5.2: czy publikować ofertę przed claimem z technicznym właścicielem, czy dopiero po utworzeniu konta. Bezpieczniejsze MVP to: submission verified -> konto/claim -> listing published.

## Antyspam i bezpieczeństwo

MVP guardrails:

- honeypot `website`,
- minimalny czas wypełniania formularza: 5 sekund,
- maksymalny wiek formularza: 24 godziny,
- rate limit per IP na submit i resend,
- hash IP, nie surowy adres IP,
- blokada nadmiernej liczby zdjęć i rozmiarów,
- neutralne komunikaty błędów przy email verification,
- moderation flags dla podejrzanych treści.

Heurystyki do `F5.6` / `F5.7`:

- zbyt wiele linków w opisie,
- powtarzający się telefon/email na wielu submissionach,
- bardzo niska cena względem metrażu,
- brak zdjęć + krótki opis + nowy email,
- słowa zakazane / potencjalnie oszukańcze.

## Eventy analityczne

Rekomendowane eventy:

- `public_listing_wizard_started`,
- `public_listing_wizard_step_completed`,
- `public_listing_submission_created`,
- `public_listing_submission_verified`,
- `public_listing_submission_published`,
- `public_listing_claim_started`,
- `public_listing_claim_completed`,
- `public_listing_submission_rejected`.

Minimalny zestaw pod MVP:

- start wizardu,
- submit,
- email verified,
- claim completed.

## Empty / error states

Wizard powinien mieć:

- autosave restore state po powrocie,
- stan błędu uploadu zdjęcia z możliwością usunięcia pliku,
- stan „email wysłany ponownie”,
- stan „token wygasł” z CTA wysyłki nowego linku,
- stan „oferta już przejęta” z CTA logowania.

## Kryteria akceptacji F5.1

- ustalono publiczną ścieżkę wizardu,
- zdefiniowano kroki i minimalne pola,
- zdefiniowano walidację mobile-first,
- zdefiniowano model submission pod F5.2,
- zdefiniowano flow email verification i claim,
- zdefiniowano podstawowe antyspam / moderation guardrails,
- zdefiniowano eventy do pomiaru.
