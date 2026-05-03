# Freemium Sprint Plan — EstateFlow

Dokument operacyjny do wdrożenia wersji freemium EstateFlow.

Jego celem jest rozpisanie prac na sprinty i konkretne zadania tak, aby:

- przygotować gotowy produkt do publicznego udostępnienia wersji freemium,
- prowadzić realizację krok po kroku,
- odznaczać wykonane zadania,
- dopisywać co zostało wykonane i kiedy,
- zachować historię decyzji, ryzyk i rezultatów.

Dokument bazuje na założeniach z `docs/FREEMIUM_GROWTH_PLAN.md` i powinien być aktualizowany po zakończeniu każdego sprintu oraz po zamknięciu większych zadań.

---

## 1. Jak pracujemy z tym dokumentem

### Statusy

- `[ ]` — nie rozpoczęto
- `[-]` — w trakcie
- `[x]` — zakończone
- `[!]` — zablokowane / wymaga decyzji

### Zasada aktualizacji

Po zakończeniu zadania uzupełniamy:

- status checkboxa,
- datę wykonania,
- krótki opis zakresu,
- ewentualne decyzje / follow-upy.

### Szablon aktualizacji zadania

Przy każdym zadaniu można dopisać:

- `Data zakończenia:`
- `Wykonano:`
- `Uwagi / follow-up:`

---

## 2. Główny cel release'u freemium

Pierwsze publiczne wydanie freemium ma dostarczyć:

- mały, realnie używalny CRM dla solo agenta / małego biura,
- publiczne strony ofert jako natychmiastową wartość biznesową,
- podstawowe zbieranie leadów z publicznych ofert,
- jasne limity darmowego planu,
- podstawowy onboarding i aktywację użytkownika,
- bezpieczne fundamenty pod późniejsze funkcje płatne.

---

## 3. Kryteria gotowości do udostępnienia freemium

Wersję uznajemy za gotową do release'u, gdy spełnione są wszystkie poniższe warunki:

- istnieje zdefiniowany darmowy plan z limitami i zasadami dostępu,
- użytkownik może założyć konto i przejść onboarding,
- użytkownik może dodać ofertę, klienta i spotkanie,
- użytkownik może opublikować publiczną stronę oferty,
- publiczna oferta może zbierać leady przez formularz,
- system komunikuje limity freemium i miejsca upgrade'u,
- podstawowe zabezpieczenia antyspamowe i regulaminowe są wdrożone,
- kluczowe flow są przetestowane end-to-end,
- mamy podstawową analitykę aktywacji i konwersji,
- dokumentacja release'u i checklisty operacyjne są gotowe.

---

## 4. Plan sprintów

Zakładamy sprinty 1-2 tygodniowe. Jeśli w trakcie realizacji okaże się, że któryś sprint jest zbyt szeroki, dzielimy go na dwa mniejsze, ale nie mieszamy celów.

### Sprint 0 — Scope, pricing i zasady freemium

**Cel sprintu:**
Domknąć zakres darmowego planu, limity, reguły produktu i wymagania release'u.

**Rezultat sprintu:**
Jednoznacznie zdefiniowany freemium scope, gotowy do wdrożenia w aplikacji i komunikacji produktowej.

#### Zadania

- [ ] `F0.1` Zdefiniować limity darmowego planu
  - Zakres: liczba ofert, klientów, spotkań, użytkowników, zdjęć, leadów, raportów.
  - Proponowane limity na release freemium MVP:
    - do `5` aktywnych ofert,
    - do `25` klientów,
    - do `20` spotkań miesięcznie,
    - `1` użytkownik w workspace,
    - do `15` zdjęć na ofertę publiczną,
    - publiczne strony ofert: włączone dla wszystkich ofert w limicie,
    - publiczne leady: bez osobnego limitu w MVP, ale z fair-use i ochroną antyspamową,
    - raporty: tylko `overview` + podstawowy raport ofert + podstawowy raport klientów,
    - branding EstateFlow: obowiązkowy w planie free,
    - brak własnej domeny i brak white-label.
  - Wyjątki i zasady interpretacji limitów:
    - limit ofert dotyczy aktywnych ofert, a nie archiwalnych,
    - po osiągnięciu limitu użytkownik może edytować istniejące rekordy, ale nie tworzy nowych,
    - przekroczenie limitu spotkań blokuje tworzenie kolejnych spotkań do końca bieżącego miesiąca,
    - leady z publicznych ofert nie powinny być blokowane, aby nie psuć acquisition loopu,
    - zdjęcia ponad limit nie powinny być uploadowane już na poziomie UI i API.
  - Decyzje do potwierdzenia podczas realizacji:
    - czy limit `5` ofert liczymy per workspace czy per agent,
    - czy spotkania miesięczne resetują się kalendarzowo, czy rolling 30 dni,
    - czy archiwizacja oferty natychmiast zwalnia slot w limicie.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F0.2` Zdefiniować co jest darmowe, a co płatne
  - Zakres: CRM, raporty, branding, profile publiczne, lead forms, integracje, automatyzacje.
  - Zakres darmowy na release MVP:
    - podstawowy CRM dla ofert, klientów i spotkań w ramach limitów,
    - podstawowy dashboard,
    - raport `overview`, podstawowy raport ofert i podstawowy raport klientów,
    - publiczna karta oferty z brandingiem EstateFlow,
    - formularz leadowy dla publicznej oferty,
    - podstawowy onboarding i checklista startowa,
    - podstawowy profil agenta / biura tylko jeśli zmieści się w scope po Sprintach 3-5.
  - Zakres płatny od pierwszej wersji monetizacji:
    - większe limity rekordów i większa skala workspace,
    - usunięcie brandingu EstateFlow,
    - własna domena / white-label publicznych stron,
    - raporty premium: funnel, value & sales, zaawansowane porównania i raporty zespołowe,
    - integracje portalowe,
    - automatyzacje leadów i powiadomień,
    - multi-user, role i funkcje zespołowe,
    - eksporty premium i zaawansowana analityka.
  - Scope poza release freemium MVP:
    - pełny marketplace / katalog publicznych ofert,
    - rozbudowane profile agentów i biur,
    - zaawansowany widget embeddable,
    - zaawansowany AI content generation,
    - rozbudowany billing i checkout self-service.
  - Zasada produktowa:
    - free ma dawać realny efekt operacyjny,
    - paid ma odblokowywać skalę, profesjonalizację, automatyzację i branding.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F0.3` Zdefiniować komunikaty upgrade'owe i momenty paywall
  - Zakres: limity w UI, CTA upgrade, miejsca blokady i soft-warningi.
  - Główne momenty upgrade'u:
    - próba dodania `6.` aktywnej oferty,
    - próba dodania `26.` klienta,
    - próba dodania `21.` spotkania w miesiącu,
    - potrzeba usunięcia brandingu z publicznej strony oferty,
    - potrzeba raportów premium,
    - potrzeba dodania drugiego użytkownika,
    - potrzeba integracji portalowych lub automatyzacji.
  - Zasady komunikacji w UI:
    - soft warning przy wykorzystaniu `80%` limitu,
    - stronger warning przy `100%` limitu,
    - paywall tylko przy akcji tworzącej nowy rekord lub uruchamiającej funkcję premium,
    - brak agresywnego blokowania istniejących danych,
    - zawsze pokazujemy: aktualne użycie, limit, korzyść po upgrade i CTA.
  - Miejsca komunikatów:
    - dashboard i overview usage card,
    - listy ofert / klientów / spotkań,
    - formularze tworzenia,
    - ekran ustawień planu,
    - raporty premium entry points,
    - ustawienia publikacji oferty i brandingu.
  - Wstępne komunikaty produktowe:
    - „Osiągnięto limit planu Free — przejdź na plan płatny, aby dodać kolejne rekordy”,
    - „Usuń branding EstateFlow i publikuj bardziej profesjonalnie w planie płatnym”,
    - „Odblokuj zaawansowane raporty, aby analizować skuteczność i sprzedaż”.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F0.4` Zdefiniować minimalne metryki sukcesu freemium
  - Zakres: activation rate, first listing published, first public page shared, first lead captured, upgrade intent.
  - Metryki aktywacji:
    - `%` nowych użytkowników, którzy utworzyli pierwszą ofertę w ciągu `24h`,
    - `%` nowych użytkowników, którzy dodali klienta w ciągu `7 dni`,
    - `%` nowych użytkowników, którzy dodali spotkanie w ciągu `7 dni`,
    - `%` nowych użytkowników, którzy opublikowali publiczną ofertę w ciągu `7 dni`.
  - Metryki wartości produktu:
    - czas do pierwszej opublikowanej oferty,
    - czas do pierwszego publicznego linku skopiowanego lub udostępnionego,
    - liczba publicznych odsłon ofert na workspace,
    - liczba workspace'ów, które złapały pierwszy lead z publicznej oferty.
  - Metryki monetyzacyjne / intent:
    - liczba wejść w ekran planu i pricingu,
    - liczba kontaktów z paywallem po limicie,
    - `%` workspace'ów, które dobijają do co najmniej `80%` limitu ofert,
    - `%` workspace'ów, które osiągają przynajmniej jeden trigger upgrade'u.
  - Minimalne KPI do oceny pierwszego release'u:
    - co najmniej `50%` nowych użytkowników tworzy pierwszą ofertę,
    - co najmniej `25%` nowych użytkowników publikuje pierwszą stronę oferty,
    - co najmniej `10%` aktywnych workspace'ów otrzymuje pierwszy lead publiczny,
    - co najmniej `20%` aktywnych workspace'ów dociera do miejsca z komunikatem upgrade.
  - Eventy obowiązkowe do wdrożenia:
    - `signup_completed`,
    - `onboarding_step_completed`,
    - `listing_created`,
    - `listing_published`,
    - `public_listing_viewed`,
    - `public_lead_submitted`,
    - `limit_warning_shown`,
    - `limit_reached`,
    - `upgrade_cta_clicked`.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F0.5` Przygotować checklistę wymagań release readiness
  - Zakres: produkt, backend, frontend, bezpieczeństwo, legal, analytics, support.
  - Checklist produktowa:
    - limity i zasady planu free są zaimplementowane i spójne w całym produkcie,
    - onboarding prowadzi do pierwszej wartości,
    - publiczna oferta jest gotowa do użycia na desktopie i mobile,
    - komunikaty upgrade są spójne i nie blokują istniejących danych.
  - Checklist backendowa:
    - limity są egzekwowane po stronie API,
    - publiczne endpointy mają walidację, rate limiting i bezpieczne domyślne ustawienia,
    - zapis leadów i publish flow mają logi błędów i monitoring,
    - eventy analityczne mają stabilny kontrakt danych.
  - Checklist frontendowa:
    - wszystkie stany limitów mają UI: normalny, warning, hard limit,
    - empty states i onboarding states są gotowe,
    - publiczne strony ofert mają poprawne SEO metadata i share previews,
    - formularze publiczne mają obsłużone błędy, walidację i success state.
  - Checklist bezpieczeństwa i legal:
    - regulamin publikacji i polityka prywatności są gotowe,
    - publiczne formularze mają zgody i ochronę antyspamową,
    - claim flow ma email verification i audit log,
    - istnieje ścieżka zgłoszenia nadużycia.
  - Checklist analityki i operacji:
    - dashboard metryk freemium działa,
    - monitoring błędów dla publish / lead / claim flow jest włączony,
    - feature flags i rollback plan są gotowe,
    - support ma FAQ i procedury obsługi pierwszych zgłoszeń.
  - Krytyczne scenariusze do ręcznego przejścia przed release:
    - nowy użytkownik przechodzi onboarding i dodaje pierwszą ofertę,
    - użytkownik publikuje ofertę i kopiuje link,
    - lead wpada z publicznej strony do CRM,
    - użytkownik dobija do limitu i widzi poprawny paywall,
    - publiczne dodanie oferty i claim flow działają poprawnie, jeśli sprint 5 jest w scope release'u.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

#### Definition of Done

- zakres freemium jest spisany i zaakceptowany,
- są znane wszystkie limity i wyjątki,
- istnieje lista funkcji na release i poza release,
- są zdefiniowane KPI oraz eventy do pomiaru skuteczności freemium,
- istnieje release checklist, na której można oprzeć wejście w wykonanie Sprintu 1.

