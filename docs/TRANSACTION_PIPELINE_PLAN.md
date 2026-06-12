# Transaction pipeline plan

Data: 2026-06-11

Cel: rozbudować aplikację o prywatny moduł `Transakcje`, który pozwoli
agentowi prowadzić konkretną sprzedaż albo najem od pierwszej oferty cenowej do
zamknięcia, z kontrolą etapów, terminów, zadań, dokumentów i prowizji.

Dokument bazuje na Priorytecie 2 z
`docs/AGENT_WORKFLOW_FEATURE_OPPORTUNITIES.md`.

## Założenie produktowe

Obecnie aplikacja ma statusy ofert i klientów, ale nie ma osobnego bytu, który
opisuje proces transakcyjny. Status oferty `sold` albo `rented` mówi tylko o
finalnym stanie nieruchomości. Agent potrzebuje widzieć, co dzieje się pomiędzy:
negocjacją, rezerwacją, umową przedwstępną, kredytem, notariuszem, odbiorem i
rozliczeniem prowizji.

Moduł `Transakcje` ma być centrum operacyjnym dla procesu zamknięcia:

- agent widzi wszystkie aktywne transakcje na jednej tablicy pipeline,
- każda transakcja łączy ofertę, kupującego/najemcę, właściciela, dokumenty,
  terminy, notatki i prowizję,
- agent widzi, co blokuje przejście do kolejnego etapu,
- zamknięta wygrana transakcja zasila raport `Zarobki`,
- moduł pozostaje prywatny i nie ujawnia danych transakcyjnych publicznie.

W MVP nie budujemy systemu księgowego ani kompletnego CRM agencyjnego dla wielu
osób. Budujemy pojedynczy, spójny model procesu transakcyjnego dla obecnego
dashboardu agenta.

## Decyzja MVP

Dodajemy osobny model `Transaction`.

Uwaga nazewnicza: w kodzie istnieje już `TransactionType`, które oznacza typ
oferty: `sale` albo `rent`. Nowy model powinien nazywać się `Transaction`, a
jego typ sprzedaż/najem powinien bazować na ofercie albo mieć osobne pole
`dealType`, jeśli potrzebujemy utrwalić ten kontekst. Nie należy mieszać
istniejącego `TransactionType` ze statusem pipeline.

W pierwszym zakresie transakcja może być utworzona:

- ręcznie z widoku nowego modułu `Transakcje`,
- z widoku szczegółów oferty,
- opcjonalnie z karty klienta jako szybka akcja, jeśli wybierzemy ofertę.

Transakcja w MVP wymaga:

- agenta,
- oferty,
- klienta kupującego/najemcy,
- statusu pipeline,
- wartości transakcji,
- szacowanej albo ustalonej prowizji,
- przynajmniej podstawowych terminów i notatek.

## Zakres MVP

### Funkcje

- Lista i tablica pipeline transakcji w dashboardzie.
- Tworzenie transakcji powiązanej z ofertą i klientem.
- Edycja podstawowych danych transakcji.
- Zmiana statusu pipeline.
- Widok szczegółów transakcji.
- Checklist zadań transakcyjnych.
- Terminy krytyczne.
- Notatki i historia zmian.
- Integracja z prowizją:
  - możliwość skopiowania prowizji z oferty,
  - możliwość nadpisania prowizji na poziomie transakcji,
  - raport `Zarobki` powinien docelowo preferować zamknięte transakcje.
- Bezpieczny scope danych: agent widzi tylko swoje transakcje.

### Statusy pipeline

Proponowany enum `TransactionStatus`:

- `lead_offer` - oferta cenowa / zainteresowanie transakcyjne,
- `negotiation` - negocjacje,
- `reserved` - rezerwacja,
- `preliminary_agreement` - umowa przedwstępna,
- `financing` - finansowanie / kredyt,
- `notary_scheduled` - termin notarialny zaplanowany,
- `handover` - odbiór / przekazanie,
- `closed_won` - zamknięta wygrana,
- `closed_lost` - zamknięta przegrana.

