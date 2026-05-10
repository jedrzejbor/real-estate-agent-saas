# Samouczek dla agentów nieruchomości — plan produktu i wdrożenia

Dokument opisuje docelowy samouczek dla agentów, którzy rejestrują się w
EstateFlow. Plan ma być bazą do kolejnych zadań wdrożeniowych: od prostego
MVP w dashboardzie po bardziej kontekstowy onboarding prowadzony przez
konkretne akcje użytkownika.

---

## 1. Cel samouczka

Samouczek ma doprowadzić nowego agenta do pierwszej realnej wartości możliwie
najszybciej:

1. agent rozumie, do czego służy system,
2. dodaje pierwszą ofertę,
3. dodaje pierwszego klienta lub lead,
4. planuje pierwsze spotkanie,
5. publikuje ofertę publicznie,
6. odbiera pierwsze zapytanie albo udostępnia link oferty,
7. wraca do dashboardu, który pokazuje mu, co dalej.

Nie chcemy budować ciężkiego kreatora, który blokuje dostęp do aplikacji.
Samouczek powinien być lekki, widoczny w kontekście pracy i możliwy do
ukrycia.

---

## 2. Dla kogo projektujemy

### Solo agent

Potrzebuje:

- szybkiego startu bez konfiguracji biura,
- jasnej ścieżki: oferta -> klient -> spotkanie -> publikacja,
- podpowiedzi, które pola są naprawdę wymagane,
- szybkiego poczucia, że system pomaga w codziennej pracy.

### Właściciel małego biura

Potrzebuje:

- dodać pierwsze oferty,
- zrozumieć, gdzie są klienci, spotkania i raporty,
- zaprosić zespół w późniejszym etapie,
- zobaczyć, że publiczny katalog może generować leady.

### Agent wracający po przerwie

Potrzebuje:

- przypomnienia ostatniego nieukończonego kroku,
- prostego CTA do następnej akcji,
- braku nachalnego overlayu przy każdym wejściu.

---

## 3. Zasady produktu

- Samouczek nie blokuje dostępu do aplikacji.
- Każdy krok prowadzi do realnego ekranu i realnej akcji.
- Progres powinien wynikać z danych, a nie tylko kliknięć w checklistę.
- Samouczek musi korzystać z istniejącej checklisty jako głównego źródła
  prawdy o progresie.
- Checklista pozostaje stałym centrum onboardingu w dashboardzie, a samouczek
  jest warstwą prowadzącą i kontekstową.
- Komunikaty mają być konkretne i krótkie.
- Użytkownik może ukryć samouczek i przywrócić go później.
- Po ukończeniu nowego kroku samouczek może wrócić jako delikatny nudge.
- Docelowo progres powinien synchronizować się między urządzeniami.

---

## 4. Obecny stan w aplikacji

Mamy już podstawę, na której warto budować:

- `apps/web/src/lib/onboarding.ts`
  - definicje kroków checklisty dashboardowej,
  - statusy `completed`, `ready`, `upcoming`,
  - core kroki: `listing`, `client`, `appointment`.
- `apps/web/src/hooks/use-onboarding-progress.ts`
  - lokalny zapis progresu per użytkownik/workspace,
  - dismiss/restore checklisty,
  - eventy analytics dla ukończonych kroków i ukrycia/przywrócenia checklisty.
- `apps/web/src/components/dashboard/onboarding-checklist.tsx`
  - komponent checklisty na dashboardzie,
  - CTA do następnego kroku,
  - progress bar,
  - widok ukrytej checklisty.
- Onboardingowe empty states w modułach:
  - oferty,
  - klienci,
  - kalendarz,
  - zapytania,
  - raporty.

Największe braki:

- kroki `publish` i `share` nadal są roadmapowe w copy, mimo że publikacja
  ofert istnieje,
- progres jest zapisany lokalnie w przeglądarce,
- nie ma warstwy samouczka po rejestracji / pierwszym wejściu, która prowadzi
  użytkownika przez istniejącą checklistę,
- nie ma checklisty jakości pierwszej oferty,
- nie ma kontekstowych wskazówek na ekranach formularzy,
- nie ma kompletnego funnelu analitycznego dla drop-offów.

---

## 4.1. Relacja samouczka z obecną checklistą

To nie są dwa osobne systemy.

Obecna checklista dashboardowa powinna zostać głównym modelem onboardingu:

- definiuje kroki,
- zna status kroku,
- zna aktywny rekomendowany krok,
- przechowuje informację o ukryciu i przywróceniu,
- emituje podstawowe eventy analytics.

Samouczek powinien być warstwą nad checklistą:

- pokazuje powitanie po rejestracji,
- tłumaczy, dlaczego kolejny krok ma znaczenie,
- podświetla właściwe miejsce w aplikacji,
- wyświetla kontekstowe nudges na ekranach modułów,
- korzysta z tych samych `stepId`, statusów i warunków ukończenia co checklista.

Zasada implementacyjna:

- nie tworzymy osobnego `tutorialProgress` obok `onboardingProgress`,
- nie duplikujemy listy kroków w nowym module,
- rozbudowujemy istniejące `apps/web/src/lib/onboarding.ts`,
- hook samouczka powinien czytać stan z `useOnboardingProgress` albo ze
  wspólnej warstwy domenowej,
- UI samouczka może być osobnym komponentem, ale jego dane muszą pochodzić z
  checklisty.

Docelowy podział odpowiedzialności:

- `lib/onboarding.ts` — definicje kroków, warunki, etykiety, grupy kroków.
- `use-onboarding-progress.ts` — stan, persystencja, aktywny krok, eventy.
- `OnboardingChecklist` — główny panel na dashboardzie.
- `AgentTutorialWelcome` — jednorazowe powitanie po rejestracji.
- `OnboardingNudge` — kontekstowe podpowiedzi na ekranach modułów.
- `ListingQualityChecklist` — lokalna checklista jakości konkretnej oferty.

---

## 5. Docelowa ścieżka samouczka

### Krok 1 — Powitanie po rejestracji

Cel:

- wyjaśnić, co agent może zrobić jako pierwsze,
- skierować do dashboardu i checklisty,
- nie zatrzymywać użytkownika w osobnym kreatorze.

Treść:

- `Witaj w EstateFlow`
- `Zacznij od dodania pierwszej oferty. Potem możesz dodać klienta, zaplanować spotkanie i opublikować ofertę.`

CTA:

- `Dodaj pierwszą ofertę`
- `Przejdź do dashboardu`

Implementacja:

- po rejestracji przekierować użytkownika do `/dashboard?welcome=1`,
- na dashboardzie pokazać jednorazowy welcome panel nad checklistą,
- zapisać `welcomeSeenAt` w stanie onboardingu,
- welcome panel powinien wskazywać ten sam `activeStep`, który pokazuje
  checklista.

### Krok 2 — Dodanie pierwszej oferty

Cel:

- agent tworzy pierwszą ofertę z minimalnym zestawem pól,
- system pokazuje, które informacje poprawią jakość publikacji.

CTA:

- `Dodaj ofertę`

Warunek ukończenia:

- `stats.listings.total > 0`.

Implementacja:

- utrzymać onboardingowy wariant formularza pierwszej oferty,
- dodać checklistę jakości oferty:
  - tytuł,
  - cena,
  - miasto z PRNG,
  - zdjęcie główne,
  - opis,
  - parametry zależne od typu nieruchomości.

### Krok 3 — Dodanie pierwszego klienta lub leada

Cel:

- agent zaczyna używać CRM jako miejsca pracy, nie tylko bazy ofert.

CTA:

- `Dodaj klienta`

Warunek ukończenia:

- `stats.clients.total > 0`.

Implementacja:

- zostawić obecny warunek statystyczny,
- w empty state klienta dodać copy powiązane z pierwszą ofertą:
  - `Dodaj kupującego, wynajmującego albo kontakt z telefonu.`

### Krok 4 — Zaplanowanie pierwszego spotkania

Cel:

- użytkownik zaczyna korzystać z kalendarza jako części procesu sprzedaży.

CTA:

- `Zaplanuj spotkanie`

Warunek ukończenia:

- `stats.appointments.total > 0`.

Implementacja:

- zostawić obecny warunek statystyczny,
- w formularzu spotkania sugerować powiązanie z klientem i ofertą, jeśli dane
  istnieją.

### Krok 5 — Publikacja oferty

Cel:

- oferta staje się widoczna publicznie,
- agent rozumie zależność: `status aktywna` + `publikacja opublikowana`.

CTA:

- `Opublikuj ofertę`

Warunek ukończenia:

- agent ma przynajmniej jedną ofertę z `publicationStatus = published` i
  `status = active`.

Implementacja:

- zaktualizować `publish` w `apps/web/src/lib/onboarding.ts` z `upcoming` na
  realny krok,
- rozszerzyć `DashboardStats` albo dodać osobny endpoint o licznik
  `publishedListings.total`,
- CTA powinno prowadzić do pierwszej nieopublikowanej oferty albo listy ofert.

### Krok 6 — Udostępnienie linku publicznego

Cel:

- agent widzi, że publiczna oferta może być wysłana klientowi albo użyta w
  promocji.

CTA:

- `Skopiuj link`

Warunek ukończenia:

- event `public_listing_share_clicked` albo zapisany `shareCompletedAt`.

Implementacja:

- dodać event analytics po kliknięciu kopiowania linku,
- zapisać krok w onboarding state,
- docelowo przenieść ten stan do API, bo nie wynika bezpośrednio z modelu
  danych.

### Krok 7 — Pierwsze zapytanie publiczne

Cel:

- agent rozumie, gdzie trafiają leady z kart ofert i profilu.

CTA:

- `Zobacz zapytania`

Warunek ukończenia:

- `stats.inquiries.total > 0` albo pierwsze wejście do modułu zapytań po
  publikacji oferty.

Implementacja:

- nie powinien być wymaganym core krokiem, bo zależy od rynku,
- pokazywać jako growth milestone po publikacji.

---

## 6. Struktura samouczka w UI

### Dashboard checklist

To powinien pozostać główny punkt wejścia.

Elementy:

- nagłówek `Doprowadź workspace do pierwszej wartości`,
- progres core kroków,
- aktualny rekomendowany krok,
- możliwość ukrycia i przywrócenia,
- osobna sekcja `Kolejne kroki`, gdy core onboarding jest ukończony.

### Welcome panel

Pokazywany tylko po rejestracji albo pierwszym wejściu.

Elementy:

- krótki tekst powitalny,
- CTA do pierwszej oferty,
- link `Pokaż mi później`,
- brak modala blokującego aplikację.

### Kontekstowe nudges

Przykłady:

- na liście ofert bez publikacji:
  - `Masz już ofertę. Opublikuj ją, żeby zobaczyć ją w katalogu.`
- na szczegółach opublikowanej oferty:
  - `Skopiuj link i wyślij klientowi.`
- w module zapytań bez leadów:
  - `Leady pojawią się tutaj po wysłaniu formularza z publicznej oferty.`

### Checklisty jakości

Powinny być lokalne dla konkretnego obiektu:

- jakość oferty,
- gotowość publikacji,
- kompletność profilu agenta.

Nie mieszamy ich z główną checklistą startową. Główna checklista mówi, co robić
dalej; checklisty jakości mówią, co poprawić w konkretnym miejscu.

---

## 7. Model danych

### MVP

Na początku można rozbudować obecny lokalny storage:

- `dismissedAt`,
- `completedStepIds`,
- `lastCompletedStepId`,
- `welcomeSeenAt`,
- `manualStepCompletions`,
- `updatedAt`.

Plusy:

- szybka implementacja,
- brak migracji backendu,
- działa z obecnym hookiem.

Minusy:

- brak synchronizacji między urządzeniami,
- użytkownik traci progres po wyczyszczeniu przeglądarki,
- trudniej analizować drop-offy bez wysyłania dodatkowych eventów.

### Docelowo

Dodać backendowy onboarding state:

- tabela lub pole JSONB przy użytkowniku/workspace,
- endpoint `GET /onboarding/state`,
- endpoint `PATCH /onboarding/state`,
- wersjonowanie schematu,
- zapisywanie manualnych kroków i dismissów,
- audyt najważniejszych zmian przez analytics.

Proponowany kształt:

```ts
interface OnboardingState {
  version: number;
  userId: string;
  workspaceId?: string | null;
  persona: 'agent' | 'agency_owner';
  welcomeSeenAt?: string | null;
  dismissedAt?: string | null;
  completedStepIds: string[];
  manualStepCompletions: Record<string, string>;
  lastCompletedStepId?: string | null;
  updatedAt: string;
}
```

---

## 8. Analytics

Wymagane eventy:

- `onboarding_started`
- `onboarding_welcome_seen`
- `onboarding_step_viewed`
- `onboarding_step_cta_clicked`
- `onboarding_step_completed`
- `onboarding_checklist_dismissed`
- `onboarding_checklist_restored`
- `onboarding_tutorial_completed`
- `onboarding_dropoff_detected`

