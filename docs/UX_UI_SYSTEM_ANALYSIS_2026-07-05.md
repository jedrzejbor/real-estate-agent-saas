# EstateFlow - analiza UX/UI i rekomendacje poprawy odczuc uzytkownika

Data analizy: 2026-07-05  
Zakres: aplikacja web `apps/web`, dashboard agenta, publiczny katalog ofert, wizard dodawania oferty, panel sprzedajacego, UI system, nawigacja, formularze, feedback i stany aplikacji.

## Streszczenie

EstateFlow ma juz dobry fundament UX: dashboard, oferty, klienci, zapytania, kalendarz, zadania, raporty, global search, powiadomienia, onboarding, puste stany, dark mode, wizard publicznego dodawania oferty i publiczny katalog. Produkt nie wyglada jak surowy CRUD, tylko jak realne narzedzie pracy.

Najwiekszy problem nie polega teraz na braku pojedynczego ekranu. Problemem jest gestosc interfejsu i hierarchia informacji. Uzytkownik widzi wiele modulow, kart, zakladek, statusow i akcji, ale nie zawsze od razu wie, co jest najwazniejsze, co wymaga reakcji teraz i jaki jest nastepny najlepszy krok.

Najwieksza poprawa odczuc uzytkownika przyjdzie z:

- uproszczenia pierwszego kontaktu z dashboardem,
- mocniejszej hierarchii informacji,
- bardziej konsekwentnych wzorcow list, szczegolow i formularzy,
- lepszego mobile navigation,
- wiekszej liczby mikrointerakcji i potwierdzen po akcjach,
- odciazenia publicznych flow z nadmiaru tresci i pol.

## Ocena ogolna

Status UX/UI: dobry fundament, wymaga dopracowania pod codzienna ergonomie.

| Priorytet | Obszar | Cel |
| --- | --- | --- |
| P0 | Nawigacja i orientacja | Uzytkownik zawsze wie, gdzie jest i co zrobic dalej |
| P0 | Mobile dashboard | Menu i podstawowe akcje musza byc realnie wygodne na telefonie |
| P1 | Hierarchia dashboardu | Mniej rownorzednych paneli, wiecej jasnych priorytetow |
| P1 | Formularze ofert i publicznego dodawania | Mniej tarcia, lepsze prowadzenie krok po kroku |
| P1 | Listy i detail pages | Spolny wzorzec akcji, statusow i powiazanych danych |
| P2 | Design polish | Mniej ciezkich kart, lepsze proporcje, wiecej stabilnosci wizualnej |

## Najwazniejsze obserwacje

### 1. Dashboard ma duzo wartosci, ale potrzebuje mocniejszej hierarchii

Obecny dashboard ma wiele dobrych elementow: podsumowanie, zakladki, onboarding, aktywnosc, pipeline, plan, feedback, widok dzisiejszy i insighty. To jest mocny zakres funkcjonalny.

Ryzyko UX:

- ekran startowy moze byc odbierany jako zbyt rozbudowany,
- zakladki w dashboardzie konkuruja z boczna nawigacja,
- uzytkownik moze nie wiedziec, czy zaczac od `Dashboard`, `Zadania`, `Zapytania`, `Kalendarz` czy `Raporty`,
- metryki i panele moga dominowac nad najwazniejszymi akcjami.

Rekomendacja:

- Zmienic dashboard w centrum operacyjne `Dzisiaj`.
- Na gorze pokazac maksymalnie 3-5 najwazniejszych rzeczy:
  - nowe leady bez kontaktu,
  - spotkania dzisiaj,
  - zadania po terminie,
  - oferty bez aktywnosci,
  - dokumenty lub publikacje wymagajace uwagi.
- Metryki przeniesc nizej albo do drugiego poziomu.
- Kazda karta powinna odpowiadac na pytanie: `co mam teraz zrobic?`

Dobry wzorzec:

```text
Dzisiaj
1. Oddzwon do 2 nowych leadow
2. Przygotuj sie do 1 prezentacji
3. Uzupelnij zdjecia w 1 ofercie
4. Zamknij 3 zalegle follow-upy
```

## 2. Sidebar jest funkcjonalny, ale za dlugi i plaski

Obecny sidebar pokazuje wiele pozycji na tym samym poziomie: Dashboard, Oferty, Klienci, Transakcje, Zapytania, Kalendarz, Zadania, Raporty, Samouczek, Feedback, Ankiety, Glosowanie oraz pozycje admina.

Ryzyko UX:

- zbyt wiele rownorzednych wyborow,
- funkcje pomocnicze konkuruja z glowna praca agenta,
- admin moze miec bardzo dluga nawigacje,
- nowy uzytkownik nie odroznia funkcji codziennych od okazjonalnych.

Rekomendacja:

- Podzielic menu na grupy:
  - `Praca`: Dashboard, Zapytania, Zadania, Kalendarz
  - `CRM`: Oferty, Klienci, Transakcje
  - `Analiza`: Raporty
  - `Rozwoj`: Samouczek, Feedback, Ankiety, Glosowanie
  - `Admin`: Feedback, Analytics, Blog, Moderacja, Plany
- Rozwazyc zwijane grupy dla rzadkich sekcji.
- Dla pierwszych 7 dni po rejestracji pokazac krotsze menu i onboardingowe wskazanie kolejnych krokow.
- Wyróżnić `Zapytania` i `Zadania`, gdy sa nowe lub po terminie.

## 3. Mobile navigation wymaga dopracowania

W topbarze istnieje przycisk menu na mobile, ale sam komponent topbaru nie pokazuje kompletnego wzorca otwierania mobilnego sidebara. Dashboard jest narzedziem, do ktorego agent moze wracac w terenie, wiec mobile nie moze byc tylko dodatkiem.

Ryzyko UX:

- agent na telefonie nie ma szybkiego dostepu do kluczowych sekcji,
- duze tabele, filtry i karty moga wymagac za duzo przewijania,
- akcje kontaktu powinny byc latwiejsze na mobile niz na desktopie.

Rekomendacja P0:

- Dodac realny mobile drawer dla sidebara.
- Dodac dolna nawigacje dla 4 najczestszych akcji:
  - Dashboard,
  - Zapytania,
  - Kalendarz,
  - Oferty albo Zadania.
- Na mobile priorytetowo eksponowac akcje `Zadzwon`, `SMS/Email`, `Zaplanuj`, `Oznacz wykonane`.
- Sprawdzic wszystkie formularze na szerokosci 360-390 px.

## 4. Listy ofert i klientow sa czytelne, ale moga lepiej wspierac skanowanie

Karty ofert i klientow maja statusy, metryki i akcje. To jest dobry kierunek. Jednoczesnie karta oferty pokazuje sporo informacji: typ, transakcje, status, tytul, lokalizacje, parametry, zdjecie, cene, prowizje, wyświetlenia i date.

Ryzyko UX:

- przy duzej liczbie ofert karta staje sie trudna do szybkiego porownywania,
- najwazniejszy status biznesowy nie zawsze jest dominujacy,
- brakuje widoku tabelarycznego dla uzytkownikow operacyjnych,
- filtry sa podstawowe i nie zawsze podpowiadaja aktywne problemy.

Rekomendacja:

- Dodac przelacznik `Karty / Lista`.
- W widoku listy pokazac kolumny:
  - tytul,
  - lokalizacja,
  - cena,
  - status,
  - publikacja,
  - ostatnia aktywnosc,
  - leady,
  - szybka akcja.
- Dodac szybkie filtry:
  - `Wymagaja uwagi`,
  - `Bez zdjec`,
  - `Nieopublikowane`,
  - `Bez leadow 14 dni`,
  - `Po terminie wygasniecia`.
- Na kartach pokazac jeden najwazniejszy alert zamiast wielu rownorzednych drobnych danych.

## 5. Detail pages powinny miec jeden wspolny wzorzec

Strona szczegolow oferty ma bardzo bogaty zakres: publikacja, dokumenty, aktywnosc, spotkania, zapytania, transakcje, pasujacy klienci, szablony wiadomosci. To jest wartosciowe, ale moze tworzyc duzo konkurujacych sekcji.

Rekomendowany wzorzec dla kazdej strony szczegolu:

1. Header:
   - nazwa encji,
   - status,
   - najwazniejszy kontekst,
   - 1 primary action,
   - 2-3 secondary actions.
2. Pasek `Nastepny krok`:
   - jasna rekomendacja,
   - termin,
   - akcja.
3. Sekcje:
   - `Podsumowanie`,
   - `Powiazania`,
   - `Aktywnosc`,
   - `Dokumenty/Pliki`,
   - `Historia`.
4. Prawy panel kontekstowy na desktopie:
   - kontakt,
   - ostatnie zdarzenie,
   - szybkie akcje.

Przyklad:

```text
Oferta: Mieszkanie 3 pokoje, Mokotow
Status: Opublikowana
Nastepny krok: Odpowiedz na 2 nowe zapytania
[Odpowiedz] [Zaplanuj prezentacje] [Udostepnij]
```

## 6. Formularze sa kompletne, ale wymagaja redukcji tarcia

Formularz oferty i wizard publicznego dodawania maja wiele pol, walidacje i pomocnicze mechanizmy. To dobrze dla jakosci danych, ale moze byc ciezkie w pierwszym uzyciu.

Ryzyko UX:

- uzytkownik moze nie wiedziec, ktore pola sa naprawde konieczne,
- za duzo pol na raz obniza tempo wprowadzania oferty,
- walidacja pojawia sie dopiero po probie przejscia dalej,
- publiczny sprzedajacy moze obawiac sie, co stanie sie po wyslaniu formularza.

Rekomendacja:

- Wprowadzic tryb `Szybka oferta`:
  - tytul,
  - typ,
  - transakcja,
  - miasto/dzielnica,
  - cena,
  - metraz,
  - zdjecia,
  - kontakt.
- Reszte przeniesc do `Uzupelnij szczegoly`.
- Pokazywac procent jakosci oferty i konkretne braki:
  - `Dodaj min. 5 zdjec`,
  - `Uzupelnij opis`,
  - `Ustaw punkt na mapie`,
  - `Dodaj prowizje`.
- Walidowac pola inline przy opuszczeniu pola, nie dopiero na koncu kroku.
- W publicznym wizardzie dodac stale widoczny pasek procesu:
  - `1. Dane`,
  - `2. Email`,
  - `3. Weryfikacja`,
  - `4. Publikacja`.

## 7. Feedback po akcjach powinien byc bardziej widoczny i konkretny

W aplikacji sa toasty i stany loadingu. To dobry fundament. Warto zwiekszyc jakosc mikrofeedbacku, bo SaaS operacyjny powinien dawac uzytkownikowi poczucie kontroli.

Rekomendacja:

- Po zapisie pokazywac, co sie zmienilo i gdzie przejsc dalej.
- Po utworzeniu oferty pokazac panel:
  - `Oferta zapisana`,
  - `Dodaj zdjecia`,
  - `Opublikuj`,
  - `Zobacz publiczny podglad`.
- Po dodaniu leada do CRM pokazac:
  - `Klient utworzony`,
  - `Zaplanuj spotkanie`,
  - `Wyslij wiadomosc`.
- Przy akcjach ryzykownych pokazywac konsekwencje:
  - usuniecie,
  - cofniecie statusu,
  - odpublikowanie,
  - zmiana planu.

## 8. Publiczny katalog powinien byc bardziej „kupujacy-first”

Publiczny katalog ma SEO, filtry, mape, popularne miasta i wyniki. Funkcjonalnie jest mocny. UX moze byc bardziej nastawiony na szybkie znalezienie dobrej oferty.

Ryzyko UX:

- hero i opis zajmuja sporo miejsca przed wynikami,
- panel filtrow na desktopie jest poprawny, ale moze byc ciezki na mobile,
- brakuje mocnych sygnalow zaufania przy ofertach,
- uzytkownik publiczny nie zna EstateFlow i potrzebuje jasnosci, czy kontaktuje sie z agentem, biurem czy sprzedajacym.

Rekomendacja:

- Na mobile zaczac od wyszukiwarki i wynikow, a nie dlugiego opisu.
- Dodac sticky `Filtry` i `Mapa` jako segment control.
- Przy kartach publicznych pokazac:
  - typ kontaktu: agent / biuro / sprzedajacy,
  - kiedy oferta byla aktualizowana,
  - czy cena jest widoczna,
  - lokalizacja przyblizona vs dokladna.
- Dodac zapisane wyszukiwanie albo `Powiadom mnie o podobnych ofertach` jako growth loop.

## 9. UI system jest spojny, ale miejscami zbyt „card-heavy”

Aplikacja uzywa spójnej palety, tokenow CSS, komponentow Button/Card/Badge/Input, ikon lucide i dark mode. To jest duzy plus.

Ryzyko UI:

- wiele ekranow sklada sie z kart w kartach albo duzych paneli z zaokragleniami,
- `rounded-2xl` i cienie sa czeste, przez co narzedzie operacyjne moze wygladac mniej geste niz powinno,
- ciepla paleta jest przyjemna, ale zbyt duzo powierzchni `card/muted` moze obnizac kontrast hierarchii,
- przy wielu badge'ach statusy moga konkurowac ze soba.

Rekomendacja:

- Dla dashboardu i CRM preferowac gestsze, mniej dekoracyjne layouty.
- Ograniczyc duze promienie do modalow, pustych stanow i elementow marketingowych.
- Dla list i tabel stosowac `rounded-lg` albo proste separatory.
- Ustalic regule: jedna karta = jeden obiekt albo jedna decyzja, nie cala sekcja w sekcji.
- Statusy kolorystyczne ograniczyc do sytuacji operacyjnych:
  - sukces,
  - ostrzezenie,
  - blad,
  - wymaga uwagi.

