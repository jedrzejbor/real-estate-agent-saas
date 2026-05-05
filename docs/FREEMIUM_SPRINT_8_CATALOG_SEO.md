# Freemium Sprint 8 - SEO katalogu ofert

Data przygotowania: 2026-05-05

## Decyzja

`F8.4` jest domknięte dla MVP.

Indeksowalny jest tylko bazowy katalog `/oferty`. Wszystkie widoki z filtrami, sortowaniem albo paginacją dostają `noindex, follow` oraz canonical do `/oferty`.

To jest świadomie konserwatywna decyzja: katalog jest nowy, liczba ofert w pierwszej becie może być mała, a indeksowanie dużej liczby kombinacji filtrów grozi thin content i duplicate content względem szczegółów ofert.

## Reguły indeksowania

Indeksujemy:

- `/oferty`
- `/oferty/[slug]`

Nie indeksujemy:

- `/oferty?city=...`
- `/oferty?propertyType=...`
- `/oferty?transactionType=...`
- `/oferty?priceMin=...`
- `/oferty?priceMax=...`
- `/oferty?areaMin=...`
- `/oferty?areaMax=...`
- `/oferty?roomsMin=...`
- `/oferty?roomsMax=...`
- `/oferty?q=...`
- `/oferty?sort=...`, poza domyślnym `sort=newest`
- `/oferty?page=2` i kolejne strony

Wyjątek techniczny:

- `/oferty?page=1` i `/oferty?sort=newest` są traktowane jak bazowy katalog, ale canonical nadal wskazuje `/oferty`.

## Canonical

Katalog:

- canonical: `/oferty`

Wyniki filtrowane:

- canonical: `/oferty`
- robots: `noindex, follow`

Szczegóły ofert:

- canonical: `/oferty/[slug]`
- robots: `index, follow`

## Sitemap

Sitemap zawiera:

- stronę główną `/`,
- bazowy katalog `/oferty`,
- publiczne szczegóły ofert `/oferty/[slug]`.

Sitemap nie zawiera kombinacji filtrów katalogu.

## Kontrola duplicate content

Katalog pokazuje skrócone karty ofert i nie powiela pełnych opisów. Pełny opis, galeria, dane agenta i schema szczegółu pozostają na `/oferty/[slug]`.

Filtrowane widoki katalogu nie są indeksowane, więc nie konkurują z detalami ofert ani z bazowym katalogiem.

## Follow-up

Po zebraniu danych z katalogu można rozważyć indeksowanie wybranych landing pages, ale dopiero jako osobne zadanie:

- `/oferty/mieszkania/warszawa`
- `/oferty/domy/krakow`
- `/oferty/wynajem/wroclaw`

Warunki przed takim rozszerzeniem:

- stabilna liczba ofert w danej lokalizacji,
- unikalne title/description,
- dedykowane canonicale bez query params,
- brak kanibalizacji z detalami ofert,
- kontrola jakości pustych i niskiej jakości wyników.
