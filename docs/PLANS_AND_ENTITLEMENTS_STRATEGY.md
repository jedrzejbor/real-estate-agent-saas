# Plany, limity i entitlementy w EstateFlow

## 1. Cel dokumentu

Ten dokument opisuje aktualne i docelowe podejście do planów w aplikacji:

- jakie plany będą dostępne dla użytkowników,
- co każdy plan odblokowuje,
- jakie limity są egzekwowane,
- jak działa upgrade,
- gdzie w kodzie jest źródło prawdy dla planów,
- co trzeba dopracować przed pełnym billingiem self-service.

Dokument dotyczy kont agentów / biur oraz osobnego uproszczonego flow prywatnego właściciela nieruchomości.

---

## 2. Aktualne podejście techniczne

Źródłem prawdy dla planu jest `Agency`, a nie pojedynczy `User`.

Aktualny model:

- `Agency.plan` — kod planu, np. `free`, `starter`, `professional`, `enterprise`.
- `Agency.subscription` — status subskrypcji, np. `active`, `trial`, `past_due`, `canceled`.
- `AgencyPlanService` — centralny resolver entitlementów.
- `auth/register`, `auth/login`, `auth/me` — zwracają `agency`, `entitlements` i `usage`.
- Frontend używa `user.entitlements` oraz `user.usage` jako źródła prawdy dla UI.

To jest dobre podejście, bo plan jest własnością workspace / biura, a nie konkretnego użytkownika. Dzięki temu w przyszłości łatwiej obsłużyć wiele osób w jednym biurze, role, billing zespołowy i limity współdzielone.

---

## 3. Typy użytkowników

### 3.1 Agent / biuro

Agent pracuje w pełnym dashboardzie `/dashboard`.

Ma dostęp do:

- CRM ofert,
- CRM klientów,
- kalendarza i spotkań,
- raportów,
- publicznych stron ofert,
- formularzy leadowych,
- ustawień planu i upgrade.

Plan agencji decyduje o limitach i funkcjach premium.

### 3.2 Prywatny właściciel nieruchomości

Prywatny właściciel pracuje w uproszczonym panelu `/seller`.

Ma dostęp do:

- własnych zgłoszeń / ogłoszeń,
- statusu publikacji,
- podstawowych statystyk oferty,
- zapytań z publicznej strony,
- odnowienia / wycofania ogłoszenia,
- edycji i ponownej wysyłki po odrzuceniu,
- CTA do przejścia na konto agenta.

Prywatny właściciel nie powinien dostawać pełnego CRM przypadkiem. Może wejść tylko na `/dashboard/upgrade`, żeby zobaczyć możliwość przejścia na konto agenta.

---

## 4. Plany dla agentów i biur

### 4.1 Free

Plan startowy dla nowych agentów i małych testów produktu.

Cel:

- dać realną wartość bez płatności,
- umożliwić publikację pierwszych ofert,
- pozwolić złapać pierwsze leady,
- naturalnie pokazać moment upgrade przy rosnącym wolumenie.

Limity:

| Zasób | Limit |
|---|---:|
| Aktywne oferty | 5 |
| Klienci | 25 |
| Spotkania miesięcznie | 20 |
| Użytkownicy w workspace | 1 |
| Zdjęcia na ofertę | 15 |

Funkcje:

- podstawowy dashboard,
- podstawowy CRM ofert,
- podstawowy CRM klientów,
- podstawowy kalendarz,
- publiczne strony ofert,
- formularze leadowe na publicznych ofertach,
- podstawowy raport overview,
- podstawowy raport ofert,
- podstawowy raport klientów,
- branding EstateFlow obowiązkowy,
- brak multi-user,
- brak własnego brandingu,
- brak własnej domeny,
- brak zaawansowanych automatyzacji.

Najważniejsze trigger points do upgrade:

- próba dodania 6. aktywnej oferty,
- próba dodania 26. klienta,
- próba dodania 21. spotkania w miesiącu,
- potrzeba większej liczby zdjęć,
- potrzeba usunięcia brandingu EstateFlow,
- potrzeba pracy zespołowej.