Decyzje:

- `closed_won` powinien być stanem, który uruchamia raportowanie finalnej
  prowizji.
- `closed_lost` powinien wymagać powodu utraty transakcji.
- `handover` jest przydatny, bo w praktyce prowizja i zamknięcie operacyjne nie
  zawsze kończą się dokładnie w momencie aktu notarialnego albo podpisania umowy
  najmu.

### Terminy krytyczne

MVP powinno obsłużyć minimum:

- termin rezerwacji,
- termin umowy przedwstępnej,
- termin decyzji kredytowej / finansowania,
- termin aktu notarialnego albo podpisania umowy najmu,
- termin przekazania lokalu,
- termin płatności prowizji.

Terminy mogą być w pierwszej iteracji polami na `Transaction`. Docelowo lepszy
jest osobny model `TransactionDeadline`, jeśli chcemy mieć wiele terminów tego
samego typu, przypomnienia, historię i widok kalendarzowy.

### Checklist

MVP checklisty może być prostą listą zadań powiązanych z transakcją.

Przykładowe zadania startowe:

- potwierdź dane stron,
- potwierdź cenę i warunki transakcji,
- zweryfikuj komplet dokumentów oferty,
- potwierdź finansowanie,
- umów termin notariusza,
- przygotuj protokół zdawczo-odbiorczy,
- oznacz prowizję jako należną / zapłaconą.

W pierwszym etapie checklistę można trzymać w osobnej tabeli
`TransactionTask`. Nie należy czekać na pełny moduł `Zadania`, ale model trzeba
zaprojektować tak, żeby później dało się go połączyć z globalnymi zadaniami.

## Poza zakresem MVP

- Wieloosobowe zespoły transakcyjne.
- Podział prowizji między agentów, managera i agencję.
- Rozliczenia księgowe i faktury.
- Automatyczne generowanie umów.
- Integracja z notariuszem, bankiem albo podpisem elektronicznym.
- Portal kupującego, najemcy albo właściciela.
- Automatyczne powiadomienia SMS/email do stron transakcji.
- Zaawansowany workflow zależny od typu nieruchomości i rynku.
- Pełny moduł AML/KYC.
- Publiczne strony transakcji.

## Model danych

### `Transaction`

Proponowane pola:

```ts
id: string;
agentId: string;
listingId: string;
buyerClientId: string;
sellerClientId?: string | null;
status: TransactionStatus;
title: string;
dealValue: number | string;
currency: string;
commissionType?: ListingCommissionType | null;
commissionValue?: number | string | null;
commissionAmount?: number | null; // pole pochodne w odpowiedziach API
expectedCloseDate?: Date | null;
reservationExpiresAt?: Date | null;
preliminaryAgreementDate?: Date | null;
financingDeadline?: Date | null;
notaryDate?: Date | null;
handoverDate?: Date | null;
commissionDueDate?: Date | null;
closedAt?: Date | null;
lostReason?: string | null;
blockerNote?: string | null;
privateNote?: string | null;
createdAt: Date;
updatedAt: Date;
deletedAt?: Date | null;
```

Decyzje:

- `agentId` zapisujemy jawnie dla filtrowania, autoryzacji i raportów.
- `listingId` jest wymagane w MVP, bo transakcja bez oferty byłaby osobnym
  procesem sprzedażowym poza obecnym modelem aplikacji.
- `buyerClientId` oznacza kupującego albo najemcę.
- `sellerClientId` jest opcjonalne, bo właściciel może nie istnieć jeszcze jako
  `Client`.
- `dealValue` powinno domyślnie startować od ceny oferty, ale musi być
  edytowalne, bo finalna cena transakcyjna może się różnić.
- Prowizja transakcji powinna być snapshotem lub nadpisaniem prowizji z oferty.
  Nie powinna zależeć wyłącznie od aktualnej ceny oferty po zamknięciu.
- `commissionAmount` rekomendowane jest jako pole pochodne liczone z
  `dealValue`, `commissionType` i `commissionValue`.
