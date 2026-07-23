# Gielda przejec ofert przez agentow - plan sprintow

Dokument operacyjny do wdrozenia funkcjonalnosci, w ktorej wlasciciel prywatny
moze oznaczyc oferte jako otwarta na wspolprace z agentem nieruchomosci, a
agenci moga skladac propozycje przejecia lub obslugi tej oferty.

Funkcja ma byc jedna z glownych wartosci dla kont agentow: daje im rynek
aktywnych wlascicieli bez cold callingu, a wlascicielom pozwala porownac
konkretne warunki wspolpracy i wybrac jednego albo kilku agentow.

---

## 1. Jak pracujemy z tym dokumentem

### Statusy

- `[ ]` - nie rozpoczeto
- `[-]` - w trakcie
- `[x]` - zakonczone
- `[!]` - zablokowane / wymaga decyzji

### Zasada aktualizacji

Po zakonczeniu zadania uzupelniamy:

- status checkboxa,
- date wykonania,
- krotki opis zakresu,
- decyzje / follow-upy.

---

## 2. Cel funkcjonalnosci

### Wlasciciel prywatny

Uzytkownik zwykly / wlasciciel powinien moc:

- podczas tworzenia albo edycji ogloszenia zaznaczyc, ze jest otwarty na
  wspolprace z agentami,
- opcjonalnie doprecyzowac preferencje wspolpracy, np. czy dopuszcza wylacznosc,
  wielu agentow, widełki prowizji albo oczekiwania dotyczace kontaktu,
- zobaczyc w panelu wlasciciela liste propozycji otrzymanych dla konkretnej
  oferty,
- wejsc w szczegoly propozycji i porownac warunki,
- prowadzic rozmowe z agentem w kontekscie danej propozycji,
- zaakceptowac jedna lub kilka propozycji, jesli model wspolpracy to dopuszcza,
- odrzucic propozycje albo zamknac nabor agentow dla oferty.

### Agent nieruchomosci

Agent powinien moc:

- wejsc do nowej zakladki dashboardu z ofertami szukajacymi agenta,
- filtrowac oferty wedlug lokalizacji, typu nieruchomosci, transakcji, ceny,
  daty dodania, oczekiwan wlasciciela i statusu,
- zobaczyc na publicznej stronie oferty informacje, ze wlasciciel jest otwarty
  na przejecie / wspolprace,
- po zalogowaniu jako agent zlozyc propozycje wspolpracy przez dedykowany
  formularz,
- edytowac wyslana propozycje do momentu akceptacji, odrzucenia albo zamkniecia
  naboru,
- prowadzic czat z wlascicielem w kontekscie propozycji,
- po akceptacji zobaczyc oferte w dashboardzie w sposob zblizony do wlasnych
  ofert,
- utworzyc z zaakceptowanej propozycji robocza kopie oferty w swoim CRM,
  opublikowac ja ze swojego konta i edytowac w ramach przyznanych uprawnien.

---

## 3. Zakres MVP

### Wchodzi w MVP

- pole na ofercie/submission: `agentCollaborationEnabled`,
- podstawowe preferencje wlasciciela dotyczace wspolpracy,
- publiczny znacznik na ofercie: "Wlasciciel jest otwarty na wspolprace z
  agentem",
- ochrona formularza skladania propozycji: widoczny tylko dla kont agentow,
- nowy modul backendowy dla propozycji wspolpracy,
- endpointy dla agenta: lista otwartych ofert, zlozenie propozycji, lista i
  edycja wlasnych propozycji,
- endpointy dla wlasciciela: lista propozycji dla jego ofert, szczegoly,
  akceptacja, odrzucenie,
- prosty czat tekstowy w kontekscie propozycji,
- powiadomienia email / in-app dla nowej propozycji, nowej wiadomosci i decyzji,
- widok zaakceptowanych przejec po stronie agenta,
- akcja "Utworz oferte w CRM" z zaakceptowanej wspolpracy,
- testy backendowe dla uprawnien, statusow i zakresu danych.

### Poza MVP

- platne promowanie ofert szukajacych agentow,
- ranking agentow i automatyczne rekomendacje,
- automatyczne generowanie umowy posrednictwa,
- podpis elektroniczny,
- escrow / platnosci za lead,
- rozbudowane SLA odpowiedzi,
- zalaczniki w czacie,
- grupowy czat z wieloma agentami w jednym watku,
- automatyczna publikacja na portalach zewnetrznych,
- system ocen wlascicieli i agentow.

---

## 4. Decyzje produktowe

- [x] `ATD1` Czy wlasciciel moze wybrac wielu agentow?
  - Rekomendacja: tak, ale jako jawny tryb wspolpracy. Domyslnie wybiera jednego
    agenta, a opcja wielu agentow musi byc wlaczona przez wlasciciela.
  - Data decyzji: 2026-07-22
  - Decyzja: wdrazamy zgodnie z rekomendacja. Domyslny tryb to wybor jednego
    agenta, a wybor wielu agentow jest osobna, jawna opcja po stronie
    wlasciciela.

- [x] `ATD2` Czy zaakceptowany agent dostaje prawo edycji oryginalnej oferty, czy
  tworzy wlasna kopie?
  - Rekomendacja: w MVP tworzyc powiazana kopie w CRM agenta. Oryginalna oferta
    wlasciciela pozostaje zrodlem prawdy i nie jest edytowana bezposrednio przez
    agenta.
  - Data decyzji: 2026-07-22
  - Decyzja: zaakceptowany agent tworzy powiazana kopie oferty w swoim CRM.
    Zmiany agenta dotycza tylko jego kopii i nie modyfikuja oryginalnej oferty
    wlasciciela.

- [x] `ATD3` Czy oferta po akceptacji agenta nadal przyjmuje nowe propozycje?
  - Rekomendacja: zalezy od trybu:
    - `single_agent`: po akceptacji zamykamy nabor,
    - `multi_agent`: nabor moze pozostac otwarty do limitu zaakceptowanych
      agentow albo recznego zamkniecia.
  - Data decyzji: 2026-07-22
  - Decyzja: wdrazamy zgodnie z rekomendacja. W trybie `single_agent`
    akceptacja zamyka nabor. W trybie `multi_agent` nabor moze zostac otwarty do
    limitu zaakceptowanych agentow albo recznego zamkniecia przez wlasciciela.

- [x] `ATD4` Czy agenci widza dane kontaktowe wlasciciela przed akceptacja?
  - Rekomendacja: nie. Przed akceptacja komunikacja idzie przez platforme, a dane
    kontaktowe sa ujawniane dopiero po akceptacji albo pozostaja ukryte, jesli
    wlasciciel tak wybierze.
  - Data decyzji: 2026-07-22
  - Decyzja: przed akceptacja agent widzi tylko informacje juz udostepnione w
    publicznym ogloszeniu. Prywatne dane kontaktowe wlasciciela nie sa ujawniane
    przez formularz, rynek ofert ani propozycje.

- [x] `ATD5` Czy ta funkcja ma byc elementem planow platnych dla agentow?
  - Rekomendacja: katalog ofert otwartych na wspolprace jako value prop dla
    agentow, ale limity skladanych propozycji powiazac z planem.
  - Data decyzji: 2026-07-22
  - Decyzja: funkcja jest value proposition dla platnych planow agentow. Plan
    Free nie daje dostepu do skladania propozycji wspolpracy ani pelnego rynku
    ofert szukajacych agenta. UI moze pokazac zablokowany teaser/CTA upgrade, ale
    backend musi egzekwowac brak dostepu w planie Free.

- [x] `ATD6` Jak nazwac funkcje w UI?
  - Propozycje:
    - dla wlasciciela: `Wspolpraca z agentami`,
    - dla agenta: `Oferty szukajace agenta`,
    - dla propozycji: `Oferta wspolpracy`,
    - unikac slowa `przejecie` w glownym UI, bo moze brzmiec zbyt agresywnie dla
      wlasciciela. W dokumentacji technicznej mozemy uzywac `takeover`.
  - Data decyzji: 2026-07-22
  - Decyzja: uzywamy proponowanych nazw:
    - wlasciciel: `Wspolpraca z agentami`,
    - agent: `Oferty szukajace agenta`,
    - propozycja: `Oferta wspolpracy`.
    W glownym UI unikamy slowa `przejecie`; moze zostac w nazwach technicznych,
    jesli bedzie czytelne dla zespolu.

---

## 5. Zasady architektury i jakosci

1. Oryginalna oferta wlasciciela pozostaje pod kontrola wlasciciela.
2. Agent nie moze edytowac oryginalnej oferty tylko dlatego, ze wyslal
   propozycje.
3. Akceptacja propozycji tworzy osobny byt uprawnieniowy, np.
   `ListingAgentAssignment`, a nie tylko zmienia status propozycji.
4. Kopia oferty w CRM agenta powinna miec relacje do oryginalnej oferty:
   `sourceListingId` albo `agentAssignmentId`.
5. Nie dublujemy mapperow publicznych ofert. Lista ofert szukajacych agentow
   powinna uzywac bezpiecznego kształtu zblizonego do `PublicListingCatalogItem`
   plus pola rynku wspolpracy.
