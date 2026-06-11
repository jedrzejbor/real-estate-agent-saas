# Agent workflow feature opportunities

Data: 2026-06-11

Cel dokumentu: zebrać funkcje, które mogą realnie ułatwić codzienną pracę
pojedynczego agenta nieruchomości, a później także małego zespołu/agencji.

Ten dokument nie jest sprintem implementacyjnym. To backlog produktowy i analiza
obszarów, które warto rozważyć po domknięciu obecnych tematów: oferty, klienci,
kalendarz, publiczne leady, raporty, prowizje i bezpieczeństwo.

## Kontekst obecnej aplikacji

Mamy już fundamenty operacyjne:

- CRM klientów i leadów,
- oferty prywatne i publiczne,
- formularze publiczne i publiczny katalog,
- kalendarz spotkań,
- raporty,
- prowizje agenta przy ofertach,
- raport `Zarobki`,
- onboarding i powiadomienia,
- podstawy legal/privacy/cookies.

Największa luka produktowa na kolejny etap to przejście od "CRM z ofertami" do
"centrum pracy agenta", czyli miejsca, które pomaga prowadzić transakcję od
pierwszego kontaktu do zamknięcia, pilnuje dokumentów, terminów, komunikacji i
ryzyk.

## Jak wygląda praca agenta w praktyce

Typowy agent pracuje równolegle na kilku strumieniach:

1. Pozyskanie oferty:
   - kontakt z właścicielem,
   - analiza nieruchomości,
   - zebranie dokumentów,
   - podpisanie umowy pośrednictwa,
   - przygotowanie zdjęć/opisu/ceny,
   - publikacja i dystrybucja.

2. Obsługa kupujących/najemców:
   - zbieranie preferencji,
   - dopasowanie ofert,
   - umawianie prezentacji,
   - follow-up po prezentacji,
   - negocjacje.

3. Prowadzenie transakcji:
   - oferta cenowa,
   - rezerwacja,
   - komplet dokumentów,
   - kredyt/notariusz/zaświadczenia,
   - terminy warunków,
   - protokół zdawczo-odbiorczy,
   - prowizja i zamknięcie.

4. Administracja i compliance:
   - zgody marketingowe i kontaktowe,
   - historia komunikacji,
   - dokumenty i wersje,
   - ryzyka prawne,
   - obowiązki RODO/retencji,
   - potencjalnie AML/KYC dla wybranych procesów.

5. Rozwój sprzedaży:
   - reaktywacja starych leadów,
   - newsletter/oferty podobne,
   - rekomendacje,
   - raport efektywności źródeł,
   - analiza zarobków.

## Priorytet 1: Zarządzanie dokumentami ofert i transakcji

To najważniejszy kandydat na kolejny duży moduł.

Problem:

- dokumenty są często w mailach, dyskach, komunikatorach i folderach lokalnych,
- agent musi pamiętać, czego brakuje,
- przy wielu ofertach łatwo zgubić terminy lub wersje,
- dokumenty są wrażliwe, więc wymagają kontroli dostępu, retencji i audytu.

Proponowany moduł: `Dokumenty`

Zakres MVP:

- prywatna biblioteka dokumentów przy:
  - ofercie,
  - kliencie,
  - transakcji, gdy dodamy osobny model transakcji,
- kategorie dokumentów:
  - umowa pośrednictwa,
  - księga wieczysta / numer KW,
  - akt własności,
  - zaświadczenie o niezaleganiu,
  - dokumenty wspólnoty/spółdzielni,
  - rzut lokalu,
  - świadectwo energetyczne,
  - protokół zdawczo-odbiorczy,
  - inne,
- status dokumentu:
  - `brak`,
  - `oczekuje`,
  - `dodany`,
  - `do weryfikacji`,
  - `zaakceptowany`,
  - `wymaga poprawy`,