## 10. Empty states sa dobre, ale moga byc bardziej zadaniowe

W aplikacji istnieja puste stany onboardingowe. To dobry kierunek. Warto, aby kazdy pusty stan mowil nie tylko „brak danych”, ale prowadzil do konkretnego efektu.

Lepszy wzorzec:

```text
Brak klientow
Dodaj pierwszego klienta albo zaimportuj CSV, zeby zaczac dopasowywac oferty.
[Dodaj klienta] [Importuj CSV]
```

Rekomendacja:

- Kazdy empty state powinien miec:
  - przyczyne,
  - nastepna akcje,
  - informację, co uzytkownik zyska.
- Przy pustych wynikach filtrow pokazac aktywne filtry jako chipsy z opcja usuniecia.
- Przy braku leadow pokazac link do publikacji oferty lub publicznego profilu.

## 11. Raporty powinny mniej tlumaczyc, a bardziej pomagac podjac decyzje

Raporty sa rozbudowane i maja wiele zakladek. To dobre dla wartosci premium, ale interfejs powinien unikac wrazenia „dashboardu dla dashboardu”.

Rekomendacja:

- Na gorze raportow pokazac 3 wnioski:
  - `Najlepsze zrodlo leadow`,
  - `Oferta wymagajaca uwagi`,
  - `Najwieksza szansa prowizyjna`.
- Dla kazdej metryki dodac interpretacje:
  - dobrze,
  - neutralnie,
  - wymaga uwagi.
- Zamiast wielu rownorzednych wykresow pokazac `co zmienic w tym tygodniu`.
- Dodac eksport/share tylko tam, gdzie raport ma odbiorce: wlasciciel, manager, agent.

## 12. Admin UI powinien byc bardziej defensywny

Admin ma dostep do analytics, planow, moderacji, feedbacku i bloga. UI administracyjny powinien byc bardziej konserwatywny niz reszta aplikacji.

Rekomendacja:

- Dodac wyrazniejsze oznaczenie trybu admin.
- Dla zmian planow i limitow pokazac podsumowanie skutkow przed zapisem.
- Dla moderacji ofert pokazac checklisty:
  - dane kontaktowe,
  - zdjecia,
  - cena,
  - opis,
  - ryzyko abuse.
- Dla analytics dodac gotowe widoki `anomalia`, `wzrost`, `spadek`, `wymaga reakcji`.

## Rekomendowane prace P0

1. Dopracowac mobile navigation:
   - drawer,
   - dolna nawigacja,
   - szybkie akcje kontaktu.
2. Przebudowac pierwszy ekran dashboardu na `Dzisiaj / Nastepne akcje`.
3. Uporzadkowac sidebar w grupy i obnizyc wage funkcji pomocniczych.
4. Ujednolicic header kazdej strony:
   - tytul,
   - opis,
   - primary action,
   - secondary actions.
5. Wprowadzic standardowy wzorzec detail page z paskiem `Nastepny krok`.

## Rekomendowane prace P1

1. Dodac widok tabelaryczny/listowy dla ofert i klientow.
2. Dodac szybkie filtry operacyjne: `wymaga uwagi`, `po terminie`, `bez aktywnosci`.
3. Uproscic formularz oferty przez tryb `Szybka oferta`.
4. Poprawic publiczny katalog na mobile: sticky filtry/mapa/wyniki.
5. Rozszerzyc mikrofeedback po akcjach i dodac konkretne next actions.
6. Uspojnic puste stany i bledy w calej aplikacji.

## Rekomendowane prace P2

1. Dopracowac gestosc UI:
   - mniej duzych kart,
   - mniejsze radiusy w narzedziach operacyjnych,
   - bardziej tabelaryczne uklady tam, gdzie uzytkownik porownuje dane.
2. Dodac personalizacje dashboardu:
   - ukryj sekcje,
   - przypnij najwazniejsze,
   - domyslny widok.
3. Dodac zapisane widoki filtrow:
   - moje aktywne oferty,
   - leady bez kontaktu,
   - spotkania w tym tygodniu.
4. Rozbudowac raporty o rekomendacje, a nie tylko metryki.
5. Dodac publiczne zaufanie:
   - profil agenta,
   - ostatnia aktualizacja,
   - jasny typ kontaktu,
   - latwiejsze udostepnianie oferty.

## Checklist UX review dla kolejnych sprintow

- [ ] Czy na kazdym ekranie widac jedna glowna akcje?
- [ ] Czy uzytkownik wie, co jest najwazniejsze bez czytania calego ekranu?
- [ ] Czy mobile ma te same kluczowe mozliwosci co desktop?
- [ ] Czy puste stany prowadza do akcji?
- [ ] Czy bledy mowia, co poprawic?
- [ ] Czy po zapisie uzytkownik wie, co stalo sie dalej?
- [ ] Czy statusy sa zrozumiale bez znajomosci systemu?
- [ ] Czy lista pozwala szybko porownywac rekordy?
- [ ] Czy detail page pokazuje powiazane encje i nastepny krok?
- [ ] Czy publiczny uzytkownik rozumie, z kim sie kontaktuje i co stanie sie po wyslaniu formularza?

## Sugerowana kolejnosc wdrozenia

Ponizsze sprinty sa ustawione tak, aby pokryc wszystkie punkty z sekcji
`Najwazniejsze obserwacje`. Sprinty 1-3 poprawiaja podstawowa ergonomie pracy,
Sprint 4 domyka jakosc odczuc i raporty, a Sprint 5 zabezpiecza osobny,
bardziej ryzykowny obszar admin UI.

### Sprint 1: Nawigacja i orientacja

Cel: uzytkownik ma od razu rozumiec, gdzie jest, co jest najwazniejsze i jak
przejsc do codziennej pracy bez szukania funkcji.

- [x] Mobile drawer i dolna nawigacja.
- [x] Grupowanie sidebara.
- [x] Ujednolicone headery stron.
- [x] Dashboard `Dzisiaj` jako pierwszy widok.
- [x] Wyroznienie sekcji z nowymi leadami, zadaniami po terminie i dzisiejszymi
  spotkaniami.
- [x] Badge/liczniki przy `Zapytania`, `Zadania` i `Kalendarz`, gdy wymagaja
  reakcji.
- [x] Krotka wersja menu dla nowych uzytkownikow w pierwszym okresie onboardingu.

Status wdrozenia Sprint 1, iteracja 1 - 2026-07-06:

- Dodano realny mobile drawer w shellu dashboardu:
  - przycisk menu w topbarze otwiera panel boczny na mobile,
  - panel ma overlay, przycisk zamkniecia i zamyka sie po zmianie trasy,
  - desktopowy sidebar zachowuje dotychczasowe miejsce i szerokosc.
- Dodano dolna nawigacje mobile dla najczestszych przejsc:
  - `Dzisiaj`,
  - `Zapytania`,
  - `Kalendarz`,
  - `Zadania`.