6. Dane kontaktowe wlasciciela nie moga trafic do publicznych payloadow ani do
   listy rynku dla agentow.
7. Formularz propozycji jest endpointem chronionym i wymaga roli `agent`.
8. Konto `viewer` / private seller widzi tylko swoje oferty i propozycje
   dotyczace swoich ofert.
9. Statusy propozycji powinny byc jednoznaczne i nie wynikac z kilku booli.
10. Czat powinien byc powiazany z propozycja wspolpracy, nie z sama oferta, zeby
    zachowac izolacje rozmow z roznymi agentami.
11. Wiadomosci i decyzje powinny miec audit trail: kto, kiedy, jaki status.
12. Akceptacja propozycji musi byc transakcyjna: zmiana statusu, utworzenie
    assignmentu i powiadomienie nie moga rozjechac stanu.
13. Wszystkie limity ofert/propozycji po stronie planow powinny byc egzekwowane
    na backendzie, nie tylko ukrywane w UI.
14. Wdrozenie powinno isc za feature flaga, np. `agentListingTakeover`.

---

## 6. Proponowany model domenowy

### Rozszerzenie `Listing`

Pola:

- `agentCollaborationEnabled: boolean`
- `agentCollaborationMode: 'single_agent' | 'multi_agent' | null`
- `agentCollaborationStatus: 'open' | 'paused' | 'closed' | 'assigned' | null`
- `agentCollaborationPreferences: jsonb | null`
- `agentCollaborationOpenedAt: Date | null`
- `agentCollaborationClosedAt: Date | null`

`agentCollaborationPreferences` w MVP:

- `allowsExclusiveAgreement?: boolean`
- `allowsMultipleAgents?: boolean`
- `preferredCommissionType?: 'percentage' | 'fixed' | null`
- `preferredCommissionValue?: number | null`
- `expectedServices?: string[]`
- `notes?: string`
- `preferredContactChannel?: 'platform_chat' | 'phone_after_acceptance'`

Te pola powinny byc ustawiane z `PublicListingSubmission` i panelu wlasciciela.
Jesli oferta powstaje z wizardu `/dodaj-oferte`, checkbox powinien zapisac dane
w submission payload/kolumnach, a mapowanie do `Listing` powinno przeniesc je na
opublikowana oferte.

### `ListingAgentProposal`

Reprezentuje propozycje zlozona przez agenta dla oferty wlasciciela.

Pola:

- `id`
- `listingId`
- `ownerUserId`
- `agentId`
- `agencyId`
- `status`: `draft`, `sent`, `updated`, `accepted`, `rejected`,
  `withdrawn`, `expired`, `closed`
- `commissionType`: `percentage` / `fixed` / `mixed` / `none`
- `commissionValue`
- `minimumContractMonths`
- `exclusivity`: `exclusive`, `open`, `flexible`
- `services`: lista zakresow obslugi
- `marketingPlan`
- `valuationOpinion`
- `proposedPrice`
- `availability`
- `message`
- `validUntil`
- `acceptedAt`
- `rejectedAt`
- `withdrawnAt`
- `createdAt`
- `updatedAt`

Ograniczenia:

- unikalny aktywny rekord `(listing_id, agent_id)` dla statusow roboczych /
  wyslanych,
- indeks `(agent_id, status, created_at)` dla zakladki wyslanych propozycji,
- indeks `(owner_user_id, status, created_at)` dla panelu wlasciciela,
- indeks `(listing_id, status, created_at)` dla szczegolow oferty.

### `ListingAgentProposalMessage`

Czat w kontekscie jednej propozycji.

Pola:

- `id`
- `proposalId`
- `senderUserId`
- `body`
- `createdAt`
- `readAt`
- opcjonalnie `metadata`

MVP: tylko tekst, bez zalacznikow. Nadawca musi byc wlascicielem oferty albo
uzytkownikiem przypisanym do agenta, ktory zlozyl propozycje.

### `ListingAgentAssignment`

Powstaje po akceptacji propozycji.

Pola:

- `id`
- `listingId`
- `proposalId`
- `ownerUserId`
- `agentId`
- `agencyId`
- `status`: `active`, `revoked`, `completed`
- `acceptedTermsSnapshot: jsonb`
- `agentListingId: uuid | null`
- `createdAt`
- `revokedAt`
- `completedAt`

To jest docelowe zrodlo uprawnien po akceptacji. Nie nalezy sprawdzac dostepu
agenta wylacznie po `ListingAgentProposal.status = accepted`.

---

## 7. Formularz skladania oferty wspolpracy

### Widocznosc

Na publicznej stronie oferty:

- anonimowy uzytkownik widzi tylko informacje, ze wlasciciel jest otwarty na
  wspolprace z agentem oraz CTA do logowania/rejestracji jako agent,
- konto `viewer` / private seller nie widzi formularza skladania propozycji,
- konto `agent` widzi formularz, jesli oferta jest otwarta na wspolprace i agent
  nie jest wlascicielem tej oferty,
- agent z juz wyslana propozycja widzi status i CTA do edycji / rozmowy.

### Pola MVP

Sekcja `Warunki finansowe`:

- typ prowizji: procent / kwota / do ustalenia,
- wartosc prowizji,
- informacja, czy prowizja jest brutto/netto, jesli bedzie to wymagane
  produktowo,
- kto placi prowizje: wlasciciel / kupujacy / do ustalenia.

Sekcja `Zakres uslug`:

- przygotowanie opisu i zdjec,
- home staging / rekomendacje przygotowania,
- publikacja na portalach,
- obsluga telefonow i leadow,
- prezentacje nieruchomosci,
- negocjacje,
- dokumenty i finalizacja transakcji,
- inne.

Sekcja `Model wspolpracy`:

- umowa na wylacznosc / otwarta / elastyczna,
- minimalny czas umowy,
- obszar dzialania agenta,
- dostepnosc pierwszego kontaktu.

Sekcja `Propozycja agenta`:

- krotka wiadomosc do wlasciciela,
- proponowana strategia sprzedazy / wynajmu,
- opcjonalna sugerowana cena,
- opcjonalne uzasadnienie wyceny,
- termin waznosci propozycji.

Walidacja:

- wiadomosc 20-2000 znakow,
- prowizja procentowa 0-100,
- kwota prowizji >= 0,
- termin waznosci nie w przeszlosci,
- lista uslug nie moze byc pusta,
- agent nie moze wyslac propozycji do wlasnej oferty,
- agent nie moze wyslac drugiej aktywnej propozycji do tej samej oferty.

---

## 8. Kontrakt API

### Publiczne / mieszane

- `GET /api/listings/public/:slug`
  - dodaje bezpieczne pola:
    - `agentCollaborationEnabled`,
    - `agentCollaborationStatus`,
    - ewentualnie lekki tekst CTA,
  - nie zwraca danych prywatnych wlasciciela ani propozycji agentow.

### Agent

- `GET /api/agent-listing-market`
  - lista ofert otwartych na wspolprace,
  - filtry: lokalizacja, typ, transakcja, cena, data, tryb wspolpracy,
  - zwraca publiczny kształt oferty plus metadane wspolpracy.

- `POST /api/listing-agent-proposals/listings/:listingId`
  - sklada propozycje dla oferty,
  - wymaga roli `agent`.

- `GET /api/listing-agent-proposals/agent`
  - lista propozycji wyslanych przez biezacego agenta.

- `GET /api/listing-agent-proposals/agent/:id`
  - szczegoly propozycji, wiadomosci, decyzje.

- `PATCH /api/listing-agent-proposals/agent/:id`
  - edycja propozycji, tylko w statusach `sent` / `updated`.

- `POST /api/listing-agent-proposals/agent/:id/withdraw`
  - wycofanie propozycji.

- `POST /api/listing-agent-assignments/:id/create-listing-copy`
  - tworzy dashboardowa oferte agenta na bazie zaakceptowanego assignmentu.

### Wlasciciel

- `GET /api/listing-agent-proposals/seller`
  - lista propozycji otrzymanych dla ofert biezacego wlasciciela.

- `GET /api/listing-agent-proposals/seller/:id`
  - szczegoly propozycji i czat.

- `POST /api/listing-agent-proposals/seller/:id/accept`
  - akceptuje propozycje i tworzy assignment.

- `POST /api/listing-agent-proposals/seller/:id/reject`
  - odrzuca propozycje.

- `POST /api/listings/seller/:id/collaboration/open`
  - wlacza nabor agentow dla oferty wlasciciela.

- `POST /api/listings/seller/:id/collaboration/close`
  - zamyka nabor agentow.

### Czat

- `GET /api/listing-agent-proposals/:id/messages`
- `POST /api/listing-agent-proposals/:id/messages`

Kontroler moze byc wspolny, ale serwis musi jednoznacznie sprawdzac, czy
uzytkownik jest wlascicielem oferty albo agentem powiazanym z propozycja.

---

## 9. UX i nawigacja

### Publiczna strona oferty

Jesli `agentCollaborationEnabled = true`:

- pokazac spokojny panel informacyjny:
  `Wlasciciel jest otwarty na wspolprace z agentem nieruchomosci`,