#### Log sprintu

- Status sprintu:
- Data zamknięcia:
- Co dowieźliśmy:
- Decyzje:
- Otwarte tematy:

---

### Sprint 1 — Fundament produktu freemium w aplikacji

**Cel sprintu:**
Wdrożyć podstawowe mechanizmy planu darmowego w obecnym produkcie CRM.

**Rezultat sprintu:**
Aplikacja rozpoznaje użytkownika freemium, stosuje limity i pokazuje właściwe komunikaty.

**Założenia techniczne na bazie obecnej architektury:**

- właścicielem planu i limitów powinno być `Agency`, bo ta encja już zawiera pola `subscription` i `plan`,
- użytkownik rejestrujący się w MVP powinien automatycznie otrzymywać własne `Agency` w planie `free`,
- `Agent` powinien być przypisany do tego `Agency` już podczas rejestracji,
- `auth/me` oraz odpowiedź login/register powinny zwracać informacje o planie, limicie i usage summary,
- egzekwowanie limitów powinno być po stronie API w miejscach tworzenia rekordów, a nie tylko w UI,
- UI powinno operować na prostym modelu: `plan`, `limits`, `usage`, `features`.

**Minimalny model danych do wdrożenia w Sprincie 1:**

- `Agency.plan` — np. `free`, `starter`, `professional`, `enterprise`,
- `Agency.subscription` — np. `active`, `trial`, `past_due`, `canceled` lub prostszy stan MVP,
- dodatkowe pole techniczne rekomendowane do dodania: `planLimitsSnapshot` lub wyliczane entitlementy z serwisu,
- dodatkowe pole techniczne rekomendowane do dodania: `trialEndsAt` tylko jeśli chcemy zostawić drogę pod trial płatnych planów.

**Minimalny kontrakt danych dla web:**

- `plan: { code, label, status }`,
- `usage: { activeListings, clients, monthlyAppointments }`,
- `limits: { activeListings, clients, monthlyAppointments, users, imagesPerListing }`,
- `features: { reportsOverview, reportsListingsBasic, reportsClientsBasic, customBranding, multiUser }`.

#### Zadania

- [x] `F1.1` Dodać model planu / subskrypcji / entitlements
  - Zakres: plan `free`, limity, flagi funkcji, miejsce na późniejsze plany płatne.
  - Proponowana implementacja MVP:
    - wykorzystać `Agency` jako źródło prawdy dla planu i subskrypcji,
    - podczas rejestracji tworzyć automatycznie `Agency` dla nowego użytkownika,
    - przypinać nowego `Agent` do świeżo utworzonego `Agency`,
    - dodać serwis `billing` lub `entitlements`, który mapuje `plan` → `limits` i `features`,
    - nie trzymać logiki limitów rozproszonej po frontendzie.
  - Techniczne elementy do wdrożenia:
    - enum / stałe planów i statusów subskrypcji,
    - centralny resolver entitlements po stronie API,
    - rozszerzenie odpowiedzi `auth/register`, `auth/login`, `auth/me`,
    - gotowość na przyszły upgrade bez zmiany kontraktu API.
  - Preferowana kolejność:
    - najpierw model planów,
    - potem tworzenie `Agency` przy rejestracji,
    - potem zwracanie planu do web.
  - Data zakończenia: 2026-04-26
  - Wykonano:
    - dodano enumy planu i statusu subskrypcji oraz centralny resolver entitlementów,
    - rejestracja tworzy teraz automatycznie `Agency` w planie `free` i przypina do niej `Agent`,
    - dodano lazy backfill `Agency` dla starszych użytkowników bez przypisanego workspace,
    - `auth/register`, `auth/login` i `auth/me` zwracają teraz `agency` oraz `entitlements`,
    - webowy model `AuthUser` został rozszerzony o dane planu i feature access.
  - Uwagi / follow-up:
    - kolejnym krokiem jest wykorzystanie `entitlements.limits` do twardej egzekucji limitów w `F1.2`,
    - UI jeszcze nie pokazuje badge planu ani usage card — to wchodzi w `F1.3` / `F1.4`.

- [x] `F1.2` Wymusić limity freemium w API
  - Zakres: oferty, klienci, spotkania, uploady, leady, raporty.
  - Miejsca egzekucji limitów w obecnym kodzie:
    - `ListingsService.create()` dla limitu aktywnych ofert,
    - `ClientsService.create()` dla limitu klientów,
    - `AppointmentsService.create()` dla limitu miesięcznych spotkań,
    - upload obrazów oferty w module listing images, jeśli upload jest osobnym flow,
    - endpointy raportowe dla feature gating premium.
  - Zasada implementacyjna:
    - limity sprawdzamy przed zapisem rekordu,
    - przy przekroczeniu rzucamy dedykowany błąd biznesowy z czytelnym kodem,
    - UI ma dostać przewidywalny response typu `PLAN_LIMIT_REACHED`.
  - Minimalne liczniki usage wymagane po stronie API:
    - liczba aktywnych ofert dla `agencyId`,
    - liczba klientów dla `agencyId` lub początkowo dla pojedynczego agenta, jeśli workspace scope jeszcze nie jest pełny,
    - liczba spotkań w bieżącym miesiącu,
    - liczba użytkowników w `Agency`.
  - Ważna decyzja architektoniczna:
    - jeśli dane są dziś powiązane tylko z `agentId`, to limit liczymy po agentach należących do `Agency`,
    - nie przenosimy od razu wszystkich encji na `agencyId`, jeśli to nie jest potrzebne do MVP.
  - Data zakończenia: 2026-04-26
  - Wykonano:
    - dodano wspólny kontekst dostępu użytkownika do `Agency` oraz listy agentów workspace,
    - dodano przewidywalny wyjątek `PLAN_LIMIT_REACHED` z detalami limitu i usage,
    - limity są egzekwowane w `ListingsService.create()`, `ClientsService.create()` i `AppointmentsService.create()`,
    - limit ofert liczony jest dla ofert niearchiwalnych w całym `Agency`,
    - limit spotkań liczony jest miesięcznie na podstawie miesiąca `startTime` tworzonego spotkania.
  - Uwagi / follow-up:
    - uploady obrazów i feature gating raportów pozostają w kolejnych zadaniach `F1.5` i dalszych,
    - UI powinno obsłużyć `code = PLAN_LIMIT_REACHED` w komunikatach create flow.

- [x] `F1.3` Dodać komunikację limitów w UI
  - Zakres: bannery, badge planu, warningi przed limitem, stan po przekroczeniu limitu.
  - Minimalny zakres UI na MVP:
    - badge planu `Free` w dashboard shell,
    - usage card na dashboardzie,
    - warning przy `80%` limitu dla ofert, klientów i spotkań,
    - komunikat hard limit w modalach / formularzach create,
    - CTA do przyszłego pricing / upgrade flow.
  - Dane wejściowe z API:
    - `plan`, `usage`, `limits`, `features` zwrócone z `auth/me` lub osobnego endpointu `billing/me`.
  - Miejsca wdrożenia na web:
    - `AuthContext` jako źródło planu dla całej aplikacji,
    - dashboard topbar lub sidebar dla badge planu,
    - strony tworzenia ofert, klientów i spotkań dla komunikatów granicznych.
  - Zasada UX:
    - najpierw pokazujemy ile zostało do limitu,
    - dopiero potem pokazujemy blokadę,
    - nie chowamy istniejących danych po przekroczeniu limitu.
  - Data zakończenia: 2026-04-26
  - Wykonano:
    - `auth/me` zwraca teraz także `usage` dla ofert, klientów, spotkań miesięcznych i liczby użytkowników,
    - w topbarze pojawił się badge z aktualnym planem użytkownika,
    - dashboard pokazuje kartę wykorzystania limitów z warningami przy `80%+`,
    - formularze tworzenia ofert, klientów i spotkań pokazują lokalne warningi wykorzystania,
    - `PLAN_LIMIT_REACHED` jest parsowany po stronie web i wyświetlany jako czytelny błąd globalny w create flow.
  - Uwagi / follow-up:
    - docelowo warto dodać osobny ekran `Plan i limity` w `F1.4`,
    - usage odświeża się przez `auth/me`; można później dodać dedykowany refresh po udanym create/delete.

- [x] `F1.4` Przygotować ustawienia planu i ekran zarządzania limitem
  - Zakres: widok planu, wykorzystania limitów i CTA upgrade.
  - Proponowany MVP scope:
    - nowy widok typu `Plan i limity` w dashboardzie,
    - sekcja `Twój plan`,
    - sekcja `Wykorzystanie`,
    - sekcja `Odblokuj więcej` z placeholderem dla płatnych planów.
  - Minimalne komponenty:
    - progress bars dla usage,
    - lista funkcji dostępnych w `Free`,
    - lista funkcji premium z CTA.
  - Cel tego zadania:
    - dać użytkownikowi jedno centralne miejsce, gdzie rozumie swój plan,
    - odciążyć przypadkowe paywalle rozsiane po produkcie.
  - Data zakończenia: 2026-04-26
  - Wykonano:
    - dodano dedykowaną stronę `Plan i limity` pod `dashboard/settings`, zamiast dotychczasowego placeholdera z catch-all route,
    - wydzielono współdzielone helpery i komponent usage, aby dashboard overview i ekran planu korzystały z jednego źródła prawdy,
    - ekran pokazuje sekcje `Twój plan`, `Wykorzystanie` i `Odblokuj więcej`, zgodnie z MVP scope tego zadania,
    - podpięto nawigację z istniejących CTA: link z karty usage na dashboardzie, badge planu w topbarze i aktywny stan w sidebarze,
    - całość zweryfikowano buildem `apps/web` po wdrożeniu.
  - Uwagi / follow-up:
    - CTA upgrade jest na razie placeholderem UI i powinno zostać podłączone do realnego pricing / lead capture flow w kolejnych sprintach,
    - jeśli dojdą kolejne plany lub billing, warto rozszerzyć ekran o historię subskrypcji i pełniejsze porównanie planów.

- [x] `F1.5` Ograniczyć darmowe raporty do podstawowego scope
  - Zakres: overview + podstawowe listing/client reports, ukrycie premium entry points.
  - Aktualny stan kodu:
    - istnieją już `overview`, `listings`, `clients`, `appointments`,
    - freemium MVP powinno zostawić `overview`, podstawowy `listings` i podstawowy `clients`,
    - `appointments` można oznaczyć jako premium lub ukryć za feature flagą, jeśli chcemy mocniejszy trigger upgrade.
  - Zasada implementacji:
    - backend sprawdza feature access do endpointu,
    - frontend ukrywa lub disabled-state'uje zablokowane sekcje,
    - nie polegamy wyłącznie na ukrywaniu w UI.
  - Decyzja do domknięcia przed wdrożeniem:
    - raport spotkań staje się elementem premium w pierwszym release freemium.
  - Data zakończenia: 2026-04-27
  - Wykonano:
    - backendowy endpoint `reports/appointments` sprawdza teraz entitlement `reportsAppointmentsBasic` i zwraca przewidywalny `403` z kodem `FEATURE_NOT_AVAILABLE`,
    - web przestał fetchować raport spotkań dla planu Free, więc UI nie opiera się na obsłudze błędu jako głównym mechanizmie feature gatingu,
    - na stronie raportów pozostawiono `overview`, raport `Oferty` i raport `Klienci`, a miejsce raportu spotkań zamieniono na czytelny premium placeholder z CTA do `Plan i limity`,
    - copy i entry pointy w module raportów zostały dopasowane do darmowego scope release'u.
  - Uwagi / follow-up:
    - jeśli w kolejnych sprintach pojawią się dalsze raporty premium, warto ujednolicić premium placeholders i dodać wspólne eventy analytics dla wejść w paywall,
    - po wprowadzeniu feature flags można dodatkowo spiąć widoczność premium entry pointów z osobną flagą rolloutową.