- `deletedAt` preferowane jako soft delete, bo transakcje są zdarzeniami
  operacyjnymi i raportowymi.

### `TransactionTask`

Proponowane pola:

```ts
id: string;
transactionId: string;
agentId: string;
title: string;
status: 'todo' | 'done' | 'cancelled';
priority: 'low' | 'normal' | 'high';
dueDate?: Date | null;
completedAt?: Date | null;
createdAt: Date;
updatedAt: Date;
```

Decyzje:

- W MVP wystarczy checklist per transakcja.
- `agentId` zapisujemy także tutaj, żeby prosto filtrować zadania i pilnować
  scope danych.
- Docelowo można przepiąć ten model na globalny moduł `Zadania`.

### `TransactionEvent`

Proponowany log zdarzeń:

```ts
id: string;
transactionId: string;
agentId: string;
actorUserId: string;
type:
  | 'created'
  | 'status_changed'
  | 'details_updated'
  | 'task_created'
  | 'task_completed'
  | 'deadline_changed'
  | 'commission_changed'
  | 'closed'
  | 'deleted'
  | 'restored';
metadata: Record<string, unknown>;
createdAt: Date;
```

MVP powinno logować co najmniej:

- utworzenie transakcji,
- zmianę statusu,
- zmianę wartości transakcji,
- zmianę prowizji,
- zamknięcie wygrane/przegrane,
- usunięcie.

## API

Proponowane endpointy MVP:

```http
GET /api/transactions
POST /api/transactions
GET /api/transactions/:id
PATCH /api/transactions/:id
PATCH /api/transactions/:id/status
DELETE /api/transactions/:id

GET /api/transactions/:id/tasks
POST /api/transactions/:id/tasks
PATCH /api/transactions/:id/tasks/:taskId
DELETE /api/transactions/:id/tasks/:taskId

GET /api/transactions/:id/events
```

Filtry listy:

- `status`,
- `listingId`,
- `clientId`,
- `dateFrom`,
- `dateTo`,
- `hasBlocker`,
- `sortBy`,
- `sortOrder`,
- `page`,
- `limit`.

Widoki specjalne można zbudować na tym samym endpoincie:

- aktywne transakcje,
- zamknięte transakcje,
- transakcje z terminem w najbliższych 7 dniach,
- transakcje z blokadą,
- transakcje bez prowizji.

## Frontend

### Nawigacja

Dodać entry point w dashboardzie:

- sidebar: `Transakcje`,
- szczegóły oferty: akcja `Utwórz transakcję`,
- karta klienta: sekcja lub akcja `Transakcje klienta`,
- raport `Zarobki`: link do transakcji zamkniętych, gdy dane zaczną bazować na
  module transakcji.

### Widok listy/pipeline

Pierwszy ekran modułu:

- tablica kolumnowa wg statusów pipeline,
- przełącznik lista/tablica, jeśli koszt implementacji jest akceptowalny,
- karty transakcji z:
  - nazwą oferty,
  - klientem kupującym/najemcą,
  - wartością,
  - prowizją,
  - najbliższym terminem,
  - informacją o blokadzie,
  - liczbą zadań do wykonania.

### Widok szczegółów transakcji

Sekcje:

- podsumowanie: status, wartość, prowizja, daty,
- strony transakcji: oferta, kupujący/najemca, właściciel,
- checklist,
- terminy krytyczne,
- dokumenty powiązane z ofertą i docelowo transakcją,
- notatki,
- historia zmian.

### UX statusów

Zmiana statusu powinna:

- być szybka z tablicy pipeline,
- wymagać potwierdzenia przy `closed_won` i `closed_lost`,
- wymagać `lostReason` przy `closed_lost`,
- pokazywać ostrzeżenie przy `closed_won`, jeśli brakuje prowizji albo
  krytycznych dokumentów.

## Integracja z istniejącymi modułami

### Oferty

- Transakcja jest powiązana z ofertą.
- Utworzenie transakcji nie powinno automatycznie zmieniać statusu oferty na
  `sold` albo `rented`.