- dla anonimowego uzytkownika pokazac CTA:
  `Zaloguj sie jako agent, aby zlozyc propozycje`,
- dla konta agenta pokazac formularz albo CTA:
  `Zloz oferte wspolpracy`,
- dla pozostalych kont pokazac tylko informacje bez formularza.

### Dashboard agenta

Nowe pozycje w nawigacji:

- `Oferty szukajace agenta` - rynek ofert,
- `Wyslane propozycje` - propozycje agenta z mozliwoscia edycji,
- opcjonalnie pozniej `Przejete oferty` - zaakceptowane assignmenty i kopie w
  CRM.

Widok rynku powinien byc bardziej operacyjny niz marketingowy:

- tabela/lista z kartami ofert,
- szybkie filtry,
- status czy agent juz wyslal propozycje,
- CTA do szczegolow i skladania propozycji,
- zachowanie publicznej prywatnosci danych wlasciciela.

### Panel wlasciciela `/seller`

Nowe widoki:

- zakladka / sekcja `Wspolpraca z agentami`,
- przy kazdej ofercie licznik propozycji,
- szczegoly propozycji z porownywalnymi warunkami,
- czat,
- akcje: `Akceptuj`, `Odrzuc`, `Popros o doprecyzowanie`, `Zamknij nabor`.

---

## 10. Sprinty

### Sprint AT-0 - Discovery i decyzje produktowe

**Cel sprintu:**
Domknac nazewnictwo, statusy, tryb wielu agentow, uprawnienia i zakres MVP.

**Rezultat sprintu:**
Zakres MVP, nazewnictwo, punkty integracji, zasady planow platnych i eventy
analityczne sa doprecyzowane na tyle, zeby Sprint AT-1 mogl zaczac sie od modelu
danych bez przebudowy zalozen domenowych.

#### Zadania

- [x] `AT0.1` Potwierdzic decyzje `ATD1`-`ATD6`.
  - Data zakonczenia: 2026-07-22
  - Wykonano: potwierdzono wszystkie decyzje produktowe z sekcji 4.
  - Decyzje:
    - wlasciciel moze wybrac wielu agentow tylko po jawnym wlaczeniu trybu
      `multi_agent`,
    - zaakceptowany agent tworzy powiazana kopie oferty w swoim CRM i nie edytuje
      oryginalu wlasciciela,
    - `single_agent` zamyka nabor po akceptacji, a `multi_agent` moze przyjmowac
      kolejne propozycje do limitu albo recznego zamkniecia,
    - przed akceptacja agent widzi tylko dane juz udostepnione publicznie w
      ogloszeniu,
    - funkcja jest dostepna w platnych planach agentow, a plan Free dostaje
      najwyzej teaser/CTA upgrade,
    - nazwy UI: `Wspolpraca z agentami`, `Oferty szukajace agenta`, `Oferta
      wspolpracy`.

- [x] `AT0.2` Przejrzec obecny flow `/dodaj-oferte`, `/seller` i
  `public-listing-submissions`, aby wskazac dokladne miejsca integracji.
  - Data zakonczenia: 2026-07-22
  - Wykonano:
    - publiczny wizard `/dodaj-oferte` korzysta z
      `CreatePublicListingSubmissionInput` i wysyla dane do
      `POST /api/public-listing-submissions`,
    - zalogowany wlasciciel tworzy submission przez
      `POST /api/public-listing-submissions/seller`,
    - panel `/seller` pobiera i edytuje oferty wlasciciela przez endpointy
      `GET/PATCH /api/public-listing-submissions/seller/:id`,
    - backend trzyma wlasciciela w `PublicListingSubmission.ownerUserId` oraz
      `Listing.ownerUserId`,
    - opublikowana oferta wlasciciela ma `publishedListingId`, wiec przyszly
      model propozycji powinien laczyc sie docelowo z `Listing`, a panel
      wlasciciela moze agregowac licznik propozycji po `publishedListingId`,
    - obecny flow claim/publikacji tworzy `Listing` z danych submission, wiec
      pola wspolpracy trzeba utrzymac zarowno na submission/payload, jak i na
      finalnej encji `Listing`.
  - Decyzja techniczna: nie tworzymy osobnego modelu "seller listing" dla tej
    funkcji. Integrujemy sie z istniejacym `PublicListingSubmission` i
    `Listing.ownerUserId`, a logike propozycji trzymamy w osobnym module
    domenowym.

- [x] `AT0.3` Ustalic finalne nazwy endpointow i encji.
  - Data zakonczenia: 2026-07-22
  - Wykonano: ustalono nazwy techniczne na MVP.
  - Encje:
    - `ListingAgentProposal`,
    - `ListingAgentProposalMessage`,
    - `ListingAgentAssignment`.
  - Moduly:
    - `listing-agent-proposals` - propozycje, decyzje wlasciciela i czat,
    - `agent-listing-market` - wyszukiwarka ofert szukajacych agenta,
    - opcjonalnie osobny `listing-agent-assignments`, jesli serwis assignmentow
      zacznie rosnac poza akceptacje i tworzenie kopii.
  - Endpointy MVP:
    - `GET /api/agent-listing-market`,
    - `POST /api/listing-agent-proposals/listings/:listingId`,
    - `GET /api/listing-agent-proposals/agent`,
    - `GET /api/listing-agent-proposals/agent/:id`,
    - `PATCH /api/listing-agent-proposals/agent/:id`,
    - `POST /api/listing-agent-proposals/agent/:id/withdraw`,
    - `GET /api/listing-agent-proposals/seller`,
    - `GET /api/listing-agent-proposals/seller/:id`,
    - `POST /api/listing-agent-proposals/seller/:id/accept`,
    - `POST /api/listing-agent-proposals/seller/:id/reject`,
    - `GET /api/listing-agent-proposals/:id/messages`,
    - `POST /api/listing-agent-proposals/:id/messages`,
    - `POST /api/listing-agent-assignments/:id/create-listing-copy`.
  - Uwagi / follow-up: endpointy `seller` musza byc scope'owane po
    `ownerUserId`, a endpointy `agent` po `agentId` wyliczonym z biezacego
    uzytkownika. Nie przekazujemy `agentId` ani `ownerUserId` z frontendu jako
    zrodla uprawnien.

- [x] `AT0.4` Sprawdzic obecny system planow i zdecydowac, czy MVP limituje
  liczbe propozycji dla agentow.
  - Data zakonczenia: 2026-07-22
  - Wykonano:
    - system planow ma `AgencyPlanFeatures` i `AgencyPlanLimits`,
    - obecne feature checks uzywaja `access.entitlements.features.*` oraz
      `FeatureAccessDeniedException`,
    - Free ma aktualnie czesc funkcji publicznych wlaczonych, dlatego tej nowej
      funkcji nie nalezy sprawdzac po samym `publicListings`,
    - release flags sa osobnym mechanizmem i powinny sluzyc do rollout'u, a nie
      do docelowego rozliczania planow.
  - Decyzja techniczna: dodajemy nowe entitlement feature
    `agentListingMarket`. Dla `free` ustawiamy `false`, dla platnych planow
    `true`, z mozliwoscia override w `PlanCatalog`.
  - Decyzja MVP: w pierwszej implementacji blokujemy dostep w planie Free, ale
    nie wprowadzamy jeszcze twardego miesiecznego limitu liczby propozycji.
    Licznik propozycji i eventy analityczne dodajemy od razu, zeby pozniej moc
    bezpiecznie wprowadzic limit per plan.

- [x] `AT0.5` Przygotowac eventy analityczne i metryki sukcesu.
  - Data zakonczenia: 2026-07-22
  - Wykonano: ustalono minimalny zestaw eventow i metryk.
  - Eventy do dodania po stronie web i API:
    - `agent_collaboration_enabled`,
    - `agent_collaboration_disabled`,
    - `agent_listing_market_viewed`,
    - `agent_listing_market_result_opened`,
    - `listing_agent_proposal_started`,
    - `listing_agent_proposal_submitted`,
    - `listing_agent_proposal_updated`,
    - `listing_agent_proposal_withdrawn`,
    - `listing_agent_proposal_viewed_by_seller`,
    - `listing_agent_proposal_message_sent`,
    - `listing_agent_proposal_accepted`,
    - `listing_agent_proposal_rejected`,
    - `listing_agent_assignment_listing_copy_created`,
    - `agent_listing_market_upgrade_cta_clicked`.
  - Metryki sukcesu:
    - liczba ofert z wlaczona wspolpraca,
    - procent publicznych ofert wlascicieli z wlaczona wspolpraca,
    - liczba agentow odwiedzajacych rynek ofert,
    - liczba wyslanych propozycji,
    - srednia liczba propozycji na oferte,
    - acceptance rate propozycji,
    - czas od publikacji oferty do pierwszej propozycji,
    - czas od pierwszej propozycji do akceptacji,
    - liczba utworzonych kopii w CRM po akceptacji,
    - upgrade CTA clicks z planu Free.
  - Uwagi / follow-up: API waliduje eventy przez zamknieta liste
    `ANALYTICS_EVENT_NAMES`, wiec Sprint AT-9 musi rozszerzyc liste eventow po
    stronie API i web jednoczesnie.

