# Address geocoding exact map point plan

Data: 2026-06-17

Cel: dodać bezpieczne i kontrolowane geokodowanie adresu oferty, aby po
wpisaniu miasta, dzielnicy i ulicy agent mógł jednym kliknięciem ustawić
dokładne współrzędne publicznego punktu mapy.

Dokument dotyczy formularza tworzenia/edycji oferty, backendowego modułu
lokalizacji oraz publicznej mapy ofert.

## Obecny problem

Mapa publiczna potrafi rozróżnić:

- `exact` - dokładny punkt,
- `district` - punkt dzielnicy/części miasta,
- `city` - centroid miasta,
- `region` - fallback regionalny.

Brakuje jednak wygodnego sposobu, aby agent uzyskał dokładne `lat/lng` na
podstawie adresu. Obecnie może wpisać współrzędne ręcznie, co jest mało
ergonomiczne i podatne na błędy.

Nie powinniśmy uznawać samego wyboru miasta albo dzielnicy za dokładny punkt,
bo są to centroidy i backend celowo traktuje je jako lokalizację przybliżoną.

## Decyzja produktowa

Dokładne współrzędne ustawiamy tylko po świadomej akcji użytkownika.

Docelowy flow:

1. Agent uzupełnia `miasto`, `dzielnicę` i `ulicę` w formularzu oferty.
2. Agent zaznacza `Pokazuj dokładną lokalizację na publicznej mapie`.
3. UI pokazuje przycisk `Ustaw punkt z adresu`.
4. Backend geokoduje adres przez skonfigurowanego providera.
5. UI pokazuje znaleziony wynik i uzupełnia `address.lat` oraz `address.lng`.
6. Agent zapisuje ofertę.

Nie uruchamiamy geokodowania automatycznie po każdym wpisaniu znaku. To ma być
jawna akcja, ponieważ geokodowanie może kosztować, ma limity i może zwrócić
wynik wymagający oceny użytkownika.

## Provider geokodowania

Provider powinien być wymienialny za adapterem.

Kandydaci:

- Google Geocoding API - dobra jakość, płatne, wymaga klucza i billing account,
- Mapbox Geocoding API - dobra integracja z mapami, płatne limity,
- Geoapify Geocoding API - prostszy model kosztowy, dobre dla MVP,
- własny Nominatim - możliwy, ale wymaga hostingu i utrzymania,
- publiczny Nominatim OSM - niezalecany produkcyjnie dla SaaS; ma restrykcyjne
  limity, wymaga identyfikacji aplikacji, cache i nie pozwala na autocomplete.

Rekomendacja MVP:

- zbudować interfejs `GeocodingProvider`,
- zacząć od jednego providera konfigurowanego przez ENV,
- nie wiązać domeny aplikacji bezpośrednio z konkretnym vendor API.

## Proponowane ENV

```env
GEOCODING_PROVIDER=google
GEOCODING_API_KEY=...
GEOCODING_COUNTRY_BIAS=PL
GEOCODING_REQUEST_TIMEOUT_MS=3500
GEOCODING_CACHE_TTL_DAYS=180
```

Jeśli `GEOCODING_PROVIDER` albo `GEOCODING_API_KEY` nie są ustawione, endpoint
powinien zwracać kontrolowany błąd `503` z komunikatem, że geokodowanie nie
jest skonfigurowane.

## Backend

### Endpoint

Proponowany endpoint:

```http
POST /api/locations/geocode-address
```

Payload:

```ts
interface GeocodeAddressRequest {
  city: string;
  street: string;
  district?: string | null;
  postalCode?: string | null;
  voivodeship?: string | null;
  country?: 'PL';
}
```

Response:

```ts
interface GeocodeAddressResponse {
  query: string;
  result: {
    lat: number;
    lng: number;
    formattedAddress: string;
    precision: 'rooftop' | 'parcel' | 'street' | 'interpolated' | 'approximate';
    confidence: number;
    provider: string;
  } | null;
  warning?: string;
}
```

### Walidacja

- `city` wymagane,
- `street` wymagane do dokładnego geokodowania,
- maksymalna długość pól zgodna z DTO adresu,
- kraj domyślnie `PL`,
- normalizacja whitespace,
- nie przyjmować dowolnych URL-i ani parametrów providera od klienta.

### Bezpieczeństwo

- klucz providera tylko po stronie backendu,
- endpoint wymaga autoryzacji użytkownika,
- rate limit per użytkownik i per organizacja,
- request timeout,
- brak logowania pełnego adresu w logach technicznych,
- cache po zhashowanym/znormalizowanym adresie,
- nie zapisywać wyniku do oferty bez akcji `Zapisz`.

### Cache

Nowa tabela albo cache aplikacyjny:

