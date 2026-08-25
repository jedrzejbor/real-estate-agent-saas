# Sprint przygotowujący V1 aplikacji: prywatne ogłoszenia i pierwszy launch

Data utworzenia: 2026-08-25  
Status: draft decyzyjny do doprecyzowania przed implementacją  
Zakres: pierwsza publiczna wersja platformy PodAdresem / EstateFlow

---

## 1. Cel sprintu

Przygotować aplikację do wypuszczenia pierwszej wersji, w której głównym
użytkownikiem jest osoba prywatna dodająca ogłoszenie nieruchomości.

Najważniejszy efekt sprintu:

- użytkownik prywatny może dodać ofertę,
- oferta przechodzi przez weryfikację i płatność,
- po akceptacji jest widoczna w publicznym katalogu i na mapie,
- właściciel może zobaczyć status, edytować ofertę, odnowić ją lub wycofać,
- zespół ma gotowe minimum operacyjne, prawne, płatnicze i supportowe do soft
  launchu.

---

## 2. Decyzja produktowa na V1

### Rekomendacja

V1 powinna być skierowana przede wszystkim do prywatnych właścicieli. Agentów
nieruchomości warto dopuścić od startu, ale tylko jako ograniczony pilot /
early access, bez robienia z panelu agentów głównego zakresu release'u.

Uzasadnienie:

- prywatny właściciel ma prostszy problem: dodać, opłacić i obsłużyć jedno
  ogłoszenie;
- katalog potrzebuje podaży ofert, żeby mieć sens dla szukających;
- agenci są ważni, ale ich realna wartość pojawi się dopiero wtedy, gdy możemy
  pokazać ruch, leady, statystyki i wygodną dystrybucję ofert;
- pełne integracje z portalami zewnętrznymi mogą łatwo zdominować sprint, a nie
  są konieczne do sprawdzenia pierwszego kanału monetyzacji.

### Zakres dla prywatnych właścicieli na V1

- Dodanie ogłoszenia przez publiczny wizard.
- Weryfikacja emaila.
- Statusy: `oczekuje na weryfikację`, `zaakceptowane do płatności`,
  `opublikowane`, `odrzucone`, `wygasłe`, `wycofane`.
- Płatność za publikację.
- Publikacja w katalogu `/oferty`.
- Karta szczegółów oferty z formularzem zapytania.
- Panel `/seller` z listą własnych ogłoszeń, zapytaniami i podstawowymi
  statystykami.
- Manualna moderacja przed publikacją.

### Zakres dla agentów na V1

Nie budujemy osobnego "dużego" release'u dla agentów. Dajemy:

- publiczną możliwość zgłoszenia zainteresowania kontem agenta,
- ręcznie aktywowany dostęp dla kilku pierwszych agentów,
- możliwość dodawania ofert przez istniejący panel, jeśli obecny CRM jest gotowy
  jakościowo,
- brak obietnicy automatycznego wystawiania na Otodom / OLX / Domiporta w V1,
- formularz zbierający informacje, z jakich pakietów portalowych agent już
  korzysta.

Decyzja do zatwierdzenia: czy rejestracja agenta w V1 ma być publiczna, czy
tylko przez ręczne zaproszenie. Rekomendacja: ręczne zaproszenie do momentu
zakończenia płatności, faktur i jasnych limitów.

---

## 3. Model płatności dla prywatnych ogłoszeń

### Rekomendowany wariant startowy

| Produkt | Cena | Czas publikacji | Dla kogo | Uwagi |
|---|---:|---:|---|---|
| Ogłoszenie podstawowe | 49 zł brutto | 60 dni | osoba prywatna | podstawowy pakiet V1 |
| Odnowienie ogłoszenia | 39 zł brutto | +60 dni | osoba prywatna | po wygaśnięciu lub przed końcem |
| Kod testowy / beta | 0 zł | 60 dni | pierwsi użytkownicy | tylko ręcznie lub przez kupon |

Na V1 nie rekomenduję wielu progów cenowych dla prywatnych właścicieli. Jeden
prosty pakiet za około 50 zł jest łatwiejszy do zrozumienia, testowania i
obsługi supportowej.

