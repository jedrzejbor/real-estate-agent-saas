# Cennik klientów indywidualnych, wyróżnienia i promocje

> Status: decyzje produktowe Etapu 0 zaakceptowane; kwestie księgowo-prawne
> pozostają warunkiem publicznego uruchomienia
> Data utworzenia: 2026-09-04
> Ostatnia aktualizacja: 2026-09-07
> Zakres: strona główna, pełny cennik, ścieżka prywatnego sprzedającego,
> płatności oraz zarządzanie ofertą handlową w panelu administratora

## 1. Cel

Rozbudować obecny cennik abonamentów dla agentów i biur o osobną ofertę dla
osób prywatnych, które chcą opublikować i promować pojedyncze ogłoszenie.

Rozwiązanie powinno:

- jasno rozdzielać abonament dla profesjonalistów od jednorazowej płatności za
  ogłoszenie prywatne;
- pozwalać użytkownikowi szybko poznać cenę całkowitą i czas publikacji;
- prowadzić bezpośrednio do dodania ogłoszenia albo rejestracji agenta;
- pozwalać administratorowi zmieniać ceny i widoczność produktów bez deployu;
- obsługiwać płatne wyróżnienia, odnowienia, promocje automatyczne, ręczne
  rabaty na konkretne ogłoszenie i kody promocyjne;
- zachowywać historię ceny, rabatów, płatności i ręcznych działań admina.

## 2. Stan obecny i punkty integracji

W projekcie istnieją już elementy, które należy rozszerzyć:

- sekcja cennika na stronie głównej:
  `apps/web/src/components/marketing/home-pricing-section.tsx`;
- pełna strona `/cennik`:
  `apps/web/src/app/(marketing)/cennik/page.tsx`;
- publiczny katalog abonamentów `GET /api/plans` oparty o `plan_catalog`;
- edycja planów agentów w `/dashboard/admin/plans`;
- publiczny wizard `/dodaj-oferte`, moderacja zgłoszeń i panel `/seller`;
- pola `publishedAt`, `expiresAt` i `isPremium` w encji `Listing`;
- istniejąca obsługa zdarzeń subskrypcji w module `billing`.

`plan_catalog` pozostaje źródłem prawdy wyłącznie dla abonamentów agentów i
biur. Produkty dla sprzedających prywatnie są jednorazowe i wymagają osobnego
katalogu, zamówień oraz uprawnień przypisanych do ogłoszenia.

## 3. Proponowana oferta startowa

Na start rekomendowany jest jeden prosty wariant publikacji oraz dodatki. Nie
tworzymy trzech sztucznie różniących się pakietów ogłoszenia, dopóki dane nie
potwierdzą takiej potrzeby.

| Produkt | Cena startowa brutto | Okres | Zastosowanie |
|---|---:|---:|---|
| Publikacja ogłoszenia | 49 zł | 60 dni | pierwsza publikacja zaakceptowanej oferty |
| Odnowienie | 39 zł | +60 dni | przedłużenie tej samej oferty |
| Wyróżnienie | 19 zł | 7 dni | mocniejsze oznaczenie i wyższa pozycja w katalogu |
| Wyróżnienie Plus | 29 zł | 14 dni | dłuższe wyróżnienie i wyższy priorytet niż wariant 7-dniowy |

Ceny są hipotezą produktową, nie wartościami zaszytymi w kodzie. Administrator
może je zmienić, ukryć produkt albo zaplanować cenę promocyjną. Wszystkie ceny
dla konsumenta pokazujemy jako brutto z dopiskiem „z VAT”.

### Zasada zarządzania cenami

Ceny publikacji, odnowień i wyróżnień muszą być zarządzane przez administratora
z panelu, analogicznie do istniejącego zarządzania cenami pakietów agentów.

- frontend nie zawiera cen awaryjnych ani hardcodowanych wartości handlowych;
- strona główna, `/cennik`, panel sprzedającego i checkout czytają ten sam
  katalog produktów z backendu;
- administrator może zmienić cenę, okres działania, widoczność i kolejność
  produktu bez deployu;
- zmiana ceny dotyczy wyłącznie nowych wycen i zamówień;
- rozpoczęte zamówienie zachowuje snapshot ceny przez czas ważności wyceny;
- historyczne zamówienia i dokumenty nigdy nie są przeliczane po zmianie ceny;
- brak lub błąd katalogu blokuje zakup zamiast podstawiać wartość z frontendu.

### Poza pierwszym wydaniem

- pakiety 3 lub więcej ogłoszeń dla inwestorów;
- automatyczne podbijanie co kilka dni;
- promocja zależna od miasta lub kategorii;
- dodatkowy limit zdjęć;
- reklama na portalach zewnętrznych;
- abonament dla prywatnego inwestora.

## 4. Prezentacja cennika na stronie głównej

### 4.1 Przełącznik odbiorcy

Nad kartami cenowymi dodajemy główny przełącznik:

`Sprzedaję prywatnie` | `Jestem agentem lub prowadzę biuro`

Domyślnie pokazujemy `Sprzedaję prywatnie`, ponieważ wejście ze strony głównej
ma odpowiadać na najprostszy zamiar konsumencki. Wybór można zapamiętać w URL:

- `/?dla=prywatnych#pricing`;
- `/?dla=agentow#pricing`;
- `/cennik?dla=prywatnych`;
- `/cennik?dla=agentow`.

Parametr URL pozwala prowadzić kampanie do właściwego wariantu i nie wymaga
local storage. Link „Cennik” w nawigacji może domyślnie prowadzić do wariantu
prywatnego, a CTA kierowane do agentów powinny dodawać `dla=agentow`.

Nie łączymy przełącznika odbiorcy z obecnym przełącznikiem miesięcznie/rocznie.
Po wybraniu osoby prywatnej kontrolka okresu abonamentu znika. Po wybraniu
agenta pojawia się obecny wybór `Miesięcznie | Rocznie`.

### 4.2 Widok dla osoby prywatnej

Na stronie głównej pokazujemy:

1. Jedną główną kartę „Opublikuj ogłoszenie na 60 dni” z ceną 49 zł brutto.
2. Krótką listę korzyści: publiczna strona oferty, galeria zdjęć, zapytania od
   zainteresowanych, panel do zarządzania oraz możliwość współpracy z agentem.
3. CTA `Dodaj ogłoszenie`, prowadzące do `/dodaj-oferte`.
4. Obok lub poniżej kompaktowy blok „Zwiększ widoczność” z cenami wyróżnień i
   informacją, że dodatki można wybrać po zaakceptowaniu ogłoszenia.
5. Link `Zobacz pełny cennik i zasady` do `/cennik?dla=prywatnych`.

Nie pokazujemy kodu promocyjnego na stronie głównej. Pole na kod pojawia się w
podsumowaniu zamówienia, gdzie użytkownik natychmiast widzi wynik przeliczenia.

### 4.3 Widok dla agenta

Zachowujemy obecne karty planów pobierane z `GET /api/plans`, wybór okresu
rozliczenia oraz CTA do rejestracji. Zmieniamy tylko nagłówek sekcji tak, aby
pasował do obu grup, np.:

- tytuł: `Prosty cennik, niezależnie jak sprzedajesz`;
- opis: `Opublikuj pojedyncze ogłoszenie lub wybierz narzędzia dla agenta i biura.`

### 4.4 Mobile i dostępność

- przełącznik ma być dwoma prawdziwymi przyciskami z `aria-pressed` albo
  kontrolką zgodną z patternem tabs;
- aktywny wybór nie może być komunikowany wyłącznie kolorem;
- na mobile najpierw cena i CTA, potem korzyści i dodatki;
- zmiana wariantu nie może przesuwać użytkownika na początek strony;
- ładowanie i błąd katalogu prywatnego obsługujemy niezależnie od katalogu
  agentów;
- treść cennika musi być czytelna bez logowania.

## 5. Pełna strona `/cennik`

Pełny cennik używa tego samego przełącznika odbiorcy i tego samego źródła
danych co sekcja na stronie głównej.

Dla osób prywatnych strona zawiera:

- cenę publikacji i okres ważności;
- porównanie publikacji podstawowej oraz dodatków;
- kolejność procesu: dodanie → weryfikacja → akceptacja → płatność → publikacja;
- informację, kiedy naliczana jest opłata i co dzieje się po wygaśnięciu;
- zasady łączenia promocji i użycia kodów;
- FAQ dotyczące moderacji, faktury/paragonu, zwrotu, odnowienia oraz odrzucenia
  ogłoszenia;
- CTA `Dodaj ogłoszenie`.

Cena na stronie marketingowej nigdy nie jest przekazywana jako cena wiążąca do
checkoutu. Checkout pobiera aktualną ofertę z backendu i tworzy niezmienny
snapshot zamówienia.

## 6. Moment wyboru produktu i płatności

Rekomendowany przepływ:

1. Użytkownik tworzy ogłoszenie bez płatności.
2. Potwierdza e-mail lub loguje się do konta sprzedającego.
3. Ogłoszenie przechodzi walidację i moderację.
4. Po akceptacji system ustawia status `awaiting_payment` i wysyła link.
5. Użytkownik widzi podsumowanie publikacji, może dodać wyróżnienie i kod.
6. Backend przelicza cenę oraz pokazuje cenę bazową, każdy rabat i kwotę do
   zapłaty.
7. Użytkownik płaci przez zewnętrznego operatora.
8. Dopiero potwierdzony webhook aktywuje publikację i zakupione wyróżnienia.
9. Użytkownik widzi potwierdzenie, dokument sprzedaży i daty wygaśnięcia.

Nie pobieramy płatności przed moderacją. Ogranicza to liczbę refundów za oferty,
których nie można opublikować.

### Odnowienie i wyróżnienie istniejącej oferty

- odnowienie można kupić z poziomu `/seller/listings/:id`;
- wyróżnienie można kupić dla aktywnej oferty;
- okres wyróżnienia zaczyna się dopiero po potwierdzeniu płatności;
- ponowny zakup wyróżnienia przed końcem powinien przedłużać okres zgodnie z
  regułą produktu, a nie skracać istniejącego okresu;
- wygasłej oferty nie wyróżniamy bez jednoczesnego odnowienia;
- administrator może przyznać publikację lub wyróżnienie bez płatności, ale
  system zapisuje powód i autora operacji.

## 7. Model domenowy i baza danych

Nazwy są robocze, ale rozdział odpowiedzialności powinien zostać zachowany.

### 7.1 `listing_product_catalog`

Katalog jednorazowych produktów dla osób prywatnych:

- `id`, `code`, `name`, `description`;
- `type`: `publication`, `renewal`, `featured`;
- `price_gross_amount` w groszach i `currency` (`PLN`);
- `vat_rate`;
- `publication_days` lub `benefit_days`;
- `featured_tier` / `priority_weight` dla wyróżnień;
- `is_public`, `is_active`, `sort_order`;
- identyfikator ceny u operatora płatności, jeśli będzie wymagany;
- `created_at`, `updated_at`, opcjonalnie `archived_at`.

Kod produktu po pierwszym użyciu jest stabilny. Produkt wykorzystany w
zamówieniu można archiwizować, ale nie usuwać.

### 7.2 `listing_orders` i `listing_order_items`

Zamówienie przypisane do użytkownika i konkretnego ogłoszenia:

- numer zamówienia, `listing_id`, `buyer_user_id`;
- status: `draft`, `pending_payment`, `paid`, `failed`, `cancelled`, `refunded`;
- wartości brutto: bazowa, rabat, końcowa;
- waluta, dane nabywcy oraz wymagane zgody;
- identyfikatory sesji i płatności operatora;
- czas utworzenia, opłacenia, anulowania i zwrotu;
- pozycje ze snapshotem: kod, nazwa, cena, VAT, okres i parametry produktu;
- osobne pozycje rabatowe lub czytelne rozbicie użytych rabatów.

Zamówienie musi być idempotentne: wielokrotny webhook nie może drugi raz
opublikować ani przedłużyć ogłoszenia.

### 7.3 `listing_entitlements`

Uprawnienia wynikające z płatności albo nadania administracyjnego:

- `listing_id`, `type`, `tier`;
- `starts_at`, `ends_at`, `status`;
- `order_item_id` lub `admin_grant_id` jako źródło;
- parametry/snapshot działania dodatku;
- `created_at`, `revoked_at`.

To jest źródło prawdy dla wyróżnienia. Obecne `Listing.isPremium` może w okresie
migracji być polem kompatybilności, ale docelowo widoczność należy wyliczać z
aktywnego entitlementu. Indeks katalogu powinien uwzględniać aktywny tier,
priorytet i datę, z uczciwą rotacją ofert w tym samym poziomie.

### 7.4 `promotion_campaigns`

Automatyczne promocje zarządzane przez administratora:

- nazwa wewnętrzna i opcjonalna etykieta publiczna;
- typ rabatu: procent, stała kwota albo produkt gratis;
- wartość i maksymalny rabat dla promocji procentowej;
- produkty objęte promocją;
- zakres czasu i strefa `Europe/Warsaw` dla prezentacji, zapis czasu w UTC;
- warunki, np. pierwszy zakup, nowe ogłoszenie, wybrana kategoria;
- limit globalny i limit na użytkownika;
- priorytet oraz `is_active`;
- reguła łączenia: domyślnie brak łączenia z kodem.

### 7.5 `promotion_codes` i `promotion_code_redemptions`

Kod promocyjny zawiera:

- znormalizowany unikalny kod, przechowywany bez rozróżniania wielkości liter;
- typ i wartość rabatu;
- datę aktywacji i wygaśnięcia;
- produkty objęte kodem;
- limit wszystkich użyć i limit użyć na użytkownika/e-mail;
- opcjonalną minimalną wartość zamówienia;
- status aktywny/wyłączony;
- opcjonalne przypisanie do kampanii;
- notatkę wewnętrzną i autora.

Każde użycie zapisuje `code_id`, `order_id`, `user_id`, kwotę rabatu i czas.
Limit jest rezerwowany atomowo podczas tworzenia płatności, a zwalniany po
wygaśnięciu nieopłaconej sesji. Nigdy nie opieramy limitu na liczniku wysłanym
przez frontend.

### 7.6 `listing_admin_adjustments`

Ręczna promocja na dane ogłoszenie:

- `listing_id`, rodzaj: rabat, publikacja gratis, wyróżnienie gratis,
  przedłużenie;
- wartość lub liczba dni;
- status i okres ważności;
- obowiązkowy powód;
- administrator, który utworzył/anulował zmianę;
- powiązane zamówienie lub entitlement;
- pełne timestampy.

Ręczna zniżka musi być widoczna w checkout jako osobna pozycja. Nadanie gratis
aktywuje entitlement przez dedykowaną akcję z potwierdzeniem, a nie przez
ustawienie `isPremium = true`.

## 8. Reguły naliczania ceny

Backend jest jedynym źródłem wyniku kalkulacji. Zalecana kolejność:

1. Pobierz aktywne produkty i ich aktualne ceny.
2. Zweryfikuj, czy produkt pasuje do stanu oraz właściciela ogłoszenia.
3. Zastosuj jedną najlepszą automatyczną kampanię, jeśli spełnia warunki.
4. Jeżeli podano kod, domyślnie wybierz korzystniejszy z: kampania lub kod.
5. Zastosuj ręczny rabat przypisany do ogłoszenia zgodnie z jego regułą.
6. Ogranicz cenę końcową do minimum 0 zł.
7. Utwórz snapshot kalkulacji i rezerwację kodu w transakcji bazodanowej.

W V1 promocje nie sumują się, z wyjątkiem jawnie oznaczonej ręcznej korekty
administratora. Interfejs ma wyjaśnić, dlaczego dany kod nie został połączony z
inną promocją.

Zmiana ceny katalogowej nie wpływa na opłacone zamówienia ani aktywne
uprawnienia. Dla rozpoczętego checkoutu cena obowiązuje przez ograniczony czas,
np. 30 minut; potem wymagane jest ponowne przeliczenie.

## 9. API

### Publiczne

- `GET /api/listing-products` — aktywne produkty i aktualne publiczne promocje;
- `POST /api/listing-checkout/quote` — serwerowa wycena koszyka i kodu;
- `POST /api/listing-checkout/sessions` — utworzenie zamówienia i sesji płatności;
- `GET /api/listing-orders/:id` — stan zamówienia dla właściciela;
- webhook operatora płatności w istniejącym module `billing` lub wydzielonym
  podmodule płatności jednorazowych.

### Panel sprzedającego

- lista dostępnych działań i aktywnych wyróżnień dla ogłoszenia;
- historia zamówień i dokumentów;
- ponowienie nieudanej płatności;
- odnowienie i zakup dodatku.

### Panel administratora

- CRUD/archiwizacja produktów ogłoszeniowych;
- CRUD kampanii i kodów;
- lista użyć kodów;
- podgląd i ewentualne anulowanie ręcznych korekt;
- nadanie rabatu, darmowej publikacji, wyróżnienia lub dodatkowych dni dla
  konkretnego ogłoszenia;
- podgląd zamówień, płatności i zwrotów.

Każdy endpoint admina wymaga roli `ADMIN`, walidacji DTO oraz wpisu do logu
aktywności.

## 10. Panel administratora

W nawigacji admina dodajemy grupę `Sprzedaż`:

### 10.1 `Produkty i ceny`

- lista produktów z ceną brutto, czasem działania, statusem i kolejnością;
- formularz edycji z podglądem karty takiej jak w publicznym cenniku;
- publikuj/ukryj oraz archiwizuj;
- ostrzeżenie, że zmiana nie wpływa na istniejące zamówienia;
- historia zmian ceny i autora zmiany.

Obecny ekran `/dashboard/admin/plans` może dostać zakładki:
`Plany agentów | Produkty ogłoszeniowe`, ale backend i modele pozostają osobne.
Jeśli ekran stanie się zbyt rozbudowany, lepsze będą osobne adresy pod wspólną
grupą nawigacji.

### 10.2 `Promocje`

- lista aktywnych, zaplanowanych, zakończonych i wyłączonych kampanii;
- kreator zakresu produktów, czasu, limitów i reguł odbiorców;
- podgląd ceny przed i po promocji;
- wyłączanie kampanii bez usuwania historii;
- walidacja kolizji terminów oraz priorytetów.

### 10.3 `Kody promocyjne`

- tworzenie pojedynczego kodu lub bezpiecznej partii losowych kodów;
- kod własny, typ rabatu, produkty, okres i limity;
- wyszukiwarka oraz filtry po statusie/kampanii;
- liczba rezerwacji, użyć i przychód/rabat przypisany do kodu;
- wyłączenie kodu, bez edycji warunków kodu już użytego;
- eksport CSV dopiero po potwierdzeniu potrzeby operacyjnej.

### 10.4 `Zamówienia`

- numer, kupujący, ogłoszenie, produkty, kwoty, kod, status i daty;
- szczegóły zdarzeń płatności i webhooków;
- link do ogłoszenia oraz profilu sprzedającego;
- akcje refund/anulowanie dopiero po zdefiniowaniu integracji i uprawnień;
- brak ręcznej zmiany statusu `paid` bez kontrolowanej operacji i audytu.

### 10.5 Promocja konkretnego ogłoszenia

Na stronie zgłoszenia w `/dashboard/admin/submissions` i na szczegółach
opublikowanej oferty administrator widzi panel `Cena i promocja`:

- aktualny produkt publikacji, płatność i data wygaśnięcia;
- aktywne oraz przyszłe wyróżnienia;
- przyznaj rabat do najbliższego zamówienia;
- przyznaj publikację/wyróżnienie/dodatkowe dni bez opłaty;
- ustaw termin ważności korekty;
- obowiązkowe pole `Powód` i dialog potwierdzenia;
- historia wszystkich działań.

## 11. Statusy i spójność publikacji

Nie należy przeciążać statusu moderacji stanem płatności. W zgłoszeniu lub
powiązanym procesie potrzebne są osobne informacje:

- wynik moderacji;
- stan płatności;
- stan publikacji;
- aktywne uprawnienia promocyjne.

Przykładowa sekwencja:

`draft → email_verified → in_review → approved/awaiting_payment → paid → published`

Odrzucenie po moderacji kończy proces bez zamówienia. Wygaśnięcie płatności nie
cofa akceptacji; użytkownik może utworzyć nową sesję według aktualnej ceny.

## 12. Bezpieczeństwo, finanse i prawo

- kwot, rabatów i czasu wyróżnienia nie przyjmujemy z frontendu;
- webhook ma weryfikowany podpis, idempotency key i trwały log zdarzeń;
- limity kodów i finalizacja zamówienia używają transakcji oraz blokady w bazie;
- kod nie ujawnia danych o kampanii ani o innych użytkownikach;
- stosujemy rate limiting dla sprawdzania kodów;
- odpowiedź dla błędnego i niedostępnego kodu nie powinna ułatwiać masowego
  zgadywania kodów;
- wszystkie zmiany admina zapisujemy z `admin_user_id`, powodem, stanem przed i
  po zmianie;
- przed uruchomieniem trzeba ustalić regulamin publikacji, politykę zwrotów,
  moment zawarcia umowy, sposób dokumentowania sprzedaży i treść zgód;
- faktura/paragon i stawka VAT wymagają potwierdzenia z księgowością;
- obsługa refundu musi określić wpływ na już rozpoczęte wyróżnienie lub okres
  publikacji.

## 13. Analityka produktowa

Minimalne zdarzenia:

- `pricing_audience_selected`;
- `private_pricing_viewed`;
- `listing_product_selected`;
- `promo_code_applied` / `promo_code_rejected` z kategorią przyczyny, bez kodu
  w danych analitycznych;
- `checkout_started`, `payment_succeeded`, `payment_failed`;
- `listing_published_after_payment`;
- `listing_featured_started`, `listing_featured_expired`;
- `listing_renewal_purchased`.

Raport admina powinien pokazywać:

- przejścia cennik → dodanie oferty → akceptacja → checkout → płatność;
- przychód brutto i liczbę zamówień per produkt;
- średni rabat i wykorzystanie kodów;
- konwersję płatności po akceptacji;
- udział ofert z wyróżnieniem;
- wpływ wyróżnienia na wyświetlenia i zapytania, z zastrzeżeniem korelacji;
- refundy i nieudane płatności.

## 14. Etapy realizacji

Etapy są ułożone według zależności technicznych. Każdy etap powinien zostać
zamknięty jego kryterium odbioru przed rozpoczęciem elementów zależnych. Można
równolegle realizować tylko zadania, które korzystają z już zatwierdzonego
kontraktu API i modelu danych.

Docelowa kolejność zależności:

`decyzje → fundament domenowy → panel produktów → publiczny cennik → kalkulator i zamówienia → płatność i publikacja → wyróżnienia i odnowienia → promocje → ręczne granty → rollout`

### 14.0 Pierwsza iteracja — karta decyzji Etapu 0

Ta iteracja nie wprowadza jeszcze zmian w kodzie produkcyjnym. Jej wynikiem ma
być zamrożony zestaw reguł, na podstawie którego w Etapie 1 powstaną migracje,
encje, kontrakty API oraz testy. Rozpoczęcie modelowania bazy przed zamknięciem
decyzji oznaczonych jako blokujące grozi kosztowną zmianą zamówień i historii
finansowej.

#### 14.0.1 Wynik audytu istniejącego systemu

- `plan_catalog` i publiczny cennik agentów już działają i pozostają osobnym
  kontekstem od jednorazowych produktów ogłoszeniowych.
- Repozytorium jest przygotowywane pod Stripe (`stripe_price_id_*` i plan
  Stripe Checkout), ale Stripe SDK oraz rzeczywisty checkout nie są jeszcze
  wdrożone.
- Istniejący webhook subskrypcji jest provider-agnostic, podpisany HMAC i
  idempotentny po parze `provider + eventId`, ale obsługuje wyłącznie
  subskrypcje agencji. Płatności jednorazowe potrzebują osobnego procesora
  zdarzeń, współdzielącego tylko ogólne wzorce bezpieczeństwa.
- Obecny `PublicListingSubmissionStatus` nie ma stanów moderacji
  `in_review/approved/awaiting_payment`; zawiera m.in. `verified`, `published`,
  `claimed`, `rejected` i `expired`.
- Obecna akcja zatwierdzenia przez administratora od razu ustawia ofertę jako
  opublikowaną i nadaje jej datę wygaśnięcia. Przed uruchomieniem płatności
  trzeba rozdzielić akceptację moderacji od aktywacji publikacji.
- `ListingPublicationStatus` opisuje tylko `draft/published/unpublished`, więc
  nie powinien przejmować statusów zamówienia ani moderacji.
- `Listing.isPremium` jest flagą bez okresu obowiązywania i źródła nadania;
  nie nadaje się jako docelowe źródło prawdy dla płatnego wyróżnienia.
- Aktualny regulamin jest dokumentem MVP i nie opisuje płatnej publikacji,
  prawa odstąpienia, rozpoczęcia świadczenia przed upływem terminu odstąpienia,
  zwrotów ani dokumentów sprzedaży.

#### 14.0.2 Rekomendowany zakres pierwszego wydania handlowego

| Obszar | Rekomendowana decyzja | Uzasadnienie | Status |
|---|---|---|---|
| Publikacja | 49 zł brutto za 60 dni | Prosta oferta i zgodność z wcześniejszą hipotezą produktu | Zatwierdzone 2026-09-06 |
| Odnowienie | 39 zł brutto za kolejne 60 dni | Czytelny bodziec do odnowienia bez tworzenia abonamentu | Zatwierdzone 2026-09-06 |
| Wyróżnienie V1 | Jeden wariant: 19 zł brutto za 7 dni | Mniejszy zakres implementacji i łatwiejsza ocena popytu | Zatwierdzone 2026-09-06 |
| Drugi tier wyróżnienia | Poza V1 | Najpierw zbieramy dane o konwersji pierwszego produktu | Zatwierdzone 2026-09-06 |
| Płatność | Po pozytywnej moderacji, przed publikacją | Brak pobierania pieniędzy za ofertę, której nie zaakceptujemy | Zatwierdzone 2026-09-06 |
| Operator | Stripe jako pierwszy adapter | Jest zgodny z kierunkiem obecnego modelu planów; nie oznacza sprzężenia domeny ze Stripe | Zatwierdzone 2026-09-06 |
| Czas wyceny | 30 minut | Ogranicza długie rezerwacje kodów i nieaktualne ceny | Zatwierdzone 2026-09-06 |
| Waluta V1 | Wyłącznie PLN | Upraszcza ceny, dokumenty i raportowanie | Zatwierdzone 2026-09-06 |
| Łączenie rabatów | Jedna najkorzystniejsza kampania albo kod | Proste i przewidywalne naliczanie | Zatwierdzone 2026-09-06 |
| Ręczna korekta admina | Może łączyć się tylko po jawnym zezwoleniu | Pozwala obsłużyć wyjątek bez ukrytych reguł | Zatwierdzone 2026-09-06 |
| Zakup bez logowania | Nie; checkout wymaga konta właściciela | Bezpieczne powiązanie zamówienia z użytkownikiem i ogłoszeniem | Zatwierdzone 2026-09-06 |
| Cena 0 zł | Wewnętrzna finalizacja bez operatora | Brak sztucznej transakcji płatniczej | Zatwierdzone 2026-09-06 |
| Dane analityczne | Brak treści kodu promocyjnego w eventach | Ogranicza wyciek aktywnych kodów | Zatwierdzone 2026-09-06 |

#### 14.0.3 Rekomendowany przebieg publikacji V1

1. Użytkownik tworzy zgłoszenie i potwierdza adres e-mail.
2. Zalogowany właściciel przejmuje zgłoszenie; jeśli nie ma konta, zakłada je
   przed checkoutem.
3. Administrator rozpoczyna i kończy moderację.
4. Po pozytywnej moderacji zgłoszenie otrzymuje decyzję `approved`, ale oferta
   pozostaje niepubliczna.
5. System tworzy możliwość zakupu publikacji według aktualnego katalogu.
6. Użytkownik akceptuje podsumowanie, wymagane zgody i przechodzi do płatności.
7. Powrót z checkoutu pokazuje tylko stan oczekiwania; nie publikuje oferty.
8. Potwierdzony webhook finalizuje zamówienie i zleca serwisowi entitlementów
   nadanie publikacji na 60 dni.
9. Serwis publikacji ustawia publiczny stan i datę wygaśnięcia dokładnie raz.
10. Nieudana lub wygasła płatność pozostawia zgłoszenie zaakceptowane i pozwala
    utworzyć nową wycenę według aktualnej ceny.

#### 14.0.4 Słownik statusów rekomendowany do projektu Etapu 1

Statusy pozostają rozdzielone według odpowiedzialności. Nie tworzymy jednego
statusu obejmującego cały proces.

**Moderacja zgłoszenia:**

- `draft` — formularz niezakończony;
- `pending_email_verification` — oczekiwanie na potwierdzenie e-mail;
- `verified` — potwierdzony, oczekuje na obsługę;
- `in_review` — moderator rozpoczął sprawdzanie;
- `approved` — zaakceptowany, może przejść do płatności;
- `rejected` — odrzucony z powodem;
- `expired` — zgłoszenie wygasło przed zakończeniem procesu.

`claimed` nie powinien docelowo być statusem moderacji. Przejęcie przez konto
jest osobną cechą wynikającą z `owner_user_id/claimed_at`. W Etapie 1 trzeba
przygotować migrację kompatybilną z istniejącymi rekordami, bez natychmiastowego
usuwania wartości `claimed` przed sprawdzeniem wszystkich zależności.

**Zamówienie:**

- `draft` — utworzone, jeszcze bez sesji płatności;
- `pending_payment` — oczekuje na wynik operatora;
- `paid` — płatność potwierdzona lub zamówienie 0 zł poprawnie sfinalizowane;
- `payment_failed` — operator zgłosił niepowodzenie;
- `expired` — minął czas wyceny/sesji;
- `cancelled` — anulowane przed realizacją;
- `partially_refunded` — zwrot częściowy, jeśli zostanie dopuszczony;
- `refunded` — pełny zwrot.

**Publikacja oferty:**

- zachowujemy `draft`, `published`, `unpublished`;
- stan `awaiting_payment` nie trafia do `ListingPublicationStatus`, tylko wynika
  z zaakceptowanej moderacji i braku opłaconego entitlementu publikacji;
- wygaśnięcie jest określane przez brak aktywnego entitlementu i `expiresAt`,
  a nie przez status płatności.

**Entitlement:**

- `scheduled` — korzyść rozpocznie się w przyszłości;
- `active` — korzyść obowiązuje;
- `expired` — okres minął;
- `revoked` — cofnięta kontrolowaną operacją;
- `cancelled` — anulowana przed rozpoczęciem.

#### 14.0.5 Dane nabywcy — rekomendowany minimalny model

Checkout wymaga zalogowanego właściciela ogłoszenia. W V1 rekomendujemy:

- zawsze: e-mail konta i kraj nabywcy;
- osoba fizyczna: imię i nazwisko oraz adres rozliczeniowy tylko w zakresie
  potwierdzonym przez księgowość/operatora;
- zakup na firmę: nazwa firmy, NIP, kraj i adres rozliczeniowy;
- osobny checkbox „Kupuję jako firma” sterujący polami B2B;
- snapshot danych nabywcy na zamówieniu — późniejsza zmiana profilu nie zmienia
  historycznego dokumentu;
- brak przechowywania danych karty i szczegółów rachunku bankowego w aplikacji.

Ostateczny minimalny zestaw pól oraz walidacja NIP wymagają potwierdzenia ze
specjalistą księgowym/prawnym i wybranym operatorem.

#### 14.0.6 Zasady wyróżnienia i rankingu V1

- wyróżnić można wyłącznie aktywną, publiczną ofertę;
- okres zaczyna się po potwierdzeniu płatności;
- ponowny zakup podczas aktywnego wyróżnienia dopisuje 7 dni od obecnego końca,
  zamiast rozpoczynać okres od nowa;
- wycofanie oferty przez właściciela nie zatrzymuje automatycznie zegara
  wyróżnienia;
- ręczne cofnięcie oferty przez administratora z winy serwisu wymaga procedury
  zwrotu lub rekompensaty;
- wyróżnione oferty są przed niewyróżnionymi, ale oferty o tym samym poziomie
  rotują deterministycznie w przedziałach czasu, aby jedna oferta nie zajmowała
  stale pierwszej pozycji;
- dokładny algorytm rankingu zostanie opisany i przetestowany w Etapie 6;
- nie obiecujemy konkretnej liczby wyświetleń ani pozycji w wynikach.

#### 14.0.7 Decyzje wymagające potwierdzenia zewnętrznego

Te punkty nie powinny zostać arbitralnie rozstrzygnięte w kodzie:

- właściwa stawka VAT i sposób prezentacji ceny na dokumencie;
- paragon, faktura imienna, faktura VAT oraz system ich wystawiania;
- treść regulaminu płatnej publikacji i polityki zwrotów;
- prawo odstąpienia konsumenta oraz zgoda na rozpoczęcie świadczenia przed
  upływem ustawowego terminu;
- moment uznania usługi publikacji i wyróżnienia za rozpoczętą/wykonaną;
- zasady pełnego i częściowego zwrotu po rozpoczęciu publikacji;
- wymagane dane nabywcy oraz retencja dokumentów finansowych.

Do czasu potwierdzenia model danych powinien obsługiwać snapshot stawki i kwot
VAT oraz zwrot częściowy, ale publiczne płatności pozostają za feature flagą.

#### 14.0.8 Kolejność pracy w pierwszej iteracji

