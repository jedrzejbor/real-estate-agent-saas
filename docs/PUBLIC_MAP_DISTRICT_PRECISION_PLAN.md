# Public map district precision plan

Data: 2026-06-17

Cel: rozbudować publiczną mapę ofert tak, aby lokalizacja ofert nie opierała
się wyłącznie o centroid miasta/miejscowości, ale mogła korzystać także z
dzielnic, osiedli i innych lokalnych obszarów. Dzięki temu wiele ofert z tego
samego miasta nie będzie sztucznie zgrupowane w jednym punkcie, a użytkownik
zobaczy bardziej użyteczny rozkład ofert przy zachowaniu prywatności adresu.

Dokument dotyczy publicznego katalogu `/oferty`, mapy ofert i danych
lokalizacyjnych używanych przez formularze ofert.

## Założenie produktowe

Mapa publiczna powinna pokazywać możliwie precyzyjną, ale bezpieczną
lokalizację oferty:

- jeśli agent pozwala pokazać dokładny adres i mamy współrzędne, pokazujemy
  punkt dokładny,
- jeśli dokładny adres jest ukryty, ale znamy dzielnicę/osiedle, pokazujemy
  centroid tej dzielnicy/osiedla,
- jeśli nie znamy dzielnicy, pokazujemy centroid miasta/miejscowości,
- jeśli nie znamy miasta albo nie mamy punktu miasta, używamy regionu jako
  fallbacku.

Nie chcemy rozwiązywać problemu przez losowe przesuwanie markerów. Marker ma
mieć sens geograficzny i nie powinien sugerować fałszywego dokładnego adresu.

## Obecny problem

Aktualnie publiczna mapa w wielu przypadkach opiera się o centroid miasta.
Przykład: kilka ofert z Bydgoszczy może dostać ten sam punkt mapy, jeśli nie
mają publicznie dokładnych współrzędnych. Wtedy:

- użytkownik widzi jeden marker zamiast realnego rozkładu ofert,
- popup musi grupować wiele ofert w jednym punkcie,
- mapa jest mniej użyteczna przy dużych miastach,
- dzielnice wpisywane w formularzu nie wpływają wystarczająco na publiczną mapę.

Grupowanie wielu ofert w jednym markerze zostaje przydatnym fallbackiem, ale
nie powinno być głównym sposobem obsługi ofert z dużych miast.

## Decyzja MVP

Dodajemy obsługę centroidów dzielnic/osiedli jako dodatkowego poziomu
precyzji publicznej mapy.

W MVP nie budujemy jeszcze pełnego ogólnopolskiego geokodera. Zaczynamy od
kontrolowanego katalogu dzielnic dla największych miast i miejsc, w których
realnie testujemy produkt.

Kolejność wyboru punktu publicznego:

1. `exact` - dokładne `lat/lng`, tylko jeśli agent pozwolił pokazać dokładny
   adres publicznie.
2. `district` - centroid dzielnicy/osiedla na podstawie `city + district`.
3. `city` - centroid miasta/miejscowości.
4. `region` - centroid województwa/regionu jako fallback.

Publiczny UI nadal może komunikować `Lokalizacja przybliżona`, ale backend
powinien przechowywać źródło punktu, żeby frontend mógł wyświetlić lepszy
kontekst, np. `Lokalizacja przybliżona: Fordon, Bydgoszcz`.

## Proponowane typy

### Publiczny punkt mapy

Docelowo typ punktu powinien rozróżniać precyzję i źródło:

```ts
interface PublicListingMapPoint {
  lat: number;
  lng: number;
  precision: 'exact' | 'approximate';
  source: 'exact' | 'district' | 'city' | 'region';
  label?: string | null;
}
```

Przykłady:

- dokładny adres:
  - `precision: 'exact'`
  - `source: 'exact'`
  - `label: 'Dokładna lokalizacja'`
- dzielnica:
  - `precision: 'approximate'`
  - `source: 'district'`
  - `label: 'Fordon, Bydgoszcz'`
- miasto:
  - `precision: 'approximate'`
  - `source: 'city'`
  - `label: 'Bydgoszcz'`
- region:
  - `precision: 'approximate'`
  - `source: 'region'`
  - `label: 'Kujawsko-Pomorskie'`

## Dane lokalizacyjne

### MVP: stały katalog centroidów

Na start możemy dodać plik backendowy, np.:

```txt
apps/api/src/locations/public-district-centroids.ts
```

Struktura:

```ts
export const PUBLIC_DISTRICT_CENTROIDS: Record<string, PublicLocationPoint> = {
  'bydgoszcz|fordon': { lat: 53.148, lng: 18.170 },
  'bydgoszcz|srodmiescie': { lat: 53.123, lng: 18.002 },
};
```

Klucz powinien używać tej samej normalizacji co reszta wyszukiwania lokalizacji:

- lowercase,
- bez polskich znaków,
- trim,
- normalizacja `ł -> l`,
- bez prefiksów typu `dzielnica`, jeśli występują.

### Docelowo: tabela `locations`

Docelowo lepiej zasilać te dane w tabeli `locations`:

- `kind: 'district'` albo `kind: 'neighborhood'`,
- `name`,
- `normalizedName`,
- `parentName`,
- `parentNormalizedName`,
- `voivodeship`,
- `lat`,
- `lng`,
- `active`,
- `source`.

To pozwoli używać jednego katalogu dla:

- autocomplete miasta,
- autocomplete dzielnic,
- publicznej mapy,
- przyszłych filtrów lokalizacyjnych.

## Sprint 1: Backend punktu dzielnicowego

Status: wykonane w iteracji 2026-06-17

Zakres:

- [x] dodać katalog `PUBLIC_DISTRICT_CENTROIDS`,
- [x] dodać helper budujący klucz `city + district`,
- [x] rozszerzyć `PublicListingMapPoint` o `source` i `label`,
- [x] zmienić wybór punktu publicznego:
  - exact,
  - district,
  - city,
  - region,
- [x] zachować obecne zachowanie jako fallback, jeśli dzielnica nie jest
  rozpoznana.

Kryteria akceptacji:

- [x] oferta z `city=Bydgoszcz` i `district=Fordon` trafia w punkt Fordonu,
- [x] oferta z `city=Bydgoszcz` bez dzielnicy trafia w punkt Bydgoszczy,
- [x] dokładny adres działa tylko przy `showExactAddressOnPublicPage=true`,
- [x] API katalogu publicznego zwraca `mapPoint.source`,
- [x] istniejące mapy nie psują się dla ofert bez dzielnicy.

Weryfikacja:

- [x] `pnpm --filter api type-check`,
- [x] test jednostkowy helpera wyboru punktu:
  `pnpm --filter api test -- public-listing-map-point.spec.ts --runInBand`,
- [x] test regresji prywatności odpowiedzi publicznych:
  `pnpm --filter api test -- listing-public-privacy.spec.ts --runInBand`,
- ręczny test na kilku ofertach w Bydgoszczy.

Wykonano:

- Dodano `apps/api/src/listings/public-listing-map-point.ts` z katalogiem
  `PUBLIC_DISTRICT_CENTROIDS`, normalizacją klucza `city|district`, walidacją
  współrzędnych i selektorem punktu `exact -> district -> city -> region`.
- Rozszerzono `PublicListingMapPoint` o `source` oraz `label`, dzięki czemu
  publiczny katalog może odróżnić dokładny adres, dzielnicę, miasto i region.
- Podłączono selektor w `ListingsService`; dynamiczne centroidy z tabeli
  `locations` nadal działają jako fallback miasta, a statyczne centroidy
  regionów pozostają ostatnim fallbackiem.
- Dodano testy jednostkowe dla normalizacji klucza, punktu Fordonu, fallbacku
  Bydgoszczy oraz blokady dokładnego adresu bez zgody publicznej.

## Sprint 2: Frontend mapy i popupów

Status: wykonane w iteracji 2026-06-17

Zakres:

- [x] zaktualizować typy web w `apps/web/src/lib/listings.ts`,
- [x] pokazać lepszy opis lokalizacji w popupie mapy:
  - `Dokładna lokalizacja`,
  - `Lokalizacja przybliżona: Fordon, Bydgoszcz`,
  - `Lokalizacja przybliżona: Bydgoszcz`,
- [x] opcjonalnie rozróżnić marker `district` i `city` subtelnym tooltipem albo
  opisem w popupie,
- [x] zostawić grupowanie markerów jako fallback dla identycznych punktów,
- [ ] sprawdzić zachowanie popupu z wieloma ofertami w jednym punkcie.

Kryteria akceptacji:

- [x] użytkownik widzi w popupie, czy lokalizacja jest dokładna czy przybliżona,
- [x] przybliżenie na poziomie dzielnicy pokazuje nazwę dzielnicy,
- [x] kilka ofert w różnych dzielnicach tego samego miasta nie ląduje w jednym
  markerze,
