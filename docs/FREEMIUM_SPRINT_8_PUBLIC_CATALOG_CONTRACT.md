# Freemium Sprint 8 - kontrakt publicznego katalogu ofert

Data przygotowania: 2026-05-03

## Decyzja

`F8.1` jest domknięte jako kontrakt dla publicznego katalogu `/oferty`.

Katalog ma korzystać z nowego publicznego endpointu wyszukiwania, a nie z prywatnego `GET /api/listings`. Prywatny endpoint pozostaje scoped do zalogowanego agenta/agencji i nie nadaje się do publicznego discovery.

## Endpoint

Planowany endpoint dla `F8.2`:

```http
GET /api/listings/public/catalog
```

Zasady:

- endpoint jest publiczny i nie wymaga auth,
- zwraca wyłącznie oferty z `publicationStatus = published`,
- nie zwraca ofert bez `publicSlug` i `publishedAt`,
- nie miesza się z `GET /api/listings/public`, który zostaje lekkim endpointem sitemap,
- paginacja jest obowiązkowa i ma bezpieczny limit,
- sortowanie działa tylko po whitelisted polach,
- odpowiedź używa publicznych pól i respektuje prywatność adresu.

## Query params

Kontrakt DTO: `PublicListingCatalogQueryDto`.

| Parametr          | Typ               | Limit            | Opis                                       |
| ----------------- | ----------------- | ---------------- | ------------------------------------------ |
| `city`            | string            | max 80 znaków    | miasto, dopasowanie case-insensitive       |
| `district`        | string            | max 80 znaków    | dzielnica, opcjonalnie                     |
| `voivodeship`     | string            | max 80 znaków    | województwo, opcjonalnie                   |
| `propertyType`    | `PropertyType`    | enum             | typ nieruchomości                          |
| `transactionType` | `TransactionType` | enum             | sprzedaż / wynajem                         |
| `priceMin`        | number            | min 0            | cena od                                    |
| `priceMax`        | number            | min 0            | cena do                                    |
| `areaMin`         | number            | min 0            | powierzchnia od                            |
| `areaMax`         | number            | min 0            | powierzchnia do                            |
| `roomsMin`        | integer           | 1-20             | minimalna liczba pokoi                     |
| `roomsMax`        | integer           | 1-20             | maksymalna liczba pokoi                    |
| `q`               | string            | max 120 znaków   | fraza tekstowa w tytule/opisie/lokalizacji |
| `sort`            | enum              | default `newest` | sortowanie wyników                         |
| `page`            | integer           | min 1, default 1 | strona wyników                             |
| `limit`           | integer           | 1-48, default 24 | liczba wyników na stronę                   |

Sortowanie:

- `newest` - najnowsze opublikowane,
- `price_asc` - cena rosnąco,
- `price_desc` - cena malejąco,
- `area_asc` - powierzchnia rosnąco,
- `area_desc` - powierzchnia malejąco.

## Response model

Kontrakt odpowiedzi: `PublicListingCatalogResponse`.

```ts
interface PublicListingCatalogResponse {
  data: PublicListingCatalogItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    sort: string;
  };
}
```

`PublicListingCatalogItem`:

```ts
interface PublicListingCatalogItem {
  id: string;
  slug: string;
  title: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  price?: number | string | null;
  currency: string;
  areaM2?: number | string | null;
  plotAreaM2?: number | string | null;
  rooms?: number | null;
  address?: {
    city: string;
    district?: string | null;
    voivodeship?: string | null;
  } | null;
  primaryImage?: {
    id: string;
    url: string;
    altText?: string | null;
  } | null;
  imageCount: number;
  agent?: {
    id?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    agency?: {
      id: string;
      name: string;
      logoUrl?: string | null;
    } | null;
  } | null;
  publishedAt: Date;
  updatedAt: Date;
}
```

## Prywatność i pola publiczne

Katalog nie zwraca:

- `street`,
- `postalCode`,
- `lat`,
- `lng`,
- prywatnego statusu CRM,
- prywatnego opisu CRM, jeśli istnieje publiczny opis,
- danych kontaktowych agenta poza tym, co jest już świadomie publiczne na profilu/szczególe.

Cena musi respektować `showPriceOnPublicPage`. Jeśli agent ukrył cenę na publicznej stronie, katalog zwraca `price = null`.

Adres katalogu zwraca tylko lokalizację przybliżoną:

- `city`,
- `district`,
- `voivodeship`.

Dokładny adres i współrzędne pozostają tylko w szczególe oferty i tylko wtedy, gdy `showExactAddressOnPublicPage = true`.

## Różnica względem istniejących endpointów

- `GET /api/listings/public/:slug` - szczegół pojedynczej oferty, może zawierać opis, pełną galerię i opcjonalny dokładny adres.
- `GET /api/listings/public` - lekki sitemap, tylko `slug` i `updatedAt`.
- `GET /api/listings/public/catalog` - paginowany katalog discovery z filtrami i kartami wyników.
- `GET /api/listings` - prywatny endpoint CRM, nie używać publicznie.

## Decyzje dla F8.2

Implementacja endpointu powinna:

- użyć relacji `address`, `images`, `agent`, `agent.agency`,
- sortować zdjęcia po `isPrimary DESC`, `order ASC`,
- liczyć `imageCount` bez zwracania całej galerii,
- filtrować tylko `publicationStatus = published`,
- wymuszać `publicSlug IS NOT NULL` i `publishedAt IS NOT NULL`,
- używać parametrów bindowanych w query builderze,
- stosować `skip/take` z limitem `48`,
- dla `q` użyć dopasowania case-insensitive po publicznym tytule/opisie oraz lokalizacji.

## Decyzje dla F8.3

UI `/oferty` powinno:

- zachowywać filtry w query params,
- używać tych samych nazw parametrów co API,
- pokazywać karty wyników z primary image, ceną, lokalizacją, metrażem, pokojami i CTA do `/oferty/:slug`,
- pokazywać empty state i loading/error state,
- wysyłać analytics event dla wyszukiwania i kliknięcia wyniku.

## Follow-up

- Sprint 9 może rozszerzyć kontrakt o mapę, ale współrzędne publiczne muszą respektować `showExactAddressOnPublicPage`.
- SEO katalogu w `F8.4` powinno zdecydować, które kombinacje filtrów są indeksowane, a które dostają `noindex`.
