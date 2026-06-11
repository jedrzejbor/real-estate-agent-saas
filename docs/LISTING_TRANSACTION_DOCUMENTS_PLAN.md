# Listing and transaction documents plan

Data: 2026-06-11

Cel: rozbudować aplikację o prywatny moduł zarządzania dokumentami ofert i
przyszłych transakcji, tak aby agent mógł kontrolować kompletność dokumentów,
terminy, statusy weryfikacji i historię zmian bez wynoszenia plików poza CRM.

Dokument bazuje na Priorytecie 1 z
`docs/AGENT_WORKFLOW_FEATURE_OPPORTUNITIES.md`.

## Założenie produktowe

Moduł `Dokumenty` ma być przede wszystkim narzędziem operacyjnym dla agenta:

- agent widzi, czego brakuje przy ofercie,
- agent może bezpiecznie przechowywać pliki,
- agent może oznaczać status dokumentu,
- agent widzi terminy i dokumenty wymagające działania,
- dokumenty nie są publiczne,
- moduł jest gotowy do rozszerzenia o transakcje, portal właściciela, OCR i
  podpis elektroniczny.

W MVP nie budujemy jeszcze pełnej kancelarii dokumentowej ani integracji z
notariuszem. Budujemy solidny prywatny fundament.

## Zakres MVP

W pierwszym zakresie obsługujemy dokumenty przy ofercie.

Dokument może mieć:

- plik,
- kategorię,
- status,
- nazwę widoczną dla agenta,
- notatkę,
- termin dostarczenia,
- datę ważności,
- informację kto i kiedy dodał plik,
- historię podstawowych zmian.

Obsługiwane powiązania:

- `listingId` - wymagane w MVP,
- `transactionId` - projektujemy w modelu jako przyszłe rozszerzenie, ale nie
  implementujemy, dopóki nie mamy modułu transakcji,
- `clientId` - poza MVP, możliwe w kolejnej iteracji.

## Poza zakresem MVP

- OCR i automatyczne czytanie dokumentów.
- Podpis elektroniczny.
- Udostępnianie dokumentów klientowi linkiem.
- Portal właściciela.
- Dokumenty transakcji na osobnym modelu `Transaction`.
- Skan antywirusowy klasy produkcyjnej, jeśli nie mamy jeszcze storage
  obiektowego i pipeline uploadu.
- Automatyczna analiza prawna dokumentów.
- Rozpoznawanie danych z księgi wieczystej.

## Kategorie dokumentów

Proponowany enum `ListingDocumentCategory`:

- `agency_agreement` - umowa pośrednictwa,
- `land_and_mortgage_register` - księga wieczysta / numer KW,
- `ownership_deed` - akt własności / podstawa nabycia,
- `no_arrears_certificate` - zaświadczenie o niezaleganiu,
- `community_documents` - dokumenty wspólnoty/spółdzielni,
- `floor_plan` - rzut lokalu,
- `energy_certificate` - świadectwo energetyczne,
- `handover_protocol` - protokół zdawczo-odbiorczy,
- `power_of_attorney` - pełnomocnictwo,
- `other` - inne.

Kategorie powinny być łatwe do rozszerzenia, ale w MVP nie robimy customowych
kategorii tworzonych przez użytkownika.

## Statusy dokumentu

Proponowany enum `ListingDocumentStatus`:

- `missing` - brak,
- `requested` - oczekuje na dostarczenie,
- `uploaded` - dodany,
- `in_review` - do weryfikacji,
- `approved` - zaakceptowany,
- `needs_correction` - wymaga poprawy,
- `expired` - wygasł.

Uwaga techniczna: status `missing` może być elementem checklisty, niekoniecznie
rekordem dokumentu z plikiem. Rekord pliku powinien zwykle zaczynać od
`uploaded` albo `in_review`.

## Model danych

### `ListingDocument`

Proponowane pola:

```ts
id: string;
agentId: string;
listingId: string;
category: ListingDocumentCategory;
status: ListingDocumentStatus;
displayName: string;
originalFilename: string;
mimeType: string;
fileSize: number;
storageKey: string;
checksum?: string | null;
note?: string | null;
dueDate?: Date | null;
expiresAt?: Date | null;
uploadedByUserId: string;
reviewedAt?: Date | null;
reviewedByUserId?: string | null;
createdAt: Date;
updatedAt: Date;
deletedAt?: Date | null;
```

Decyzje:

- `agentId` zapisujemy jawnie dla łatwego filtrowania i bezpieczeństwa.
- `listingId` jest wymagane w MVP.
- `storageKey` nie może być publicznym URL-em.
- Soft delete jest preferowany, bo dokumenty mogą mieć znaczenie audytowe.
- `checksum` można dodać od razu, nawet jeśli w MVP nie wykorzystamy go szeroko.

### `ListingDocumentEvent`

Proponowany log zdarzeń:

```ts
id: string;
documentId: string;
agentId: string;
listingId: string;
actorUserId: string;
type:
  | 'uploaded'
  | 'status_changed'
  | 'metadata_updated'
  | 'downloaded'
  | 'deleted'
  | 'restored';
metadata: Record<string, unknown>;
createdAt: Date;
```

MVP może zacząć od logowania:

- upload,
- zmiana statusu,
- edycja metadanych,
- usunięcie.

Log pobrania (`downloaded`) jest zalecany, jeśli dodamy endpoint downloadu.

### `ListingDocumentRequirement`

W MVP można zacząć od statycznej konfiguracji w kodzie zamiast tabeli.

Przykład:

```ts
{
  category: 'agency_agreement',
  requiredFor: ['sale', 'rent'],
  required: true,
}
```

Docelowo można zrobić dynamiczne checklisty zależne od:

- typu transakcji,
- typu nieruchomości,
- rynku sprzedaży/najmu,
- ustawień agencji.

## Storage

### MVP lokalny

Możemy technicznie zacząć od istniejącego wzorca uploadów lokalnych, ale tylko
dla środowiska dev/MVP.

Wymagania:

- pliki nie mogą trafiać do publicznego katalogu statycznego,
- dostęp tylko przez autoryzowany endpoint,
- ścieżka na dysku nie może być konstruowana bezpośrednio z danych użytkownika,
- nazwy plików muszą być generowane przez backend.

### Produkcja

Docelowo potrzebny storage obiektowy:

- S3,
- Cloudflare R2,
- Supabase Storage,
- inny kompatybilny storage.

Wymagania produkcyjne:

- prywatne buckety,
- signed URL tylko po autoryzacji,
- limity rozmiaru,
- walidacja MIME + magic bytes,
- opcjonalny skan antywirusowy,
- lifecycle policy / retencja.

## API

Proponowane endpointy MVP:

```http
GET    /api/listings/:listingId/documents
POST   /api/listings/:listingId/documents
PATCH  /api/listings/:listingId/documents/:documentId
DELETE /api/listings/:listingId/documents/:documentId
GET    /api/listings/:listingId/documents/:documentId/download
GET    /api/listings/:listingId/documents/checklist
```

### `GET /documents`

Zwraca dokumenty oferty dostępnej dla zalogowanego agenta.

Response:

```ts
{
  documents: ListingDocumentDto[];
  checklist: ListingDocumentChecklistItem[];
}
```

### `POST /documents`

Multipart upload.

Pola:

- `file`,
- `category`,
- `displayName?`,
- `status?`,
- `note?`,
- `dueDate?`,
- `expiresAt?`.

Walidacje:

- oferta musi należeć do agenta albo do dostępnego scope,
- plik wymagany,
- kategoria wymagana,
- rozmiar w limicie,
- typ pliku dozwolony,
- magic bytes zgodne z typem,
- brak publicznego URL-a w odpowiedzi.

### `PATCH /documents/:documentId`

Można zmienić:

- `category`,
- `displayName`,
- `status`,
- `note`,
- `dueDate`,
- `expiresAt`.

Nie zmieniamy pliku w tym endpointcie. Podmiana pliku powinna być osobnym
uploadem albo wersjonowaniem w przyszłości.

