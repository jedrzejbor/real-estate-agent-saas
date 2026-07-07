# PodAdresem — mapa modułów do audytu bezpieczeństwa

> Dokument żywy. Aktualizuj przy każdej zmianie modułu, dodaniu endpointu,
> zmianie uprawnień, zmianie danych osobowych, zmianie uploadu, zmianie
> integracji zewnętrznej albo dodaniu nowego modułu.
>
> Ostatnia aktualizacja: 2026-05-28
> Właściciel dokumentu: Product/Engineering
> Cel: stały rejestr modułów, powierzchni ataku i notatek zmian do okresowego
> audytu bezpieczeństwa aplikacji.

---

## Jak używać tego dokumentu

1. Przy każdej zmianie w module dopisz wpis w sekcji `Adnotacje zmian` tego
   modułu.
2. Jeśli zmiana dotyczy publicznego endpointu, danych osobowych, ról,
   uploadów, maili, tokenów albo płatnych limitów, oznacz ją jako `security`.
3. Jeśli dochodzi nowy moduł, skopiuj szablon z końca dokumentu i dodaj go do
   rejestru modułów.
4. Przed większym release przejdź checklistę okresowego audytu.
5. Po audycie dopisz wynik w `Historia audytów`.

Minimalny wpis przy zmianie:

```text
2026-05-28 | author | security/product | co się zmieniło | co sprawdzić w audycie
```

---

## Kryteria aktualizacji

Dokument musi zostać zaktualizowany, gdy zmienia się co najmniej jeden z
poniższych elementów:

- nowe lub zmienione endpointy API,
- nowe lub zmienione strony publiczne, auth lub dashboard,
- nowe role, reguły dostępu albo przekierowania,
- nowe pola danych osobowych lub nowe miejsce ich wyświetlania,
- upload plików, publiczne assety, generowanie linków albo obsługa storage,
- formularze publiczne, leady, feedback, ankiety, analytics,
- tokeny, hasła, reset hasła, cookies, refresh flow,
- integracje zewnętrzne, mailing, import/export danych,
- limity planów, feature flags, mechanizmy nadużyć,
- migracje bazy wpływające na dane wrażliwe lub ownership.

---

## Stała checklista audytu okresowego

### Auth i sesje

- Czy wszystkie endpointy prywatne są chronione globalnym `JwtAuthGuard`?
- Czy publiczne endpointy mają świadome `@Public()` i są wymienione w tym
  dokumencie?
- Czy refresh token, reset hasła i usunięcie konta nie ujawniają danych?
- Czy frontend nie pokazuje CTA lub ekranów niezgodnych z rolą użytkownika?
- Czy użytkownik prywatny (`viewer`) nie ma dostępu do CRM agenta?

### Autoryzacja i ownership

- Czy każdy dostęp do zasobu sprawdza właściciela/agenta/agencję?
- Czy admin endpoints mają `@Roles(UserRole.ADMIN)`?
- Czy publiczne widoki zwracają tylko jawnie opublikowane dane?
- Czy claim, approve, reject, publish, unpublish i rollback są odporne na IDOR?

### Dane osobowe

- Czy moduł przetwarza email, telefon, imię, nazwisko, adres, notatki lub IP?
- Czy publiczne odpowiedzi API nie zwracają danych wewnętrznych?
- Czy usunięcie konta albo anonimizacja obejmuje dane tego modułu?
- Czy dane publiczne są zgodne z regulaminem i polityką prywatności?

### Publiczne formularze i abuse

- Czy formularz publiczny ma rate limit, walidację, honeypot lub heurystyki?
- Czy walidacja backendowa jest niezależna od walidacji frontendowej?
- Czy błędy nie ujawniają, czy email/telefon istnieje w systemie?
- Czy można monitorować nadużycia i ręcznie reagować?

### Uploady i pliki

- Czy każdy upload ma limit liczby plików, rozmiaru, MIME, rozszerzenia i magic
  bytes?
- Czy publiczne URL-e plików nie pozwalają na path traversal?
- Czy usuwanie plików ogranicza ścieżkę do oczekiwanego katalogu?
- Czy istnieje decyzja dla produkcyjnego storage i cleanupu starych plików?

### API, walidacja i baza

- Czy DTO mają walidację, a globalny `ValidationPipe` ma `whitelist` i
  `forbidNonWhitelisted`?
