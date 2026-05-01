# Freemium Growth Plan — EstateFlow

Dokument opisuje, jakie funkcje warto udostępnić za darmo w EstateFlow, aby:
- obniżyć próg wejścia,
- szybko pokazać wartość produktu,
- zwiększyć aktywację użytkowników,
- naturalnie prowadzić do przejścia na plany płatne.

Dokument jest strategiczny i powinien być aktualizowany przy zmianie:
- modelu biznesowego,
- planów cenowych,
- zakresu modułów darmowych i płatnych,
- kierunku rozwoju acquisition / growth.

---

## 1. Główny cel freemium

Plan darmowy nie powinien być „okrojoną wersją wszystkiego”.

Powinien robić 3 rzeczy:
- dać użytkownikowi szybki pierwszy efekt,
- pozwolić realnie korzystać z aplikacji przez krótki czas lub w małej skali,
- wygenerować naturalny moment, w którym upgrade jest logiczny i opłacalny.

W praktyce darmowy plan powinien odpowiadać na pytanie:

> „Czy EstateFlow realnie pomaga mi szybciej ogarniać oferty, klientów i sprzedaż?”

A plan płatny powinien odpowiadać na pytanie:

> „Skoro to działa, jak mogę robić to szybciej, szerzej i bardziej profesjonalnie?”

---

## 2. Kogo chcemy przyciągnąć darmowym planem

Najbardziej sensowni użytkownicy freemium na start:
- solo agent nieruchomości,
- początkujący pośrednik,
- małe biuro testujące nowe narzędzie,
- właściciel nieruchomości, który zaczyna od jednej lub kilku ofert,
- agent korzystający dziś z Excela, Notion lub WhatsAppa.

To ważne, bo darmowy plan powinien być wystarczający dla:
- małej skali,
- pierwszych efektów,
- onboardingu i przyzwyczajenia do produktu,

ale nie powinien zastępować płatnego planu dla aktywnego biura lub agenta z realnym pipeline.

---

## 3. Co powinno być darmowe

## 3.1. Darmowy CRM w małej skali

To powinien być fundament darmowego planu.

Rekomendacja:
- do 5 aktywnych ofert,
- do 25 klientów,
- do 20 spotkań miesięcznie,
- podstawowy dashboard,
- podstawowe raporty overview,
- 1 użytkownik,
- brak zaawansowanych integracji.

Dlaczego to działa:
- użytkownik może realnie przetestować produkt,
- szybko zobaczy przewagę nad Excelem,
- przy pierwszym wzroście naturalnie wpadnie w limit.

---

## 3.2. Publiczna karta oferty / mini landing oferty

To bardzo mocny element acquisition.

Każda darmowa oferta mogłaby mieć:
- publiczny link,
- prostą kartę oferty,
- galerię zdjęć,
- opis,
- formularz kontaktowy,
- CTA do kontaktu z agentem / właścicielem.

Dlaczego to jest dobre:
- użytkownik od razu widzi wartość biznesową,
- EstateFlow staje się nie tylko CRM-em, ale też narzędziem prezentacji oferty,
- każda publiczna oferta może generować ruch SEO i leady,
- platforma zaczyna się promować sama przez udostępniane linki.

Potencjalny paywall:
- darmowy plan: publiczne strony ofert z brandingiem EstateFlow,
- płatny plan: własny branding, własna domena lub white-label, więcej zdjęć, lepszy layout.

---

## 3.3. Lekki moduł raportów za darmo

Za darmo warto dać tylko część raportów:
- overview,
- podstawowy raport ofert,
- podstawowy raport klientów.

Nie dawać za darmo pełnej raportowni premium.

Płatne powinny być np.:
- zaawansowane porównania okresów,
- raport lejka,
- raport wartości i sprzedaży,
- raporty zespołowe,
- raporty efektywności.

To dobry mechanizm upgrade, bo gdy użytkownik zaczyna mieć wolumen danych, naturalnie chce głębszej analizy.

---

## 3.4. Prosty import i szybki start

Bardzo ważne dla konwersji na start:
- import klientów z CSV,
- import ofert z prostego formularza,
- gotowe szablony danych,
- onboarding checklist.

Darmowy użytkownik powinien w 10-15 minut dojść do momentu:
- dodałem ofertę,
- dodałem klienta,
- dodałem spotkanie,
- widzę dashboard,
- mogę wysłać publiczny link oferty.