### Sprint AT-1 - Model danych, migracje i statusy

**Cel sprintu:**
Zbudowac fundament domenowy bez UI.

**Rezultat sprintu:**
Backend ma podstawowy model danych dla wspolpracy wlasciciel-agent: pola na
ofertach i submission, encje propozycji, wiadomosci i assignmentow, migracje SQL
oraz entitlement planu `agentListingMarket`. Statusy propozycji maja osobny
helper domenowy testowany bez bazy.

#### Zadania

- [x] `AT1.1` Dodac pola wspolpracy na `Listing`.
  - Data zakonczenia: 2026-07-22
  - Wykonano: dodano pola:
    - `agentCollaborationEnabled`,
    - `agentCollaborationMode`,
    - `agentCollaborationStatus`,
    - `agentCollaborationPreferences`,
    - `agentCollaborationOpenedAt`,
    - `agentCollaborationClosedAt`.
  - Uwagi / follow-up: preferencje sa `jsonb` z jawnie opisanym typem
    `ListingAgentCollaborationPreferences`. Rynek agentow bedzie filtrowal po
    kolumnach `enabled/status`, bez parsowania preferencji.

- [x] `AT1.2` Dodac pola wspolpracy do `PublicListingSubmission` albo jego
  `payload`, zgodnie z obecnym standardem migracji.
  - Data zakonczenia: 2026-07-22
  - Wykonano:
    - dodano te same pola wspolpracy na encji `PublicListingSubmission`,
    - rozszerzono `PublicListingSubmissionPayload` o `agentCollaboration`,
    - rozszerzono DTO create/update o `agentCollaboration`,
    - dodano mapowanie submission -> listing, zeby ustawienie nie znikalo przy
      claimie/publikacji,
    - rozszerzono frontendowy kontrakt
      `apps/web/src/lib/public-listing-submissions.ts`.
  - Uwagi / follow-up: UI checkboxa i preferencji zostaje w Sprint AT-6.

- [x] `AT1.3` Dodac encje `ListingAgentProposal`.
  - Data zakonczenia: 2026-07-22
  - Wykonano: dodano encje `ListingAgentProposal` z relacjami do `Listing`,
    `User` wlasciciela, `Agent` i opcjonalnej `Agency`; dodano pola statusu,
    prowizji, wylacznosci, uslug, strategii, wyceny, wiadomosci i terminow.
  - Uwagi / follow-up: aktywny duplikat propozycji jednego agenta dla jednej
    oferty jest blokowany unikalnym indeksem czesciowym dla statusow
    `draft/sent/updated`.

- [x] `AT1.4` Dodac encje `ListingAgentProposalMessage`.
  - Data zakonczenia: 2026-07-22
  - Wykonano: dodano encje `ListingAgentProposalMessage` z relacja do propozycji,
    nadawcy, trescia, `readAt`, `metadata` i indeksem
    `(proposal_id, created_at)`.
  - Uwagi / follow-up: MVP obsluguje tylko tekst. Zalaczniki zostaja poza AT-1.

- [x] `AT1.5` Dodac encje `ListingAgentAssignment`.
  - Data zakonczenia: 2026-07-22
  - Wykonano: dodano encje `ListingAgentAssignment` z relacja do oryginalnej
    oferty, propozycji, wlasciciela, agenta, agencji oraz opcjonalnej kopii
    oferty agenta `agentListingId`.
  - Uwagi / follow-up: assignment jest docelowym zrodlem uprawnien po
    akceptacji, a nie sam status propozycji.

- [x] `AT1.6` Przygotowac migracje SQL z indeksami i constraintami.
  - Data zakonczenia: 2026-07-22
  - Wykonano: dodano migracje
    `apps/api/migrations/20260722_agent_listing_takeover_foundation.sql`.
    Migracja tworzy enumy Postgresa, kolumny na `listings` i
    `public_listing_submissions`, tabele `listing_agent_proposals`,
    `listing_agent_proposal_messages`, `listing_agent_assignments`, indeksy
    query oraz constrainty `jsonb_typeof`.
  - Uwagi / follow-up: migracja aktualizuje `plan_catalog.features` o
    `agentListingMarket` dla istniejacych planow systemowych.

- [x] `AT1.7` Dodac enumy statusow w `common/enums`.
  - Data zakonczenia: 2026-07-22
  - Wykonano: dodano enumy:
    - `ListingAgentCollaborationMode`,
    - `ListingAgentCollaborationStatus`,
    - `ListingAgentProposalStatus`,
    - `ListingAgentProposalCommissionType`,
    - `ListingAgentProposalExclusivity`,
    - `ListingAgentAssignmentStatus`.

- [x] `AT1.8` Dodac entitlement feature `agentListingMarket` do
  `AgencyPlanFeatures`, domyslnego katalogu planow, `PlanCatalog`, odpowiedzi
  auth i typow web.
  - Wymagania:
    - `free: false`,
    - platne plany: `true`,
    - zachowac override'y planow z panelu admina,
    - dodac testy fallbacku i katalogu planow.
  - Data zakonczenia: 2026-07-22
  - Wykonano:
    - dodano `agentListingMarket` do backendowego `AgencyPlanFeatures`,
    - ustawiono `free: false`, `starter/professional/enterprise/custom: true`,
    - rozszerzono normalizacje feature overrides,
    - rozszerzono DTO admina i wymagane klucze planow,
    - rozszerzono typy web `AuthUser`, `billing-plans` i panel admina planow,
    - dodano testy planow i DTO admina.
  - Uwagi / follow-up: Sprint AT-2 musi egzekwowac ten entitlement na endpointach
    rynku agentow.

- [x] `AT1.9` Dodac testy jednostkowe przejsc statusow.
  - Data zakonczenia: 2026-07-22
  - Wykonano: dodano helper
    `apps/api/src/listing-agent-proposals/listing-agent-proposal-status.ts` oraz
    testy `listing-agent-proposal-status.spec.ts`.
  - Zakres testow:
    - edytowalne statusy `sent/updated`,
    - dozwolone przejscia `draft -> sent`, `sent -> updated`,
      `updated -> accepted`, `accepted -> closed`,
    - brak mozliwosci ponownego otwierania `rejected/withdrawn`,
    - idempotentne przejscie do tego samego statusu jako bezpieczny no-op.

#### Weryfikacja

- `pnpm --filter api type-check` - przechodzi.
- `pnpm --filter api test -- listing-agent-proposal-status.spec.ts agency-plan.service.spec.ts update-plan.dto.spec.ts update-agency-plan.dto.spec.ts public-listing-submissions.service.spec.ts` - przechodzi.
- `pnpm --filter web type-check` - przechodzi.

### Sprint AT-2 - Backend: rynek ofert dla agentow

**Cel sprintu:**
Udostepnic agentom liste ofert, ktore szukaja wspolpracy.

**Rezultat sprintu:**
Powstal backendowy endpoint rynku ofert dla agentow:
`GET /api/agent-listing-market`. Endpoint zwraca tylko publicznie dostepne,
aktywne oferty wlascicieli z otwarta wspolpraca, obsluguje podstawowe filtry i
paginacje, wskazuje czy biezacy agent ma juz propozycje dla danej oferty oraz
jest zabezpieczony rola `agent` i entitlementem `agentListingMarket`.

#### Zadania

- [x] `AT2.1` Dodac modul `agent-listing-market`.
  - Data zakonczenia: 2026-07-22
  - Wykonano: dodano modul `AgentListingMarketModule`, kontroler, serwis, DTO
    query, typy odpowiedzi i eksport modulu. Modul zostal podpiety w
    `AppModule`.
  - Endpoint: `GET /api/agent-listing-market`.

- [x] `AT2.2` Zbudowac query listy ofert z filtrami i paginacja.
  - Data zakonczenia: 2026-07-22
  - Wykonano: serwis filtruje oferty po:
    - `agentCollaborationEnabled = true`,
    - `agentCollaborationStatus = open`,
    - `ownerUserId IS NOT NULL`,
    - oferta aktywna, opublikowana, z `publicSlug`, `publishedAt` i bez
      wygasniecia,
    - oferta nie nalezy do biezacego agenta.
  - Filtry query:
    - `propertyType`,
    - `transactionType`,
    - `collaborationMode`,
    - `city`,
    - `search`,
    - `priceMin`,
    - `priceMax`,
    - `page`,
    - `limit`,
    - `sortBy`,
    - `sortOrder`.
  - Uwagi / follow-up: domyslne sortowanie idzie po
    `agentCollaborationOpenedAt`, z dodatkowym stabilnym sortowaniem po
    `listing.id`.

- [x] `AT2.3` Uzyc bezpiecznego mappera publicznego bez danych kontaktowych
  wlasciciela.
  - Data zakonczenia: 2026-07-22
  - Wykonano: odpowiedz bazuje na bezpiecznym ksztalcie zblizonym do
    `PublicListingCatalogItem` i dodaje tylko sekcje `collaboration`.
  - Prywatnosc: payload nie zawiera `ownerUser`, emaila, telefonu ani danych
    kontaktowych wlasciciela. Zwracane sa tylko dane publicznej oferty,
    publiczne dane agenta/oferty oraz preferencje wspolpracy.
  - Uwagi / follow-up: mapper jest lokalny dla `agent-listing-market`, zeby nie
    uzalezniac tego modulu od calego `ListingsService`. Jesli mappery publiczne
    zaczna sie powtarzac w kolejnych sprintach, warto wydzielic wspolny
    `public-listing-mapper`.

