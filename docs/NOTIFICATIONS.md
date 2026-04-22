# Powiadomienia (Notifications)

Poniżej lista aktualnie zaimplementowanych powiadomień w systemie. Aktualizuj ten plik przy dodawaniu nowych typów.

## Ogólne
- Endpointy API:
  - `GET /notifications` — pobiera listę powiadomień (parametr `limit` 1–12)
  - `POST /notifications/read` — oznacza listę powiadomień jako odczytane (body: `ids` 1–50)
- Shape itemu:
  - `id` — string (np. `appointment-overdue-<id>`)
  - `category` — `appointment | client | listing`
  - `variant` — `info | warning | success`
  - `title` — string
  - `description` — string
  - `href?` — link w aplikacji
  - `createdAt` — ISO timestamp
  - `isRead` — boolean

## Aktualne powiadomienia

1. Spotkania — przeterminowane
   - Id pattern: `appointment-overdue-<appointmentId>`
   - Wyzwalacz: `Appointment.status === SCHEDULED` i `startTime < now`
   - Kategoria: `appointment`
   - Wariant: `warning`
   - Tytuł: `Spotkanie wymaga aktualizacji statusu`
   - Link: `/dashboard/calendar/:appointmentId`

2. Spotkania — nadchodzące (24h)
   - Id pattern: `appointment-upcoming-<appointmentId>`
   - Wyzwalacz: `Appointment.status === SCHEDULED` i `startTime` w ciągu najbliższych 24h
   - Kategoria: `appointment`
   - Wariant: `info`
   - Tytuł: `Nadchodzące spotkanie`
   - Link: `/dashboard/calendar/:appointmentId`

3. Nowi klienci (lead)
   - Id pattern: `client-new-<clientId>`
   - Wyzwalacz: `Client.status === NEW` i `createdAt >= now - 3 dni`
   - Kategoria: `client`
   - Wariant: `success`
   - Tytuł: `Nowy lead do obsłużenia`
   - Link: `/dashboard/clients/:clientId`

4. Szkice ofert — stare szkice
   - Id pattern: `listing-stale-draft-<listingId>`
   - Wyzwalacz: `Listing.status === DRAFT` i `createdAt < now - 7 dni`
   - Kategoria: `listing`
   - Wariant: `warning`
   - Tytuł: `Szkic oferty czeka na publikację`
   - Link: `/dashboard/listings/:listingId`

## Mechanika i wdrożenie
- Agregacja i ranking: `NotificationsService.findAll` buduje listę kandydatów, nadaje priorytety i sortuje przed ograniczeniem do parametru `limit` (domyślnie 8).
- Śledzenie odczytów: encja `NotificationRead` przechowuje `agentId` + `notificationId`; używane do ustawienia `isRead`.
- DTO:
  - `NotificationsQueryDto` — opcjonalny `limit` (1–12)
  - `MarkNotificationsReadDto` — `ids` (tablica stringów, 1–50)

## Jak dodać nowe powiadomienie
1. Zaimplementuj logikę generowania powiadomień w `NotificationsService.findAll` lub w miejscu emitującym zdarzenie.
2. Ustal unikalny `id` (prefiks + obiektowy `id`).
3. Dodaj `category` i `variant` zgodnie z istniejącymi typami lub rozszerz typy w `notifications.service.ts`.
4. Zaktualizuj ten plik — dodaj wpis opisujący wyzwalacz, pattern `id`, tytuł i link.

---
Plik wygenerowany automatycznie na podstawie `apps/api/src/notifications/notifications.service.ts`.