- Przejście transakcji na `closed_won` powinno dopiero wtedy zaproponować albo
  wykonać zmianę statusu oferty na `sold`/`rented`, zależnie od
  `listing.transactionType`.
- Oferta może mieć wiele transakcji historycznych, ale tylko jedna aktywna
  transakcja powinna być domyślnie dozwolona w MVP.

### Klienci

- `buyerClientId` powinien wskazywać istniejącego klienta.
- `sellerClientId` można dodać opcjonalnie.
- Na karcie klienta warto pokazać listę transakcji powiązanych jako kupujący,
  najemca albo właściciel.

### Dokumenty

- Moduł dokumentów ofert jest Priorytetem 1 i powinien pozostać kompatybilny z
  transakcjami.
- W MVP transakcja może pokazywać dokumenty oferty.
- Po wdrożeniu transakcji można rozszerzyć `ListingDocument` albo dodać osobny
  model dokumentów transakcyjnych.
- Checklist dokumentów powinna wpływać na widok "co blokuje zamknięcie".

### Raport `Zarobki`

Stan obecny: raport bazuje na prywatnych polach prowizji przy ofertach.

Docelowa logika po wdrożeniu transakcji:

- dla zamkniętych transakcji używać `Transaction` ze statusem `closed_won`,
- dla aktywnych prognoz można nadal używać prowizji z ofert bez transakcji,
- nie dublować prowizji, jeśli oferta ma zarówno prowizję, jak i zamkniętą
  transakcję,
- pokazać w raporcie jasny opis źródła danych.

Rekomendacja migracyjna:

- Etap 1: raport zostaje bez zmian.
- Etap 2: dodać osobną sekcję "Zamknięte transakcje" opartą o `Transaction`.
- Etap 3: przestawić KPI zamkniętych zarobków na transakcje, a oferty zostawić
  jako estymację potencjału.

### Kalendarz i powiadomienia

- Terminy krytyczne powinny docelowo zasilać dashboard i kalendarz.
- W MVP można pokazać tylko najbliższe terminy na liście transakcji.
- Powiadomienia o terminach są wartościowe, ale mogą być osobnym sprintem.

## Bezpieczeństwo i prywatność

Wymagania:

- wszystkie endpointy wymagają autoryzacji,
- każda operacja sprawdza `agentId` / ownership,
- dane transakcji nie trafiają do publicznych DTO, katalogu, SEO, sitemap ani
  publicznego profilu agenta,
- historia zmian nie powinna ujawniać danych transakcji innym agentom,
- soft delete preferowany dla audytu,
- walidacja statusów musi uniemożliwiać przypadkowe raportowanie prowizji przez
  błędny status.

Pola szczególnie wrażliwe:

- wartość transakcji,
- prowizja,
- dane kupującego/najemcy,
- dane właściciela,
- terminy notarialne,
- notatki i powody utraty transakcji.

## Walidacja biznesowa

Przykładowe reguły:

- `listingId` musi należeć do agenta.
- `buyerClientId` musi należeć do agenta.
- `sellerClientId`, jeśli podane, musi należeć do agenta.
- `dealValue` musi być większe lub równe `0`.
- `commissionValue` wymaga `commissionType`.
- `commissionType` bez `commissionValue` jest niepoprawne.
- prowizja procentowa musi być w zakresie `0-100`.
- `closed_lost` wymaga `lostReason`.
- `closed_won` powinno ustawić `closedAt`.
- status po `closed_won` albo `closed_lost` można zmienić tylko świadomie, z
  wpisem w historii.

## Proponowany podział sprintów

### T1. Model danych i backend podstawowy

Status: częściowo wykonane - pierwsza iteracja 2026-06-11

Zakres:

- [x] dodać `TransactionStatus` w enumach backendu,
- [x] dodać encje `Transaction`, `TransactionTask`, `TransactionEvent`,
- [x] dodać moduł `transactions`,
- [x] dodać CRUD transakcji,
- [x] dodać walidację ownership dla oferty i klientów,
- [x] dodać helper liczenia prowizji transakcji,
- [x] dodać testy jednostkowe walidacji prowizji,
- [ ] rozszerzyć testy serwisowe o pełne przypadki ownership/statusów.