- Czy query parametry publiczne mają limity, typy i zakresy?
- Czy sort/filter/search nie pozwalają na niekontrolowane zapytania?
- Czy migracja nie osłabia constraintów ownership lub statusów?

### Monitoring i operacje

- Czy ważne zdarzenia mają event analytics albo log operacyjny?
- Czy moduł ma testy dla granic dostępu i ścieżek publicznych?
- Czy znane ryzyka mają właściciela i status?
- Czy dokumentacja legal/privacy wymaga aktualizacji?

---

## Rejestr modułów

| ID | Moduł | Backend | Frontend | Publiczny? | Dane wrażliwe | Priorytet audytu |
| --- | --- | --- | --- | --- | --- | --- |
| M01 | Platforma, konfiguracja, guardy | `app.module.ts`, `main.ts`, `common/*` | `layout.tsx`, `middleware.ts` | częściowo | tokeny, CORS, uploads | krytyczny |
| M02 | Auth, użytkownicy, role, konto | `auth/*`, `users/*` | `(auth)/*`, settings | częściowo | hasła, email, profil | krytyczny |
| M03 | Oferty CRM agenta | `listings/*` | dashboard listings, `listing-form` | częściowo | adresy, zdjęcia, ownership | krytyczny |
| M04 | Publiczny katalog i strony ofert | `listings/public*` | `(public)/oferty/*`, agenci | tak | publiczne dane ofert/agenta | wysoki |
| M05 | Publiczne dodawanie oferty i panel sprzedającego | `public-listing-submissions/*` | `(public)/dodaj-oferte`, `(seller)/seller` | częściowo | właściciel, kontakt, adres | krytyczny |
| M06 | Leady i zapytania publiczne | `public-leads/*` | formularze kontaktowe, inquiries | częściowo | email, telefon, treść zapytania | krytyczny |
| M07 | CRM klientów | `clients/*` | dashboard clients | nie | klienci, notatki, preferencje | krytyczny |
| M08 | Kalendarz i spotkania | `appointments/*` | dashboard calendar | nie | terminy, klienci, notatki | wysoki |
| M09 | Dashboard, raporty, wyszukiwarka | `dashboard/*`, `reports/*`, `search/*` | dashboard, reports, global search | nie | agregaty, dane CRM | wysoki |
| M10 | Powiadomienia i aktywność | `notifications/*`, `activity/*` | topbar, activity widgets | nie | zdarzenia użytkownika | średni |
| M11 | Analytics i monitoring produktu | `analytics/*`, `monitoring/*` | `analytics.ts`, public events | częściowo | IP/fingerprint/eventy | wysoki |
| M12 | Feedback produktowy i ankiety | `product-feedback/*` | feedback pages/widget | częściowo | opinie, email opcjonalnie | średni |
| M13 | Lokalizacje, SEO, publiczne filtry | `locations/*` | katalog, city autocomplete, sitemap | tak | lokalizacja ofert | średni |
| M14 | Email i komunikacja systemowa | `email/*` | wywoływane pośrednio | częściowo | email, tokeny linków | wysoki |

---

## M01 — Platforma, konfiguracja, guardy

**Zakres**

- Globalne moduły NestJS, globalne guardy, globalna walidacja, CORS, static
  assets, konfiguracja bazy.
- Frontendowy root layout, `AuthProvider`, middleware i podstawowe
  przekierowania.

**Pliki**

- Backend: `apps/api/src/app.module.ts`, `apps/api/src/main.ts`,
  `apps/api/src/common/*`.
- Frontend: `apps/web/src/app/layout.tsx`, `apps/web/src/middleware.ts`,
  `apps/web/src/contexts/auth-context.tsx`, `apps/web/src/lib/api-client.ts`.

**Powierzchnia bezpieczeństwa**

- Globalny `JwtAuthGuard`, `RolesGuard`, `ThrottlerGuard`.
- `ValidationPipe` z `whitelist`, `forbidNonWhitelisted`, `transform`.
- CORS z `FRONTEND_URL`.
- Publiczne `/uploads/*` z lokalnego storage.
- Globalne odświeżanie tokenów i obsługa `auth:unauthorized`.

**Ryzyka do pilnowania**

- Rozjazd między dokumentacją a realnymi publicznymi endpointami.
- Zbyt szeroki CORS w produkcji.
- Lokalny storage uploadów bez produkcyjnej polityki retencji.
- Brak security headers/CSP w Next.js, jeśli aplikacja trafia publicznie.