### `DELETE /documents/:documentId`

Soft delete.

W MVP dokument znika z listy, a event `deleted` trafia do logu.

### `GET /download`

Pobranie pliku przez backend po autoryzacji.

W produkcji może zwracać signed URL, ale dopiero po sprawdzeniu dostępu.

## Frontend

### Miejsce w UI

Pierwsze miejsce:

- szczegóły oferty w dashboardzie,
- osobna sekcja/karta `Dokumenty`.

Później:

- zakładka `Dokumenty` w sidebarze,
- dashboard "Dokumenty wymagające działania",
- dokumenty w transakcji.

### Widok szczegółów oferty

Sekcja powinna zawierać:

- summary:
  - kompletność checklisty,
  - liczba zaakceptowanych dokumentów,
  - liczba brakujących,
  - liczba wymagających poprawy,
- upload dokumentu,
- lista dokumentów,
- status/kategoria,
- terminy,
- akcje:
  - pobierz,
  - edytuj metadane,
  - usuń,
  - oznacz jako zaakceptowany,
  - oznacz jako wymaga poprawy.

### Checklist

Checklist pokazuje wymagane kategorie, nawet jeśli nie ma pliku.

Przykład:

| Dokument | Status | Akcja |
| --- | --- | --- |
| Umowa pośrednictwa | Brak | Dodaj |
| Księga wieczysta | Dodany | Sprawdź |
| Świadectwo energetyczne | Wymaga poprawy | Popraw |

### Empty state

Jeśli oferta nie ma dokumentów:

- nie pokazujemy pustej tabeli,
- pokazujemy krótki opis wartości modułu,
- CTA `Dodaj pierwszy dokument`.

## Bezpieczeństwo

To moduł wysokiego ryzyka, bo dokumenty mogą zawierać dane osobowe i dane
majątkowe.

Wymagania minimalne:

- endpointy tylko po auth,
- dokument dostępny tylko w scope agenta,
- brak dokumentów w publicznym API ofert,
- brak dokumentów w SEO metadata/JSON-LD/Open Graph,
- brak danych dokumentów w analytics eventach,
- walidacja typu i rozmiaru,
- magic bytes validation,
- generowane nazwy plików,
- brak path traversal,
- log upload/delete/status change,
- soft delete,
- limity liczby dokumentów na ofertę i rozmiaru per dokument.

Rekomendowane limity MVP:

- maks. `25` dokumentów na ofertę,
- maks. `15 MB` na dokument,
- dozwolone typy:
  - PDF,
  - JPG/JPEG,
  - PNG,
  - DOC/DOCX tylko jeśli mamy jasną walidację i politykę bezpieczeństwa.

Rekomendacja: w pierwszym MVP dopuścić `PDF`, `JPG`, `PNG`. Formatów Office nie
dodawać, dopóki nie mamy stabilnej polityki walidacji i skanowania.

## Prywatność i retencja

Do decyzji przed produkcją:

- jak długo trzymamy dokumenty po usunięciu oferty,
- czy soft-deleted dokumenty są fizycznie usuwane po X dniach,
- czy agent może pobrać paczkę dokumentów przed usunięciem konta,
- czy dokumenty są objęte eksportem danych,
- kto odpowiada za treść dokumentów: agent/agencja jako administrator danych,
  aplikacja jako dostawca narzędzia.

Minimalny zapis do polityki prywatności:

- jakie dokumenty mogą być przechowywane,
- kto ma do nich dostęp,
- w jakim celu są przetwarzane,
- jak można je usunąć.

## Iteracje wdrożeniowe

### D1. Model danych i enumy

Status: TODO

Zakres:

- dodać enum `ListingDocumentCategory`,
- dodać enum `ListingDocumentStatus`,
- dodać encję `ListingDocument`,
- dodać encję `ListingDocumentEvent`,
- zarejestrować encje w module API,
- przygotować relacje do `Listing`, `Agent`, `User`.

Akceptacja:

- backend kompiluje się,
- dokument ma `agentId` i `listingId`,
- soft delete jest przewidziany,
- publiczne typy listingów nie zawierają dokumentów.