- [x] `AT2.4` Dodac informacje, czy biezacy agent juz wyslal propozycje.
  - Data zakonczenia: 2026-07-22
  - Wykonano: serwis jednym zbiorczym query pobiera propozycje biezacego agenta
    dla listingow z aktualnej strony i ustawia `hasSubmittedProposal`.
  - Uwagi / follow-up: na etapie AT-2 nie filtrujemy jeszcze po statusach
    propozycji, bo statusowe zachowanie skladania/edycji propozycji nalezy do
    AT-3.

- [x] `AT2.5` Zabezpieczyc endpoint rola `agent` oraz entitlementem
  `agentListingMarket`.
  - Data zakonczenia: 2026-07-22
  - Wykonano:
    - kontroler ma `@Roles(UserRole.AGENT)`,
    - endpoint nie jest publiczny,
    - serwis pobiera access context przez `UsersService.getAgencyAccessContext`,
    - plan Free bez `agentListingMarket` dostaje `FeatureAccessDeniedException`.
  - Uwagi / follow-up: frontend moze pokazac teaser/CTA upgrade, ale backend
    pozostaje zrodlem prawdy dla blokady planu.

- [x] `AT2.6` Dodac testy: brak autoryzacji, zla rola, tylko otwarte oferty,
  brak prywatnych danych.
  - Data zakonczenia: 2026-07-22
  - Wykonano:
    - dodano `agent-listing-market.controller.spec.ts`,
    - dodano `agent-listing-market.service.spec.ts`.
  - Zakres testow:
    - kontroler deleguje do serwisu,
    - endpoint nie ma `@Public`,
    - kontroler wymaga `UserRole.AGENT`,
    - serwis blokuje Free przez `FeatureAccessDeniedException`,
    - query wymusza otwarta wspolprace, publicznosc oferty i wykluczenie ofert
      biezacego agenta,
    - filtry i paginacja sa przekazywane do query buildera,
    - odpowiedz nie zawiera `ownerUser`,
    - `hasSubmittedProposal` jest ustawiane z jednego zbiorczego query.
  - Uwagi / follow-up: testy 401/403 globalnych guardow moga zostac dodane w E2E
    przy AT-9. W AT-2 zabezpieczono kontrakt przez metadane kontrolera i testy
    serwisu.

#### Weryfikacja

- `pnpm --filter api type-check` - przechodzi.
- `pnpm --filter api test -- agent-listing-market.service.spec.ts agent-listing-market.controller.spec.ts` - przechodzi.

#### Poza zakresem AT-2

- Skladanie, edycja i wycofanie propozycji zostaje w Sprint AT-3.
- UI dashboardu agenta zostaje w Sprint AT-7.

### Sprint AT-3 - Backend: propozycje wspolpracy

**Cel sprintu:**
Pozwolic agentowi skladac, edytowac i wycofywac propozycje.

#### Zadania

- [x] `AT3.1` Dodac DTO formularza propozycji z walidacja.
  - Data zakonczenia: 2026-07-22
  - Wykonano:
    - `ListingAgentProposalInputDto`,
    - `UpdateListingAgentProposalDto`,
    - `ListingAgentProposalQueryDto`.
  - Zakres walidacji:
    - typ prowizji i opcjonalna wartosc prowizji,
    - minimalny okres umowy,
    - typ wylacznosci,
    - lista uslug `1..20`,
    - plan marketingowy,
    - opinia wyceny,
    - proponowana cena,
    - dostepnosc,
    - wiadomosc do wlasciciela,
    - data waznosci propozycji.

- [x] `AT3.2` Dodac endpoint skladania propozycji.
  - Data zakonczenia: 2026-07-22
  - Wykonano: dodano `ListingAgentProposalsModule`, kontroler i serwis.
  - Endpoint:
    - `POST /api/listing-agent-proposals/listings/:listingId`.
  - Reguly backendowe:
    - endpoint wymaga roli `agent`,
    - backend wymaga entitlementu `agentListingMarket`,
    - Free plan dostaje `FeatureAccessDeniedException`,
    - agent nie moze zlozyc propozycji do swojej oferty,
    - oferta musi miec wlaczona i otwarta wspolprace,
    - oferta musi byc publiczna, aktywna, opublikowana i niewygasla,
    - wlasciciel musi byc powiazany z oferta,
    - aktywny duplikat propozycji tego samego agenta jest blokowany.

- [x] `AT3.3` Dodac endpoint listy wyslanych propozycji agenta.
  - Data zakonczenia: 2026-07-22
  - Endpoint:
    - `GET /api/listing-agent-proposals/agent`.
  - Filtry query:
    - `status`,
    - `listingId`,
    - `page`,
    - `limit`,
    - `sortBy`,
    - `sortOrder`.
  - Odpowiedz zawiera znormalizowany payload propozycji, podsumowanie oferty i
    publiczne podsumowanie agenta/agencji.

- [x] `AT3.4` Dodac endpoint szczegolow propozycji agenta.
  - Data zakonczenia: 2026-07-22
  - Endpoint:
    - `GET /api/listing-agent-proposals/agent/:id`.
  - Bezpieczenstwo: agent moze pobrac tylko propozycje, gdzie
    `proposal.agentId` nalezy do biezacego agenta.

- [x] `AT3.5` Dodac edycje propozycji tylko dla dozwolonych statusow.
  - Data zakonczenia: 2026-07-22
  - Endpoint:
    - `PATCH /api/listing-agent-proposals/agent/:id`.
  - Wykonano: edycja uzywa wspolnej normalizacji i walidacji danych.
  - Reguly statusow:
    - edytowalne: `draft`, `sent`, `updated`,
    - nieedytowalne: statusy terminalne i decyzyjne, np. `accepted`,
      `rejected`, `withdrawn`, `expired`, `closed`.
  - Po edycji status przechodzi na `updated`.

- [x] `AT3.6` Dodac wycofanie propozycji.
  - Data zakonczenia: 2026-07-22
  - Endpoint:
    - `POST /api/listing-agent-proposals/agent/:id/withdraw`.
  - Wykonano: wycofanie uzywa helpera przejsc statusow i ustawia
    `withdrawnAt`.

- [x] `AT3.7` Dodac transakcyjne eventy/powiadomienia dla wlasciciela.
  - Data zakonczenia: 2026-07-22
  - Wykonano w zakresie AT-3: po zapisaniu nowej propozycji serwis wysyla
    minimalne powiadomienie email do wlasciciela przez istniejacy
    `EmailService`.
  - Uwagi / follow-up: trwale notyfikacje in-app, analytics eventy i ewentualny
    outbox transakcyjny warto dopiac w AT-4/AT-9, gdy dojdzie panel
    wlasciciela i decyzje.

- [x] `AT3.8` Dodac testy race condition i duplikatu aktywnej propozycji.
  - Data zakonczenia: 2026-07-22
  - Wykonano:
    - test blokady istniejacej aktywnej propozycji przed zapisem,
    - test mapowania bledu unikalnego indeksu PostgreSQL `23505` na
      `ConflictException`, czyli scenariusz race condition,
    - testy walidacji prowizji,
    - testy blokady Free planu,
    - testy listy wyslanych propozycji,
    - testy edycji i wycofania,
    - testy metadanych kontrolera: endpointy nie sa publiczne i wymagaja roli
      `agent`.

#### Weryfikacja

- `pnpm --filter api type-check` - przechodzi.
- `pnpm --filter api test -- listing-agent-proposals.service.spec.ts listing-agent-proposals.controller.spec.ts listing-agent-proposal-status.spec.ts` - przechodzi.

#### Poza zakresem AT-3

- Panel wlasciciela, akceptacja, odrzucenie i tworzenie
  `ListingAgentAssignment` zostaja w Sprint AT-4.
- Czat propozycji zostaje w Sprint AT-5.
- UI agenta i wlasciciela zostaje w Sprint AT-6/AT-7.

### Sprint AT-4 - Backend: panel wlasciciela i decyzje

**Cel sprintu:**
Pozwolic wlascicielowi porownywac propozycje i podejmowac decyzje.

#### Zadania

- [x] `AT4.1` Dodac endpoint listy propozycji otrzymanych przez wlasciciela.
  - Data zakonczenia: 2026-07-22
  - Endpoint:
    - `GET /api/listing-agent-proposals/seller`.
  - Wykonano: lista jest scope'owana po `proposal.ownerUserId = currentUser.id`.
  - Filtry query:
    - `status`,
    - `listingId`,
    - `page`,
    - `limit`,
    - `sortBy`,
    - `sortOrder`.

- [x] `AT4.2` Dodac szczegoly propozycji dla wlasciciela.
  - Data zakonczenia: 2026-07-22
  - Endpoint:
    - `GET /api/listing-agent-proposals/seller/:id`.
  - Bezpieczenstwo: wlasciciel moze pobrac tylko propozycje, gdzie
    `proposal.ownerUserId` zgadza sie z biezacym uzytkownikiem.