- [x] Przeprowadzić audyt obecnego cennika, billingu, statusów i moderacji.
- [x] Zaproponować ofertę V1 i rekomendowany przebieg publikacji.
- [x] Zaproponować rozdzielony słownik statusów.
- [x] Określić minimalny model danych nabywcy do potwierdzenia.
- [x] Zaproponować zasady wyróżnienia i rabatów.
- [x] Zatwierdzić decyzje biznesowe wskazane w tabeli 14.0.2.
- [x] Potwierdzić Stripe jako pierwszy adapter płatności.
- [x] Potwierdzić zarządzanie wszystkimi cenami produktów ogłoszeniowych z
  panelu administratora, bez hardcodowania cen w kodzie.
- [ ] Przekazać punkty z 14.0.7 do weryfikacji księgowo-prawnej.
- [x] Uzupełnić finalny ADR decyzji produktowych Etapu 0.

Decyzje produktowe pozwalają rozpocząć Etap 1 od kontraktów domenowych i
migracji. Publiczny checkout pozostaje wyłączony do czasu zamknięcia punktów
księgowo-prawnych z 14.0.7.

#### 14.0.9 ADR-001 — zaakceptowany kierunek architektury

**Status:** zaakceptowany 2026-09-06.

**Decyzja:** produkty dla klientów indywidualnych powstają w osobnym kontekście
domenowym od abonamentów agencji. Ich ceny i parametry są przechowywane w
`listing_product_catalog` oraz zarządzane z panelu administratora. Stripe jest
pierwszym adapterem płatności, ale domena zamówień, kalkulacji i entitlementów
nie zależy od typów ani statusów Stripe.

**Konsekwencje:**

- `plan_catalog` nadal obsługuje wyłącznie plany agentów i biur;
- wszystkie kanały prezentacji korzystają z jednego API katalogu produktów;
- checkout przyjmuje identyfikatory produktów, nigdy kwoty obliczone przez
  frontend;
- zamówienie przechowuje niezmienny snapshot ceny i parametrów;
- finalizacja płatności przyznaje entitlement przez warstwę domenową;
- ręczne granty administratora korzystają z tej samej warstwy entitlementów;
- adapter Stripe można wymienić lub uzupełnić bez przebudowy katalogu,
  zamówień i reguł publikacji;
- kwestie prawno-księgowe blokują publiczne włączenie płatności, ale model od
  początku przechowuje snapshot VAT, nabywcy i informacje potrzebne do zwrotu.

### Etap 0 — decyzje produktowe i prawne

- [x] Zatwierdzić ceny, okres publikacji i długość wyróżnień.
- [x] Zdecydować o jednym poziomie wyróżnienia w V1.
- [x] Potwierdzić Stripe jako pierwszy adapter płatności jednorazowych.
- [ ] Potwierdzić VAT, dokument sprzedaży, regulamin i zwroty.
- [x] Przyjąć minimalny model danych nabywcy z późniejszym doprecyzowaniem po
  konsultacji księgowo-prawnej.
- [x] Ustalić 30 minut ważności wyceny i nieopłaconego zamówienia.
- [x] Zdefiniować zasady rankingu i uczciwej rotacji dla V1.
- [x] Zdecydować, że rabat ręczny łączy się z kodem tylko po jawnym zezwoleniu
  administratora.
- [x] Spisać słownik statusów moderacji, płatności, publikacji i entitlementów.
- [x] Zdecydować, że ceny produktów ogłoszeniowych są w pełni zarządzane z
  panelu administratora.

**Kryterium zakończenia:** istnieje zatwierdzona karta decyzji, na podstawie
której można zaprojektować migracje i kontrakty bez zgadywania reguł
finansowych.

**Stan:** decyzje produktowe zamknięte. Można rozpocząć Etap 1. Otwarta
weryfikacja księgowo-prawna blokuje publiczny rollout płatności, nie prace nad
fundamentem domenowym.

### Etap 1 — fundament domenowy, migracje i kontrakty

- [x] Dodać `listing_product_catalog`, encję, migrację i seed startowy.
- [x] Dodać `listing_orders` i `listing_order_items` ze snapshotem ceny, VAT,
  nazwy i parametrów produktu.
- [x] Dodać `listing_entitlements` od razu dla publikacji, odnowienia i
  wyróżnienia.
- [x] Zdefiniować relacje zamówienie → pozycje → entitlement → ogłoszenie.
- [x] Rozdzielić domenowe statusy moderacji, płatności, publikacji i
  entitlementów; zmiana zachowania publikacji nastąpi dopiero w Etapie 5.
- [x] Zaplanować przejście od `Listing.isPremium` do aktywnego entitlementu;
  pole może tymczasowo pozostać cache'em kompatybilności.
- [x] Przygotować kanoniczne, serializowalne kontrakty produktu i wyceny,
  niezależne od encji TypeORM; klient frontendowy zostanie podłączony do tych
  kontraktów razem z endpointami Etapu 2.
- [x] W odpowiedzi wyceny od początku przewidzieć listę rabatów, nawet jeśli w
  pierwszej wersji będzie pusta.
- [x] Zdefiniować idempotency key dla zamówień i aktywacji entitlementów.
- [x] Dodać feature flagi osobno dla publicznego cennika, checkoutu,
  wyróżnień i promocji.
- [x] Dodać testy regresyjne migracji, ograniczeń, relacji, seedów i flag.

#### Iteracja 1.1 — wykonany fundament persystencji

Data zakończenia: 2026-09-06.

Wykonano:

- utworzono osobny moduł domenowy `apps/api/src/listing-commerce`;
- dodano provider-agnostic typy produktów, zamówień, entitlementów i ich
  statusów;
- dodano encje `ListingProductCatalog`, `ListingOrder`, `ListingOrderItem` i
  `ListingEntitlement`;
- wszystkie kwoty są przechowywane jako całkowite jednostki najmniejszej
  waluty, czyli grosze dla PLN;
- VAT jest nullable do czasu decyzji księgowo-prawnej, a zamówienie i pozycja
  mają miejsce na jego niezmienny snapshot;
- zamówienie ma unikalny `idempotency_key`, numer zamówienia oraz opcjonalne,
  unikalne w obrębie providera identyfikatory sesji i płatności;
- produkt pozostaje wymaganym rekordem dla pozycji zamówienia i nie może być
  usunięty, jeśli został użyty; panel będzie stosował archiwizację;
- entitlement zakupiony z pozycji zamówienia jest unikalny dla tej pozycji,
  co stanowi bazową ochronę przed podwójną realizacją webhooka;
- migracja dodaje statusy moderacji `in_review` i `approved`, ale nie zmienia
  jeszcze istniejącego zachowania zatwierdzania i publikacji;
- dodano seedy `publication_60_days`, `renewal_60_days` i
  `featured_7_days`; `ON CONFLICT DO NOTHING` gwarantuje, że migracja nie
  nadpisze ceny zmienionej przez administratora;
- dodano osobne, domyślnie wyłączone flagi dla cennika, checkoutu, wyróżnień i
  promocji.

Po Iteracji 1.1 świadomie pozostawiono do Iteracji 1.2:

- kanoniczne kontrakty publicznego produktu i wyceny; administracyjne DTO
  katalogu należy już do Etapu 2;
- kontrakt endpointu quote z pustą listą rabatów;
- serwis polityk domenowych walidujący przejścia statusów;
- test integracyjny migracji na rzeczywistej bazie PostgreSQL.

Weryfikacja Iteracji 1.1:

- [x] `pnpm --filter api type-check`;
- [x] `pnpm --filter api lint`;
- [x] testy celowane modułu i release flags — 9/9;
- [x] pełny zestaw testów API — 401/401, 68/68 suites;
- [x] `git diff --check`.

#### Iteracja 1.2 — kontrakty i polityki domenowe

Data zakończenia: 2026-09-07.

Wykonano:

- dodano kanoniczny publiczny kontrakt produktu, który nie ujawnia
  wewnętrznego UUID, stanu administracyjnego ani identyfikatorów operatora;
- dodano kontrakt żądania i odpowiedzi quote z pozycjami, VAT, terminem
  ważności oraz jawną listą rabatów;
- snapshot wyceny w `ListingOrder` używa bezpośrednio kanonicznego kontraktu,
  dzięki czemu nie powstaje drugi, rozbieżny model danych;
- dodano provider-agnostic źródła rabatu: kampania, kod promocyjny i ręczna
  korekta administratora;
- dodano czystą politykę przejść statusów zamówień, w tym retry nieudanej
  płatności, bez możliwości ponownego otwierania stanów końcowych;
- dodano czystą politykę przejść entitlementów z kontrolowanym aktywowaniem,
  wygasaniem, anulowaniem i cofnięciem;
- zapisano mapowanie publikacja/odnowienie → entitlement publikacji oraz
  wyróżnienie → entitlement wyróżnienia;
- dodano wspólną stałą 30-minutowej ważności wyceny i funkcję, która nie
  mutuje wejściowej daty;
- dodano kalkulację kwot brutto wyłącznie na bezpiecznych liczbach całkowitych
  z odrzucaniem ujemnych wartości, ułamkowych groszy, niepoprawnej ilości,
  rabatu większego niż cena oraz przekroczenia zakresu bezpiecznego integera;
- wykonano migrację dwukrotnie na izolowanej kopii schematu PostgreSQL 16;
  drugi przebieg nie dodał duplikatów ani nie nadpisał seedów;
- potwierdzono obecność czterech tabel, trzech produktów V1 i nowych statusów
  moderacji; testowa baza została następnie usunięta, a główna baza pozostała
  bez zmian.

Decyzja architektoniczna dotycząca kontraktów:

- nie dodajemy obecnie osobnego pakietu workspace tylko dla kilku interfejsów;
- kanoniczne kontrakty pozostają czystymi typami bez zależności od NestJS i
  TypeORM;
- w Etapie 2 frontend otrzyma typed client zgodny z publicznym DTO endpointu;
- jeśli liczba konsumentów kontraktów wzrośnie, można wydzielić istniejące typy
  do `packages/contracts` bez zmiany ich kształtu.

Weryfikacja Iteracji 1.2:

- [x] `pnpm --filter api type-check`;
- [x] `pnpm --filter api lint`;
- [x] testy modułu `listing-commerce` — 22/22;
- [x] pełny zestaw testów API — 417/417, 70/70 suites;
- [x] `pnpm --filter api build`;
- [x] migracja PostgreSQL — pierwszy i drugi przebieg;
- [x] `git diff --check`.

**Stan Etapu 1:** fundament backendowy jest zakończony. Publiczne i
administracyjne endpointy, typed client frontendu oraz ekran zarządzania
produktami należą do Etapu 2. Obecny proces zatwierdzania nadal publikuje
ofertę bez płatności i pozostaje bez zmian do Etapu 5.

**Kryterium zakończenia:** baza potrafi bez utraty historii zapisać produkt,
zamówienie, jego pozycje i przyznaną korzyść, a kontrakty nie wymagają zmiany po
dodaniu wyróżnień i rabatów.

**Odblokowuje:** panel produktów, publiczny cennik i kalkulator zamówienia.

### Etap 2 — katalog produktów i panel administratora

- [x] Dodać publiczny endpoint produktów.
- [x] Dodać endpointy admina, DTO, autoryzację i log aktywności.
- [x] Dodać ekran listy, edycji, widoczności, kolejności i archiwizacji
  produktów; backend tych operacji jest gotowy.
- [x] Dodać publiczny podgląd karty produktu.
- [x] Zabezpieczyć archiwizację produktów użytych w zamówieniach.
- [x] Zapisywać historię zmian ceny, widoczności i parametrów produktu.
- [x] Dodać testy serwisu, walidacji DTO, kontroli roli i logu audytowego.

