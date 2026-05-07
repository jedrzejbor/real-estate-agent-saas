# Import miejscowości do autocomplete

Autocomplete miejscowości korzysta z tabeli `locations`. Mały katalog w kodzie
pozostaje tylko fallbackiem developmentowym, dopóki baza nie zostanie zasilona.

## Komenda

```bash
pnpm --filter api import:locations ./data/locations.csv --source=prg --deactivate-missing
```

Opcje:

- `--delimiter=;` - separator CSV/TSV, domyślnie `;`.
- `--source=prg` - etykieta źródła danych zapisywana w bazie.
- `--deactivate-missing` - dezaktywuje rekordy z tego samego źródła, których nie ma
  w aktualnym pliku.

## Format pliku

Importer obsługuje CSV, JSON i JSONL. Zalecany format CSV:

```csv
name;voivodeship;county;municipality;lat;lng;simcCode;priority
Łabiszyn;kujawsko-pomorskie;żniński;Łabiszyn;52.9521;17.9198;0929684;90
```

Wymagane pola:

- `name`
- `voivodeship`
- `lat`
- `lng`

Opcjonalne pola:

- `county`
- `municipality`
- `simcCode`
- `priority`
- `source`

Akceptowane są też polskie nagłówki, np. `nazwa`, `miejscowosc`,
`wojewodztwo`, `powiat`, `gmina`, `szerokosc`, `dlugosc`, `simc`, `sym`.

## Przygotowanie pełnego wsadu

Rekomendowane źródła:

- GUS TERYT/SIMC jako źródło identyfikatorów i nazw miejscowości.
- GUGiK PRG jako źródło geometrii / punktów lokalizacji.

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
