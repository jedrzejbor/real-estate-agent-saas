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

- [x] `D1` Czy MVP wymaga logowania do dodania oferty do ulubionych?
  - Rekomendacja: tak, a niezalogowany użytkownik po kliknięciu widzi prompt
    logowania/rejestracji.
  - Data decyzji: 2026-07-12
  - Decyzja: MVP wymaga logowania. Użytkownik anonimowy widzi prompt
    logowania/rejestracji z powrotem do aktualnej strony lub wyników
    wyszukiwania.

- [x] `D2` Gdzie dokładnie znajduje się "profil użytkownika"?
  - Opcja A: nowa zakładka w `dashboard/settings` obok danych konta.
  - Opcja B: osobna trasa `dashboard/profile/favorites`.
  - Opcja C: nowa pozycja nawigacji dashboardu `Ulubione`.
  - Rekomendacja: osobna pozycja w profilu/kontekście konta, ale z URL-em
    możliwym do linkowania, np. `/dashboard/profile/favorites`.
  - Data decyzji: 2026-07-12
  - Decyzja: implementujemy linkowalną trasę
    `/dashboard/profile/favorites`. W nawigacji dashboardu funkcja może wejść
    jako dolna pozycja konta/profilu albo element grupy użytkownika, ale nie
    powinna być mieszana z prywatnym CRM agenta.

- [x] `D3` Czy właściciel/agent może dodawać własne oferty do ulubionych?
  - Rekomendacja: technicznie tak, ale bez specjalnego wyróżniania w MVP.
  - Data decyzji: 2026-07-12
  - Decyzja: agent/właściciel może dodać własną ofertę do ulubionych. MVP nie
    dodaje specjalnego wyróżnika ani blokady dla własnych ofert.

- [x] `D4` Co pokazać, jeśli ulubiona oferta przestanie być publiczna?
  - Rekomendacja: zostawić rekord ulubienia, ale w UI pokazać uproszczony stan
    "Oferta nie jest już dostępna" i umożliwić usunięcie.
  - Data decyzji: 2026-07-12
  - Decyzja: rekord ulubienia zostaje, ale lista profilu pokazuje stan
    niedostępności i akcję usunięcia. Publiczny katalog oraz szczegóły nadal
    pokazują tylko oferty aktywne, opublikowane i niewygasłe.

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

Rekomendacja dla MVP po discovery FL-0:

- publiczny katalog ofert pozostaje publiczny i cache-friendly,
- nie zmieniamy `GET /api/listings/public/catalog` w endpoint zależny od
  prywatnej sesji użytkownika w pierwszej iteracji,
- stan ulubionych dla widocznych wyników pobieramy osobnym autoryzowanym
  endpointem `GET /api/favorite-listings/ids?listingIds=...`,
- zakładka profilu korzysta z `GET /api/favorite-listings`,
- backendowy serwis ulubionych udostępnia metodę masowego sprawdzania po
  `listingIds`, aby uniknąć N+1 queries,
- typ `isFavorite?: boolean` może zostać dodany do frontendowego modelu karty
  jako stan UI, ale nie musi być częścią publicznego payloadu katalogu w MVP.

Uzasadnienie:

- obecny kontroler katalogu jest oznaczony jako `@Public()`,
- frontendowe `fetchPublicListingCatalog` używa `skipAuth: true`,
- w projekcie nie ma jeszcze ustalonego wzorca dla publicznych endpointów z
  opcjonalnym użytkownikiem,
- rozdzielenie publicznego katalogu od prywatnego stanu ulubionych zmniejsza
  ryzyko problemów z cache, hydratacją i wyciekiem danych.

---

## 8. Sprinty

### Sprint FL-0 - Discovery, kontrakt i decyzje

**Cel sprintu:**
Domknąć decyzje produktowe, kontrakt API i wpływ na obecny katalog ofert.

**Rezultat sprintu:**
Zatwierdzony zakres MVP i kontrakt, który można implementować bez przebudowy
wyszukiwarki ofert.

#### Zadania

- [x] `FL0.1` Potwierdzić zakres MVP i decyzje z sekcji 5.
  - Data zakończenia: 2026-07-12
  - Wykonano: potwierdzono MVP dla użytkowników zalogowanych, trasę
    `/dashboard/profile/favorites`, możliwość dodawania własnych ofert oraz
    zachowanie rekordu ulubienia po wycofaniu oferty z publicznego katalogu.
  - Uwagi / follow-up: anonimowe ulubione i synchronizacja po logowaniu zostają
    poza MVP.

- [x] `FL0.2` Sprawdzić obecny kontrakt publicznego katalogu ofert.
  - Zakres: `apps/api/src/listings`, `apps/web/src/lib/listings.ts`,
    `apps/web/src/components/listings/public-listing-catalog.tsx`.
  - Data zakończenia: 2026-07-12
  - Wykonano:
    - backend: `GET /api/listings/public/catalog` jest publiczny i zwraca
      `PublicListingCatalogResponse` z `data`, `mapMarkers` oraz `meta`,
    - backend: katalog filtruje oferty do aktywnych, opublikowanych,
      niewygasłych i posiadających `publicSlug`,
    - backend: mapper `toPublicCatalogItem` nie ma dziś pola `isFavorite`,
    - frontend: `fetchPublicListingCatalog` wywołuje katalog z `skipAuth: true`,
    - frontend: `PublicListingCatalogItem` nie ma pola `isFavorite`,
    - UI: karta katalogu jest zbudowana wokół linku do szczegółów oferty.
  - Uwagi / follow-up: dla MVP nie dokładamy prywatnego stanu do publicznego
    payloadu katalogu. Dodajemy osobny autoryzowany endpoint po `listingIds` i
    składamy stan w komponencie katalogu.