- [x] kilka ofert w tej samej dzielnicy nadal grupuje się w jeden marker z
  przełącznikiem.

Weryfikacja:

- [x] `pnpm --filter web type-check`,
- [ ] ręczny test `/oferty` z mapą i popupami,
- [ ] test responsywności popupu na mobile.

Wykonano:

- Rozszerzono typ `PublicListingMapPoint` w web o `source` i `label`.
  Pola są opcjonalne po stronie frontendu, żeby katalog bezpiecznie działał
  także ze starszą odpowiedzią API w czasie rolloutów.
- Popup mapy pokazuje teraz pełniejszy opis precyzji:
  `Dokładna lokalizacja` albo `Lokalizacja przybliżona: {label}`.
  Jeśli `mapPoint.label` nie istnieje, frontend używa bezpiecznego fallbacku
  z `district + city`.
- Tooltip/title pojedynczego markera zawiera opis precyzji lokalizacji.
- Grupowanie po identycznych współrzędnych pozostało bez zmian, więc oferty
  w tej samej dzielnicy nadal trafiają do jednego popupu z przełącznikiem,
  a różne dzielnice rozdzielają się przez różne centroidy z backendu.

## Sprint 3: Formularze i jakość danych

Status: wykonane w iteracji 2026-06-17

Zakres:

- [x] ustandaryzować pole `Dzielnica` w formularzu dashboardowym i publicznym,
- [x] dodać podpowiedzi dzielnic po wybraniu miasta,
- [x] nadal pozwolić wpisać dzielnicę ręcznie, jeśli nie ma jej w katalogu,
- [x] dodać aliasy dzielnic/osiedli:
  - `centrum` -> `srodmiescie`, jeśli właściwe dla miasta,
  - warianty z polskimi znakami,
  - warianty lokalne,
- [x] dopisać walidację miękką: jeśli miasto ma znane dzielnice, sugerujemy
  wybór z listy, ale nie blokujemy zapisu.

Kryteria akceptacji:

- [x] agent wpisujący ofertę w dashboardzie dostaje sugestie dzielnic,
- [x] publiczny formularz dodawania oferty korzysta z tego samego źródła
  sugestii,
- [x] zapis oferty nie jest blokowany przez brak rozpoznanej dzielnicy,
- [x] ręcznie wpisana dzielnica może później zostać obsłużona przez katalog.

Weryfikacja:

- [x] `pnpm --filter web type-check`,
- [ ] ręczny test formularza dashboardowego,
- [ ] ręczny test publicznego formularza `/dodaj-oferte`.

Wykonano:

- Dodano wspólne źródło sugestii dzielnic w
  `apps/web/src/lib/public-districts.ts`. Na start obejmuje katalog MVP dla
  Bydgoszczy spójny z obecnym katalogiem centroidów mapy: `Fordon` i
  `Śródmieście`.
- Dodano aliasy dla `Śródmieścia`, w tym `centrum`, `srodmiescie` i wariant z
  polskimi znakami. Znany alias po opuszczeniu pola normalizuje się do
  kanonicznej nazwy `Śródmieście`.
- Dodano reużywalny komponent
  `apps/web/src/components/locations/district-autocomplete.tsx`.
  Komponent pokazuje sugestie po wybraniu miasta, ale pozostawia pole
  zwykłym kontrolowanym tekstem, więc zapis ręcznej dzielnicy spoza katalogu
  nie jest blokowany.
- Podmieniono pole `Dzielnica` w formularzu dashboardowym oraz publicznym
  wizardzie `/dodaj-oferte`, aby oba korzystały z tego samego katalogu i tej
  samej miękkiej walidacji.

## Sprint 4: Migracja do tabeli lokalizacji

Status: częściowo wykonane w iteracji 2026-06-17

Zakres:

- [x] rozszerzyć model `Location` o typy dzielnic/osiedli, jeśli obecny model
  nie wystarcza,
- [x] przygotować import dzielnic dla największych miast,
- [x] używać `locations` jako źródła dla publicznych centroidów,
- [x] zachować stały katalog jako fallback albo seed startowy,
- [ ] dodać panel/adminowy sposób korekty centroidu, jeśli będzie potrzebny.

Kryteria akceptacji:

- [x] backend nie wymaga ręcznej stałej dla nowych dzielnic,
- [x] autocomplete i mapa korzystają z tego samego katalogu,
- [x] można rozbudować miasta bez zmian w kodzie aplikacji.