**Adnotacje zmian**

| Data | Autor | Typ | Zmiana | Do sprawdzenia |
| --- | --- | --- | --- | --- |
| 2026-05-28 | Codex | audit-map | Utworzono rejestr modułu. | Przy najbliższym audycie potwierdzić produkcyjne wartości CORS, cookies i storage. |

---

## M02 — Auth, użytkownicy, role, konto

**Zakres**

- Rejestracja, logowanie, refresh token, reset hasła, `/auth/me`, profil,
  zmiana hasła, usunięcie konta.
- Role: agent/admin oraz prywatny sprzedający jako `viewer`.

**Endpointy**

- Publiczne: `POST /api/auth/register`, `POST /api/auth/login`,
  `POST /api/auth/password-reset/request`,
  `POST /api/auth/password-reset/confirm`, `POST /api/auth/refresh`.
- Prywatne: `GET /api/auth/me`, `PATCH /api/auth/me/profile`,
  `POST /api/auth/me/change-password`, `DELETE /api/auth/me`.

**Frontend**

- `(auth)/login`, `(auth)/register`, `(auth)/forgot-password`,
  `(auth)/reset-password`.
- Settings: konto, profil agenta, hasło, usunięcie konta.
- `getDefaultAuthenticatedPath`, `isPrivateSellerUser`.

**Dane wrażliwe**

- Email, hash hasła, refresh token, reset token, imię, nazwisko, telefon,
  profil agenta, agencja, plan i uprawnienia.

**Ryzyka do pilnowania**

- Enumeracja emaili przy login/reset.
- Nieprawidłowe przekierowanie roli `viewer` do dashboardu CRM.
- Brak pełnej anonimizacji/usunięcia danych zależnych.
- Nieaktualne limity planu w tokenie/me response.

**Adnotacje zmian**

| Data | Autor | Typ | Zmiana | Do sprawdzenia |
| --- | --- | --- | --- | --- |
| 2026-05-28 | Codex | audit-map | Utworzono rejestr modułu. | Dodać wynik kolejnego audytu resetu hasła i usunięcia konta. |

---

## M03 — Oferty CRM agenta

**Zakres**

- Prywatny CRUD ofert, historia zmian, publikacja, cofanie statusu, upload i
  zarządzanie zdjęciami.

**Endpointy**

- Prywatne: `POST /api/listings`, `GET /api/listings`, `GET /api/listings/:id`,
  `PATCH /api/listings/:id`, `DELETE /api/listings/:id`,
  `GET /api/listings/:id/history`, `POST /api/listings/:id/publish`,
  `POST /api/listings/:id/unpublish`,
  `POST /api/listings/:id/status/rollback`.
- Zdjęcia: `POST /api/listings/:id/images`,
  `PATCH /api/listings/:id/images/reorder`,
  `PATCH /api/listings/:id/images/:imageId`,
  `POST /api/listings/:id/images/:imageId/primary`,
  `DELETE /api/listings/:id/images/:imageId`.

**Frontend**

- `/dashboard/listings`, `/dashboard/listings/new`,
  `/dashboard/listings/[id]`, `/dashboard/listings/[id]/edit`.
- Komponenty `ListingForm`, `ListingImageManager`,
  `ListingPublicationPanel`.

**Dane wrażliwe**

- Dane nieruchomości, adres, właściciel pośrednio, zdjęcia, historia zmian,
  status publikacji, ownership agenta/agencji.

**Ryzyka do pilnowania**

- IDOR między agentami/agencjami.
- Publikacja danych, które nie powinny trafić do publicznego widoku.
- Upload zdjęć i usuwanie lokalnych plików.
- Limity planu dla ofert i zdjęć.

**Adnotacje zmian**

| Data | Autor | Typ | Zmiana | Do sprawdzenia |
| --- | --- | --- | --- | --- |
| 2026-05-28 | Codex | audit-map | Utworzono rejestr modułu. | Przy audycie porównać response prywatny i publiczny, szczególnie pola adresu i agenta. |

---

## M04 — Publiczny katalog i strony ofert

**Zakres**

- Publiczny katalog `/oferty`, szczegół oferty `/oferty/[slug]`, publiczne
  profile agentów `/agenci/[id]`, publiczne filtrowanie i mapa.

**Endpointy**

