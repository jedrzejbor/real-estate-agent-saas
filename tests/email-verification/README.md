# Lokalny odbiór weryfikacji e-maila

Ten stack używa osobnej bazy PostgreSQL, Mailpit i portów 3100/4100/8125. Flaga jest włączona tylko w testowym API. Nie używaj go do przechowywania rzeczywistych danych użytkowników. Poniższe komendy uruchom na **świeżej bazie**; migracje i test scenariusza sprzedającego nie są przeznaczone do wielokrotnego wykonywania bez resetu danych.

```sh
docker compose -f tests/email-verification/compose.yml up -d --build
docker compose -f tests/email-verification/compose.yml exec -T db psql -U postgres -d email_verification_acceptance -v ON_ERROR_STOP=1 < apps/api/migrations/20260927_account_email_verification_foundation.sql
docker compose -f tests/email-verification/compose.yml exec -T db psql -U postgres -d email_verification_acceptance -v ON_ERROR_STOP=1 < apps/api/migrations/20260929_account_email_verification_enforcement.sql
docker compose -f tests/email-verification/compose.yml exec -T db psql -U postgres -d email_verification_acceptance -v ON_ERROR_STOP=1 < apps/api/migrations/20260929_public_listing_pending_claim_intent.sql
pnpm --filter web exec playwright test --config playwright.email-verification.config.ts
node tests/email-verification/audit-logs.mjs
```

Po odbiorze `docker compose -f tests/email-verification/compose.yml down -v` usuwa wyłącznie ten testowy stack i jego dane. Test w Chromium tworzy unikalne adresy w domenie `example.test`; wiadomości pozostają tylko w Mailpit. Produkcyjny SMTP, konfiguracja wielu instancji, Stripe Sandbox i decyzja o istniejących kontach wymagają osobnego odbioru na staging przed włączeniem flagi dla użytkowników.

Ponowny przebieg całego zestawu wymaga usunięcia testowego stacku przez `down -v` i utworzenia go od nowa. Publiczny formularz oferty ma trwały limit zgłoszeń na IP; po kilku powtórzeniach scenariusz sprzedającego poprawnie otrzyma `429`, mimo że adresy e-mail testów są unikalne.
