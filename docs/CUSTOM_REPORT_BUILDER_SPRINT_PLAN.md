# Custom Report Builder - plan sprintów

Cel: przygotować funkcję, w której użytkownik może samodzielnie wybrać dane,
filtry, metryki i układ raportu. Funkcja powinna być użyteczna dla agentów i
małych biur, a docelowo stanowić mocny element planów premium.

## Dlaczego warto

Obecne raporty są predefiniowane i dobrze pokrywają podstawowe potrzeby:

- overview,
- oferty,
- klienci,
- spotkania,
- metryki freemium/growth,
- raporty pionowe rozwijane według roadmapy.

Problem użytkownika:

- każdy agent i każde biuro patrzy na dane trochę inaczej,
- manager chce porównać agentów,
- agent chce przygotować raport pod właściciela oferty,
- czasem potrzebny jest raport "na teraz", bez czekania na nowy predefiniowany
  widok w aplikacji.

Custom report builder daje użytkownikowi poczucie kontroli i zwiększa wartość
modułu raportów jako funkcji premium.

## Zakres docelowy

Użytkownik powinien móc:

1. Wybrać źródło danych:
   - oferty,
   - klienci,
   - spotkania,
   - transakcje,
   - publiczne leady,
   - aktywność/analityka.
2. Wybrać metryki:
   - liczba rekordów,
   - suma,
   - średnia,
   - procent,
   - konwersja,
   - wartość portfela,
   - potencjalna prowizja.
3. Wybrać wymiary grupowania:
   - status,
   - typ nieruchomości,
   - typ transakcji,
   - źródło klienta,
   - agent,
   - okres,
   - miasto/dzielnica.
4. Ustawić filtry:
   - zakres dat,
   - agent / zespół,
   - status,
   - typ nieruchomości,
   - typ transakcji,
   - źródło leadu,
   - publikacja.
5. Wybrać prezentację:
   - tabela,
   - KPI cards,
   - wykres trendu,
   - wykres słupkowy,
   - breakdown procentowy.
6. Zapisać raport jako szablon.
7. Eksportować lub udostępnić raport:
   - CSV,
   - PDF,
   - link wewnętrzny,
   - w przyszłości link publiczny z ograniczonym dostępem.

## Zasady bezpieczeństwa i jakości

1. Backend musi wymuszać scope danych.
2. Frontend nie może decydować samodzielnie, do których danych użytkownik ma
   dostęp.
3. Definicja raportu musi być walidowana po stronie API.
4. Nie dopuszczamy dowolnego SQL od użytkownika.
5. Builder powinien korzystać z allowlisty:
   - dozwolone źródła,
   - dozwolone metryki,
   - dozwolone filtry,
   - dozwolone grupowania.
6. Raporty muszą mieć limit zakresu dat i limit liczby wyników.
7. Zapisane raporty muszą być przypisane do agencji/użytkownika.
8. Raporty zespołowe muszą respektować role.

## Model mentalny użytkownika

Najprostszy flow:

1. Wybieram typ raportu.
2. Wybieram metryki.
3. Dodaję filtry.
4. Widzę podgląd.
5. Zapisuję raport.

Przykładowe raporty:

- "Aktywne oferty według dzielnicy i typu nieruchomości"
- "Spotkania per agent w ostatnich 30 dniach"
- "Leady publiczne i ich konwersja do klientów"
- "Wartość portfela aktywnych ofert"
- "Potencjalna prowizja według statusu transakcji"
- "Oferty bez aktywności od 14 dni"

## Sprint CR-0: Discovery i kontrakt raportów

Cel:
Ustalić minimalny, bezpieczny kontrakt custom report buildera.

Zakres:

- spisać listę źródeł danych dla MVP,
- zdefiniować allowlistę metryk,
- zdefiniować allowlistę wymiarów i filtrów,
- ustalić limity:
  - maksymalny zakres dat,
  - maksymalna liczba grupowań,
  - maksymalna liczba metryk,
  - maksymalna liczba wierszy wyniku,
- przygotować typy TypeScript dla definicji raportu.

Proponowany MVP sources:

- `listings`,
- `clients`,
- `appointments`,
- `transactions`.

Poza MVP:

- `public_leads`,
- `analytics_events`,
- `documents`.

Deliverables:

- `CustomReportDefinition` jako typ/domain contract,
- lista metryk MVP,
- decyzje bezpieczeństwa,
- aktualizacja dokumentacji.

## Sprint CR-1: Backend report definition validator

Cel:
Stworzyć backendowy fundament, który przyjmuje definicję raportu i waliduje ją
bez wykonywania jeszcze pełnych agregacji.

Zakres:

- DTO:
  - `CreateCustomReportDto`,
  - `PreviewCustomReportDto`,
  - `CustomReportMetricDto`,
  - `CustomReportFilterDto`,
  - `CustomReportDimensionDto`,
- walidacja allowlisty,
- walidacja limitów,
- walidacja kompatybilności:
  - metryka pasuje do źródła,
  - filtr pasuje do źródła,
  - wymiar pasuje do źródła,
- testy jednostkowe walidatora.

Endpointy:

- `GET /api/reports/custom/catalog`
- `POST /api/reports/custom/validate`

Deliverables:

- katalog dostępnych pól raportowych,
- walidator definicji,
- testy dla błędnych i poprawnych definicji.

## Sprint CR-2: Backend preview engine MVP

Cel:
Wykonać pierwszy podgląd raportu na bezpiecznym QueryBuilderze.

Zakres:

- endpoint `POST /api/reports/custom/preview`,
- obsługa źródła `listings`,
- obsługa źródła `clients`,
- podstawowe metryki:
  - count,
  - sum price,
  - average price,
  - count by status,
  - count by type,
- podstawowe filtry:
  - zakres dat,
  - status,
  - typ nieruchomości,
  - typ transakcji,
  - agent,
- grupowanie:
  - status,
  - propertyType,
  - transactionType,
  - agent,
  - month.

Wymagania:

- scope enforcement taki jak w obecnych raportach,
- brak dowolnych nazw kolumn z payloadu,
- mapowanie pól przez allowlistę,
- testy dla scope i SQL injection safety.

Deliverables:

- działający preview dla ofert i klientów,
- zwracany model tabelaryczny,
- testy backendu.

## Sprint CR-3: Frontend builder MVP

Cel:
Dać użytkownikowi prosty interfejs do złożenia raportu i zobaczenia podglądu.

Zakres UI:

- strona `/dashboard/reports/custom/new`,
- wybór źródła danych,
- wybór metryk,
- wybór grupowania,
- wybór filtrów,
- przycisk `Pokaż podgląd`,
- wynik w tabeli,
- loading/error/empty states.

Zasady UX:

- nie pokazywać wszystkich opcji naraz,
- stosować krokowy flow:
  1. Dane,
  2. Metryki,
  3. Filtry,
  4. Podgląd,
- opcje powinny być opisane językiem biznesowym, nie nazwami kolumn.

Deliverables:

- działający builder MVP,
- podgląd tabeli,
- obsługa błędów walidacji z API.

## Sprint CR-4: Zapisywanie raportów

Cel:
Pozwolić użytkownikowi zapisać definicję raportu i wrócić do niego później.

Zakres:

- migracja `custom_reports`,
- encja `CustomReport`,
- pola:
  - `id`,
  - `agencyId`,
  - `createdByUserId`,
  - `name`,
  - `description`,
  - `definition`,
  - `visibility`,
  - `createdAt`,
  - `updatedAt`,
- endpointy:
  - `GET /api/reports/custom`,
  - `POST /api/reports/custom`,
  - `GET /api/reports/custom/:id`,
  - `PATCH /api/reports/custom/:id`,
  - `DELETE /api/reports/custom/:id`,
- lista zapisanych raportów w UI.

Visibility MVP:

- `private`,
- `agency`.

Deliverables:

- zapis i edycja raportu,
- lista raportów,
- usuwanie raportu,
- testy uprawnień.

## Sprint CR-5: Wizualizacje i układ raportu

Cel:
Zwiększyć wartość raportu przez czytelne wizualizacje.

Zakres:

- wybór typu prezentacji:
  - tabela,
  - KPI cards,
  - bar chart,
  - trend line,
  - breakdown,
- backend zwraca model danych neutralny wobec UI,
- frontend mapuje wynik do komponentów raportowych,
- opcja zmiany kolejności sekcji.

Deliverables:

- raport nie jest tylko tabelą,
- użytkownik może wybrać prezentację,
- komponenty są reużywalne z obecnym modułem raportów.