- [x] `FL0.3` Zdefiniować docelowe typy TypeScript dla listy ulubionych.
  - Przykładowe typy:
    - `FavoriteListingListItem`,
    - `FavoriteListingSummary`,
    - `ToggleFavoriteListingResult`.
  - Data zakończenia: 2026-07-12
  - Wykonano: ustalono docelowe typy frontendowe i backendowe:
    - `FavoriteListingSummary`:
      `id`, `listingId`, `createdAt`, `isAvailable`,
    - `FavoriteListingListItem`:
      `id`, `listingId`, `createdAt`, `isAvailable`, `listing`,
    - `FavoriteListingUnavailableItem`:
      `id`, `listingId`, `createdAt`, `isAvailable: false`,
      `unavailableReason`,
    - `ToggleFavoriteListingResult`:
      `listingId`, `isFavorite`, `favoriteId?: string`, `createdAt?: string`,
    - `FavoriteListingIdsResponse`:
      `listingIds: string[]`.
  - Uwagi / follow-up: `listing` w `FavoriteListingListItem` powinien używać
    bezpiecznego publicznego kształtu zgodnego z kartą katalogu, np.
    `PublicListingCatalogItem`, aby nie dublować formatu oferty.

- [x] `FL0.4` Ustalić miejsce zakładki profilu i nazwę w nawigacji.
  - Proponowana etykieta: `Ulubione`.
  - Data zakończenia: 2026-07-12
  - Wykonano: ustalono trasę `/dashboard/profile/favorites` i etykietę
    `Ulubione`. Obecnie `/dashboard/profile/*` trafia do catch-all strony
    "w trakcie przygotowania", więc Sprint FL-5 powinien dodać konkretną trasę
    przed catch-all.
  - Uwagi / follow-up: nawigację najlepiej dodać w `DashboardSidebar` jako
    element konta/profilu obok `Ustawienia`, nie jako moduł CRM.

- [x] `FL0.5` Spisać wymagania dostępności UI.
  - Zakres: `aria-pressed`, czytelny label, stan loading, focus state,
    komunikaty błędu bez przesuwania layoutu.
  - Data zakończenia: 2026-07-12
  - Wykonano: wymagania dostępności i layoutu dla `FavoriteListingButton`:
    - przycisk serca jest elementem `button`, nie linkiem,
    - ma `aria-pressed` i dynamiczny `aria-label`,
    - ma stabilny rozmiar minimum `44px x 44px`,
    - stan loading nie zmienia szerokości ani wysokości,
    - kliknięcie nie uruchamia linku karty oferty,
    - przycisk w katalogu musi być poza obszarem `PublicListingCatalogResultLink`
      albo musi jawnie zatrzymywać propagację zdarzenia,
    - focus ring jest widoczny na desktopie i mobile,
    - komunikat błędu używa toastu albo stałego slotu, bez przesuwania układu
      karty,
    - ikona serca powinna pochodzić z `lucide-react`.
  - Uwagi / follow-up: w Sprint FL-3 komponent powinien mieć wariant `compact`
    dla kart i `default` dla szczegółów oferty/profilu.

### Sprint FL-1 - Backend: model, migracja i serwis domenowy

**Cel sprintu:**
Zbudować bezpieczny fundament backendowy dla ulubionych ofert.

**Rezultat sprintu:**
Encja, migracja, moduł i serwis gotowe do wykorzystania przez endpointy oraz
katalog ofert.

#### Zadania

- [x] `FL1.1` Dodać encję `FavoriteListing`.
  - Zakres:
    - relacja do `User`,
    - relacja do `Listing`,
    - indeksy,
    - unique constraint `(user_id, listing_id)`.
  - Data zakończenia: 2026-07-12
  - Wykonano: dodano encję `FavoriteListing` w
    `apps/api/src/favorite-listings/entities/favorite-listing.entity.ts` z
    relacjami do `User` i `Listing`, indeksem unikalnym po `userId + listingId`
    oraz indeksem `userId + createdAt` dla listy profilu.
  - Uwagi / follow-up: encja jest rejestrowana przez
    `FavoriteListingsModule`.

- [x] `FL1.2` Dodać migrację bazy danych.
  - Wymagania:
    - tworzy tabelę i indeksy,
    - ma bezpieczny rollback,
    - nie modyfikuje istniejących danych ofert.
  - Data zakończenia: 2026-07-12
  - Wykonano: dodano migrację
    `apps/api/migrations/20260712_favorite_listings.sql`, która tworzy tabelę
    `favorite_listings`, constraint `uq_favorite_listings_user_listing`,
    indeks `idx_favorite_listings_user_created` i indeks
    `idx_favorite_listings_listing_id`.
  - Uwagi / follow-up: projektowe migracje są plikami SQL bez sekcji rollback,
    więc utrzymano obecny standard repo.