### D2. Serwis dostępu i scope bezpieczeństwa

Status: TODO

Zakres:

- utworzyć `ListingDocumentsService`,
- dodać helper `assertListingDocumentAccess`,
- sprawdzać, czy listing należy do agenta,
- przygotować bazowe metody:
  - list,
  - get,
  - create metadata,
  - update metadata,
  - delete.

Akceptacja:

- agent nie może pobrać dokumentów cudzej oferty,
- brak dokumentu/cudzy dokument zwraca bezpieczny błąd,
- testy pokrywają owner-scope.

### D3. Upload plików

Status: TODO

Zakres:

- endpoint multipart upload,
- walidacja rozmiaru,
- walidacja MIME,
- magic bytes validation,
- generowanie storage key,
- zapis pliku,
- zapis metadanych,
- event `uploaded`.

Akceptacja:

- PDF/JPG/PNG zapisują się poprawnie,
- niedozwolony typ jest odrzucany,
- za duży plik jest odrzucany,
- odpowiedź nie zawiera publicznej ścieżki pliku.

### D4. Lista, edycja, usuwanie i pobieranie

Status: TODO

Zakres:

- `GET /documents`,
- `PATCH /documents/:documentId`,
- `DELETE /documents/:documentId`,
- `GET /download`,
- eventy:
  - `metadata_updated`,
  - `status_changed`,
  - `deleted`,
  - opcjonalnie `downloaded`.

Akceptacja:

- można zmienić status dokumentu,
- można usunąć dokument,
- można pobrać dokument tylko po autoryzacji,
- soft deleted dokument nie pojawia się na liście.

### D5. Checklist kompletności

Status: TODO

Zakres:

- statyczna konfiguracja wymaganych dokumentów,
- endpoint checklisty,
- liczenie:
  - wymagane,
  - dodane,
  - zaakceptowane,
  - brakujące,
  - wymagające poprawy,
- summary kompletności.

Akceptacja:

- oferta bez dokumentów pokazuje wszystkie wymagane jako brakujące,
- dodanie dokumentu aktualizuje checklistę,
- status `approved` zwiększa kompletność.

### D6. UI w szczegółach oferty

Status: TODO

Zakres:

- komponent `ListingDocumentsPanel`,
- summary kompletności,
- upload dokumentu,
- lista dokumentów,
- status badge,
- edycja metadanych,
- usuwanie,
- pobieranie.

Akceptacja:

- agent może obsłużyć dokumenty bez opuszczania szczegółów oferty,
- empty state jest czytelny,
- błędy uploadu są pokazane użytkownikowi,
- UI działa w dark theme.

### D7. Powiadomienia i dashboard

Status: TODO

Zakres:

- powiadomienia o:
  - dokumentach po terminie,
  - dokumentach wymagających poprawy,
  - brakujących wymaganych dokumentach przy aktywnej ofercie,
- mały widget w dashboardzie:
  - `Dokumenty wymagające uwagi`.

Akceptacja:

- agent widzi dokumenty wymagające działania,
- powiadomienie prowadzi do szczegółów oferty,
- nie generujemy powiadomień dla usuniętych dokumentów.

### D8. Testy, QA i release readiness

Status: TODO

Zakres:

- testy jednostkowe walidacji uploadu,
- testy serwisu scope,
- testy public privacy,
- type-check API i web,
- manual QA,
- aktualizacja polityki prywatności, jeśli moduł trafi na produkcję.

Akceptacja:

- testy przechodzą,
- dokumenty nie są publiczne,
- dokumenty nie trafiają do analytics,
- release gate zamknięty.

## API test matrix

