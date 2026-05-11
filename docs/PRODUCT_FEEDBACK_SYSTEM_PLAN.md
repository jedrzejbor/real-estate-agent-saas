# System feedbacku produktowego — plan funkcjonalności

Dokument opisuje plan modułu, w którym użytkownicy i odwiedzający mogą zgłaszać
feedback, błędy, pomysły na funkcje oraz odpowiadać na ankiety dotyczące
planowanych zmian w EstateFlow.

To nie jest system zgłoszeń nadużyć ofert. Abuse flow zostaje osobnym kanałem
operacyjnym i prawnym. Ten moduł dotyczy produktu: jakości aplikacji,
brakujących funkcji, problemów UX i decyzji roadmapowych.

---

## 1. Cel

Chcemy zbudować stały feedback loop, który pomoże:

- szybciej wykrywać błędy,
- zbierać pomysły na nowe funkcje,
- rozumieć, gdzie użytkownicy się blokują,
- sprawdzać zainteresowanie funkcjami przed implementacją,
- lepiej priorytetyzować roadmapę,
- mierzyć jakość doświadczenia po wdrożeniach.

Najważniejsza zasada: feedback ma trafiać do jednego uporządkowanego miejsca,
a nie ginąć w mailach, rozmowach i notatkach.

---

## 2. Typy zgłoszeń

### `bug_report`

Zgłoszenie błędu w systemie.

Przykłady:

- filtr nie działa,
- przycisk nic nie robi,
- widok źle wygląda na mobile,
- oferta nie zapisuje się poprawnie,
- mapa pokazuje złą lokalizację.

Pola:

- tytuł,
- opis problemu,
- kroki odtworzenia,
- oczekiwane zachowanie,
- faktyczne zachowanie,
- URL strony,
- zrzut ekranu,
- priorytet według użytkownika,
- dane techniczne przeglądarki.

### `feature_request`

Pomysł na nową funkcję.

Przykłady:

- integracja z portalem ogłoszeniowym,
- import klientów z pliku,
- automatyczne przypomnienia SMS,
- dashboard dla prywatnych właścicieli,
- szablony wiadomości do klientów.

Pola:

- tytuł,
- opis potrzeby,
- kogo dotyczy,
- jak użytkownik radzi sobie dziś,
- oczekiwany efekt,
- opcjonalna kategoria.

### `improvement`

Propozycja usprawnienia istniejącej funkcji.

Przykłady:

- uprościć formularz oferty,
- dodać sortowanie w tabeli,
- poprawić copy,
- dodać skrót do częstej akcji.

### `general_feedback`

Luźna opinia o produkcie.

Przykłady:

- coś jest niejasne,
- coś działa dobrze,
- użytkownik nie wie, gdzie znaleźć funkcję,
- ogólna sugestia.

### `survey_response`

Odpowiedź na ankietę produktową.

Przykłady:

- ankieta o nowej funkcji,
- pytanie o priorytet,
- test zainteresowania płatnym dodatkiem,
- szybki NPS po użyciu modułu.

---

## 3. Dla kogo dostępny jest system

### Zalogowani użytkownicy

To powinien być główny kanał feedbacku.

Zalety:

- znamy użytkownika, plan i kontekst konta,
- możemy automatycznie dodać URL, moduł, user agent i workspace,
- możemy wrócić z pytaniem doprecyzowującym,
- można powiązać feedback z konkretną ofertą, klientem albo spotkaniem.

Rekomendacja:

- pełny panel feedbacku powinien być dostępny dla zalogowanych użytkowników,
- użytkownik może przeglądać swoje zgłoszenia i ich statusy,
- użytkownik może głosować na publiczne pomysły.

### Odwiedzający publiczni

Warto dać im lżejszy kanał, ale nie pełny panel.

Przykłady odwiedzających:

- osoba przeglądająca katalog `/oferty`,
- osoba oglądająca publiczną ofertę,
- prywatny właściciel dodający ofertę bez konta,
- potencjalny agent oglądający homepage.

Ryzyka:

- spam,
- fałszywe zgłoszenia,
- brak możliwości dopytania bez emaila,
- mieszanie feedbacku produktowego ze zgłoszeniami abuse.

Rekomendacja:

- publiczny formularz feedbacku powinien być krótki,
- powinien mieć honeypot, timing guard i rate limiting,
- email powinien być opcjonalny dla ogólnego feedbacku, ale wymagany, jeśli
  użytkownik chce odpowiedzi,
- dla publicznych ofert nadal osobno pokazujemy `Zgłoś naruszenie`.

---

## 4. Główne wejścia w aplikacji