- Przebudowano sidebar na grupy:
  - `Praca`,
  - `CRM`,
  - `Analiza`,
  - `Rozwoj`,
  - `Admin` dla roli admina.
- Dodano liczniki reakcji w nawigacji na podstawie `dashboard/today`:
  - `Zapytania` liczy publiczne leady,
  - `Zadania` liczy zadania z listy dzisiejszych akcji,
  - `Kalendarz` liczy spotkania z listy dzisiejszych akcji.
- Wzmocniono pierwszy widok dashboardu:
  - zakladka `Przeglad` zostala przemianowana na `Dzisiaj`,
  - opis headera kieruje uzytkownika do spraw wymagajacych reakcji,
  - nad metrykami dodano trzy priorytety operacyjne:
    `Nowe leady`, `Zadania po terminie`, `Spotkania dzisiaj`.

Zakres celowo odlozony po iteracji 1:

- Ujednolicone headery wszystkich stron dashboardu zostaly zostawione na
  kolejna iteracje, poniewaz wymagaja dotkniecia wielu ekranow i warto zrobic
  je jako osobny, konsekwentny wzorzec.
- Krotka wersja menu dla nowych uzytkownikow wymaga decyzji produktowej, czy
  ma byc oparta o wiek konta, postep onboardingu czy oba sygnaly jednoczesnie.
  W iteracji 2 przyjeto konserwatywna regule: pierwsze 7 dni od `user.createdAt`,
  tylko dla zwyklych uzytkownikow, bez ograniczania dostepu do tras.

Status wdrozenia Sprint 1, iteracja 2 - 2026-07-06:

- Dodano wspolny komponent `DashboardPageHeader` dla stron dashboardu:
  - obsluguje tytul, opis, ikone, badge i akcje,
  - utrzymuje jeden responsywny uklad headera na desktopie i mobile,
  - ogranicza kopiowanie klas i ryzyko rozjechania naglowkow w kolejnych
    ekranach.
- Podmieniono reczne headery na glownych ekranach dashboardu:
  - `Dzisiaj`,
  - `Oferty`,
  - `Klienci`,
  - `Zapytania publiczne`,
  - `Kalendarz`,
  - `Zadania`,
  - `Transakcje`,
  - `Raporty`,
  - `Moje zgloszenia`,
  - `Samouczek`,
  - `Ustawienia`.
- Dodano krotka wersje menu dla nowych uzytkownikow:
  - dziala przez pierwsze 7 dni od `user.createdAt`,
  - dotyczy zwyklych uzytkownikow,
  - admin zawsze widzi pelne menu,
  - nowe menu pokazuje tylko sekcje potrzebne do pierwszej pracy:
    `Praca`, `CRM` i `Start`.
- Zachowano pelna funkcjonalnosc tras: zmiana dotyczy tylko ekspozycji w
  sidebarze, nie blokuje dostepu do ekranow.

Zakres po iteracji 2:

- Sprint 1 jest domkniety funkcjonalnie w zakresie zaplanowanym w tej analizie.
- W kolejnej iteracji warto przejsc do Sprintu 2: operacyjna ergonomia CRM,
  czyli widoki listowe, szybkie filtry i standard detail page.

Pokrywa obserwacje:

- 1. Dashboard ma duzo wartosci, ale potrzebuje mocniejszej hierarchii.
- 2. Sidebar jest funkcjonalny, ale za dlugi i plaski.
- 3. Mobile navigation wymaga dopracowania.

### Sprint 2: Operacyjna ergonomia CRM

Cel: listy i strony szczegolow maja pomagac szybko porownywac rekordy, znalezc
problem i wykonac nastepna akcje.

- [x] Widok listowy ofert i klientow.
- [x] Szybkie filtry operacyjne.
- [x] Standard detail page.
- [x] Pasek `Nastepny krok`.
- [x] Ujednolicone puste stany dla list, filtrow i powiazanych danych.
- [x] Chipsy aktywnych filtrow z mozliwoscia szybkiego usuniecia.
- [x] Lepsze stany braku danych:
  - brak ofert -> dodaj oferte,
  - brak klientow -> dodaj/importuj klienta,
  - brak leadow -> opublikuj oferte albo udostepnij profil,
  - brak wynikow filtrow -> pokaz aktywne filtry i akcje czyszczenia.
- [x] Wspolny wzorzec bledu z akcja `Sprobuj ponownie` i informacja, co nie zostalo
  zaladowane.

Status wdrozenia Sprint 2, iteracja 1 - 2026-07-06:

- Dodano wspolny komponent `DashboardViewModeToggle`:
  - obsluguje tryby `Karty` i `Lista`,
  - jest gotowy do ponownego uzycia na kolejnych listach CRM,
  - zachowuje czytelne sterowanie ikonami i tekstem.
- Dodano widok listowy ofert:
  - kolumny: `Oferta`, `Cena`, `Status`, `Publikacja`, `Aktywnosc`, `Akcja`,
  - wiersz pokazuje typ nieruchomosci, typ transakcji, lokalizacje i metraz,
  - status CRM i status publikacji sa oddzielone,
  - aktywnosc pokazuje liczbe wyswietlen i zdjec,
  - akcja prowadzi bezposrednio do szczegolow oferty.
- Dodano szybkie filtry ofert oparte o istniejace filtry API:
  - `Szkice`,
  - `Aktywne`,
  - `Sprzedaz`,
  - `Wynajem`.
- Dodano widok listowy klientow:
  - kolumny: `Klient`, `Kontakt`, `Status`, `Zrodlo`, `Preferencje`, `Akcja`,
  - wiersz pokazuje kontakt, status, zrodlo, budzet i preferencje,
  - akcja prowadzi bezposrednio do profilu klienta.
- Dodano szybkie filtry klientow oparte o istniejace filtry API:
  - `Nowi`,
  - `Aktywni`,
  - `Negocjacje`,
  - `WWW`.
- Rozszerzono rozpoznawanie aktywnych filtrow w pustych stanach list ofert i
  klientow, zeby szybkie filtry byly traktowane jak realne filtrowanie.

Zakres celowo odlozony po iteracji 1:

- Filtry typu `bez zdjec`, `bez leadow 14 dni` i `po terminie wygasniecia`
  wymagaja danych/filtracji po stronie API albo pelnych agregatow, wiec nie
  zostaly zasymulowane tylko na aktualnej stronie wynikow.
- Standard detail page i pasek `Nastepny krok` zostaja na kolejna iteracje,
  bo dotykaja stron szczegolow ofert, klientow i powiazanych encji.
- Chipsy aktywnych filtrow i wspolny wzorzec bledow zostaja na nastepny krok,
  po ustabilizowaniu list i szybkich filtrow.

Status wdrozenia Sprint 2, iteracja 2 - 2026-07-06:

