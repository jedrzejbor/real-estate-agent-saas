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

## 12. Podsumowanie

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
