# Panel zwykłego klienta / prywatnego właściciela — plan zmian

Data utworzenia: 2026-05-16

Dokument opisuje, co powinniśmy zmienić w panelu użytkownika dla osoby, która
nie jest agentem i chce opublikować lub zarządzać tylko własnym ogłoszeniem.
Ten typ konta w produkcie traktujemy jako `private_seller`, a technicznie może
być mapowany na rolę `viewer`, dopóki nie dodamy osobnej roli domenowej.

---

## 1. Cel

Zwykły klient po rejestracji nie powinien trafiać do pełnego CRM dla agentów.
Powinien dostać prosty panel właściciela, w którym może:

- dodać ofertę,
- zobaczyć status publikacji,
- poprawić dane oferty,
- zarządzać zdjęciami,
- odebrać zapytania od zainteresowanych,
- wycofać albo odnowić ogłoszenie.

Panel ma być produktem do jednej pracy: „opublikuj i obsłuż swoje ogłoszenie”.
Nie pokazujemy terminologii agencji, CRM, pipeline'u, klientów, spotkań,
raportów ani limitów zespołowych, jeśli użytkownik nie jest agentem.

---

## 2. Persony i zakres

### Prywatny właściciel

Przykład: osoba sprzedająca mieszkanie, dom albo działkę.

Potrzebuje:

- jasnego statusu, czy ogłoszenie jest widoczne publicznie,
- prostego formularza edycji,
- podglądu strony publicznej,
- listy zapytań od kupujących,
- możliwości zakończenia publikacji.

Nie potrzebuje:

- dashboardu sprzedażowego,
- modułu klientów CRM,
- kalendarza wizyt jako osobnego systemu,
- raportów i analityki zaawansowanej,
- konfiguracji agencji.

### Agent / biuro

Agent nadal korzysta z pełnego panelu `/dashboard`.
Ten dokument nie ogranicza funkcji agenta. Chodzi o osobny, prostszy widok dla
użytkowników, którzy wybrali `Tylko ogłoszenie` podczas rejestracji.

---

## 3. Routing i wejście po rejestracji

### Docelowe ścieżki

- `/seller` — główny panel prywatnego właściciela.
- `/seller/listings` — lista własnych ogłoszeń.
- `/seller/listings/new` — dodanie ogłoszenia po zalogowaniu.
- `/seller/listings/[id]` — szczegóły i status ogłoszenia.
- `/seller/listings/[id]/edit` — edycja danych.
- `/seller/inquiries` — zapytania do ogłoszeń.
- `/seller/settings` — podstawowe dane konta.

### Przekierowania

- Rejestracja z wyborem `Tylko ogłoszenie`:
  - MVP: `/dodaj-oferte`,
  - docelowo: `/seller/listings/new`.
- Logowanie użytkownika `private_seller`:
  - docelowo: `/seller`,
  - nie `/dashboard`.
- Próba wejścia na `/dashboard` przez `private_seller`:
  - przekierowanie do `/seller`.
- Próba wejścia na `/seller` przez agenta:
  - można pozwolić, ale preferowane jest przekierowanie do `/dashboard`, żeby
    uniknąć dwóch równoległych paneli dla tej samej pracy.

---

## 4. Nawigacja panelu właściciela

Panel powinien mieć osobny układ, prostszy niż dashboard agenta.

### Elementy menu

- `Moje ogłoszenia`
- `Dodaj ogłoszenie`
- `Zapytania`
- `Ustawienia`

### Elementy, których nie pokazujemy

- `Klienci`
- `Kalendarz`
- `Raporty`
- `Feedback`
- `Admin`
- `Upgrade` w wersji agentowej
- onboarding CRM dla agentów

### Topbar

Powinien pokazywać:

- imię / email użytkownika,
- link `Zobacz katalog ofert`,
- akcję `Dodaj ogłoszenie`,
- wylogowanie.

Nie powinien pokazywać:

- nazwy agencji jako głównego kontekstu,
- liczników planu agencyjnego,
- global search po klientach i spotkaniach.

---

## 5. Widok główny `/seller`

### Cel widoku

Po wejściu użytkownik ma od razu wiedzieć:

- ile ma ogłoszeń,
- które są opublikowane,
- które wymagają akcji,
- czy przyszły nowe zapytania.

### Sekcje

1. `Status ogłoszeń`
   - liczba aktywnych,
   - liczba oczekujących na weryfikację,
   - liczba wymagających poprawek,
   - liczba wycofanych.

