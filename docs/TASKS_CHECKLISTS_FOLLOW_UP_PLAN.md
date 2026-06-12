# Tasks, checklists and follow-up automation plan

Data: 2026-06-12

Cel: rozbudować aplikację o prywatny moduł `Zadania`, który pomaga agentowi
pilnować kolejnych kroków przy leadach, klientach, ofertach, spotkaniach i
transakcjach, a także automatycznie tworzy najważniejsze follow-upy po
zdarzeniach biznesowych.

Dokument bazuje na Priorytecie 3 z
`docs/AGENT_WORKFLOW_FEATURE_OPPORTUNITIES.md`.

## Założenie produktowe

Obecnie aplikacja ma fundamenty CRM, oferty, kalendarz, dokumenty oraz pipeline
transakcji. Brakuje jednak jednego miejsca, które odpowiada na codzienne pytanie
agenta: "co powinienem zrobić teraz, żeby nie stracić leada, klienta albo
transakcji?".

Moduł `Zadania` ma być operacyjną skrzynką pracy agenta:

- pokazuje zadania na dziś, zaległe i nadchodzące,
- pozwala szybko dodać zadanie z widoku klienta, oferty, spotkania lub
  transakcji,
- standaryzuje najczęstsze akcje: telefon, wiadomość, prośba o dokument,
  umówienie prezentacji i follow-up,
- tworzy automatyczne zadania po kluczowych zdarzeniach,
- ogranicza ryzyko, że lead lub etap transakcji zostanie bez reakcji.

W MVP nie budujemy pełnego systemu automatyzacji marketingu, wysyłki SMS/email
ani zaawansowanego workflow typu enterprise. Budujemy czytelny, prywatny task
inbox dla agenta i minimalny silnik reguł, który tworzy zadania z idempotencją.

## Decyzja MVP

Dodajemy globalny model `Task`, niezależny od istniejącego
`TransactionTask`.

`TransactionTask` z modułu `Transakcje` traktujemy jako checklistę transakcyjną
wdrożoną wcześniej dla szybkości MVP. Nowy moduł powinien zostać zaprojektowany
tak, żeby później można było:

- migrować `TransactionTask` do globalnego `Task`,
- albo utrzymać `TransactionTask` jako checklistę specjalistyczną, ale pokazywać
  ją w globalnym widoku zadań przez warstwę agregującą.

Rekomendacja: w pierwszym etapie nie przepinamy jeszcze istniejącej checklisty
transakcji. Tworzymy globalny moduł `Zadania`, a integrację z
`TransactionTask` robimy jako osobny krok po ustabilizowaniu API i UI.

## Zakres MVP

### Funkcje

- Globalny widok `Zadania` w dashboardzie.
- Lista z filtrami:
  - dzisiaj,
  - zaległe,
  - nadchodzące,
  - wszystkie aktywne,
  - zakończone.
- Tworzenie zadania ręcznie.
- Edycja tytułu, opisu, priorytetu, terminu i powiązania.
- Zmiana statusu `todo`, `done`, `cancelled`.
- Oznaczenie zadania jako wykonane jednym kliknięciem.
- Szybkie akcje:
  - zadzwoń,
  - wyślij wiadomość,
  - poproś o dokument,
  - umów prezentację,
  - wykonaj follow-up.
- Zadania powiązane z:
  - klientem,
  - ofertą,
  - spotkaniem,
  - transakcją,
  - opcjonalnie publicznym leadem, jeśli istnieje jako osobny byt.
- Panel zadań na szczegółach klienta, oferty i transakcji.
- Widget na dashboardzie: zadania na dziś i zaległe.
- Automatyczne tworzenie najważniejszych zadań po zdarzeniach biznesowych.

### Statusy

Proponowany enum `TaskStatus`:

- `todo` - zadanie aktywne,
- `done` - zadanie wykonane,
- `cancelled` - zadanie anulowane.