To jest prawdziwa aktywacja.

---

## 4. Twój pomysł: publiczne wystawianie ofert i późniejsze podpinanie do konta

To jest bardzo dobry kierunek.

Uważam, że to może być nawet jeden z najmocniejszych growth loopów produktu — pod warunkiem, że wdrożymy go ostrożnie.

## 4.1. Dlaczego to ma sens

Jeżeli platforma pozwoli:
- dodać publicznie ofertę mieszkania / domu / działki,
- wygenerować z niej publiczną kartę,
- zbierać zapytania,
- a potem połączyć ją z kontem użytkownika,

to EstateFlow przestaje być wyłącznie narzędziem „po zalogowaniu”, a staje się:
- entry pointem do rynku,
- narzędziem publikacji,
- narzędziem pozyskania leada,
- a dopiero potem CRM-em.

To jest znacznie mocniejszy model wejścia niż samo „załóż konto i zacznij wpisywać dane ręcznie”.

---

## 4.2. Rekomendowany model wdrożenia tego pomysłu

Najbezpieczniejszy wariant MVP:

### Etap A — formularz publicznego dodania oferty

Użytkownik bez konta może:
- dodać ofertę przez uproszczony wizard,
- dodać podstawowe dane,
- dodać zdjęcia,
- podać email i telefon,
- opublikować prostą publiczną kartę oferty.

Wymagania:
- obowiązkowa weryfikacja email,
- antyspam,
- rate limiting,
- moderacja lub automatyczna walidacja,
- brak pełnego dostępu do CRM bez rejestracji.

### Etap B — claim / connect listing

Po publikacji użytkownik może:
- założyć konto,
- zalogować się,
- „przejąć” wcześniej dodaną ofertę do swojego workspace,
- zamienić publiczną ofertę w pełnoprawny rekord CRM.

### Etap C — upgrade to CRM flow

Po przejęciu oferty system pokazuje:
- dodaj leady do tej oferty,
- dodaj spotkania,
- włącz raporty,
- zsynchronizuj z portalami,
- przejdź na plan płatny, aby usunąć branding / dodać więcej ofert / aktywować integracje.

To jest bardzo sensowny lejek produktowy.

---

## 4.3. Najważniejsze ryzyka tego pomysłu

Ten model jest mocny, ale trzeba go dobrze zabezpieczyć.

Ryzyka:
- spam i fałszywe oferty,
- duplikaty ofert,
- publikacja treści niskiej jakości,
- publikacja danych osobowych bez zgody,
- fałszywe „claimowanie” ofert,
- problemy prawne przy publicznej ekspozycji treści i zdjęć.

Minimalne zabezpieczenia MVP:
- email verification,
- rate limiting,
- CAPTCHA lub podobny mechanizm ochrony,
- podstawowa moderacja treści,
- log audytowy claimu oferty,
- jednoznaczne zasady publikacji i regulamin,
- możliwość zgłoszenia nadużycia.

Wniosek:
- pomysł jest bardzo dobry marketingowo i produktowo,
- ale nie powinien być wdrażany „na skróty”.

---

## 5. Najlepsze darmowe funkcje, które mogą przyciągać użytkowników

Poza publicznymi ofertami rekomenduję:

## 5.1. Darmowa strona profilowa agenta / biura

Np.:
- publiczny profil agenta,
- lista aktywnych ofert,
- formularz kontaktowy,
- link do social mediów.

Darmowy plan:
- branding EstateFlow,
- ograniczony wygląd,
- podstawowy profil.

Płatny plan:
- custom branding,
- własna domena,
- bardziej rozbudowane CTA i sekcje.

---

## 5.2. Darmowy widget lead form

Bardzo dobry trigger do płatności.

Darmowy plan:
- prosty formularz kontaktowy do osadzenia lub linkowania,
- lead wpada do CRM.

Płatny plan:
- automatyzacje,
- routing leadów,
- tagging,
- integracje z portalami i kampaniami.

---

## 5.3. Darmowy generator opisu oferty / checklisty jakości

Lekka funkcja AI lub semi-AI:
- generator opisu oferty,
- sugestie brakujących pól,
- ocena kompletności ogłoszenia.