- [x] `F1.6` Przygotować techniczne feature flags dla release'u
  - Zakres: możliwość stopniowego włączania publicznych funkcji.
  - Rekomendowany minimalny zestaw flag:
    - `publicListingsEnabled`,
    - `publicLeadFormsEnabled`,
    - `publicClaimFlowEnabled`,
    - `freemiumUpsellEnabled`,
    - `premiumReportsEnabled`.
  - Gdzie trzymać flagi na MVP:
    - startowo jako konfiguracja backendowa lub prosty config file,
    - nie trzeba od razu budować pełnego systemu remote config.
  - Po co to robimy:
    - bezpieczny rollout funkcji publicznych,
    - łatwy rollback bez cofania migracji,
    - możliwość odpalania feature'ów tylko dla wybranych środowisk.
  - Data zakończenia: 2026-04-27
  - Wykonano:
    - dodano centralny resolver `release flags` po stronie API oparty o zmienne środowiskowe i bezpieczne wartości domyślne,
    - flagi są zwracane w payloadzie `auth/register`, `auth/login` i `auth/me`, więc web dostaje jeden spójny kontrakt konfiguracyjny dla dashboardu,
    - istniejące premium entry pointy na web zostały spięte z flagami `freemiumUpsellEnabled` i `premiumReportsEnabled`,
    - przygotowano env-y i dokumentację lokalnego uruchomienia pod stopniowy rollout funkcji publicznych.
  - Uwagi / follow-up:
    - kolejne sprinty z publicznymi ofertami i lead forms powinny korzystać z tego samego resolvera także po stronie backendowych endpointów publicznych,
    - jeśli pojawi się potrzeba zarządzania flagami bez restartu API, można później dołożyć prosty storage DB lub remote config nad obecnym kontraktem env.

#### Definition of Done

- plan `free` działa end-to-end,
- limity są egzekwowane po stronie backendu i czytelne po stronie UI,
- produkt jest gotowy na onboarding pierwszego darmowego użytkownika,
- nowy użytkownik po rejestracji trafia do własnego `Agency` w planie `free`,
- web zna bieżący plan, usage i feature access bez dodatkowego ręcznego mapowania,
- istnieje bezpieczna baza pod późniejsze płatne plany i upgrade flow.

#### Proponowana kolejność realizacji Sprintu 1

1. `F1.1` Model planu, tworzenie `Agency`, kontrakt `auth/me`
2. `F1.2` Egzekwowanie limitów w API
3. `F1.5` Feature gating raportów
4. `F1.6` Feature flags dla funkcji publicznych i premium
5. `F1.3` Komunikacja limitów w dashboardzie i create flows
6. `F1.4` Widok `Plan i limity`

#### Ryzyka techniczne Sprintu 1

- obecne dane domenowe są powiązane głównie z `agentId`, więc usage per `Agency` trzeba liczyć przez relację agentów,
- obecny flow rejestracji tworzy `User` i `Agent`, ale nie tworzy `Agency`,
- kontrakt auth na web będzie wymagał rozszerzenia typów `AuthUser` i `AuthResponse`,
- jeśli plan premium ma wejść później, nie warto jeszcze wdrażać pełnego billing engine — tylko czysty entitlement layer.

#### Log sprintu

- Status sprintu:
- Data zamknięcia:
- Co dowieźliśmy:
- Decyzje:
- Otwarte tematy:

---

### Sprint 2 — Onboarding i szybka aktywacja użytkownika

**Cel sprintu:**
Doprowadzić nowego użytkownika do pierwszej wartości w 10-15 minut.

**Rezultat sprintu:**
Użytkownik po rejestracji przechodzi prosty onboarding i wykonuje pierwsze kluczowe akcje.

#### Zadania

- [x] `F2.1` Zaprojektować onboarding checklist
  - Zakres: dodaj ofertę, dodaj klienta, dodaj spotkanie, opublikuj ofertę, udostępnij link.
  - Data zakończenia: 2026-04-28
  - Wykonano:
    - dodano dashboardowy komponent checklisty startowej osadzony bezpośrednio na stronie głównej panelu,
    - kroki checklisty są wyliczane z istniejących statystyk dashboardu, więc pierwsze trzy etapy reagują już na realne dane użytkownika,
    - checklista zawiera od razu docelowe kroki publikacji i udostępnienia oferty, ale oznacza je jako `Wkrótce`, aby spójnie przygotować grunt pod Sprinty 3–4,
    - logika kroków została wydzielona do osobnego helpera, tak aby F2.2 mogło później dołożyć trwały onboarding state bez przebudowy UI.
  - Uwagi / follow-up:
    - F2.2 powinno dodać persisted onboarding state, dismiss/restore oraz bardziej precyzyjne warunki ukończenia kroków publikacji i udostępniania,
    - w kolejnych iteracjach warto spiąć checklistę z analytics, żeby mierzyć przejścia między krokami i czas do pierwszej wartości.

- [x] `F2.2` Dodać onboarding state i progres użytkownika
  - Zakres: stan kroków, ukończenie, wyświetlanie CTA i nudges.
  - Data zakończenia: 2026-04-28
  - Wykonano:
    - dodano trwały onboarding state po stronie web z bezpiecznym storage per użytkownik/workspace, dzięki czemu checklista pamięta ukrycie oraz historię ukończonych kroków,
    - progres checklisty został przeliczony na realny onboarding startowy `3/3`, zamiast mieszać go z roadmapowymi krokami `Wkrótce`,
    - checklista potrafi się ukryć i wrócić na żądanie użytkownika, a po nowo ukończonym kroku automatycznie resetuje ukrycie i pokazuje świeży nudge,
    - dodano lekkie nudges UX: rekomendowany następny krok, ostatnio ukończony etap i toast po wykryciu nowego progresu.
  - Uwagi / follow-up:
    - obecna persystencja onboarding state działa lokalnie w przeglądarce; jeśli będzie potrzebna synchronizacja między urządzeniami, warto przenieść ten stan do API / profilu użytkownika,
    - Sprint `F2.6` powinien wykorzystać tę warstwę do emitowania eventów `onboarding_step_completed`, `onboarding_checklist_dismissed` i `onboarding_checklist_restored`.

- [x] `F2.3` Uprościć pierwszy create flow dla oferty
  - Zakres: szybki formularz / wizard do pierwszej oferty.
  - Data zakończenia: 2026-04-28
  - Wykonano:
    - dodano onboardingowy wariant formularza tworzenia oferty, który na start pokazuje tylko kluczowe pola potrzebne do zapisania pierwszej oferty,
    - formularz pozwala opcjonalnie rozwinąć dodatkowe parametry i adres, więc użytkownik może szybciej przejść przez pierwszą aktywację bez utraty możliwości uzupełnienia szczegółów,
    - zachowano pełny standardowy formularz dla edycji ofert i istniejących miejsc użycia komponentu,
    - strona dodawania oferty korzysta teraz z uproszczonego flow i komunikuje możliwość późniejszego uzupełnienia danych.
  - Uwagi / follow-up:
    - F2.5 powinno teraz oprzeć empty states o ten uproszczony flow i prowadzić użytkownika do `/dashboard/listings/new`,
    - po Sprintach 3-4 warto dopiąć po zapisie pierwszej oferty kolejny nudge do publikacji strony publicznej.

- [x] `F2.4` Dodać prosty import CSV dla klientów
  - Zakres: minimalny import, walidacja kolumn, raport błędów.
  - Data zakończenia: 2026-04-29
  - Wykonano:
    - dodano endpoint `POST /api/clients/import`, który przyjmuje sparsowane wiersze CSV, waliduje limit batcha i egzekwuje limit klientów planu przed zapisem,
    - import zapisuje klientów transakcyjnie, obsługuje podstawowe preferencje klienta i dopisuje aktywność CRM dla zaimportowanych rekordów,
    - dodano panel importu CSV na stronie klientów z lokalnym parserem CSV, mapowaniem polskich i angielskich nagłówków, walidacją wierszy oraz raportem błędów,
    - po udanym imporcie lista klientów odświeża się, a użytkownik dostaje toast z wynikiem importu.
  - Uwagi / follow-up:
    - parser obsługuje podstawowe CSV z separatorami `,` i `;`; bardziej złożone importy można później przenieść do backendowego parsera plików,
    - warto rozważyć deduplikację po emailu / telefonie przed publicznym releasem, jeśli import ma być często używany na istniejących bazach kontaktów.

- [x] `F2.5` Dodać onboardingowe empty states w dashboardzie i modułach
  - Zakres: brak ofert, brak klientów, brak spotkań, brak raportów.
  - Data zakończenia: 2026-04-29
  - Wykonano:
    - dodano wspólny komponent onboardingowego empty state, aby moduły miały spójny język, CTA i układ dla pustych danych,
    - zaktualizowano empty states ofert, klientów i kalendarza tak, aby prowadziły do pierwszej oferty, pierwszego klienta/importu CSV oraz pierwszego spotkania,
    - dodano onboardingowe stany puste w kartach dashboardu: ostatnia aktywność, nadchodzące spotkania, rozkład statusów ofert i pipeline klientów,
    - dodano CTA w raportach Oferty i Klienci, gdy brakuje danych wejściowych do sensownej analityki,
    - przy okazji uproszczono synchronizację miesiąca w kalendarzu, usuwając synchroniczne `setState` w efekcie i opierając widok na query params.
  - Uwagi / follow-up:
    - po wdrożeniu publicznych stron ofert warto rozszerzyć empty state ofert o CTA do publikacji i udostępnienia linku,
    - F2.6 powinno mierzyć ekspozycję tych empty states oraz kliknięcia w ich główne CTA.

- [x] `F2.6` Zmierzyć aktywację w kluczowych punktach
  - Zakres: eventy analytics dla onboardingu i pierwszej wartości.
  - Data zakończenia: 2026-04-29
  - Wykonano:
    - dodano moduł analytics w API z endpointem `POST /api/analytics/events` oraz tabelą `analytics_events`,
    - zdefiniowano stabilny kontrakt eventów aktywacyjnych po stronie web i API,
    - podpięto event `signup_completed` po rejestracji użytkownika,
    - podpięto eventy pierwszej wartości: `listing_created`, `client_created`, `clients_imported` i `appointment_created`,
    - podpięto eventy onboardingu: `onboarding_step_completed`, `onboarding_checklist_dismissed` i `onboarding_checklist_restored`,
    - podpięto pomiar ekspozycji oraz kliknięć CTA dla onboardingowych empty states przez eventy `onboarding_empty_state_shown` i `onboarding_empty_state_cta_clicked`.
  - Uwagi / follow-up:
    - Sprint 7 powinien zbudować dashboard metryk na podstawie tabeli `analytics_events`,
    - po wdrożeniu publicznych ofert należy dopiąć eventy `listing_published`, `public_listing_viewed`, `public_lead_submitted` i share/copy link.

#### Definition of Done

- nowy użytkownik ma jasną ścieżkę startową,
- można łatwo dodać pierwsze dane,
- zebrane są eventy aktywacyjne.

#### Log sprintu

- Status sprintu:
- Data zamknięcia:
- Co dowieźliśmy:
- Decyzje:
- Otwarte tematy:

---

### Sprint 3 — Publiczne strony ofert

**Cel sprintu:**
Dać użytkownikowi możliwość publikacji publicznej strony oferty z poziomu obecnego CRM.

**Rezultat sprintu:**
Oferty mogą być publikowane pod publicznym linkiem i stanowią realny asset acquisition / SEO / sharing.

#### Zadania

- [x] `F3.1` Zdefiniować publiczny model danych oferty
  - Zakres: slug, status publikacji, pola publiczne, SEO metadata, branding.
  - Data zakończenia: 2026-04-29
  - Wykonano:
    - rozdzielono CRM-owy `ListingStatus` od publicznego `ListingPublicationStatus`, aby publikacja strony nie nadpisywała znaczenia statusu operacyjnego oferty,
    - dodano do modelu oferty pola publiczne: `publicSlug`, `publicationStatus`, publiczny tytuł/opis, SEO title/description, share image, ustawienia pokazywania ceny i dokładnego adresu oraz branding EstateFlow,
    - dodano `unpublishedAt`, żeby przyszły flow publish/unpublish mógł zachować pełną historię publikacji,
    - zdefiniowano backendowy typ `PublicListingView` jako kontrakt przyszłego publicznego endpointu,
    - rozszerzono frontendowe typy `Listing`, `PublicListing` i schemat ustawień publicznych/SEO.
  - Uwagi / follow-up:
    - F3.2 powinno dodać generowanie unikalnego sluga, publish/unpublish endpointy i walidacje wymaganych pól publicznych,
    - F3.4 powinno wykorzystać pola publiczne w ustawieniach publikacji w panelu agenta,
    - usuwanie brandingu EstateFlow pozostaje funkcją płatną i powinno być egzekwowane w logice entitlementów przy F3.2/F3.4.