- [x] `FL1.3` Utworzyć moduł `favorite-listings`.
  - Zakres:
    - `favorite-listings.module.ts`,
    - `favorite-listings.service.ts`,
    - `favorite-listings.controller.ts`,
    - DTO i mappery odpowiedzi.
  - Data zakończenia: 2026-07-12
  - Wykonano: dodano moduł `FavoriteListingsModule`, kontroler, serwis, DTO
    query, typy odpowiedzi i eksport modułu. Moduł został podpięty w
    `AppModule`.
  - Uwagi / follow-up: mapper listy profilu zwraca bezpieczny publiczny kształt
    oferty zgodny z `PublicListingCatalogItem` albo stan niedostępności bez
    prywatnych danych.

- [x] `FL1.4` Wydzielić metody serwisowe zamiast logiki w kontrolerze.
  - Metody:
    - `findUserFavorites(userId, query)`,
    - `addFavorite(userId, listingId)`,
    - `removeFavorite(userId, listingId)`,
    - `findFavoriteListingIds(userId, listingIds)`.
  - Data zakończenia: 2026-07-12
  - Wykonano: cała logika biznesowa znajduje się w
    `FavoriteListingsService`; kontroler jedynie przekazuje `CurrentUser`,
    parametry i query do serwisu.
  - Uwagi / follow-up: `addFavorite` i `removeFavorite` są idempotentne, a
    `addFavorite` obsługuje race condition na unikalnym constraincie Postgresa.

- [x] `FL1.5` Dodać walidację publiczności oferty.
  - Wymagania:
    - można dodać tylko ofertę publicznie opublikowaną,
    - endpoint profilu nie ujawnia pól prywatnych,
    - brak oferty zwraca kontrolowany błąd.
  - Data zakończenia: 2026-07-12
  - Wykonano: `addFavorite` akceptuje tylko oferty aktywne, opublikowane,
    posiadające `publicSlug`, `publishedAt` i niewygasłe. Brak takiej oferty
    zwraca `NotFoundException`. Lista profilu nie pokazuje prywatnych pól i dla
    niepublicznych ofert zwraca `isAvailable: false`.
  - Uwagi / follow-up: dokładny `mapPoint` nie jest odtwarzany w module
    ulubionych w FL-1; lista profilu go nie potrzebuje. Jeśli UI będzie tego
    wymagać, warto wydzielić wspólny publiczny mapper z `ListingsService`.

- [x] `FL1.6` Dodać testy jednostkowe serwisu.
  - Przypadki:
    - dodanie nowej ulubionej oferty,
    - ponowne dodanie tej samej oferty,
    - usunięcie,
    - niepubliczna oferta,
    - brak autoryzacji,
    - lista użytkownika nie pokazuje cudzych ulubionych.
  - Data zakończenia: 2026-07-12
  - Wykonano: dodano `favorite-listings.service.spec.ts` z testami dodania,
    ponownego dodania tej samej oferty, odrzucenia niepublicznej oferty,
    idempotentnego usunięcia, pobierania ID ulubionych dla bieżącego użytkownika
    oraz stanu niedostępnej oferty na liście profilu.
  - Uwagi / follow-up: brak autoryzacji jest wymuszany globalnym
    `JwtAuthGuard`, więc w FL-1 nie dodano osobnego testu kontrolera dla 401.
    Test E2E autoryzacji powinien wejść w Sprint FL-6.

### Sprint FL-2 - Backend: integracja stanu ulubionych dla katalogu

**Cel sprintu:**
Udostępnić lekki, autoryzowany kontrakt do oznaczania ulubionych w wynikach
wyszukiwania bez zmiany publicznego katalogu ofert w endpoint zależny od sesji.

**Rezultat sprintu:**
Frontend może pobrać publiczny katalog ofert tak jak dotychczas, a następnie
jednym requestem sprawdzić, które widoczne `listingIds` są ulubione dla
zalogowanego użytkownika.

#### Zadania

- [x] `FL2.1` Ustabilizować endpoint `GET /api/favorite-listings/ids`.
  - Wymagania:
    - przyjmuje maksymalnie `100` `listingIds`,
    - zwraca wyłącznie ID należące do bieżącego użytkownika,
    - nie ujawnia danych ofert,
    - działa idempotentnie dla duplikatów w query.
  - Data zakończenia: 2026-07-13
  - Wykonano: doprecyzowano kontrakt serwisu dla `findFavoriteListingIds`.
    Endpoint bazuje na DTO z limitem `100` ID, deduplikuje wejście i zwraca
    tylko `listingIds` znalezione dla bieżącego `userId`. Odpowiedź zachowuje
    kolejność pierwszego wystąpienia ID z requestu, dzięki czemu frontend może
    stabilnie składać stan kart katalogu.
  - Uwagi / follow-up: endpoint pozostaje autoryzowany przez globalny
    `JwtAuthGuard`; anonimowy katalog nie powinien go wywoływać.

- [x] `FL2.2` Dodać masowe sprawdzanie ulubionych po wynikach katalogu.
  - Wymagania:
    - jeden query po `listingIds`,
    - brak zapytań N+1,
    - działanie z paginacją i filtrami.
  - Data zakończenia: 2026-07-14
  - Wykonano: potwierdzono kontrakt endpointu `GET /api/favorite-listings/ids`
    na poziomie kontrolera. Kontroler deleguje sprawdzenie wielu `listingIds`
    do jednej metody serwisowej `findFavoriteListingIds(userId, listingIds)`,
    bez logiki per karta i bez dotykania publicznego katalogu ofert.
  - Uwagi / follow-up: frontendowe wywołanie tego endpointu dla aktualnej strony
    wyników katalogu należy do FL-3, razem z klientem API i hookiem.

