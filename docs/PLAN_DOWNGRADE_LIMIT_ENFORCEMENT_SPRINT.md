# Sprint: zabezpieczenie limitów po downgrade i braku płatności

## Cel

Przygotować bezpieczne zachowanie aplikacji na sytuację, w której workspace miał wyższy plan i utworzył więcej danych, a następnie spadł na niższy plan albo subskrypcja przeszła w `past_due` / `canceled`.

Sprint obejmuje:

- oferty,
- klientów,
- spotkania,
- komunikację limitów w UI,
- backendową egzekucję reguł,
- audyt i monitoring automatycznych zmian.

Najważniejsza zasada: **nie usuwamy danych użytkownika**. Limity ograniczają aktywne użycie produktu i tworzenie nowych zasobów, ale nie powinny niszczyć ani ukrywać historii bez jasnego procesu.

## Decyzje produktowe

### Oferty

Limit planu dotyczy aktywnych ofert, czyli ofert, które realnie zajmują miejsce w CRM i/lub są publicznie używane.

Rekomendowana interpretacja MVP:

- limit `activeListings` liczony po ofertach niearchiwalnych,
- oferty publiczne ponad limit mogą zostać odpublikowane po karencji,
- oferta pozostaje w CRM i może być edytowana,
- użytkownik nie może aktywować / opublikować kolejnej oferty, jeśli jest ponad limitem.

W przypadku downgrade:

1. Dane zostają w bazie.
2. Workspace dostaje stan `over_limit`.
3. Użytkownik widzi banner z informacją, np. `Masz 23/5 aktywnych ofert`.
4. Przez okres karencji użytkownik może sam wybrać, które oferty zostają aktywne.
5. Po karencji system automatycznie zostawia limitowaną liczbę ofert, a nadmiar oznacza jako nieaktywny / odpublikowany.

Domyślna reguła automatycznego wyboru ofert po karencji:

1. oferty ręcznie oznaczone przez użytkownika jako zachowane,
2. oferty publicznie opublikowane,
3. najnowsze aktywne,
4. pozostałe.

Nie usuwamy zdjęć, historii, leadów ani dokumentów.

### Klienci

Limit klientów powinien blokować tworzenie nowych klientów ponad limit, ale nie powinien automatycznie usuwać ani archiwizować istniejących kontaktów.

W przypadku downgrade:

- istniejący klienci pozostają dostępni,
- edycja istniejących klientów zostaje dostępna,
- tworzenie nowego klienta jest blokowane, jeśli liczba klientów przekracza limit,
- import klientów jest blokowany albo wymaga zmniejszenia liczby importowanych rekordów,
- użytkownik może ręcznie archiwizować / usuwać klientów, żeby zejść poniżej limitu.

Nie rekomendujemy automatycznego dezaktywowania klientów, bo klient może być powiązany z transakcjami, spotkaniami, leadami i dokumentacją. Automatyczne ukrywanie kontaktów byłoby ryzykowne operacyjnie.

### Spotkania

Limit spotkań jest miesięczny, więc powinien dotyczyć tworzenia nowych spotkań w bieżącym okresie rozliczeniowym / miesiącu kalendarzowym.

W przypadku downgrade albo `past_due`:

- istniejące spotkania pozostają widoczne,
- edycja istniejących spotkań zostaje dostępna,
- tworzenie nowych spotkań jest blokowane po przekroczeniu limitu miesięcznego,
- przeniesienie spotkania do bieżącego miesiąca powinno być traktowane jak użycie limitu,
- spotkania historyczne nie powinny być usuwane ani ukrywane.

Nie dezaktywujemy automatycznie spotkań, bo są elementem kalendarza i historii pracy.

## Model stanów

### Proponowane stany workspace

- `within_limit` - użycie mieści się w aktualnym planie.
- `near_limit` - użycie przekracza próg ostrzegawczy, np. 80%.
- `over_limit_grace` - użycie przekracza limit, ale trwa okres karencji.
- `over_limit_enforced` - karencja minęła, system egzekwuje ograniczenia.
- `past_due` - subskrypcja nieopłacona; może współistnieć z `over_limit`.
- `canceled` - subskrypcja anulowana; obowiązuje plan fallback, np. Free.

Stan nie musi od razu być osobną kolumną, ale backend powinien umieć go wyliczyć deterministycznie z:

- `Agency.plan`,
- `Agency.subscription`,
- aktualnego usage,
- limitów z `AgencyPlanService`,
- daty wejścia w over-limit / downgrade.

## Sprint 1 - polityka backendowa i źródło prawdy

Status: Zrobione.

Wykonano:

- dodano `AgencyLimitEnforcementService` jako centralną warstwę kalkulacji stanu limitów,
- serwis ocenia zasoby:
  - `activeListings`,
  - `clients`,
  - `monthlyAppointments`,
  - `users`,
- serwis zwraca dla każdego zasobu:
  - `usage`,
  - `limit`,
  - `remaining`,
  - `usageRatio`,
  - `isUnlimited`,
  - `isNearLimit`,
  - `isOverLimit`,
  - `isInGracePeriod`,
  - `enforcementAction`,
- serwis zwraca status workspace:
  - `within_limit`,
  - `near_limit`,
  - `over_limit_grace`,
  - `over_limit_enforced`,
- zachowano `AgencyPlanService` jako źródło limitów planu,
- podpięto serwis w `UsersModule` i wyeksportowano go do użycia w kolejnych modułach,
- dodano testy jednostkowe dla:
  - stanu poniżej limitu,
  - ostrzeżenia przy 80% limitu,
  - przekroczenia limitu,
  - aktywnej karencji,
  - limitów `null` jako nielimitowanych,
  - normalizacji progu ostrzegawczego.

Cel: przygotować centralne miejsce, które liczy stan limitów i pozwala wszystkim modułom korzystać z tych samych reguł.

Zakres:

- dodać serwis np. `AgencyLimitEnforcementService`,
- dodać strukturę wyniku dla zasobów:
  - `activeListings`,
  - `clients`,
  - `monthlyAppointments`,
  - `users` w przyszłości,
- zwracać dla każdego zasobu:
  - `usage`,
  - `limit`,
  - `remaining`,
  - `isNearLimit`,
  - `isOverLimit`,
  - `isInGracePeriod`,
  - `enforcementAction`,
- zachować `AgencyPlanService` jako źródło limitów planu,
- dodać testy jednostkowe dla kalkulacji stanów.

Kryteria akceptacji:

- backend potrafi jednoznacznie powiedzieć, czy workspace jest ponad limitem,
- wynik jest niezależny od UI,
- wszystkie limity używają tej samej logiki porównywania usage do limitu,
- limity `null` są traktowane jako brak limitu.

## Sprint 2 - egzekucja tworzenia i reaktywacji zasobów

Status: Do zrobienia.

Cel: zablokować działania, które zwiększają przekroczenie limitu.

Zakres dla ofert:

- blokować tworzenie kolejnej aktywnej oferty ponad limit,
- blokować publikację / reaktywację oferty, jeśli workspace jest ponad limitem,
- pozwalać edytować istniejące oferty,
- pozwalać archiwizować / odpublikować oferty,
- zwracać czytelny błąd API z kodem np. `LISTING_LIMIT_EXCEEDED`.

Zakres dla klientów:

- blokować tworzenie klienta ponad limit,
- blokować import klientów, jeśli import przekroczy limit,
- pozwalać edytować istniejących klientów,
- zwracać kod np. `CLIENT_LIMIT_EXCEEDED`.

Zakres dla spotkań:

- blokować tworzenie spotkania ponad miesięczny limit,
- blokować przeniesienie spotkania do miesiąca, który przekracza limit,
- pozwalać edytować istniejące spotkania bez zmiany miesiąca,
- zwracać kod np. `APPOINTMENT_LIMIT_EXCEEDED`.

Kryteria akceptacji:

- limitów nie da się ominąć requestem API,
- frontend może pokazać precyzyjny komunikat na podstawie kodu błędu,
- istniejące dane pozostają dostępne.

## Sprint 3 - UI over-limit i wybór aktywnych ofert

Status: Do zrobienia.

Cel: użytkownik rozumie problem i może sam zdecydować, które oferty zostają aktywne.

Zakres:

- dodać banner globalny w dashboardzie dla `over_limit`,
- dodać osobne komunikaty na:
  - liście ofert,
  - formularzu tworzenia oferty,
  - liście klientów,
  - formularzu klienta,
  - kalendarzu / formularzu spotkania,
- dodać widok wyboru aktywnych ofert, gdy `activeListings > limit`,
- pokazać licznik np. `Wybrane 5 z 5`,
- pozwolić zapisać wybór ofert do zachowania,
- dla klientów i spotkań pokazać jasne CTA:
  - usuń / zarchiwizuj rekordy,
  - przejdź na wyższy plan,
  - skontaktuj się z supportem.

Kryteria akceptacji:

- użytkownik nie dostaje tylko błędu API bez kontekstu,
- wiadomo, które zasoby są ponad limitem,
- dla ofert użytkownik może ręcznie wybrać rekordy do zachowania.

## Sprint 4 - karencja i automatyczne odpublicznienie ofert