- [x] `AT4.3` Dodac akceptacje propozycji z utworzeniem
  `ListingAgentAssignment`.
  - Data zakonczenia: 2026-07-22
  - Endpoint:
    - `POST /api/listing-agent-proposals/seller/:id/accept`.
  - Wykonano: akceptacja dziala transakcyjnie przez `DataSource.transaction`.
  - W ramach transakcji:
    - propozycja jest pobierana z blokada `pessimistic_write`,
    - walidowany jest wlasciciel, status propozycji i wygasniecie
      `validUntil`,
    - walidowany jest otwarty nabor agentow na ofercie,
    - propozycja przechodzi na `accepted`,
    - tworzony jest `ListingAgentAssignment`,
    - zapisywany jest `acceptedTermsSnapshot`, czyli snapshot zaakceptowanych
      warunkow wspolpracy.
  - Race condition: unikalny konflikt assignmentu/propozycji z bazy jest
    mapowany na `ConflictException`.

- [x] `AT4.4` Dodac odrzucenie propozycji.
  - Data zakonczenia: 2026-07-22
  - Endpoint:
    - `POST /api/listing-agent-proposals/seller/:id/reject`.
  - Wykonano: odrzucenie sprawdza dozwolone przejscie statusu, ustawia
    `rejectedAt` i zwraca odpowiedz bez assignmentu.

- [x] `AT4.5` Obsluzyc tryb `single_agent` i `multi_agent`.
  - Data zakonczenia: 2026-07-22
  - `single_agent`:
    - po akceptacji listing przechodzi na
      `agentCollaborationStatus = assigned`,
    - ustawiane jest `agentCollaborationClosedAt`,
    - pozostale aktywne propozycje dla tej oferty przechodza na `closed`.
  - `multi_agent`:
    - akceptacja tworzy assignment, ale nabor pozostaje otwarty,
    - pozostale aktywne propozycje nie sa automatycznie zamykane.

- [x] `AT4.6` Dodac zamykanie i ponowne otwieranie naboru agentow.
  - Data zakonczenia: 2026-07-22
  - Endpointy:
    - `POST /api/listing-agent-proposals/seller/listings/:listingId/close-recruitment`,
    - `POST /api/listing-agent-proposals/seller/listings/:listingId/reopen-recruitment`.
  - Wykonano:
    - wlasciciel moze zamknac nabor tylko dla swojej oferty,
    - zamkniecie ustawia `agentCollaborationStatus = closed` i
      `agentCollaborationClosedAt`,
    - zamkniecie naboru nie zmienia statusow istniejacych propozycji, zeby
      wlasciciel mogl nadal je porownac albo wrocic do nich po ponownym
      otwarciu,
    - ponowne otwarcie ustawia `agentCollaborationEnabled = true`,
      `agentCollaborationStatus = open`, nowe `agentCollaborationOpenedAt` i
      czysci `agentCollaborationClosedAt`,
    - ponowne otwarcie jest dozwolone tylko dla aktywnej, opublikowanej,
      niewygaslej oferty z publicznym slugiem,
    - oferta ze statusem `assigned` nie moze byc recznie zamknieta ani
      ponownie otwarta w tym przeplywie.

- [x] `AT4.7` Dodac powiadomienia do agenta po akceptacji/odrzuceniu.
  - Data zakonczenia: 2026-07-22
  - Wykonano: po decyzji wlasciciela serwis wysyla minimalny email do agenta
    przez istniejacy `EmailService`.
  - Uwagi / follow-up: trwale notyfikacje in-app i analytics warto dodac w
    AT-9 razem z pelnym instrumentation.

- [x] `AT4.8` Dodac testy uprawnien: wlasciciel widzi tylko swoje oferty.
  - Data zakonczenia: 2026-07-22
  - Wykonano:
    - rozszerzono `listing-agent-proposals.controller.spec.ts`,
    - rozszerzono `listing-agent-proposals.service.spec.ts`.
  - Zakres testow:
    - seller endpoints deleguja do serwisu,
    - endpointy agenta maja role `agent`,
    - endpointy wlasciciela maja role `owner`,
    - lista wlasciciela filtruje po `ownerUserId`,
    - szczegoly wlasciciela pobieraja tylko propozycje danego ownera,
    - akceptacja tworzy assignment i snapshot warunkow,
    - `single_agent` zamyka nabor i pozostale aktywne propozycje,
    - `multi_agent` zostawia nabor otwarty,
    - odrzucenie ustawia status i powiadamia agenta,
    - reczne zamkniecie naboru aktualizuje status listingu,
    - reczne ponowne otwarcie naboru wymaga aktywnej publicznej oferty,
    - obcy wlasciciel nie moze sterowac naborem.

#### Weryfikacja

- `pnpm --filter api type-check` - przechodzi.
- `pnpm --filter api test -- listing-agent-proposals.service.spec.ts listing-agent-proposals.controller.spec.ts listing-agent-proposal-status.spec.ts` - przechodzi.

#### Poza zakresem AT-4

- UI porownywania propozycji po stronie wlasciciela zostaje w Sprint AT-6.
- Czat propozycji zostaje w Sprint AT-5.

### Sprint AT-5 - Czat propozycji

**Cel sprintu:**
Umozliwic negocjacje i doprecyzowanie warunkow bez wychodzenia poza platforme.

#### Zadania

- [x] `AT5.1` Dodac endpoint listy wiadomosci.
  - Data zakonczenia: 2026-07-22
  - Endpoint:
    - `GET /api/listing-agent-proposals/:id/messages`.
  - Wykonano: endpoint zwraca paginowana liste wiadomosci dla uczestnika
    propozycji, sortowana rosnaco po `createdAt` i `id`.

- [x] `AT5.2` Dodac endpoint wyslania wiadomosci.
  - Data zakonczenia: 2026-07-22
  - Endpoint:
    - `POST /api/listing-agent-proposals/:id/messages`.
  - Wykonano: dodano `CreateListingAgentProposalMessageDto` z walidacja pustej
    tresci i limitem 4000 znakow.
  - Wiadomosc zapisuje:
    - `proposalId`,
    - `senderUserId`,
    - przycieta tresc `body`,
    - `metadata.senderRole`.

- [x] `AT5.3` Dodac oznaczanie przeczytania albo minimalny licznik
  nieprzeczytanych.
  - Data zakonczenia: 2026-07-22
  - Wykonano:
    - lista wiadomosci zwraca `meta.unreadCount`,
    - przy pobraniu watku wiadomosci drugiej strony z `readAt IS NULL` sa
      oznaczane jako przeczytane.
  - Uwagi / follow-up: to jest minimalny read state bez osobnej tabeli per
    uczestnik, wystarczajacy dla watku 1:1 owner-agent.

- [x] `AT5.4` Zabezpieczyc uczestnikow watku.
  - Data zakonczenia: 2026-07-22
  - Wykonano:
    - endpointy czatu wymagaja roli `owner` albo `agent`,
    - wlasciciel jest rozpoznawany po `proposal.ownerUserId`,
    - agent jest rozpoznawany po `proposal.agent.userId`,
    - uzytkownik spoza watku dostaje `NotFoundException`.

- [x] `AT5.5` Dodac notyfikacje o nowej wiadomosci.
  - Data zakonczenia: 2026-07-22
  - Wykonano: po wyslaniu wiadomosci serwis wysyla minimalny email do drugiego
    uczestnika przez istniejacy `EmailService`.
  - Uwagi / follow-up: trwale in-app notifications i analytics eventy zostaja w
    AT-9.

- [x] `AT5.6` Dodac testy: obcy agent, obcy wlasciciel, pusta wiadomosc,
  wiadomosc po zamknieciu propozycji.
  - Data zakonczenia: 2026-07-22
  - Wykonano:
    - test delegacji endpointow czatu w kontrolerze,
    - test metadanych rol `owner`/`agent` dla endpointow czatu,
    - test listy wiadomosci i oznaczania wiadomosci drugiej strony jako
      przeczytane,
    - test wyslania wiadomosci przez agenta i emaila do wlasciciela,
    - test blokady uzytkownika spoza watku,
    - test blokady pustej wiadomosci po trimowaniu,
    - test blokady wysylki w propozycji ze statusem `closed`.

#### Weryfikacja

- `pnpm --filter api type-check` - przechodzi.
- `pnpm --filter api test -- listing-agent-proposals.service.spec.ts listing-agent-proposals.controller.spec.ts listing-agent-proposal-status.spec.ts` - przechodzi.

#### Poza zakresem AT-5

- UI czatu dla wlasciciela i agenta zostaje w Sprint AT-6/AT-7.
- Trwale notyfikacje in-app, real-time updates i analytics zostaja w Sprint
  AT-9.

### Sprint AT-6 - Frontend: wlasciciel i publiczny wizard

**Cel sprintu:**
Pozwolic wlascicielowi wlaczyc wspolprace i zarzadzac propozycjami.

#### Zadania