- [x] `FL2.3` Zapewnić tryb anonymous-safe po stronie kontraktu.
  - Wymagania:
    - katalog nadal działa bez tokenu,
    - endpoint `favorite-listings/ids` pozostaje autoryzowany,
    - frontend może pominąć request dla użytkownika anonimowego,
    - UI może pokazać prompt logowania przy kliknięciu.
  - Data zakończenia: 2026-07-14
  - Wykonano: dodano test kontrolera potwierdzający, że endpoint
    `favorite-listings/ids` nie jest oznaczony jako `@Public()`. Publiczny
    katalog `/listings/public/catalog` pozostaje niezależny od prywatnej sesji,
    a stan ulubionych jest osobnym autoryzowanym kontraktem.
  - Aktualizacja 2026-07-15: dodano test regresji
    `listings.controller.spec.ts`, który pilnuje, że publiczny katalog ofert i
    publiczne szczegóły oferty pozostają oznaczone jako `@Public()`.
  - Uwagi / follow-up: faktyczne pominięcie requestu po stronie anonimowego UI
    oraz prompt logowania należy wdrożyć w FL-3/FL-4.

- [x] `FL2.4` Dodać testy backendowe dla lekkiego endpointu ID.
  - Przypadki:
    - użytkownik zalogowany z jedną ulubioną ofertą,
    - użytkownik zalogowany bez ulubionych,
    - duplikaty `listingIds` w query,
    - ID należące do cudzych ulubionych nie są zwracane.
  - Data zakończenia: 2026-07-13
  - Wykonano: rozszerzono testy serwisu o pusty wynik dla zalogowanego
    użytkownika bez pasujących ulubionych oraz stabilną kolejność odpowiedzi.
    Dodano testy DTO `FavoriteListingIdsQueryDto` dla comma-separated query,
    powtórzonych parametrów query, limitu `100` ID oraz błędnych/brakujących
    wartości.
  - Uwagi / follow-up: testy kontrolera/E2E 401 zostają w FL-6 zgodnie z
    wcześniejszą decyzją, bo autoryzację wymusza globalny guard. W FL-2 dodano
    natomiast test kontrolera, który pilnuje braku `@Public()` na endpointcie
    `ids` oraz jednego zbiorczego wywołania serwisu.
  - Aktualizacja 2026-07-15: rozszerzono testy kontraktu o publiczny katalog i
    publiczne szczegóły oferty, żeby zabezpieczyć rozdział publicznego katalogu
    od prywatnego stanu ulubionych.

### Sprint FL-3 - Frontend: API client, hook i reużywalny przycisk

**Cel sprintu:**
Stworzyć mały, reużywalny frontendowy moduł ulubionych zamiast rozpraszać
requesty i stan po komponentach.

**Rezultat sprintu:**
Jeden kontrakt frontendowy do listy i togglowania ulubionych, gotowy do użycia w
katalogu, szczegółach oferty i profilu.

#### Zadania

- [x] `FL3.1` Dodać klienta API w `apps/web/src/lib/favorite-listings.ts`.
  - Funkcje:
    - `fetchFavoriteListings`,
    - `addFavoriteListing`,
    - `removeFavoriteListing`.
  - Wymagania:
    - spójna obsługa błędów z resztą `lib`,
    - typy eksportowane z jednego miejsca.
  - Data zakończenia: 2026-07-15
  - Wykonano: dodano `apps/web/src/lib/favorite-listings.ts` z typami
    `FavoriteListingListEntry`, `FavoriteListingsPage`,
    `FavoriteListingIdsResponse` i `ToggleFavoriteListingResult` oraz funkcjami
    `fetchFavoriteListings`, `fetchFavoriteListingIds`, `addFavoriteListing` i
    `removeFavoriteListing`. Moduł używa istniejącego `apiFetch`, wspólnego
    `PaginationMeta` i publicznego kształtu oferty `PublicListingCatalogItem`,
    żeby nie dublować modeli.
  - Uwagi / follow-up: `fetchFavoriteListingIds` zwraca lokalnie pustą listę
    bez requestu, gdy dostanie pusty input. Hook z `FL3.2` powinien używać tego
    klienta i obsłużyć stan anonimowego użytkownika przed wywołaniem API.

- [x] `FL3.2` Dodać hook `useFavoriteListing`.
  - Odpowiedzialność:
    - stan lokalny,
    - optimistic update,
    - rollback po błędzie,
    - komunikat logowania dla użytkownika anonimowego,
    - callback `onChanged`.
  - Data zakończenia: 2026-07-16
  - Wykonano: dodano `apps/web/src/hooks/use-favorite-listing.ts`.
    Hook przyjmuje `listingId`, `initialIsFavorite`, opcjonalny `loginHref`,
    `onAuthRequired` i `onChanged`. Udostępnia `isFavorite`, `isPending`,
    `error`, `add`, `remove`, `toggle` i `setIsFavorite`. Aktualizacja jest
    optimistic, a przy błędzie następuje rollback do poprzedniego stanu oraz
    komunikat toast z `getApiErrorMessage`.
  - Uwagi / follow-up: użytkownik anonimowy nie wykonuje requestu do API; hook
    pokazuje toast z akcją logowania. Testy hooka i komponentu pozostają w
    `FL3.4`; web app nie ma obecnie osobnego runnera testów React hooków.

