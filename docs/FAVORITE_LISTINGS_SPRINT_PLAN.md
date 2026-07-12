# Ulubione oferty - plan sprintów

Dokument operacyjny do wdrożenia funkcjonalności dodawania publicznych ofert do
ulubionych oraz nowej zakładki w profilu użytkownika z zapisanymi ofertami.

Celem jest dostarczenie funkcji, która pomaga użytkownikom wracać do
interesujących nieruchomości, a produktowi daje mocniejszy sygnał intencji
kupującego lub najemcy. Implementacja powinna być prowadzona z naciskiem na
czytelny kontrakt domenowy, reużywalne komponenty, prostą architekturę i testy
chroniące kluczowe ścieżki.

---

## 1. Jak pracujemy z tym dokumentem

### Statusy

- `[ ]` - nie rozpoczęto
- `[-]` - w trakcie
- `[x]` - zakończone
- `[!]` - zablokowane / wymaga decyzji

### Zasada aktualizacji

Po zakończeniu zadania uzupełniamy:

- status checkboxa,
- datę wykonania,
- krótki opis zakresu,
- ewentualne decyzje / follow-upy.

### Szablon aktualizacji zadania

Przy każdym zadaniu można dopisać:

- `Data zakończenia:`
- `Wykonano:`
- `Uwagi / follow-up:`

---

## 2. Cel funkcjonalności

Użytkownik powinien móc:

- dodać publiczną ofertę do ulubionych z poziomu wyszukiwarki ofert,
- zobaczyć stan ulubienia na karcie oferty i w szczegółach oferty,
- usunąć ofertę z ulubionych,
- przejść do zakładki w swoim profilu i zobaczyć wszystkie polubione oferty,
- wrócić z listy ulubionych do szczegółów konkretnej oferty,
- zachować listę ulubionych między sesjami po zalogowaniu.

Zakładamy, że MVP dotyczy użytkowników zalogowanych. Obsługę anonimowych
ulubionych z synchronizacją po rejestracji traktujemy jako rozszerzenie po MVP,
chyba że decyzja produktowa zmieni ten zakres.

---

## 3. Zakres MVP

### Wchodzi w MVP

- model danych dla ulubionych ofert,
- endpointy API do pobierania, dodawania i usuwania ulubionych,
- stan `isFavorite` na publicznych wynikach wyszukiwania ofert,
- reużywalny przycisk ulubienia dla kart i szczegółów oferty,
- zakładka `Ulubione` w profilu użytkownika,
- pusta lista, loading, error state i optimistic UI,
- podstawowe eventy analityczne,
- testy backendowe i frontendowe dla krytycznych ścieżek.

### Poza MVP

- anonimowe ulubione w localStorage,
- synchronizacja anonimowych ulubionych po logowaniu,
- foldery/listy ulubionych,
- notatki użytkownika przy ofercie,
- alerty o zmianie ceny lub statusu,
- udostępnianie listy ulubionych,
- rekomendacje podobnych ofert na podstawie ulubionych.

---

## 4. Zasady architektury i jakości

1. Backend pozostaje źródłem prawdy dla ulubionych zalogowanego użytkownika.
2. Frontend nie trzyma trwałego stanu ulubionych poza cachem UI.
3. Model danych powinien mieć unikalność pary `userId + listingId`.
4. API powinno być idempotentne:
   - ponowne dodanie tej samej oferty nie tworzy duplikatu,
   - usunięcie nieistniejącego ulubienia zwraca bezpieczny wynik.
5. Ulubione mogą dotyczyć tylko ofert publicznie dostępnych dla użytkownika.
6. Nie duplikujemy logiki formatowania ofert. Zakładka ulubionych powinna
   korzystać z istniejących mapperów i komponentów kart ofert, jeśli ich kontrakt
   pasuje.
7. Reużywalny przycisk ulubienia powinien być niezależny od konkretnej strony:
   przyjmuje identyfikator oferty, stan początkowy i callback po zmianie.
8. Hook lub helper frontendowy powinien ukrywać szczegóły API, optimistic update,
   rollback i obsługę błędów.