#### Iteracja 2.1 — publiczny katalog i administracyjne API

Data zakończenia: 2026-09-07.

Wykonano:

- dodano publiczny `GET /api/listing-products`, kontrolowany osobną flagą
  `RELEASE_FLAG_PRIVATE_LISTING_PRICING_ENABLED`;
- przy wyłączonej fladze endpoint zwraca pusty katalog bez wykonywania zapytania
  do bazy;
- publiczny DTO nie ujawnia UUID produktu, flag administracyjnych, archiwizacji,
  referencji operatora, wagi rankingu ani wewnętrznych parametrów realizacji;
- dodano chronione rolą `ADMIN` endpointy listy, szczegółu, tworzenia, edycji,
  archiwizacji, przywracania i historii zmian;
- kod i typ produktu są niezmienne po utworzeniu, ponieważ ich zmiana mogłaby
  zmienić znaczenie historycznych zamówień;
- cena, VAT, długość działania, opis, tier wyróżnienia, kolejność, aktywność i
  widoczność mogą być zarządzane bez deployu;
- znane parametry fulfillmentu są wyliczane na backendzie z pól produktu, a nie
  przyjmowane jako zduplikowany JSON od administratora;
- produkt publiczny musi być aktywny i niezarchiwizowany;
- wyłączenie produktu automatycznie usuwa jego publiczną widoczność, jeśli
  żądanie nie próbuje jawnie zachować niespójnego stanu;
- przywrócony produkt wraca jako aktywny, ale niepubliczny, aby publikacja była
  świadomą, oddzielną decyzją administratora;
- nie dodano endpointu trwałego usuwania; rekord wykorzystany w zamówieniu jest
  chroniony relacją `ON DELETE RESTRICT` i może zostać tylko zarchiwizowany;
- dodano osobną tabelę `listing_product_changes`, ponieważ istniejący
  `ActivityLog` jest kontekstem aktywności agenta, a nie globalnym audytem
  finansowym administratora;
- zmiana produktu i wpis audytowy są zapisywane w jednej transakcji z blokadą
  `pessimistic_write` na edytowanym rekordzie;
- historia przechowuje administratora, akcję, powód oraz wartości przed i po
  zmianie;
- dodano ochronę przed kolizją kodu produktu oraz kontrolowane odpowiedzi dla
  brakujących rekordów i niespójnej konfiguracji.

Endpointy Iteracji 2.1:

- `GET /api/listing-products`;
- `GET /api/admin/listing-products`;
- `POST /api/admin/listing-products`;
- `GET /api/admin/listing-products/:code`;
- `PATCH /api/admin/listing-products/:code`;
- `GET /api/admin/listing-products/:code/history`;
- `POST /api/admin/listing-products/:code/archive`;
- `POST /api/admin/listing-products/:code/restore`.

Weryfikacja Iteracji 2.1:

- [x] testy `listing-commerce` — 38/38 przed końcowym przebiegiem;
- [x] pełny zestaw testów API — 433/433, 75/75 suites;
- [x] `pnpm --filter api type-check`;
- [x] `pnpm --filter api lint`;
- [x] `pnpm --filter api build`;
- [x] obie migracje wykonane na izolowanym PostgreSQL 16;
- [x] migracja audytu wykonana ponownie bez duplikatów;
- [x] testowa baza usunięta, główna baza bez zmian;
- [x] `git diff --check`.

#### Iteracja 2.2 — panel katalogu i podgląd publicznej karty

Data zakończenia: 2026-09-07.

Wykonano:

- dodano typed client dla publicznego i administracyjnego API produktów;
- typy transportowe rozdzielają kontrakt publiczny od kontraktu administratora,
  dzięki czemu UUID, referencja operatora, parametry realizacji i dane audytowe
  nie są potrzebne komponentom publicznym;
- dodano formularz tworzenia i edycji produktu z walidacją zgodną z backendem;
- kod i typ można ustawić tylko podczas tworzenia, a podczas edycji pozostają
  niezmienne;
- administrator wpisuje cenę brutto w PLN, natomiast granica domenowa zamienia
  ją na całkowitą liczbę groszy bez używania arytmetyki zmiennoprzecinkowej;
- stawka VAT pozostaje opcjonalna (`null`) do czasu zamknięcia decyzji
  księgowo-prawnych;
- nowy produkt jest domyślnie aktywny, ale jawnie niepubliczny i nie otrzymuje
  domyślnej ceny biznesowej;
- wyłączenie aktywności w formularzu automatycznie wyłącza widoczność publiczną;
- przed zapisem administrator widzi podsumowanie skutków zmiany ceny,
  aktywności i widoczności;
- dodano responsywną listę ze statusami `publiczny`, `ukryty`, `nieaktywny` i
  `archiwum` oraz nawigację w sekcji administracyjnej;
- dodano archiwizację i przywracanie z obowiązkowym powodem oraz potwierdzeniem;
- archiwalny produkt jest tylko do odczytu, a przywrócony pozostaje niepubliczny
  do czasu świadomej decyzji administratora;
- dodano historię zmian z akcją, datą, administratorem, powodem i wartościami
  przed/po;
- dodano współdzielony `ListingProductPreviewCard`, używany w panelu jako
  podgląd i gotowy do ponownego użycia na homepage oraz `/cennik` w Etapie 3;
- publiczna karta nie zawiera przycisku wykonującego pozorny zakup — CTA jest
  wyłączone i opisane jako podgląd do czasu wdrożenia checkoutu.

Weryfikacja Iteracji 2.2:

- [x] testy granic formularza, kwot i klienta HTTP — 11/11;
- [x] pełny zestaw testów web — 95/95, 14/14 suites;
- [x] `pnpm --filter web type-check`;
- [x] `pnpm --filter web lint` — bez nowych ostrzeżeń w plikach Iteracji 2.2;
- [x] `pnpm --filter web build` — 50/50 stron, w tym
  `/dashboard/admin/listing-products`;
- [x] `git diff --check`.

Etap 2 jest zakończony. Włączenie karty do publicznego cennika pozostaje celowo
w Etapie 3; dane i komponent prezentacyjny są już gotowe, ale flaga
`RELEASE_FLAG_PRIVATE_LISTING_PRICING_ENABLED` pozostaje domyślnie wyłączona.

**Kryterium zakończenia:** produkt można bezpiecznie edytować i ukryć, a historia
zmian pozostaje dostępna. Publiczne API zwraca tylko produkty aktywne i publiczne.

**Odblokowuje:** właściwe podłączenie cennika strony głównej i `/cennik` bez
hardcodowania danych.

### Etap 3 — publiczny cennik i przełącznik odbiorcy

- [x] Zbudować wspólny adapter i komponenty prezentacji cennika prywatnego dla
  homepage oraz `/cennik`.
- [x] Dodać przełącznik `Sprzedaję prywatnie | Jestem agentem lub prowadzę biuro`.
- [x] Dodać obsługę parametru `dla` oraz linków kierujących do właściwego
  wariantu.
- [x] Dla wariantu prywatnego ukrywać przełącznik miesięcznie/rocznie.
- [x] Zachować obecny cennik agentów pobierany z `GET /api/plans` bez regresji.
- [x] Dodać CTA do `/dodaj-oferte` i informację, że płatność następuje po
  akceptacji ogłoszenia.
- [x] Dodać FAQ i zasady publikacji na pełnej stronie cennika.
- [x] Dodać niezależne stany loading/error/empty dla obu katalogów.
- [x] Dodać testy responsywności, dostępności i obsługi parametru URL.
- [x] Dodać zdarzenia `pricing_audience_selected`, `private_pricing_viewed` i
  `listing_product_selected`.

#### Iteracja 3.1 — wspólny cennik i routing odbiorcy

Data zakończenia: 2026-09-07.

Wykonano:

- zastąpiono dwie niezależne implementacje kart jednym komponentem
  `PublicPricingCatalog`, używanym na homepage i pełnej stronie `/cennik`;
- oba katalogi zachowują osobne dane, loading, error, empty i retry, dlatego
  awaria produktów prywatnych nie ukrywa planów agentów ani odwrotnie;
- domyślnym wariantem jest `Sprzedaję prywatnie`, zgodnie z ADR produktu;
- dodano dostępny klawiaturą przełącznik oparty na prawdziwych przyciskach z
  `aria-pressed`;
- parametr `dla=prywatnych|agentow` jest synchronizowany z historią przeglądarki
  bez przewijania strony do początku;
- poprawiono zapis linków homepage na `/?dla=...#pricing`; wcześniejsza postać
  `/#pricing?dla=...` umieszczała parametr po `#`, więc nie był on query stringiem;
- kontrolka `Miesięcznie | Rocznie` jest renderowana tylko dla odbiorcy
  agencyjnego;
- cennik agentów nadal używa `GET /api/plans`, dotychczasowych reguł limitów,
  wyróżnienia planu Professional i ścieżek rejestracji;
- wariant prywatny używa wyłącznie `GET /api/listing-products`; cena nie jest
  hardcodowana ani przekazywana do formularza/checkoutu;
- homepage pokazuje główną publikację, korzyści i osobny blok dodatków, a pełny
  cennik wszystkie aktywne produkty;
- CTA prowadzi do `/dodaj-oferte`, a treść jasno komunikuje kolejność:
  bezpłatne dodanie → potwierdzenie → moderacja → wybór produktów → płatność;
- dodano FAQ dotyczące moderacji, odnowienia, kodów, dokumentu sprzedaży i
  zwrotów; kwestie oczekujące na opinię prawną są opisane bez deklarowania
  niezatwierdzonych zasad;
- rozszerzono współdzieloną kartę produktu o tryb publicznego CTA, zachowując
  osobny bezpieczny tryb podglądu administratora;
- dodano anonimowy, publiczny i throttlowany endpoint analytics z zamkniętą
  allow-listą trzech eventów; eventy nie wymagają sesji i nie zapisują danych
  użytkownika, agenta ani agencji;
- zdarzenia trafiają do kategorii `public_growth` i nadal respektują zgodę na
  cookies analityczne po stronie klienta;
- dodano metadata strony cennika oraz linki nawigacji kierujące domyślnie do
  wariantu prywatnego.

Weryfikacja Iteracji 3.1:

- [x] testy modelu URL i granicy wariantu UI — 10/10;
- [x] testy publicznych eventów analytics — 5/5;
- [x] pełny zestaw testów web — 105/105, 16/16 suites;
- [x] pełny zestaw testów API — 438/438;
- [x] `pnpm --filter web type-check` i `pnpm --filter api type-check`;
- [x] lint web bez nowych ostrzeżeń i lint API bez błędów;
- [x] produkcyjny build API i Next.js, w tym statyczne `/` oraz `/cennik`;
- [x] `git diff --check`.

#### Iteracja 3.2 — automatyczne testy przeglądarkowe

Data zakończenia: 2026-09-07.

Wykonano:

- dodano Playwright jako zależność deweloperską aplikacji webowej i skrypty
  `test:e2e` oraz `test:e2e:ui`;
- konfiguracja uruchamia testy na produkcyjnym buildzie Next.js, osobno w
  projektach `desktop-chromium` i `mobile-chromium`;
- testy interceptują wyłącznie publiczne endpointy cennika, nie wymagają
  backendu i nie zapisują danych w bazie;
- sprawdzono domyślny wariant prywatny, ceny z API, brak kontrolki abonamentu i
  przełączenie do planów agentów;
