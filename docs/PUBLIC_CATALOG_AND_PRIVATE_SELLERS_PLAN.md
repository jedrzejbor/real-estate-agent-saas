# Publiczny katalog ofert i prywatni sprzedający — plan produktu

Dokument opisuje, gdzie pokazujemy wejścia do wyszukiwarki ofert, jak
promujemy dodawanie ofert przez zwykłych użytkowników oraz jak docelowo
rozdzielamy konta agentów od kont prywatnych właścicieli.

Plan ma być bazą do kolejnych tasków wdrożeniowych. Po każdej większej zmianie
uzupełniamy status, decyzje i follow-upy.

---

## 1. Cel

Chcemy zbudować dwa publiczne wejścia do EstateFlow:

- `Szukający` — osoba, która chce znaleźć nieruchomość w katalogu `/oferty`.
- `Właściciel` — osoba prywatna, która chce dodać mieszkanie, dom albo działkę
  bez zakładania konta agenta.

Produkt dla agentów nadal pozostaje głównym SaaS/CRM, ale publiczny katalog i
dodawanie ofert przez właścicieli mają tworzyć dodatkowy acquisition loop:

1. właściciel dodaje ofertę,
2. oferta trafia do katalogu i na mapę,
3. kupujący wysyła zapytanie,
4. właściciel widzi wartość,
5. część użytkowników zakłada konto do zarządzania ofertą,
6. część właścicieli albo agentów przechodzi do płatnego planu.

---

## 2. Główne persony

### Szukający nieruchomości

Potrzebuje:

- szybko wejść do katalogu ofert,
- filtrować po mieście, mapie, cenie i parametrach,
- zaufać, że oferty są aktualne,
- łatwo wysłać zapytanie.

Nie potrzebuje:

- komunikacji o CRM,
- rejestracji przed przeglądaniem,
- złożonego onboardingu.

### Prywatny właściciel

Potrzebuje:

- prostego formularza dodania oferty,
- jasnej informacji, co stanie się po wysłaniu,
- publikacji na mapie i w katalogu,
- odbierania zapytań,
- możliwości edycji albo usunięcia oferty.

Nie potrzebuje na starcie:

- pełnego CRM,
- raportów,
- zarządzania zespołem,
- terminologii dla agencji.

### Agent / biuro nieruchomości

Potrzebuje:

- CRM,
- wielu ofert,
- klientów, spotkań, raportów,
- publikacji ofert,
- leadów z publicznych kart,
- limitów i upgrade'u.

---

## 3. Wejścia do wyszukiwarki ofert

### Priorytet MVP

- [x] Navbar publiczny
  - Dodać link `Oferty` prowadzący do `/oferty`.
  - Link powinien być widoczny dla niezalogowanych i zalogowanych.
  - CTA nie powinno konkurować agresywnie z rejestracją agenta.
  - Data zakończenia: 2026-05-07
  - Wykonano:
    - dodano link `Oferty` w desktopowej nawigacji marketingowej,
    - dodano widoczny link `Oferty` w mobilnym navbarze, ponieważ hamburger jest
      obecnie placeholderem,
    - pozostawiono `Dodaj ofertę` jako osobne CTA, żeby link do katalogu nie
      konkurował z akcją publikacji oferty.
  - Uwagi / follow-up:
    - po wdrożeniu pełnego mobilnego menu przenieść link `Oferty` również do
      listy rozwijanej.

- [x] Hero strony głównej
  - Dodać drugie CTA: `Szukaj nieruchomości` -> `/oferty`.
  - Obok powinno być CTA: `Dodaj ofertę` -> `/dodaj-oferte`.
  - Copy ma mówić o realnej akcji, nie o funkcjach systemu.
  - Data zakończenia: 2026-05-07
  - Wykonano:
    - zmieniono główne CTA hero na `Szukaj nieruchomości` prowadzące do
      `/oferty`,
    - pozostawiono obok CTA `Dodaj ofertę bez konta` prowadzące do
      `/dodaj-oferte`,
    - przeniesiono rejestrację agenta do trzeciego, mniej dominującego CTA,
    - dopasowano headline i opis hero do realnych akcji: szukania, dodawania i
      zarządzania ofertami.
  - Uwagi / follow-up:
    - po dodaniu sekcji `Dla właścicieli nieruchomości` sprawdzić, czy hero nie
      komunikuje zbyt wielu ścieżek naraz.