- [x] `FL3.3` Dodać komponent `FavoriteListingButton`.
  - Wymagania:
    - wariant compact dla kart,
    - wariant full dla szczegółów oferty,
    - ikona serca z biblioteki używanej w projekcie,
    - `aria-pressed`,
    - stabilne wymiary, żeby karta nie przeskakiwała.
  - Data zakończenia: 2026-07-17
  - Wykonano: dodano
    `apps/web/src/components/listings/favorite-listing-button.tsx` i eksport w
    `components/listings/index.ts`. Komponent używa `useFavoriteListing`,
    istniejącego `Button`, `Tooltip` dla wariantu `compact` i ikony `Heart` z
    `lucide-react`. Obsługuje warianty `compact` oraz `default`, stabilne
    wymiary `44px`, `aria-pressed`, `aria-busy`, stan pending, aktywne
    wypełnienie serca i callback `onChanged`.
  - Uwagi / follow-up: komponent nie jest jeszcze podpięty do katalogu ani
    szczegółów oferty; integracja widoków zostaje w `FL-4`. Testy komponentu i
    hooka pozostają w `FL3.4`.

- [!] `FL3.4` Dodać testy komponentu i hooka.
  - Przypadki:
    - render stanu aktywnego i nieaktywnego,
    - kliknięcie dodaje do ulubionych,
    - kliknięcie usuwa z ulubionych,
    - błąd API cofa optimistic update,
    - użytkownik anonimowy nie wykonuje niedozwolonej akcji bez obsługi.
  - Data próby: 2026-07-18
  - Wykonano: sprawdzono, że `apps/web` nie ma obecnie runnera testów Reacta
    ani istniejących testów `.spec` / `.test`. Podjęto próbę dodania minimalnej
    infrastruktury testowej:
    `pnpm --filter web add -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom`.
  - Blokada: instalacja zależności nie powiodła się przez brak dostępu do
    `registry.npmjs.org` (`getaddrinfo ENOTFOUND registry.npmjs.org`). Nie
    oznaczamy zadania jako wykonane, bo `FL3.4` wymaga realnych testów hooka i
    komponentu, a nie samego `type-check`.
  - Uwagi / follow-up: po odzyskaniu dostępu do npm dodać zależności testowe,
    skonfigurować skrypt `test` dla weba i dopiero wtedy dodać testy dla
    `useFavoriteListing` oraz `FavoriteListingButton`.

### Sprint FL-4 - Wyszukiwarka ofert i szczegóły oferty

**Cel sprintu:**
Dodać ulubione do głównych miejsc, w których użytkownik odkrywa oferty.

**Rezultat sprintu:**
Użytkownik może dodać i usunąć ofertę z ulubionych z listy wyników oraz strony
szczegółów.

#### Zadania

- [x] `FL4.1` Dodać przycisk ulubienia do kart w wyszukiwarce ofert.
  - Zakres:
    - `PublicListingCatalog`,
    - karta wyniku/listy,
    - widok mapy, jeśli ma własny popup/kartę.
  - Wymagania:
    - przycisk nie zasłania kluczowych danych,
    - nie psuje układu mobile,
    - działa z paginacją i filtrami.
  - Data zakończenia: 2026-07-19
  - Wykonano: podpięto `FavoriteListingButton` do kart wyników w
    `PublicListingCatalog` oraz do kart w popupie mapy
    `PublicListingCatalogMap`. Katalog pobiera stan ulubionych jednym lekkim
    requestem `fetchFavoriteListingIds` dla unikalnych ofert z listy wyników
    oraz markerów mapy i przekazuje ten sam stan do listy oraz mapy. Callback
    `onFavoriteChanged` aktualizuje wspólny `Set` identyfikatorów, więc stan
    pozostaje spójny po dodaniu i usunięciu bez odświeżania katalogu.
  - Uwagi / follow-up: przycisk dla anonimowego użytkownika korzysta z
    zachowania z `FavoriteListingButton` / `useFavoriteListing` i nie wykonuje
    requestu do API. Pełny test wizualny desktop/mobile oraz stany focus/loading
    pozostają w `FL4.5`.

- [x] `FL4.2` Dodać przycisk ulubienia na stronie szczegółów oferty.
  - Zakres: `apps/web/src/app/(public)/oferty/[slug]/page.tsx`.
  - Wymagania:
    - widoczny w sekcji akcji,
    - nie konkuruje z głównym CTA kontaktowym,
    - stan zgodny z katalogiem.
  - Data zakończenia: 2026-07-19
  - Wykonano: dodano klientowy komponent
    `PublicListingFavoriteAction`, który używa istniejącego
    `FavoriteListingButton` i pobiera początkowy stan ulubienia lekkim
    requestem `fetchFavoriteListingIds([listingId])`. Komponent został
    podpięty w bocznym panelu akcji na stronie
    `apps/web/src/app/(public)/oferty/[slug]/page.tsx`, jako drugorzędna akcja
    przed CTA kontaktowymi, żeby nie konkurować z kontaktem do opiekuna oferty.
  - Uwagi / follow-up: przycisk korzysta z istniejącego promptu logowania z
    `useFavoriteListing`. Pełna obsługa powrotu po logowaniu przez ogólny
    parametr `returnTo` zostaje w `FL4.3`, bo obecny ekran logowania obsługuje
    dziś tylko specjalny flow `claimToken`.