- [x] `F3.2` Dodać backend publikacji i unpublish oferty
  - Zakres: endpointy, walidacje, uprawnienia, zasady dla planu free.
  - Data zakończenia: 2026-04-29
  - Wykonano:
    - dodano endpointy `POST /api/listings/:id/publish` i `POST /api/listings/:id/unpublish`,
    - dodano publiczny endpoint `GET /api/listings/public/:slug`, który zwraca tylko opublikowane oferty i respektuje ustawienia widoczności ceny oraz dokładnego adresu,
    - publish generuje unikalny `publicSlug`, uzupełnia domyślne publiczne tytuły/opisy oraz SEO metadata i ustawia `publicationStatus = published`,
    - unpublish ustawia `publicationStatus = unpublished` oraz `unpublishedAt`, bez kasowania sluga i historii publikacji,
    - dodano walidacje publikacji: brak publikacji zarchiwizowanej oferty, wymagane podstawowe dane, uprawnienia właściciela i entitlement `publicListings`,
    - w planach bez `customBranding` backend wymusza pozostawienie brandingu EstateFlow,
    - dodano activity log dla publish/unpublish oraz frontendowe helpery `publishListing`, `unpublishListing` i `fetchPublicListing`.
  - Uwagi / follow-up:
    - F3.3 powinno zbudować publiczną stronę na kontrakcie `GET /api/listings/public/:slug`,
    - F3.4 powinno dodać UI do publikacji, cofania publikacji, podglądu i kopiowania linku,
    - migracja produkcyjna powinna utworzyć nowe kolumny i indeks unikalny na `publicSlug`.

- [x] `F3.3` Zbudować publiczną stronę oferty
  - Zakres: hero, galeria, podstawowe informacje, CTA kontaktowe, branding EstateFlow.
  - Data zakończenia: 2026-04-29
  - Wykonano:
    - dodano publiczną trasę `/oferty/[slug]`, która pobiera dane z `GET /api/listings/public/:slug` i działa bez logowania,
    - zbudowano pełny widok publicznej oferty: hero ze zdjęciem, lokalizacja, cena, podstawowe parametry, opis, szczegóły i galeria,
    - dodano SEO metadata i Open Graph na podstawie publicznych pól oferty,
    - dodano CTA kontaktowe do telefonu / maila oraz informację, że formularz leadowy pojawi się w Sprincie 4,
    - dodano branding EstateFlow na publicznej stronie, jeśli backend zwraca `estateflowBrandingEnabled`.
  - Uwagi / follow-up:
    - F3.4 powinno dodać w panelu agenta link do tej strony, publish toggle, podgląd i kopiowanie URL,
    - F4.2 zastąpi tymczasowe CTA pełnym formularzem leadowym,
    - F3.6 powinno dodać pomiar publicznych odsłon i share/copy link.

- [x] `F3.4` Dodać ustawienia publikacji w panelu agenta
  - Zakres: publish toggle, podgląd, kopiowanie linku, QR placeholder.
  - Data zakończenia: 2026-04-29
  - Wykonano:
    - dodano panel publikacji w szczegółach i edycji oferty w panelu agenta,
    - panel obsługuje publish/unpublish, status publikacji, podgląd publicznej strony i kopiowanie publicznego URL,
    - dodano formularz ustawień publicznych: publiczny tytuł/opis, SEO title/description, share image oraz przełączniki widoczności ceny i dokładnego adresu,
    - dodano placeholder QR dla przyszłego generowania kodów do materiałów offline,
    - dodano osobny frontendowy helper zapisu ustawień publicznych, który pozwala świadomie wyczyścić pola tekstowe.
  - Uwagi / follow-up:
    - F3.6 powinno dopiąć event copy/share oraz public page view,
    - przyszłe plany płatne mogą dodać manualne sterowanie brandingiem EstateFlow w tym panelu.

- [x] `F3.5` Dodać SEO basics dla publicznych ofert
  - Zakres: meta tags, open graph, indeksowalność, sitemap strategy.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - rozszerzono metadata publicznej oferty o canonical URL, robots directives, Open Graph, Twitter card, locale oraz daty publikacji/aktualizacji,
    - dodano JSON-LD `RealEstateListing` z ofertą, adresem, ceną, zdjęciami i agentem,
    - dodano `robots.txt` z blokadą panelu, auth i API oraz linkiem do sitemap,
    - dodano dynamiczny `sitemap.xml`, który pobiera opublikowane slugi z publicznego endpointu API,
    - dodano publiczny endpoint `GET /api/listings/public` zwracający minimalne wpisy sitemapowe,
    - strona `/oferty` bez sluga jest oznaczona jako `noindex`.
  - Uwagi / follow-up:
    - produkcyjnie należy ustawić `NEXT_PUBLIC_SITE_URL` / `SITE_URL`, żeby canonical i sitemap wskazywały domenę produkcyjną,
    - jeśli publicznych ofert będzie dużo, endpoint sitemapowy warto podzielić na paginowane sitemapy.

- [x] `F3.6` Dodać analitykę odsłon i share'ów
  - Zakres: page views, copy link, share intent, source tagging.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - dodano eventy `public_listing_viewed`, `public_listing_share_clicked` i `public_listing_link_copied`,
    - dodano publiczny endpoint `POST /api/analytics/public-listings/:slug/events`, który przypisuje anonimowe eventy do właściciela oferty po `publicSlug`,
    - publiczna strona oferty wysyła event odsłony oraz obsługuje przyciski udostępniania i kopiowania linku,
    - kopiowanie publicznego URL w panelu agenta wysyła event z `source = agent_publication_panel`,
    - eventy zawierają `listingId`, `publicSlug`, ścieżkę oraz podstawowe oznaczenie źródła/referrera.
  - Uwagi / follow-up:
    - dashboard metryk w Sprincie 7 powinien agregować te eventy po `agencyId`, `agentId`, `listingId` i `source`,
    - po dodaniu formularza leadowego w Sprincie 4 należy dopiąć `public_lead_submitted`.

#### Definition of Done

- użytkownik publikuje ofertę z CRM do publicznego linku,
- publiczna karta jest czytelna i gotowa do udostępniania,
- mamy podstawy SEO i pomiar ruchu.

#### Log sprintu

- Status sprintu:
- Data zamknięcia:
- Co dowieźliśmy:
- Decyzje:
- Otwarte tematy:

---

### Sprint 4 — Lead form i przejęcie leadów do CRM

**Cel sprintu:**
Zamienić publiczną stronę oferty w kanał pozyskiwania leadów.

**Rezultat sprintu:**
Publiczna oferta generuje leady, które trafiają do systemu i mogą być obsługiwane przez użytkownika freemium.

#### Zadania

- [x] `F4.1` Zdefiniować model publicznego leada
  - Zakres: źródło, zgoda kontaktowa, powiązanie z ofertą, status obsługi.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - dodano enumy `PublicLeadSource` i `PublicLeadStatus`,
    - dodano encję `PublicLead` z danymi kontaktowymi, wiadomością, źródłem, UTM/referrerem, zgodą kontaktową/marketingową, metadanymi technicznymi i statusem obsługi,
    - powiązano publicznego leada z ofertą, agentem, agencją oraz opcjonalnym klientem po konwersji,
    - dodano indeksy pod listę leadów, filtrowanie po ofercie/agencie/agencji/statusie i przyszłe raporty konwersji,
    - dodano `PublicLeadsModule` jako fundament pod endpoint submit, widok public inquiries i konwersję do klienta,
    - dodano migrację produkcyjną `20260430_public_leads.sql`.
  - Uwagi / follow-up:
    - F4.2 powinno dodać DTO i publiczny endpoint zapisu formularza z walidacją oraz ochroną antyspamową,
    - F4.3 powinno obsłużyć deduplikację i konwersję `PublicLead` do `Client`.

- [x] `F4.2` Dodać formularz kontaktowy na publicznej ofercie
  - Zakres: pola, walidacja, zgody, ochrona antyspamowa.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - dodano publiczny endpoint `POST /api/public-leads/listings/:slug` zapisujący zapytania dla opublikowanych ofert,
    - dodano DTO i walidację formularza po stronie API oraz web, w tym wymóg maila lub telefonu i zgody kontaktowej,
    - dodano podstawową ochronę antyspamową: honeypot, minimalny czas wypełniania formularza, snapshot adresu URL/referrera/UTM i hash IP,
    - dodano komponent formularza kontaktowego na publicznej stronie oferty z obsługą stanu wysyłania, błędów i potwierdzenia,
    - podpięto event `public_lead_submitted` po udanym wysłaniu formularza.
  - Uwagi / follow-up:
    - F4.3 powinno przekonwertować `PublicLead` do CRM z deduplikacją po mailu/telefonie,
    - F4.4 powinno dodać powiadomienia dla agenta po nowym leadzie.

- [x] `F4.3` Zapisać lead do CRM i powiązać z ofertą
  - Zakres: tworzenie klienta/leada, historia źródła, deduplikacja podstawowa.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - po wysłaniu publicznego formularza lead jest automatycznie konwertowany do klienta CRM,
    - dodano deduplikację po emailu oraz telefonie z tolerancją prefiksu kraju,
    - istniejący klient jest uzupełniany brakującym kontaktem i powiązany przez `converted_client_id`,
    - nowy klient dostaje źródło `website`, notatkę początkową i notatkę źródłową z ofertą publiczną,
    - publiczny lead dostaje status `converted_to_client`, `convertedAt`, `handledAt` i metadane konwersji,
    - dodano wpisy activity history dla utworzenia klienta albo powiązania z istniejącym klientem.
  - Uwagi / follow-up:
    - F4.4 powinno dodać powiadomienie dla agenta o nowym leadzie / kliencie z formularza,
    - F4.5 powinno pokazać publiczne zapytania i ich statusy w panelu.

- [x] `F4.4` Dodać powiadomienia o nowym leadzie
  - Zakres: in-app, email lub minimalne powiadomienie systemowe.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - dodano kategorię powiadomień `public_lead` dla zapytań z publicznych ofert,
    - backend pokazuje świeże publiczne leady w istniejącym endpointcie `GET /api/notifications`,
    - powiadomienie prowadzi do skonwertowanego klienta CRM, jeśli lead ma `converted_client_id`,
    - nowe powiadomienie ma wyższy priorytet niż ogólne powiadomienie o nowym kliencie,
    - dropdown powiadomień dostał dedykowaną ikonę dla leadów z formularzy publicznych.
  - Uwagi / follow-up:
    - F4.5 powinno dodać osobny widok publicznych zapytań, bo obecnie powiadomienie prowadzi do klienta CRM,
    - email / push można dodać później nad tym samym źródłem danych, jeśli będzie potrzebny kanał poza aplikacją.

- [x] `F4.5` Dodać podstawowy widok lead source / public inquiries
  - Zakres: lista leadów z publicznych ofert, filtrowanie po ofercie.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - dodano chroniony endpoint `GET /api/public-leads` z paginacją i filtrami `status`, `source`, `listingId`, `search`,
    - endpoint zwraca bezpieczny model listy bez danych technicznych typu hash IP / user-agent,
    - dodano widok `/dashboard/inquiries` z listą publicznych zapytań, filtrami, statusami, źródłami i linkiem do klienta CRM,
    - dodano link do publicznej oferty oraz informację o zgodzie marketingowej, UTM i wiadomości z formularza,
    - dodano pozycję `Zapytania` w sidebarze dashboardu.
  - Uwagi / follow-up:
    - F4.6 powinno dopiąć eventy lejka dla przejść visit → submit lead → lead accepted,
    - później można dodać akcje zmiany statusu publicznego zapytania bezpośrednio z widoku listy.