### 4.2 Starter

Plan dla solo agenta, który zaczął realnie pracować na pipeline.

Cel:

- zwiększyć limity,
- utrzymać prostotę produktu,
- umożliwić aktywną pracę bez szybkiego uderzania w limity Free.

Limity:

| Zasób | Limit |
|---|---:|
| Aktywne oferty | 25 |
| Klienci | 250 |
| Spotkania miesięcznie | 150 |
| Użytkownicy w workspace | 1 |
| Zdjęcia na ofertę | 30 |

Funkcje:

- wszystko z Free,
- wyższe limity ofert, klientów, spotkań i zdjęć,
- pełniejsze wykorzystanie publicznych ofert,
- podstawowe raporty,
- nadal bez multi-user,
- nadal bez custom brandingu,
- nadal bez white-label.

Starter powinien być najprostszy do zrozumienia: “więcej miejsca na pracę”.

### 4.3 Professional

Plan dla agentów i małych biur, które aktywnie publikują oferty i obsługują leady.

Cel:

- odblokować profesjonalizację publicznego doświadczenia,
- dać większą skalę,
- umożliwić pracę kilku osób,
- odblokować bardziej wartościowe raportowanie i automatyzacje.

Limity:

| Zasób | Limit |
|---|---:|
| Aktywne oferty | 200 |
| Klienci | 2 500 |
| Spotkania miesięcznie | 1 000 |
| Użytkownicy w workspace | 5 |
| Zdjęcia na ofertę | 50 |

Funkcje:

- wszystko ze Starter,
- custom branding publicznych stron,
- praca zespołowa,
- raport spotkań,
- głębsze raporty i analityka,
- więcej zdjęć per oferta,
- automatyzacje po leadzie,
- rozbudowany publiczny profil agenta / biura,
- lepsze CTA i prezentacja publiczna.

Professional powinien być planem rekomendowanym dla użytkownika, który traktuje EstateFlow jako codzienne narzędzie pracy.

### 4.4 Enterprise

Plan dla większych zespołów, sieci biur i wdrożeń z indywidualnymi wymaganiami.

Cel:

- obsłużyć skalę,
- umożliwić indywidualne limity,
- dać miejsce na white-label, własną domenę i wsparcie wdrożeniowe.

Limity:

| Zasób | Limit |
|---|---:|
| Aktywne oferty | Indywidualnie / bez limitu |
| Klienci | Indywidualnie / bez limitu |
| Spotkania miesięcznie | Indywidualnie / bez limitu |
| Użytkownicy w workspace | Indywidualnie / bez limitu |
| Zdjęcia na ofertę | Indywidualnie / bez limitu |

Funkcje:

- wszystko z Professional,
- indywidualne limity,
- white-label,
- własna domena,
- zaawansowane role,
- wiele workspace / oddziałów,
- dedykowane wsparcie,
- migracje danych,
- integracje portalowe i systemowe,
- indywidualne SLA.

---

## 5. Funkcje według planu

| Funkcja | Free | Starter | Professional | Enterprise |
|---|---:|---:|---:|---:|
| CRM ofert | Tak, limit 5 | Tak, limit 25 | Tak, limit 200 | Tak |
| CRM klientów | Tak, limit 25 | Tak, limit 250 | Tak, limit 2 500 | Tak |
| Spotkania | Tak, limit 20 / mies. | Tak, limit 150 / mies. | Tak, limit 1 000 / mies. | Tak |
| Publiczne strony ofert | Tak | Tak | Tak | Tak |
| Formularze leadowe | Tak | Tak | Tak | Tak |
| Zdjęcia na ofertę | 15 | 30 | 50 | Indywidualnie |
| Overview dashboard | Tak | Tak | Tak | Tak |
| Raport ofert | Podstawowy | Podstawowy | Rozszerzony | Rozszerzony |
| Raport klientów | Podstawowy | Podstawowy | Rozszerzony | Rozszerzony |
| Raport spotkań | Nie | Tak | Tak | Tak |
| Custom branding | Nie | Nie | Tak | Tak |
| Multi-user | Nie | Nie | Tak, do 5 | Tak |
| Własna domena | Nie | Nie | Później / add-on | Tak |
| White-label | Nie | Nie | Nie | Tak |
| Automatyzacje leadów | Nie | Podstawowe / później | Tak | Tak |
| Integracje portalowe | Nie | Nie | Później / add-on | Tak |

