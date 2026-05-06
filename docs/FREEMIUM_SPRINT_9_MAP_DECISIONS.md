# Freemium Sprint 9 - decyzje techniczne i prywatnościowe dla mapy

Data przygotowania: 2026-05-05

## Decyzja

`F9.1` jest domknięte jako kontrakt decyzyjny dla publicznej mapy ofert i wyszukiwania po obszarze.

Mapa ma bazować na publicznym kontrakcie katalogu ze Sprintu 8, ale nie może bezpośrednio ujawniać ani pośrednio wyciekać dokładnych współrzędnych ofert, dla których agent wyłączył pokazywanie dokładnego adresu.

## Biblioteka mapy

MVP używa `Leaflet` w aplikacji web.

Uzasadnienie:

- pasuje do obecnego Next.js UI jako lekka biblioteka map 2D,
- wystarcza do markerów, klastrów, popupów, prostokątnego zaznaczania obszaru i synchronizacji z listą,
- nie wymaga od razu stylowania wektorowego, konta Mapbox ani WebGL,
- łatwo ją ładować po stronie klienta przez dynamic import, bez ryzyka SSR dla strony `/oferty`.

`MapLibre GL JS` zostaje świadomie poza MVP Sprintu 9. Wracamy do niego, jeśli potrzebne będą wektorowe style, bardzo duża liczba punktów, płynne klastry po stronie warstw albo własny tile stack.

## Kafelki mapy

Źródło kafelków ma być konfigurowalne przez zmienne środowiskowe web:

- `NEXT_PUBLIC_MAP_TILE_URL`,
- `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION`,
- opcjonalnie `NEXT_PUBLIC_MAP_PROVIDER_NAME`.

Domyślne ustawienie developerskie może używać standardowych kafelków OpenStreetMap, ale publiczny rollout powinien mieć skonfigurowanego dostawcę OSM-derived z jasnymi limitami, SLA albo przynajmniej planem komercyjnym/fair-use.

Minimalne wymagania dla każdego dostawcy:

- widoczna atrybucja na mapie,
- brak prefetchu dużych obszarów i brak funkcji offline,
- respektowanie cache przeglądarki,
- brak proxy, które usuwa `Referer` albo identyfikację aplikacji,
- możliwość szybkiej podmiany URL bez deployu kodu.

## Geokodowanie

MVP nie wykonuje publicznego geokodowania z poziomu przeglądarki.

Decyzje:

- publiczna strona katalogu nie wysyła adresów użytkowników ani adresów ofert do zewnętrznego geokodera,
- `Nominatim` nie jest używany do masowego ani automatycznego geokodowania ofert,
- rekordy bez współrzędnych pozostają w liście wyników, ale nie dostają markera,
- późniejszy geocoding ofert powinien działać backendowo, z kolejką, cache, rate limitingiem i dostawcą dopuszczającym taki use case.

## Prywatność lokalizacji

W produkcie istnieją dwa różne typy współrzędnych:

- prywatne współrzędne adresu: `address.lat` / `address.lng`,
- publiczny punkt mapy używany przez katalog i `bbox`.

Publiczny endpoint mapy nie może filtrować ofert z ukrytym dokładnym adresem po prywatnych `address.lat` / `address.lng`, bo małe `bbox` mogłoby ujawnić dokładną lokalizację nawet wtedy, gdy wartości nie są zwracane w odpowiedzi.

Reguły publikacji:

| Ustawienie oferty | Punkt na mapie | Dane zwracane publicznie | Filtrowanie `bbox` |
| --- | --- | --- | --- |
| `showExactAddressOnPublicPage = true` | dokładny punkt, jeśli `address.lat/lng` istnieją | `lat/lng`, ulica i kod pocztowy mogą być zwrócone w szczególe oferty | po dokładnym punkcie publicznym |
| `showExactAddressOnPublicPage = false` | tylko przybliżony punkt publiczny | bez ulicy, kodu pocztowego i prywatnych `lat/lng` | po przybliżonym punkcie publicznym |
| brak współrzędnych | brak markera | tylko lokalizacja tekstowa | oferta widoczna w liście, poza wynikami mapowego `bbox` |

## Publiczny punkt mapy

`F9.2` powinno dodać jawny model publicznej lokalizacji mapowej zamiast przeciążać prywatne pola adresu.

Rekomendowany kontrakt:

```ts
type PublicMapPrecision = 'exact' | 'approximate';

interface PublicListingMapPoint {
  lat: number;
  lng: number;
  precision: PublicMapPrecision;
}
```

Źródło punktu:

- `exact`: `address.lat/lng`, tylko gdy `showExactAddressOnPublicPage = true`,
- `approximate`: punkt dzielnicy, miasta albo innego publicznego obszaru, gdy dokładny adres jest ukryty,
- brak punktu: jeśli nie da się bezpiecznie wyliczyć przybliżonego punktu.

Przybliżony punkt musi być stabilny dla oferty, aby marker nie skakał między odświeżeniami. Nie powinien jednak być wyliczany jako mały losowy offset od dokładnego adresu, bo przy wielu zapytaniach można zawężać lokalizację. Bezpieczny MVP to centroid miasta/dzielnicy albo zgrubny punkt obszaru administracyjnego.