| ID | Scenariusz | Oczekiwany wynik |
| --- | --- | --- |
| API-DOC-01 | Agent listuje dokumenty swojej oferty. | `200`, lista dokumentów. |
| API-DOC-02 | Agent listuje dokumenty cudzej oferty. | `403` albo `404`, bez wycieku danych. |
| API-DOC-03 | Upload PDF. | Dokument zapisany, event `uploaded`. |
| API-DOC-04 | Upload niedozwolonego typu. | `400`, plik nie jest zapisany. |
| API-DOC-05 | Upload zbyt dużego pliku. | `400`, plik nie jest zapisany. |
| API-DOC-06 | Zmiana statusu dokumentu. | Status zmieniony, event zapisany. |
| API-DOC-07 | Soft delete dokumentu. | Dokument znika z listy. |
| API-DOC-08 | Pobranie dokumentu po auth. | Plik zwrócony albo signed URL. |
| API-DOC-09 | Pobranie cudzej oferty. | `403` albo `404`. |
| API-DOC-10 | Publiczny endpoint oferty. | Brak danych dokumentów. |

## Manual QA

| ID | Scenariusz | Oczekiwany wynik | Status |
| --- | --- | --- | --- |
| QA-DOC-01 | Dodaj PDF do oferty. | Dokument pojawia się na liście. | TODO |
| QA-DOC-02 | Dodaj JPG/PNG do oferty. | Dokument pojawia się na liście. | TODO |
| QA-DOC-03 | Dodaj plik niedozwolony. | Upload jest odrzucony z jasnym komunikatem. | TODO |
| QA-DOC-04 | Zmień kategorię dokumentu. | Lista i checklist aktualizują kategorię. | TODO |
| QA-DOC-05 | Zmień status na `approved`. | Kompletność checklisty rośnie. | TODO |
| QA-DOC-06 | Oznacz dokument jako `needs_correction`. | Dokument pojawia się jako wymagający działania. | TODO |
| QA-DOC-07 | Usuń dokument. | Dokument znika, oferta zostaje. | TODO |
| QA-DOC-08 | Pobierz dokument. | Pobranie działa tylko po zalogowaniu. | TODO |
| QA-DOC-09 | Otwórz publiczną ofertę. | Dokumenty nie są widoczne. | TODO |
| QA-DOC-10 | Sprawdź mobile i dark theme. | Panel jest czytelny i używalny. | TODO |

## Release gate

Nie wypuszczamy modułu dokumentów na produkcję, dopóki:

- [ ] dokumenty są prywatne i scope jest testowany,
- [ ] upload waliduje typ, rozmiar i magic bytes,
- [ ] pliki nie są dostępne publicznym URL-em,
- [ ] publiczne endpointy ofert nie zwracają dokumentów,
- [ ] usuwanie jest soft delete albo ma jasno opisaną retencję,
- [ ] zdarzenia upload/update/delete są logowane,
- [ ] type-check API i web przechodzą,
- [ ] testy uploadu i access scope przechodzą,
- [ ] manual QA `QA-DOC-01` - `QA-DOC-10` ma status `PASS` albo świadome `N/A`,
- [ ] polityka prywatności uwzględnia przechowywanie dokumentów, jeśli moduł
  trafia do produkcji.

## Otwarte decyzje

- Czy w MVP dokumenty przechowujemy lokalnie, czy od razu wdrażamy S3/R2?
- Czy pobranie pliku ma iść przez backend stream, czy signed URL?
- Czy soft delete ma mieć automatyczne fizyczne czyszczenie po X dniach?
- Czy dokumenty mogą być przypinane tylko do ofert, czy od razu też do klientów?
- Czy wymagane dokumenty zależą od typu transakcji już w MVP?
- Czy dopuszczamy DOC/DOCX, czy zaczynamy tylko od PDF/JPG/PNG?
- Czy agent może dodać dokument bez pliku jako placeholder `requested/missing`?

## Rekomendacja startowa

Najbezpieczniejszy pierwszy krok:

1. Zrobić `D1-D2` bez uploadu plików, aby ustabilizować model, scope i checklistę.
2. Dopiero potem dodać upload w `D3`, bo to największy obszar ryzyka
   bezpieczeństwa.
3. UI budować po gotowym kontrakcie API, zaczynając od szczegółów oferty.

Taka kolejność ogranicza ryzyko, że zaczniemy od uploadu bez gotowego modelu
uprawnień i retencji.
