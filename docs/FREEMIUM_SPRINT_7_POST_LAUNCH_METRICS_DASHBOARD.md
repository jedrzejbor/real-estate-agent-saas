# Freemium Sprint 7 - dashboard metryk po starcie

Data przygotowania: 2026-05-03

## Decyzja

`F7.6` jest domknięte dla MVP. Istniejący raport `Freemium growth` został rozszerzony o sekcję `Post-launch health`, która pokazuje operacyjne statusy KPI po starcie bety lub publicznego MVP.

Dashboard pozostaje dostępny w `/dashboard/reports` i bazuje na endpointcie `GET /api/reports/freemium-metrics`.

## KPI po starcie

Dashboard obejmuje:

- aktywację: liczba pierwszych ofert,
- publikację ofert: `listing_published / listing_created`,
- lead capture: `public_lead_submitted / public_listing_viewed`,
- claim flow: `public_listing_claim_completed / public_listing_claim_started`,
- limit friction: relacja `limit_reached` do `upgrade_cta_clicked`,
- upgrade intent: kliknięcia `upgrade_cta_clicked` z breakdownem po `upsellId` i `source`.

## Statusy operacyjne

Sekcja `Post-launch health` używa prostych statusów:

- `OK` - metryka wygląda zdrowo dla MVP,
- `Obserwuj` - próba jest mała albo wynik wymaga kontroli,
- `Reaguj` - flow prawdopodobnie wymaga szybkiej interwencji.

Progi są celowo operacyjne, nie kohortowe:

- aktywacja: cel MVP to min. 3 pierwsze oferty w okresie,
- publikacja: `>= 60%` OK, `30-59%` obserwuj, `< 30%` reaguj,
- lead capture: `>= 3%` OK, `1-2%` obserwuj, `< 1%` reaguj,
- claim completion: `>= 70%` OK, `40-69%` obserwuj, `< 40%` reaguj,
- limit friction: `limit_reached > 0` bez kliknięć upgrade to status `Reaguj`,
- upgrade intent: brak kliknięć upgrade w okresie to status `Obserwuj`.

## Rytm przeglądu po starcie

Pierwsze 48 godzin:

- sprawdzać dashboard co najmniej 2 razy dziennie,
- porównywać `Post-launch health` z logami `freemium_flow_threshold`,
- reagować natychmiast na `claim_flow = Reaguj`, `lead_capture = Reaguj` i `limit_friction = Reaguj`.

Pierwszy tydzień:

- codziennie sprawdzać aktywację, publikację i lead capture,
- zbierać feedback od beta użytkowników,
- notować, które upselle generują upgrade intent,
- sprawdzać abuse reports równolegle z metrykami publicznych ofert.

Po 7 dniach:

- przygotować krótki raport release: aktywacja, publikacje, leady, claim, upgrade intent, abuse,
- zdecydować, czy poszerzać cohortę, utrzymać betę czy wykonać rollback/naprawy.

## Ograniczenia

- Raport bazuje na `analytics_events`, więc jakość zależy od kompletności instrumentacji.
- Współczynniki są liczone w wybranym okresie, a nie jako pełna analiza kohortowa.
- Dashboard jest scoped do dostępnych agentów/zespołu, nie jest globalnym panelem admina.
- Progi są MVP i powinny zostać skalibrowane po pierwszych danych z bety.

## Follow-up

- dodać globalny widok admina dla całej bety,
- dodać eksport CSV/PDF z raportu po 7 dniach,
- dodać kohorty rejestracja -> pierwsza oferta -> publikacja -> lead,
- spiąć alerty `Post-launch health` z systemem obserwowalności po wdrożeniu APM.