- [x] `F4.6` Dodać eventy mierzące conversion funnel oferty
  - Zakres: visit → submit lead → lead accepted.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - ustandaryzowano eventy lejka przez właściwość `funnelStage`: `visit`, `submit`, `accepted`,
    - wzbogacono `public_listing_viewed` o `listingId` i `publicSlug`,
    - wzbogacono `public_lead_submitted` o `publicLeadId`, `convertedClientId`, typ konwersji, status leada, metodę kontaktu, UTM i czas wypełniania formularza,
    - dodano backendowy event `public_lead_accepted` zapisywany po konwersji publicznego leada do klienta CRM,
    - event `public_lead_accepted` zawiera powiązania `listingId`, `publicSlug`, `publicLeadId`, `clientId`, typ konwersji i zgody.
  - Uwagi / follow-up:
    - raport konwersji ofert może teraz liczyć funnel z eventów `public_listing_viewed` → `public_lead_submitted` → `public_lead_accepted`,
    - w kolejnych sprintach można dodać dashboard metryk dla publicznych ofert na bazie `analytics_events`.

#### Definition of Done

- publiczna oferta generuje lead,
- lead trafia do CRM,
- użytkownik jest informowany o nowym kontakcie,
- można mierzyć podstawową konwersję.

#### Log sprintu

- Status sprintu:
- Data zamknięcia:
- Co dowieźliśmy:
- Decyzje:
- Otwarte tematy:

---

### Sprint 5 — Publiczne dodanie oferty bez konta + claim listing

**Cel sprintu:**
Uruchomić najmocniejszy acquisition loop: publiczne dodanie oferty bez pełnego wejścia do CRM, a następnie przejęcie jej do konta.

**Rezultat sprintu:**
Użytkownik może dodać ofertę bez konta, opublikować ją, a następnie po rejestracji przypisać do swojego workspace.

#### Zadania

- [x] `F5.1` Zaprojektować uproszczony publiczny wizard dodania oferty
  - Zakres: minimalny zestaw pól, upload zdjęć, dane kontaktowe, UX mobile-first.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - dodano dokument projektowy `docs/PUBLIC_LISTING_SUBMISSION_WIZARD.md`,
    - ustalono publiczny entry point `/dodaj-oferte`,
    - zaprojektowano 5 kroków wizardu: podstawy, parametry, zdjęcia, kontakt i zgody, podsumowanie,
    - zdefiniowano minimalne pola, walidację, zasady uploadu zdjęć i mobile-first UX,
    - zdefiniowano rekomendowany model `PublicListingSubmission` pod F5.2,
    - opisano kontrakty API, flow email verification, claim listing, antyspam, moderation guardrails i eventy.
  - Uwagi / follow-up:
    - F5.2 powinno wdrożyć osobną encję publicznego submission zamiast tworzyć `Listing` od razu,
    - decyzja do F5.2: czy verified submission może publikować ofertę przed claimem, czy bezpiecznie publikujemy dopiero po claimie.

- [x] `F5.2` Dodać model publicznego draftu / submission
  - Zakres: statusy, token weryfikacyjny, źródło, wersja przed claimem.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - dodano enumy `PublicListingSubmissionStatus` i `PublicListingSubmissionSource`,
    - dodano encję `PublicListingSubmission` jako osobny model publicznego draftu przed claimem,
    - model przechowuje statusy, źródło, hashe tokenów verification/claim, dane kontaktowe, zgody, metadane techniczne i snapshot `payload`,
    - dodano opcjonalne powiązania do opublikowanej oferty oraz przyszłego claimu przez agenta/agencję,
    - dodano `PublicListingSubmissionsModule` i rejestrację modułu w API,
    - dodano migrację produkcyjną `20260430_public_listing_submissions.sql`.
  - Uwagi / follow-up:
    - F5.3 powinno generować i obsłużyć `verificationTokenHash` oraz `verificationExpiresAt`,
    - F5.4 powinno użyć `claimTokenHash`, `claimedAgentId`, `claimedAgencyId` i `claimedAt` do przejęcia oferty,
    - zgodnie z decyzją MVP bezpieczniejsze jest publikowanie oferty dopiero po claimie, a nie od razu po samym verified submission.

- [x] `F5.3` Dodać email verification dla publicznego submitu
  - Zakres: link weryfikacyjny, czas życia tokenu, retry.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - dodano publiczny endpoint `POST /api/public-listing-submissions` tworzący submission w statusie `pending_email_verification`,
    - generowany jest losowy token weryfikacyjny, a w bazie zapisywany jest tylko hash SHA-256 oraz `verificationExpiresAt`,
    - dodano publiczny endpoint `POST /api/public-listing-submissions/verify` oznaczający submission jako `verified` i czyszczący hash tokenu,
    - dodano publiczny endpoint `POST /api/public-listing-submissions/:id/resend-verification` z cooldownem i limitem ponownych wysyłek,
    - dodano `EmailService` z log-providerem dla developmentu i gotowym miejscem pod realny SMTP/Resend/SES,
    - dodano migrację `20260430_public_listing_submission_verification.sql` dla metadanych wysyłki verification email.
  - Uwagi / follow-up:
    - przed produkcją trzeba podpiąć realnego providera email przez `EmailService`,
    - F5.4 powinno wykorzystać verified submission do claim flow i utworzenia/przypięcia oferty do workspace.

- [x] `F5.4` Dodać mechanizm claim listing do konta
  - Zakres: przypięcie oferty do workspace po rejestracji lub logowaniu, audit log.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - endpoint `POST /api/public-listing-submissions/verify` zwraca jednorazowy `claimToken`, a w bazie przechowywany jest tylko jego hash SHA-256,
    - dodano chroniony endpoint `POST /api/public-listing-submissions/claim`, który przypina verified submission do zalogowanego konta agenta,
    - claim tworzy ofertę CRM z danymi listing/address/images z publicznego submission, publikuje ją i nadaje unikalny `publicSlug`,
    - mechanizm respektuje limit aktywnych ofert z planu agencji przed utworzeniem nowej oferty,
    - po claimie submission przechodzi w status `claimed`, zapisuje `publishedListingId`, `claimedAgentId`, `claimedAgencyId`, `claimedAt` i czyści `claimTokenHash`,
    - dodano audit log `ActivityAction.CLAIMED` oraz migrację `20260430_public_listing_submission_claim.sql` dla enumu activity.
  - Uwagi / follow-up:
    - F5.5 powinno dobudować UI/CTA po claimie: przejście do nowo utworzonej oferty, onboarding i sugestie kolejnych kroków w CRM.

- [x] `F5.5` Dodać flow „przejmij ofertę i zacznij używać CRM"
  - Zakres: CTA po claimie, onboarding kontynuacyjny, sugestie kolejnych kroków.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - dodano publiczną stronę `/dodaj-oferte/potwierdzono?token=...`, która weryfikuje email submission i pokazuje CTA do rejestracji albo logowania,
    - formularze `/register` i `/login` obsługują `claimToken`, zachowują kontekst między auth screenami i po auth przekierowują do claim flow,
    - dodano chronioną stronę `/dashboard/claim-listing?claimToken=...`, która automatycznie wykonuje claim, pokazuje status, obsługuje błędy i prowadzi do nowej oferty w CRM,
    - dodano frontendową warstwę API dla verification/claim oraz eventy `public_listing_claim_started` i `public_listing_claim_completed`,
    - rozszerzono whitelistę analytics API o eventy claim flow.
  - Uwagi / follow-up:
    - pełny publiczny wizard `/dodaj-oferte` nadal powinien zostać dobudowany w kolejnych krokach UI, bo F5.5 domyka głównie ścieżkę po kliknięciu linku z emaila.

- [x] `F5.6` Dodać mechanizmy antyspamowe i nadużyciowe
  - Zakres: rate limiting, CAPTCHA, heurystyki, report abuse.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - dodano wspólną warstwę `abuse-protection` dla publicznych formularzy: honeypot, timing guard, hash IP, normalizacja fingerprintów kontaktowych i heurystyki treści,
    - publiczne submissiony ofert mają limity per hash IP, per email i per telefon oraz zapisują w `metadata.abuse` `riskScore` i listę sygnałów,
    - resend verification ma dodatkowy limit per hash IP oprócz cooldownu i limitu per submission,
    - formularze publicznych leadów mają limity per hash IP, per oferta + hash IP oraz per kontakt,
    - dodano twardą blokadę nadmiernej liczby linków w publicznym submission i publicznym leadzie,
    - dopięto precyzyjne throttle na publiczne endpointy submit / resend / verify / lead submit / public analytics,
    - dodano event `public_listing_abuse_reported` jako backendowy fundament pod report abuse z publicznej strony oferty.
  - Uwagi / follow-up:
    - CAPTCHA pozostaje jako opcjonalny provider do podpięcia przy realnym ruchu albo wzroście false-negative,
    - F5.7 powinno wykorzystać `metadata.abuse` do soft moderation / review queue,
    - UI przycisku „zgłoś nadużycie” na publicznej ofercie może zostać dodane osobno, bo API/event jest już gotowy.

- [x] `F5.7` Dodać podstawową moderację publicznych ofert
  - Zakres: reguły walidacji, soft moderation, kolejka do review jeśli potrzebna.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - dodano wspólną warstwę `public-listing-moderation` oceniającą ryzyko publikacji na podstawie sygnałów antyspamowych, treści, zdjęć i ceny za m²,
    - claim publicznego submissionu uruchamia moderację przed publikacją,
    - submission wymagający review nadal trafia do CRM, ale jako oferta `draft` bez `publicSlug`, bez `publishedAt` i z `publicationStatus = draft`,
    - wynik claim flow zwraca `reviewRequired` oraz `moderationReasons`, aby UI mogło pokazać właściwy stan kontynuacji,
    - `metadata.moderation` zapisuje `riskScore`, powody, datę oceny i flagę review,
    - publish z panelu agenta blokuje publikację oferty, jeśli aktualne dane nadal nie przechodzą podstawowej moderacji,
    - ekran `/dashboard/claim-listing` pokazuje osobny stan dla ofert przejętych jako szkic do sprawdzenia.
  - Uwagi / follow-up:
    - kolejka review dla admina/moderatora może zostać dodana później jako osobny widok operacyjny,
    - obecny MVP zakłada self-service: agent poprawia szkic i ponownie publikuje z panelu oferty.

#### Definition of Done

- użytkownik bez konta może opublikować ofertę,
- oferta jest weryfikowana i bezpieczna,
- po założeniu konta można ją przejąć do CRM,
- mamy kontrolę nad spamem i nadużyciami.

#### Log sprintu

- Status sprintu:
- Data zamknięcia:
- Co dowieźliśmy:
- Decyzje:
- Otwarte tematy:

---

### Sprint 6 — Publiczny profil agenta i lekkie growth loops

**Cel sprintu:**
Wzmocnić dystrybucję i retencję przez publiczne elementy profilu i udostępniania.

**Rezultat sprintu:**
Użytkownik dostaje dodatkowe darmowe narzędzia promocyjne zwiększające wartość produktu.

#### Zadania

- [x] `F6.1` Dodać publiczny profil agenta / biura
  - Zakres: podstawowe dane, avatar/logo, aktywne oferty, formularz kontaktowy.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - dodano publiczny endpoint profilu agenta `GET /api/listings/public-agents/:agentId`, który zwraca podstawowe dane agenta, kontekst biura oraz opublikowane aktywne oferty,
    - publiczna oferta pokazuje link do profilu opiekuna, jeśli backend zwraca `agent.id`,
    - dodano publiczną stronę `/agenci/[id]` z avatar/logo, bio, nazwą biura, listą ofert, SEO metadata i JSON-LD,
    - dodano formularz kontaktowy profilu oraz endpoint `POST /api/public-leads/agents/:agentId`, który tworzy publicznego leada i konwertuje go do klienta CRM,
    - rozszerzono źródła publicznych leadów o `public_profile` oraz dodano migrację produkcyjną dla wartości enum.
  - Uwagi / follow-up:
    - obecny MVP używa stabilnego `agentId` w URL; później warto dodać publiczne slugi profili i panel ustawień widoczności profilu,
    - profil biura jest na razie reprezentowany jako kontekst agencji w profilu agenta; rozbudowany profil biura zostaje w scope `P13`.