2. `Najważniejsza akcja`
   - jeśli nie ma ogłoszeń: `Dodaj pierwsze ogłoszenie`,
   - jeśli jest draft: `Dokończ ogłoszenie`,
   - jeśli oferta wymaga poprawy: `Popraw ogłoszenie`,
   - jeśli są nowe zapytania: `Odpowiedz na zapytania`.

3. `Moje ogłoszenia`
   - kompaktowa lista 3-5 najnowszych,
   - status,
   - miniatura,
   - miasto,
   - cena,
   - link do publicznego podglądu.

4. `Zapytania`
   - ostatnie wiadomości,
   - status `nowe / przeczytane / zamknięte`,
   - szybki kontakt email/telefon.

---

## 6. Lista ogłoszeń właściciela

### Pola na karcie ogłoszenia

- zdjęcie główne,
- tytuł,
- lokalizacja,
- cena,
- typ nieruchomości,
- status publikacji,
- liczba zapytań,
- data ostatniej aktualizacji.

### Statusy w UI

Rekomendowane etykiety:

- `Szkic`
- `Czeka na potwierdzenie emaila`
- `W weryfikacji`
- `Opublikowane`
- `Wymaga poprawek`
- `Wycofane`
- `Wygasłe`

Statusy powinny być tłumaczone z technicznych statusów `PublicListingSubmission`
i/lub `ListingPublicationStatus`.

### Akcje na karcie

- `Edytuj`
- `Zobacz publicznie`
- `Zarządzaj zdjęciami`
- `Wycofaj`
- `Odnów`
- `Usuń` albo `Poproś o usunięcie`, zależnie od decyzji prawnej.

---

## 7. Dodawanie i edycja ogłoszenia

### MVP

Możemy wykorzystać obecny wizard `/dodaj-oferte`, ale po zalogowaniu właściciel
powinien mieć mniej pól kontaktowych do wpisywania ręcznie.

Zmiany:

- email pobierany z konta,
- imię i nazwisko pobierane z profilu,
- telefon można uzupełnić raz i zapisać w profilu,
- draft powinien być przypisany do konta właściciela,
- po zapisie użytkownik wraca do `/seller/listings/[id]`.

### Docelowo

Dodajemy osobny edytor ogłoszenia w panelu:

- podstawy,
- lokalizacja,
- parametry,
- opis,
- zdjęcia,
- kontakt,
- podgląd publikacji.

Właściciel nie widzi pól agentowych:

- status klienta,
- agent prowadzący,
- agency branding,
- zaawansowane SEO,
- historia CRM,
- rollback statusu.

---

## 8. Zapytania do ogłoszeń

Prywatny właściciel powinien widzieć tylko zapytania dotyczące jego własnych
ogłoszeń.

### Widok listy

Pola:

- imię osoby zainteresowanej,
- email,
- telefon,
- treść wiadomości,
- oferta, której dotyczy,
- data wysłania,
- status.

### Akcje

- `Oznacz jako przeczytane`
- `Zamknij`
- `Odpowiedz email`
- `Zadzwoń`

Nie tworzymy automatycznie klienta CRM dla prywatnego właściciela. To zachowanie
zostaje dla agentów.

---

## 9. Uprawnienia i bezpieczeństwo

### Zasady dostępu

- `private_seller` widzi tylko swoje ogłoszenia.
- `private_seller` widzi tylko zapytania do swoich ogłoszeń.
- `private_seller` nie może odczytać listy klientów, spotkań, raportów ani
  danych agencji.
- Agent nie powinien przypadkowo widzieć prywatnych ogłoszeń nieprzypisanych do
  jego agencji.

### Techniczne konsekwencje

Potrzebujemy jasnego ownershipu dla ofert właściciela:

- dodać `ownerUserId` do `PublicListingSubmission` albo `Listing`,
- albo dodać osobną relację `sellerUserId`,
- nie opierać dostępu wyłącznie na emailu z formularza.

Email może służyć do claimu i weryfikacji, ale po założeniu konta właścicielem
powinien być `user.id`.

---

## 10. Dane i API

### Nowe lub zmienione endpointy

Rekomendowany zestaw:

- `GET /api/seller/listings`
- `GET /api/seller/listings/:id`
- `POST /api/seller/listings`
- `PATCH /api/seller/listings/:id`
- `POST /api/seller/listings/:id/images`
- `DELETE /api/seller/listings/:id/images/:imageId`
- `POST /api/seller/listings/:id/submit-for-review`
- `POST /api/seller/listings/:id/unpublish`
- `GET /api/seller/inquiries`
- `PATCH /api/seller/inquiries/:id`

Alternatywa MVP:

- rozszerzyć istniejące public listing submissions,
- dodać właścicielski filtr po `ownerUserId`,
- później wydzielić `/api/seller/*`.

### Minimalne zmiany w modelu

- `users.role`: docelowo dodać osobną rolę `private_seller` albo pole
  `accountType`.
- `public_listing_submissions.owner_user_id`: nullable FK do `users`.
- `listings.owner_user_id`: nullable FK do `users`, jeśli opublikowana oferta
  prywatna ma żyć jako `Listing`.
- `public_leads.owner_user_id` albo pośrednie ustalanie właściciela przez
  ofertę.

---

## 11. Komunikacja i copy

W panelu właściciela używamy prostego języka:

- `ogłoszenie`, nie `listing`,
- `zapytanie`, nie `lead`,
- `właściciel`, nie `agent`,
- `opublikowane`, nie `publication status`,
- `wycofaj ogłoszenie`, nie `unpublish`.

Unikamy:

- CRM,
- workspace,
- pipeline,
- plan agencyjny,
- lead management,
- onboarding agenta.

---

## 12. Monetyzacja i limity

Na start nie mieszamy właścicielowi w panelu komunikatów SaaS dla agentów.

Możliwe limity dla konta prywatnego:

- 1 aktywne ogłoszenie w darmowym wariancie,
- limit zdjęć, np. 15,
- ogłoszenie wygasa po 30/60/90 dniach,
- odnowienie wymaga kliknięcia albo płatności.

Potencjalne płatne dodatki:

- wyróżnienie ogłoszenia,
- więcej zdjęć,
- dłuższa publikacja,
- promowanie na mapie,
- przejście na konto agenta.

Te decyzje wymagają osobnego dokumentu pricingowego.

---

## 13. Etapy wdrożenia

### Etap 1 — Minimum po rejestracji

- [x] Po loginie `private_seller` przekierować do `/seller` albo
  `/dodaj-oferte`.
  - Data zakończenia: 2026-05-16
  - Wykonano:
    - dodano wspólny helper `getDefaultAuthenticatedPath`,
    - użytkownik z rolą tymczasowo mapowaną na `private_seller` (`viewer`) po
      loginie trafia do `/dodaj-oferte`,
    - rejestracja korzysta z odpowiedzi API zamiast duplikować logikę
      przekierowań po stronie formularza.
- [x] Ukryć pełny dashboard CRM przed `private_seller`.
  - Data zakończenia: 2026-05-16
  - Wykonano:
    - layout `/dashboard` rozpoznaje prywatnego sprzedającego przez helper
      `isPrivateSellerUser`,
    - prywatny sprzedający jest przekierowywany z `/dashboard` do
      `/dodaj-oferte`,
    - dashboard CRM nie renderuje sidebaru, topbaru ani treści modułów CRM dla
      tej roli.
- [x] Dodać prosty ekran `/seller` z CTA `Dodaj ogłoszenie`.
  - Data zakończenia: 2026-05-16
  - Wykonano:
    - dodano chroniony widok `/seller`,
    - prywatny sprzedający widzi uproszczony panel właściciela,
    - główne CTA prowadzi do `/dodaj-oferte`,
    - agenci trafiają z `/seller` z powrotem do `/dashboard`,
    - niezalogowani użytkownicy trafiają do `/login`.
- [x] Dodać pusty stan: `Nie masz jeszcze ogłoszeń`.
  - Data zakończenia: 2026-05-16
  - Wykonano:
    - dodano pusty stan dla konta bez ogłoszeń,
    - pokazano krótką ścieżkę: dodanie danych, zdjęcia, publikacja,
    - dodano drugorzędny link do katalogu ofert.

### Etap 2 — Własne ogłoszenia

- [x] Powiązać submission/listing z `ownerUserId`.
  - Data zakończenia: 2026-05-16
  - Wykonano:
    - dodano `ownerUserId` do `PublicListingSubmission`,
    - dodano nullable `ownerUserId` do `Listing`, żeby opublikowana oferta
      mogła zachować właściciela po utworzeniu rekordu oferty,
    - dodano migrację SQL dla kolumny, indeksu i FK do `users`,
    - zalogowany prywatny właściciel wysyła formularz przez chroniony endpoint,
      dzięki czemu ownership wynika z JWT, nie z danych przesłanych z UI.
- [x] Dodać listę własnych ogłoszeń.
  - Data zakończenia: 2026-05-16
  - Wykonano:
    - dodano chroniony endpoint listujący zgłoszenia bieżącego użytkownika,
    - `/seller` pobiera i pokazuje własne zgłoszenia właściciela,
    - pusty stan nadal pojawia się, gdy lista jest pusta.