Kryteria akceptacji:

- [x] Agent może utworzyć transakcję dla własnej oferty i własnego klienta.
- [x] Agent nie może użyć cudzej oferty ani cudzego klienta.
- [x] Transakcja przechowuje status, wartość, prowizję i terminy.
- [x] Zmiany statusu są walidowane i logowane.

Wykonane:

- Dodano enumy:
  - `TransactionStatus`,
  - `TransactionTaskStatus`,
  - `TransactionTaskPriority`,
  - `TransactionEventType`.
- Dodano encje:
  - `apps/api/src/transactions/entities/transaction.entity.ts`,
  - `apps/api/src/transactions/entities/transaction-task.entity.ts`,
  - `apps/api/src/transactions/entities/transaction-event.entity.ts`.
- Dodano moduł `TransactionsModule` i zarejestrowano go w `AppModule`.
- Dodano endpointy:
  - `GET /api/transactions`,
  - `POST /api/transactions`,
  - `GET /api/transactions/:id`,
  - `PATCH /api/transactions/:id`,
  - `PATCH /api/transactions/:id/status`,
  - `DELETE /api/transactions/:id`,
  - endpointy checklisty `tasks`,
  - `GET /api/transactions/:id/events`.
- Serwis pilnuje:
  - scope `agentId`,
  - ownership oferty,
  - ownership kupującego/najemcy,
  - ownership opcjonalnego właściciela,
  - jednej aktywnej transakcji na ofertę,
  - wymaganego `lostReason` dla `closed_lost`,
  - ustawienia `closedAt` dla `closed_won` i `closed_lost`,
  - kopiowania domyślnej wartości i prowizji z oferty przy tworzeniu
    transakcji.
- Dodano domyślne zadania checklisty przy tworzeniu transakcji.
- Dodano helper `transaction-commission.ts` i test
  `transaction-commission.spec.ts`.

Weryfikacja:

- `pnpm --filter api type-check` - przechodzi.
- `pnpm --filter api test -- transaction-commission listing-commission` -
  przechodzi.

Pozostało:

- Dodać testy serwisowe dla ownership, statusów, eventów i checklisty.
- Przygotować migrację produkcyjną, jeśli środowisko produkcyjne nie korzysta z
  `synchronize`.

### T2. Frontend MVP transakcji

Status: wykonane w zakresie MVP - druga iteracja 2026-06-12

Zakres:

- [x] dodać klienta API w `apps/web/src/lib`,
- [x] dodać route `/dashboard/transactions`,
- [x] dodać widok pipeline,
- [x] dodać osobny widok szczegółów transakcji,
- [x] dodać formularz tworzenia,
- [x] dodać formularz edycji,
- [x] dodać akcję `Utwórz transakcję` na szczegółach oferty,
- [x] dodać podstawową checklistę.

Kryteria akceptacji:

- [x] Agent widzi transakcje w kolumnach pipeline.
- [x] Agent może zmieniać status transakcji.
- [x] Agent może przejść z oferty do powiązanej transakcji.
- [x] Agent widzi najbliższy termin, prowizję i blokadę zamknięcia.

Wykonane:

- Dodano `apps/web/src/lib/transactions.ts` z:
  - typami frontendowymi,
  - etykietami statusów,
  - funkcjami API,
  - walidacją formularza przez `zod`,
  - formatterami wartości i prowizji.
- Dodano pozycję `Transakcje` w sidebarze dashboardu.
- Dodano stronę `apps/web/src/app/(dashboard)/dashboard/transactions/page.tsx`.
- Strona obsługuje:
  - pobranie transakcji, ofert i klientów,
  - formularz utworzenia transakcji,
  - automatyczne wypełnienie wartości/prowizji po wyborze oferty,
  - kolumnowy pipeline po statusach,
  - szybką zmianę statusu,
  - wymaganie powodu przy zmianie na `closed_lost`,
  - odhaczanie podstawowych zadań checklisty,
  - pokazanie wartości, prowizji, terminu i blokady.