9. Endpointy muszą być zabezpieczone guardem autoryzacji i nie mogą ujawniać
   prywatnych danych oferty.
10. Nazewnictwo powinno być spójne w całym stacku:
    `favoriteListing`, `favoriteListings`, `isFavorite`.
11. Testy powinny obejmować duplikaty, brak autoryzacji, niepubliczną ofertę,
    usunięcie oraz renderowanie zakładki profilu.
12. Wdrażamy funkcję etapowo, najlepiej za feature flagą, jeśli obecny system
    release flags obsługuje takie użycie.

---

## 5. Decyzje produktowe do potwierdzenia

- [ ] `D1` Czy MVP wymaga logowania do dodania oferty do ulubionych?
  - Rekomendacja: tak, a niezalogowany użytkownik po kliknięciu widzi prompt
    logowania/rejestracji.
  - Data decyzji:
  - Decyzja: taka jak rekomendacja 

- [ ] `D2` Gdzie dokładnie znajduje się "profil użytkownika"?
  - Opcja A: nowa zakładka w `dashboard/settings` obok danych konta.
  - Opcja B: osobna trasa `dashboard/profile/favorites`.
  - Opcja C: nowa pozycja nawigacji dashboardu `Ulubione`.
  - Rekomendacja: osobna pozycja w profilu/kontekście konta, ale z URL-em
    możliwym do linkowania, np. `/dashboard/profile/favorites`.
  - Data decyzji:
  - Decyzja:taka jak w rekomendacji

- [ ] `D3` Czy właściciel/agent może dodawać własne oferty do ulubionych?
  - Rekomendacja: technicznie tak, ale bez specjalnego wyróżniania w MVP.
  - Data decyzji:
  - Decyzja:rez moze dodawac do ulubionych, jak w rekomendacji

- [ ] `D4` Co pokazać, jeśli ulubiona oferta przestanie być publiczna?
  - Rekomendacja: zostawić rekord ulubienia, ale w UI pokazać uproszczony stan
    "Oferta nie jest już dostępna" i umożliwić usunięcie.
  - Data decyzji:
  - Decyzja:tak jak rekomendacja

---

## 6. Proponowany model danych

Encja: `FavoriteListing`

Pola:

- `id` - UUID,
- `userId` - UUID, indeks,
- `listingId` - UUID, indeks,
- `createdAt` - data dodania,
- relacja `user`,
- relacja `listing`.

Indeksy i ograniczenia:

- unique index na `(user_id, listing_id)`,
- indeks na `(user_id, created_at)` dla listy profilu,
- opcjonalny indeks na `listing_id` dla analityki popularności.

Zasada usuwania:

- `user` usunięty: kasujemy jego ulubione przez `CASCADE`,
- `listing` usunięty: kasujemy powiązane ulubione przez `CASCADE`,
- oferta niepubliczna: rekord może istnieć, ale endpoint listy profilu zwraca
  tylko bezpieczny, publiczny widok albo stan niedostępności.

---

## 7. Kontrakt API

Proponowane endpointy:

- `GET /api/favorite-listings`
  - zwraca paginowaną listę ulubionych ofert użytkownika,
  - sortowanie domyślne: najnowsze dodane jako pierwsze.

- `GET /api/favorite-listings/ids`
  - zwraca lekką listę `listingId[]` dla widocznych wyników lub całego użytkownika,
  - przydatne do oznaczania wyników wyszukiwarki bez ciężkiego payloadu.

- `POST /api/favorite-listings/:listingId`
  - dodaje ofertę do ulubionych,
  - idempotentne,
  - waliduje, czy oferta istnieje i jest publiczna.

- `DELETE /api/favorite-listings/:listingId`
  - usuwa ofertę z ulubionych,
  - idempotentne.

Alternatywa dla `GET /ids`:

- publiczny endpoint katalogu ofert może zwracać `isFavorite` dla zalogowanego
  użytkownika, jeśli request ma ważną sesję/JWT. To zmniejsza liczbę requestów,
  ale wymaga ostrożnego utrzymania cache i prywatnego wariantu odpowiedzi.

Rekomendacja dla MVP:

- dodać `isFavorite` do odpowiedzi katalogu, gdy użytkownik jest zalogowany,
- zachować osobny endpoint `GET /favorite-listings` dla zakładki profilu,
- dodać lekki helper w serwisie backendowym do masowego sprawdzania ulubionych
  po `listingIds`.

---

## 8. Sprinty

### Sprint FL-0 - Discovery, kontrakt i decyzje

**Cel sprintu:**
Domknąć decyzje produktowe, kontrakt API i wpływ na obecny katalog ofert.

**Rezultat sprintu:**
Zatwierdzony zakres MVP i kontrakt, który można implementować bez przebudowy
wyszukiwarki ofert.

#### Zadania

- [ ] `FL0.1` Potwierdzić zakres MVP i decyzje z sekcji 5.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL0.2` Sprawdzić obecny kontrakt publicznego katalogu ofert.
  - Zakres: `apps/api/src/listings`, `apps/web/src/lib/listings.ts`,
    `apps/web/src/components/listings/public-listing-catalog.tsx`.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL0.3` Zdefiniować docelowe typy TypeScript dla listy ulubionych.
  - Przykładowe typy:
    - `FavoriteListingListItem`,
    - `FavoriteListingSummary`,
    - `ToggleFavoriteListingResult`.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL0.4` Ustalić miejsce zakładki profilu i nazwę w nawigacji.
  - Proponowana etykieta: `Ulubione`.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL0.5` Spisać wymagania dostępności UI.
  - Zakres: `aria-pressed`, czytelny label, stan loading, focus state,
    komunikaty błędu bez przesuwania layoutu.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

### Sprint FL-1 - Backend: model, migracja i serwis domenowy

**Cel sprintu:**
Zbudować bezpieczny fundament backendowy dla ulubionych ofert.

**Rezultat sprintu:**
Encja, migracja, moduł i serwis gotowe do wykorzystania przez endpointy oraz
katalog ofert.

#### Zadania

- [ ] `FL1.1` Dodać encję `FavoriteListing`.
  - Zakres:
    - relacja do `User`,
    - relacja do `Listing`,
    - indeksy,
    - unique constraint `(user_id, listing_id)`.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL1.2` Dodać migrację bazy danych.
  - Wymagania:
    - tworzy tabelę i indeksy,
    - ma bezpieczny rollback,
    - nie modyfikuje istniejących danych ofert.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL1.3` Utworzyć moduł `favorite-listings`.
  - Zakres:
    - `favorite-listings.module.ts`,
    - `favorite-listings.service.ts`,
    - `favorite-listings.controller.ts`,
    - DTO i mappery odpowiedzi.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL1.4` Wydzielić metody serwisowe zamiast logiki w kontrolerze.
  - Metody:
    - `findUserFavorites(userId, query)`,
    - `addFavorite(userId, listingId)`,
    - `removeFavorite(userId, listingId)`,
    - `findFavoriteListingIds(userId, listingIds)`.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL1.5` Dodać walidację publiczności oferty.
  - Wymagania:
    - można dodać tylko ofertę publicznie opublikowaną,
    - endpoint profilu nie ujawnia pól prywatnych,
    - brak oferty zwraca kontrolowany błąd.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL1.6` Dodać testy jednostkowe serwisu.
  - Przypadki:
    - dodanie nowej ulubionej oferty,
    - ponowne dodanie tej samej oferty,
    - usunięcie,
    - niepubliczna oferta,
    - brak autoryzacji,
    - lista użytkownika nie pokazuje cudzych ulubionych.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

### Sprint FL-2 - Backend: integracja z publicznym katalogiem

**Cel sprintu:**
Pokazać stan ulubienia w wynikach wyszukiwania bez kosztownego odpytywania API
dla każdej karty osobno.

**Rezultat sprintu:**
Publiczny katalog ofert potrafi zwrócić `isFavorite` dla zalogowanego
użytkownika, a anonimowi użytkownicy dostają stabilny publiczny kontrakt.

#### Zadania

- [ ] `FL2.1` Rozszerzyć model odpowiedzi katalogu o opcjonalne `isFavorite`.
  - Wymagania:
    - `false` dla zalogowanego użytkownika, jeśli oferta nie jest ulubiona,
    - brak danych prywatnych,
    - zgodność z istniejącymi typami w `apps/web/src/lib/listings.ts`.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL2.2` Dodać masowe sprawdzanie ulubionych po wynikach katalogu.
  - Wymagania:
    - jeden query po `listingIds`,
    - brak zapytań N+1,
    - działanie z paginacją i filtrami.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL2.3` Zapewnić tryb anonymous-safe.
  - Wymagania:
    - katalog nadal działa bez tokenu,
    - brak błędów hydratacji na froncie,
    - UI może pokazać prompt logowania przy kliknięciu.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL2.4` Dodać testy integracyjne dla katalogu.
  - Przypadki:
    - użytkownik zalogowany z jedną ulubioną ofertą,
    - użytkownik zalogowany bez ulubionych,
    - użytkownik anonimowy,
    - oferta niepubliczna.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