- [x] `FL4.3` Dodać prompt logowania dla użytkownika anonimowego.
  - Wymagania:
    - krótki komunikat,
    - link do logowania z powrotem do aktualnej strony,
    - brak utraty filtrów wyszukiwarki.
  - Data zakończenia: 2026-07-19
  - Wykonano: rozszerzono flow auth o bezpieczny parametr `returnTo` dla
    zwykłego logowania i rejestracji, bez naruszania istniejącego flow
    `claimToken`. Dodano helpery `getSafeReturnToPath` i
    `buildAuthReturnToPath` w `apps/web/src/lib/auth.ts`, podpięto je w
    ekranach `/login` i `/register`, w akcji szczegółów oferty oraz w
    katalogu ofert. Katalog buduje `returnTo` z aktualnych filtrów
    (`/oferty?...`), więc kliknięcie serca przez anonimowego użytkownika nie
    gubi stanu wyszukiwarki.
  - Uwagi / follow-up: sam komunikat promptu pozostaje w
    `useFavoriteListing`, więc wszystkie miejsca używające
    `FavoriteListingButton` mają spójne zachowanie. `returnTo` akceptuje tylko
    bezpieczne ścieżki wewnętrzne zaczynające się od `/` i odrzuca URL-e
    zewnętrzne oraz `//...`.

- [x] `FL4.4` Dodać tracking eventów.
  - Eventy:
    - `favorite_listing_added`,
    - `favorite_listing_removed`,
    - `favorite_login_prompt_shown`,
    - `favorites_profile_opened`.
  - Data iteracji: 2026-07-20
  - Wykonano: dodano nazwy eventów `favorite_listing_added`,
    `favorite_listing_removed`, `favorite_login_prompt_shown` i
    `favorites_profile_opened` do frontendowego kontraktu analytics oraz
    backendowego DTO `CreateAnalyticsEventDto`. Hook `useFavoriteListing`
    wysyła `favorite_listing_added` i `favorite_listing_removed` po udanej
    zmianie stanu ulubienia oraz `favorite_login_prompt_shown` przy próbie
    kliknięcia przez użytkownika anonimowego. `FavoriteListingButton` przyjmuje
    opcjonalny kontekst analityczny (`listingSlug`, `analyticsSource`,
    `analyticsProperties`), a katalog, popup mapy i szczegóły oferty przekazują
    źródło interakcji oraz identyfikator/slug oferty.
  - Data zakończenia: 2026-07-20
  - Uwagi / follow-up: `favorite_login_prompt_shown` dla publicznych ofert jest
    wysyłany publicznym kanałem `trackPublicListingEvent`, aby działał bez
    sesji użytkownika. Event `favorites_profile_opened` został podpięty w
    komponencie listy profilu z kontekstem `dashboard_profile_favorites` po
    dodaniu trasy w `FL-5`.

- [-] `FL4.5` Sprawdzić UI na desktopie i mobile.
  - Zakres:
    - brak nakładania tekstu,
    - stabilny layout kart,
    - poprawne focus states,
    - czytelny stan loading.
  - Data iteracji: 2026-07-20
  - Wykonano: wykonano statyczny przegląd miejsc renderowania przycisku
    ulubienia w katalogu, popupie mapy i szczegółach oferty. Poprawiono
    stabilność pełnego wariantu `FavoriteListingButton` przez zwiększenie
    minimalnej szerokości i paddingu, żeby dłuższa etykieta
    `Usuń z ulubionych` nie była ściśnięta. Przesunięto kompaktowy przycisk w
    popupie mapy z rogu zamykania na obszar zdjęcia, aby nie nachodził na
    przycisk zamknięcia Leafleta ani przełącznik wielu ofert w tym samym
    punkcie.
  - Uwagi / follow-up: `Button` bazowy ma już `focus-visible` ring, więc nie
    dodawano lokalnych stylów focus. W tej iteracji wykonano `type-check` i
    `lint`; pełny screenshotowy test desktop/mobile zostaje jako follow-up,
    ponieważ projekt nie ma obecnie skonfigurowanego runnera wizualnego ani
    Playwright/Storybook dla web UI.

### Sprint FL-5 - Zakładka profilu: lista ulubionych

**Cel sprintu:**
Dostarczyć użytkownikowi miejsce, w którym może zarządzać zapisanymi ofertami.

**Rezultat sprintu:**
Nowa zakładka profilu z listą ulubionych, stanami pustymi i możliwością usuwania
ofert z listy.

#### Zadania

- [x] `FL5.1` Dodać trasę zakładki ulubionych.
  - Propozycja: `/dashboard/profile/favorites` albo uzgodniona trasa z decyzji
    `D2`.
  - Wymagania:
    - chroniona autoryzacją,
    - spójna z layoutem dashboardu,
    - linkowalna z nawigacji profilu.
  - Data zakończenia: 2026-07-20
  - Wykonano: dodano linkowalną stronę
    `apps/web/src/app/(dashboard)/dashboard/profile/favorites/page.tsx` dla
    trasy `/dashboard/profile/favorites`. Strona używa layoutu dashboardu,
    metadanych z nazwą aplikacji i renderuje dedykowany komponent listy
    ulubionych.
  - Uwagi / follow-up: trasa jest chroniona przez istniejący dashboard layout i
    middleware. Dla użytkowników prywatnych dodano wyjątek od redirectu do
    upgrade, bo ulubione są funkcją profilu, nie modułem CRM agenta.