- upload plików z walidacją typu i rozmiaru,
- notatka do dokumentu,
- data ważności / termin dostarczenia,
- widoczność: tylko agent w dashboardzie,
- historia zmian i usunięć,
- szybki checklist kompletności dokumentów przy ofercie.

Zakres późniejszy:

- OCR i ekstrakcja danych z dokumentów,
- wykrywanie braków i niespójności, np. inny adres w dokumencie niż w ofercie,
- wersjonowanie dokumentów,
- bezpieczne udostępnianie linkiem czasowym klientowi/notariuszowi,
- podpis elektroniczny przez integrację z zewnętrznym dostawcą,
- szablony paczek dokumentów dla sprzedaży/najmu,
- automatyczne przypomnienia o brakujących dokumentach.

Ryzyka i wymagania:

- potrzebny storage obiektowy produkcyjnie, np. S3/R2,
- szyfrowanie lub przynajmniej restrykcyjna kontrola dostępu,
- log dostępu do dokumentów,
- polityka retencji,
- skan antywirusowy przy uploadzie,
- jasne rozdzielenie dokumentów publicznych i prywatnych.

Proponowany pierwszy sprint:

- `D1. Model dokumentu i storage`
- `D2. Upload/lista/usuwanie dokumentów przy ofercie`
- `D3. Kategorie i statusy dokumentów`
- `D4. Checklist kompletności dokumentów oferty`
- `D5. Bezpieczeństwo: walidacja, limity, private access, audit`

## Priorytet 2: Pipeline transakcji

Obecnie mamy statusy ofert i klientów, ale brakuje bytu, który reprezentuje
konkretną transakcję.

Problem:

- status oferty `sold/rented` to za mało,
- agent potrzebuje widzieć proces: rezerwacja, umowa przedwstępna, kredyt,
  notariusz, odbiór, prowizja,
- transakcja łączy ofertę, sprzedającego, kupującego/najemcę, dokumenty,
  terminy i prowizję.

Proponowany moduł: `Transakcje`

Zakres MVP:

- model `Transaction` powiązany z:
  - ofertą,
  - klientem kupującym/najemcą,
  - opcjonalnie sprzedającym/właścicielem,
  - agentem,
- statusy:
  - `lead_offer`,
  - `negotiation`,
  - `reserved`,
  - `preliminary_agreement`,
  - `financing`,
  - `notary_scheduled`,
  - `closed_won`,
  - `closed_lost`,
- wartość transakcji,
- szacowana/ustalona prowizja,
- checklist zadań,
- terminy krytyczne,
- notatki i historia.

Funkcje wartościowe:

- osobna tablica pipeline transakcji,
- automatyczne przenoszenie prowizji do raportu `Zarobki` po `closed_won`,
- deadline tracker,
- widok "co blokuje zamknięcie",
- powiadomienia o zbliżających się terminach.

## Priorytet 3: Zadania, checklisty i automatyzacje follow-up

Problem:

- agent często traci czas na pamiętanie o kolejnych krokach,
- lead bez follow-upu szybko stygnie,
- po prezentacji trzeba wrócić do klienta, właściciela i czasem zaplanować kolejne
  działanie.

Proponowany moduł: `Zadania`

Zakres MVP:

- zadania powiązane z ofertą, klientem, spotkaniem albo transakcją,
- priorytet i termin,
- status `todo/done/cancelled`,
- szybkie akcje:
  - zadzwoń,
  - wyślij wiadomość,
  - poproś o dokument,
  - umów prezentację,
  - wykonaj follow-up,
- automatyczne zadania po zdarzeniach:
  - nowy lead -> skontaktuj się w 15 min,
  - spotkanie zakończone -> follow-up następnego dnia,
  - oferta bez zdjęć -> dodaj zdjęcia,
  - aktywna oferta bez prowizji -> uzupełnij prowizję,
  - transakcja w rezerwacji -> sprawdź dokumenty.

Wartość:

- mniej utraconych leadów,
- mniej ręcznego planowania,
- lepszy onboarding nowych agentów,
- naturalny fundament pod automatyzacje i AI.