### Sprint FL-3 - Frontend: API client, hook i reużywalny przycisk

**Cel sprintu:**
Stworzyć mały, reużywalny frontendowy moduł ulubionych zamiast rozpraszać
requesty i stan po komponentach.

**Rezultat sprintu:**
Jeden kontrakt frontendowy do listy i togglowania ulubionych, gotowy do użycia w
katalogu, szczegółach oferty i profilu.

#### Zadania

- [ ] `FL3.1` Dodać klienta API w `apps/web/src/lib/favorite-listings.ts`.
  - Funkcje:
    - `fetchFavoriteListings`,
    - `addFavoriteListing`,
    - `removeFavoriteListing`.
  - Wymagania:
    - spójna obsługa błędów z resztą `lib`,
    - typy eksportowane z jednego miejsca.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL3.2` Dodać hook `useFavoriteListing`.
  - Odpowiedzialność:
    - stan lokalny,
    - optimistic update,
    - rollback po błędzie,
    - komunikat logowania dla użytkownika anonimowego,
    - callback `onChanged`.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL3.3` Dodać komponent `FavoriteListingButton`.
  - Wymagania:
    - wariant compact dla kart,
    - wariant full dla szczegółów oferty,
    - ikona serca z biblioteki używanej w projekcie,
    - `aria-pressed`,
    - stabilne wymiary, żeby karta nie przeskakiwała.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL3.4` Dodać testy komponentu i hooka.
  - Przypadki:
    - render stanu aktywnego i nieaktywnego,
    - kliknięcie dodaje do ulubionych,
    - kliknięcie usuwa z ulubionych,
    - błąd API cofa optimistic update,
    - użytkownik anonimowy nie wykonuje niedozwolonej akcji bez obsługi.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

### Sprint FL-4 - Wyszukiwarka ofert i szczegóły oferty

**Cel sprintu:**
Dodać ulubione do głównych miejsc, w których użytkownik odkrywa oferty.

**Rezultat sprintu:**
Użytkownik może dodać i usunąć ofertę z ulubionych z listy wyników oraz strony
szczegółów.

#### Zadania

- [ ] `FL4.1` Dodać przycisk ulubienia do kart w wyszukiwarce ofert.
  - Zakres:
    - `PublicListingCatalog`,
    - karta wyniku/listy,
    - widok mapy, jeśli ma własny popup/kartę.
  - Wymagania:
    - przycisk nie zasłania kluczowych danych,
    - nie psuje układu mobile,
    - działa z paginacją i filtrami.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL4.2` Dodać przycisk ulubienia na stronie szczegółów oferty.
  - Zakres: `apps/web/src/app/(public)/oferty/[slug]/page.tsx`.
  - Wymagania:
    - widoczny w sekcji akcji,
    - nie konkuruje z głównym CTA kontaktowym,
    - stan zgodny z katalogiem.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL4.3` Dodać prompt logowania dla użytkownika anonimowego.
  - Wymagania:
    - krótki komunikat,
    - link do logowania z powrotem do aktualnej strony,
    - brak utraty filtrów wyszukiwarki.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL4.4` Dodać tracking eventów.
  - Eventy:
    - `favorite_listing_added`,
    - `favorite_listing_removed`,
    - `favorite_login_prompt_shown`,
    - `favorites_profile_opened`.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL4.5` Sprawdzić UI na desktopie i mobile.
  - Zakres:
    - brak nakładania tekstu,
    - stabilny layout kart,
    - poprawne focus states,
    - czytelny stan loading.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

### Sprint FL-5 - Zakładka profilu: lista ulubionych

**Cel sprintu:**
Dostarczyć użytkownikowi miejsce, w którym może zarządzać zapisanymi ofertami.

**Rezultat sprintu:**
Nowa zakładka profilu z listą ulubionych, stanami pustymi i możliwością usuwania
ofert z listy.

#### Zadania

- [ ] `FL5.1` Dodać trasę zakładki ulubionych.
  - Propozycja: `/dashboard/profile/favorites` albo uzgodniona trasa z decyzji
    `D2`.
  - Wymagania:
    - chroniona autoryzacją,
    - spójna z layoutem dashboardu,
    - linkowalna z nawigacji profilu.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL5.2` Dodać komponent listy `FavoriteListingsList`.
  - Wymagania:
    - korzysta z istniejącej karty oferty albo wspólnego komponentu prezentacji,
    - pokazuje datę dodania do ulubionych,
    - pozwala usunąć ofertę,
    - ma paginację lub infinite load, jeśli API ją zwraca.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL5.3` Dodać empty state.
  - Treść:
    - krótka informacja, że użytkownik nie ma jeszcze ulubionych,
    - CTA do `/oferty`.
  - Wymagania:
    - bez marketingowego nadmiaru,
    - spójne z dashboardem.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL5.4` Obsłużyć oferty niedostępne.
  - Wymagania:
    - informacja "Oferta nie jest już publicznie dostępna",
    - możliwość usunięcia z ulubionych,
    - brak linku do niedostępnych szczegółów.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL5.5` Dodać wejście do zakładki w profilu/nawigacji.
  - Zakres zależny od decyzji `D2`.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

### Sprint FL-6 - Testy E2E, performance i bezpieczeństwo

**Cel sprintu:**
Zweryfikować funkcję end-to-end i upewnić się, że nie pogarsza katalogu ofert.

**Rezultat sprintu:**
Funkcja jest gotowa do rolloutu za flagą lub bezpośrednio, jeśli release process
na to pozwala.

#### Zadania

- [ ] `FL6.1` Dodać test E2E: dodanie z katalogu i widoczność w profilu.
  - Flow:
    - użytkownik loguje się,
    - wchodzi na `/oferty`,
    - dodaje ofertę do ulubionych,
    - przechodzi do zakładki `Ulubione`,
    - widzi dodaną ofertę.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL6.2` Dodać test E2E: usunięcie z ulubionych.
  - Flow:
    - użytkownik ma ulubioną ofertę,
    - usuwa ją z zakładki profilu,
    - oferta znika z listy,
    - katalog pokazuje stan nieaktywny.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL6.3` Sprawdzić brak N+1 queries.
  - Zakres:
    - katalog ofert,
    - lista ulubionych,
    - szczegóły oferty.
  - Kryterium:
    - stan ulubionych jest pobierany masowo, nie per karta.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL6.4` Sprawdzić autoryzację i izolację danych.
  - Przypadki:
    - użytkownik A nie widzi ulubionych użytkownika B,
    - anonimowy użytkownik nie odczytuje listy ulubionych,
    - nie można dodać niepublicznej oferty.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL6.5` Przejść checklistę UI.
  - Zakres:
    - desktop,
    - mobile,
    - loading,
    - error,
    - empty state,
    - focus i keyboard navigation.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

### Sprint FL-7 - Rollout, metryki i follow-upy

**Cel sprintu:**
Wypuścić funkcję kontrolowanie i zebrać dane o użyciu.

**Rezultat sprintu:**
Funkcja jest dostępna dla użytkowników, monitorowana i ma backlog dalszych
usprawnień.

#### Zadania

- [ ] `FL7.1` Uruchomić feature flagę lub rollout.
  - Warianty:
    - internal only,
    - 10% użytkowników,
    - 100% użytkowników po walidacji.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL7.2` Monitorować eventy i błędy.
  - Metryki:
    - liczba dodanych ulubionych,
    - liczba użytkowników z minimum jedną ulubioną ofertą,
    - CTR z promptu logowania,
    - wejścia do zakładki profilu,
    - usunięcia z ulubionych,
    - błędy API.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL7.3` Ocenić wpływ na katalog ofert.
  - Zakres:
    - czas ładowania katalogu,
    - liczba requestów,
    - rozmiar payloadu,
    - błędy hydratacji lub cache.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `FL7.4` Utworzyć backlog po MVP.
  - Kandydaci:
    - anonimowe ulubione,
    - synchronizacja po rejestracji,
    - alerty o zmianie ceny/statusu,
    - rekomendacje podobnych ofert,
    - foldery/listy,
    - notatki przy ulubionych.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

---

## 9. Kryteria akceptacji MVP

Funkcja jest gotowa, gdy:

- zalogowany użytkownik może dodać ofertę do ulubionych z wyszukiwarki,
- zalogowany użytkownik może usunąć ofertę z ulubionych z wyszukiwarki,
- stan ulubienia jest widoczny po odświeżeniu strony,
- zakładka profilu pokazuje wszystkie ulubione oferty użytkownika,
- zakładka profilu pozwala usunąć ofertę z ulubionych,
- anonimowy użytkownik dostaje kontrolowany prompt logowania,
- API nie pozwala dodać niepublicznej oferty,
- użytkownik nie widzi ulubionych innego użytkownika,
- katalog ofert nie wykonuje zapytań N+1 dla stanu ulubionych,
- testy backendowe, frontendowe i E2E dla kluczowych flow przechodzą,
- UI działa poprawnie na desktopie i mobile.

---

## 10. Ryzyka

- Zbyt szerokie wejście w anonimowe ulubione może opóźnić MVP.
  - Mitigacja: najpierw wersja dla zalogowanych, localStorage jako osobny etap.

- Dodanie `isFavorite` do publicznego katalogu może skomplikować cache.
  - Mitigacja: rozdzielić publiczny payload od prywatnego wzbogacenia odpowiedzi
    i testować anonimowy wariant.

- Karty ofert mogą mieć już napięty layout.
  - Mitigacja: stabilny przycisk ikonowy, test mobile, brak przesuwania treści.

- Brak jednoznacznego miejsca profilu użytkownika może rozproszyć funkcję.
  - Mitigacja: decyzja `D2` przed implementacją Sprintu FL-5.

- Użytkownik może oczekiwać ulubionych bez logowania.
  - Mitigacja: jasny prompt i backlog synchronizacji anonimowych ulubionych.

---

## 11. Proponowane pliki do zmiany

Backend:

- `apps/api/src/favorite-listings/*`
- `apps/api/src/listings/listings.service.ts`
- `apps/api/src/listings/public-listing.model.ts`
- `apps/api/src/listings/dto/public-listing-catalog-query.dto.ts`, jeśli będzie
  potrzebny dodatkowy kontekst
- `apps/api/migrations/*`
- `apps/api/src/app.module.ts`

Frontend:

- `apps/web/src/lib/favorite-listings.ts`
- `apps/web/src/lib/listings.ts`
- `apps/web/src/hooks/use-favorite-listing.ts`
- `apps/web/src/components/listings/favorite-listing-button.tsx`
- `apps/web/src/components/listings/public-listing-catalog.tsx`
- `apps/web/src/app/(public)/oferty/[slug]/page.tsx`
- `apps/web/src/app/(dashboard)/dashboard/...` albo nowa trasa profilu zgodna z
  decyzją `D2`
- `apps/web/src/components/layout/*`, jeśli wejście do profilu wymaga nawigacji

Dokumentacja:

- ten dokument po każdym sprincie,
- ewentualnie `docs/NOTIFICATIONS.md`, jeśli po MVP dodamy alerty o zmianach
  ofert.
