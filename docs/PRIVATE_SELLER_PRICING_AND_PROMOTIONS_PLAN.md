# Cennik klientów indywidualnych, wyróżnienia i promocje

> Status: plan do akceptacji
> Data utworzenia: 2026-09-04
> Ostatnia aktualizacja: 2026-09-05
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

### Etap 0 — decyzje produktowe i prawne

- [ ] Zatwierdzić ceny, okres publikacji i długość wyróżnień.
- [ ] Zdecydować o jednym czy dwóch poziomach wyróżnienia w V1.
- [ ] Potwierdzić operatora płatności jednorazowych.
- [ ] Potwierdzić VAT, dokument sprzedaży, regulamin i zwroty.
- [ ] Zdecydować, jakie dane nabywcy są wymagane w checkout.
- [ ] Ustalić termin ważności wyceny i nieopłaconego zamówienia.
- [ ] Zdefiniować ranking wyróżnionych ofert i zasady uczciwej rotacji.
- [ ] Zdecydować, czy rabat ręczny łączy się z kodem; rekomendacja: tak, ale
  tylko po jawnym zaznaczeniu przez admina.
- [ ] Spisać słownik statusów moderacji, płatności, publikacji i entitlementów.

**Kryterium zakończenia:** istnieje zatwierdzona karta decyzji, na podstawie
której można zaprojektować migracje i kontrakty bez zgadywania reguł
finansowych.

**Blokuje:** wszystkie kolejne etapy.

### Etap 1 — fundament domenowy, migracje i kontrakty

- [ ] Dodać `listing_product_catalog`, encję, migrację i seed startowy.
- [ ] Dodać `listing_orders` i `listing_order_items` ze snapshotem ceny, VAT,
  nazwy i parametrów produktu.
- [ ] Dodać `listing_entitlements` od razu dla publikacji, odnowienia i
  wyróżnienia.
- [ ] Zdefiniować relacje zamówienie → pozycje → entitlement → ogłoszenie.
- [ ] Rozdzielić status moderacji, status płatności i status publikacji.
- [ ] Zaplanować przejście od `Listing.isPremium` do aktywnego entitlementu;
  pole może tymczasowo pozostać cache'em kompatybilności.
- [ ] Przygotować typy DTO i kontrakty odpowiedzi współdzielone przez API oraz
  frontend.
- [ ] W odpowiedzi wyceny od początku przewidzieć listę rabatów, nawet jeśli w
  pierwszej wersji będzie pusta.
- [ ] Zdefiniować idempotency key dla zamówień i aktywacji entitlementów.
- [ ] Dodać feature flagi osobno dla publicznego cennika, checkoutu,
  wyróżnień i promocji.
- [ ] Dodać testy encji, migracji, ograniczeń, relacji i unikalności.

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