---

## 6. Zasady limitów i blokad

### 6.1 Limity twarde

Limity twarde powinny być egzekwowane backendowo, a UI ma tylko pomagać użytkownikowi zrozumieć sytuację.

Backend powinien blokować:

- tworzenie kolejnej aktywnej oferty po przekroczeniu limitu,
- dodanie kolejnego klienta po przekroczeniu limitu,
- utworzenie kolejnego spotkania po przekroczeniu miesięcznego limitu,
- upload zdjęć powyżej limitu planu,
- dodanie użytkownika, jeśli plan nie ma `multiUser`.

### 6.2 Limity miękkie

UI powinien ostrzegać przy około 80% wykorzystania limitu.

Przykłady:

- 4/5 aktywnych ofert w Free,
- 20/25 klientów w Free,
- 16/20 spotkań miesięcznych w Free.

Komunikat powinien mówić:

- ile wykorzystano,
- jaki jest limit,
- co odblokowuje wyższy plan,
- jaki jest następny krok.

### 6.3 Brak ukrywania istniejących danych

Po przekroczeniu limitu lub zmianie planu na niższy:

- nie usuwamy danych,
- nie ukrywamy istniejących rekordów,
- blokujemy tworzenie nowych rekordów przekraczających limit,
- pozwalamy edytować i archiwizować istniejące rekordy.

To jest ważne dla zaufania użytkownika.

---

## 7. Upgrade flow

Aktualny stan:

- `/dashboard/upgrade` pokazuje plany Starter, Professional i Enterprise.
- Kliknięcia upgrade są mierzone eventem `upgrade_cta_clicked`.
- Formularz upgrade zapisuje intencję w analityce produktu.
- Nie ma jeszcze automatycznego checkoutu ani zmiany planu po stronie płatności.

Docelowy flow:

1. Użytkownik trafia na upgrade z kontekstu limitu albo CTA.
2. Ekran pokazuje rekomendowany plan i porównanie.
3. Użytkownik wybiera plan.
4. Checkout przyjmuje płatność.
5. Billing provider wysyła webhook.
6. Backend aktualizuje `Agency.plan` i `Agency.subscription`.
7. `auth/me` zwraca nowe entitlementy.
8. UI odblokowuje funkcje bez ręcznego refreshu albo po krótkim odświeżeniu sesji.

Na etapie MVP intencja upgrade jest wystarczająca, ale copy musi jasno mówić, że to nie jest jeszcze automatyczny zakup.

---

## 8. Prywatny właściciel a plany

Prywatny właściciel nieruchomości nie jest osobnym płatnym planem agencji.

To osobny tryb użytkownika:

- uproszczony panel `/seller`,
- rola techniczna obecnie oparta o `viewer`,
- jedno lub kilka własnych zgłoszeń,
- brak pełnego CRM,
- brak dashboardu agenta,
- możliwość upgrade do konta agenta.

Upgrade prywatnego właściciela powinien oznaczać:

- wejście w pełny model agenta,
- dostęp do CRM,
- możliwość obsługi wielu ofert,
- możliwość pracy z klientami i leadami,
- możliwość wejścia w plany Free / Starter / Professional / Enterprise.

W praktyce prywatny właściciel po konwersji powinien stać się agentem / workspace użytkownikiem z planem `free` albo wybranym planem płatnym.

---

## 9. Gdzie plan wpływa na produkt

Plan powinien wpływać na:

- tworzenie ofert,
- publikację ofert,
- upload zdjęć,
- liczbę klientów,
- liczbę spotkań,
- dostęp do raportów,
- branding publicznych stron,
- możliwość dodania użytkowników,
- widoczność funkcji premium,
- CTA i komunikaty upgrade.