## Sprint CR-6: Eksport i udostępnianie

Cel:
Pozwolić agentowi używać raportów poza aplikacją.

Zakres:

- eksport CSV,
- eksport PDF,
- drukowalny widok raportu,
- link wewnętrzny do zapisanego raportu,
- opcjonalnie publiczny link z tokenem i datą wygaśnięcia.

Bezpieczeństwo:

- publiczny link tylko dla raportów, które nie zawierają danych osobowych albo
  po wyraźnym ostrzeżeniu,
- token powinien być losowy i wygasać,
- możliwość cofnięcia linku.

Deliverables:

- CSV,
- PDF/print view,
- wewnętrzny share link.

## Sprint CR-7: Raporty właściciela oferty

Cel:
Wykorzystać builder jako fundament dla raportu, który agent może pokazać
właścicielowi nieruchomości.

Zakres:

- preset `Raport oferty dla właściciela`,
- dane:
  - status oferty,
  - wyświetlenia,
  - zapytania,
  - spotkania,
  - zmiany ceny/statusu,
  - notatka agenta,
- eksport PDF/link,
- branding agenta/biura.

Deliverables:

- preset raportu właścicielskiego,
- share/print,
- potencjalny feature premium.

## Sprint CR-8: Presety i szablony premium

Cel:
Ułatwić start użytkownikowi i stworzyć gotowe wartościowe raporty.

Zakres presetów:

- Aktywność agenta,
- Skuteczność ofert,
- Pipeline klientów,
- Spotkania i follow-up,
- Leady publiczne,
- Wartość portfela,
- Prowizje i zarobki,
- Raport właściciela.

Deliverables:

- galeria szablonów,
- tworzenie raportu z presetu,
- oznaczenie presetów premium.

## Sprint CR-9: Alerty z raportów

Cel:
Zamienić raporty w aktywny system ostrzegania.

Zakres:

- warunki alertów:
  - liczba leadów spadła,
  - oferta bez aktywności X dni,
  - mniej spotkań niż zwykle,
  - wysoki udział anulowanych spotkań,
  - przekroczony target pipeline,
- powiadomienia w aplikacji,
- w przyszłości email.

Deliverables:

- custom report może mieć alert,
- alert tworzy notification,
- użytkownik widzi ryzyka bez ręcznego sprawdzania raportu.

## Model danych - propozycja

Tabela `custom_reports`:

```sql
CREATE TABLE custom_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  description text NULL,
  visibility varchar(30) NOT NULL DEFAULT 'private',
  definition jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Przykładowa definicja:

```json
{
  "source": "listings",
  "metrics": [
    { "id": "listing_count", "aggregation": "count" },
    { "id": "portfolio_value", "aggregation": "sum", "field": "price" }
  ],
  "dimensions": [{ "id": "status" }, { "id": "property_type" }],
  "filters": [
    {
      "id": "created_at",
      "operator": "between",
      "value": ["2026-06-01", "2026-06-30"]
    },
    { "id": "transaction_type", "operator": "eq", "value": "sale" }
  ],
  "visualization": {
    "type": "table"
  }
}
```

## MVP vs później

### MVP

- katalog pól,
- walidator definicji,
- preview dla ofert i klientów,
- prosty builder UI,
- zapis raportu,
- tabela jako wynik.

### Później

- wykresy,
- eksport PDF,
- publiczne linki,
- alerty,
- presety premium,
- raport właściciela,
- AI insighty.

## Kryteria gotowości MVP

MVP custom report builder jest gotowy, gdy:

1. Użytkownik może stworzyć raport z ofert albo klientów.
2. Może wybrać minimum 2 metryki i 1 grupowanie.
3. Może zastosować zakres dat i podstawowe filtry.
4. Widzi podgląd tabeli.
5. Może zapisać raport.
6. Raport respektuje scope agenta/agencji.
7. Backend nie wykonuje żadnego dynamicznego SQL z payloadu użytkownika.
8. Są testy walidatora, scope i podstawowych agregacji.

## Rekomendowana kolejność startu

Najlepiej zacząć od `CR-0` i `CR-1`, bez UI. Powód:

- builder raportów jest wrażliwy na bezpieczeństwo,
- najpierw musi powstać bezpieczny kontrakt i allowlista,
- frontend będzie prostszy, jeśli API zwróci katalog opcji raportowych.