- [x] `F6.2` Dodać QR i szybkie udostępnianie oferty
  - Zakres: generowanie QR, copy/share actions, gotowy asset do druku.
  - Data zakończenia: 2026-04-30
  - Wykonano:
    - dodano bibliotekę `qrcode` oraz współdzielony komponent generowania kodu QR dla publicznego URL oferty,
    - publiczna oferta pokazuje szybkie akcje `Udostępnij`, `Kopiuj link` oraz kod QR z możliwością pobrania gotowego assetu PNG do druku,
    - panel publikacji agenta dostał natywne udostępnianie, kopiowanie linku oraz generowany QR zamiast placeholdera,
    - pobranie QR zapisuje event `public_listing_share_clicked` z metodą `qr_download`, osobno dla publicznej strony i panelu agenta.
  - Uwagi / follow-up:
    - później można dodać gotowy wariant PDF/A4 oraz możliwość personalizacji assetu po stronie premium brandingu.

- [x] `F6.3` Dodać generator opisu oferty / quality hints
  - Zakres: prosty AI helper lub rule-based assist dla darmowego planu z limitem użyć.
  - Data zakończenia: 2026-05-01
  - Wykonano:
    - dodano rule-based generator opisu oferty działający lokalnie w formularzu tworzenia / edycji oferty,
    - generator buduje opis z faktycznie wpisanych pól: typ transakcji, typ nieruchomości, lokalizacja, metraż, pokoje, piętro, rok budowy i cena,
    - dodano quality hints z oceną `0-100`, które wskazują brakujący tytuł, opis, metraż, powierzchnię działki, pokoje, dzielnicę albo rok budowy,
    - wprowadzono miękki miesięczny limit użyć helpera po stronie przeglądarki, bez kosztów i bez integracji z zewnętrznym AI.
  - Uwagi / follow-up:
    - później można przenieść limit na backend, jeśli generator stanie się kosztowym AI endpointem,
    - wariant premium może dodać tone-of-voice biura, wersje językowe i generator SEO/publicznego opisu.

- [x] `F6.4` Dodać podstawowy widget lead form / embeddable link
  - Zakres: prosty osadzalny formularz lub hosted form entry point.
  - Data zakończenia: 2026-05-01
  - Wykonano:
    - dodano publiczny hosted formularz leada pod `/formularz/oferty/[slug]`, działający bez logowania i oparty o istniejący endpoint publicznych leadów,
    - formularz embed używa źródła `embed`, zachowuje antyspamowe pola formularza, zgody, UTM-y i event `public_lead_submitted`,
    - panel publikacji oferty dostał sekcję `Widget lead form` z bezpośrednim linkiem oraz gotowym kodem iframe do skopiowania,
    - kopiowanie kodu osadzenia zapisuje event produktowy z informacją, że skopiowano `lead_form_embed_code`.
  - Uwagi / follow-up:
    - później można dodać konfigurację kolorów / wysokości iframe i osobny embed script zamiast samego iframe,
    - obecny widget jest powiązany z konkretną opublikowaną ofertą; ogólny widget biura może wejść w scope rozbudowanych profili.

- [x] `F6.5` Zdefiniować miejsca premium upsell dla growth features
  - Zakres: custom branding, większe limity, lepsze profile, automatyzacje.
  - Data zakończenia: 2026-05-01
  - Wykonano:
    - zdefiniowano współdzieloną konfigurację premium growth upselli: własny branding, profile pro, personalizowane widgety, automatyzacje i większe limity,
    - dodano reusable kartę upsell z eventem `upgrade_cta_clicked`, aby kliknięcia w premium entry pointy były mierzalne,
    - panel publikacji oferty pokazuje kontekstowe premium entry pointy po publikacji/share/widget flow,
    - ekran `Plan i limity` dostał sekcję `Growth upgrade paths`, która zbiera wszystkie miejsca monetyzacji funkcji growth.
  - Uwagi / follow-up:
    - CTA prowadzą na razie do ekranu planu; po wdrożeniu billing/pricing należy podpiąć właściwy checkout lub kontakt sprzedażowy,
    - przyszłe entitlementy mogą rozdzielić `customBranding`, `profilePro`, `embedCustomization`, `growthAutomations` i `higherLimits` na osobne flagi backendowe.

#### Definition of Done

- są dodatkowe darmowe funkcje promujące produkt,
- publiczny profil i sharing zwiększają ekspozycję,
- funkcje growth mają gotowe ścieżki do monetyzacji.

#### Log sprintu

- Status sprintu:
- Data zamknięcia:
- Co dowieźliśmy:
- Decyzje:
- Otwarte tematy:

---

### Sprint 6.5 — Audyt luk przed release readiness

**Cel sprintu:**
Domknąć elementy, które są częścią realnego core flow, a nie powinny zostać odkryte dopiero w Sprincie 7.

**Rezultat sprintu:**
Sprint 7 zaczyna się jako release readiness, a nie jako ratowanie braków produktowych.

#### Dlaczego dodajemy ten bufor

Po analizie aplikacji przed Sprintem 7 widać, że część fundamentów freemium jest gotowa, ale kilka miejsc wymaga domknięcia:

- zdjęcia ofert istnieją w modelu i publicznym renderze, ale brakuje pełnego upload/manage flow,
- publiczny submission backendowo obsługuje obrazy, ale nie ma publicznego wizardu `/dodaj-oferte`,
- abuse/moderation działa regułowo, ale brakuje widocznej ścieżki operacyjnej,
- upselle są zdefiniowane, ale brakuje realnego pricing/upgrade destination,
- eventy istnieją, ale brakuje dashboardu lub raportu do oceny release'u.

#### Zadania

- [x] `F6.5.1` Dodać zdjęcia oferty end-to-end
  - Zakres: upload, storage, galeria, ustawianie zdjęcia głównego, sortowanie, usuwanie, limit zdjęć per plan.
  - Minimalny zakres MVP:
    - agent może dodać zdjęcia w tworzeniu / edycji oferty,
    - agent może usunąć zdjęcie,
    - agent może ustawić zdjęcie główne,
    - publiczna oferta używa zdjęcia głównego jako hero,
    - galeria publiczna pokazuje pozostałe zdjęcia,
    - backend egzekwuje limit `imagesPerListing`,
    - API waliduje typ pliku, rozmiar i liczbę zdjęć,
    - `shareImageUrl` domyślnie wynika z pierwszego / głównego zdjęcia, jeśli użytkownik nie podał własnego URL.
  - Decyzje techniczne:
    - wybrać storage dla plików w MVP,
    - zdecydować, czy upload idzie przez backend, signed URL, czy adapter storage,
    - zdecydować, czy w planie free pozwalamy tylko na obrazy zoptymalizowane po stronie serwera.
  - Data zakończenia: 2026-05-01
  - Wykonano:
    - dodano endpointy backendowe do uploadu, aktualizacji alt text, ustawiania zdjęcia głównego, sortowania i usuwania zdjęć oferty,
    - API zapisuje pliki w lokalnym storage `uploads/listings`, serwuje je publicznie przez `/uploads` i zwraca pełne publiczne URL-e obrazów,
    - backend egzekwuje limit `imagesPerListing`, waliduje format `jpg/png/webp`, limit 10 MB na plik i maksymalnie 15 plików w jednym uploadzie,
    - pierwsze dodane zdjęcie automatycznie staje się zdjęciem głównym oraz domyślnym `shareImageUrl`,
    - usunięcie zdjęcia głównego wybiera kolejne zdjęcie z galerii i aktualizuje `shareImageUrl`, jeśli wskazywał na usunięty plik,
    - dodano komponent `ListingImageManager` w edycji oferty z uploadem wielu zdjęć, ustawianiem zdjęcia głównego, zmianą kolejności, edycją opisu i usuwaniem,
    - publiczna strona oferty korzysta z istniejącego renderu hero/galerii na podstawie uzupełnionych `ListingImage`.
  - Uwagi / follow-up:
    - obecny storage jest lokalny i dobry dla MVP/dev; przed produkcją warto podmienić adapter na S3/R2 albo signed URLs,
    - publiczny wizard `/dodaj-oferte` nadal wymaga spięcia z tym samym mechanizmem uploadu w `F6.5.2`,
    - tworzenie oferty nadal zapisuje najpierw dane podstawowe, a zdjęcia dodaje się po zapisie w ekranie edycji.

- [x] `F6.5.2` Domknąć publiczny wizard `/dodaj-oferte` albo wyłączyć go z MVP
  - Zakres: publiczny entry point dodania oferty bez konta.
  - Minimalny zakres MVP, jeśli zostaje w release:
    - strona `/dodaj-oferte`,
    - kroki: podstawy, parametry, zdjęcia, kontakt i zgody, podsumowanie,
    - draft w `localStorage`,
    - submit do `POST /api/public-listing-submissions`,
    - ekran “sprawdź email” po wysyłce,
    - obsługa walidacji, honeypot/timing i błędów rate limitu,
    - zdjęcia spięte z tym samym mechanizmem uploadu co CRM.
  - Alternatywa:
    - jeśli wizard wychodzi poza release, ukryć publiczny entry point i oznaczyć flow jako post-MVP.
  - Data zakończenia: 2026-05-02
  - Wykonano:
    - dodano publiczną stronę `/dodaj-oferte` z pięciokrokowym wizardem: podstawy, parametry, zdjęcia, kontakt i zgody, podsumowanie,
    - wizard zapisuje draft w `localStorage`, waliduje dane per krok i wysyła finalny payload do `POST /api/public-listing-submissions`,
    - dodano publiczny upload zdjęć dla submissionów pod `POST /api/public-listing-submissions/images`, z tym samym lokalnym storage `/uploads`, walidacją `jpg/png/webp`, limitem 10 MB i maksymalnie 15 zdjęciami,
    - zdjęcia dodane w wizardzie trafiają do payloadu submissionu jako URL-e i po claimie są przenoszone do `ListingImage`,
    - dodano ekran `/dodaj-oferte/sprawdz-email` po wysyłce zgłoszenia,
    - wizard obsługuje honeypot `website`, `formStartedAt`, zgody, UTM-y, referrer i błędy API / rate limitu.
  - Uwagi / follow-up:
    - publiczne zdjęcia submissionów są zapisywane lokalnie w `uploads/public-submissions`; przed produkcją warto podmienić storage na S3/R2 i dodać cleanup nieprzejętych plików,
    - obecny wizard nie ma jeszcze resend verification na ekranie “sprawdź email”; backendowy endpoint istnieje i można dopiąć go osobnym zadaniem,
    - legal copy jest robocze i powinno zostać domknięte w `F6.5.4`.

- [x] `F6.5.3` Dodać widoczny abuse report flow
  - Zakres: zgłaszanie nadużyć na publicznych stronach i minimalna obsługa operacyjna.
  - Minimalny zakres MVP:
    - link/przycisk “Zgłoś nadużycie” na publicznej ofercie,
    - formularz z powodem zgłoszenia,
    - event/log zgłoszenia z `publicSlug`, `listingId`, powodem i timestampem,
    - instrukcja operacyjna, jak zespół ręcznie reaguje na zgłoszenie.
  - Poza MVP:
    - pełny panel moderation queue,
    - automatyczne zdejmowanie ofert po wielu zgłoszeniach.
  - Data zakończenia: 2026-05-02
  - Wykonano:
    - dodano widoczny komponent `PublicListingAbuseReport` na publicznej stronie oferty,
    - formularz pozwala wybrać powód zgłoszenia, dodać szczegóły i pokazuje stan sukcesu po wysyłce,
    - zgłoszenie zapisuje publiczny event `public_listing_abuse_reported` przez istniejący endpoint public analytics,
    - event zawiera `listingId`, `publicSlug`, tytuł oferty, powód, szczegóły, ścieżkę oraz referrer,
    - UI pokazuje użytkownikowi, że zgłoszenie trafia do logu operacyjnego EstateFlow.
  - Uwagi / follow-up:
    - obecny MVP opiera się na logu `analytics_events` i ręcznej reakcji operacyjnej,
    - pełny panel moderation queue oraz automatyczne zdejmowanie ofert pozostają poza MVP,
    - procedura operacyjna powinna minimum raz dziennie filtrować `public_listing_abuse_reported` i ręcznie weryfikować zgłoszone oferty.