- sprawdzono sterowanie przełącznikiem z klawiatury oraz semantyczny stan
  `aria-pressed`;
- sprawdzono aktualizację URL, obsługę historii przeglądarki i powrót do
  poprzedniego wariantu;
- sprawdzono poprawną kolejność query stringa i kotwicy na homepage;
- sprawdzono układ przełącznika na desktopie i mobile oraz brak poziomego
  overflow dokumentu;
- sprawdzono widoczność głównego CTA na mobile;
- sprawdzono niezależność katalogów w obu kierunkach: błąd produktów prywatnych
  nie blokuje agentów, a błąd planów agentów nie blokuje produktów prywatnych;
- artefakty Playwright (`test-results`, raport HTML, raport blob) są ignorowane
  przez Git, natomiast konfiguracja i scenariusze pozostają częścią repo.

Weryfikacja Iteracji 3.2:

- [x] Playwright E2E — 10/10 na desktop Chromium i emulowanym Pixel 7;
- [x] produkcyjny build Next.js uruchomiony przez `webServer` Playwright;
- [x] brak pominiętych scenariuszy;
- [x] testy korzystają z kontrolowanych cen fixture, nie z wartości zapisanych
  w kodzie produkcyjnym.

Etap 3 jest zakończony. Publiczne dane produktów nadal pozostają kontrolowane
flagą `RELEASE_FLAG_PRIVATE_LISTING_PRICING_ENABLED`; jej włączenie jest osobną
decyzją rolloutową, a nie częścią testów ani implementacji widoku.

**Kryterium zakończenia:** administrator zmienia cenę bez deployu, a ta sama
wartość pojawia się na homepage i `/cennik`. Awaria katalogu prywatnego nie
ukrywa cennika agentów i odwrotnie.

**Może być realizowany równolegle z:** Etapem 4 po zamrożeniu kontraktu produktu
z Etapu 1 i udostępnieniu publicznego endpointu z Etapu 2.

### Etap 4 — serwerowy kalkulator ceny i zamówienia

- [x] Dodać `POST /api/listing-checkout/quote` jako jedyne źródło kalkulacji.
- [x] Walidować właściciela, stan ogłoszenia i możliwość zakupu produktu.
- [x] Zwracać cenę bazową, listę rabatów, VAT, cenę końcową i termin ważności.
- [x] Dodać `POST /api/listing-checkout/orders` jako wewnętrzny endpoint
  tworzący zamówienie bez uruchamiania operatora płatności.
- [x] Zapisywać snapshot całej kalkulacji w zamówieniu i pozycjach.
- [x] Zapobiegać wielokrotnemu aktywnemu zamówieniu tego samego rodzaju dla tej
  samej oferty, jeśli reguły produktu tego zabraniają.
- [x] Obsłużyć finalizację zamówienia za 0 zł bez tworzenia pozorowanej
  płatności u operatora.
- [x] Ustawić czas wygaśnięcia wyceny i wymuszać ponowne przeliczenie po jego
  przekroczeniu.
- [x] Dodać testy własności ogłoszenia, zmian ceny, zaokrągleń, VAT, kwoty 0 zł
  oraz idempotencji tworzenia zamówienia.

#### Iteracja 4.1 — autorytatywny quote (zrealizowana 2026-09-07)

- dodano chroniony `POST /api/listing-checkout/quote`; endpoint przyjmuje tylko
  identyfikator ogłoszenia, kody produktów i ilość, nigdy ceny ani rabaty z
  frontendu;
- źródłem każdej kwoty jest aktywny, publiczny i niezarchiwizowany produkt z
  `listing_product_catalog`; zmiana ceny wpływa na następną wycenę, ale nie
  mutuje zwróconego wcześniej snapshotu;
- wycena jest dostępna wyłącznie dla zalogowanego właściciela ogłoszenia
  pochodzącego ze ścieżki klienta indywidualnego; brak własności jest zwracany
  jak brak zasobu, aby nie ujawniać cudzych ogłoszeń;
- wydzielono czystą politykę możliwości zakupu: pierwsza publikacja wymaga
  pozytywnej moderacji i niepublicznego ogłoszenia, odnowienie wymaga historii
  publikacji, a wyróżnienie aktywnej i niewygasłej publikacji;
- polityka przejściowo rozpoznaje docelowy status `approved` oraz istniejący
  zapis `claimed` z metadanymi `adminApproval`; sama moderacja zachowuje obecne
  zachowanie aż do kontrolowanej zmiany w Etapie 5;
- wykluczono duplikaty produktu i rodzaju, połączenie publikacji z odnowieniem,
  niedostępne produkty oraz zestawy o różnych walutach;
- wycena ma 30 minut ważności, puste `discounts` gotowe na Etap 7 oraz VAT
  obliczany z ceny brutto wyłącznie arytmetyką całkowitą z zaokrągleniem
  half-up; brak zatwierdzonej stawki VAT jest jawnie reprezentowany jako
  `null`, a nie jako 0%;
- suma jest ograniczona do zakresu kolumn `int`, aby przyszłe utworzenie
  zamówienia nie mogło nieoczekiwanie odrzucić poprawnie zwróconego quote;
- checkout i wyróżnienia pozostają niezależnie kontrolowane flagami rollout;
  kod promocyjny jest jawnie odrzucany do czasu wdrożenia silnika promocji,
  zamiast pozornie go akceptować bez wpływu na cenę;
- testy obejmują DTO, ochronę endpointu, własność, źródło ogłoszenia, moderację,
  flagi, dostępność produktów, zmianę ceny, snapshot, VAT, zaokrąglenia,
  wygaśnięcie oraz granice kwot.

#### Iteracja 4.2 — atomowe i idempotentne zamówienia (zrealizowana 2026-09-07)

- dodano chroniony `POST /api/listing-checkout/orders`; żądanie wymaga nagłówka
  `Idempotency-Key`, a endpoint tworzy zamówienie bez kontaktu z operatorem
  płatności;
- dodano `GET /api/listing-orders/:id`, który pobiera stan wyłącznie w zakresie
  zalogowanego nabywcy i nie ujawnia istnienia cudzego zamówienia;
- e-mail w `buyer_snapshot` pochodzi z aktywnego konta użytkownika, nie z body;
  body zawiera jedynie minimalne dane nabywcy przygotowane do późniejszej
  weryfikacji księgowo-prawnej;
- kalkulacja ceny, blokada ogłoszenia, blokada produktów, kontrola kolizji oraz
  zapis zamówienia i pozycji odbywają się w jednej transakcji;
- zarówno publiczny quote, jak i zamówienie używają tej samej funkcji
  kalkulującej i tej samej polityki dostępności; nie ma drugiej implementacji
  liczenia ceny;
- `pricing_snapshot` przechowuje pełny quote, a `listing_order_items` zapisują
  kod, nazwę, typ, cenę, VAT, czas trwania i parametry realizacji z chwili
  zakupu; późniejsza zmiana katalogu nie modyfikuje historii;
- fingerprint kanonicznego żądania chroni przed ponownym użyciem klucza
  idempotencji dla innych danych; kolejność pozycji nie wpływa na fingerprint;
- obsłużono dwa wyścigi idempotencji: żądanie czekające na blokadę ogłoszenia
  ponownie sprawdza klucz po jej uzyskaniu, a naruszenie unikalności po insercie
  odzyskuje zamówienie zapisane przez równoległą transakcję;
- nieaktualne otwarte zamówienia są oznaczane jako `expired` przed próbą
  zastąpienia, natomiast aktywne zamówienie tego samego rodzaju blokuje duplikat;
  opłacona publikacja blokuje ponowny zakup pierwszej publikacji również w
  krótkim okresie przed utworzeniem entitlementu;
- zamówienie o sumie 0 zł przechodzi bezpośrednio do `paid`, zapisuje moment
  finalizacji i pozostawia wszystkie pola operatora puste; przyznanie korzyści
  realizuje w tej samej transakcji serwis entitlementów wdrożony w Iteracji 5.1;
- dodano testy DTO konsumenta i firmy, źródła e-maila, pełnego snapshotu,
  wygaśnięcia, kolizji, zera, odczytu właścicielskiego oraz sekwencyjnych i
  współbieżnych ponowień idempotentnych.

Etap 4 jest zakończony. Endpoint `orders` celowo nie tworzy jeszcze sesji
operatora. Etap 5 dołączy sesję płatniczą do istniejącego zamówienia i przed
jej utworzeniem ponownie sprawdzi `quoteExpiresAt`; nie będzie ponownie liczył
ani nadpisywał snapshotu ważnego zamówienia.

**Kryterium zakończenia:** dla tego samego zestawu danych wycena i zamówienie
mają identyczną kwotę, a późniejsza zmiana katalogu nie zmienia snapshotu
utworzonego zamówienia.

**Odblokowuje:** integrację operatora płatności oraz późniejsze promocje.

### Etap 5 — płatność i publikacja

- [x] Dodać stan `awaiting_payment` po akceptacji moderacji jako stan pochodny:
  `submission.status = approved`, niepubliczne ogłoszenie i brak aktywnego
  entitlementu publikacji.
- [x] Zbudować podsumowanie zamówienia wykorzystujące serwerowy quote.
- [x] Zintegrować tworzenie sesji płatności z operatorem.
- [x] Obsłużyć podpisane, idempotentne webhooki.
- [x] Po webhooku finalizować zamówienie, a publikację aktywować wyłącznie przez
  serwis `listing_entitlements`.
- [x] Zapewnić, że przekierowanie użytkownika z checkoutu nigdy samo nie
  aktywuje publikacji.
- [x] Dodać ponowienie płatności, potwierdzenie i historię w panelu sprzedającego.
- [x] Dodać zadanie wykrywające porzucone/wygasłe sesje.
- [x] Dodać trwały log zdarzeń webhooków i alert dla opłaconego zamówienia bez
  przyznanego entitlementu.
- [x] Dodać testy webhooków zduplikowanych, dostarczonych w złej kolejności i
  ponowionych po błędzie.

#### Iteracja 5.1 — moderacja oddzielona od publikacji i realizacja entitlementów (zrealizowana 2026-09-07)

- zachowanie moderacji jest kontrolowane flagą
  `RELEASE_FLAG_PRIVATE_LISTING_CHECKOUT_ENABLED`: przy wyłączonej fladze działa
  dotychczasowa publikacja, a po jej włączeniu zatwierdzenie nadaje status
  `approved`, pozostawia `Listing` w stanie niepublicznym i nie ustawia dat
  publikacji ani wygaśnięcia;
- zaakceptowana oferta otrzymuje docelowy, unikalny slug, ale sam slug nie czyni
  jej publiczną; właściciel dostaje wiadomość o akceptacji i konieczności
  przejścia do podsumowania zamiast nieprawdziwej informacji o publikacji;
- zaakceptowanej oferty oczekującej na płatność nie można edytować bez ponownej
  moderacji; chroni to zgodność opłacanej treści z treścią zaakceptowaną;
- dodano `ListingEntitlementsService` jako jedyne miejsce realizujące korzyści z
  opłaconego zamówienia; wejście standalone blokuje rekord zamówienia, a wariant
  transakcyjny może być użyty bezpośrednio przez przyszły webhook;
- realizacja wymaga statusu `paid` oraz `paidAt`, tworzy najwyżej jeden
  entitlement na pozycję dzięki `order_item_id` i w ponowieniu zwraca istniejące
  entitlementy bez zmiany ich dat;