- Dodano wspolny komponent `ActiveFilterChips`:
  - pokazuje aktywne filtry jako usuwalne chipsy,
  - pozwala usunac pojedynczy filtr,
  - pozwala wyczyscic wszystkie filtry jednym przyciskiem,
  - jest gotowy do uzycia na kolejnych listach.
- Podpieto chipsy aktywnych filtrow na liscie ofert:
  - wyszukiwanie,
  - typ nieruchomosci,
  - typ transakcji,
  - status,
  - miasto,
  - zakres ceny,
  - zakres metrazu,
  - minimalna liczba pokoi.
- Podpieto chipsy aktywnych filtrow na liscie klientow:
  - wyszukiwanie,
  - zrodlo,
  - status,
  - zakres budzetu.
- Dodano wspolny komponent `DashboardErrorState`:
  - pokazuje, czego nie udalo sie zaladowac,
  - zawiera opis bledu,
  - ma akcje `Sprobuj ponownie`.
- Podmieniono bledy list ofert i klientow na wspolny wzorzec z retry.

Zakres celowo odlozony po iteracji 2:

- Ujednolicone puste stany dla wszystkich list i powiazanych danych zostaja na
  kolejna iteracje, bo wymagaja przejscia przez zapytania, powiazania na detail
  pages i przypadki braku danych po filtrach.
- Standard detail page i pasek `Nastepny krok` nadal sa kolejnym wiekszym
  krokiem Sprintu 2.

Status wdrozenia Sprint 2, iteracja 3 - 2026-07-06:

- Dodano wspolny komponent `DashboardFilteredEmptyState`:
  - rozroznia realny brak danych od braku wynikow po filtrach,
  - dla filtrow pokazuje aktywne chipsy i akcje czyszczenia,
  - dla realnego braku danych pokazuje konkretna nastepna akcje.
- Podmieniono puste stany listy ofert:
  - brak ofert prowadzi do `Dodaj oferte`,
  - brak wynikow po filtrach pokazuje aktywne filtry i czyszczenie.
- Podmieniono puste stany listy klientow:
  - brak klientow prowadzi do `Dodaj klienta`,
  - przypomina o imporcie CSV,
  - brak wynikow po filtrach pokazuje aktywne filtry i czyszczenie.
- Uspojniono liste zapytan publicznych:
  - dodano chipsy aktywnych filtrow,
  - dodano wspolny wzorzec bledu z retry,
  - brak leadow prowadzi do ofert,
  - brak wynikow po filtrach pokazuje aktywne filtry i czyszczenie.

Zakres celowo odlozony po iteracji 3:

- Standard detail page i pasek `Nastepny krok` zostaja jako ostatni duzy blok
  Sprintu 2, poniewaz wymagaja zmian na stronach szczegolow ofert i klientow.

Status wdrozenia Sprint 2, iteracja 4 - 2026-07-06:

- Dodano wspolny komponent `DashboardNextStepBar`:
  - pokazuje jeden najwazniejszy nastepny krok,
  - zawiera kontekst, priorytet i jedna glowna akcje,
  - obsluguje akcje linkiem albo callbackiem,
  - jest gotowy do uzycia na kolejnych detail pages.
- Podpieto pasek `Nastepny krok` na stronie szczegolow oferty:
  - priorytet 1: aktywna oferta bez publikacji -> przejscie do publikacji,
  - priorytet 2: nowe zapytania -> przejscie do zapytan oferty,
  - priorytet 3: brak spotkan -> zaplanowanie prezentacji,
  - priorytet 4: dopasowany klient -> otwarcie najlepszego dopasowania,
  - fallback: przygotowanie wiadomosci do wlasciciela.
- Podpieto pasek `Nastepny krok` na stronie szczegolow klienta:
  - priorytet 1: brak danych kontaktowych -> edycja klienta,
  - priorytet 2: brak budzetu -> uzupelnienie budzetu,
  - priorytet 3: brak spotkan -> zaplanowanie kontaktu,
  - priorytet 4: dopasowana oferta -> otwarcie najlepszej oferty,
  - priorytet 5: mozliwa zmiana statusu -> wykonanie akcji statusu,
  - fallback: przygotowanie wiadomosci do klienta.

Zakres celowo odlozony po iteracji 4:

- Pelny standard detail page nadal wymaga osobnej iteracji porzadkujacej
  strukture sekcji, prawy panel kontekstowy i nazewnictwo zakladek na stronach
  szczegolow.

Status wdrozenia Sprint 2, iteracja 5 - 2026-07-06:

- Dodano wspolny komponent `DashboardDetailHeader`:
  - laczy breadcrumb, tytul, statusy, opis/kontekst i akcje,
  - pozwala dodac element prowadzacy, np. avatar klienta,
  - utrzymuje jeden responsywny uklad headera detail page,
  - ogranicza kopiowanie klas i rozjazdy miedzy stronami szczegolow.
- Podmieniono header strony szczegolow oferty:
  - breadcrumb `Wroc do listy ofert`,
  - tytul oferty,
  - status CRM i status publikacji,
  - adres i kontakt wlasciciela,
  - dotychczasowe akcje pozostaly bez zmiany.
- Podmieniono header strony szczegolow klienta:
  - breadcrumb `Wroc do listy klientow`,
  - avatar i nazwa klienta,
  - status oraz zrodlo,
  - opis kontekstu strony,
  - dotychczasowe akcje pozostaly bez zmiany.

Zakres po iteracji 5:

- Sprint 2 jest domkniety funkcjonalnie w zakresie list, filtrow, pustych
  stanow, bledow, paska `Nastepny krok` i wspolnego headera detail page.
- Dalsze prace nad detail pages moga byc prowadzone jako polish albo osobny
  refactor informacyjnej architektury, ale nie blokuja przejscia do Sprintu 3.

Status wdrozenia Sprint 2, iteracja 6 - 2026-07-06:

- Dodano wspolny komponent `DashboardDetailTabs`:
  - standaryzuje nawigacje zakladek detail page,
  - laczy tablist, opis aktywnego widoku i badge kontekstowy,
  - pozwala reuzywac ten sam kontrakt zakladek na kolejnych stronach
    szczegolow.
- Podmieniono recznie zlozony wrapper zakladek na stronie szczegolow oferty:
  - zachowano te same zakladki,
  - zachowano te sama zawartosc widokow,
  - ograniczono lokalna duplikacje klas i struktury tablist.

Zakres po iteracji 6:

- Sprint 2 ma wspolne komponenty dla list, filtrow, pustych stanow, bledow,
  headerow detail page, paska `Nastepny krok` i zakladek detail page.
- Kolejna iteracja powinna przejsc do Sprintu 3, chyba ze pojawi sie potrzeba
  czysto wizualnego polishu detail pages.

Pokrywa obserwacje:

- 4. Listy ofert i klientow sa czytelne, ale moga lepiej wspierac skanowanie.
- 5. Detail pages powinny miec jeden wspolny wzorzec.
- 10. Empty states sa dobre, ale moga byc bardziej zadaniowe.

### Sprint 3: Formularze i publiczne flow