Decyzja: nie dodajemy `in_progress` w MVP. Dla pojedynczego agenta najważniejsze
jest rozróżnienie: do zrobienia, wykonane, anulowane. Status pośredni zwiększa
koszt UI i raportowania bez dużej wartości na start.

### Priorytety

Proponowany enum `TaskPriority`:

- `low`,
- `normal`,
- `high`.

Decyzja: `normal` jest wartością domyślną. Priorytet `urgent` zostawiamy poza
MVP, bo zwykle wymaga osobnych reguł powiadomień i eskalacji.

### Typy akcji

Proponowany enum `TaskActionType`:

- `call`,
- `send_message`,
- `request_document`,
- `schedule_appointment`,
- `follow_up`,
- `review`,
- `other`.

Typ akcji powinien wpływać głównie na ikonę, etykietę i sugerowany kontekst w UI.
Nie powinien w MVP automatycznie wykonywać komunikacji z klientem.

## Poza zakresem MVP

- Automatyczna wysyłka SMS, email lub WhatsApp.
- AI generujące treść follow-upu.
- Cykliczne zadania.
- Przypisania zespołowe i kolejki managera.
- SLA i eskalacje do przełożonego.
- Zaawansowany edytor reguł automatyzacji w UI.
- Synchronizacja z zewnętrznym kalendarzem.
- Publiczne widoki zadań dla klientów.
- Rozliczanie czasu pracy agenta.

## Model danych

### `Task`

Proponowane pola:

```ts
id: string;
agentId: string;
title: string;
description?: string | null;
status: TaskStatus;
priority: TaskPriority;
actionType: TaskActionType;
dueAt?: Date | null;
completedAt?: Date | null;
cancelledAt?: Date | null;
cancelReason?: string | null;
clientId?: string | null;
listingId?: string | null;
appointmentId?: string | null;
transactionId?: string | null;
publicLeadId?: string | null;
source: TaskSource;
automationKey?: string | null;
idempotencyKey?: string | null;
createdByUserId?: string | null;
createdAt: Date;
updatedAt: Date;
deletedAt?: Date | null;
```

Decyzje:

- `agentId` jest wymagane i służy do autoryzacji, filtrowania oraz raportów.
- Zadanie może być samodzielne, ale w UI preferujemy tworzenie z kontekstem
  klienta, oferty, spotkania albo transakcji.
- `dueAt` przechowuje datę i godzinę. UI może pokazywać uproszczone grupy:
  dzisiaj, jutro, ten tydzień, bez terminu.
- `source` rozróżnia zadania ręczne i automatyczne.
- `automationKey` opisuje regułę, która utworzyła zadanie.
- `idempotencyKey` zabezpiecza przed duplikatami przy ponownym uruchomieniu
  automatyzacji.
- `deletedAt` preferowane jako soft delete, żeby nie gubić historii operacyjnej.

### `TaskSource`

Proponowany enum:

- `manual`,
- `automation`,
- `template`,
- `migration`.

### `TaskEvent`

Opcjonalny model audytowy dla historii zmian zadania:

```ts
id: string;
taskId: string;
agentId: string;
type: 'created' | 'updated' | 'completed' | 'cancelled' | 'reopened';
metadata?: Record<string, unknown> | null;
createdAt: Date;
```

W MVP można zacząć od podstawowych pól na `Task`, ale przy automatyzacjach warto
mieć prostą historię zmian dla debugowania i bezpieczeństwa.

### `TaskAutomationRule`

W MVP reguły mogą być statyczną konfiguracją w kodzie. Osobna tabela ma sens
dopiero wtedy, gdy agent lub admin będzie mógł edytować reguły z UI.

Minimalna struktura reguły w kodzie:

```ts
key: string;
eventName: string;
title: string;
actionType: TaskActionType;
priority: TaskPriority;
dueOffsetMinutes: number;
buildContext(event): TaskContext;
```

## Automatyzacje MVP

### Nowy lead

Zdarzenie: publiczny lead lub nowy klient z formularza.

Tworzone zadanie:

- tytuł: `Skontaktuj się z nowym leadem`,
- typ: `call`,
- priorytet: `high`,
- termin: teraz + 15 minut,
- powiązanie: klient albo publiczny lead.

Wymaganie techniczne: reguła musi być idempotentna dla konkretnego leada.

### Spotkanie zakończone

Zdarzenie: spotkanie oznaczone jako zakończone.

Tworzone zadanie:

- tytuł: `Wykonaj follow-up po spotkaniu`,
- typ: `follow_up`,
- priorytet: `normal`,
- termin: następny dzień roboczy,
- powiązanie: spotkanie, klient i oferta, jeśli są dostępne.

### Oferta bez zdjęć

Zdarzenie: oferta utworzona albo aktywowana bez zdjęć.

Tworzone zadanie:

- tytuł: `Dodaj zdjęcia do oferty`,
- typ: `review`,
- priorytet: `high`,
- termin: dziś,
- powiązanie: oferta.

### Aktywna oferta bez prowizji

Zdarzenie: oferta aktywna bez ustawionej prowizji.

Tworzone zadanie:

- tytuł: `Uzupełnij prowizję przy ofercie`,
- typ: `review`,
- priorytet: `normal`,
- termin: dziś albo następny dzień roboczy,
- powiązanie: oferta.

### Transakcja w rezerwacji

Zdarzenie: transakcja przechodzi do statusu `reserved`.

Tworzone zadanie:

- tytuł: `Sprawdź komplet dokumentów transakcji`,
- typ: `request_document`,
- priorytet: `high`,
- termin: następny dzień roboczy,
- powiązanie: transakcja i oferta.

## API

### Endpointy

- `GET /api/tasks`
  - filtrowanie po statusie, terminie, priorytecie, typie akcji i powiązaniu,
  - paginacja,
  - sortowanie domyślne: zaległe, dzisiaj, nadchodzące, bez terminu.
- `POST /api/tasks`
  - tworzenie ręczne zadania.
- `GET /api/tasks/:id`
  - szczegóły zadania.
- `PATCH /api/tasks/:id`
  - edycja podstawowych pól.
- `POST /api/tasks/:id/complete`
  - oznaczenie jako wykonane.
- `POST /api/tasks/:id/cancel`
  - anulowanie zadania.
- `POST /api/tasks/:id/reopen`
  - przywrócenie do `todo`.
- `GET /api/tasks/summary`
  - liczby dla dashboardu: dzisiaj, zaległe, high priority.

### Walidacje API

- Agent może czytać i zmieniać tylko swoje zadania.
- Zadanie musi mieć `title`.
- `priority`, `status` i `actionType` muszą pochodzić z enumów.
- `dueAt` nie powinno być w przeszłości przy tworzeniu ręcznym, chyba że UI
  celowo pozwala dodać zaległe zadanie.
- Powiązane byty muszą należeć do tego samego agenta.
- `complete` ustawia `completedAt` i nie powinien przyjmować dowolnej daty od
  klienta.
- `cancel` ustawia `cancelledAt`; powód anulowania jest opcjonalny w MVP.
- Automatyzacje muszą używać `idempotencyKey`.

## Frontend

### Globalny widok `Zadania`

Widok powinien być narzędziowy i szybki w użyciu:

- nagłówek z liczbami: zaległe, dziś, high priority,
- zakładki albo segmenty: `Dzisiaj`, `Zaległe`, `Nadchodzące`, `Wszystkie`,
  `Zakończone`,
- lista zadań z ikoną typu akcji, terminem, priorytetem i powiązanym bytem,
- szybkie oznaczenie jako wykonane,
- menu dla anulowania, edycji i przejścia do powiązanego klienta/oferty.

### Drawer tworzenia i edycji

Formularz powinien obsłużyć:

- tytuł,
- opis,
- typ akcji,
- priorytet,
- termin,
- powiązanie z klientem, ofertą, spotkaniem albo transakcją.

Przy tworzeniu z kontekstu szczegółów oferty lub klienta powiązanie powinno być
ustawiane automatycznie.

