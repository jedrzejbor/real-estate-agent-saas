# Import miejscowości do autocomplete

Autocomplete miejscowości korzysta z tabeli `locations`. Mały katalog w kodzie
pozostaje tylko fallbackiem developmentowym, dopóki baza nie zostanie zasilona.

## Komenda

```bash
pnpm --filter api import:locations ./data/locations.csv --source=prg --deactivate-missing
```

Dla gotowego wsadu `polish-geonames.tsv`:

```bash
pnpm --filter api import:locations ./data/polish-geonames.tsv --delimiter=tab --source=polish-geonames-2025 --deactivate-missing
```

Dla oficjalnego PRNG z usługi WFS Geoportalu:

```bash
pnpm --filter api import:locations:prng --source=prng --deactivate-missing
```

Opcjonalnie można ograniczyć warstwy:

```bash
pnpm --filter api import:locations:prng --layers=M1 --source=prng --deactivate-missing
```

Do krótkich testów można użyć:

```bash
pnpm --filter api import:locations:prng --layers=M1 --count=5 --max-pages=1 --source=prng-test
```

Opcje:

- `--delimiter=;` - separator CSV/TSV, domyślnie `;`.
- `--source=prg` - etykieta źródła danych zapisywana w bazie.
- `--deactivate-missing` - dezaktywuje rekordy z tego samego źródła, których nie ma
  w aktualnym pliku.

## Format pliku

Importer obsługuje CSV, JSON i JSONL. Zalecany format CSV:

```csv
name;voivodeship;county;municipality;kind;kindCode;lat;lng;simcCode;priority
Łabiszyn;kujawsko-pomorskie;żniński;Łabiszyn;miasto;99;52.9521;17.9198;0929684;90
Ojrzanowo;kujawsko-pomorskie;żniński;Łabiszyn;wieś;01;52.9510;17.8610;0929450;50
```

Wymagane pola:

- `name`
- `voivodeship`
- `lat`
- `lng`

Opcjonalne pola:

- `county`
- `municipality`
- `kind` - np. `miasto`, `wieś`, `osada`, `kolonia`, `część wsi`
- `kindCode` - kod rodzaju miejscowości z SIMC/TERYT, jeśli dostępny
- `simcCode`
- `priority`
- `source`

Akceptowane są też angielskie i polskie nagłówki, np. `province`, `district`,
`commune`, `nazwa`, `miejscowosc`, `wojewodztwo`, `powiat`, `gmina`, `rodzaj`,
`typ`, `rm`, `szerokosc`, `dlugosc`, `simc`, `sym`.

## Przygotowanie pełnego wsadu

Rekomendowane źródła:

- GUS TERYT/SIMC jako źródło identyfikatorów i nazw miejscowości.
- GUGiK PRG jako źródło geometrii / punktów lokalizacji.
- Gotowy wsad `mbroton/polish-geonames` jako praktyczny import startowy
  miejscowości z koordynatami.

TERYT/SIMC nie zawiera współrzędnych, dlatego pełny wsad do mapy powinien być
wynikiem połączenia danych TERYT z danymi przestrzennymi PRG albo innym
zweryfikowanym źródłem geokodowania. Do aplikacji importujemy już znormalizowany
plik z nazwą, województwem, powiatem/gminą, kodem SIMC oraz `lat/lng` w WGS84.

## Zachowanie endpointu

`GET /api/locations?query=...`:

- szuka najpierw w tabeli `locations`,
- zwraca maksymalnie `limit` wyników,
- sortuje dopasowania dokładne i prefiksowe wyżej niż częściowe,
- jeśli tabela jest pusta, używa małego fallbacku w kodzie.
