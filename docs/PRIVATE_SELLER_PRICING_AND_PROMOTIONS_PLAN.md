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

- `/#pricing?dla=prywatnych`;
- `/#pricing?dla=agentow`;
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

- [ ] Dodać publiczny endpoint produktów.
- [ ] Dodać endpointy admina, DTO, autoryzację i log aktywności.
- [ ] Dodać listę, edycję, widoczność, kolejność i archiwizację produktów.
- [ ] Dodać publiczny podgląd karty produktu.
- [ ] Zabezpieczyć archiwizację produktów użytych w zamówieniach.
- [ ] Zapisywać historię zmian ceny, widoczności i parametrów produktu.
- [ ] Dodać testy serwisu, walidacji DTO, kontroli roli i logu audytowego.

**Kryterium zakończenia:** produkt można bezpiecznie edytować i ukryć, a historia
zmian pozostaje dostępna. Publiczne API zwraca tylko produkty aktywne i publiczne.

**Odblokowuje:** właściwe podłączenie cennika strony głównej i `/cennik` bez
hardcodowania danych.

### Etap 3 — publiczny cennik i przełącznik odbiorcy

- [ ] Zbudować wspólny adapter i komponenty prezentacji cennika prywatnego dla
  homepage oraz `/cennik`.
- [ ] Dodać przełącznik `Sprzedaję prywatnie | Jestem agentem lub prowadzę biuro`.
- [ ] Dodać obsługę parametru `dla` oraz linków kierujących do właściwego
  wariantu.
- [ ] Dla wariantu prywatnego ukrywać przełącznik miesięcznie/rocznie.
- [ ] Zachować obecny cennik agentów pobierany z `GET /api/plans` bez regresji.
- [ ] Dodać CTA do `/dodaj-oferte` i informację, że płatność następuje po
  akceptacji ogłoszenia.
- [ ] Dodać FAQ i zasady publikacji na pełnej stronie cennika.
- [ ] Dodać niezależne stany loading/error/empty dla obu katalogów.
- [ ] Dodać testy responsywności, dostępności i obsługi parametru URL.
- [ ] Dodać zdarzenia `pricing_audience_selected`, `private_pricing_viewed` i
  `listing_product_selected`.

**Kryterium zakończenia:** administrator zmienia cenę bez deployu, a ta sama
wartość pojawia się na homepage i `/cennik`. Awaria katalogu prywatnego nie
ukrywa cennika agentów i odwrotnie.

**Może być realizowany równolegle z:** Etapem 4 po zamrożeniu kontraktu produktu
z Etapu 1 i udostępnieniu publicznego endpointu z Etapu 2.

### Etap 4 — serwerowy kalkulator ceny i zamówienia

- [ ] Dodać `POST /api/listing-checkout/quote` jako jedyne źródło kalkulacji.
- [ ] Walidować właściciela, stan ogłoszenia i możliwość zakupu produktu.
- [ ] Zwracać cenę bazową, listę rabatów, VAT, cenę końcową i termin ważności.
- [ ] Dodać `POST /api/listing-checkout/sessions` lub najpierw wewnętrzny
  endpoint tworzący zamówienie bez uruchamiania operatora płatności.
- [ ] Zapisywać snapshot całej kalkulacji w zamówieniu i pozycjach.
- [ ] Zapobiegać wielokrotnemu aktywnemu zamówieniu tego samego rodzaju dla tej
  samej oferty, jeśli reguły produktu tego zabraniają.
- [ ] Obsłużyć finalizację zamówienia za 0 zł bez tworzenia pozorowanej
  płatności u operatora.
- [ ] Ustawić czas wygaśnięcia wyceny i wymuszać ponowne przeliczenie po jego
  przekroczeniu.
- [ ] Dodać testy własności ogłoszenia, zmian ceny, zaokrągleń, VAT, kwoty 0 zł
  oraz idempotencji tworzenia zamówienia.

**Kryterium zakończenia:** dla tego samego zestawu danych wycena i zamówienie
mają identyczną kwotę, a późniejsza zmiana katalogu nie zmienia snapshotu
utworzonego zamówienia.

**Odblokowuje:** integrację operatora płatności oraz późniejsze promocje.

### Etap 5 — płatność i publikacja

- [ ] Dodać stan `awaiting_payment` po akceptacji moderacji.
- [ ] Zbudować podsumowanie zamówienia wykorzystujące serwerowy quote.
- [ ] Zintegrować tworzenie sesji płatności z operatorem.
- [ ] Obsłużyć podpisane, idempotentne webhooki.
- [ ] Po webhooku finalizować zamówienie, a publikację aktywować wyłącznie przez
  serwis `listing_entitlements`.
- [ ] Zapewnić, że przekierowanie użytkownika z checkoutu nigdy samo nie
  aktywuje publikacji.
- [ ] Dodać ponowienie płatności, potwierdzenie i historię w panelu sprzedającego.
- [ ] Dodać zadanie wykrywające porzucone/wygasłe sesje.
- [ ] Dodać trwały log zdarzeń webhooków i alert dla opłaconego zamówienia bez
  przyznanego entitlementu.
- [ ] Dodać testy webhooków zduplikowanych, dostarczonych w złej kolejności i
  ponowionych po błędzie.

**Kryterium zakończenia:** zaakceptowana oferta jest publikowana dokładnie raz
po potwierdzonej płatności, również gdy webhook zostanie dostarczony
wielokrotnie. Nie istnieje ścieżka publikacji oparta wyłącznie o dane frontendu.

**Odblokowuje:** sprzedaż wyróżnień i odnowień przez ten sam checkout.

### Etap 6 — wyróżnienia i odnowienia

- [ ] Rozszerzyć serwis entitlementów o wyróżnienie i przedłużenie publikacji.
- [ ] Dodać właściwe produkty wyróżnienia i odnowienia do katalogu.
- [ ] Podłączyć wyróżnienie do katalogu, mapy i strony oferty.
- [ ] Ustalić sortowanie i rotację w tym samym tierze.
- [ ] Dodać zakup wyróżnienia i odnowienia z panelu sprzedającego.
- [ ] Uniemożliwić zakup wyróżnienia dla cudzej, odrzuconej lub wygasłej oferty
  bez jednoczesnego odnowienia.
- [ ] Określić zachowanie ponownego zakupu przed zakończeniem aktywnego okresu.
- [ ] Dodać automatyczne wygasanie oraz przypomnienia.
- [ ] Zmigrować użycie `isPremium` albo jasno ograniczyć je do cache/kompatybilności.
- [ ] Dodać testy nakładających się okresów, ponowionych webhooków oraz
  wygasania entitlementów.

**Kryterium zakończenia:** wyróżnienie działa tylko w opłaconym/przyznanym
okresie, a jego start i koniec są audytowalne. Odnowienie i wyróżnienie używają
tego samego kalkulatora, zamówienia i finalizacji płatności co publikacja.

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