- [x] `F6.5.4` Domknąć legal copy i zgody w publicznych formularzach
  - Zakres: publiczne leady, publiczny wizard, zdjęcia, claim listing.
  - Minimalny zakres MVP:
    - link do regulaminu publikacji ofert,
    - link do polityki prywatności,
    - zgoda na kontakt i przetwarzanie danych w publicznych formularzach,
    - oświadczenie o prawach do zdjęć w wizardzie,
    - informacja o administratorze danych,
    - procedura usunięcia publicznej oferty / danych.
  - Data zakończenia: 2026-05-02
  - Wykonano:
    - dodano publiczne strony `/regulamin`, `/polityka-prywatnosci` i `/zasady-publikacji` jako robocze dokumenty MVP,
    - zaktualizowano linki prawne w stopce marketingowej,
    - dodano współdzielone stałe `LEGAL_LINKS` i `LEGAL_COPY`, żeby formularze używały spójnych tekstów zgód,
    - publiczny formularz oferty i formularz profilu agenta pokazują cel przetwarzania danych, rolę agenta/biura jako administratora oraz link do polityki prywatności,
    - wizard `/dodaj-oferte` pokazuje osobne zgody na kontakt/przetwarzanie danych oraz akceptację regulaminu i zasad publikacji ofert,
    - payload publicznego submissionu zapisuje pełniejszy `consentText` z aktualną treścią zgód.
  - Uwagi / follow-up:
    - dokumenty są roboczą wersją produktową MVP i powinny zostać zweryfikowane przez prawnika przed publicznym launch’em,
    - przed produkcją warto uzupełnić dane administratora, kanał kontaktu, retencję danych i formalne podstawy przetwarzania,
    - jeśli EstateFlow ma działać jako procesor dla biur, trzeba dopiąć osobną umowę powierzenia / DPA poza tym MVP.

- [x] `F6.5.5` Przygotować minimalny dashboard / raport metryk freemium
  - Zakres: widok lub raport bazujący na `analytics_events` i usage.
  - Minimalny zakres MVP:
    - first listing created,
    - first listing published,
    - public listing viewed,
    - public link copied/shared,
    - public lead submitted,
    - claim started/completed,
    - limit warning/reached,
    - upgrade CTA clicked.
  - Data zakończenia: 2026-05-02
  - Wykonano:
    - dodano endpoint `GET /api/reports/freemium-metrics`, który agreguje `analytics_events` w serwerowo wymuszonym scope agenta/zespołu,
    - raport zwraca liczniki eventów: utworzenie/publikacja oferty, odsłony publiczne, kopiowanie/udostępnianie linku, publiczny lead, claim, limity i kliknięcia upgrade CTA,
    - dodano podstawowe współczynniki MVP: publish rate, lead capture rate i claim completion rate,
    - dodano timeline freemium zgodny ze wspólnym filtrem dat i grupowaniem raportów,
    - dodano breakdown `upgrade_cta_clicked` po `upsellId` i `source`, żeby widzieć pierwszą intencję upgrade,
    - dodano sekcję `Freemium growth` na `/dashboard/reports` z kartami KPI, trendem, licznikami eventów i notatkami interpretacyjnymi.
  - Uwagi / follow-up:
    - raport jest minimalnym dashboardem operacyjnym, nie pełną analityką kohortową ani atrybucją marketingową,
    - jakość metryk zależy od kompletności instrumentacji eventów w publicznych ofertach, limitach i kartach upsell,
    - w kolejnych iteracjach warto dodać eksport, globalny widok admina i retencję/cohorty dla aktywacji freemium.

- [x] `F6.5.6` Doprecyzować pricing / upgrade destination
  - Zakres: co dzieje się po kliknięciu upsella albo dobiciu do limitu.
  - Minimalny zakres MVP:
    - ekran planów albo formularz zainteresowania wyższym planem,
    - jasny komunikat dla `upgrade_cta_clicked`,
    - zapis intentu w analityce,
    - spójny tekst dla limitów ofert, klientów, spotkań i zdjęć.
  - Data zakończenia: 2026-05-02
  - Wykonano:
    - dodano dedykowany ekran `/dashboard/upgrade` jako MVP destination dla kliknięć upsell i limitów,
    - ekran pokazuje kierunki planów Starter, Professional i Enterprise oraz formularz zainteresowania upgrade bez uruchamiania pełnego checkoutu,
    - `GrowthUpsellCard` prowadzi teraz do `/dashboard/upgrade` z `source`, `upsellId` i rekomendowanym planem w query params,
    - zapis intentu pozostaje w `analytics_events` jako `upgrade_cta_clicked`, z dodatkowymi właściwościami: źródło, upsell, zasób limitu, wybrany plan i akcja,
    - warningi/hard limity w formularzach ofert, klientów, spotkań oraz managerze zdjęć dostały spójny CTA `Zobacz plany`,
    - placeholder w `Plan i limity` został zastąpiony linkiem do realnego MVP flow upgrade.
  - Uwagi / follow-up:
    - to nadal nie jest billing ani checkout self-service; pełny lifecycle płatności zostaje w backlogu `P6-P9`,
    - formularz zainteresowania nie zmienia planu użytkownika automatycznie, tylko zapisuje intencję do ręcznej obsługi,
    - przed produkcyjnym billingiem trzeba dodać backendowy model leadów upgrade albo integrację z płatnościami/CRM sprzedażowym.

- [x] `F6.5.7` Dodać wygodną publiczną galerię zdjęć oferty
  - Zakres: poprawa UX przeglądania zdjęć na `/oferty/[slug]`.
  - Minimalny zakres MVP:
    - lightbox / pełnoekranowy viewer na publicznej stronie oferty,
    - miniatury i licznik `aktualne / wszystkie`,
    - nawigacja poprzednie/następne,
    - obsługa klawiatury `Escape`, strzałki lewo/prawo,
    - tap-friendly controls na mobile,
    - zachowanie alt text i kolejności zdjęć,
    - analytics event np. `public_listing_gallery_opened` oraz `public_listing_gallery_image_viewed`.
  - Data zakończenia: 2026-05-02
  - Wykonano:
    - dodano klientowy komponent `PublicListingGallery` na publicznej stronie `/oferty/[slug]`,
    - galeria pokazuje pełną uporządkowaną listę zdjęć oferty, włącznie ze zdjęciem głównym,
    - dodano lightbox / pełnoekranowy viewer z licznikiem zdjęć, paskiem miniatur i zamykaniem przez `Escape`,
    - dodano nawigację poprzednie/następne przez przyciski oraz strzałki klawiatury,
    - UI działa jako tap-friendly mosaic + miniatury na mobile i desktopie,
    - dodano eventy `public_listing_gallery_opened` oraz `public_listing_gallery_image_viewed` w public analytics.
  - Uwagi / follow-up:
    - backendowy model zdjęć pozostał bez zmian; komponent bazuje na `ListingImage.url`, `order`, `isPrimary` i `altText`,
    - hero nadal renderuje główne zdjęcie server-side dla SEO/OG, a galeria ładuje pozostałe miniatury leniwie,
    - w przyszłości można dodać swipe gestures, jeśli testy mobilne pokażą taką potrzebę.

#### Audit przed zamknięciem Sprintu 6.5 — publiczne odkrywanie ofert

Po domknięciu zdjęć, publicznego wizardu, abuse/legal i metryk widać, że publiczne oferty są już użyteczne jako pojedyncze landing pages, ale nie są jeszcze wygodnym katalogiem ofert. To ważne rozróżnienie przed wejściem w Sprint 7: obecny zakres pozwala wysłać konkretny link do oferty, natomiast nie pozwala jeszcze użytkownikowi końcowemu komfortowo przeglądać rynku w EstateFlow.

Stan aplikacji po analizie kodu:

- zdjęcia ofert działają end-to-end, ale publiczna galeria na `/oferty/[slug]` jest statyczną siatką obrazów bez lightboxa, pełnego ekranu, klawiatury, przewijania, licznika zdjęć i wygodnego widoku mobilnego,
- publiczne `/oferty` nie jest katalogiem; obecnie pokazuje komunikat o braku identyfikatora oferty i odsyła do pojedynczych URL-i ze slugiem,
- CRM-owa lista `/dashboard/listings` ma podstawowe filtry, wyszukiwanie tekstowe, paginację i sortowanie, ale jest prywatna, agent-scope i nie rozwiązuje publicznego katalogu wszystkich opublikowanych ofert,
- backend ma `GET /api/listings/public`, ale endpoint służy do sitemap/listy slugów, a nie do publicznego wyszukiwania ofert z filtrami, paginacją i wynikami,
- model adresu ma `lat`/`lng`, ale aplikacja nie ma jeszcze mapy, geokodowania, indeksowania zakresu, publicznego filtrowania po bounding box ani UI do zaznaczania obszaru,
- prywatność adresów jest istotna: `showExactAddressOnPublicPage` ukrywa dokładny adres i współrzędne, więc mapa publiczna musi obsłużyć przybliżone lokalizacje albo wykluczyć oferty bez zgody na dokładny punkt.

Decyzja zakresu:

- wygodna galeria zdjęć wchodzi do obecnego Sprintu 6.5 jako `F6.5.7`, bo jest naturalnym domknięciem publicznej strony pojedynczej oferty,
- pełna wyszukiwarka `/oferty` jest osobnym sprintem produktowym, bo wymaga publicznego endpointu, filtrów, kart wyników, paginacji, SEO i decyzji o indeksowaniu,
- mapa ofert jest osobnym sprintem po katalogu, bo wymaga stabilnego kontraktu wyników, współrzędnych, decyzji prywatności adresów i osobnej warstwy UX,
- Sprint 7 nadal powinien pilnować bezpieczeństwa, testów, monitoringu i rollout planu; dokładanie katalogu i mapy do tego samego sprintu zwiększy ryzyko rozlania zakresu.

#### Definition of Done

- zdjęcia ofert działają end-to-end albo zakres release'u jest formalnie ograniczony,
- wiadomo, czy publiczny wizard wchodzi do release'u,
- abuse/legal/analytics mają minimalne działające ścieżki,
- Sprint 7 może skupić się na bezpieczeństwie, testach, monitoringu i rollout planie.

#### Log sprintu

- Status sprintu:
- Data zamknięcia:
- Co dowieźliśmy:
- Decyzje:
- Otwarte tematy:

---

### Sprint 7 — Release readiness, bezpieczeństwo i operacyjny launch

**Cel sprintu:**
Domknąć release freemium pod kątem jakości, bezpieczeństwa, legal i pomiaru.

**Rezultat sprintu:**
Wersja freemium jest gotowa do kontrolowanego udostępnienia użytkownikom.

#### Zadania

- [x] `F7.1` Wykonać przegląd bezpieczeństwa dla funkcji publicznych
  - Zakres: auth boundaries, public endpoints, abuse cases, upload review, rate limit review.
  - Data zakończenia: 2026-05-03
  - Wykonano:
    - przygotowano osobny raport `docs/FREEMIUM_SPRINT_7_SECURITY_REVIEW.md`,
    - przejrzano publiczne endpointy listingów, publicznych submissionów, public leads i public analytics,
    - potwierdzono, że claim listing, listing CRUD, upload CRM i raporty pozostają za auth boundary,
    - dodano `PublicSlugPipe` i podpięto walidację publicznych slugów w public listing, public lead i public analytics endpoints,
    - dodano `ParseUUIDPipe` dla resend verification,
    - dodano magic-bytes validation dla uploadów zdjęć CRM i publicznych submissionów.
  - Uwagi / follow-up:
    - lokalny storage `uploads` jest akceptowalny dla kontrolowanego MVP, ale storage obiektowy powinien być decyzją release checklist,
    - brakuje automatycznego cleanupu nieprzejętych zdjęć publicznych submissionów,
    - abuse moderation pozostaje ręczna i wymaga procedury operacyjnej w rollout checklist,
    - legal copy nadal wymaga review w `F7.2`.