- [x] `AT6.1` Dodac checkbox i preferencje wspolpracy w `/dodaj-oferte`.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - dodano wspolny komponent `AgentCollaborationFields`,
    - publiczny wizard zapisuje ustawienia w draft/localStorage,
    - krok `Kontakt` zawiera decyzje o wlaczeniu wspolpracy z agentami,
    - podsumowanie pokazuje status i podstawowe preferencje wspolpracy,
    - payload tworzenia zawiera `agentCollaboration`.
  - Zakres preferencji:
    - wlaczenie/wylaczenie naboru agentow,
    - tryb `single_agent` albo `multi_agent`,
    - dopuszczenie rozmowy o wylacznosci,
    - preferowany typ i wartosc prowizji,
    - oczekiwane uslugi,
    - dodatkowe oczekiwania,
    - preferowany kanal kontaktu przed akceptacja.

- [x] `AT6.2` Dodac te same ustawienia w edycji oferty wlasciciela w `/seller`.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - edycja `/seller/listings/:id/edit` uzywa tego samego komponentu
      `AgentCollaborationFields`,
    - dane z backendu sa normalizowane przez
      `normalizeAgentCollaborationFormValue`,
    - zapis edycji wysyla `agentCollaboration` w payloadzie
      `updateSellerPublicListingSubmission`.
  - Uwagi / follow-up: reczne zamykanie/ponowne otwieranie naboru ma juz backend
    z AT-4, ale dedykowane przyciski w UI zostaja przy widoku propozycji
    wlasciciela.
- [x] `AT6.3` Dodac liste propozycji w panelu wlasciciela.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - dodano klienta API `apps/web/src/lib/listing-agent-proposals.ts`,
    - panel `/seller` pobiera ostatnie propozycje przez
      `GET /api/listing-agent-proposals/seller`,
    - dodano sekcje `Propozycje agentow` z empty/error state.

- [x] `AT6.4` Dodac szczegoly propozycji i porownywalne warunki.
  - Data zakonczenia: 2026-07-23
  - Wykonano w zakresie listy panelowej:
    - karta propozycji pokazuje agenta, agencje, powiazane ogloszenie,
      status, date, wiadomosc, prowizje, typ umowy, minimalny czas wspolpracy,
      proponowana cene oraz uslugi,
    - warunki sa formatowane przez lokalne helpery UI.
  - Uzupelnienie z kolejnej iteracji:
    - dodano widok `/seller/agent-proposals/:id`,
    - widok pokazuje pelne warunki propozycji, plan marketingowy, opinie o
      cenie, dostepnosc, zakres uslug, powiazane ogloszenie i status decyzji,
    - dashboard `/seller` linkuje do szczegolow kazdej propozycji.

- [x] `AT6.5` Dodac akcje akceptacji, odrzucenia i zamkniecia naboru.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - dodano akcje `acceptSellerListingAgentProposal`,
    - dodano akcje `rejectSellerListingAgentProposal`,
    - karta aktywnej propozycji (`sent`, `updated`) pozwala zaakceptowac albo
      odrzucic propozycje,
    - po decyzji stan listy jest aktualizowany bez pelnego reloadu.
  - Uzupelnienie z kolejnej iteracji:
    - dodano akcje `closeSellerListingAgentRecruitment`,
    - dodano akcje `reopenSellerListingAgentRecruitment`,
    - widok szczegolow ogloszenia `/seller/listings/:id` pokazuje status naboru
      agentow i pozwala wlascicielowi recznie zamknac albo ponownie otworzyc
      nabor, jesli oferta jest opublikowana i nie ma statusu `assigned`.
- [x] `AT6.6` Dodac UI czatu dla wlasciciela.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - widok `/seller/agent-proposals/:id` pobiera wiadomosci przez
      `GET /api/listing-agent-proposals/:id/messages`,
    - wlasciciel moze wyslac wiadomosc przez
      `POST /api/listing-agent-proposals/:id/messages`,
    - wiadomosci sa rozrozniane wizualnie jako `Ty` i `Agent`,
    - formularz wysylki jest blokowany dla zamknietych propozycji.

- [x] `AT6.7` Dodac empty/loading/error states.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - dashboard ma empty/error state dla sekcji propozycji,
    - szczegoly propozycji maja loading i error state,
    - czat ma empty state dla watku bez wiadomosci,
    - akcje decyzji i wysylki wiadomosci maja stany `loading/disabled`.

#### Weryfikacja

- `pnpm --filter web type-check` - przechodzi.

#### Poza zakresem AT-6

- Rozbudowane filtry i osobna pelna lista wszystkich propozycji wlasciciela.

### Sprint AT-7 - Frontend: agent

**Cel sprintu:**
Dac agentom kompletna sciezke od znalezienia oferty do wyslania propozycji.

#### Zadania

- [x] `AT7.1` Dodac klienta API i typy w `apps/web/src/lib`.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - dodano `apps/web/src/lib/agent-listing-market.ts`,
    - dodano typy `AgentListingMarketItem`, `AgentListingMarketFilters`,
      `PaginatedAgentListingMarket`,
    - dodano `fetchAgentListingMarket`,
    - dodano webowy helper `isFeatureAccessDeniedApiError` dla blokady funkcji
      przez plan.

- [x] `AT7.2` Dodac zakladke `Oferty szukajace agenta` w dashboardzie agenta.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - dodano pozycje `Oferty szukajace agenta` w sidebarze dashboardu,
    - dodano trase `/dashboard/agent-market`.

- [x] `AT7.3` Dodac filtry i liste ofert rynku.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - strona `/dashboard/agent-market` pobiera rynek ofert przez
      `GET /api/agent-listing-market`,
    - dodano filtry: search, typ nieruchomosci, typ transakcji, miasto,
    - lista pokazuje zdjecie, tytul, lokalizacje, cene, typ oferty i informacje
      czy agent juz wyslal propozycje,
    - dodano empty state, loading state oraz error state dla blokady planu z CTA
      do upgrade.
- [x] `AT7.4` Dodac formularz propozycji wspolpracy.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - dodano webowy typ DTO `ListingAgentProposalInput` oraz funkcje
      `createListingAgentProposal`,
    - dodano reuzywalny komponent
      `apps/web/src/components/listings/listing-agent-proposal-form.tsx`,
      ktory bedzie mozna wykorzystac takze przy edycji propozycji w `AT7.6`,
    - formularz obsluguje: model prowizji, wartosc prowizji, minimalny okres
      wspolpracy, typ wspolpracy, zakres uslug, plan marketingowy, opinie o
      wycenie, proponowana cene, dostepnosc, wiadomosc i date waznosci,
    - dodano walidacje UI dla wymaganych uslug, minimalnej dlugosci wiadomosci,
      prowizji, ceny, okresu wspolpracy i daty waznosci,
    - podlaczono formularz jako modal w `/dashboard/agent-market`,
    - po wyslaniu propozycji karta oferty przechodzi w stan
      `Propozycja wyslana`, a agent dostaje komunikat toast.
- [x] `AT7.5` Dodac zakladke `Wyslane propozycje`.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - dodano funkcje `fetchAgentListingAgentProposals` w webowym kliencie API,
    - dodano pozycje `Wyslane propozycje` w sidebarze dashboardu agenta,
    - dodano trase `/dashboard/agent-proposals`,
    - widok pobiera propozycje agenta przez
      `GET /api/listing-agent-proposals/agent`,
    - dodano filtr statusu propozycji,
    - lista pokazuje status, oferte, lokalizacje, daty wyslania/aktualizacji,
      prowizje, date waznosci, zakres uslug i link do publicznej oferty,
    - dodano loading state, empty state, empty state dla filtra statusu oraz
      error state dla blokady planu z CTA do upgrade.
- [x] `AT7.6` Dodac edycje i wycofanie propozycji.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - dodano funkcje `fetchAgentListingAgentProposal`,
      `updateAgentListingAgentProposal` i
      `withdrawAgentListingAgentProposal` w webowym kliencie API,
    - formularz propozycji dostal wspolna normalizacje danych z backendu i
      wspolna walidacje `validateListingAgentProposalForm`,
    - strona `/dashboard/agent-market` korzysta teraz z tej samej walidacji co
      edycja propozycji,
    - w `/dashboard/agent-proposals` dodano edycje aktywnych propozycji
      (`sent`, `updated`) w modalu opartym o ten sam komponent formularza,
    - dodano wycofanie aktywnej propozycji z potwierdzeniem i aktualizacja
      statusu na liscie bez przeladowania strony,
    - dodano komunikaty toast dla sukcesu i bledow edycji/wycofania.
- [x] `AT7.7` Dodac UI czatu dla agenta.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - dodano reuzywalny komponent
      `apps/web/src/components/listings/listing-agent-proposal-chat.tsx`,
      ktory obsluguje liste wiadomosci, formularz wysylki i rozroznienie roli
      aktualnego uczestnika rozmowy,
    - dodano trase `/dashboard/agent-proposals/[id]` ze szczegolami propozycji
      agenta,
    - widok szczegolow pobiera propozycje przez
      `GET /api/listing-agent-proposals/agent/:id` oraz wiadomosci przez
      `GET /api/listing-agent-proposals/:id/messages`,
    - agent moze wyslac wiadomosc przez
      `POST /api/listing-agent-proposals/:id/messages` dla aktywnych rozmow
      (`sent`, `updated`, `accepted`),
    - widok pokazuje status, oferte, lokalizacje, prowizje, warunki,
      zakres uslug, date aktualizacji i link do publicznej oferty,
    - lista `/dashboard/agent-proposals` dostala przejscie `Szczegoly i czat`
      do detalu propozycji.