```sql
geocoding_cache
- id uuid
- provider varchar
- normalized_query_hash varchar unique
- normalized_query text nullable
- lat numeric
- lng numeric
- formatted_address text
- precision varchar
- confidence numeric
- raw_response jsonb nullable
- created_at timestamptz
- expires_at timestamptz
```

W MVP `raw_response` może być pominięte albo przechowywane tylko w development.
Dla prywatności lepiej nie zapisywać pełnego adresu w jawnej postaci, jeśli nie
jest potrzebny do debugowania.

## Frontend

### Formularz oferty

W sekcji adresu:

- checkbox `Pokazuj dokładną lokalizację na publicznej mapie`,
- po zaznaczeniu:
  - pokazujemy przycisk `Ustaw punkt z adresu`,
  - pokazujemy pola `lat/lng` jako edytowalne,
  - pokazujemy status geokodowania.

Przycisk aktywny tylko gdy:

- `city` nie jest puste,
- `street` nie jest puste,
- opcjonalnie `district` albo `postalCode` wzmacniają jakość zapytania.

### Stany UI

- `idle` - brak geokodowania,
- `loading` - wysyłamy zapytanie,
- `success` - punkt ustawiony,
- `low_confidence` - wynik istnieje, ale wymaga ręcznej weryfikacji,
- `not_found` - provider nie znalazł adresu,
- `not_configured` - backend nie ma providera,
- `rate_limited` - przekroczono limit.

### Copy UX

Przykładowe teksty:

- `Ustaw punkt z adresu`
- `Znaleziono punkt: {formattedAddress}`
- `Sprawdź wynik. Provider zwrócił przybliżenie ulicy, nie punkt budynku.`
- `Nie znaleziono dokładnego adresu. Możesz wpisać współrzędne ręcznie albo użyć lokalizacji przybliżonej.`

## Logika mapy

Nie zmieniamy kontraktu publicznej mapy.

Backend już wybiera:

1. `exact`, jeśli `showExactAddressOnPublicPage=true` i `address.lat/lng` są
   poprawne oraz nie wyglądają jak centroid miasta,
2. `district`,
3. `city`,
4. `region`.

Geokodowanie ma tylko ułatwić ustawienie poprawnych `address.lat/lng`.

## Sprint 1: Backend geocoding foundation

Status: wykonane w iteracji 2026-06-17

Zakres:

- [x] dodać DTO `GeocodeAddressDto`,
- [x] dodać endpoint `POST /api/locations/geocode-address`,
- [x] dodać interfejs `GeocodingProvider`,
- [x] dodać implementację jednego providera za ENV,
- [x] dodać timeout i obsługę błędów providera,
- [x] dodać rate limit lub minimum ochronę per user,
- [x] dodać cache wyników,
- [x] dodać testy jednostkowe normalizacji adresu i mapowania odpowiedzi.

Kryteria akceptacji:

- [x] endpoint nie działa bez autoryzacji,
- [x] brak klucza API nie powoduje crasha aplikacji,
- [x] zapytanie `street + district + city + PL` zwraca `lat/lng` albo czytelny
  błąd,
- [x] odpowiedź nie ujawnia klucza ani surowych danych providera,
- [x] powtórne zapytanie dla tego samego adresu korzysta z cache.

Wykonano:

- Dodano DTO `GeocodeAddressDto` dla walidacji wejścia endpointu.
- Dodano encję `GeocodingCache` oraz migrację
  `apps/api/migrations/20260617_geocoding_cache.sql`.
- Dodano helpery normalizujące adres, budujące zapytanie geokodera i hash cache
  w `geocoding-normalization.ts`.
- Dodano interfejs `GeocodingProvider` i typy odpowiedzi w `geocoding.types.ts`.
- Dodano `GoogleGeocodingProvider`, który mapuje odpowiedzi Google do wspólnego
  formatu `lat/lng + precision + confidence`.
- Dodano `GeocodingService`, który:
  - wymaga konfiguracji `GEOCODING_PROVIDER` i `GEOCODING_API_KEY`,
  - zwraca kontrolowany błąd `503`, jeśli geokodowanie nie jest skonfigurowane,
  - używa timeoutu z `GEOCODING_REQUEST_TIMEOUT_MS`,
  - czyta i zapisuje cache po znormalizowanym hashu zapytania,
  - nie zapisuje wyniku do oferty.
- Dodano endpoint `POST /api/locations/geocode-address` w `LocationsController`.
  Endpoint nie ma dekoratora `@Public()`, więc korzysta z globalnego JWT guarda.
- Dodano throttling endpointu: 10 requestów na minutę.
- Dodano testy:
  - `geocoding-normalization.spec.ts`,
  - `google-geocoding.provider.spec.ts`.

Weryfikacja:

- [x] `pnpm --filter api type-check`,
- [x] `pnpm --filter api test -- geocoding-normalization.spec.ts google-geocoding.provider.spec.ts --runInBand`.