Cel: tworzenie ofert i publiczne flow maja byc prostsze, bardziej przewidywalne
i mniej stresujace dla osoby, ktora nie zna systemu.

- [x] Tryb `Szybka oferta`.
- [x] Lepsza walidacja inline.
- [x] Publiczny katalog mobile-first.
- [x] Wizard sprzedajacego z mocniejszym poczuciem procesu.
- [x] Pasek jakosci oferty z konkretnymi brakami do uzupelnienia.
- [x] Stale widoczny postep w publicznym wizardzie:
  - dane,
  - email,
  - weryfikacja,
  - publikacja.
- [x] Sticky sterowanie publicznym katalogiem na mobile:
  - `Filtry`,
  - `Mapa`,
  - `Wyniki`.
- [x] Jasne komunikaty, co stanie sie po wyslaniu publicznego formularza.
- [x] Sygnaly zaufania przy publicznych ofertach:
  - typ kontaktu,
  - ostatnia aktualizacja,
  - lokalizacja dokladna/przyblizona.

Pokrywa obserwacje:

- 6. Formularze sa kompletne, ale wymagaja redukcji tarcia.
- 8. Publiczny katalog powinien byc bardziej `kupujacy-first`.

Status wdrozenia Sprint 3, iteracja 1 - 2026-07-06:

- Uruchomiono `Szybka oferte` jako domyslny flow tworzenia nowej oferty:
  - strona `/dashboard/listings/new` korzysta z `ListingForm variant="guided"`,
  - pierwszy ekran pokazuje tylko najwazniejsze dane,
  - reszta pozostaje pod kontrolowanym blokiem `Uzupelnij szczegoly`.
- Dodano panel `Jakosc oferty` w formularzu tworzenia:
  - pokazuje postep jakosci jako pasek i licznik ukonczonych elementow,
  - laczy istniejacy evaluator opisu z brakami operacyjnymi,
  - pokazuje konkretne braki: tytul, opis, metraz/dzialka, min. 5 zdjec,
    punkt mapy i prowizje,
  - pozwala od razu rozwinac szczegoly, jezeli brak dotyczy mapy albo
    parametrow.
- Rozszerzono walidacje inline:
  - `useListingForm` udostepnia `validateField`,
  - formularz oferty waliduje opuszczone pole przez ten sam schemat Zod,
  - submit nadal korzysta z pelnej walidacji calego formularza.

Zakres po iteracji 1:

- Pierwszy etap Sprintu 3 pokrywa dashboardowy formularz tworzenia oferty.
- Kolejna iteracja powinna przejsc do publicznego flow:
  - staly pasek procesu w publicznym wizardzie,
  - jasniejsze komunikaty po wyslaniu formularza,
  - sticky sterowanie katalogiem publicznym na mobile.

Status wdrozenia Sprint 3, iteracja 2 - 2026-07-06:

- Dodano wspolny komponent `PublicListingSubmissionProcess`:
  - opisuje proces publicznego dodawania oferty jako `Dane`, `Email`,
    `Weryfikacja`, `Publikacja`,
  - rozroznia etap ukonczony, aktualny i oczekujacy,
  - moze byc uzywany w komponentach client i server.
- Podpieto stale widoczny proces w publicznym wizardzie `/dodaj-oferte`:
  - pasek pozostaje widoczny podczas przechodzenia przez formularz,
  - dotychczasowy lokalny pasek krokow formularza pozostal jako nawigacja po
    polach.
- Doprecyzowano komunikaty po wyslaniu i potwierdzeniu:
  - ekran podsumowania wyjasnia, ze oferta nie pojawi sie publicznie przed
    potwierdzeniem emaila i weryfikacja,
  - ekran `sprawdz-email` wyjasnia powod potwierdzenia emaila,
  - ekran `potwierdzono` pokazuje kolejny krok po kliknieciu linku.

Zakres po iteracji 2:

- Sprint 3 pokrywa juz dashboardowy formularz oferty oraz glowny proces
  publicznego dodawania oferty.
- Kolejna iteracja powinna skupic sie na publicznym katalogu mobile-first:
  - sticky sterowanie `Filtry / Mapa / Wyniki`,
  - sygnaly zaufania przy publicznych ofertach,
  - dopracowanie czytelnosci listy i mapy na telefonie.

Status wdrozenia Sprint 3, iteracja 3 - 2026-07-06:

- Dodano mobilne sticky sterowanie w publicznym katalogu `/oferty`:
  - `Filtry` prowadza do panelu filtrow,
  - `Mapa` prowadzi do mapy,
  - `Wyniki` prowadza do listy wynikow i pokazuja liczbe ofert, gdy jest
    dostepna.
- Uporzadkowano kotwice katalogu:
  - sekcja filtrow ma `id="filtry"`,
  - mapa ma `id="mapa"`,
  - lista wynikow ma `id="wyniki"`.
- Dodano sygnaly zaufania na kartach publicznych ofert:
  - typ kontaktu,
  - dokladnosc lokalizacji,
  - data ostatniej aktualizacji.
- Dodano sygnaly zaufania na stronie szczegolu oferty:
  - typ kontaktu jako `Telefon i formularz` albo `Formularz kontaktowy`,
  - lokalizacja dokladna/przyblizona,
  - ostatnia aktualizacja,
  - status publicznej weryfikacji.

Zakres po iteracji 3:

- Sprint 3 ma pokryty formularz dashboardowy, publiczny wizard i publiczny
  katalog mobile-first.
- Dalsze prace w tym obszarze moga byc traktowane jako polish albo jako
  czesc Sprintu 4 dotyczaca mikrofeedbacku i redukcji ciezaru wizualnego.

### Sprint 4: Polish i decyzje

Cel: interfejs ma byc mniej ciezki wizualnie, bardziej decyzyjny i dawac lepszy
feedback po kazdej waznej akcji.

- [x] Redukcja nadmiaru kart.
- [x] Uspojnienie radiusow i gestosci.
- [x] Raporty z interpretacjami.
- [x] Mikrointerakcje i lepsze next actions po kazdej waznej akcji.
- [x] Standard potwierdzen po akcjach:
  - [x] zapisano,
  - [x] opublikowano,
  - [x] utworzono klienta,
  - [x] zaplanowano spotkanie,
  - [x] oznaczono zadanie jako wykonane.
- [x] Po akcjach pokazac kolejny krok zamiast samego toastu.
- [x] Raporty z trzema wnioskami na gorze ekranu:
  - najlepsze zrodlo leadow,
  - oferta wymagajaca uwagi,
  - najwieksza szansa prowizyjna.
- [x] Ograniczenie `card-heavy UI` w ekranach operacyjnych:
  - mniej zagniezdzonych kart,
  - mniejsze promienie w listach,
  - wiecej separatorow i ukladow tabelarycznych.

Pokrywa obserwacje:

- 7. Feedback po akcjach powinien byc bardziej widoczny i konkretny.
- 9. UI system jest spojny, ale miejscami zbyt `card-heavy`.
- 11. Raporty powinny mniej tlumaczyc, a bardziej pomagac podjac decyzje.

Status wdrozenia Sprint 4, iteracja 1 - 2026-07-06:

- Rozszerzono globalny system toastow o opcjonalne CTA:
  - toast moze pokazac przycisk akcji,
  - klikniecie akcji zamyka toast,
  - istniejace toasty bez akcji zachowuja dotychczasowe dzialanie.
- Dodano standard potwierdzen z next action dla ofert:
  - po utworzeniu oferty toast prowadzi do szczegolow oferty,
  - po edycji oferty toast pozwala otworzyc aktualna oferte,
  - copy wskazuje kolejny krok: jakosc danych, zdjecia i publikacje.
- Dodano standard potwierdzen z next action dla klientow:
  - po utworzeniu klienta toast prowadzi do profilu klienta,
  - po edycji klienta toast prowadzi do profilu klienta,
  - copy wskazuje kolejny krok: dopasowania ofert albo kontakt.
- Dodano standard potwierdzen z next action dla spotkan:
  - po utworzeniu albo edycji spotkania toast prowadzi do dnia w kalendarzu,
  - copy wskazuje przygotowanie klienta albo oferty do spotkania.

Zakres po iteracji 1:

- Sprint 4 ma wdrozony fundament mikrofeedbacku i next actions dla trzech
  glownych akcji operacyjnych.
- Kolejna iteracja powinna objac publikacje ofert, taski oraz raporty z
  interpretacjami na gorze ekranu.

Status wdrozenia Sprint 4, iteracja 2 - 2026-07-06:

- Rozszerzono standard potwierdzen dla publikacji ofert:
  - po opublikowaniu oferty toast ma CTA `Otworz publiczna strone`,
  - CTA korzysta ze slug zwroconego po publikacji, jezeli zostal utworzony w
    trakcie akcji,
  - komunikat dalej informuje o mozliwosci skopiowania i udostepnienia linku.
- Rozszerzono standard potwierdzen dla zadan:
  - po oznaczeniu taska jako wykonanego toast pokazuje konkretny status,
  - po przywroceniu taska toast informuje, ze zadanie wraca na liste,
  - CTA `Otworz kontekst` prowadzi do klienta, oferty albo spotkania
    powiazanego z zadaniem.

Zakres po iteracji 2:

- Standard potwierdzen po akcjach z listy Sprintu 4 jest pokryty dla zapisow,
  publikacji, tworzenia klienta, tworzenia spotkania i taskow.
- Kolejna iteracja powinna przejsc do raportow z interpretacjami oraz
  ograniczenia `card-heavy UI` w ekranach operacyjnych.

Status wdrozenia Sprint 4, iteracja 3 - 2026-07-07:

- Dodano panel `Wnioski z raportow` nad glownym widokiem raportow:
  - wykorzystuje istniejace dane z raportow Klienci, Oferty i Zarobki,
  - nie dodaje nowych endpointow ani dodatkowych requestow,
  - pokazuje skeleton, gdy dane raportowe jeszcze sie laduja.
- Dodano trzy interpretacje decyzyjne:
  - `Najlepsze zrodlo leadow` na podstawie breakdownu zrodel klientow,
  - `Oferta wymagajaca uwagi` na podstawie aktywnych ofert, wyswietlen i
    zamkniec/wycofan,
  - `Najwieksza szansa prowizyjna` na podstawie aktywnej i zamknietej
    prowizji.
- Dodano CTA `Przejdz do raportu` na kazdej interpretacji:
  - prowadzi do odpowiedniej zakladki raportowej,
  - pozwala przejsc od wniosku do danych zrodlowych bez szukania w tabach.

Zakres po iteracji 3:

- Sprint 4 ma pokryty mikrofeedback, standard potwierdzen i raporty z
  interpretacjami.
- Kolejna iteracja powinna skupic sie na ograniczeniu `card-heavy UI`:
  - mniejsze promienie i gestosc w listach operacyjnych,
  - mniej zagniezdzonych kart,
  - bardziej tabelaryczne uklady tam, gdzie uzytkownik porownuje dane.

Status wdrozenia Sprint 4, iteracja 4 - 2026-07-07:

- Ograniczono `card-heavy UI` na glownych ekranach operacyjnych:
  - lista ofert domyslnie otwiera sie w widoku tabelarycznym,
  - lista klientow domyslnie otwiera sie w widoku tabelarycznym,
  - widok kart nadal jest dostepny przez przelacznik.
- Odchudzono toolbar szybkich filtrow:
  - usunieto dodatkowa karte/wrapper z tla `card`,
  - zastosowano separatory `border-y`,
  - zmniejszono promien i wysokosc przyciskow szybkich filtrow.
- Zageszczono widoki tabelaryczne ofert i klientow:
  - zmniejszono padding komorek,
  - zmniejszono promien kontenera tabeli,
  - zachowano istniejace kolumny, akcje i paginacje.

Zakres po iteracji 4:

- Sprint 4 ma pokryte: mikrofeedback, standard potwierdzen, raporty z
  interpretacjami oraz pierwszy etap redukcji `card-heavy UI`.
- Kolejne poprawki w Sprint 4 powinny byc traktowane jako polish gestosci w
  wybranych ekranach szczegolow albo raportow, jezeli bedzie taka potrzeba.

### Sprint 5: Defensywny admin UX

Cel: ekrany administracyjne maja minimalizowac ryzyko kosztownych pomylek i
pokazywac skutki zmian zanim admin je zatwierdzi.

- [x] Wyrazne oznaczenie trybu admin w shellu albo headerze admin screens.
- [x] Osobne grupowanie admin navigation.
- [x] Podsumowanie skutkow przed zmiana planu, limitow albo widocznosci planu.
- [x] Confirm dialog dla operacji wysokiego wplywu:
  - [x] zmiana limitow,
  - [x] reset override'ow,
  - [x] wymuszenie limit enforcement,
  - [x] zatwierdzenie/odrzucenie publicznej oferty.
- [x] Checklisty moderacji publicznych ofert:
  - [x] dane kontaktowe,
  - [x] zdjecia,
  - [x] cena,
  - [x] opis,
  - [x] sygnaly abuse.
- [x] Widoki analytics nastawione na decyzje:
  - [x] anomalie,
  - [x] wzrosty,
  - [x] spadki,
  - [x] wymaga reakcji.
- [x] Lepsze empty/error states w admin UI, szczegolnie dla analytics i moderacji.

Pokrywa obserwacje:

- 12. Admin UI powinien byc bardziej defensywny.

Status wdrozenia Sprint 5, iteracja 1 - 2026-07-07:

- Dodano wyrazne oznaczenie trybu administratora w shellu:
  - banner pokazuje sie tylko adminom na trasach `/dashboard/admin/*` i
    `/dashboard/blog/*`,
  - copy ostrzega, ze zmiany moga wplywac na plany, limity, widocznosc
    publiczna albo dane uzytkownikow.