- [x] `F7.2` Domknąć kwestie regulaminowe i prywatności
  - Zakres: zgody, polityka prywatności, zasady publikacji, abuse workflow.
  - Data zakończenia: 2026-05-03
  - Wykonano:
    - przygotowano osobny closeout `docs/FREEMIUM_SPRINT_7_LEGAL_PRIVACY_CLOSEOUT.md`,
    - dodano centralne `LEGAL_META` z wersją dokumentów, datą obowiązywania i kanałami kontaktu legal/support/abuse,
    - dodano centralne opisy retencji `LEGAL_RETENTION`,
    - zaktualizowano politykę prywatności o role administrator/procesor, retencję, usuwanie danych, DPA i kanał kontaktu,
    - zaktualizowano regulamin o kontakt, zgłoszenia, usunięcie danych/oferty i ręczną reakcję na naruszenia,
    - zaktualizowano zasady publikacji o procedurę weryfikacji abuse i usunięcie oferty/danych,
    - widoczny abuse report pokazuje dodatkowy kanał `abuse@estateflow.pl` dla pilnych zgłoszeń.
  - Uwagi / follow-up:
    - dokumenty są produktowo domknięte dla MVP, ale publiczny launch wymaga review prawnika,
    - przed rolloutem trzeba potwierdzić finalnego operatora danych i działające skrzynki legal/support/abuse,
    - jeśli EstateFlow działa jako procesor dla biur, trzeba przygotować DPA / umowę powierzenia,
    - decyzje o retencji i cleanupie tymczasowych zdjęć powinny wejść do release checklist.

- [x] `F7.3` Dodać monitoring i alerty dla kluczowych flow
  - Zakres: błędy publikacji, formularze leadowe, claim flow, onboarding drop-offs.
  - Data zakończenia: 2026-05-03
  - Wykonano:
    - dodano wspólny `MonitoringModule` / `MonitoringService` po stronie API,
    - dodano strukturalne logowanie sukcesów, błędów i ostrzeżeń dla publikacji ofert, leadów publicznych, publicznego wizardu, uploadu zdjęć, resend/verify/claim flow oraz public analytics,
    - dodano minimalne alerty progowe konfigurowane przez `MONITORING_WINDOW_MS`, `MONITORING_FAILURE_ALERT_THRESHOLD` i `MONITORING_WARNING_ALERT_THRESHOLD`,
    - dodano centralną sanitizację kontekstu monitoringu, żeby nie logować danych osobowych, tokenów ani fingerprintów,
    - przygotowano opis operacyjny `docs/FREEMIUM_SPRINT_7_MONITORING_ALERTS.md`.
  - Uwagi / follow-up:
    - alerty są logowe i per-process, więc produkcyjny rollout powinien podpiąć te zdarzenia do APM / observability stack,
    - frontowe drop-offy onboardingowe wymagają docelowo osobnego funnel analytics w `F7.6`.

- [ ] `F7.4` Przygotować test plan i przejść krytyczne scenariusze E2E
  - Zakres: rejestracja, onboarding, publish listing, lead submit, limit reached, claim listing.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F7.5` Przygotować release checklist i rollout plan
  - Zakres: beta rollout, feature flags, support readiness, rollback plan.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F7.6` Przygotować dashboard metryk po starcie
  - Zakres: aktywacja, publikacja ofert, lead capture, claim flow, upgrade intent.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

#### Definition of Done

- kluczowe ryzyka są obsłużone,
- zespół ma checklistę rolloutową,
- można bezpiecznie uruchomić freemium dla pierwszych użytkowników.

#### Log sprintu

- Status sprintu:
- Data zamknięcia:
- Co dowieźliśmy:
- Decyzje:
- Otwarte tematy:

---

### Sprint 8 — Publiczny katalog ofert i wyszukiwarka

**Cel sprintu:**
Zamienić `/oferty` z technicznego placeholdera w pełnoprawny publiczny katalog opublikowanych ofert.

**Rezultat sprintu:**
Użytkownik końcowy może wejść na `/oferty`, wyszukać nieruchomości, filtrować wyniki i przejść do szczegółów konkretnej oferty.

#### Zadania

- [ ] `F8.1` Zaprojektować kontrakt publicznego katalogu ofert
  - Zakres: DTO, query params, response model, pola publiczne, limity i zasady prywatności.
  - Uwagi:
    - endpoint musi zwracać wyłącznie `publicationStatus = published`,
    - nie używać prywatnego endpointu `/api/listings`, bo respektuje scope zalogowanego agenta,
    - endpoint sitemap powinien pozostać lekki i osobny.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F8.2` Dodać publiczny endpoint wyszukiwania ofert
  - Zakres: lista wyników, filtry, sortowanie, paginacja i bezpieczne limity.
  - Minimalny zakres MVP:
    - lokalizacja/miasto,
    - typ nieruchomości,
    - typ transakcji,
    - cena min/max,
    - powierzchnia min/max,
    - liczba pokoi,
    - fraza tekstowa,
    - sortowanie: najnowsze, cena rosnąco/malejąco, powierzchnia,
    - paginacja.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F8.3` Zbudować publiczny ekran `/oferty`
  - Zakres: UI katalogu, filtry, karty wyników, query params w URL.
  - Minimalny zakres MVP:
    - responsywna lista/karty ofert,
    - zdjęcie główne, cena, lokalizacja, metraż, pokoje i CTA do szczegółów,
    - stany loading/error/empty,
    - zachowanie filtrów w URL,
    - podstawowe eventy analityczne wyszukiwania i kliknięcia oferty.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F8.4` Doprecyzować SEO katalogu ofert
  - Zakres: metadata, canonical, robots, indeksowanie wybranych widoków.
  - Minimalny zakres MVP:
    - decyzja, które filtry są indeksowalne,
    - `noindex` dla kombinacji filtrów niskiej jakości,
    - canonical dla bazowego katalogu,
    - kontrola duplicate content względem `/oferty/[slug]`.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

#### Definition of Done

- `/oferty` działa jako publiczny katalog, a nie placeholder,
- wyniki są filtrowalne, paginowane i linkowalne przez URL,
- publiczny endpoint nie wycieka prywatnych ani nieopublikowanych ofert,
- podstawowe SEO i stany UX są domknięte.

#### Log sprintu

- Status sprintu:
- Data zamknięcia:
- Co dowieźliśmy:
- Decyzje:
- Otwarte tematy:

---

### Sprint 9 — Mapa ofert i wyszukiwanie po obszarze

**Cel sprintu:**
Dodać warstwę mapy do publicznego katalogu ofert oraz umożliwić filtrowanie wyników po zaznaczonym obszarze.

**Rezultat sprintu:**
Użytkownik może przeglądać oferty na mapie, zaznaczyć obszar i zawęzić wyniki katalogu do wybranej lokalizacji.

#### Zadania

- [ ] `F9.1` Podjąć decyzje techniczne i prywatnościowe dla mapy
  - Zakres: biblioteka mapy, dostawca kafelków/geokodowania, dokładność lokalizacji, koszty i limity.
  - Minimalny zakres MVP:
    - decyzja, czy pokazujemy dokładny punkt, przybliżony punkt, czy tylko obszar,
    - reguły dla ofert z `showExactAddressOnPublicPage = false`,
    - fallback dla ofert bez `lat/lng`,
    - decyzja, czy MVP używa prostego `BETWEEN`, czy od razu PostGIS.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F9.2` Rozszerzyć publiczny endpoint katalogu o filtrowanie przestrzenne
  - Zakres: query `bbox` albo `bounds`, walidacja zakresu i limity wyników mapy.
  - Minimalny zakres MVP:
    - filtrowanie po `address.lat`/`address.lng`,
    - odrzucanie niepoprawnych lub zbyt szerokich zakresów,
    - osobny limit liczby markerów,
    - odpowiedź zawierająca dane potrzebne do markerów i kart wyników.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F9.3` Dodać widok mapy zsynchronizowany z katalogiem
  - Zakres: mapa, markery/cluster, lista wyników i URL state.
  - Minimalny zakres MVP:
    - przełącznik lista / mapa albo layout split view,
    - markery dla ofert z dostępną lokalizacją,
    - popup/karta miniatury oferty na markerze,
    - synchronizacja filtrów mapy z listą wyników,
    - loading/error/empty states dla mapy.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F9.4` Dodać zaznaczanie obszaru na mapie
  - Zakres: rysowanie prostokąta albo wielokąta i filtrowanie wyników po zaznaczeniu.
  - Minimalny zakres MVP:
    - tryb zaznaczania obszaru,
    - możliwość wyczyszczenia zaznaczenia,
    - zapis zakresu w URL,
    - analytics event dla użycia map search.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

#### Definition of Done

- mapa działa na publicznym katalogu ofert,
- zaznaczenie obszaru realnie filtruje wyniki,
- prywatność dokładnych adresów jest zachowana,
- UI działa sensownie na desktopie i mobile,
- koszty i limity dostawcy map są znane przed rolloutem.

#### Log sprintu

- Status sprintu:
- Data zamknięcia:
- Co dowieźliśmy:
- Decyzje:
- Otwarte tematy:

---

## 5. Backlog po release freemium — przygotowanie wersji płatnych

Tę sekcję rozwijamy po domknięciu freemium MVP. Na ten moment zapisujemy kierunki, ale nie wrzucamy ich do aktywnego scope release'u.

### Priorytet A — płatne rozszerzenia produktu

- [ ] `P1` Zaawansowane raporty premium
- [ ] `P2` Integracje portalowe
- [ ] `P3` Automatyzacje leadów i powiadomień
- [ ] `P4` Multi-user / role / zespół
- [ ] `P5` White-label / custom branding / własna domena

### Priorytet B — monetyzacja i billing

- [ ] `P6` Model planów płatnych i billing lifecycle
- [ ] `P7` Upgrade, downgrade, trial i grace period
- [ ] `P8` Paywall logic i entitlement sync
- [ ] `P9` Ekrany pricing / checkout / subscription management

### Priorytet C — pogłębione growth loops

- [ ] `P10` Rozbudowany publiczny katalog ofert — rozpisany jako Sprint 8
- [ ] `P11` Mapa ofert i wyszukiwanie po obszarze — rozpisane jako Sprint 9
- [ ] `P12` Lepsze SEO i strony indeksowalne na szeroką skalę
- [ ] `P13` Referral / invite loops
- [ ] `P14` Zaawansowane profile agentów i biur

---

## 6. Zależności i kolejność prac

Rekomendowana kolejność realizacji:

1. Sprint 0
2. Sprint 1
3. Sprint 2
4. Sprint 3
5. Sprint 4
6. Sprint 5
7. Sprint 6
8. Sprint 6.5
9. Sprint 7
10. Sprint 8
11. Sprint 9

Kluczowe zależności:

- Sprint 1 powinien zacząć się dopiero po domknięciu limitów z Sprintu 0.
- Sprint 3 powinien bazować na gotowych zasadach planu free.
- Sprint 4 zależy od Sprintu 3.
- Sprint 5 wymaga gotowych podstaw publicznych ofert oraz ochrony antyspamowej.
- Sprint 6.5 powinien domknąć zdjęcia, wygodną galerię publiczną, publiczny wizard albo decyzję o jego przesunięciu, abuse/legal/analytics i pricing destination.
- Sprint 7 zamyka release readiness i nie powinien być pomijany.
- Sprint 8 powinien zająć się pełnym publicznym katalogiem `/oferty` i wyszukiwarką jako osobnym modułem discovery.
- Sprint 9 powinien bazować na kontrakcie katalogu ze Sprintu 8 i dopiero wtedy dodać mapę oraz wyszukiwanie po zaznaczonym obszarze.

---

## 7. Proponowany sposób prowadzenia dalszych aktualizacji

Po każdym zakończonym zadaniu aktualizujemy dokument w tym formacie:

- zmiana checkboxa na `[x]`,
- wpisanie daty wykonania,
- dopisanie 2-5 punktów co zostało zrobione,
- dopisanie follow-upów jeśli zadanie rodzi kolejne prace.

Po każdym sprincie uzupełniamy sekcję `Log sprintu`:

- co dowieźliśmy,
- czego nie domknęliśmy,
- jakie decyzje podjęliśmy,
- co wchodzi do kolejnego sprintu.

---

## 8. Proponowany pierwszy krok od razu

Najbardziej sensowny start to rozpoczęcie od Sprintu 0 i domknięcie tych 5 decyzji:

- limity free,
- zakres darmowych funkcji,
- scope premium,
- momenty upgrade'u,
- kryteria release readiness.

To odblokuje wszystkie kolejne sprinty i pozwoli nam potem realizować plan bez chaosu.
