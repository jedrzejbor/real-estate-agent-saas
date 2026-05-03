# Sprint 7 — przegląd bezpieczeństwa funkcji publicznych

Data przeglądu: 2026-05-03

## Decyzja

`F7.1` można uznać za wykonane dla poziomu MVP release readiness.

Przegląd objął publiczne endpointy, auth boundaries, uploady, abuse cases i rate limiting. Nie znaleziono krytycznego problemu typu publiczny dostęp do prywatnych danych lub możliwość modyfikacji zasobów bez autoryzacji. Wprowadzono natomiast dodatkowe utwardzenia dla parametrów publicznych i uploadów obrazów.

## Zakres sprawdzony

Publiczne endpointy:

- `GET /api/listings/public`
- `GET /api/listings/public/:slug`
- `GET /api/listings/public-agents/:agentId`
- `POST /api/public-listing-submissions`
- `POST /api/public-listing-submissions/images`
- `POST /api/public-listing-submissions/:id/resend-verification`
- `POST /api/public-listing-submissions/verify`
- `POST /api/public-leads/listings/:slug`
- `POST /api/public-leads/agents/:agentId`
- `POST /api/analytics/public-listings/:slug/events`

Chronione endpointy powiązane:

- `POST /api/public-listing-submissions/claim`
- prywatne CRUD endpointy `/api/listings`
- upload i zarządzanie zdjęciami CRM `/api/listings/:id/images`
- raporty `/api/reports/*`

## Wyniki

### Auth boundaries

Status: OK.

- Publiczne endpointy są jawnie oznaczone `@Public()`.
- Claim publicznego submissionu pozostaje endpointem chronionym i wymaga zalogowanego użytkownika.
- Prywatne listing CRUD, historia, publikacja, upload zdjęć CRM i raporty wymagają auth.
- Publiczny widok oferty zwraca wyłącznie ofertę z `publicationStatus = published`.
- Publiczny profil agenta zwraca tylko opublikowane oferty.

### Publiczne parametry URL

Status: poprawione.

Ryzyko:

- `slug` w publicznych endpointach był przekazywany jako zwykły string.
- `resend-verification` przyjmował `id` bez jawnego `ParseUUIDPipe`.

Zmiana:

- dodano `PublicSlugPipe`, który wymusza format publicznego sluga i limit długości 160 znaków,
- podpięto go do:
  - `GET /api/listings/public/:slug`,
  - `POST /api/public-leads/listings/:slug`,
  - `POST /api/analytics/public-listings/:slug/events`,
- dodano `ParseUUIDPipe` do `POST /api/public-listing-submissions/:id/resend-verification`.

### Upload review

Status: poprawione.

Istniejące zabezpieczenia:

- limit 10 MB na plik,
- limit 15 plików w request,
- dozwolone MIME: JPG, PNG, WebP,
- losowe nazwy plików,
- backendowy limit `imagesPerListing`,
- osobne katalogi `uploads/listings` i `uploads/public-submissions`.

Ryzyko:

- wcześniejsza walidacja uploadu opierała się głównie na `mimetype`, który może zostać sfałszowany przez klienta.

Zmiana:

- dodano `assertSafeImageUpload`,
- walidacja sprawdza:
  - pusty plik,
  - dozwolony MIME,
  - dozwolone rozszerzenie,
  - magic bytes dla JPEG, PNG i WebP,
- podpięto ją do uploadów:
  - CRM listing images,
  - public submission images.

### Abuse cases

Status: OK dla MVP, wymaga procedury operacyjnej.

Istniejące zabezpieczenia:

- honeypot `website`,
- minimalny czas wypełniania formularza,
- hash IP i fingerprint kontaktu,
- limity per IP/email/telefon dla publicznych submissionów,
- rate limit na resend verification,
- rate limit na public leads,
- podstawowa heurystyka linków, podejrzanych fraz i brakujących zdjęć,
- widoczny abuse report na publicznej ofercie.

Pozostałe ryzyko:

- abuse report zapisuje event, ale nie ma jeszcze moderation queue.

Rekomendacja:

- w rollout checklist opisać ręczną procedurę dziennego przeglądu eventów `public_listing_abuse_reported`.

### Rate limiting

Status: OK dla MVP.

Zabezpieczenia:

- globalny `ThrottlerGuard`,
- public listing submissions: `5/min`,
- public submission images: `5/min`,
- resend verification: `10/min`,
- verification: `20/min`,
- public leads: `8/min`,
- public listing analytics: `20/min`,
- dodatkowe aplikacyjne limity dla submissionów i resendów po hash IP / kontakcie.

Ryzyko:

- public analytics endpoint może generować szum przy intensywnym ruchu botów, mimo throttlingu.

Rekomendacja:

- w monitoringu obserwować spike `public_listing_viewed`, `public_listing_gallery_image_viewed` i `public_listing_abuse_reported`.

## Zmiany wprowadzone w ramach `F7.1`

- Dodano `apps/api/src/common/public-param-security.ts`.
- Dodano `apps/api/src/common/image-upload-security.ts`.
- Podpięto `PublicSlugPipe` w publicznych endpointach listingów, leadów i analytics.
- Podpięto `ParseUUIDPipe` dla resend verification.
- Podpięto magic-bytes validation do uploadów zdjęć CRM i publicznych submissionów.

## Ryzyka pozostające do rollout checklist

1. Lokalny storage `uploads` jest akceptowalny dla kontrolowanego MVP, ale dla produkcyjnego rollout powinien zostać zastąpiony S3/R2 albo równoważnym storage obiektowym.
2. Brakuje automatycznego cleanupu nieprzejętych zdjęć z publicznych submissionów.
3. Abuse moderation jest ręczna i wymaga procedury operacyjnej.
4. Legal copy nadal wymaga review prawnego przed publicznym launch’em.
5. Publiczny katalog `/oferty` i mapa są świadomie poza release readiness.

## Rekomendacja końcowa

Można przejść dalej w Sprincie 7 do `F7.2-F7.6`.

Najważniejsze kolejne kroki:

- formalny legal/privacy closeout,
- test plan E2E,
- monitoring i alerty dla publicznych flow,
- rollout checklist z decyzją storage i procedurą abuse.
