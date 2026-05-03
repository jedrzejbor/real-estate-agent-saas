# Freemium Sprint 7 - release checklist i rollout plan

Data przygotowania: 2026-05-03

## Decyzja

`F7.5` jest domknięte dla kontrolowanej bety freemium MVP.

Rekomendowany tryb uruchomienia to beta rollout dla małej grupy użytkowników, z publicznymi funkcjami włączanymi etapami przez release flags. Publiczny, szeroki launch wymaga jeszcze formalnego review prawnego, finalnych danych operatora, potwierdzonych skrzynek kontaktowych oraz decyzji produkcyjnej dla storage i retencji plików.

## Zakres release'u

W release freemium MVP wchodzi:

- rejestracja użytkownika i automatyczny workspace w planie `free`,
- limity freemium oraz kontrolowany `PLAN_LIMIT_REACHED`,
- dashboard planu, usage i upgrade destination,
- publiczne strony ofert,
- zdjęcia ofert i publiczna galeria,
- publiczne formularze leadowe,
- publiczny wizard `/dodaj-oferte`,
- verify/claim flow dla publicznych submissionów,
- publiczny profil agenta,
- abuse report flow,
- monitoring logowy kluczowych publicznych flow,
- podstawowy dashboard/raport metryk freemium.

Poza release freemium MVP zostaje:

- pełny katalog ofert z wyszukiwarką,
- mapa z wyborem zakresu,
- płatny checkout i pełny billing lifecycle,
- moderation queue,
- automatyczny E2E runner,
- produkcyjny storage obiektowy, jeśli rollout jest tylko kontrolowaną betą.

## Go / no-go checklist

### Produkt

- [ ] Rejestracja tworzy użytkownika, agenta, agency i plan `free`.
- [ ] Dashboard pokazuje plan, usage, limity i upgrade destination.
- [ ] Użytkownik free może utworzyć ofertę w ramach limitu.
- [ ] Przekroczenie limitu pokazuje czytelny komunikat i CTA upgrade.
- [ ] Oferta może zostać opublikowana i otwarta przez publiczny URL.
- [ ] Galeria zdjęć działa na publicznej stronie oferty.
- [ ] Formularz leadowy działa i lead trafia do dashboardu zapytań.
- [ ] Publiczny wizard `/dodaj-oferte` kończy się ekranem sprawdzenia emaila.
- [ ] Verify/claim flow tworzy ofertę w CRM po zalogowaniu.
- [ ] Abuse report jest widoczny i zapisuje event.

### Bezpieczeństwo

- [ ] Publiczne endpointy przyjmują tylko poprawne slugi/UUID.
- [ ] Publiczne formularze mają honeypot, timing guard i rate limit.
- [ ] Upload zdjęć sprawdza MIME, rozszerzenie i magic bytes.
- [ ] Claim endpoint wymaga auth.
- [ ] Prywatne listing CRUD, raporty i uploady CRM są poza publicznym dostępem.
- [ ] Publiczne widoki zwracają wyłącznie opublikowane oferty.
- [ ] Brak danych osobowych leadów w publicznych response.

### Legal i prywatność

- [ ] Potwierdzono finalnego operatora danych.
- [ ] Działają skrzynki `legal@estateflow.pl`, `support@estateflow.pl` i `abuse@estateflow.pl` albo ich finalne odpowiedniki.
- [ ] Regulamin, polityka prywatności i zasady publikacji zawierają finalne dane kontaktowe.
- [ ] Prawnik zaakceptował dokumenty przed publicznym launch'em.
- [ ] Ustalono, czy wymagane jest DPA / powierzenie danych dla klientów B2B.
- [ ] Ustalono retencję publicznych submissionów, leadów i tymczasowych zdjęć.

### Monitoring i operacje