- Publiczne: `GET /api/listings/public`,
  `GET /api/listings/public/catalog`,
  `GET /api/listings/public-agents/:agentId`,
  `GET /api/listings/public/:slug`.

**Frontend**

- `(public)/oferty/page.tsx`, `(public)/oferty/[slug]/page.tsx`,
  `(public)/agenci/[id]/page.tsx`.
- Komponenty: `PublicListingCatalog`, `PublicListingGallery`,
  `PublicListingContactForm`, `PublicListingAbuseReport`,
  `PublicListingsHeroActions`.

**Dane wrażliwe**

- Wyłącznie dane świadomie publiczne: oferta, część adresu, zdjęcia, cena jeśli
  widoczna, dane kontaktowe/profil agenta jeśli opublikowane.

**Ryzyka do pilnowania**

- Publiczne API nie może zwracać draftów, danych prywatnych ani ukrytej ceny.
- Parametry filtrów muszą mieć limity i walidację.
- Slug musi być walidowany.
- CTA i linki muszą respektować stan logowania i rolę użytkownika.

**Adnotacje zmian**

| Data | Autor | Typ | Zmiana | Do sprawdzenia |
| --- | --- | --- | --- | --- |
| 2026-05-28 | Codex | product | CTA na `/oferty` zależne od logowania: agent trafia do `/dashboard/listings/new`, niezalogowany do `/dodaj-oferte` i `/register`, sprzedający do swojego flow. | Przy audycie UI sprawdzić, czy role nie widzą mylących lub niedozwolonych akcji. |
| 2026-05-28 | Codex | audit-map | Utworzono rejestr modułu. | Sprawdzić publiczne payloady katalogu po każdej zmianie modelu Listing. |

---

## M05 — Publiczne dodawanie oferty i panel sprzedającego

**Zakres**

- Dodanie oferty bez konta, upload tymczasowych zdjęć, weryfikacja email,
  claim, admin approve/reject, panel prywatnego sprzedającego i edycja
  zgłoszeń.

**Endpointy**

- Publiczne: `POST /api/public-listing-submissions`,
  `POST /api/public-listing-submissions/images`,
  `POST /api/public-listing-submissions/:id/resend-verification`,
  `POST /api/public-listing-submissions/verify`.
- Prywatne sprzedającego: `POST /api/public-listing-submissions/seller`,
  `GET /api/public-listing-submissions/seller`,
  `GET /api/public-listing-submissions/seller/:id`,
  `PATCH /api/public-listing-submissions/seller/:id`,
  `POST /api/public-listing-submissions/seller/:id/renew`,
  `POST /api/public-listing-submissions/seller/:id/resubmit`,
  `POST /api/public-listing-submissions/seller/:id/unpublish`.
- Prywatne claim/admin: `POST /api/public-listing-submissions/claim`,
  `GET /api/admin/listing-submissions`,
  `POST /api/admin/listing-submissions/:id/approve`,
  `POST /api/admin/listing-submissions/:id/reject`,
  `POST /api/admin/listing-submissions/expiring-reminders`.

**Frontend**

- `/dodaj-oferte`, `/dodaj-oferte/sprawdz-email`,
  `/dodaj-oferte/potwierdzono`, `/seller`,
  `/seller/listings/[id]`, `/seller/listings/[id]/edit`,
  `/dashboard/admin/submissions`.

**Dane wrażliwe**

- Dane właściciela, email, telefon, adres nieruchomości, zdjęcia, tokeny
  weryfikacyjne, status moderacji, powiązanie z `ownerUserId`.

**Ryzyka do pilnowania**

- Przejęcie zgłoszenia przez niewłaściwego użytkownika.
- Admin claim/approve nie może przenosić własności w sposób odbierający dostęp
  właścicielowi.
- Publiczne uploady są podatne na spam i koszt storage.
- Token weryfikacyjny musi mieć limit użycia i nie może wyciekać w logach.

**Adnotacje zmian**

| Data | Autor | Typ | Zmiana | Do sprawdzenia |
| --- | --- | --- | --- | --- |
| 2026-05-28 | Codex | audit-map | Utworzono rejestr modułu. | Powiązać z analizą `SELLER_FLOW_ANALYSIS.md` i sprawdzić owner flow w kolejnym audycie. |

---

## M06 — Leady i zapytania publiczne

**Zakres**