- [x] Sekcja na stronie głównej
  - Dodać moduł `Publiczny katalog ofert`.
  - Pokazać, że oferty można przeglądać na liście i mapie.
  - Dodać link do `/oferty`.
  - Data zakończenia: 2026-05-07
  - Wykonano:
    - dodano sekcję `Publiczny katalog ofert` bezpośrednio pod hero,
    - pokazano trzy konkretne wartości: szybkie wyszukiwanie, widok mapy i
      publiczne wyniki,
    - dodano CTA `Otwórz katalog ofert` prowadzące do `/oferty`,
    - dodano drugie CTA `Dodaj swoją ofertę` prowadzące do `/dodaj-oferte`,
    - dodano wizualny podgląd oferty z sygnałem listy i mapy.
  - Uwagi / follow-up:
    - po dodaniu realnych liczników katalogu można zastąpić statyczny podgląd
      danymi z API.

- [x] Stopka
  - Dodać linki:
    - `Oferty nieruchomości` -> `/oferty`
    - `Dodaj ofertę` -> `/dodaj-oferte`
    - `Zasady publikacji ofert` -> `/zasady-publikacji`
  - Data zakończenia: 2026-05-07
  - Wykonano:
    - dodano `Oferty nieruchomości` i `Dodaj ofertę` do kolumny produktowej
      stopki,
    - doprecyzowano link prawny jako `Zasady publikacji ofert`.

- [x] Ekran sukcesu po dodaniu oferty
  - Dodać link `Przejdź do katalogu ofert`.
  - Pokazać status: `Oferta trafiła do weryfikacji`.
  - Wyjaśnić, kiedy pojawi się publicznie.
  - Data zakończenia: 2026-05-07
  - Wykonano:
    - na ekranie `sprawdz-email` dodano status zgłoszenia i link do katalogu
      `/oferty`,
    - doprecyzowano, że po potwierdzeniu emaila oferta może trafić publicznie do
      katalogu po przejęciu i automatycznej kontroli albo po sprawdzeniu,
    - na ekranie `potwierdzono` dodano link do katalogu oraz komunikat o dalszym
      przejęciu/weryfikacji.
  - Uwagi / follow-up:
    - po dodaniu konta `PRIVATE_SELLER` zaktualizować copy, żeby nie mówiło
      wyłącznie o przejęciu do CRM.

### Priorytet późniejszy

- [x] Linki SEO z popularnych miast
  - Przygotować strony lub linki do katalogu z parametrem `city`.
  - Przykłady:
    - `/oferty?city=Warszawa`
    - `/oferty?city=Bydgoszcz`
    - `/oferty?city=Łabiszyn`
  - Data zakończenia: 2026-05-09
  - Wykonano:
    - dodano współdzieloną listę popularnych lokalizacji SEO dla katalogu,
    - dodano sekcję `Popularne lokalizacje` na stronie `/oferty`,
    - dodano indeksowalne metadata i canonical dla zaplanowanych widoków
      miejskich,
    - dodano popularne widoki miejskie do sitemap.
  - Uwagi / follow-up:
    - listę miast można rozszerzać po analizie realnych zapytań i podaży ofert,
      ale indeksować tylko wybrane, kontrolowane widoki bez dodatkowych filtrów.

- [x] Linki z publicznych profili agentów
  - Z profilu agenta linkować do jego ofert oraz do całego katalogu.
  - Data zakończenia: 2026-05-09
  - Wykonano:
    - dodano publiczny filtr katalogu po `agentId`,
    - dodano link `Zobacz oferty tego profilu` z profilu agenta do
      `/oferty?agentId=...`,
    - dodano link `Przejdź do całego katalogu`,
    - zachowano filtr `agentId` podczas dalszego filtrowania wyników w
      katalogu,
    - zabezpieczono metadata katalogu, żeby widoki z `agentId` nie były
      indeksowane jako duplikaty SEO.

- [ ] Empty state katalogu
  - Gdy nie ma wyników, pokazać:
    - `Zmień filtry`
    - `Dodaj ofertę w tej lokalizacji`

---

## 4. Promowanie dodawania ofert przez prywatnych właścicieli

### Główna obietnica

Rekomendowane copy:

> Sprzedajesz mieszkanie, dom albo działkę? Dodaj ofertę w kilka minut i pokaż
> ją w publicznym katalogu EstateFlow.