- Uporzadkowano admin navigation:
  - grupa administracyjna ma osobna etykiete `Administracja`,
  - grupa jest oddzielona separatorem od codziennej nawigacji agenta.
- Wzmocniono defensywny UX na ekranie `Plany i limity`:
  - dodano panel `Podsumowanie skutkow zapisu` przy edycji katalogu planow,
  - panel pokazuje zmiany limitow, funkcji, ceny miesiecznej i widocznosci
    publicznej,
  - redukcje limitow i ukrycie/pokazanie planu sa oznaczone jako wysoki wplyw.
- Dodano confirm dialog dla akcji wysokiego wplywu w planach:
  - zapis katalogu planow wymaga potwierdzenia,
  - zapis planu agencji wymaga potwierdzenia,
  - reset override'ow agencji wymaga potwierdzenia z opisem skutku.

Zakres po iteracji 1:

- Sprint 5 ma pokryty pierwszy etap defensywnego admin UX dla shellu,
  nawigacji oraz zmian planow/limitow.
- Kolejna iteracja powinna objac moderacje publicznych ofert:
  - checklisty danych kontaktowych, zdjec, ceny, opisu i sygnalow abuse,
  - confirm dialog dla zatwierdzenia albo odrzucenia oferty publicznej.

Status wdrozenia Sprint 5, iteracja 2 - 2026-07-07:

- Rozszerzono dane admin listy publicznych zgloszen:
  - admin API zwraca opis, liczbe zdjec i sygnaly automatycznej moderacji,
  - sygnaly moderacji korzystaja z istniejacego backendowego evaluatora oraz
    zapisanych wynikow moderacji, jezeli sa dostepne.
- Dodano checklisty moderacji na ekranie `Moderacja zgloszen`:
  - dane kontaktowe,
  - zdjecia,
  - cena,
  - opis,
  - sygnaly abuse.
- Wzmocniono decyzje moderacyjne:
  - zatwierdzenie wymaga confirm dialogu z podsumowaniem skutkow,
  - odrzucenie wymaga powodu oraz confirm dialogu,
  - zatwierdzenie jest blokowane, jezeli brakuje danych krytycznych albo
    wystepuja sygnaly abuse.

Zakres po iteracji 2:

- Sprint 5 ma pokryte: shell admina, admin navigation, defensywne zmiany
  planow/limitow oraz moderacje publicznych ofert.
- Kolejna iteracja powinna objac analytics admina:
  - anomalie,
  - wzrosty i spadki,
  - wskazanie metryk wymagajacych reakcji,
  - lepsze empty/error states dla analytics.

Status wdrozenia Sprint 5, iteracja 3 - 2026-07-07:

- Dodano panel decyzyjny `Wymaga reakcji` na ekranie admin analytics:
  - pokazuje trend ostatnich dni wzgledem poprzedniego okna,
  - wykrywa dzienna anomalie na podstawie odchylenia od sredniej,
  - wskazuje najmocniejszy albo problematyczny obszar produktu,
  - pokazuje luki w adopcji kluczowych eventow.
- Rozszerzono interpretacje admin analytics:
  - spadki aktywnosci sa oznaczane jako `Spadek` albo `Wymaga reakcji`,
  - duze wzrosty sa oznaczane jako `Wzrost`,
  - brak eventow tworzy krytyczny insight zamiast pustej sekcji.
- Poprawiono error state analytics:
  - blad ma teraz jasny tytul i opis,
  - admin moze ponowic pobranie bez szukania przycisku w headerze.

Zakres po iteracji 3:

- Sprint 5 ma pokryte glowne punkty defensywnego admin UX:
  - tryb admina i admin navigation,
  - defensywne zmiany planow/limitow,
  - moderacje publicznych ofert,
  - analytics nastawione na decyzje.
- Do dopracowania zostaje tylko osobny confirm dla wymuszenia limit enforcement,
  jezeli zostanie dodana reczna akcja egzekucji limitow w admin UI.

Status wdrozenia Sprint 5, iteracja 4 - 2026-07-07:

- Dodano reczna akcje `Wymus egzekucje` na ekranie `Plany i limity`:
  - akcja korzysta z istniejacego endpointu
    `/admin/agencies/:id/plan/enforce-limits`,
  - po wykonaniu odswieza plan agencji i audyt egzekucji limitow,
  - toast pokazuje czy egzekucja zarchiwizowala oferty czy zostala pominieta.
- Dodano confirm dialog dla wymuszenia limit enforcement:
  - opisuje, ze akcja moze natychmiast zarchiwizowac nadmiarowe oferty,
  - pokazuje aktualne uzycie aktywnych ofert, limit i nadmiar,
  - pokazuje informacje o karencji i wyjasnia, ze reczna akcja dziala
    natychmiast.
- Dodano defensywny panel ostrzegawczy przy audycie karencji:
  - przycisk jest umieszczony przy diagnostyce limitow,
  - copy wskazuje, ze akcja jest dla supportu po weryfikacji planu, uzycia i
    karencji.

Zakres po iteracji 4:

- Sprint 5 ma domkniete wszystkie glowne punkty z checklisty:
  - tryb admina,
  - admin navigation,
  - defensywne zmiany planow i limitow,
  - confirm dialogi dla operacji wysokiego wplywu,
  - checklisty moderacji,
  - admin analytics nastawione na decyzje,
  - lepsze empty/error states.

## Macierz pokrycia obserwacji przez sprinty

| Obserwacja | Sprint odpowiedzialny | Status pokrycia |
| --- | --- | --- |
| 1. Dashboard/hierarchia | Sprint 1 | Pokryte |
| 2. Sidebar | Sprint 1 | Pokryte |
| 3. Mobile navigation | Sprint 1 | Pokryte |
| 4. Listy ofert i klientow | Sprint 2 | Pokryte |
| 5. Detail pages | Sprint 2 | Pokryte |
| 6. Formularze | Sprint 3 | Pokryte |
| 7. Feedback po akcjach | Sprint 4 | Pokryte |
| 8. Publiczny katalog | Sprint 3 | Pokryte |
| 9. UI system/card-heavy | Sprint 4 | Pokryte |
| 10. Empty states | Sprint 2 | Pokryte |
| 11. Raporty jako decyzje | Sprint 4 | Pokryte |
| 12. Admin UI defensywny | Sprint 5 | Czesciowo pokryte |

## Wniosek

EstateFlow ma juz wiekszosc potrzebnych elementow produktu. Najwiekszy wzrost jakosci odczuc uzytkownika nie przyjdzie z kolejnych dekoracji, tylko z lepszej decyzji projektowej: mniej rownorzednych informacji, wiecej prowadzenia przez prace, wyrazniejsze priorytety i szybsze akcje. Aplikacja powinna sprawiac wrazenie asystenta codziennej pracy agenta, nie tylko miejsca, w ktorym przechowuje sie dane.