- Formularz kontaktowy na publicznej ofercie, formularz profilu agenta,
  inbox zapytań dla agenta i widok zapytań sprzedającego.

**Endpointy**

- Publiczne: `POST /api/public-leads/listings/:slug`,
  `POST /api/public-leads/agents/:agentId`.
- Prywatne: `GET /api/public-leads`,
  `GET /api/public-leads/seller`,
  `PATCH /api/public-leads/seller/:id`.

**Frontend**

- `PublicListingContactForm`, `PublicProfileContactForm`,
  `/dashboard/inquiries`, seller inquiries.

**Dane wrażliwe**

- Imię, nazwisko, email, telefon, treść wiadomości, preferencje kontaktu,
  source, user agent, hash IP/fingerprint.

**Ryzyka do pilnowania**

- Spam i nadużycia formularzy publicznych.
- Ujawnienie danych leadów innemu agentowi lub sprzedającemu.
- Automatyczne tworzenie/łączenie klienta CRM musi respektować ownership.
- Rate limiting i abuse protection muszą być zgodne z ruchem produkcyjnym.

**Adnotacje zmian**

| Data | Autor | Typ | Zmiana | Do sprawdzenia |
| --- | --- | --- | --- | --- |
| 2026-05-30 | Codex | product/security | Lista zapytań publicznych zwraca i wyświetla główne zdjęcie powiązanej oferty w panelu agenta i sprzedającego. | Przy audycie sprawdzić, że `primaryImage` pochodzi wyłącznie z oferty w scope agenta/sprzedającego i nie ujawnia zdjęć niepowiązanych leadów. |
| 2026-05-28 | Codex | audit-map | Utworzono rejestr modułu. | Przy audycie sprawdzić deduplikację leadów i widoczność dla sprzedającego. |

---

## M07 — CRM klientów

**Zakres**

- Klienci, import CSV, preferencje, notatki, historia, statusy i rollback.

**Endpointy**

- Prywatne: `POST /api/clients`, `POST /api/clients/import`,
  `GET /api/clients`, `GET /api/clients/:id`,
  `GET /api/clients/:id/history`, `PATCH /api/clients/:id`,
  `POST /api/clients/:id/status/rollback`, `DELETE /api/clients/:id`,
  `GET /api/clients/:id/notes`, `POST /api/clients/:id/notes`,
  `DELETE /api/clients/:clientId/notes/:noteId`.

**Frontend**

- `/dashboard/clients`, `/dashboard/clients/new`,
  `/dashboard/clients/[id]`, `/dashboard/clients/[id]/edit`.
- Komponenty `ClientForm`, `ClientCsvImport`, `ClientNotes`,
  `ClientPreferences`.

**Dane wrażliwe**

- Dane osobowe klientów, budżet, preferencje zakupowe, źródło, status,
  notatki agenta.

**Ryzyka do pilnowania**

- IDOR między agentami/agencjami.
- Import CSV jako wektor masowego wprowadzenia złych danych.
- Notatki mogą zawierać dane szczególnych kategorii, jeśli użytkownik je wpisze.
- Usunięcie konta/agenta powinno mieć jasny wpływ na klientów.

**Adnotacje zmian**

| Data | Autor | Typ | Zmiana | Do sprawdzenia |
| --- | --- | --- | --- | --- |
| 2026-05-28 | Codex | audit-map | Utworzono rejestr modułu. | Przy audycie dodać testy importu CSV i ownership notatek. |

---

## M08 — Kalendarz i spotkania

**Zakres**

- Spotkania agenta, powiązania z klientem i ofertą, statusy oraz edycja.

**Endpointy**

- Prywatne: `POST /api/appointments`, `GET /api/appointments`,
  `GET /api/appointments/:id`, `PATCH /api/appointments/:id`,
  `DELETE /api/appointments/:id`.

**Frontend**

- `/dashboard/calendar`, `/dashboard/calendar/new`,
  `/dashboard/calendar/[id]`, `/dashboard/calendar/[id]/edit`.
- Komponent `AppointmentForm`.

**Dane wrażliwe**

- Terminy, opisy spotkań, powiązani klienci i oferty, potencjalne adresy.

**Ryzyka do pilnowania**

- Dostęp do spotkań innego agenta.
- Powiązanie spotkania z klientem/ofertą spoza scope użytkownika.
- Ujawnienie szczegółów w dashboard KPI lub global search.

**Adnotacje zmian**