## Priorytet 4: Centrum komunikacji

Problem:

- komunikacja z klientem jest rozproszona między telefonem, mailem, SMS,
  WhatsAppem i notatkami,
- agent nie widzi pełnej historii kontaktu przy kliencie/ofercie.

Zakres MVP:

- log aktywności komunikacyjnej:
  - telefon,
  - email,
  - SMS,
  - WhatsApp/inny komunikator jako ręczna notatka,
- szablony wiadomości:
  - odpowiedź na lead,
  - propozycja terminu prezentacji,
  - follow-up po prezentacji,
  - prośba o dokumenty,
  - informacja o zmianie ceny,
  - podsumowanie oferty podobnej,
- szybkie kopiowanie wiadomości,
- automatyczne przypomnienie, jeśli lead nie ma kontaktu po X godzinach.

Zakres późniejszy:

- integracja Gmail/Outlook,
- integracja SMS,
- automatyczna synchronizacja historii maili,
- AI rewriting wiadomości,
- scoring jakości follow-upu.

## Priorytet 5: Dopasowanie klientów do ofert

Problem:

- agent ręcznie pamięta, który klient szuka jakiego mieszkania,
- nowe oferty nie są automatycznie zestawiane z bazą klientów.

Zakres MVP:

- preferencje klienta:
  - lokalizacja,
  - budżet,
  - metraż,
  - pokoje,
  - typ nieruchomości,
  - zakup/najem,
- karta `Pasujące oferty` przy kliencie,
- karta `Pasujący klienci` przy ofercie,
- prosty scoring dopasowania,
- akcja: "wyślij propozycję oferty".

Zakres późniejszy:

- alerty po dodaniu nowej oferty,
- kampanie do segmentów klientów,
- AI rekomendacje argumentów sprzedażowych,
- scoring gotowości klienta.

## Priorytet 6: Portal klienta / właściciela

Problem:

- właściciel nieruchomości pyta o status sprzedaży, liczbę zapytań i działania
  agenta,
- agent musi ręcznie raportować postępy.

Zakres MVP:

- prywatny link dla właściciela oferty,
- widok:
  - status oferty,
  - liczba odsłon,
  - liczba leadów,
  - zaplanowane prezentacje,
  - wykonane działania,
  - dokumenty do dosłania,
- możliwość przesłania brakującego dokumentu przez właściciela,
- komentarz/agregat tygodniowy od agenta.

Ważne:

- link musi być bezpieczny, wygasający albo chroniony tokenem,
- właściciel nie widzi danych innych klientów,
- dokumenty wymagają osobnych uprawnień i audytu.

## Priorytet 7: Przygotowanie oferty i marketing

Mamy już asystenta opisu oferty i publikację publiczną. Możemy rozwinąć to w
narzędzia, które skracają czas przygotowania materiałów.

Pomysły:

- checklist jakości oferty:
  - zdjęcia,
  - opis,
  - cena,
  - lokalizacja,
  - parametry,
  - SEO,
  - dokumenty,
- warianty opisu:
  - portalowy,
  - elegancki,
  - krótki SMS,
  - social media,
  - opis premium,
- generator postów social,
- generator krótkiej wiadomości do klientów,
- scoring atrakcyjności oferty,
- sugestie brakujących danych,
- rekomendacja obniżki ceny po braku leadów/odsłon.

## Priorytet 8: Prezentacje nieruchomości

Problem:

- agent organizuje wiele prezentacji i potrzebuje szybkich notatek po spotkaniu.

Pomysły:

- scenariusz prezentacji,
- lista pytań klienta,
- notatka po prezentacji,
- status klienta po prezentacji:
  - zainteresowany,
  - do negocjacji,
  - odrzucone,
  - potrzebuje podobnych ofert,
- szybki follow-up,
- trasa dnia prezentacji,
- karta "dzisiejsze prezentacje".