Wykonane w drugiej iteracji:

- Rozszerzono `apps/web/src/lib/transactions.ts` o:
  - pobranie pojedynczej transakcji,
  - aktualizację transakcji,
  - pobranie historii eventów,
  - dodawanie i usuwanie zadań,
  - osobny schemat walidacji edycji,
  - payload pozwalający świadomie czyścić pola nullable, np. właściciela albo
    prowizję.
- Dodano dynamiczną stronę szczegółów:
  `apps/web/src/app/(dashboard)/dashboard/transactions/[id]/page.tsx`.
- Widok szczegółów obsługuje:
  - podsumowanie wartości, prowizji, otwartych zadań i terminu,
  - edycję statusu, stron transakcji, wartości, waluty, prowizji, terminów,
    blokady i notatki prywatnej,
  - wymagane pole powodu utraty przy statusie `closed_lost` przez walidację
    backendową,
  - linki do powiązanej oferty i klientów,
  - checklistę z dodawaniem, odhaczaniem i usuwaniem zadań,
  - podstawowy widok historii zdarzeń transakcji.
- Karty pipeline prowadzą do szczegółów transakcji.
- Widok szczegółów oferty dostał akcję `Utwórz transakcję`, która prowadzi do
  `/dashboard/transactions?listingId=...`.
- Lista transakcji odczytuje `listingId` z query stringa i automatycznie
  uzupełnia ofertę, wartość oraz prowizję w formularzu tworzenia.

Weryfikacja:

- `pnpm --filter web type-check` - przechodzi.
- `pnpm --filter web build` - przechodzi po zezwoleniu na pobranie fontów przez
  `next/font`.
- `pnpm --filter api type-check` - przechodzi.
- `pnpm --filter api test -- transaction-commission listing-commission` -
  przechodzi.

Pozostało:

- Dodać bardziej granularne testy frontendowe, jeśli repo wprowadzi runner
  testów UI.
- Rozważyć wyniesienie formularzy transakcji do komponentów współdzielonych, gdy
  powstanie trzeci wariant formularza.

### T3. Integracja z ofertami, dokumentami i raportem `Zarobki`

Status: częściowo wykonane - pierwsza iteracja 2026-06-12

Zakres:

- [x] pokazać transakcje na szczegółach oferty,
- [x] pokazać dokumenty oferty w szczegółach transakcji,
- [x] dodać ostrzeżenia o brakujących dokumentach przy zamykaniu,
- [x] dodać sekcję transakcyjną w raporcie `Zarobki`,
- [x] uniknąć podwójnego liczenia prowizji z oferty i transakcji.

Kryteria akceptacji:

- [x] Zamknięta wygrana transakcja jest widoczna w raporcie `Zarobki`.
- [x] Prowizja nie jest liczona podwójnie.
- [x] Transakcja pokazuje kompletność dokumentów oferty.
- [x] `closed_won` może zsynchronizować status oferty z `sold` albo `rented`.

Wykonane:

- Rozszerzono raport `Zarobki` po stronie backendu:
  - `closedCommissionValue`,
  - `closedListingsWithCommission`,
  - `averageClosedCommissionValue`,
  - timeline zamkniętych prowizji,
  - breakdown zamkniętych prowizji po typie transakcji
    bazują teraz na transakcjach ze statusem `closed_won`.
- Aktywne i łączne estymacje w raporcie nadal bazują na ofertach, ale
  wykluczają oferty, które mają już zamkniętą wygraną transakcję. Dzięki temu
  prowizja z oferty i prowizja z transakcji nie są liczone podwójnie.
- Zaktualizowano notatki i etykiety UI raportu `Zarobki`, żeby jasno wskazywać,
  że zamknięte prowizje pochodzą z transakcji.
- Zmiana statusu transakcji na `closed_won` synchronizuje ofertę:
  - sprzedaż ustawia `ListingStatus.SOLD`,
  - najem ustawia `ListingStatus.RENTED`,
  - opublikowana oferta jest odpublikowana przez `ListingPublicationStatus`.