- [x] Dodać widok statusu ogłoszenia.
  - Data zakończenia: 2026-05-16
  - Wykonano:
    - karty ogłoszeń w `/seller` pokazują status publikacji,
    - statusy mają etykiety i opis kolejnego kontekstu dla właściciela,
    - opublikowane/przejęte zgłoszenia pokazują link do publicznej oferty, gdy
      dostępny jest publiczny slug.
- [x] Dodać edycję podstawowych danych.
  - Data zakończenia: 2026-05-16
  - Wykonano:
    - dodano chroniony endpoint szczegółów zgłoszenia właściciela,
    - dodano chroniony endpoint zapisu podstawowych danych,
    - dodano stronę `/seller/listings/[id]/edit`,
    - zapis działa wyłącznie dla zgłoszenia z `ownerUserId` równym bieżącemu
      użytkownikowi.
- [x] Dodać zarządzanie zdjęciami.
  - Data zakończenia: 2026-05-16
  - Wykonano:
    - edycja ogłoszenia pokazuje aktualne zdjęcia z payloadu zgłoszenia,
    - właściciel może dodać zdjęcia przez istniejący mechanizm uploadu,
    - właściciel może usuwać zdjęcia z listy przed zapisem,
    - po zapisie payload zgłoszenia przechowuje zaktualizowaną kolejność zdjęć.

### Etap 3 — Zapytania

- [x] Pokazać zapytania tylko do ogłoszeń właściciela.
  - Data zakończenia: 2026-05-17
  - Wykonano:
    - dodano chroniony endpoint `GET /api/public-leads/seller`,
    - backend filtruje zapytania przez `listing.ownerUserId = currentUser.id`,
      więc właściciel nie może pobrać zapytań do cudzych ogłoszeń,
    - panel `/seller` pokazuje ostatnie zapytania z tego endpointu.
- [x] Dodać statusy zapytań.
  - Data zakończenia: 2026-05-17
  - Wykonano:
    - karty zapytań w `/seller` pokazują status z `PublicLeadStatus`,
    - statusy używają polskich etykiet i rozróżnionych kolorów,
    - pusty stan zapytań wyjaśnia, że wiadomości pojawią się po kontakcie z
      publicznej strony oferty.
- [ ] Dodać akcje kontaktu.
- [ ] Dodać powiadomienia email o nowych zapytaniach.

### Etap 4 — Dojrzały panel właściciela

- [ ] Dodać wygasanie i odnawianie ogłoszeń.
- [ ] Dodać wycofanie publikacji.
- [ ] Dodać prostą analitykę: wyświetlenia i liczba zapytań.
- [ ] Dodać ścieżkę upgrade'u do konta agenta.

---

## 14. Otwarte decyzje

- Czy dodajemy nową rolę `private_seller`, czy zostajemy przy `viewer` +
  `accountType`?
- Czy prywatna oferta po publikacji staje się normalnym `Listing`, czy zostaje
  w osobnym modelu?
- Czy właściciel może mieć więcej niż jedno aktywne ogłoszenie?
- Czy zapytania mają trafiać wyłącznie do panelu, czy też zawsze ma iść email?
- Czy edycja opublikowanej oferty wymaga ponownej weryfikacji?
- Po jakim czasie ogłoszenie wygasa?
- Czy właściciel może całkowicie usunąć ogłoszenie, czy tylko je wycofać?

---

## 15. Najważniejsze ryzyka

- Pomieszanie panelu właściciela z CRM agenta utrudni onboarding obu grup.
- Dostęp po emailu zamiast po `user.id` może stworzyć problemy bezpieczeństwa.
- Zbyt szybkie tworzenie pełnego dashboardu dla właścicieli zwiększy koszt
  utrzymania produktu.
- Brak jasnych statusów publikacji zwiększy liczbę zapytań do supportu.
- Automatyczne publikowanie bez moderacji może zwiększyć spam i fałszywe oferty.

---

## 16. Rekomendacja MVP

Najpierw zbudować bardzo prosty panel właściciela:

1. `/seller` z pustym stanem i listą własnych ogłoszeń.
2. `ownerUserId` na zgłoszeniu / ofercie.
3. Przekierowania po loginie i rejestracji zależne od typu konta.
4. Status publikacji i link do publicznego podglądu.
5. Lista zapytań do własnych ogłoszeń.

Dopiero po tym warto dodawać odnowienia, płatne wyróżnienia i migrację do konta
agenta.