### Progi późniejsze, jeśli pojawi się popyt

| Produkt | Hipoteza ceny | Sens biznesowy |
|---|---:|---|
| Wyróżnienie w katalogu | 19-29 zł brutto | monetyzacja bez zmiany bazowej ceny |
| Pakiet 3 ogłoszeń | 129 zł brutto | prywatni inwestorzy / kilka lokali |
| Promowanie lokalne | 49-99 zł brutto | dopiero po realnym ruchu w katalogu |

### Kolejność płatności

Rekomendowany flow:

1. Użytkownik dodaje ogłoszenie.
2. Potwierdza email.
3. System wykonuje automatyczną walidację i/lub trafia do moderacji.
4. Moderator zatwierdza ogłoszenie do publikacji.
5. Użytkownik dostaje link do płatności.
6. Po udanej płatności oferta zostaje opublikowana.

Dlaczego tak:

- nie pobieramy pieniędzy za ofertę, która finalnie może zostać odrzucona;
- unikamy refundów na samym starcie;
- łatwiej ręcznie kontrolować jakość katalogu;
- użytkownik płaci w momencie, kiedy wie, że oferta została przyjęta.

Otwarte: jeśli zależy nam na szybszej publikacji, można pobierać płatność przed
moderacją, ale wtedy trzeba od razu przygotować politykę zwrotów i proces
refundacji.

---

## 4. Płatności i faktury

### Prywatni właściciele

Potrzebują metod płatności typowych dla Polski:

- BLIK,
- szybki przelew,
- karta.

Rekomendacja produktowa: dla B2C docelowo Przelewy24 albo PayU. Jeżeli chcemy
uruchomić szybkie techniczne MVP, Stripe może wystarczyć na testy kartowe, ale
nie powinien być jedynym docelowym kanałem dla polskich konsumentów.

### Agenci i biura

Agenci potrzebują:

- faktury VAT,
- danych firmy i NIP,
- abonamentu miesięcznego albo rocznego,
- jasnych limitów ofert i użytkowników,
- możliwości ręcznej umowy / custom planu dla większych biur.

Na V1 agentów obsługujemy manualnie: zgłoszenie zainteresowania, rozmowa,
aktywacja planu przez admina. Checkout self-service dla agentów może wejść po
soft launchu.

---

## 5. Pakiety dla agentów nieruchomości

### Rekomendacja na start

Nie sprzedajemy agentom wyłącznie "miejsca na ogłoszenia". To portale robią już
od lat. Dla agentów wartość PodAdresem powinna być oparta na:

- jednym miejscu zarządzania ofertami,
- leadach z katalogu PodAdresem,
- publicznym profilu i stronie oferty,
- podstawowym CRM,
- statystykach,
- późniejszej dystrybucji do portali, z których agent już korzysta.

### Proponowana siatka pakietów B2B

| Plan | Cena hipoteza | Limit aktywnych ofert | Dla kogo | Uwagi |
|---|---:|---:|---|---|
| Free / Trial | 0 zł | 5 | test produktu | bez integracji portalowych |
| Starter | 99 zł netto / mies. | 25 | solo agent | CRM + publiczne oferty |
| Professional | 249 zł netto / mies. | 200 | małe biuro | zespół, branding, raporty |
| Enterprise / Custom | indywidualnie | indywidualnie | większe biura | wdrożenie, migracje, integracje |

Te poziomy są spójne z istniejącą strategią planów w dokumentach billingowych.
Przed publiczną sprzedażą trzeba tylko potwierdzić, czy ceny są wystarczająco
mocne względem kosztu supportu i wartości leadów.

### Integracje portalowe jako oddzielna warstwa

Jeśli agent ma już pakiet na Otodom, OLX, Domiporta lub innym portalu, nasz
produkt powinien docelowo pozwolić mu zarządzać ofertą w PodAdresem i wysłać ją
do tych portali przez oficjalne integracje.

Na V1 nie obiecujemy tego publicznie. W sprint wpisujemy tylko:

- research dostępności oficjalnych API / importów dla portali,
- zebranie informacji od agentów, z jakich pakietów korzystają,
- projekt modelu `PortalConnection` i `ListingPublication`,
- decyzję, czy pierwsza integracja ma być oficjalnym API, eksportem pliku, czy
  ręcznym procesem concierge.

Nie robimy scrapingu ani automatyzacji przeglądarki jako podstawy produktu.

---

## 6. Szybki research cen portali

Stan na dzień utworzenia dokumentu: 2026-08-25. Ceny portali zmieniają się, więc
przed decyzją sprzedażową trzeba je potwierdzić bezpośrednio na stronach
operatorów albo u opiekunów handlowych.

### Dane potwierdzone publicznie

- Domiporta publikuje cennik dla ogłoszeń indywidualnych i agencji:
  https://www.domiporta.pl/cennik-ogloszen
- W publicznym cenniku Domiporta widoczne są m.in. pojedyncze ogłoszenia
  sprzedaży/wynajmu w progach 79 zł, 89 zł i 199 zł oraz pakiety i abonamenty
  agencyjne zależne od liczby ogłoszeń.
- OLX Biznes udostępnia kalkulator ofert dla kategorii, w tym `Nieruchomości`,
  ale podkreśla, że cena jest orientacyjna:
  https://biznes.olx.pl/kalkulator-ofert/
- Otodom dla biur nieruchomości kieruje do kontaktu / programu Agent PRO:
  https://www.agentpro.otodom.pl/

### Zadanie researchowe do sprintu

- Spisać realne koszty dla 3 profili agenta: 10, 25 i 100 aktywnych ofert.
- Zebrać ceny i warunki dla Otodom, OLX, Domiporta, Morizon/Gratka.
- Rozdzielić:
  - koszt publikacji ogłoszeń,
  - koszt wyróżnień,
  - koszt abonamentu agencyjnego,
  - koszt dodatkowych leadów albo promowania.
- Sprawdzić, czy portale mają oficjalny model integracji dla CRM / multi-postingu.
- Zweryfikować, czy agent może używać własnego abonamentu portalowego przez
  zewnętrzny system, czy wymagane są osobne umowy partnerskie.

Wniosek roboczy: dla agentów nie możemy wyceniać PodAdresem jako tańszego
zamiennika portali. Powinniśmy wyceniać je jako narzędzie pracy i warstwę
dystrybucji, która oszczędza czas i poprawia kontrolę nad ofertami.

---

## 7. Backlog sprintu

### P0 - zakres blokujący launch

- [ ] `V1-01` Zamrozić decyzję: V1 = prywatni właściciele, agenci = pilot.
- [ ] `V1-02` Ustalić finalną nazwę domeny, brandu i danych operatora.
- [ ] `V1-03` Naprawić / domknąć flow claim po weryfikacji emaila.
- [ ] `V1-04` Dodać rozdzielenie `claim` od `approve/reject` w moderacji.
- [ ] `V1-05` Dodać endpointy admina do akceptacji i odrzucenia zgłoszenia.
- [ ] `V1-06` Dodać minimalny panel moderacji albo procedurę admin API + DB.
- [ ] `V1-07` Dodać payment gate dla prywatnej oferty po akceptacji moderacji.
- [ ] `V1-08` Dodać status `zaakceptowane do płatności` i komunikaty email.
- [ ] `V1-09` Po udanej płatności publikować ofertę w katalogu.
- [ ] `V1-10` Przygotować politykę zwrotów i regulamin płatnych ogłoszeń.
- [ ] `V1-11` Przetestować pełny flow:
  dodanie -> email -> moderacja -> płatność -> publikacja -> zapytanie.

### P1 - ważne przed soft launch

- [ ] `V1-12` Pokazać liczbę wyświetleń na kartach w `/seller`.
- [ ] `V1-13` Pokazać liczbę zapytań na kartach w `/seller`.
- [ ] `V1-14` Dodać stronę szczegółów ogłoszenia w panelu właściciela.
- [ ] `V1-15` Doprecyzować ekran po potwierdzeniu emaila.
- [ ] `V1-16` Dodać emaile: zatwierdzone do płatności, opublikowane, odrzucone,
  wygasa za 7 dni, wygasło.