Plan nie powinien wpływać na:

- możliwość zalogowania,
- możliwość odczytu własnych istniejących danych,
- możliwość edycji istniejących danych,
- możliwość eksportu danych wymaganych prawnie,
- możliwość kontaktu z supportem.

---

## 10. Źródło prawdy w kodzie

Aktualne źródła:

- `apps/api/src/common/enums/index.ts`
  - `AgencyPlan`
  - `SubscriptionStatus`
- `apps/api/src/users/entities/agency.entity.ts`
  - `plan`
  - `subscription`
- `apps/api/src/users/agency-plan.service.ts`
  - limity,
  - funkcje,
  - label planu,
  - status subskrypcji.
- `apps/web/src/lib/auth.ts`
  - typ `AuthUser`,
  - `entitlements`,
  - `usage`.
- `apps/web/src/lib/plan.ts`
  - mapowanie usage i feature list dla UI.
- `apps/web/src/app/(dashboard)/dashboard/upgrade/page.tsx`
  - aktualna prezentacja planów i zbieranie intencji upgrade.

Docelowo warto utrzymać jedną zasadę:

> Backend decyduje, co użytkownik może zrobić. Frontend pokazuje te same reguły wcześniej, żeby użytkownik rozumiał limit zanim dostanie błąd.

---

## 11. Backlog do pełnego billing flow

### B1 — Migracje i model billingowy

- dodać migracje dla pól billingowych, jeśli produkcja nie używa `synchronize`,
- rozważyć `billingCustomerId`,
- rozważyć `billingSubscriptionId`,
- rozważyć `currentPeriodEnd`,
- rozważyć `trialEndsAt`,
- dodać historię zmian planu.

### B2 — Checkout self-service

- wybrać billing provider,
- dodać checkout session,
- dodać powrót sukces / anulowanie,
- dodać webhooki,
- zabezpieczyć webhook signature.

### B3 — Aktualizacja planu po webhooku

- webhook aktualizuje `Agency.plan`,
- webhook aktualizuje `Agency.subscription`,
- UI odświeża `auth/me`,
- użytkownik widzi nowy plan w topbarze i ustawieniach.

### B4 — Downgrade i past due

- zdefiniować zachowanie `past_due`,
- zdefiniować downgrade przy przekroczeniu limitów,
- nie ukrywać danych,
- blokować nowe rekordy ponad limit,
- pokazać jasny komunikat.

### B5 — Admin / support override

- admin może ręcznie zmienić plan workspace,
- admin widzi historię billingową,
- admin widzi powód blokady limitu,
- admin może nadać trial lub przedłużenie.

---

## 12. Decyzje produktowe do potwierdzenia

- Czy Starter ma mieć raport spotkań, czy dopiero Professional?
- Czy Professional ma mieć własną domenę jako część planu, czy jako add-on?
- Czy publiczne leady mają mieć osobny limit, czy tylko ochronę fair-use?
- Czy prywatny właściciel po upgrade zawsze zaczyna od Free, czy od rekomendowanego Starter?
- Czy limity ofert liczymy po `Listing.status != archived`, czy tylko po `publicationStatus = published`?
- Czy zdjęcia liczymy per wszystkie oferty, czy tylko per pojedynczą ofertę?
- Czy `Enterprise` ma mieć limity `null` jako nielimitowane, czy indywidualne wartości zapisane per agency?

---

## 13. Rekomendacja na najbliższy etap

Najbliższy etap powinien utrzymać obecne podejście:

1. `AgencyPlanService` pozostaje centralnym miejscem reguł planów.
2. `/dashboard/upgrade` nadal zbiera intencję upgrade, bez udawania pełnego checkoutu.
3. UI planów powinien zostać dopracowany copywritersko i wizualnie.
4. Backend powinien dalej egzekwować wszystkie limity.
5. Dopiero po stabilizacji konwersji upgrade warto wdrożyć billing self-service.

To pozwala szybciej testować pricing i potrzeby użytkowników, bez przedwczesnego komplikowania produktu billingiem.