- [x] `FL5.2` Dodać komponent listy `FavoriteListingsList`.
  - Wymagania:
    - korzysta z istniejącej karty oferty albo wspólnego komponentu prezentacji,
    - pokazuje datę dodania do ulubionych,
    - pozwala usunąć ofertę,
    - ma paginację lub infinite load, jeśli API ją zwraca.
  - Data zakończenia: 2026-07-20
  - Wykonano: dodano
    `apps/web/src/components/listings/favorite-listings-list.tsx` i eksport w
    `components/listings/index.ts`. Komponent pobiera dane przez istniejący
    klient `fetchFavoriteListings`, pokazuje loading/error, datę dodania,
    cenę, lokalizację, metraż, liczbę pokoi, link do szczegółów oraz paginację
    opartą o istniejący `ListingPagination`. Usunięcie aktywnej oferty korzysta
    z reużywalnego `FavoriteListingButton`, a stan listy jest aktualizowany bez
    odświeżania strony.
  - Uwagi / follow-up: po usunięciu ostatniej pozycji na dalszej stronie lista
    cofa paginację do poprzedniej strony zamiast pokazywać fałszywy empty
    state. Pełne testy komponentu wymagają dodania runnera testów Reacta,
    opisanego wcześniej przy `FL3.4`.
  - Aktualizacja 2026-07-20: utwardzono edge case po usunięciu ostatniej
    pozycji na dalszej stronie. Komponent pokazuje teraz stan aktualizacji
    zamiast chwilowego empty state, dopóki paginacja cofa użytkownika do
    poprzedniej strony. Dodano też komunikat `aria-live` dla loadingu,
    aktualizacji listy i liczby załadowanych ulubionych.

- [x] `FL5.3` Dodać empty state.
  - Treść:
    - krótka informacja, że użytkownik nie ma jeszcze ulubionych,
    - CTA do `/oferty`.
  - Wymagania:
    - bez marketingowego nadmiaru,
    - spójne z dashboardem.
  - Data zakończenia: 2026-07-20
  - Wykonano: dodano stan pusty z krótkim komunikatem i CTA do `/oferty`.
    Empty state jest prosty, dashboardowy i nie dodaje marketingowego bloku.
  - Uwagi / follow-up: CTA korzysta z istniejącego stylu `buttonVariants`, bez
    używania nieobsługiwanego `asChild` w lokalnym komponencie `Button`.

- [x] `FL5.4` Obsłużyć oferty niedostępne.
  - Wymagania:
    - informacja "Oferta nie jest już publicznie dostępna",
    - możliwość usunięcia z ulubionych,
    - brak linku do niedostępnych szczegółów.
  - Data zakończenia: 2026-07-20
  - Wykonano: dodano osobny stan karty dla `isAvailable: false` z komunikatem
    "Oferta nie jest już publicznie dostępna", datą dodania i przyciskiem
    usunięcia. Karta niedostępnej oferty nie linkuje do publicznych szczegółów.
  - Uwagi / follow-up: usuwanie niedostępnej oferty używa
    `removeFavoriteListing`, pokazuje lokalny spinner oraz toast sukcesu lub
    błędu.
  - Aktualizacja 2026-07-20: obsługę spinnera usuwania zabezpieczono blokiem
    `try/finally`, żeby przycisk zawsze wracał do stabilnego stanu po
    zakończeniu akcji.

- [x] `FL5.5` Dodać wejście do zakładki w profilu/nawigacji.
  - Zakres zależny od decyzji `D2`.
  - Data zakończenia: 2026-07-20
  - Wykonano: dodano pozycję `Ulubione` z ikoną serca do dolnej części
    `DashboardSidebar`, obok ustawień konta. Link prowadzi do
    `/dashboard/profile/favorites` i korzysta z istniejącej logiki aktywnego
    stanu nawigacji.
  - Uwagi / follow-up: nie dodawano pozycji do mobilnego dolnego paska, żeby
    nie wypychać najczęściej używanych modułów pracy; na mobile link jest
    dostępny przez otwierany sidebar.

### Sprint FL-6 - Testy E2E, performance i bezpieczeństwo

**Cel sprintu:**
Zweryfikować funkcję end-to-end i upewnić się, że nie pogarsza katalogu ofert.

**Rezultat sprintu:**
Funkcja jest gotowa do rolloutu za flagą lub bezpośrednio, jeśli release process
na to pozwala.

#### Zadania

- [-] `FL6.1` Dodać test E2E: dodanie z katalogu i widoczność w profilu.
  - Flow:
    - użytkownik loguje się,
    - wchodzi na `/oferty`,
    - dodaje ofertę do ulubionych,
    - przechodzi do zakładki `Ulubione`,
    - widzi dodaną ofertę.
  - Data iteracji: 2026-07-20
  - Wykonano: dodano test przepływu domenowego
    `favorite-listings.flow.spec.ts`, który używa pamięciowych repozytoriów i
    sprawdza sekwencję:
    - dodanie publicznej oferty do ulubionych przez `addFavorite`,
    - widoczność ID przez `findFavoriteListingIds`,
    - widoczność oferty w liście profilu przez `findUserFavorites` wraz z
      bezpiecznym publicznym kształtem `listing`.
  - Uwagi / follow-up: nie oznaczamy jako zakończone, bo to nie jest pełny E2E
    przeglądarkowy z logowaniem i przejściem z `/oferty` do
    `/dashboard/profile/favorites`. Do domknięcia potrzebny jest Playwright lub
    inny runner UI E2E.