- [ ] `V1-17` Dodać publiczną stronę zasad publikacji ofert.
- [ ] `V1-18` Dodać zgłaszanie nadużyć przy publicznej ofercie.
- [ ] `V1-19` Dodać podstawowe eventy analityczne dla wizardu i płatności.
- [ ] `V1-20` Przygotować landing / sekcję dla agentów z waitlistą.

### P2 - po launch albo tylko jeśli zostanie czas

- [ ] `V1-21` Dodać wyróżnienie płatne w katalogu.
- [ ] `V1-22` Dodać pakiet 3 ogłoszeń dla prywatnych właścicieli.
- [ ] `V1-23` Dodać publiczny cennik agentów.
- [ ] `V1-24` Dodać checkout self-service dla planów agentów.
- [ ] `V1-25` Dodać eksport oferty do formatu użytecznego dla portali.
- [ ] `V1-26` Rozpocząć pierwszą oficjalną integrację portalową.

---

## 8. Kryteria akceptacji sprintu

Sprint można uznać za gotowy do soft launchu, jeśli:

- nowy użytkownik prywatny może przejść pełny flow bez pomocy zespołu;
- ogłoszenie nie może zostać opublikowane bez akceptacji i opłacenia;
- odrzucone ogłoszenie nie wymaga zwrotu, bo płatność jest dopiero po
  akceptacji;
- właściciel widzi status swojej oferty;
- zespół widzi listę zgłoszeń do moderacji i potrafi je zaakceptować lub
  odrzucić;
- przy ofercie działa formularz zapytania;
- email do właściciela działa dla kluczowych statusów;
- regulamin, polityka prywatności, zasady publikacji i polityka zwrotów są
  gotowe do publikacji;
- produkcja ma skonfigurowane domenę, SSL, backupy, SMTP, storage zdjęć i
  monitoring;
- mamy prosty dashboard metryk: liczba wejść, zgłoszeń, zaakceptowanych ofert,
  płatności, publikacji i leadów.

---

## 9. Launch checklist

### Produkt

- [ ] Wizard dodawania oferty działa na mobile i desktop.
- [ ] Zdjęcia uploadują się do produkcyjnego storage.
- [ ] Geokodowanie / lokalizacja działa wystarczająco dokładnie.
- [ ] Oferta publiczna ma poprawne SEO i Open Graph.
- [ ] Formularz kontaktowy przy ofercie wysyła lead do właściciela.
- [ ] Panel `/seller` pokazuje status, akcje i zapytania.
- [ ] Admin / moderator ma procedurę akceptacji i odrzucania.

### Płatności

- [ ] Wybrany provider dla płatności B2C.
- [ ] Link płatności tworzony tylko po akceptacji moderacji.
- [ ] Webhook płatności publikuje ofertę albo ustawia stan do publikacji.
- [ ] Nieudana płatność nie publikuje oferty.
- [ ] Dane transakcji są zapisane przy ogłoszeniu.
- [ ] Procedura reklamacji i zwrotów jest opisana.

### Prawne

- [ ] Regulamin serwisu z danymi operatora.
- [ ] Regulamin płatnych ogłoszeń.
- [ ] Polityka prywatności.
- [ ] Polityka cookies i baner zgód.
- [ ] Zasady publikacji ofert.
- [ ] Procedura zgłaszania nadużyć.
- [ ] Decyzja, czy platforma działa tylko jako ogłoszeniowa, a nie jako
  pośrednik nieruchomości.

### Operacje

- [ ] SLA moderacji, np. do 24h w dni robocze.
- [ ] Skrzynki: support, abuse, legal, noreply.
- [ ] Gotowe odpowiedzi supportowe.
- [ ] Monitoring błędów i uptime.
- [ ] Backup bazy danych.
- [ ] Alerty dla błędów płatności i emaili.

### Growth

- [ ] Google Search Console.
- [ ] Sitemap i robots.txt na domenie produkcyjnej.
- [ ] Metryki konwersji wizardu.
- [ ] Lista pierwszych kanałów pozyskania prywatnych ogłoszeń.
- [ ] Lista pierwszych agentów do pilotażu.

---

## 10. Metryki sukcesu V1