- [ ] Logi API są zbierane centralnie na środowisku rolloutowym.
- [ ] Zespół wie, gdzie szukać `freemium_flow_threshold`.
- [ ] Ustawiono progi `MONITORING_WINDOW_MS`, `MONITORING_FAILURE_ALERT_THRESHOLD`, `MONITORING_WARNING_ALERT_THRESHOLD`.
- [ ] Jest osoba dyżurna na pierwsze 48 godzin bety.
- [ ] Jest dzienny przegląd `public_listing_abuse_reported`.
- [ ] Jest SLA reakcji na abuse: pierwszy przegląd do 1 dnia roboczego, pilne naruszenia tego samego dnia.
- [ ] Support ma gotowe odpowiedzi dla limitów free, claim flow, usunięcia danych i zgłoszeń nadużyć.

### Techniczne

- [ ] `pnpm --filter api test` przechodzi.
- [ ] `pnpm --filter api type-check` przechodzi.
- [ ] `pnpm --filter web type-check` przechodzi.
- [ ] `pnpm --filter web build` przechodzi na środowisku z dostępem do fontów/assets.
- [ ] `git diff --check` nie zgłasza problemów.
- [ ] Migracje public listing/submission/lead są zastosowane na bazie rolloutowej.
- [ ] `FRONTEND_URL`, `NEXT_PUBLIC_API_URL`, `API_PUBLIC_URL` / `PUBLIC_API_URL` wskazują właściwe domeny.
- [ ] Storage `uploads` jest zabezpieczony backupem albo świadomie zaakceptowany jako beta-only.

## Release flags

Flagi są rozwiązywane po stronie API i zwracane w `auth/register`, `auth/login` oraz `auth/me`.

| Flaga                                    | Beta start                    | Public launch           | Rollback                                          |
| ---------------------------------------- | ----------------------------- | ----------------------- | ------------------------------------------------- |
| `RELEASE_FLAG_PUBLIC_LISTINGS_ENABLED`   | `true`                        | `true`                  | `false`                                           |
| `RELEASE_FLAG_PUBLIC_LEAD_FORMS_ENABLED` | `true` po smoke publikacji    | `true`                  | `false`                                           |
| `RELEASE_FLAG_PUBLIC_CLAIM_FLOW_ENABLED` | `true` dla kontrolowanej bety | `true` po manualnym E2E | `false`                                           |
| `RELEASE_FLAG_FREEMIUM_UPSELL_ENABLED`   | `true`                        | `true`                  | `false`, jeśli CTA mylą użytkowników              |
| `RELEASE_FLAG_PREMIUM_REPORTS_ENABLED`   | `true`                        | `true`                  | `false`, jeśli placeholdery generują support load |

Zmiana flag wymaga restartu procesu API.

## Rollout plan

### Faza 0 - freeze i smoke lokalny

Czas: przed wdrożeniem.

Kroki:

1. Zamrozić scope: bez katalogu ofert, mapy i checkoutu.
2. Uruchomić bramki techniczne z `F7.4`.
3. Przejść manualnie E2E-01 do E2E-08 z test planu.
4. Potwierdzić, że logi monitoringu pojawiają się dla publish, lead, submission i claim.
5. Potwierdzić, że rollback flag jest znany osobie wdrażającej.

Go/no-go:

- wszystkie bramki techniczne przechodzą,
- brak krytycznego błędu w auth, upload, publikacji, leadach i claim flow.

### Faza 1 - internal beta

Czas: 1-2 dni.

Kroki:

1. Włączyć public listings dla zespołu/testowych kont.
2. Opublikować kilka ofert testowych.
3. Wysłać testowe leady i publiczne submissiony.
4. Przejść claim flow na świeżym koncie.
5. Sprawdzić metryki freemium i logi alertów.

Go/no-go:

- brak `publish_failed`, `lead_capture_failed`, `claim_failed` powtarzających się powyżej progu,
- support rozumie flow i potrafi pomóc użytkownikowi.

### Faza 2 - closed beta

Czas: 3-7 dni.

Kohorta:

- 3-10 zaufanych agentów albo biur,
- użytkownicy świadomi statusu beta,
- ręczny kontakt supportowy po onboardingu.

Kroki:

1. Włączyć public listings, lead forms i claim flow.
2. Monitorować codziennie publikacje, leady, claimy, upload failures i abuse.
3. Zebrać feedback o brakach w copy, limitach i wizardzie.
4. Reagować ręcznie na zgłoszenia abuse.
5. Nie rozszerzać kohorty, jeśli są błędy w claim lub lead capture.

Go/no-go:

- min. 80% użytkowników testowych kończy rejestrację i onboarding bez pomocy dev,
- brak krytycznych zgłoszeń legal/security,
- brak utraty zdjęć lub submissionów.

### Faza 3 - public MVP launch

Warunek:

- formalny legal review zakończony,
- finalne kontakty i operator danych potwierdzone,
- decyzja storage/retencja podjęta,
- closed beta nie ujawniła blockerów.

Kroki:

1. Włączyć flagi publiczne na produkcji.
2. Monitorować pierwsze 48 godzin w trybie podwyższonej czujności.
3. Codziennie sprawdzać abuse reports i flow failures.
4. Po 7 dniach przygotować raport metryk z `F7.6`.

## Rollback plan

Rollback bez cofania migracji:

1. Ustawić `RELEASE_FLAG_PUBLIC_LEAD_FORMS_ENABLED=false`, jeśli problem dotyczy lead capture.
2. Ustawić `RELEASE_FLAG_PUBLIC_CLAIM_FLOW_ENABLED=false`, jeśli problem dotyczy verify/claim.
3. Ustawić `RELEASE_FLAG_PUBLIC_LISTINGS_ENABLED=false`, jeśli problem dotyczy publicznych stron lub wycieku danych.
4. Zrestartować API.
5. Potwierdzić w `auth/me`, że flagi zwracają oczekiwane wartości.
6. W razie potrzeby ukryć publiczne entry pointy na web poprzez te same flagi.
7. Zabezpieczyć dowody w logach i przygotować hotfix.

Rollback danych:

- Nie usuwać danych masowo bez analizy.
- Dla pojedynczej oferty użyć wycofania publikacji z dashboardu.
- Dla zgłoszeń abuse ręcznie wyłączyć publikację problematycznej oferty i skontaktować się z właścicielem danych.
- Dla uploadów tymczasowych zatrzymać publiczny wizard i zabezpieczyć katalog `uploads/public-submissions` do analizy.

## Abuse playbook

Codzienny przegląd:

1. Sprawdzić eventy `public_listing_abuse_reported`.
2. Otworzyć publiczną ofertę i zweryfikować zgłoszenie.
3. Jeśli zgłoszenie jest zasadne, wyłączyć publikację oferty.
4. Skontaktować się z agentem / właścicielem danych.
5. Udokumentować decyzję w notatce operacyjnej.

Pilne naruszenia:

- dane wrażliwe,
- cudze dane kontaktowe,
- oszustwo,
- treści nielegalne,
- spam lub phishing.

Działanie:

- wycofać ofertę tego samego dnia,
- zachować minimalny audyt w logach,
- odpowiedzieć zgłaszającemu kanałem `abuse`.

## Support readiness

Minimalne makra supportowe:

- "Osiągnięto limit planu free" - wyjaśnienie limitu i link do `/dashboard/upgrade`.
- "Nie mogę opublikować oferty" - sprawdzenie wymaganych pól, zdjęć i moderacji.
- "Nie dostałem emaila weryfikacyjnego" - resend verification i limit wysyłek.
- "Chcę usunąć ofertę/dane" - ścieżka support/legal.
- "Zgłaszam naruszenie" - ścieżka abuse i SLA reakcji.

## Decyzje pozostające przed publicznym launch'em

- Czy pierwszy publiczny launch dopuszcza lokalny `uploads`, czy blokujemy go do czasu S3/R2.
- Czy DPA jest wymagane już na starcie bety, czy dopiero dla płatnych/B2B klientów.
- Jak długo trzymamy nieprzejęte submissiony i tymczasowe zdjęcia.
- Czy automatyczny Playwright E2E jest blockerem public launchu, czy tylko szerszego rollout scale-up.