| Data | Autor | Typ | Zmiana | Do sprawdzenia |
| --- | --- | --- | --- | --- |
| 2026-05-28 | Codex | audit-map | Utworzono rejestr modułu. | Przy audycie sprawdzić walidację relacji client/listing przy create/update. |

---

## M09 — Dashboard, raporty, wyszukiwarka

**Zakres**

- Dashboard KPI, raporty, freemium metrics, global search.

**Endpointy**

- Prywatne: `GET /api/dashboard/stats`, `GET /api/search`,
  `GET /api/reports/overview`, `GET /api/reports/listings`,
  `GET /api/reports/clients`, `GET /api/reports/appointments`,
  `GET /api/reports/freemium-metrics`.

**Frontend**

- `/dashboard`, `/dashboard/reports`, `GlobalSearch`, raportowe komponenty.

**Dane wrażliwe**

- Agregaty biznesowe, wyniki sprzedaży, aktywność, dopasowania wyszukiwania,
  dane klientów/ofert/spotkań w skróconych wynikach.

**Ryzyka do pilnowania**

- Raporty nie mogą agregować danych spoza agenta/agencji.
- Search nie może zwracać zasobów spoza scope.
- Feature gates dla raportów płatnych muszą być egzekwowane na backendzie.
- Admin/freemium metrics muszą mieć właściwą rolę, jeśli są operacyjne.

**Adnotacje zmian**

| Data | Autor | Typ | Zmiana | Do sprawdzenia |
| --- | --- | --- | --- | --- |
| 2026-05-28 | Codex | audit-map | Utworzono rejestr modułu. | Sprawdzić role i plan gates dla `freemium-metrics`. |

---

## M10 — Powiadomienia i aktywność

**Zakres**

- Powiadomienia użytkownika, oznaczanie jako przeczytane, historia aktywności
  używana w dashboardzie i modułach CRM.

**Endpointy**

- Prywatne: `GET /api/notifications`, `POST /api/notifications/read`.
- Serwisy: `activity/*`.

**Frontend**

- `NotificationsDropdown`, `ActivityHistoryCard`, dashboard widgets.

**Dane wrażliwe**

- Typy zdarzeń, identyfikatory zasobów, czas aktywności, kontekst biznesowy.

**Ryzyka do pilnowania**

- Powiadomienia nie mogą ujawniać zasobów spoza scope.
- Treść aktywności nie powinna zapisywać nadmiarowych danych osobowych.
- Oznaczanie jako przeczytane musi dotyczyć tylko bieżącego użytkownika.

**Adnotacje zmian**

| Data | Autor | Typ | Zmiana | Do sprawdzenia |
| --- | --- | --- | --- | --- |
| 2026-05-28 | Codex | audit-map | Utworzono rejestr modułu. | Przy audycie sprawdzić payload notification i activity metadata. |

---

## M11 — Analytics i monitoring produktu

**Zakres**

- Zdarzenia aplikacyjne użytkowników, publiczne zdarzenia ofert, monitoring
  produktu i alerty operacyjne.

**Endpointy**

- Prywatne: `POST /api/analytics/events`.
- Publiczne: `POST /api/analytics/public-listings/:slug/events`.
- Serwisy: `monitoring/*`.

**Frontend**

- `apps/web/src/lib/analytics.ts`, public listing analytics,
  abuse report events.

**Dane wrażliwe**

- Eventy, źródła, user agent, hash IP/fingerprint, identyfikatory ofert,
  identyfikatory użytkowników w eventach prywatnych.

**Ryzyka do pilnowania**

- Public analytics może generować szum i koszt przy botach.
- Event metadata nie powinna zawierać surowych danych osobowych.
- Publiczny slug musi być walidowany.
- Retencja eventów powinna być określona przed produkcją.

**Adnotacje zmian**

| Data | Autor | Typ | Zmiana | Do sprawdzenia |
| --- | --- | --- | --- | --- |
| 2026-05-28 | Codex | audit-map | Utworzono rejestr modułu. | Ustalić retencję eventów i procedurę przeglądu abuse reports. |

---

## M12 — Feedback produktowy i ankiety

**Zakres**

- Feedback użytkowników, publiczny formularz feedbacku, pomysły, głosy,
  ankiety funkcjonalne i admin management.

**Endpointy**