- [-] `FL6.2` Dodać test E2E: usunięcie z ulubionych.
  - Flow:
    - użytkownik ma ulubioną ofertę,
    - usuwa ją z zakładki profilu,
    - oferta znika z listy,
    - katalog pokazuje stan nieaktywny.
  - Data iteracji: 2026-07-20
  - Wykonano: ten sam test przepływu domenowego sprawdza usunięcie przez
    `removeFavorite`, po którym:
    - `findFavoriteListingIds` zwraca pustą listę,
    - `findUserFavorites` zwraca pustą stronę profilu z `total: 0`.
  - Uwagi / follow-up: nie oznaczamy jako zakończone, bo nadal brakuje
    automatycznego testu UI potwierdzającego kliknięcie z poziomu zakładki
    profilu i odświeżenie stanu w katalogu.

- [-] `FL6.3` Sprawdzić brak N+1 queries.
  - Zakres:
    - katalog ofert,
    - lista ulubionych,
    - szczegóły oferty.
  - Kryterium:
    - stan ulubionych jest pobierany masowo, nie per karta.
  - Data iteracji: 2026-07-20
  - Wykonano:
    - backend: dodano test kontrolera potwierdzający, że lista profilu deleguje
      do jednego paginowanego wywołania serwisu,
    - backend: rozszerzono test lekkiego endpointu ID o gwarancję jednego
      bulk query po `listingIds` i brak dodatkowych zapytań do repo ofert,
    - backend: dodano test listy profilu, który pilnuje jednego query buildera
      z joinami do `listing`, `address`, `images`, `agent` i `agency`,
      paginacji przez `skip/take` oraz pojedynczego `getManyAndCount`,
    - frontend: przejrzano integrację katalogu i szczegółów oferty; katalog
      składa unikalne ID z wyników oraz markerów mapy i wywołuje
      `fetchFavoriteListingIds(catalogListingIds)` raz dla aktualnego payloadu,
      a szczegóły oferty sprawdzają tylko pojedyncze ID bieżącej oferty.
  - Uwagi / follow-up: automatyczny test przeglądarkowy dla liczby requestów w
    katalogu zostaje do `FL6.1`/`FL6.2` albo osobnej konfiguracji Playwright,
    bo web app nadal nie ma runnera E2E UI.

- [-] `FL6.4` Sprawdzić autoryzację i izolację danych.
  - Przypadki:
    - użytkownik A nie widzi ulubionych użytkownika B,
    - anonimowy użytkownik nie odczytuje listy ulubionych,
    - nie można dodać niepublicznej oferty.
  - Data iteracji: 2026-07-20
  - Wykonano: dodano regresyjne testy backendowe dla modułu ulubionych:
    - kontroler pilnuje, że wszystkie endpointy `favorite-listings`
      (`findAll`, `findIds`, `add`, `remove`) nie są oznaczone jako publiczne,
    - lista profilu używa filtra `favorite.userId = :userId`, więc bazuje na
      bieżącym użytkowniku,
    - lekkie sprawdzanie ID zwraca tylko `listingIds` znalezione dla bieżącego
      użytkownika,
    - dodanie ulubionej oferty wymaga pełnego zestawu warunków publiczności
      oferty: published, active, public slug, `publishedAt` i brak wygaśnięcia,
    - niedostępna oferta na liście profilu nie zwraca obiektu `listing`, tylko
      bezpieczny stan `isAvailable: false`.
  - Uwagi / follow-up: w tej iteracji użyto istniejącego runnera Jest dla API,
    ponieważ projekt nie ma obecnie skonfigurowanego Playwrighta ani innego
    runnera E2E UI. Pełna weryfikacja anonimowego requestu i izolacji przez
    realne HTTP powinna zostać domknięta po dodaniu infrastruktury E2E albo w
    osobnym teście integracyjnym Nest.
  - Aktualizacja 2026-07-21: rozszerzono
    `favorite-listings.flow.spec.ts` o przepływ dwóch użytkowników. Test
    dodaje różne oferty do ulubionych dla użytkownika A i B, potwierdza, że
    `findFavoriteListingIds` oraz `findUserFavorites` użytkownika A nie
    zwracają danych użytkownika B, a usunięcie ulubionej oferty użytkownika A
    nie narusza listy użytkownika B.

- [-] `FL6.5` Przejść checklistę UI.
  - Zakres:
    - desktop,
    - mobile,
    - loading,
    - error,
    - empty state,
    - focus i keyboard navigation.
  - Data iteracji: 2026-07-20
  - Wykonano: wykonano statyczny przegląd zakładki
    `/dashboard/profile/favorites` i komponentu `FavoriteListingsList`:
    - loading i korekta pustej strony mają `role="status"` oraz `aria-live`,
    - error state ma `role="alert"` i akcję ponowienia requestu,
    - lista ma `aria-label`, `aria-busy` i ukryty komunikat statusu dla
      technologii asystujących,
    - empty state ma krótką treść oraz CTA do `/oferty`,
    - akcje usuwania są pełnej szerokości na mobile i wracają do kompaktowej
      szerokości na większych ekranach,
    - przycisk usuwania niedostępnej oferty ma jednoznaczny `aria-label`,
    - `FavoriteListingButton` utrzymuje `aria-pressed`, `aria-busy`, stabilne
      wymiary i focus ring z bazowego komponentu `Button`.
  - Uwagi / follow-up: nie oznaczamy checklisty jako zakończonej, bo projekt
    nadal nie ma screenshotów/Playwrighta do realnego potwierdzenia desktop,
    mobile i keyboard navigation w przeglądarce. W tej iteracji wykonano
    walidację statyczną i poprawki dostępności/layoutu.

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