## Priorytet 9: Analiza ceny i wycena

Problem:

- agent musi uzasadnić cenę właścicielowi,
- brak danych porównawczych utrudnia rozmowę o obniżce.

Zakres MVP bez integracji z zewnętrznymi bazami:

- historia zmian ceny oferty,
- notatka z uzasadnieniem ceny,
- porównanie do własnych podobnych ofert,
- raport aktywności po cenie:
  - odsłony,
  - leady,
  - prezentacje,
  - dni na rynku.

Zakres późniejszy:

- integracje z portalami,
- import porównywalnych ofert,
- rekomendacje ceny,
- raport PDF dla właściciela.

## Priorytet 10: Raport dnia / centrum pracy

Obecny dashboard pokazuje stan, ale można go rozwinąć w "co mam zrobić dziś".

Zakres:

- zadania na dziś,
- leady bez kontaktu,
- spotkania dzisiaj,
- oferty wymagające uzupełnienia,
- dokumenty oczekujące,
- transakcje z deadline w 7 dni,
- najważniejsza szansa sprzedażowa,
- szybki przycisk: "zaplanuj dzień".

To może być bardzo mocna funkcja retencyjna, bo agent zaczyna dzień w aplikacji.

## Priorytet 11: Compliance, zgody i ryzyka

To nie musi być pierwszy moduł, ale powinno być uwzględnione w architekturze.

Obszary:

- zgody kontaktowe i marketingowe,
- historia podstawy kontaktu,
- retencja danych leadów,
- log kto widział/pobrał dokument,
- checklist "czy można opublikować ofertę",
- flagi ryzyka:
  - brak zgody właściciela,
  - brak dokumentu,
  - niezweryfikowana oferta,
  - potencjalny duplikat,
  - publiczna oferta bez pełnych danych.

Uwaga: szczegóły prawne i AML należy konsultować z prawnikiem/compliance przed
wdrożeniem jako funkcji deklarującej zgodność.

## Priorytet 12: Integracje

Integracje warto robić dopiero, gdy core workflow jest stabilny.

Najbardziej wartościowe:

- email: Gmail/Outlook,
- kalendarz: Google Calendar/Outlook,
- SMS,
- podpis elektroniczny,
- storage dokumentów,
- portale ogłoszeniowe,
- mapy i geokodowanie,
- systemy płatności/subskrypcji,
- eksport księgowy prowizji.

## Priorytet 13: AI jako asystent pracy agenta

AI powinno działać jako przyspieszenie workflow, nie jako dekoracja.

Najlepsze zastosowania:

- streszczenie historii klienta,
- propozycja następnego kroku,
- wykrywanie braków w ofercie,
- przygotowanie follow-upu,
- analiza notatek po prezentacji,
- pytania do dokumentów, gdy dodamy dokument management,
- porównanie danych z dokumentu z danymi oferty,
- generowanie raportu tygodniowego dla właściciela,
- generowanie checklist transakcyjnych.

Zasady bezpieczeństwa:

- AI nie powinno wysyłać wiadomości bez potwierdzenia agenta,
- AI nie powinno ujawniać prowizji ani danych dokumentów w publicznych kanałach,
- odpowiedzi dotyczące dokumentów muszą mieć źródło/cytat z dokumentu,
- działania AI powinny być audytowalne.

## Rekomendowana kolejność po obecnym zakresie

### Etap A: Dokumenty przy ofercie

Największy wpływ operacyjny i dobry fundament pod transakcje.

Zakres:

- model dokumentu,
- upload prywatny,
- kategorie,
- statusy,
- checklist kompletności,
- security/audit.

### Etap B: Zadania i follow-up

Największy wpływ na codzienną aktywność i retencję.

Zakres:

- task model,
- zadania przy kliencie/ofercie/spotkaniu,
- automatyczne zadania po zdarzeniach,
- widok "Dzisiaj".

### Etap C: Pipeline transakcji

Fundament pod zamknięcia, zarobki, dokumenty końcowe i raporty.