### Prywatni właściciele

- wejścia na `/dodaj-oferte`,
- start formularza,
- ukończenie formularza,
- potwierdzenie emaila,
- akceptacja moderacji,
- przejście do płatności,
- skuteczna płatność,
- publikacja,
- odnowienie ogłoszenia.

### Katalog i leady

- wejścia na `/oferty`,
- kliknięcia w kartę oferty,
- wysłane zapytania,
- współczynnik zapytanie / wyświetlenie oferty,
- liczba ofert aktywnych po 7, 14 i 30 dniach.

### Agenci

- liczba zgłoszeń na waitlistę,
- liczba agentów zaproszonych do pilotażu,
- liczba agentów, którzy dodali ofertę,
- liczba agentów, którzy mają już pakiety na innych portalach,
- najczęściej wskazywane portale do integracji.

---

## 11. Decyzje do podjęcia przed startem implementacji

- [ ] Czy cena 49 zł brutto za 60 dni jest finalnym wariantem V1?
- [ ] Czy płatność następuje po moderacji, zgodnie z rekomendacją?
- [ ] Czy pierwszym providerem płatności dla B2C będzie Przelewy24, PayU czy
  Stripe jako szybki techniczny MVP?
- [ ] Czy agent może publicznie zakładać konto, czy tylko dołącza przez
  zaproszenie?
- [ ] Czy w V1 pokazujemy publiczny cennik agentów, czy tylko formularz
  kontaktowy?
- [ ] Czy oferta prywatna wygasa po 60 dniach, czy po 30 dniach?
- [ ] Czy ręczna moderacja ma SLA 24h, czy krótsze?
- [ ] Czy dopuszczamy ogłoszenia wynajmu, czy na start tylko sprzedaż?
- [ ] Czy dopuszczamy działki, domy i lokale, czy startujemy tylko od mieszkań?

---

## 12. Rekomendowany plan sprintu

### Tydzień 1 - domknięcie flow i decyzji

- Dzień 1: potwierdzenie decyzji cenowych, provider płatności, zakres agentów.
- Dzień 2-3: claim flow, approve/reject, statusy ofert.
- Dzień 4: payment gate i status `zaakceptowane do płatności`.
- Dzień 5: publikacja po płatności, podstawowe emaile statusowe.

### Tydzień 2 - launch readiness

- Dzień 6-7: panel `/seller`, statystyki, zapytania, poprawki UX.
- Dzień 8: regulaminy, polityka zwrotów, zasady publikacji, abuse.
- Dzień 9: testy E2E, testy mobile, staging smoke test.
- Dzień 10: checklist produkcyjny, monitoring, decyzja go/no-go.

---

## 13. Go / no-go

### Go

Możemy wypuścić soft launch, jeśli:

- działa pełny płatny flow prywatnego ogłoszenia;
- zespół potrafi zmoderować ofertę bez ręcznych zmian w bazie;
- mamy gotowe dokumenty prawne i politykę zwrotów;
- monitoring i backupi produkcyjne są włączone;
- znamy pierwsze kanały pozyskania 20-50 ogłoszeń testowych.

### No-go

Nie wypuszczamy publicznie, jeśli:

- płatność może opublikować niezweryfikowaną ofertę;
- oferta może zostać przejęta przez niewłaściwego użytkownika;
- nie mamy regulaminu płatnych ogłoszeń;
- nie mamy procedury odrzucenia / zgłoszenia nadużycia;
- zdjęcia nie są przechowywane poza lokalnym filesystemem produkcji;
- nie wiemy, kto moderuje ogłoszenia i w jakim SLA.







TO DO CO MOIM ZDANIEM MUSIMY MIEĆ W APLIKACJI:

- [ ] Mozliwosc utworzenia i zalogowania sie na konto uzytkownika 
- [ ] Mozliwosc dodania ogłoszenia dla sprzedazy i wynajmu + edycja istniejącego 
- [ ] Model płatności za ogłoszenie + pola rabatowe na uzycie kodu obnizającego cene
- [ ] 
- [ ]
- [ ] 
- [ ] 
- [ ] 
- [ ]
- [ ] 
- [ ] 
- [ ] 