Status: Do zrobienia.

Cel: bezpiecznie obsłużyć przypadek, gdy użytkownik nie podejmie decyzji w okresie karencji.

Zakres:

- dodać datę wejścia w over-limit, np. `limitGraceStartedAt`,
- dodać datę końca karencji, np. `limitGraceEndsAt`,
- dodać job cykliczny np. `enforcePlanDowngradeLimits`,
- job powinien:
  - znaleźć workspace po karencji,
  - policzyć aktualne limity,
  - dla ofert wybrać rekordy do zachowania,
  - odpublicznić / zdezaktywować nadmiar,
  - zapisać audyt decyzji,
  - wysłać monitoring event,
- job nie powinien:
  - usuwać rekordów,
  - usuwać zdjęć,
  - usuwać leadów,
  - usuwać klientów,
  - usuwać spotkań.

Kryteria akceptacji:

- po karencji workspace nie ma publicznie aktywnych ofert ponad limit,
- operacja jest idempotentna,
- każda automatyczna zmiana ma wpis audytowy,
- można wyjaśnić użytkownikowi, dlaczego konkretna oferta została odpubliczniona.

## Sprint 5 - monitoring, audyt i testy E2E

Status: Do zrobienia.

Cel: zapewnić obserwowalność i regresję dla krytycznego flow billingowego.

Zakres:

- dodać monitoring eventy:
  - `plan_limit_near`,
  - `plan_limit_exceeded`,
  - `plan_limit_grace_started`,
  - `plan_limit_enforced`,
  - `plan_limit_resource_blocked`,
- dodać audyt zmian automatycznych dla ofert,
- dodać testy jednostkowe serwisu limitów,
- dodać testy integracyjne endpointów:
  - tworzenie oferty ponad limit,
  - publikacja oferty ponad limit,
  - tworzenie klienta ponad limit,
  - import klientów ponad limit,
  - tworzenie spotkania ponad limit,
- dodać manualny test plan:
  - upgrade,
  - downgrade,
  - past_due,
  - canceled,
  - powrót do wyższego planu.

Kryteria akceptacji:

- każdy krytyczny scenariusz ma test lub opisany manualny test,
- support może zobaczyć powód blokady,
- monitoring pokazuje skalę problemu po wdrożeniu billing flow.

## Reguły bezpieczeństwa danych

- Nie usuwamy danych automatycznie.
- Nie ukrywamy historii pracy użytkownika.
- Nie blokujemy logowania.
- Nie blokujemy odczytu własnych danych.
- Nie blokujemy eksportu danych, jeśli zostanie dodany.
- Nie blokujemy edycji istniejących danych, chyba że edycja zwiększa przekroczenie limitu.
- Blokujemy tworzenie albo reaktywację zasobów ponad limit.
- Publiczne użycie oferty może zostać ograniczone po karencji.

## Copy UX

Przykład dla ofert:

> Twój obecny plan pozwala na 5 aktywnych ofert. Masz teraz 23 aktywne oferty. Wybierz 5 ofert, które mają pozostać aktywne, albo przejdź na wyższy plan.

Przykład dla klientów:

> Twój obecny plan pozwala na 25 klientów. Masz 84 klientów. Możesz nadal edytować istniejące kontakty, ale dodanie nowych klientów jest zablokowane do czasu zmniejszenia liczby kontaktów albo zmiany planu.

Przykład dla spotkań:

> Twój obecny plan pozwala na 20 spotkań miesięcznie. Limit na ten miesiąc został wykorzystany. Możesz edytować istniejące spotkania, ale nowe spotkania wymagają wyższego planu.

## Otwarte decyzje

- Czy karencja ma trwać 7, 14 czy 30 dni?
- Czy `past_due` ma mieć krótszą karencję niż świadomy downgrade?
- Czy limit ofert liczymy jako wszystkie niearchiwalne, czy tylko publicznie opublikowane?
- Czy użytkownik może zachować ponadlimitowe oferty jako szkice bez publikacji?
- Czy klient może zostać „zarchiwizowany”, czy tylko usunięty?
- Czy spotkania liczymy po dacie rozpoczęcia, dacie utworzenia, czy okresie rozliczeniowym?
- Czy admin/support może nadać ręczne przedłużenie karencji?

## Rekomendacja MVP

Na start wdrożyć:

1. blokady backendowe dla tworzenia zasobów ponad limit,
2. jasny UI `over_limit`,
3. ręczny wybór aktywnych ofert,
4. brak automatycznego ruszania klientów i spotkań,
5. automatyczne odpublicznienie tylko ofert i tylko po karencji,
6. audyt i monitoring wszystkich automatycznych zmian.