## Filtrowanie przestrzenne

MVP używa prostego filtrowania po prostokącie `bbox` na publicznym punkcie mapy:

```txt
bbox=west,south,east,north
```

Decyzje:

- na MVP nie wprowadzamy PostGIS,
- walidujemy zakres długości i szerokości geograficznej,
- odrzucamy `bbox` obejmujący zbyt duży obszar,
- limit markerów jest osobny od limitu listy,
- `bbox` działa wyłącznie na publicznych punktach mapy, nigdy na prywatnych współrzędnych ukrytego adresu.

PostGIS wraca jako follow-up, gdy potrzebne będą wielokąty, promienie, sortowanie po odległości, indeksy przestrzenne przy dużej skali albo import dużej liczby ofert.

## Endpoint dla kolejnych zadań

`F9.2` powinno rozszerzyć publiczny katalog albo dodać obok niego endpoint mapowy. Preferowana ścieżka na MVP:

```http
GET /api/listings/public/catalog
```

Nowe parametry:

| Parametr | Typ | Limit | Opis |
| --- | --- | --- | --- |
| `bbox` | `west,south,east,north` | poprawny zakres GPS | filtr po publicznym punkcie mapy |
| `mapLimit` | integer | 1-300, default 150 | maksymalna liczba punktów mapy |

Rozszerzenie odpowiedzi:

```ts
interface PublicListingCatalogItem {
  mapPoint?: {
    lat: number;
    lng: number;
    precision: 'exact' | 'approximate';
  } | null;
}
```

Implementacja `F9.2` rozszerza odpowiedź także o osobną tablicę markerów, aby mapa mogła pokazać punkty niezależnie od paginacji listy:

```ts
interface PublicListingCatalogResponse {
  data: PublicListingCatalogItem[];
  mapMarkers: PublicListingCatalogMapMarker[];
  meta: {
    map: {
      limit: number;
      pointsTotal: number;
      pointsReturned: number;
      truncated: boolean;
      bbox?: {
        west: number;
        south: number;
        east: number;
        north: number;
      } | null;
    };
  };
}
```

Jeśli liczba punktów przekracza `mapLimit`, API zwraca `meta.map.truncated = true`, aby UI mogło pokazać komunikat o zawężeniu obszaru.

## UI i UX

`F9.3` powinno implementować mapę jako klientowy komponent ładowany dynamicznie.

Wymagania:

- widok lista / mapa albo split view na desktopie,
- na mobile mapa nie może przykrywać filtrów i kart wyników bez jasnej nawigacji,
- marker `approximate` musi być wizualnie odróżniony od `exact`,
- popup pokazuje tylko publiczne pola z katalogu,
- atrybucja mapy jest zawsze widoczna,
- po użyciu mapy URL zachowuje `bbox` i pozostałe filtry,
- brak punktów mapowych nie usuwa ofert z listy, dopóki użytkownik nie aktywuje filtrowania `bbox`.

Implementacja `F9.3` dodaje mapę Leaflet do publicznego katalogu `/oferty` jako zsynchronizowany widok nad listą wyników. Mapa korzysta z `mapMarkers`, lista z paginowanego `data`, a akcja `Szukaj w obszarze` zapisuje aktualny viewport mapy jako `bbox` w URL.

Implementacja `F9.4` zastępuje wyszukiwanie po samym viewporcie jawnym trybem rysowania prostokąta. Użytkownik zaznacza obszar na mapie, zatwierdza go, a frontend zapisuje wynik jako ten sam parametr `bbox`, dzięki czemu API i URL state pozostają zgodne z kontraktem `F9.2`.

## Koszty i rollout

Przed publicznym rolloutem mapy trzeba wpisać do konfiguracji produkcyjnej realnego dostawcę kafelków i potwierdzić:

- miesięczny limit żądań kafelków,
- koszt po przekroczeniu limitu,
- wymagania atrybucji,
- politykę cache,
- zasady komercyjnego użycia,
- kontakt operacyjny lub panel monitoringu usage.

Jeśli nie mamy dostawcy produkcyjnego, mapa może zostać włączona tylko za feature flagą dla środowiska dev/staging.

## Źródła decyzji

- [Leaflet](https://leafletjs.com/): lekka, open-source biblioteka do mobilnych map interaktywnych.
- [MapLibre GL JS](https://maplibre.org/projects/gl-js/): open-source biblioteka TypeScript do map wektorowych renderowanych w przeglądarce.
- [OpenStreetMap Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/): wymagania dotyczące URL, atrybucji, identyfikacji, `Referer`, cache i zakazu bulk downloadu.
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/): publiczny serwis ma ograniczoną przepustowość, wymaga m.in. maksymalnie 1 request/second i nie nadaje się do ciężkiego automatycznego geokodowania.

## Follow-upy

- `F9.2`: dodać walidację `bbox`, publiczny `mapPoint`, osobny limit markerów i testy prywatności dla ukrytego dokładnego adresu.
- `F9.3`: dodać Leaflet jako zależność web, klientowy komponent mapy, markery/popupy i synchronizację URL.
- `F9.4`: zacząć od prostokątnego zaznaczenia obszaru; wielokąty zostawić na później lub na PostGIS.