- entitlement pierwszej publikacji aktywuje `Listing` i powiązane zgłoszenie,
  ustawia wspólne daty publikacji i wygaśnięcia; odnowienie rozpoczyna się po
  końcu bieżącego okresu, a kolejne wyróżnienie po końcu poprzedniego
  wyróżnienia tego samego poziomu;
- zamówienie 0 zł wywołuje realizację entitlementów w tej samej transakcji co
  zapis zamówienia, więc nie istnieje stan `paid` bez przyznanej darmowej
  publikacji po poprawnym commicie;
- testy obejmują kompatybilny rollout moderacji, brak publikacji przed opłatą,
  treść wiadomości, aktywację publikacji, daty odnowienia, blokadę nieopłaconego
  zamówienia, ponowienie realizacji oraz blokady transakcyjne.

#### Iteracja 5.2 — niezależny od operatora rdzeń webhooków (zrealizowana 2026-09-07)

- dodano kanoniczny kontrakt zweryfikowanego zdarzenia płatniczego; może go
  utworzyć wyłącznie adapter, który wcześniej sprawdził podpis operatora;
- dodano `listing_payment_events` z unikalnością `(provider, event_id)`,
  powiązaniem z zamówieniem, statusem przetwarzania, bezpiecznym payloadem,
  błędem oraz czasami wystąpienia i obsługi zdarzenia;
- `ListingPaymentEventsService` nie jest publicznym kontrolerem i nie przyjmuje
  surowych webhooków; atomowo blokuje zamówienie, sprawdza powiązanie operatora
  oraz sesji, porównuje kwotę i walutę, aktualizuje zamówienie, wywołuje
  entitlementy i zapisuje audyt;
- sukces płatności jest honorowany również po wcześniejszym `payment_failed`,
  `expired` lub `cancelled`, jeśli pochodzi z dokładnie tej samej zapisanej
  sesji i ma poprawną kwotę; zapobiega to sytuacji, w której pobrano pieniądze,
  ale system nie wykonał usługi;
- spóźnione zdarzenie błędu lub wygaśnięcia nie cofa zamówienia `paid`;
- przetworzone duplikaty nie dotykają zamówienia ani entitlementów; uwzględniono
  również wyścig podczas oczekiwania na blokadę oraz konflikt unikalnego
  inserta;
- zdarzenie zakończone błędem pozostaje audytowalne i może zostać bezpiecznie
  ponowione; poprawne ponowienie aktualizuje ten sam rekord na `processed`;
- migracja tworzy osobny indeks błędów, aby późniejszy monitoring i alerty nie
  wymagały skanowania całej tabeli;
- testy obejmują sukces, dokładność kwoty, powiązanie sesji, błąd, wygaśnięcie,
  spóźniony sukces, spóźniony błąd, ponowienie po błędzie oraz trzy warianty
  idempotencji współbieżnej.

#### Iteracja 5.3 — Stripe Checkout i podpisany webhook (zrealizowana 2026-09-07)

- dodano oficjalne Stripe SDK oraz port `ListingPaymentGateway`; domena zamówień
  zależy od portu, a nie od typów i nazw zdarzeń Stripe;
- endpoint właściciela `POST /api/listing-orders/:id/checkout-session` sprawdza
  feature flagę, własność, ważność wyceny, dodatnią kwotę i dozwolony status,
  po czym tworzy sesję z kwotą pochodzącą wyłącznie ze snapshotu zamówienia;
- wywołanie Stripe odbywa się poza transakcją bazy, natomiast przygotowanie i
  powiązanie sesji blokują rekord zamówienia; klucz idempotencji jest oparty na
  trwałym ID próby płatności, więc można wznowić przerwane wywołanie operatora;
- Stripe otrzymuje wyłącznie jedną dokładną kwotę końcową zamówienia, walutę,
  email nabywcy i identyfikatory w metadata; ceny ani adresy powrotu nie są
  przyjmowane od frontendu;
- dodano publiczny `POST /api/listing-payments/webhooks/stripe`, który wymaga
  surowego body i nagłówka `Stripe-Signature`; konfiguracja Nest zachowuje raw
  body, a oficjalne SDK weryfikuje podpis osobnym sekretem tego endpointu;
- adapter mapuje `checkout.session.completed`, sukces i błąd płatności
  asynchronicznej oraz wygaśnięcie sesji do kanonicznego kontraktu domenowego;
  ukończona, ale jeszcze nieopłacona sesja nie aktywuje zamówienia;
- przekierowanie sukcesu zawiera wyłącznie dane do prezentacji wyniku i nie ma
  żadnej ścieżki aktywującej publikację; jedyną ścieżką pozostaje zweryfikowany
  webhook i transakcyjny `ListingEntitlementsService`;
- webhook pozostaje aktywny po wyłączeniu feature flagi, aby platforma mogła
  zrealizować płatności rozpoczęte przed awaryjnym zatrzymaniem nowych sesji;
- podpisany sukces z dokładną kwotą i walutą może atomowo uzupełnić brakujące
  powiązanie sesji, jeśli Stripe utworzył ją tuż przed awarią zapisu bazy;
  zdarzenia błędu ani wygaśnięcia nie mają prawa wykonać takiego powiązania;
- sekrety `STRIPE_SECRET_KEY` i `STRIPE_LISTING_WEBHOOK_SECRET` są wymagane
  dopiero przy użyciu integracji, dzięki czemu brak konfiguracji nie blokuje
  startu pozostałej części aplikacji, ale każda próba płatności kończy się
  kontrolowanym błędem zamiast trybem niezabezpieczonym.

#### Iteracja 5.4 — trwałe próby płatności i bezpieczne retry (zrealizowana 2026-09-07)

- dodano `listing_payment_attempts` jako historię wszystkich prób jednego
  zamówienia; każda próba ma kolejny numer, własny status, snapshot kwoty i
  waluty, operatora, czas ważności oraz bezpieczne dane błędu;
- unikalność sesji i płatności operatora obowiązuje globalnie, natomiast
  blokada zamówienia serializuje przydzielanie numerów prób i zabezpiecza przed
  utworzeniem dwóch prób o tym samym numerze;
- migracja odtwarza próbę numer 1 dla istniejących zamówień powiązanych już z
  sesją operatora i używa `ON CONFLICT DO NOTHING`, więc nie nadpisuje historii
  utworzonej wcześniej przez runtime;
- pierwsze wywołanie checkoutu zapisuje próbę `creating` przed kontaktem ze
  Stripe; awaria sieci pozostawia ją do wznowienia z tym samym kluczem
  idempotencji, bez utrzymywania transakcji bazy podczas wywołania sieciowego;
- otwarta próba jest wznawiana, a po potwierdzonym `payment_failed` tworzona
  jest nowa próba i nowa sesja Stripe; nie nadpisujemy identyfikatora starej
  sesji, więc jej spóźniony sukces nadal może zostać poprawnie rozliczony;
- nową próbę można przydzielić tylko przed upływem pierwotnej ważności snapshotu
  wyceny; kolejne próby nie pozwalają bezterminowo zachować ceny zmienionej
  później przez administratora;
- metadata Stripe zawiera ID próby oraz ID zamówienia; webhook najpierw wiąże
  zdarzenie z konkretną próbą, a dopiero potem aktualizuje status zamówienia;
- błąd lub wygaśnięcie starej próby nie może cofnąć ani zmienić nowszej próby;
  dokładny, podpisany sukces starej próby nadal finalizuje zamówienie i
  realizuje entitlementy;
- jeśli wyjątkowo dwie różne próby zakończą się sukcesem, publikacja pozostaje
  idempotentna, druga płatność jest zapisana, a zamówienie otrzymuje
  `paymentReviewRequired` oraz listę dodatkowych płatności do zwrotu lub ręcznej
  weryfikacji;
- `GET /api/listing-orders/:id` zwraca właścicielowi historię prób od najnowszej
  i flagę `canRetryPayment`, ale nie ujawnia identyfikatorów sesji ani płatności
  operatora;
- dodano testy pierwszej próby, wznowienia po awarii, nowej próby po błędzie,
  współbieżnego modelu blokad, starego błędu po nowszej próbie, spóźnionego
  sukcesu, podwójnej płatności, prywatności kontraktu i migracji legacy.

#### Iteracja 5.5 — checkout i historia w panelu sprzedającego (zrealizowana 2026-09-07)

- panel zaakceptowanego ogłoszenia pobiera publiczne warianty publikacji i
  wyświetla podsumowanie z serwerowego quote; frontend przesyła wyłącznie kod
  produktu i nigdy nie jest źródłem ceny, rabatu, VAT ani czasu trwania;
- utworzenie zamówienia używa jawnego klucza idempotencji zachowanego przez
  cały cykl próby w widoku; po błędzie odczytywany jest trwały stan zamówienia,
  dzięki czemu nie powstaje duplikat po niejednoznacznej odpowiedzi sieciowej;
- istniejące zamówienie `draft` lub `pending_payment` wznawia checkout, a
  `payment_failed` pozwala na nową próbę tylko wtedy, gdy serwer zwraca
  `canRetryPayment`; podsumowanie takiego zamówienia pochodzi z niezmiennego
  `pricingSnapshot`, a nie z aktualnego katalogu;
- dodano właścicielski `GET /api/listing-orders/by-listing/:listingId`, który
  filtruje równocześnie po użytkowniku i ogłoszeniu oraz zwraca najwyżej 20
  najnowszych zamówień z próbami bez identyfikatorów Stripe;
- historia w panelu pokazuje statusy zamówień i wszystkich prób płatności;
  interfejs obsługuje też zamówienie 0 zł bez przekierowania do operatora;
- adres checkoutu jest walidowany jako HTTPS w domenie Stripe przed
  przekierowaniem, a błędny adres kończy się kontrolowanym komunikatem;
- strony `success` i `cancel` odczytują wyłącznie właścicielskie zamówienie z
  API; parametr `session_id` z przeglądarki nie jest źródłem prawdy i nie jest
  wysyłany do API;
- ekran sukcesu odpytuje API przez ograniczony czas i pokazuje potwierdzenie
  dopiero dla stanu opłaconego; przy opóźnieniu webhooka zaleca nie ponawiać
  wpłaty i pozwala ręcznie odświeżyć status;
- powrót z anulowania również sprawdza zamówienie, więc spóźniony webhook
  sukcesu ma pierwszeństwo przed informacją wynikającą z samego redirectu;
- typy statusów sprzedającego oraz flagi wydania zostały zsynchronizowane z
  backendem; edycja zaakceptowanej oferty jest ukryta w czasie oczekiwania na
  płatność zgodnie z niezmiennikiem moderacji.

#### Iteracja 5.6 — rekoncyliacja płatności i samonaprawa realizacji (zrealizowana 2026-09-07)

- dodano okresowy, konfigurowalny scheduler przetwarzający ograniczone partie;
  blokada doradcza PostgreSQL zapewnia pojedyncze wykonanie w całym klastrze, a
  lokalna blokada chroni przed nakładaniem uruchomień tej samej instancji;
- próby `creating` i `pending`, których `expiresAt` minął, są ponownie
  sprawdzane i blokowane w transakcji przed przejściem do `expired`; zamówienie
  wygasa tylko wtedy, gdy jest to nadal jego najnowsza próba;
- kolejność blokad zamówienie → próba jest identyczna jak w obsłudze webhooka,
  dzięki czemu równoległy sukces płatności nie jest nadpisywany i nie powstaje
  zakleszczenie; podpisany, spóźniony sukces nadal może przeprowadzić
  `expired` → `paid` i wykonać usługę;