W komunikacji unikamy słów:

- CRM,
- pipeline,
- workspace,
- freemium,
- lead management.

Używamy prostych słów:

- dodaj ofertę,
- pokaż na mapie,
- odbieraj zapytania,
- edytuj lub usuń ogłoszenie,
- bez konta na start.

### Miejsca promocji

- [ ] Homepage
  - Sekcja `Dla właścicieli nieruchomości`.
  - CTA: `Dodaj ofertę bez konta`.

- [ ] Publiczny katalog `/oferty`
  - CTA nad wynikami: `Dodaj ofertę`.
  - CTA w empty state.
  - Delikatny komunikat przy mapie: `Nie widzisz swojej lokalizacji? Dodaj ofertę`.

- [ ] Strona `/dodaj-oferte`
  - Uprościć komunikację pod właściciela prywatnego.
  - Jasno opisać proces:
    1. uzupełnij dane,
    2. potwierdź kontakt,
    3. poczekaj na weryfikację,
    4. oferta pojawi się w katalogu.

- [ ] Stopka i regulaminy
  - Link do zasad publikacji.
  - Link do polityki prywatności.
  - Informacja o zgłaszaniu nadużyć.

- [ ] SEO lokalne
  - Przygotować treści pod frazy:
    - `dodaj ogłoszenie nieruchomości`
    - `sprzedam mieszkanie bez pośrednika`
    - `dodaj działkę na sprzedaż`
    - `oferty nieruchomości [miasto]`

---

## 5. Statusy publicznej oferty prywatnej

Docelowo publiczna oferta dodana bez konta powinna przechodzić przez jasne
statusy:

- `draft` — zapis roboczy, jeśli wprowadzimy zapisywanie wersji roboczych.
- `submitted` — wysłana przez właściciela.
- `pending_verification` — oczekuje na moderację.
- `published` — widoczna publicznie w katalogu i na mapie.
- `rejected` — odrzucona po weryfikacji.
- `expired` — wygasła po określonym czasie bez odnowienia.
- `removed_by_owner` — usunięta przez właściciela.
- `removed_by_moderator` — usunięta przez administrację.

Minimalny MVP:

- [ ] `submitted`
- [ ] `pending_verification`
- [ ] `published`
- [ ] `rejected`

Komunikaty dla użytkownika:

- po wysłaniu: `Oferta została wysłana do weryfikacji`.
- po publikacji: `Oferta jest już widoczna w katalogu`.
- po odrzuceniu: `Oferta wymaga poprawek albo nie spełnia zasad publikacji`.

---

## 6. Model kont

### Decyzja kierunkowa

Docelowo potrzebujemy osobnego rodzaju konta dla prywatnych właścicieli.
Nie powinniśmy mieszać ich z kontami agentów, bo mają inne potrzeby, inne
limity i inną komunikację.

### Proponowane role / typy kont

#### `PRIVATE_SELLER`

Konto dla osoby prywatnej.

Może:

- dodać ofertę,
- edytować swoje oferty,
- usunąć swoje oferty,
- odbierać zapytania,
- zobaczyć podstawowe statystyki oferty,
- potwierdzić własność przez email.

Nie może:

- używać pełnego CRM,
- zarządzać klientami,
- zarządzać spotkaniami,
- dodawać użytkowników zespołu,
- korzystać z raportów agencyjnych.

Proponowane limity MVP:

- `1-3` aktywne oferty,
- podstawowe zdjęcia,
- podstawowy formularz kontaktowy,
- widoczny branding EstateFlow.

#### `AGENT`

Obecny model SaaS/CRM.

Może:

- zarządzać ofertami,
- zarządzać klientami,
- zarządzać spotkaniami,
- publikować oferty,
- analizować leady i raporty,
- korzystać z limitów planów freemium/płatnych.

#### `ADMIN` / `MODERATOR`

Może:

- przeglądać zgłoszenia ofert,
- publikować lub odrzucać oferty,
- usuwać spam,
- obsługiwać zgłoszenia nadużyć,
- przeglądać logi moderacji.

---

## 7. Etapy wdrożenia

### Etap 1 — Wejścia i komunikacja bez przebudowy kont

Cel: szybciej pokazać użytkownikom katalog i formularz dodania oferty.