### Dla zalogowanych

Miejsca:

- globalny przycisk `Feedback` w dashboardzie,
- menu użytkownika,
- empty states,
- ekran błędu,
- po ukończeniu ważnych akcji:
  - publikacja oferty,
  - import,
  - wygenerowanie raportu,
  - wysłanie publicznego formularza.

Forma:

- mały panel boczny albo modal,
- automatycznie zbiera aktualny URL i kontekst modułu,
- pozwala wybrać typ zgłoszenia.

### Dla odwiedzających

Miejsca:

- stopka: `Podziel się opinią`,
- publiczny katalog `/oferty`,
- formularz dodawania oferty po wysyłce,
- strona błędu publicznego,
- opcjonalnie homepage.

Forma:

- osobna publiczna strona `/feedback`,
- krótki formularz osadzany jako link z parametrem `source`,
- brak pełnego panelu z listą zgłoszeń.

---

## 5. Statusy zgłoszeń

Proponowane statusy:

- `new` — nowe zgłoszenie.
- `triaged` — przejrzane i sklasyfikowane.
- `needs_more_info` — wymaga doprecyzowania.
- `planned` — zaakceptowane do roadmapy.
- `in_progress` — w trakcie realizacji.
- `released` — wdrożone.
- `declined` — odrzucone.
- `duplicate` — duplikat innego zgłoszenia.
- `archived` — zamknięte bez dalszych działań.

Widoczność dla użytkownika:

- MVP: użytkownik dostaje potwierdzenie wysyłki.
- Docelowo: zalogowany użytkownik widzi status swoich zgłoszeń.
- Publiczny odwiedzający nie musi mieć historii zgłoszeń.

---

## 6. Priorytety i kategorie

### Kategorie

- `listings` — oferty.
- `clients` — klienci.
- `calendar` — kalendarz.
- `reports` — raporty.
- `public_catalog` — katalog publiczny.
- `public_listing_submission` — dodawanie oferty bez konta.
- `billing` — plany i płatności.
- `onboarding` — onboarding i checklista.
- `integrations` — portale, importy, API.
- `ui_ux` — interfejs i użyteczność.
- `other` — inne.

### Priorytet użytkownika

- `low`
- `medium`
- `high`
- `critical`

Priorytet użytkownika nie powinien automatycznie oznaczać priorytetu zespołu.
Zespół powinien mieć osobne pole `internalPriority`.

---

## 7. Ankiety dotyczące nowych funkcji

Ankiety są osobnym typem feedbacku, ale powinny korzystać z tej samej bazy
odpowiedzi i tego samego panelu administracyjnego.

### Typy ankiet

- szybka ankieta jednopytaniowa,
- głosowanie na funkcję,
- ranking priorytetów,
- NPS,
- ankieta po użyciu konkretnego modułu,
- ankieta beta po włączeniu funkcji.

### Przykład ankiety feature discovery

Pytanie:

`Która funkcja najbardziej pomogłaby Ci w codziennej pracy?`

Opcje:

- integracja z portalami,
- automatyczne przypomnienia,
- lepsze raporty,
- szablony wiadomości,
- panel prywatnego właściciela.

Pole dodatkowe:

- `Dlaczego ta funkcja jest dla Ciebie ważna?`

### Widoczność ankiet

- dla wszystkich zalogowanych,
- tylko dla wybranego planu,
- tylko dla użytkowników, którzy użyli modułu,
- tylko dla odwiedzających publiczny katalog,
- tylko dla beta testerów.

---

## 8. Publiczna tablica pomysłów

To opcjonalny etap, nie MVP.

Możliwe funkcje:

- publiczna lista zaakceptowanych pomysłów,
- głosowanie,
- status roadmapy,
- komentarze,
- etykiety: `planned`, `in_progress`, `released`.

Ryzyka:

- obietnice produktowe widoczne publicznie,
- moderacja komentarzy,
- presja na realizację najgłośniejszych, a nie najważniejszych funkcji.

Rekomendacja:

- w MVP nie tworzyć publicznej tablicy,
- zacząć od wewnętrznego panelu triage,
- później ewentualnie pokazywać tylko wybrane pomysły.

---

## 9. Model danych

### `ProductFeedback`

Proponowane pola:

```ts
interface ProductFeedback {
  id: string;
  type:
    | 'bug_report'
    | 'feature_request'
    | 'improvement'
    | 'general_feedback'
    | 'survey_response';
  status:
    | 'new'
    | 'triaged'
    | 'needs_more_info'
    | 'planned'
    | 'in_progress'
    | 'released'
    | 'declined'
    | 'duplicate'
    | 'archived';
  title: string;
  description: string;
  category: string;
  userPriority?: 'low' | 'medium' | 'high' | 'critical';
  internalPriority?: 'low' | 'medium' | 'high' | 'critical';
  userId?: string | null;
  workspaceId?: string | null;
  email?: string | null;
  source:
    | 'dashboard'
    | 'public_catalog'
    | 'public_listing'
    | 'public_form'
    | 'homepage'
    | 'error_page';
  sourceUrl?: string | null;
  module?: string | null;
  browser?: string | null;
  os?: string | null;
  viewport?: string | null;
  appVersion?: string | null;
  screenshotUrl?: string | null;
  metadata?: Record<string, unknown>;
  duplicateOfId?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### `FeatureSurvey`

```ts
interface FeatureSurvey {
  id: string;
  title: string;
  description?: string | null;
  status: 'draft' | 'active' | 'closed' | 'archived';
  audience:
    | 'all_users'
    | 'registered_users'
    | 'public_visitors'
    | 'plan_segment'
    | 'beta_users';
  startsAt?: string | null;
  endsAt?: string | null;
  questions: FeatureSurveyQuestion[];
  createdAt: string;
  updatedAt: string;
}
```

### `FeatureSurveyResponse`

```ts
interface FeatureSurveyResponse {
  id: string;
  surveyId: string;
  userId?: string | null;
  workspaceId?: string | null;
  email?: string | null;
  sourceUrl?: string | null;
  answers: Record<string, unknown>;
  createdAt: string;
}
```

---

## 10. API

### Publiczne endpointy

- `POST /product-feedback/public`
  - krótkie zgłoszenie od odwiedzającego,
  - honeypot,
  - timing guard,
  - rate limiting,
  - opcjonalny email.

- `GET /feature-surveys/public/active`
  - aktywne ankiety dla publicznych odwiedzających.

- `POST /feature-surveys/:id/public-responses`
  - odpowiedź publiczna na ankietę.

### Endpointy dla zalogowanych

- `POST /product-feedback`
  - zgłoszenie od użytkownika systemu.

- `GET /product-feedback/my`
  - lista własnych zgłoszeń.

- `GET /feature-surveys/active`
  - aktywne ankiety dla zalogowanego użytkownika.

- `POST /feature-surveys/:id/responses`
  - odpowiedź zalogowanego użytkownika.

### Endpointy administracyjne

- `GET /admin/product-feedback`
- `GET /admin/product-feedback/:id`
- `PATCH /admin/product-feedback/:id`
- `POST /admin/product-feedback/:id/comment`
- `POST /admin/product-feedback/:id/merge`
- `POST /admin/feature-surveys`
- `PATCH /admin/feature-surveys/:id`
- `GET /admin/feature-surveys/:id/responses`

---

## 11. Bezpieczeństwo i antyspam

Publiczny feedback musi korzystać z podobnej filozofii jak publiczne formularze:

- honeypot,
- timing guard,
- rate limit per IP hash,
- rate limit per email,
- ograniczenia długości pól,
- walidacja URL źródłowego,
- sanitizacja treści,
- opcjonalna moderacja screenshotów,
- brak przechowywania pełnego IP,
- hash/fingerprint tylko do ochrony przed spamem.

Dla zalogowanych:

- rate limit per użytkownik/workspace,
- ograniczenie uploadu screenshotów,
- brak możliwości edycji statusu przez zwykłego użytkownika,
- użytkownik widzi tylko swoje zgłoszenia.

---

## 12. Prywatność

Feedback może zawierać dane osobowe albo dane klientów, jeśli użytkownik wklei
je w opis. Dlatego:

- przy formularzu trzeba dodać informację, aby nie wklejać danych wrażliwych,
- screenshoty mogą zawierać dane klientów i powinny być traktowane ostrożnie,
- publiczny feedback z emailem wymaga informacji o celu kontaktu,
- polityka prywatności powinna wymieniać feedback produktowy jako kategorię
  danych,
- trzeba określić retencję zgłoszeń.

Proponowana retencja:

- feedback produktowy: 24 miesiące od ostatniej aktualizacji,
- ankiety: 24 miesiące od zamknięcia ankiety,
- screenshoty: 12 miesięcy albo do zamknięcia zgłoszenia,
- zgłoszenia oznaczone jako spam: krótsza retencja, np. 90 dni.

---

## 13. Panel administracyjny

MVP panelu:

- lista zgłoszeń,
- filtry po typie, statusie, kategorii i priorytecie,
- widok szczegółów,
- zmiana statusu,
- oznaczenie duplikatu,
- notatka wewnętrzna,
- link do źródłowego URL,
- eksport CSV.

Docelowo:

- komentarze wewnętrzne,
- przypisywanie osoby odpowiedzialnej,
- łączenie zgłoszeń w inicjatywy roadmapowe,
- statystyki trendów,
- powiązanie z release notes,
- powiadomienie użytkownika po zmianie statusu.

---

## 14. UI użytkownika

### Widget w dashboardzie

Elementy:

- przycisk `Feedback`,
- wybór typu zgłoszenia,
- tytuł,
- opis,
- priorytet,
- automatyczny URL,
- opcjonalny screenshot,
- zgoda / informacja prywatnościowa.

### Strona `/feedback`

Publiczna, lekka strona.

Elementy:

- wybór: `Zgłoś błąd`, `Zaproponuj funkcję`, `Podziel się opinią`,
- opis,
- email opcjonalny,
- źródło zgłoszenia,
- informacja o tym, że zgłoszenia nadużyć ofert mają osobny kanał.

### Moje zgłoszenia

Dla zalogowanych.

Elementy:

- lista zgłoszeń,
- status,
- data,
- odpowiedź zespołu, jeśli istnieje,
- link do powiązanej ankiety albo roadmapy.

---

## 15. Integracja z onboardingiem i roadmapą

Feedback powinien pomagać w decyzjach przed dalszym onboardingiem.

Przykłady:

- jeśli użytkownicy często zgłaszają, że nie wiedzą jak opublikować ofertę,
  wzmacniamy krok onboardingowy publikacji,
- jeśli pojawia się dużo feedbacku z `/dodaj-oferte`, poprawiamy copy albo
  walidacje,
- jeśli ankieta pokazuje duże zainteresowanie integracjami, przesuwamy je w
  roadmapie.

W samouczku agentów można później dodać mikroankiety:

- `Czy ten krok był jasny?`
- `Czego zabrakło przy dodawaniu pierwszej oferty?`
- `Co najbardziej blokuje Cię przed publikacją?`

---

## 16. Rekomendowana decyzja: publiczny czy tylko zalogowany

Rekomendacja:

1. MVP dla zalogowanych użytkowników.
2. Prosty publiczny formularz `/feedback` dla odwiedzających.
3. Brak publicznej tablicy pomysłów na start.
4. Ankiety najpierw dla zalogowanych, potem dla publicznych segmentów.

Dlaczego:

- zalogowani dają lepszy kontekst i mniej spamu,
- publiczny formularz pozwoli wyłapać problemy katalogu i formularza ofert,
- publiczna tablica wymaga moderacji i może tworzyć niechciane obietnice,
- ankiety będą wartościowsze, gdy zaczniemy od użytkowników z realnym kontekstem.

---

## 17. Backlog wdrożeniowy

### `FB.1` Przygotować model i API feedbacku

- Encje/tabele feedbacku.
- DTO i walidacja.
- Endpoint dla zalogowanych.
- Publiczny endpoint z ochroną antyspamową.
- Event analytics `product_feedback_submitted`.
- Status: wykonane.
- Data zakończenia: 2026-05-10.
- Wykonano:
  - dodano moduł API `ProductFeedbackModule`,
  - dodano encję `ProductFeedback` z typem, statusem, kategorią, źródłem,
    priorytetem, kontekstem użytkownika/workspace i metadanymi,
  - dodano endpoint `POST /api/product-feedback` dla zalogowanych użytkowników,
  - dodano endpoint `POST /api/product-feedback/public` dla odwiedzających,
  - publiczny endpoint korzysta z honeypota, timing guard, rate limitów i
    heurystyk tekstu,
  - dodano event analytics `product_feedback_submitted` dla zgłoszeń
    zalogowanych użytkowników.

### `FB.2` Dodać widget feedbacku w dashboardzie

- Przycisk globalny.
- Modal/panel boczny.
- Automatyczny kontekst: URL, moduł, viewport.
- Typ zgłoszenia i priorytet użytkownika.
- Status: wykonane.
- Data zakończenia: 2026-05-10.
- Wykonano:
  - dodano globalny przycisk `Feedback` w topbarze dashboardu,
  - dodano modal zgłoszenia dla zalogowanego użytkownika,
  - formularz obsługuje typ zgłoszenia, kategorię, priorytet, tytuł i opis,
  - widget automatycznie wysyła kontekst: URL, moduł dashboardu, user agent i
    viewport,
  - formularz korzysta z endpointu `POST /api/product-feedback`,
  - po wysyłce użytkownik dostaje toast sukcesu albo komunikat błędu.

### `FB.3` Dodać publiczną stronę `/feedback`

- Krótki formularz.
- Parametr `source`.
- Odróżnienie feedbacku produktowego od abuse report.
- Antyspam i rate limiting.
- Status: wykonane.
- Data zakończenia: 2026-05-10.
- Wykonano:
  - dodano publiczną stronę `/feedback`,
  - dodano formularz feedbacku dla odwiedzających z typem, obszarem, tytułem,
    opisem i opcjonalnym emailem,
  - formularz wysyła do `POST /api/product-feedback/public`,
  - dodano honeypot i `formStartedAt` dla publicznego endpointu,
  - formularz obsługuje parametr `source`,
  - dodano copy odróżniające feedback produktowy od zgłaszania naruszeń ofert,
  - dodano link `Podziel się opinią` w stopce.

### `FB.4` Dodać panel administracyjny triage

- Lista zgłoszeń.
- Filtry.
- Szczegóły.
- Zmiana statusu.
- Notatki wewnętrzne.
- Status: wykonane.
- Data zakończenia: 2026-05-10.
- Wykonano:
  - dodano adminowe endpointy `GET /api/admin/product-feedback`,
    `GET /api/admin/product-feedback/:id` i
    `PATCH /api/admin/product-feedback/:id`,
  - zabezpieczono endpointy rolą `admin`,
  - dodano paginację oraz filtry po statusie, typie, kategorii, źródle,
    priorytecie użytkownika, priorytecie zespołu i frazie wyszukiwania,
  - dodano ekran `/dashboard/admin/feedback` z listą zgłoszeń i kontekstem
    źródłowym,
  - dodano zmianę statusu, priorytetu zespołu, notatki wewnętrznej i oznaczenie
    duplikatu,
  - dodano link do panelu w sidebarze tylko dla użytkowników z rolą `admin`.

### `FB.5` Dodać ankiety produktowe

- Model ankiet.
- Aktywne ankiety.
- Odpowiedzi.
- Segmentacja odbiorców.

Status: zrobione.

Zakres:

- dodano encje `FeatureSurvey` i `FeatureSurveyResponse`,
- dodano typy pytań: jednokrotny wybór, wielokrotny wybór, rating, NPS i tekst,
- dodano segmentację przez `audience` oraz `audienceRules` dla planów,
  użytkowników i workspace'ów beta,
- dodano endpointy:
  - `GET /api/feature-surveys/active`,
  - `GET /api/feature-surveys/public/active`,
  - `POST /api/feature-surveys/:id/responses`,
  - `POST /api/feature-surveys/:id/public-responses`,
  - `POST /api/admin/feature-surveys`,
  - `PATCH /api/admin/feature-surveys/:id`,
  - `GET /api/admin/feature-surveys/:id/responses`,
- odpowiedzi ankiet są zapisywane także jako `ProductFeedback` typu
  `survey_response`, żeby trafiały do wspólnego panelu triage,
- dodano komponent ankiet w dashboardzie oraz publicznie na `/feedback`,
- dodano testy jednostkowe walidacji wymaganych odpowiedzi i segmentacji
  aktywnych ankiet.

### `FB.6` Dodać moje zgłoszenia dla użytkownika

- Lista własnych zgłoszeń.
- Statusy.
- Odpowiedzi zespołu.

### `FB.7` Dodać głosowanie na wybrane pomysły

- Tylko dla zalogowanych.
- Najpierw wewnętrznie lub w ograniczonej becie.
- Bez publicznych obietnic terminów.

---

## 18. Rekomendowana kolejność

1. `FB.1` Model i API feedbacku.
2. `FB.2` Widget feedbacku w dashboardzie.
3. `FB.4` Minimalny panel triage.
4. `FB.3` Publiczna strona `/feedback`.
5. `FB.5` Ankiety produktowe.
6. `FB.6` Moje zgłoszenia.
7. `FB.7` Głosowanie na pomysły.

Najlepszy pierwszy krok to `FB.1`, bo porządkuje dane i pozwala potem podpinać
różne wejścia bez przepisywania fundamentu.

---

## 19. Kryteria MVP

MVP jest gotowe, gdy:

- zalogowany użytkownik może wysłać feedback z dashboardu,
- odwiedzający może wysłać prosty feedback z `/feedback`,
- zgłoszenie ma typ, kategorię, opis, źródło i status,
- zespół widzi zgłoszenia w panelu triage,
- działa podstawowa ochrona antyspamowa,
- feedback nie miesza się ze zgłoszeniami abuse ofert,
- event analytics rejestruje wysłanie feedbacku.