- Prywatne: `POST /api/product-feedback`, `GET /api/product-feedback/my`,
  `GET /api/product-feedback/votable`,
  `POST /api/product-feedback/:id/votes`,
  `DELETE /api/product-feedback/:id/votes`,
  `GET /api/feature-surveys/active`,
  `POST /api/feature-surveys/:id/responses`,
  `PATCH /api/feature-surveys/:id/responses/my`.
- Publiczne: `POST /api/product-feedback/public`,
  `GET /api/feature-surveys/public/active`,
  `POST /api/feature-surveys/:id/public-responses`.
- Admin: `/api/admin/product-feedback/*`, `/api/admin/feature-surveys/*`.

**Frontend**

- `/feedback`, `/dashboard/feedback`, `/dashboard/feedback/ideas`,
  `/dashboard/feedback/surveys`, feedback widget.

**Dane wrażliwe**

- Treści opinii, głosy, odpowiedzi ankietowe, opcjonalne dane kontaktowe,
  kontekst użytkownika.

**Ryzyka do pilnowania**

- Public feedback spam i treści szkodliwe.
- Admin endpoints muszą mieć `UserRole.ADMIN`.
- Odpowiedzi ankiet nie powinny ujawniać innych użytkowników.
- Publiczne odpowiedzi nie mogą pozwolić na masową enumerację.

**Adnotacje zmian**

| Data | Autor | Typ | Zmiana | Do sprawdzenia |
| --- | --- | --- | --- | --- |
| 2026-05-28 | Codex | audit-map | Utworzono rejestr modułu. | Przy audycie sprawdzić rate limiting publicznych ankiet i feedbacku. |

---

## M13 — Lokalizacje, SEO, publiczne filtry

**Zakres**

- Katalog miast/lokalizacji, normalizacja, autocomplete, publiczne parametry SEO,
  sitemap i robots.

**Endpointy**

- Publiczne: `GET /api/locations`.

**Frontend**

- `CityAutocomplete`, `public-catalog-seo.ts`, `/sitemap.ts`, `/robots.ts`,
  publiczne filtry katalogu.

**Dane wrażliwe**

- Lokalizacja ofert w publicznym katalogu. Dane katalogowe lokalizacji nie są
  same w sobie wrażliwe.

**Ryzyka do pilnowania**

- Autocomplete nie może być wektorem kosztownych zapytań.
- Filtry lokalizacji nie mogą omijać ograniczeń publicznego katalogu.
- Sitemap nie powinna indeksować widoków z prywatnymi lub niekanonicznymi
  parametrami.

**Adnotacje zmian**

| Data | Autor | Typ | Zmiana | Do sprawdzenia |
| --- | --- | --- | --- | --- |
| 2026-05-28 | Codex | audit-map | Utworzono rejestr modułu. | Przy audycie SEO sprawdzić canonical i noindex dla filtrów. |

---

## M14 — Email i komunikacja systemowa

**Zakres**

- Wysyłka maili systemowych: weryfikacja submissionu, reset hasła,
  przypomnienia, potencjalne powiadomienia.

**Pliki**

- Backend: `apps/api/src/email/*`.
- Wywołania pośrednie w `auth`, `public-listing-submissions`,
  `notifications`.

**Dane wrażliwe**

- Adres email, tokeny linków, treść maili, status dostarczenia jeśli zostanie
  dodany provider.

**Ryzyka do pilnowania**

- Tokeny nie mogą trafiać do logów ani analytics.
- Linki muszą wskazywać właściwy frontend origin.
- Maile nie powinny ujawniać, czy konto istnieje, jeśli dotyczy resetu hasła.
- Po dodaniu providera trzeba dopisać integrację, sekrety i retencję logów.

**Adnotacje zmian**

| Data | Autor | Typ | Zmiana | Do sprawdzenia |
| --- | --- | --- | --- | --- |
| 2026-05-28 | Codex | audit-map | Utworzono rejestr modułu. | Przy wdrożeniu providera email dodać sekcję integracji i review sekretów. |

---

## Zależności między modułami