Zakres:

- model transakcji,
- statusy,
- terminy,
- powiązania z dokumentami,
- zamknięcie prowizji.

### Etap D: Komunikacja i szablony

Szybka wartość dla agenta bez dużych integracji.

Zakres:

- log kontaktu,
- szablony wiadomości,
- ręczne wpisy komunikacji,
- follow-up reminders.

### Etap E: Dopasowanie ofert do klientów

Zwiększa konwersję i wykorzystuje dane CRM.

Zakres:

- scoring dopasowania,
- pasujące oferty przy kliencie,
- pasujący klienci przy ofercie,
- wysyłka propozycji.

## Proponowany pierwszy konkretny sprint: `DOCUMENTS-1`

Cel sprintu:

Agent może przechowywać i kontrolować prywatne dokumenty oferty, widzieć braki i
bezpiecznie zarządzać podstawowym zestawem plików.

Zakres:

1. Backend:
   - encja `ListingDocument`,
   - endpointy CRUD,
   - upload pliku,
   - walidacja typu/rozmiaru,
   - powiązanie z `listingId` i `agentId`,
   - kategorie i statusy,
   - private access guard.

2. Frontend:
   - sekcja `Dokumenty` w szczegółach oferty,
   - upload,
   - lista dokumentów,
   - zmiana kategorii/statusu,
   - usuwanie,
   - empty state,
   - checklist kompletności.

3. Bezpieczeństwo:
   - brak publicznej ekspozycji,
   - limit rozmiaru,
   - magic bytes validation,
   - docelowo storage obiektowy,
   - log zdarzeń upload/delete/status change.

4. Testy:
   - agent widzi tylko swoje dokumenty,
   - upload odrzuca niedozwolony typ,
   - dokument nie pojawia się w publicznym API,
   - checklist poprawnie liczy statusy,
   - usunięcie dokumentu nie usuwa oferty.

Manual QA:

| ID | Scenariusz | Oczekiwany wynik |
| --- | --- | --- |
| DOC-01 | Dodaj dokument do oferty. | Dokument pojawia się na liście i jest prywatny. |
| DOC-02 | Zmień kategorię i status dokumentu. | Checklist aktualizuje kompletność. |
| DOC-03 | Spróbuj dodać niedozwolony plik. | Upload jest odrzucony. |
| DOC-04 | Otwórz publiczną stronę oferty. | Dokument nie jest widoczny ani zwracany w API. |
| DOC-05 | Usuń dokument. | Dokument znika z listy, oferta zostaje bez zmian. |

## Proponowane metryki sukcesu

- procent ofert z kompletem dokumentów,
- średni czas od dodania oferty do publikacji,
- liczba leadów bez follow-upu po 24h,
- liczba transakcji z opóźnionym zadaniem,
- liczba ofert z uzupełnioną prowizją,
- liczba zamkniętych transakcji w okresie,
- szacowana prowizja zamknięta,
- liczba dokumentów odrzuconych przez walidację,
- liczba brakujących dokumentów na aktywną ofertę.

## Źródła i inspiracje produktowe

- Nowoczesne CRM-y dla agentów nieruchomości zwykle łączą lead management,
  listing management, automatyzacje, raporty i mobile workflow.
- Systemy transaction management skupiają się na dokumentach, deadline'ach,
  compliance i komunikacji między stronami.
- Coraz częściej narzędzia CRM dodają AI do priorytetyzacji leadów,
  przygotowania komunikacji i automatyzacji powtarzalnych zadań.

## Decyzja rekomendowana

Najlepszy następny duży kierunek to:

1. `Dokumenty przy ofercie`.
2. `Zadania i follow-up`.
3. `Pipeline transakcji`.

Taka kolejność jest najbezpieczniejsza technicznie i produktowo, bo dokumenty i
zadania są potrzebne niezależnie od tego, jak później zaprojektujemy pełne
transakcje agencyjne.