Nie wykonano w tej iteracji:

- Nie dodano jeszcze frontendowego przycisku `Ustaw punkt z adresu`; to jest
  zakres Sprintu 2.
- Nie dodano jeszcze eventów analitycznych ani monitoringu kosztów providera;
  to jest zakres Sprintu 3.
- Nie uruchomiono realnego requestu do Google, bo wymaga skonfigurowanego
  `GEOCODING_API_KEY`.

## Sprint 2: Frontend integration

Status: wykonane w iteracji 2026-06-17

Zakres:

- [x] dodać funkcję klienta API `geocodeListingAddress`,
- [x] dodać przycisk `Ustaw punkt z adresu` w `ListingForm`,
- [x] dodać statusy loading/success/error,
- [x] uzupełniać `address.lat/lng` po sukcesie,
- [x] nie odpalać geokodowania automatycznie,
- [x] zachować możliwość ręcznej edycji współrzędnych,
- [x] ukrywać akcję, jeśli dokładna lokalizacja jest wyłączona.

Kryteria akceptacji:

- [x] agent może ustawić punkt bez ręcznego kopiowania współrzędnych,
- [x] agent może poprawić `lat/lng` ręcznie,
- [x] brak ulicy blokuje przycisk albo pokazuje jasny komunikat,
- [x] błąd geokodera nie blokuje zapisu oferty z lokalizacją przybliżoną.

Wykonano:

- Dodano klienta API `geocodeListingAddress` w `apps/web/src/lib/locations.ts`.
- W `ListingForm` dodano przycisk `Ustaw punkt z adresu`, widoczny tylko po
  włączeniu opcji `Pokazuj dokładną lokalizację na publicznej mapie`.
- Geokodowanie jest uruchamiane wyłącznie po kliknięciu użytkownika.
- Formularz odczytuje bieżące wartości `street`, `postalCode`, `city`,
  `district` i `voivodeship`, wysyła je do backendu i po sukcesie uzupełnia
  `address.lat` oraz `address.lng`.
- Dodano statusy UI:
  - loading,
  - success,
  - warning dla wyniku wymagającego weryfikacji,
  - error dla braku wyniku albo błędu API.
- Pola `lat/lng` pozostają edytowalne po geokodowaniu.
- Błąd geokodera pokazuje komunikat, ale nie blokuje ręcznego zapisu oferty.

Weryfikacja:

- [x] `pnpm --filter web type-check`,
- [x] `pnpm --filter api type-check`.

Nie wykonano w tej iteracji:

- Nie dodano testów E2E ani testów integracyjnych UI, bo wymagają mockowania
  requestu geokodowania albo skonfigurowanego providera.
- Nie wykonano screenshotów zgodnie z ustaleniem.

## Sprint 3: Quality, monitoring and privacy

Zakres:

- [ ] dodać event analityczny `listing_address_geocoding_requested`,
- [ ] dodać event `listing_address_geocoding_succeeded`,
- [ ] dodać event `listing_address_geocoding_failed`,
- [ ] monitorować liczbę requestów i błędów providera,
- [ ] dodać dokumentację ENV do `LOCAL_SETUP.md`,
- [ ] dodać testy integracyjne endpointu z mock providerem,
- [ ] sprawdzić, czy pełne adresy nie trafiają do logów produkcyjnych.

Kryteria akceptacji:

- można ocenić koszt i skuteczność geokodowania,
- awaria providera nie psuje tworzenia/edycji oferty,
- dokładne adresy nie są logowane przypadkowo,
- limity providera są respektowane.

## Edge cases

- ulica bez numeru może zwrócić punkt ulicy, nie budynku,
- provider może zwrócić inną miejscowość o podobnej nazwie,
- dzielnica może pogorszyć wynik, jeśli provider jej nie rozumie,
- adres może być nowy i nieobecny w danych providera,
- wynik `street` albo `approximate` powinien wymagać ostrzeżenia,
- jeśli `showExactAddressOnPublicPage=false`, publiczna mapa ma ignorować
  dokładne `lat/lng` i używać dzielnicy/miasta.

## Nie robimy w MVP

- pełnego autocomplete ulic,
- wyboru punktu przez przeciąganie markera na mapie,
- reverse geocodingu z kliknięcia na mapie,
- automatycznego geokodowania przy każdym zapisie oferty,
- masowego geokodowania istniejących ofert bez osobnej decyzji i limitów.

## Otwarte decyzje

- który provider wybieramy na MVP,
- czy przechowujemy pełny `formattedAddress`,
- czy wynik o precyzji `street/interpolated` automatycznie uzupełnia `lat/lng`,
  czy wymaga dodatkowego potwierdzenia,
- czy w przyszłości dodajemy map picker jako alternatywę dla geokodera.
