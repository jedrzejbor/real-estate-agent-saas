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

Status: planowane

Zakres:

- [ ] dodać katalog `PUBLIC_DISTRICT_CENTROIDS`,
- [ ] dodać helper budujący klucz `city + district`,
- [ ] rozszerzyć `PublicListingMapPoint` o `source` i `label`,
- [ ] zmienić wybór punktu publicznego:
  - exact,
  - district,
  - city,
  - region,
- [ ] zachować obecne zachowanie jako fallback, jeśli dzielnica nie jest
  rozpoznana.

Kryteria akceptacji:

- [ ] oferta z `city=Bydgoszcz` i `district=Fordon` trafia w punkt Fordonu,
- [ ] oferta z `city=Bydgoszcz` bez dzielnicy trafia w punkt Bydgoszczy,
- [ ] dokładny adres działa tylko przy `showExactAddressOnPublicPage=true`,
- [ ] API katalogu publicznego zwraca `mapPoint.source`,
- [ ] istniejące mapy nie psują się dla ofert bez dzielnicy.

Weryfikacja:

- `pnpm --filter api type-check`,
- test jednostkowy helpera wyboru punktu,
- ręczny test na kilku ofertach w Bydgoszczy.

## Sprint 2: Frontend mapy i popupów

Status: planowane

Zakres:

- [ ] zaktualizować typy web w `apps/web/src/lib/listings.ts`,
- [ ] pokazać lepszy opis lokalizacji w popupie mapy:
  - `Dokładna lokalizacja`,
  - `Lokalizacja przybliżona: Fordon, Bydgoszcz`,
  - `Lokalizacja przybliżona: Bydgoszcz`,
- [ ] opcjonalnie rozróżnić marker `district` i `city` subtelnym tooltipem albo
  opisem w popupie,
- [ ] zostawić grupowanie markerów jako fallback dla identycznych punktów,
- [ ] sprawdzić zachowanie popupu z wieloma ofertami w jednym punkcie.

Kryteria akceptacji:

- [ ] użytkownik widzi w popupie, czy lokalizacja jest dokładna czy przybliżona,
- [ ] przybliżenie na poziomie dzielnicy pokazuje nazwę dzielnicy,
- [ ] kilka ofert w różnych dzielnicach tego samego miasta nie ląduje w jednym
  markerze,
- [ ] kilka ofert w tej samej dzielnicy nadal grupuje się w jeden marker z
  przełącznikiem.

Weryfikacja:

- `pnpm --filter web type-check`,
- ręczny test `/oferty` z mapą i popupami,
- test responsywności popupu na mobile.

## Sprint 3: Formularze i jakość danych

Status: planowane

Zakres:

- [ ] ustandaryzować pole `Dzielnica` w formularzu dashboardowym i publicznym,
- [ ] dodać podpowiedzi dzielnic po wybraniu miasta,
- [ ] nadal pozwolić wpisać dzielnicę ręcznie, jeśli nie ma jej w katalogu,
- [ ] dodać aliasy dzielnic/osiedli:
  - `centrum` -> `srodmiescie`, jeśli właściwe dla miasta,
  - warianty z polskimi znakami,
  - warianty lokalne,
- [ ] dopisać walidację miękką: jeśli miasto ma znane dzielnice, sugerujemy
  wybór z listy, ale nie blokujemy zapisu.

Kryteria akceptacji:

- [ ] agent wpisujący ofertę w dashboardzie dostaje sugestie dzielnic,
- [ ] publiczny formularz dodawania oferty korzysta z tego samego źródła
  sugestii,
- [ ] zapis oferty nie jest blokowany przez brak rozpoznanej dzielnicy,
- [ ] ręcznie wpisana dzielnica może później zostać obsłużona przez katalog.

Weryfikacja:

- `pnpm --filter web type-check`,
- ręczny test formularza dashboardowego,
- ręczny test publicznego formularza `/dodaj-oferte`.

## Sprint 4: Migracja do tabeli lokalizacji

Status: przyszłe rozszerzenie

Zakres:

- [ ] rozszerzyć model `Location` o typy dzielnic/osiedli, jeśli obecny model
  nie wystarcza,
- [ ] przygotować import dzielnic dla największych miast,
- [ ] używać `locations` jako źródła dla publicznych centroidów,
- [ ] zachować stały katalog jako fallback albo seed startowy,
- [ ] dodać panel/adminowy sposób korekty centroidu, jeśli będzie potrzebny.

Kryteria akceptacji:

- [ ] backend nie wymaga ręcznej stałej dla nowych dzielnic,
- [ ] autocomplete i mapa korzystają z tego samego katalogu,
- [ ] można rozbudować miasta bez zmian w kodzie aplikacji.

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