- scheduler wykrywa zamówienia `paid`, dla których choć jedna pozycja nie ma
  entitlementu, po krótkim konfigurowalnym okresie ochronnym; każde wykrycie
  zapisuje strukturalne ostrzeżenie monitoringu i uruchamia idempotentną
  realizację przez istniejący `ListingEntitlementsService`;
- błędy pojedynczych prób i zamówień są izolowane, raportowane osobno oraz nie
  zatrzymują reszty partii; podsumowanie zawiera liczbę wygaśnięć, wykrytych
  niespójności, napraw i błędów;
- dodano częściowy indeks dla starych zamówień `paid`, konfigurację środowiska
  oraz testy wyścigu z webhookiem, starszej próby, samonaprawy, izolacji błędów,
  blokady klastra i wyłączania schedulera w testach;
- trwały log webhooków pozostaje w `listing_payment_events` wdrożonym w
  Iteracji 5.2; Iteracja 5.6 wykorzystuje go razem z monitoringiem do
  diagnozowania sytuacji, których automatyczna naprawa nie zakończyła.

Etap 5 jest zakończony. Następna iteracja rozpoczyna Etap 6 od podłączenia
wyróżnień i odnowień do istniejącej domeny produktów, entitlementów i checkoutu.

**Kryterium zakończenia:** zaakceptowana oferta jest publikowana dokładnie raz
po potwierdzonej płatności, również gdy webhook zostanie dostarczony
wielokrotnie. Nie istnieje ścieżka publikacji oparta wyłącznie o dane frontendu.

**Odblokowuje:** sprzedaż wyróżnień i odnowień przez ten sam checkout.

### Etap 6 — wyróżnienia i odnowienia

- [x] Rozszerzyć serwis entitlementów o wyróżnienie i przedłużenie publikacji.
- [x] Dodać właściwe produkty wyróżnienia i odnowienia do katalogu.
- [ ] Podłączyć wyróżnienie do katalogu, mapy i strony oferty.
- [ ] Ustalić sortowanie i rotację w tym samym tierze.
- [ ] Dodać zakup wyróżnienia i odnowienia z panelu sprzedającego.
- [ ] Uniemożliwić zakup wyróżnienia dla cudzej, odrzuconej lub wygasłej oferty
  bez jednoczesnego odnowienia.
- [ ] Określić zachowanie ponownego zakupu przed zakończeniem aktywnego okresu.
- [ ] Dodać automatyczne wygasanie oraz przypomnienia (wygasanie zrealizowane,
  przypomnienia pozostają do wykonania).
- [ ] Zmigrować użycie `isPremium` albo jasno ograniczyć je do cache/kompatybilności.
- [ ] Dodać testy nakładających się okresów, ponowionych webhooków oraz
  wygasania entitlementów.

**Kryterium zakończenia:** wyróżnienie działa tylko w opłaconym/przyznanym
okresie, a jego start i koniec są audytowalne. Odnowienie i wyróżnienie używają
tego samego kalkulatora, zamówienia i finalizacji płatności co publikacja.

#### Iteracja 6.1 — cykl życia entitlementów (w toku, 2026-09-07)

- istniejący serwis realizacji zamówień obsługuje publikację, odnowienie oraz
  wyróżnienie z tym samym snapshotem produktu i idempotencją pozycji;
- dodano `processDueEntitlements`, który w jednej transakcji aktywuje
  zaplanowane entitlementy i wygasza zakończone okresy;
- po wygaśnięciu ostatniego entitlementu publikacji oferta jest automatycznie
  oznaczana jako nieopublikowana; aktywne odnowienie chroni ją przed cofnięciem;
- dodano `ListingEntitlementsScheduler` z konfigurowalnym interwałem, limitem
  partii, monitoringiem i postgres advisory lockiem dla wielu instancji API;
- dodano testy aktywacji, wygasania i automatycznego odpublikowania.

Następny krok Etapu 6: udostępnić właścicielowi odczyt aktywnych entitlementów
i akcje „Odnowić” / „Wyróżnić” w panelu ogłoszenia, wykorzystując istniejące
endpointy quote → order → checkout-session.

### Etap 7 — kampanie i kody promocyjne

- [ ] Dodać kampanie, kody, rezerwacje i wykorzystania.
- [ ] Rozszerzyć istniejący kalkulator ceny o promocje i reguły łączenia bez
  zmiany jego publicznego kontraktu.
- [ ] Dodać pole kodu w checkout oraz czytelne rozbicie ceny.
- [ ] Dodać panel kampanii i kodów z filtrami oraz statystykami.
- [ ] Obsłużyć limity atomowo i zwalnianie rezerwacji.
- [ ] Domyślnie wybierać korzystniejszy rabat, gdy kodu nie można łączyć z
  promocją automatyczną.
- [ ] Nie wysyłać treści kodu do analityki ani logów aplikacyjnych.
- [ ] Dodać testy dat, stref czasowych, limitów, równoległych użyć i ceny 0 zł.

**Kryterium zakończenia:** kodu ponad limit nie da się użyć nawet przy dwóch
równoległych checkoutach, a wyliczona kwota jest taka sama w podglądzie i
zamówieniu.

### Etap 8 — promocja konkretnego ogłoszenia i operacje admina

- [ ] Dodać ręczne korekty z obowiązkowym powodem i okresem ważności.
- [ ] Dodać panel `Cena i promocja` w szczegółach zgłoszenia/oferty.
- [ ] Dodać grant darmowej publikacji, wyróżnienia i przedłużenia.
- [ ] Realizować granty przez ten sam serwis entitlementów co opłacone
  zamówienia, bez bezpośredniego ustawiania `isPremium` lub dat publikacji.
- [ ] Pokazywać ręczny rabat jako osobną pozycję w quote i zamówieniu.
- [ ] Dodać anulowanie/revocation z pełnym audytem.
- [ ] Dodać uprawnienia bardziej szczegółowe niż ogólna rola admina, jeśli
  operacje finansowe będą obsługiwać różne osoby.
- [ ] Dodać testy uprawnień, audytu i wpływu cofnięcia grantu na aktywną usługę.

**Kryterium zakończenia:** administrator może pomóc konkretnemu użytkownikowi
bez ręcznej zmiany danych w bazie i bez utraty śladu audytowego.

### Etap 9 — analityka zbiorcza, QA i rollout

- [ ] Instrumentować podstawowe zdarzenia w każdym wcześniejszym etapie zamiast
  odkładać całą analitykę na koniec.
- [ ] Dodać lejek i raporty sprzedażowe.
- [ ] Wykonać testy E2E wszystkich ścieżek płatności i promocji.
- [ ] Przetestować wygasanie produktów i harmonogramy w UTC/Europe/Warsaw.
- [ ] Włączyć monitoring błędów webhooków, różnic kwot i nieudanych aktywacji.
- [ ] Przygotować procedurę ręcznego pogodzenia opłaconego zamówienia z brakiem
  entitlementu.
- [ ] Uruchomić za feature flagą najpierw dla kont testowych.
- [ ] Uruchomić kolejno: publiczny cennik → płatną publikację → odnowienia →
  wyróżnienia → promocje i kody.
- [ ] Po 30 dniach ocenić ceny i sens drugiego poziomu wyróżnienia.

**Kryterium zakończenia:** wszystkie scenariusze krytyczne przechodzą w E2E,
monitoring wykrywa rozbieżności, procedura operacyjna jest udokumentowana, a
każdą funkcję można niezależnie wyłączyć feature flagą.

### 14.1 Zasady implementacji między etapami

- Backend pozostaje źródłem prawdy dla ceny, rabatu, statusu płatności i czasu
  działania korzyści.
- Frontend nie powiela reguł biznesowych; jedynie prezentuje wynik endpointu
  quote.
- Webhook finalizuje zamówienie, a osobny serwis entitlementów przyznaje
  korzyść. Dzięki temu grant administratora i zakup korzystają z tej samej
  ścieżki aktywacji.
- Publiczny katalog, panel administratora i checkout używają tego samego modelu
  produktu, ale zwracają różne DTO odpowiednie do poziomu uprawnień.
- Schemat zamówienia i snapshotu nie może zależeć od późniejszej dostępności
  produktu w katalogu.
- Analitykę, log audytowy i testy jednostkowe dodajemy razem z funkcją, a w
  Etapie 9 jedynie składamy raporty oraz wykonujemy pełną walidację E2E.
- Każda migracja ma bezpieczną ścieżkę wdrożenia przed kodem, który zacznie
  korzystać z nowych kolumn lub tabel.
- Nie rozpoczynamy integracji płatności przed zamknięciem kontraktu quote i
  snapshotu zamówienia.

## 15. Testy krytyczne

- cena na homepage, `/cennik`, wycenie i checkout jest spójna;
- ukryty/nieaktywny produkt nie może zostać kupiony przez ręczne wywołanie API;
- użytkownik nie może kupić dodatku dla cudzego ogłoszenia;
- wyróżnienie nie aktywuje się po przekierowaniu z checkoutu bez webhooka;
- ponowiony webhook nie wydłuża drugi raz publikacji ani wyróżnienia;
- kod wygasły, wyłączony, poza zakresem lub ponad limit jest odrzucany;
- dwa równoległe użycia ostatniego dostępnego kodu nie przekraczają limitu;
- rabat nie tworzy kwoty ujemnej;
- zamówienie za 0 zł finalizuje się bez pozorowanej płatności u operatora;
- zmiana ceny nie modyfikuje istniejącego zamówienia;
- cofnięcie ręcznego grantu zapisuje autora i powód;
- refund ma jednoznaczny, przetestowany wpływ na aktywną usługę;
- przełącznik cennika działa z klawiatury i czytnikiem ekranu;
- awaria jednego katalogu nie ukrywa drugiego wariantu cennika.

## 16. Definicja gotowości całości

Funkcja jest gotowa, gdy:

- użytkownik prywatny rozumie cenę, okres i rezultat zakupu przed rozpoczęciem
  formularza;
- homepage i `/cennik` korzystają z jednego katalogu backendowego;
- zaakceptowane ogłoszenie można opłacić, opublikować, odnowić i wyróżnić;
- administrator zarządza cenami, promocjami i kodami bez zmian w kodzie;
- administrator może przyznać korzyść konkretnemu ogłoszeniu z pełnym audytem;
- wynik płatności jest idempotentny, a historyczne ceny pozostają niezmienne;
- monitoring i raporty pozwalają znaleźć różnice kwot oraz nieaktywowane zakupy;
- dokumenty prawne, zwroty i dokumentowanie sprzedaży są zatwierdzone.

## 17. Decyzje rekomendowane do zatwierdzenia

1. Osobny katalog jednorazowych produktów zamiast rozbudowy `plan_catalog`.
2. Domyślny wariant homepage: `Sprzedaję prywatnie`.
3. Jeden pakiet publikacji: 49 zł brutto / 60 dni.
4. W pierwszym wydaniu jedno wyróżnienie 19 zł / 7 dni; drugi wariant dopiero po
   danych, mimo że model od początku może obsługiwać wiele tierów.
5. Płatność dopiero po akceptacji moderacji.
6. Brak automatycznego sumowania promocji i kodów.
7. Ręczny grant admina wyłącznie przez kontrolowaną akcję z powodem i audytem.
8. Aktywacja publikacji i dodatków wyłącznie po webhooku albo jawnym grancie
   administratora.