- Szczegóły oferty pokazują powiązane transakcje i linkują do ich szczegółów.
- Szczegóły transakcji pokazują checklistę dokumentów powiązanej oferty:
  - procent kompletności,
  - liczbę wymaganych dokumentów,
  - braki,
  - dokumenty wymagające poprawy,
  - blokujące pozycje checklisty.

Weryfikacja:

- `pnpm --filter api type-check` - przechodzi.
- `pnpm --filter web type-check` - przechodzi.
- `pnpm --filter api test -- transaction-commission listing-commission` -
  przechodzi.
- `pnpm --filter web build` - przechodzi po zezwoleniu na pobranie fontów przez
  `next/font`.

Pozostało:

- Dodać dedykowane testy serwisowe raportu `Zarobki` dla miksu ofert i
  transakcji, żeby formalnie zabezpieczyć brak podwójnego liczenia.
- Rozważyć osobny widok szczegółowy "co blokuje zamknięcie" w T4, bazujący na
  deadline trackerze, checklistach i dokumentach.

### T4. Deadline tracker i blokady zamknięcia

Zakres:

- dodać widok terminów krytycznych,
- dodać flagę lub notatkę blokady,
- dodać widok "co blokuje zamknięcie",
- dodać podstawowe alerty w dashboardzie.

Kryteria akceptacji:

- [ ] Agent widzi transakcje z terminem w najbliższych 7 dniach.
- [ ] Agent widzi transakcje po terminie.
- [ ] Agent widzi transakcje oznaczone jako zablokowane.
- [ ] Szczegóły transakcji pokazują brakujące kroki przed zamknięciem.

## Testy

Backend:

- tworzenie transakcji,
- filtrowanie i paginacja,
- autoryzacja i ownership,
- walidacja prowizji,
- walidacja `closed_lost` z powodem utraty,
- `closed_won` z ustawieniem `closedAt`,
- logowanie zdarzeń,
- brak dostępu do cudzych transakcji.

Frontend:

- render listy/pipeline,
- formularz tworzenia transakcji,
- zmiana statusu,
- obsługa błędów walidacji,
- widok szczegółów i checklisty,
- link z oferty do transakcji.

Regresja prywatności:

- publiczne endpointy ofert nie zawierają pól transakcji,
- publiczny katalog nie zawiera prowizji transakcji,
- sitemap/SEO metadata nie zawierają danych transakcyjnych.

## Ryzyka i decyzje do domknięcia

- Czy jedna oferta może mieć wiele aktywnych transakcji? Rekomendacja MVP:
  jedna aktywna, wiele historycznych.
- Czy właściciel musi być klientem w CRM? Rekomendacja MVP: opcjonalnie.
- Czy prowizja transakcji jest snapshotem prowizji oferty? Rekomendacja: tak,
  z możliwością ręcznej edycji.
- Czy `closed_won` automatycznie zmienia status oferty? Rekomendacja: w MVP
  wykonać synchronizację po potwierdzeniu użytkownika albo przez jawny checkbox.
- Czy taski transakcyjne budujemy jako osobny model czy czekamy na globalny
  moduł `Zadania`? Rekomendacja: osobny lekki model teraz, migracja później.
- Jak raport `Zarobki` ma pokazywać okresy? Rekomendacja: dla transakcji używać
  `closedAt`, dla ofert bez transakcji dotychczasowej logiki.

## Minimalna definicja ukończenia MVP

- Agent może utworzyć transakcję z oferty i klienta.
- Agent może prowadzić ją przez statusy pipeline.
- Agent widzi transakcje na tablicy.
- Agent widzi terminy, checklistę i notatki.
- Agent może zamknąć transakcję jako wygraną albo przegraną.
- Zamknięta wygrana transakcja może zasilić raport `Zarobki`.
- Dane transakcji pozostają prywatne i nie pojawiają się w żadnym publicznym
  kanale aplikacji.