- [x] `AT7.8` Dodac stany braku uprawnien i CTA do logowania/rejestracji.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - dodano helper `isAgentUser` w webowym module auth,
    - dodano reuzywalny komponent
      `apps/web/src/components/dashboard/agent-listing-marketplace-access-state.tsx`
      dla stanow: blad, blokada planu, niewlasciwa rola,
    - `/dashboard/agent-market`, `/dashboard/agent-proposals` i
      `/dashboard/agent-proposals/[id]` nie odpalaja agentowych endpointow dla
      uzytkownikow, ktorzy nie sa kontem agenta,
    - dla kont bez funkcji `agentListingMarket` widoki pokazuja CTA do upgrade,
    - dla nie-agentow widoki pokazuja czytelny stan `Dostep tylko dla kont
      agentow`,
    - brak sesji pozostaje obslugiwany globalnie przez dashboard layout i
      `auth:unauthorized`, z przekierowaniem do logowania.

#### Weryfikacja

- `pnpm --filter web type-check` - przechodzi.

#### Poza zakresem pierwszej iteracji AT-7

- Publiczny komunikat na `/oferty/[slug]`, ze wlasciciel jest otwarty na
  przejecie oferty przez agenta, wymaga jeszcze wystawienia bezpiecznych pol
  wspolpracy w publicznym DTO oferty.

### Sprint AT-8 - Akceptacja i kopia oferty w CRM agenta

**Cel sprintu:**
Po akceptacji dac agentowi praktyczna mozliwosc pracy na ofercie w swoim CRM.

#### Zadania

- [x] `AT8.1` Dodac widok zaakceptowanych assignmentow po stronie agenta.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - dodano DTO `ListingAgentAssignmentQueryDto` dla listy assignmentow,
    - dodano endpoint
      `GET /api/listing-agent-proposals/agent/assignments`,
    - serwis listuje assignmenty aktualnego agenta z filtrem statusu,
      paginacja i sortowaniem,
    - odpowiedz zawiera dane assignmentu, skrót oferty oraz propozycje, na
      podstawie ktorej powstala wspolpraca,
    - dodano testy kontrolera i serwisu dla listowania assignmentow,
    - dodano webowy klient `fetchAgentListingAssignments`,
    - dodano pozycje `Wspolprace` w sidebarze dashboardu agenta,
    - dodano trase `/dashboard/agent-assignments`,
    - widok pokazuje status wspolpracy, oferte, lokalizacje, date akceptacji,
      cene, link do oferty publicznej, link do propozycji/czatu oraz stan, czy
      istnieje juz kopia w CRM.
- [x] `AT8.2` Dodac akcje `Utworz kopie w CRM`.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - dodano migracje
      `apps/api/migrations/20260723_agent_assignment_listing_copy_relations.sql`,
    - dodano pola `sourceListingId` i `agentAssignmentId` w encji `Listing`,
    - dodano endpoint
      `POST /api/listing-agent-proposals/agent/assignments/:id/create-listing-copy`,
    - endpoint tworzy robocza kopie oferty w CRM agenta tylko dla aktywnego
      assignmentu aktualnego agenta,
    - endpoint blokuje ponowne tworzenie kopii dla tego samego assignmentu,
    - strona `/dashboard/agent-assignments` ma aktywna akcje
      `Utworz kopie w CRM`, loading state, toast sukcesu i toast bledu,
    - po utworzeniu kopii karta wspolpracy aktualizuje `agentListingId` bez
      przeladowania strony i pokazuje link `Otworz kopie CRM`.
- [x] `AT8.3` Mapowac dane oryginalnej oferty do nowej oferty agenta bez
  przenoszenia prywatnych danych wlasciciela, ktore nie sa potrzebne.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - kopia jest tworzona jako `DRAFT` i `publicationStatus=DRAFT`,
    - kopia nie wlacza naboru agentow i nie dziedziczy publicznego sluga,
    - cena kopii korzysta z zaakceptowanej `proposedPrice`, jesli byla podana,
    - zdjecia sa kopiowane jako referencje do publicznych URL-i,
    - adres kopiuje miasto, dzielnice i wojewodztwo; ulica, kod pocztowy i
      wspolrzedne sa kopiowane tylko wtedy, gdy oryginalna oferta publicznie
      pokazywala dokladny adres.
- [x] `AT8.4` Zachowac relacje `agentAssignmentId` / `sourceListingId`.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - `Listing.sourceListingId` wskazuje oryginalna oferte wlasciciela,
    - `Listing.agentAssignmentId` wskazuje assignment, z ktorego powstala
      kopia,
    - `ListingAgentAssignment.agentListingId` wskazuje utworzona kopie CRM,
    - dodano indeksy dla `source_listing_id` i unikalny indeks dla
      `agent_assignment_id`.
- [ ] `AT8.5` Oznaczyc w UI, ze oferta pochodzi ze wspolpracy z wlascicielem.
- [x] `AT8.6` Upewnic sie, ze limity planu aktywnych ofert sa respektowane.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - tworzenie kopii sprawdza limit `activeListings` dla calej agencji agenta,
    - przekroczenie limitu zwraca `PlanLimitReachedException` zgodny z reszta
      systemu.
- [x] `AT8.7` Dodac testy: brak akceptacji, ponowne tworzenie kopii,
  przekroczenie limitu planu.
  - Data zakonczenia: 2026-07-23
  - Wykonano:
    - dodano test braku aktywnego zaakceptowanego assignmentu,
    - dodano test blokady ponownego tworzenia kopii,
    - dodano test przekroczenia limitu aktywnych ofert,
    - rozszerzono test happy path o bezpieczne mapowanie adresu, zdjecia,
      status kopii i zapis `agentListingId`.

### Sprint AT-9 - Powiadomienia, analityka i jakosc

**Cel sprintu:**
Domknac funkcje produkcyjnie: monitoring, analityka, testy E2E i edge case'y.

#### Zadania

- [ ] `AT9.1` Dodac eventy analityczne:
  - wlaczenie wspolpracy,
  - wyswietlenie rynku ofert,
  - wyslanie propozycji,
  - otwarcie propozycji przez wlasciciela,
  - akceptacja / odrzucenie,
  - utworzenie kopii w CRM.
- [ ] `AT9.2` Dodac powiadomienia in-app/email dla krytycznych zdarzen.
- [ ] `AT9.3` Dodac testy E2E glownej sciezki:
  wlasciciel publikuje oferte -> agent sklada propozycje -> wlasciciel
  akceptuje -> agent tworzy kopie w CRM.
- [ ] `AT9.4` Dodac testy regresji prywatnosci publicznych payloadow.
- [ ] `AT9.5` Dodac metryki administracyjne i logi bledow.
- [ ] `AT9.6` Przygotowac rollout za feature flaga.

---

## 11. Kryteria akceptacji MVP

- Wlasciciel moze wlaczyc i wylaczyc nabor agentow dla swojej oferty.
- Publiczna oferta pokazuje tylko bezpieczna informacje o otwartosci na
  wspolprace.
- Formularz propozycji nie jest widoczny ani dostepny dla anonimowych
  uzytkownikow i kont nie-agentowych.
- Agent moze znalezc oferty szukajace agenta w dashboardzie.
- Agent moze wyslac tylko jedna aktywna propozycje dla jednej oferty.
- Agent moze edytowac propozycje przed decyzja wlasciciela.
- Wlasciciel widzi propozycje tylko dla swoich ofert.
- Wlasciciel moze zaakceptowac albo odrzucic propozycje.
- Czat dziala tylko miedzy wlascicielem a agentem przypisanym do propozycji.
- Akceptacja tworzy assignment i umozliwia agentowi utworzenie kopii oferty w
  CRM.
- Publiczne API nie ujawnia danych kontaktowych wlasciciela ani warunkow
  propozycji.

---

## 12. Ryzyka i uwagi

- Funkcja ma wysoka wartosc biznesowa, ale wymaga bardzo ostrej kontroli
  uprawnien, bo dotyka danych wlasciciela i relacji handlowej.
- Najwieksze ryzyko techniczne to pomieszanie oryginalnej oferty wlasciciela z
  kopia operacyjna agenta. Dlatego rekomendowany jest osobny
  `ListingAgentAssignment` i powiazana kopia w CRM.
- Najwieksze ryzyko UX to zbyt agresywny jezyk "przejecia". W UI lepiej mowic o
  "wspolpracy z agentami", a techniczne `takeover` zostawic dla kodu, jesli
  zespol uzna to za czytelne.
- Czat w MVP powinien byc prosty. Zalaczniki, umowy i podpisywanie dokumentow
  powinny wejsc dopiero po ustabilizowaniu podstawowego flow.
- Dla planow platnych warto od poczatku liczyc wyslane propozycje i skutecznosc,
  nawet jesli limity zostana wlaczone dopiero pozniej.