Weryfikacja:

- [x] `pnpm --filter api type-check`,
- [x] `pnpm --filter api test -- public-listing-map-point.spec.ts --runInBand`,
- [x] `pnpm --filter web type-check`,
- [x] lokalne wykonanie migracji
  `apps/api/migrations/20260617_location_district_support.sql`,
- [x] ręczny test `/api/locations/districts?city=Bydgoszcz`,
- [ ] ręczny test formularzy z sugestiami po API,
- [ ] ręczny test mapy ofert po migracji seedów do bazy.

Wykonano:

- Rozszerzono encję `Location` o `parentNormalizedName` i `aliases`, dodano
  indeks pod lookup dzielnic oraz migrację
  `apps/api/migrations/20260617_location_district_support.sql`.
- Migracja dodaje seed startowy dla `Bydgoszcz -> Fordon` i
  `Bydgoszcz -> Śródmieście`, z aliasami dla `Śródmieścia`.
- Rozszerzono importer lokalizacji o aliasy, `parentNormalizedName` oraz typy
  `district` i `neighborhood`, dzięki czemu kolejne miasta można zasilać z
  pliku CSV/JSON bez zmian w kodzie.
- Dodano publiczny endpoint
  `GET /api/locations/districts?city=...&query=...`, który najpierw czyta z
  tabeli `locations`, a jeśli baza nie ma jeszcze danych, używa katalogu
  seed/fallback.
- Publiczna mapa ofert próbuje teraz pobrać centroid dzielnicy z tabeli
  `locations` przed użyciem stałego fallbacku. Dopasowanie obsługuje
  `normalizedName`, aliasy i `searchText`.
- Frontendowy `DistrictAutocomplete` korzysta z endpointu dzielnic, a lokalny
  katalog z poprzedniego sprintu zostaje jako fallback awaryjny.
- Migracja została wykonana lokalnie na bazie `real_estate_saas` w kontenerze
  `real-estate-db`; endpoint zwrócił `Fordon` i `Śródmieście` dla Bydgoszczy.

Nie wykonano w tej iteracji:

- Panel/adminowa korekta centroidów. To osobny workflow administracyjny i nie
  jest potrzebny do uruchomienia importowalnego katalogu dzielnic.

## Sprint 5: Testy, monitoring i UX edge cases

Status: przyszłe rozszerzenie

Zakres:

- [ ] dodać testy dla wyboru punktu publicznego,
- [ ] dodać testy regresji dla prywatności dokładnego adresu,
- [ ] dodać metrykę liczby ofert z fallbackiem do miasta/regionu,
- [ ] przygotować raport brakujących/nieznanych dzielnic,
- [ ] dopracować komunikaty w UI dla ofert bez mapowego punktu.

Kryteria akceptacji:

- [ ] mamy informację, ile ofert używa `district`, `city`, `region`,
- [ ] łatwo wykryć miasta, w których warto dodać nowe dzielnice,
- [ ] testy zabezpieczają brak wycieku dokładnego adresu.

## Ryzyka i decyzje

### Prywatność

Nie wolno używać ulicy ani dokładnych współrzędnych jako publicznego punktu,
jeśli `showExactAddressOnPublicPage` jest wyłączone.

### Fałszywa precyzja

Centroid dzielnicy nie może być komunikowany jako dokładna lokalizacja.
Frontend powinien jasno mówić `Lokalizacja przybliżona`.

### Jakość danych dzielnic

Nazwy dzielnic bywają nieformalne. Potrzebujemy aliasów i normalizacji, ale
nie powinniśmy blokować użytkownika, jeśli wpisze dzielnicę spoza katalogu.

### Dublowanie źródeł danych

Stały katalog centroidów jest dobry na MVP, ale docelowo lepszy będzie jeden
model `locations`, aby formularze, autocomplete i mapa nie rozjechały się w
czasie.

## Minimalny zakres pierwszej implementacji

Najmniejszy sensowny pierwszy krok:

- dodać centroidy dzielnic dla Bydgoszczy,
- rozszerzyć `PublicListingMapPoint` o `source` i `label`,
- zmienić backendowy wybór punktu na `district -> city -> region`,
- pokazać `label` w popupie mapy,
- zostawić obecne grupowanie markerów jako fallback.

Ten zakres powinien dać natychmiastowy efekt na problemie kilku ofert w jednym
mieście bez konieczności przebudowy formularzy.