### Panele kontekstowe

Na szczegółach klienta, oferty i transakcji dodajemy panel `Zadania`:

- aktywne zadania powiązane z danym bytem,
- przycisk dodania zadania,
- szybkie zakończenie zadania,
- link do pełnego widoku `Zadania`.

### Dashboard

Dodajemy kompaktowy widget:

- zadania zaległe,
- zadania na dziś,
- najbliższe zadania high priority,
- link do pełnego modułu.

## Integracje

### Klienci i leady

- Nowy lead powinien tworzyć zadanie kontaktu w 15 minut.
- Karta klienta powinna pokazywać aktywne zadania i historię wykonanych
  follow-upów.

### Oferty

- Oferta bez zdjęć tworzy zadanie uzupełnienia zdjęć.
- Aktywna oferta bez prowizji tworzy zadanie uzupełnienia prowizji.
- Szczegóły oferty powinny pozwolić dodać follow-up lub prośbę o dokument.

### Spotkania

- Zakończone spotkanie tworzy zadanie follow-upu na następny dzień.
- Zadanie powinno linkować do spotkania, klienta i oferty, jeśli relacje istnieją.

### Transakcje

- Przejście transakcji do `reserved` tworzy zadanie sprawdzenia dokumentów.
- Istniejące `TransactionTask` zostaje na razie checklistą transakcyjną.
- Docelowo globalny widok zadań powinien pokazywać także blokujące zadania
  transakcyjne albo po migracji używać jednego modelu `Task`.

### Dokumenty

- Dokument oznaczony jako `wymaga poprawy` może w późniejszej iteracji tworzyć
  zadanie `poproś o dokument`.
- W MVP wystarczy ręczne tworzenie takiego zadania z widoku dokumentów, jeśli
  panel dokumentów jest już dostępny.

### Powiadomienia

- MVP może ograniczyć się do widocznych liczników i list w dashboardzie.
- Później można dodać wewnętrzne powiadomienia dla zadań zaległych i zadań z
  terminem w ciągu 15-60 minut.

## Bezpieczeństwo i prywatność

- Moduł jest prywatny i dostępny tylko dla zalogowanego agenta.
- Każde zapytanie musi filtrować po `agentId`.
- Przy powiązaniach należy sprawdzać własność klienta, oferty, spotkania i
  transakcji.
- Notatki w zadaniach mogą zawierać dane osobowe, więc nie powinny być wysyłane
  w publicznych endpointach ani publicznych stronach ofert.
- Automatyzacje nie mogą tworzyć zadań dla obcego agenta przez podanie cudzego
  identyfikatora bytu.
- Idempotencja jest wymaganiem bezpieczeństwa operacyjnego, bo chroni przed
  zalaniem agenta duplikatami zadań.
- Soft delete i `TaskEvent` pomagają odtworzyć, kto i kiedy zamknął albo anulował
  zadanie.

## Metryki produktowe

Po wdrożeniu modułu warto mierzyć:

- liczbę zaległych zadań,
- procent zadań wykonanych w terminie,
- liczbę leadów bez follow-upu po 24 godzinach,
- średni czas do pierwszego kontaktu z leadem,
- zadania tworzone automatycznie vs ręcznie,
- transakcje z aktywnymi zadaniami blokującymi zamknięcie.

## Proponowany podział sprintów

### T1. Backend foundation

- Dodać enumy `TaskStatus`, `TaskPriority`, `TaskActionType`, `TaskSource`.
- Dodać encję `Task`.
- Dodać migrację bazy danych.
- Dodać moduł API `tasks`.
- Obsłużyć listę, tworzenie, edycję, complete, cancel i reopen.
- Dodać filtrowanie, sortowanie i paginację.
- Dodać testy autoryzacji i walidacji.

### T2. Globalny widok zadań

- Dodać klienta API w aplikacji web.
- Dodać stronę dashboardu `Zadania`.
- Dodać listę zadań z filtrami.
- Dodać drawer tworzenia i edycji.
- Dodać szybkie oznaczanie jako wykonane.
- Dodać obsługę pustych stanów i błędów.