To jest bardzo dobre jako:
- szybki „wow effect”,
- funkcja viralowa,
- zachęta do regularnego używania produktu.

Model freemium:
- darmowo kilka użyć miesięcznie,
- płatnie większy limit i lepsze prompty / eksport / wersje językowe.

---

## 5.4. QR / publiczny link do oferty

Bardzo praktyczne dla agentów:
- link do oferty,
- QR do wydruku,
- szybkie udostępnienie klientowi.

To ma wysoką wartość przy niskim koszcie wdrożenia.

---

## 6. Co powinno być płatne

Płatne funkcje powinny być powiązane z:
- skalą,
- automatyzacją,
- profesjonalizacją,
- zespołowością,
- integracjami.

Rekomendacja:
- większa liczba ofert / klientów / spotkań,
- usunięcie brandingu EstateFlow,
- raporty zaawansowane,
- integracje portalowe,
- automatyzacje leadów i powiadomień,
- multi-user / role / zespół,
- eksporty premium,
- pełne publiczne profile i strony ofert,
- historia zmian i bardziej zaawansowana analityka.

---

## 7. Najbardziej sensowny model konwersji free → paid

Najlepszy model nie polega na blokowaniu wszystkiego.

Lepiej działa model:
- darmowy użytkownik realnie odnosi pierwszą korzyść,
- zaczyna używać produktu w prawdziwej pracy,
- wchodzi w limit lub potrzebuje „kolejnego poziomu”,
- upgrade jest naturalny.

Najlepsze momenty upgrade:
- osiągnięcie limitu liczby ofert,
- potrzeba integracji portalowych,
- potrzeba zaawansowanych raportów,
- potrzeba usunięcia brandingu,
- potrzeba dodania zespołu,
- potrzeba automatyzacji obsługi leadów.

---

## 8. Rekomendowany plan wdrożenia growth features

### Etap 1 — szybki freemium core

Najpierw:
- darmowy limit ofert / klientów / spotkań,
- publiczna karta oferty,
- lekki onboarding,
- podstawowy dashboard,
- podstawowe raporty.

To daje najszybszy time-to-value.

### Etap 2 — public listing acquisition

Następnie:
- publiczne dodanie oferty bez pełnego CRM,
- claim listing do konta,
- formularz leadowy,
- podstawowe zasady moderacji.

To daje najsilniejszy acquisition loop.

### Etap 3 — virality + upgrade triggers

Potem:
- profile agentów,
- QR/linki ofert,
- generator opisów,
- branding premium,
- integracje płatne.

---

## 9. Mój rekomendowany kierunek

Jeśli miałbym wskazać najlepszy kierunek produktowy dla wzrostu, to byłby nim:

### 1. Darmowy CRM w małej skali

bo pozwala użytkownikowi realnie wejść do produktu.

### 2. Publiczne strony ofert

bo tworzą natychmiastową wartość i potencjał SEO / lead generation.

### 3. Mechanizm „dodaj ofertę publicznie → połącz z kontem”

bo to może być bardzo mocny kanał akwizycji i activation loop.

To jest kierunek, który ma sens zarówno dla:
- agentów,
- małych biur,
- części właścicieli nieruchomości,
- osób testujących nowy sposób pracy.

---

## 10. Konkretne rekomendacje produktu

Najbardziej wartościowe funkcje freemium do rozważenia teraz:
- darmowy plan z limitem rekordów,
- publiczne karty ofert,
- prosty widget/formularz leadowy,
- darmowy profil agenta,
- prosty generator opisu oferty,
- QR/link do oferty,
- claim listing do konta.

Najbardziej obiecujący pomysł wzrostowy:
- publiczne wystawienie oferty + późniejsze spięcie z kontem CRM.

Moja ocena tego pomysłu:
- strategicznie bardzo dobry,
- marketingowo bardzo mocny,
- produktowo sensowny,
- ale wymaga mocnego podejścia do moderacji, bezpieczeństwa i antyspamu.

---

## 11. Proponowana kolejność dalszych prac

1. Zdefiniować plany darmowy / płatny i limity.
2. Wdrożyć publiczne strony ofert w obecnym modelu CRM.
3. Dodać formularz kontaktowy / lead form do publicznych ofert.
4. Przygotować mechanizm claim listing do konta.
5. Dodać prosty publiczny profil agenta.
6. Dodać funkcje growth/viral: QR, share pages, generator opisu.
7. Dopiero potem rozwijać bardziej złożony marketplace / katalog publicznych ofert.