- [ ] Dodać link `Oferty` do navbaru.
- [ ] Dodać CTA `Szukaj nieruchomości` na homepage.
- [ ] Dodać CTA `Dodaj ofertę` na homepage.
- [ ] Dodać sekcję `Dla właścicieli nieruchomości`.
- [ ] Dodać linki w stopce.
- [ ] Doprecyzować ekran sukcesu po dodaniu oferty.

Bez zmian w modelu kont.

### Etap 2 — Lepsza obsługa ofert bez konta

Cel: właściciel może wrócić do swojej oferty bez pełnego konta.

- [ ] Dodać token edycji wysyłany mailem.
- [ ] Dodać widok `edytuj ofertę` po tokenie.
- [ ] Dodać możliwość wycofania/usunięcia oferty.
- [ ] Dodać powiadomienia mailowe o statusie weryfikacji.
- [ ] Dodać podstawowy panel moderacji zgłoszeń.

### Etap 3 — Konto prywatnego sprzedającego

Cel: użytkownik prywatny ma lekki panel, ale nie pełny CRM.

- [ ] Dodać typ konta `PRIVATE_SELLER`.
- [ ] Dodać onboarding dla właściciela.
- [ ] Dodać prosty dashboard ofert prywatnych.
- [ ] Dodać inbox zapytań dla właściciela.
- [ ] Dodać upgrade path do konta agenta.

### Etap 4 — Growth i SEO

Cel: zwiększyć ruch i liczbę dodawanych ofert.

- [ ] Strony lokalne dla miast i gmin.
- [ ] Indeksowalne widoki katalogu dla wybranych filtrów.
- [ ] Kampanie lokalne.
- [ ] Landing page `Sprzedaj nieruchomość`.
- [ ] Metryki konwersji dla wejść do `/oferty` i `/dodaj-oferte`.

---

## 8. Metryki sukcesu

### Katalog ofert

- wejścia na `/oferty`,
- użycie filtrów,
- użycie mapy,
- kliknięcia w szczegóły oferty,
- wysłane zapytania z kart ofert.

### Dodawanie ofert

- wejścia na `/dodaj-oferte`,
- start formularza,
- ukończenie formularza,
- procent ofert zaakceptowanych,
- czas od wysłania do publikacji,
- liczba ofert z poprawnymi współrzędnymi.

### Prywatni właściciele

- liczba ofert dodanych bez konta,
- liczba właścicieli, którzy wracają do edycji,
- liczba właścicieli, którzy zakładają konto,
- liczba właścicieli, którzy otrzymują pierwsze zapytanie,
- liczba ofert usuniętych / wygasłych / odrzuconych.

---

## 9. Ryzyka i decyzje

### Ryzyka

- spam i fałszywe oferty,
- duplikaty ofert,
- nieaktualne ogłoszenia,
- niejasne granice między prywatnym właścicielem a agentem,
- koszt moderacji,
- problemy prawne przy danych kontaktowych i zdjęciach,
- zbyt agresywna promocja prywatnych ofert może rozmyć pozycjonowanie SaaS dla
  agentów.

### Decyzje do podjęcia

- [ ] Czy prywatna oferta może zostać opublikowana automatycznie po email
      verification, czy zawsze wymaga moderacji?
- [ ] Ile aktywnych ofert może mieć prywatny sprzedający?
- [ ] Czy prywatny właściciel widzi zapytania w panelu, czy tylko mailem?
- [ ] Czy konto `PRIVATE_SELLER` może zostać przekonwertowane na `AGENT`?
- [ ] Czy agent może przejmować ofertę dodaną przez właściciela za zgodą
      właściciela?
- [ ] Po jakim czasie oferta prywatna wygasa bez odnowienia?

---

## 10. Najbliższy rekomendowany backlog

1. `PC.1` Dodać wejścia do katalogu ofert w navbarze, homepage i stopce.
2. `PC.2` Dodać sekcję homepage dla prywatnych właścicieli.
3. `PC.3` Doprecyzować komunikaty na `/dodaj-oferte`.
4. `PC.4` Doprecyzować ekran sukcesu po dodaniu oferty.
5. `PC.5` Dodać eventy analityczne dla `/oferty` i `/dodaj-oferte`.
6. `PC.6` Zaprojektować statusy i moderację publicznych zgłoszeń.
7. `PC.7` Zaprojektować token edycji oferty bez konta.
8. `PC.8` Przygotować specyfikację konta `PRIVATE_SELLER`.