### T3. Panele kontekstowe

- Dodać panel zadań na szczegółach klienta.
- Dodać panel zadań na szczegółach oferty.
- Dodać panel zadań na szczegółach transakcji.
- Tworzenie z panelu powinno automatycznie przypinać właściwy kontekst.

### T4. Automatyzacje MVP

- Dodać serwis tworzący zadania z regułami statycznymi.
- Dodać idempotencję po `automationKey` i `idempotencyKey`.
- Podpiąć regułę nowego leada.
- Podpiąć regułę zakończonego spotkania.
- Podpiąć regułę oferty bez zdjęć.
- Podpiąć regułę aktywnej oferty bez prowizji.
- Podpiąć regułę transakcji w rezerwacji.
- Dodać testy, które potwierdzają brak duplikatów.

### T5. Dashboard i follow-up UX

- Dodać widget zadań na dashboardzie.
- Uporządkować szybkie akcje dla follow-upów.
- Dodać linki do powiązanych bytów.
- Dodać podstawowe liczniki zaległych i dzisiejszych zadań.

### T6. Integracja z checklistą transakcji

- Zdecydować, czy migrujemy `TransactionTask` do `Task`, czy agregujemy oba
  źródła w UI.
- Jeśli migracja: przygotować mapowanie statusów, priorytetów i terminów.
- Jeśli agregacja: przygotować wspólny kontrakt DTO dla globalnego widoku.
- Zaktualizować dokument `TRANSACTION_PIPELINE_PLAN.md` po decyzji.

## Testy

### Backend

- Tworzenie zadania ręcznego.
- Edycja tylko własnego zadania.
- Blokada dostępu do zadania innego agenta.
- Walidacja enumów i terminów.
- Complete, cancel i reopen ustawiają poprawne daty.
- Filtrowanie po statusie, priorytecie, terminie i powiązanym bycie.
- Automatyzacje tworzą zadanie raz dla jednego zdarzenia.
- Automatyzacje nie tworzą zadania, jeśli powiązany byt należy do innego agenta.

### Frontend

- Lista renderuje zadania i puste stany.
- Filtry zmieniają zapytanie i wynik.
- Drawer tworzy i edytuje zadanie.
- Complete/cancel aktualizują widok bez pełnego przeładowania strony.
- Panele kontekstowe tworzą zadania z poprawnym powiązaniem.

## Ryzyka i decyzje do domknięcia

- Czy zadania samodzielne bez powiązanego bytu są dozwolone?
  - Rekomendacja: tak, bo agent może mieć ogólne zadania administracyjne.
- Czy `dueAt` ma być wymagane?
  - Rekomendacja: nie, ale automatyczne follow-upy powinny zawsze mieć termin.
- Czy zadania transakcyjne migrować od razu?
  - Rekomendacja: nie w pierwszym etapie; najpierw ustabilizować globalny model.
- Czy reguły automatyzacji trzymać w bazie?
  - Rekomendacja: w MVP statycznie w kodzie, później UI ustawień.
- Czy follow-up ma wysyłać wiadomość?
  - Rekomendacja: w MVP nie. Zadanie przypomina agentowi, a komunikacja zostaje
    ręczna.

## Minimalna definicja ukończenia MVP

- Agent ma prywatny widok wszystkich swoich zadań.
- Agent może tworzyć, edytować, kończyć i anulować zadania.
- Zadania można powiązać z klientem, ofertą, spotkaniem i transakcją.
- Dashboard pokazuje zadania zaległe i zadania na dziś.
- Co najmniej trzy automatyzacje tworzą zadania bez duplikatów:
  - nowy lead,
  - zakończone spotkanie,
  - transakcja w rezerwacji.
- Wszystkie endpointy pilnują `agentId`.
- Istnieje jasna decyzja, jak globalne zadania będą współpracować z
  `TransactionTask`.