---

## 12. Audyt aplikacji przed Sprintem 7

Przed wejściem w Sprint 7 warto zatrzymać się na krótkim audycie produktu. Sprint 7 ma domykać release, a nie odkrywać brakujące elementy core flow. Aktualny stan aplikacji pokazuje, że freemium ma już mocne fundamenty: limity planu, publiczne strony ofert, lead form, claim listing, profil agenta, QR/share, generator opisu i upselle. Brakuje jednak kilku elementów, bez których release może wyglądać kompletnie w dokumencie, ale być niepełny dla realnego agenta.

### 12.1. Krytyczny brak: zdjęcia oferty

To jest najważniejsza luka przed Sprintem 7.

W aplikacji istnieje już techniczny model zdjęć:
- backend ma encję `ListingImage`,
- publiczna strona oferty potrafi wyrenderować hero image i galerię,
- submission publiczny potrafi przenieść listę obrazów do oferty po claimie,
- limity planu zawierają `imagesPerListing`.

Problem: użytkownik nie ma kompletnego produktu do zarządzania zdjęciami.

Brakuje:
- uploadu zdjęć w panelu agenta,
- uploadu zdjęć w publicznym wizardzie `/dodaj-oferte`,
- endpointów do dodawania, usuwania, sortowania i ustawiania zdjęcia głównego,
- realnego storage plików albo jasnej integracji z zewnętrznym storage,
- walidacji typu, rozmiaru, liczby zdjęć i limitu planu na backendzie,
- UI galerii w formularzu tworzenia / edycji oferty,
- obsługi alt text i kolejności zdjęć,
- spójnego fallbacku, gdy oferta nie ma zdjęć,
- decyzji, czy `shareImageUrl` ma być ręcznie wpisywanym URL-em, czy generować się z pierwszego zdjęcia.

Rekomendacja:
- nie wchodzić w pełny Sprint 7 bez domknięcia MVP zdjęć,
- dodać osobny pre-sprint albo pod-sprint `6.5 — Listing media MVP`,
- minimum release: upload 1-15 zdjęć, pierwsze jako główne, reorder, delete, limit per plan, publiczny render, share image z pierwszego zdjęcia.

### 12.2. Publiczny wizard dodania oferty nie ma pełnego entry pointu

Backend i claim flow są mocno zaawansowane, ale frontendowo widać tylko stronę potwierdzenia `/dodaj-oferte/potwierdzono`. Brakuje właściwego publicznego formularza startowego `/dodaj-oferte`.

Brakuje:
- strony `/dodaj-oferte`,
- wieloetapowego wizardu podstawy → parametry → zdjęcia → kontakt → podsumowanie,
- zapisu draftu w `localStorage`,
- submitu do `POST /api/public-listing-submissions`,
- ekranu “sprawdź email” po wysyłce,
- obsługi błędów antyspamowych i walidacyjnych w UI,
- integracji uploadu zdjęć z publicznym flow.

Rekomendacja:
- jeśli publiczne dodanie oferty ma być częścią release freemium, to wizard musi wejść przed Sprintem 7,
- jeśli nie zdążymy, trzeba jasno przesunąć publiczny wizard poza MVP i zostawić tylko claim flow / potwierdzenie jako niedostępne z publicznej nawigacji.

### 12.3. Brakuje operacyjnej moderacji i obsługi nadużyć

Reguły moderacji i event `public_listing_abuse_reported` istnieją jako fundament, ale release publicznych stron wymaga obsługi operacyjnej.

Brakuje:
- widocznego przycisku / formularza zgłoszenia nadużycia na publicznej ofercie,
- inboxa albo listy zgłoszeń dla administratora,
- prostego widoku ofert wymagających review,
- procedury: kto sprawdza, jak odpublikować, jak kontaktować się z właścicielem,
- stanów UI dla oferty zatrzymanej przez moderację.

Rekomendacja:
- MVP może być proste: zgłoszenie nadużycia + log/event + ręczna procedura w dokumencie operacyjnym,
- ale trzeba mieć przynajmniej ścieżkę reakcji przed publicznym ruchem.

### 12.4. Brakuje pełnego legal/public consent layer

