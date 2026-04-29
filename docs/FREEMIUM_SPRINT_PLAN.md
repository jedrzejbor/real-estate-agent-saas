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

- [ ] `F3.3` Zbudować publiczną stronę oferty
  - Zakres: hero, galeria, podstawowe informacje, CTA kontaktowe, branding EstateFlow.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F3.4` Dodać ustawienia publikacji w panelu agenta
  - Zakres: publish toggle, podgląd, kopiowanie linku, QR placeholder.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F3.5` Dodać SEO basics dla publicznych ofert
  - Zakres: meta tags, open graph, indeksowalność, sitemap strategy.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F3.6` Dodać analitykę odsłon i share'ów
  - Zakres: page views, copy link, share intent, source tagging.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

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
- [ ] `F4.1` Zdefiniować model publicznego leada
  - Zakres: źródło, zgoda kontaktowa, powiązanie z ofertą, status obsługi.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F4.2` Dodać formularz kontaktowy na publicznej ofercie
  - Zakres: pola, walidacja, zgody, ochrona antyspamowa.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F4.3` Zapisać lead do CRM i powiązać z ofertą
  - Zakres: tworzenie klienta/leada, historia źródła, deduplikacja podstawowa.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F4.4` Dodać powiadomienia o nowym leadzie
  - Zakres: in-app, email lub minimalne powiadomienie systemowe.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F4.5` Dodać podstawowy widok lead source / public inquiries
  - Zakres: lista leadów z publicznych ofert, filtrowanie po ofercie.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F4.6` Dodać eventy mierzące conversion funnel oferty
  - Zakres: visit → submit lead → lead accepted.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

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
- [ ] `F5.1` Zaprojektować uproszczony publiczny wizard dodania oferty
  - Zakres: minimalny zestaw pól, upload zdjęć, dane kontaktowe, UX mobile-first.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F5.2` Dodać model publicznego draftu / submission
  - Zakres: statusy, token weryfikacyjny, źródło, wersja przed claimem.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F5.3` Dodać email verification dla publicznego submitu
  - Zakres: link weryfikacyjny, czas życia tokenu, retry.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F5.4` Dodać mechanizm claim listing do konta
  - Zakres: przypięcie oferty do workspace po rejestracji lub logowaniu, audit log.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F5.5` Dodać flow „przejmij ofertę i zacznij używać CRM"
  - Zakres: CTA po claimie, onboarding kontynuacyjny, sugestie kolejnych kroków.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F5.6` Dodać mechanizmy antyspamowe i nadużyciowe
  - Zakres: rate limiting, CAPTCHA, heurystyki, report abuse.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F5.7` Dodać podstawową moderację publicznych ofert
  - Zakres: reguły walidacji, soft moderation, kolejka do review jeśli potrzebna.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

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
- [ ] `F6.1` Dodać publiczny profil agenta / biura
  - Zakres: podstawowe dane, avatar/logo, aktywne oferty, formularz kontaktowy.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F6.2` Dodać QR i szybkie udostępnianie oferty
  - Zakres: generowanie QR, copy/share actions, gotowy asset do druku.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F6.3` Dodać generator opisu oferty / quality hints
  - Zakres: prosty AI helper lub rule-based assist dla darmowego planu z limitem użyć.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F6.4` Dodać podstawowy widget lead form / embeddable link
  - Zakres: prosty osadzalny formularz lub hosted form entry point.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F6.5` Zdefiniować miejsca premium upsell dla growth features
  - Zakres: custom branding, większe limity, lepsze profile, automatyzacje.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

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

### Sprint 7 — Release readiness, bezpieczeństwo i operacyjny launch

**Cel sprintu:**
Domknąć release freemium pod kątem jakości, bezpieczeństwa, legal i pomiaru.

**Rezultat sprintu:**
Wersja freemium jest gotowa do kontrolowanego udostępnienia użytkownikom.

#### Zadania
- [ ] `F7.1` Wykonać przegląd bezpieczeństwa dla funkcji publicznych
  - Zakres: auth boundaries, public endpoints, abuse cases, upload review, rate limit review.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F7.2` Domknąć kwestie regulaminowe i prywatności
  - Zakres: zgody, polityka prywatności, zasady publikacji, abuse workflow.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

- [ ] `F7.3` Dodać monitoring i alerty dla kluczowych flow
  - Zakres: błędy publikacji, formularze leadowe, claim flow, onboarding drop-offs.
  - Data zakończenia:
  - Wykonano:
  - Uwagi / follow-up:

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
- [ ] `P10` Rozbudowany publiczny katalog ofert
- [ ] `P11` Lepsze SEO i strony indeksowalne na szeroką skalę
- [ ] `P12` Referral / invite loops
- [ ] `P13` Zaawansowane profile agentów i biur

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
8. Sprint 7

Kluczowe zależności:
- Sprint 1 powinien zacząć się dopiero po domknięciu limitów z Sprintu 0.
- Sprint 3 powinien bazować na gotowych zasadach planu free.
- Sprint 4 zależy od Sprintu 3.
- Sprint 5 wymaga gotowych podstaw publicznych ofert oraz ochrony antyspamowej.
- Sprint 7 zamyka całość i nie powinien być pomijany.

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