| Źródło | Zależność | Ryzyko audytowe |
| --- | --- | --- |
| Auth -> wszystkie moduły prywatne | `CurrentUser`, role, entitlements | Błąd w auth rozszerza się na cały system. |
| Listings -> Public catalog | Mapping prywatna oferta -> publiczny payload | Możliwy wyciek pól prywatnych. |
| Public submissions -> Listings | Approve/claim tworzy Listing | Możliwy błąd ownership i statusu publikacji. |
| Public leads -> Clients | Lead może tworzyć lub łączyć klienta CRM | Możliwy błąd deduplikacji albo przypisania agenta. |
| Clients/Listings/Appointments -> Reports/Search | Agregacja i wyszukiwanie | Możliwy wyciek cross-tenant. |
| Uploads -> Public pages | Zdjęcia są publiczne przez `/uploads/*` | Wymaga walidacji plików i kontroli ścieżek. |
| Analytics -> Public pages | Publiczne eventy po slugach | Wymaga rate limitu i ograniczania metadata. |
| Email -> Auth/Public submissions | Linki z tokenami | Wymaga retencji, origin i braku logowania tokenów. |

---

## Publiczne endpointy do regularnego sprawdzenia

Aktualny stan na 2026-05-28:

- `GET /api/`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`
- `POST /api/auth/refresh`
- `GET /api/listings/public`
- `GET /api/listings/public/catalog`
- `GET /api/listings/public-agents/:agentId`
- `GET /api/listings/public/:slug`
- `POST /api/public-listing-submissions`
- `POST /api/public-listing-submissions/images`
- `POST /api/public-listing-submissions/:id/resend-verification`
- `POST /api/public-listing-submissions/verify`
- `POST /api/public-leads/listings/:slug`
- `POST /api/public-leads/agents/:agentId`
- `GET /api/locations`
- `POST /api/analytics/public-listings/:slug/events`
- `POST /api/product-feedback/public`
- `GET /api/feature-surveys/public/active`
- `POST /api/feature-surveys/:id/public-responses`

Przy każdym audycie porównaj tę listę z realnymi `@Public()` w kontrolerach:

```bash
rg -n "@Public\\(\\)|@Controller|@(Get|Post|Patch|Delete)" apps/api/src --glob "*controller.ts"
```

---

## Znane ryzyka operacyjne

| Ryzyko | Moduł | Status | Następny krok |
| --- | --- | --- | --- |
| Lokalny storage `uploads` zamiast storage obiektowego | M01, M03, M05 | otwarte | Przed produkcją wybrać S3/R2 lub równoważne i dodać lifecycle policy. |
| Cleanup nieprzejętych zdjęć publicznych submissionów | M05 | otwarte | Dodać zadanie czyszczące i testy ścieżek plików. |
| Moderacja abuse reports ręczna | M04, M11 | otwarte | Dodać procedurę albo kolejkę moderacji. |
| Security headers/CSP niewymienione w kodzie | M01 | do sprawdzenia | Dodać review `next.config.ts` i nagłówków reverse proxy. |
| Lint ma istniejące błędy niezwiązane z security map | M08, M09 | otwarte | Naprawić przed traktowaniem lint jako bramki release. |

---

## Historia audytów

| Data | Zakres | Wynik | Link/uwagi |
| --- | --- | --- | --- |
| 2026-05-03 | Publiczne funkcje freemium sprint 7 | OK dla MVP, z ryzykami operacyjnymi | `docs/FREEMIUM_SPRINT_7_SECURITY_REVIEW.md` |
| 2026-05-28 | Utworzenie mapy modułów | Nie jest pełnym audytem; dokument bazowy | Ten dokument |

---

## Szablon nowego modułu

Skopiuj tę sekcję przy dodaniu nowego modułu:

```md
## MXX — Nazwa modułu

**Zakres**

- Co robi moduł.
- Jakie procesy biznesowe obejmuje.

**Endpointy**

- Publiczne:
- Prywatne:
- Admin:

**Frontend**

- Strony:
- Komponenty:
- Biblioteki `apps/web/src/lib/*`:

**Dane wrażliwe**

- Jakie dane są zbierane, przetwarzane, wyświetlane i wysyłane.

**Powierzchnia bezpieczeństwa**

- Auth:
- Role:
- Ownership:
- Rate limiting:
- Upload/storage:
- Integracje:
- Logi/analytics:

**Ryzyka do pilnowania**

- Ryzyko 1.
- Ryzyko 2.

**Testy/audyty wymagane**

- Test 1.
- Test 2.

**Adnotacje zmian**

| Data | Autor | Typ | Zmiana | Do sprawdzenia |
| --- | --- | --- | --- | --- |
| YYYY-MM-DD | author | security/product | Opis zmiany. | Co sprawdzić przy audycie. |
```