Publiczne oferty, zdjęcia, leady i claim flow dotykają treści oraz danych osobowych.

Brakuje:
- finalnej treści regulaminu publikacji ofert,
- polityki prywatności pod publiczne leady i publiczne submissiony,
- jasnego oświadczenia o prawach do zdjęć,
- zgody na kontakt i przetwarzanie danych pokazanej w UI publicznych formularzy,
- informacji, kto jest administratorem danych przy leadzie,
- procedury usunięcia publicznej oferty / danych.

Rekomendacja:
- Sprint 7 nie powinien ograniczyć się do checklisty prawnej; trzeba dopiąć realne copy i linki w formularzach.

### 12.5. Analityka jest eventowa, ale brakuje dashboardu decyzyjnego

Eventy są zbierane, ale release freemium wymaga widoku, który odpowiada na pytanie: czy freemium działa?

Brakuje:
- dashboardu aktywacji,
- metryk drop-off dla onboardingu i publicznego wizardu,
- metryk publikacji ofert,
- metryk publicznych odsłon i leadów,
- metryk kliknięć upgrade,
- widoku workspace'ów zbliżających się do limitów.

Rekomendacja:
- przed publicznym release wystarczy wewnętrzny dashboard MVP albo raport admin/dev,
- kluczowe metryki: first listing, first published listing, first copied link, first lead, claim completed, limit reached, upgrade CTA clicked.

### 12.6. Brakuje billing/pricing destination dla upselli

Upselle są widoczne i mierzalne, ale CTA prowadzą do ekranu planu bez realnej ścieżki zakupu.

Brakuje:
- decyzji, czy release freemium ma mieć płatny checkout, waitlistę, kontakt sprzedażowy czy tylko komunikat “wkrótce”,
- ekranu pricing z jasnym porównaniem planów,
- obsługi “upgrade intent” po kliknięciu CTA,
- komunikatu dla użytkownika po wejściu w limit.

Rekomendacja:
- dla MVP można użyć prostego formularza “Chcę wyższy plan”,
- ale nie zostawiać CTA bez następnego kroku.

### 12.7. Brakuje testów E2E dla najważniejszych ścieżek

Przed Sprintem 7 warto rozróżnić test plan od faktycznie pokrytych scenariuszy.

Najważniejsze ścieżki do przejścia:
- rejestracja → onboarding → pierwsza oferta,
- dodanie zdjęć → publikacja → publiczna galeria,
- publiczna oferta → lead → klient w CRM,
- limit planu free → paywall / upgrade CTA,
- publiczne dodanie oferty → email verify → claim → publikacja,
- oferta z treścią ryzykowną → review/draft,
- brak zdjęć → fallback bez wizualnego błędu.

Rekomendacja:
- dopisać testy automatyczne tam, gdzie flow jest stabilne,
- resztę przejść ręcznie na release checklist.

### 12.8. Rekomendowany bufor przed Sprintem 7

Przed Sprintem 7 dodałbym bufor:

`Sprint 6.5 — Listing media, public wizard i release gaps`

Zakres minimalny:
1. Zdjęcia oferty end-to-end.
2. Publiczny wizard `/dodaj-oferte` albo świadome wyłączenie go z MVP.
3. Widoczny abuse report flow.
4. Legal copy i zgody w publicznych formularzach.
5. Minimalny dashboard / raport metryk freemium.
6. Doprecyzowanie pricing destination dla upselli.
7. Ręczne przejście krytycznych flow.

Decyzja produktowa:
- jeśli celem jest prawdziwy publiczny launch, zdjęcia i publiczny wizard są blockerami,
- jeśli celem jest zamknięta beta dla kilku użytkowników, publiczny wizard można przesunąć, ale zdjęcia nadal powinny wejść przed release.

---

## 13. Podsumowanie

EstateFlow może być bardzo atrakcyjnym produktem freemium, jeśli darmowa wersja:
- daje realny efekt,
- pomaga opublikować i uporządkować oferty,
- pozwala zebrać pierwsze leady,
- nie próbuje od razu sprzedawać wszystkiego.

Najlepszy kierunek na start:
- mały darmowy CRM,
- publiczne strony ofert,
- późniejsze spięcie publicznej oferty z kontem użytkownika,
- płatne funkcje oparte na skali, automatyzacji, integracjach i profesjonalizacji.