Właściwości eventów:

- `stepId`,
- `stepOrder`,
- `source`,
- `completedCoreSteps`,
- `totalCoreSteps`,
- `coreCompletionPercentage`,
- `userRole`,
- `plan`,
- `workspaceId`,
- `timeSinceRegistrationMinutes`.

Metryki:

- czas do pierwszej oferty,
- czas do pierwszej publikacji,
- procent użytkowników z ukończonym core onboardingiem,
- drop-off per krok,
- kliknięcia CTA z checklisty,
- odsetek użytkowników ukrywających checklistę,
- liczba powrotów do checklisty.

---

## 9. Backlog wdrożeniowy

### `AT.1` Uporządkować obecną checklistę agenta

- Zaktualizować copy kroków w `apps/web/src/lib/onboarding.ts`.
- Zamienić `publish` z `upcoming` na realny krok, jeśli API dostarczy licznik.
- Ustalić, które kroki są core, a które growth.
- Usunąć roadmapowe copy tam, gdzie funkcja już istnieje.
- Upewnić się, że wszystkie przyszłe elementy samouczka czytają kroki z tej
  samej checklisty, a nie z osobnej listy.

### `AT.2` Dodać welcome panel po rejestracji

- Obsłużyć `/dashboard?welcome=1`.
- Pokazać panel powitalny nad checklistą.
- Dodać `welcomeSeenAt` do stanu onboardingu.
- Dodać event `onboarding_welcome_seen`.
- CTA welcome panelu ma prowadzić do `activeStep.href` z checklisty, jeśli
  istnieje.

### `AT.3` Dodać checklistę jakości pierwszej oferty

- Pokazać checklistę na formularzu/szczegółach oferty.
- Warunki:
  - zdjęcie,
  - miasto,
  - cena,
  - opis,
  - wymagane pola dla typu nieruchomości.
- Nie blokować zapisu, ale podpowiadać gotowość publikacji.

### `AT.4` Dodać realny krok publikacji oferty

- Rozszerzyć dashboard stats o liczbę opublikowanych ofert.
- CTA prowadzi do pierwszej oferty gotowej do publikacji.
- Ukończenie kroku po realnej publikacji.

### `AT.5` Dodać krok udostępnienia linku

- Dodać tracking kliknięcia kopiowania linku.
- Zapisać manual completion dla kroku `share`.
- Pokazać krok tylko, gdy istnieje opublikowana oferta.

### `AT.6` Dodać onboardingowe nudges na ekranach modułów

- Lista ofert.
- Szczegóły oferty.
- Klienci.
- Kalendarz.
- Zapytania.
- Raporty.

### `AT.7` Przenieść onboarding state do API

- Zaprojektować model danych.
- Dodać endpointy.
- Zmigrować hook z localStorage na API z fallbackiem lokalnym.
- Zachować wersjonowanie i sanitizację stanu.

### `AT.8` Rozbudować analytics funnel

- Dodać eventy wejścia w krok i kliknięcia CTA.
- Dodać dashboard metryk onboardingowych.
- Monitorować drop-off po rejestracji i przed pierwszą ofertą.

---

## 10. Rekomendowana kolejność

1. `AT.1` Uporządkować obecną checklistę agenta.
2. `AT.2` Dodać welcome panel po rejestracji.
3. `AT.4` Dodać realny krok publikacji oferty.
4. `AT.3` Dodać checklistę jakości pierwszej oferty.
5. `AT.5` Dodać krok udostępnienia linku.
6. `AT.6` Dodać kontekstowe nudges.
7. `AT.8` Rozbudować analytics funnel.
8. `AT.7` Przenieść onboarding state do API.

Najlepszy pierwszy krok techniczny to `AT.1`, bo poprawia istniejący mechanizm
bez dużej przebudowy i przygotowuje grunt pod realny samouczek po rejestracji.

---

## 11. Kryteria jakości

- Nowy agent wie, co zrobić jako pierwsze w mniej niż 10 sekund.
- Każde CTA prowadzi do ekranu, na którym można wykonać obiecaną akcję.
- Samouczek nie zasłania głównej pracy.
- Ukrycie checklisty jest respektowane.
- Ukończenie kroków wynika z realnych danych, gdy to możliwe.
- Copy nie używa pustych obietnic ani żargonu.
- UI działa na mobile i desktop bez przepełnień.
- Eventy analytics nie zawierają danych osobowych.
