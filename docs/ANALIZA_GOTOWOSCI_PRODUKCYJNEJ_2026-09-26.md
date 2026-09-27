# Analiza gotowości do pierwszego uruchomienia produkcyjnego

**Stan repozytorium: 26.09.2026.** Cel: bezpieczny, niewielki start dla agentów i prywatnych sprzedających. Ocena dotyczy kodu i dokumentacji w repozytorium, nie działającej instancji produkcyjnej. Nie miałem dostępu do konta Stripe, produkcyjnej bazy, SMTP ani serwera; określenie „działa w kodzie” nie oznacza, że płatność lub doręczenie e-maila zostały sprawdzone end to end.

## Wniosek

**Projekt ma znaczną część funkcji V1, ale nie jest jeszcze gotowy do otwarcia publicznych, płatnych rejestracji.** Najpoważniejsze luki to cykl życia abonamentu agenta po pierwszym checkoutcie, brak odwoływania sesji po zmianie hasła, brak weryfikacji adresu e-mail przy zakładaniu konta, produkcyjny storage zdjęć i brak przeprowadzonego testu rzeczywistych przepływów Stripe/SMTP/DB na stagingu. Dla ograniczonej bety można rozważyć mniej funkcji i ręczną obsługę niektórych operacji, ale tylko po zapewnieniu trwałości danych, podstawowych zabezpieczeń kont oraz jasnych zasad obsługi płatności.

### Znaczenie statusów

- **Zaimplementowane** — kod backendu i interfejsu istnieje; wskazane testy potwierdzają wybraną logikę.
- **Warunkowe** — ścieżka istnieje, ale wymaga konfiguracji lub pełnego testu na stagingu.
- **Niekompletne** — wykryta luka w funkcji albo w obsłudze jej cyklu życia.

## Ścieżki użytkownika

| Ścieżka | Ocena | Co potwierdza repozytorium / czego brakuje |
| --- | --- | --- |
| Logowanie, wylogowanie, reset hasła | **Zaimplementowane, z luką bezpieczeństwa** | API rejestracji, logowania, refresh, logout i resetu istnieje w [`auth.controller.ts`](../apps/api/src/auth/auth.controller.ts); hasła są hashowane bcrypt w [`auth.service.ts`](../apps/api/src/auth/auth.service.ts). Cookies są `httpOnly`, w produkcji `secure`, jest kontrola CSRF. Wylogowanie usuwa cookies w przeglądarce, ale tokeny nie są unieważniane po stronie serwera; szczegóły niżej. |
| Konto agenta | **Zaimplementowane, warunkowe** | Rejestracja tworzy agenta i agencję, początkowo na planie Free; wybór płatnego planu jest intencją, aktywacja następuje po płatności ([`auth.service.ts`](../apps/api/src/auth/auth.service.ts), [`register/page.tsx`](<../apps/web/src/app/(auth)/register/page.tsx>)). Brakuje potwierdzania własności e-maila konta. |
| Kupno planu Starter/Professional | **Pierwszy checkout zaimplementowany; abonament niekompletny** | Jest wycena, zapis próby, Stripe Checkout w trybie `subscription`, podpisany webhook i aktywacja po opłaceniu ([`agency-plan-checkout.controller.ts`](../apps/api/src/agency-plan-commerce/agency-plan-checkout.controller.ts), [`stripe-agency-plan-payment.adapter.ts`](../apps/api/src/agency-plan-commerce/stripe-agency-plan-payment.adapter.ts), [`agency-plan-payment-events.service.ts`](../apps/api/src/agency-plan-commerce/agency-plan-payment-events.service.ts)). Brak pełnego testu HTTP/UI/Stripe. Aktywna subskrypcja blokuje kolejną zmianę planu; Stripe webhook obsługuje tylko zdarzenia pierwszego checkoutu. |
| Panel i praca agenta | **Zaimplementowane w dużym zakresie, odbiór potrzebny** | Są oferty, klienci, leady, kalendarz, zadania, raporty, ustawienia oraz limity planów. Dowody: moduły w [`app.module.ts`](../apps/api/src/app.module.ts), trasy panelu w `apps/web/src/app/(dashboard)/dashboard`, egzekwowanie limitów w [`agency-limit-enforcement.service.ts`](../apps/api/src/users/agency-limit-enforcement.service.ts). Marketplace i część funkcji zależą od flag. Potrzebny test rzeczywistego konta Free i płatnego oraz uprawnień między agencjami. |
| Konto zwykłego użytkownika / prywatnego sprzedającego | **Zaimplementowane** | `private_seller` tworzy rolę Viewer, loguje i kieruje do `/seller` ([`register.dto.ts`](../apps/api/src/auth/dto/register.dto.ts), [`register/page.tsx`](<../apps/web/src/app/(auth)/register/page.tsx>)). Także tu brak potwierdzenia e-maila na poziomie konta. |
| Wystawienie prywatnej oferty | **Zaimplementowane, warunkowe** | Jest publiczny formularz `/dodaj-oferte`, zgłoszenie, weryfikacja e-maila zgłoszenia, przejęcie do konta, moderacja administratora i panel sprzedającego ([`public-listing-submissions.controller.ts`](../apps/api/src/public-listing-submissions/public-listing-submissions.controller.ts)). Publikacja płatnego ogłoszenia zależy od zatwierdzenia i uprawnienia po zapłacie; wymaga odbioru na stagingu z rzeczywistymi zdjęciami i pocztą. |
| Płatność za ogłoszenie | **Zaimplementowane, warunkowe** | Są serwerowa wycena, idempotentne zamówienie, sesja Stripe, podpisany webhook, entitlement, wygasanie oraz rekoncyliacja ([`listing-checkout.controller.ts`](../apps/api/src/listing-commerce/listing-checkout.controller.ts), [`stripe-listing-webhooks.controller.ts`](../apps/api/src/listing-commerce/stripe-listing-webhooks.controller.ts), [`listing-payment-reconciliation.scheduler.ts`](../apps/api/src/listing-commerce/listing-payment-reconciliation.scheduler.ts)). Flaga `privateListingCheckoutEnabled` domyślnie jest wyłączona poza lokalnym Compose. Dokument planu nadal wymienia pełny test Stripe Sandbox jako otwarty. |
| Kontakt w sprawie oferty, zgłoszenie nadużycia | **Zaimplementowane w kodzie** | Publiczne formularze leadów mają ograniczenia częstości ([`public-leads.controller.ts`](../apps/api/src/public-leads/public-leads.controller.ts)); jest formularz zgłoszenia nadużycia ([`public-listing-abuse-report.tsx`](../apps/web/src/components/listings/public-listing-abuse-report.tsx)). Konieczna obsługa zgłoszeń i działająca skrzynka. |

## Blokery przed publicznym startem

### P0 — bezpieczeństwo kont i płatności

1. **Dokończyć cykl życia płatnego abonamentu agenta.** Adapter Stripe mapuje `checkout.session.completed`, `checkout.session.async_payment_failed` i `checkout.session.expired`, lecz nie mapuje odnowień faktury ani anulowania/zmian subskrypcji ([`stripe-agency-plan-payment.adapter.ts`](../apps/api/src/agency-plan-commerce/stripe-agency-plan-payment.adapter.ts)). Generyczny, podpisany endpoint zdarzeń abonamentowych istnieje ([`billing-webhooks.controller.ts`](../apps/api/src/billing/billing-webhooks.controller.ts)), ale w repo nie ma adaptera przekładającego zdarzenia Stripe na ten endpoint. Skutek: po pierwszej płatności plan może pozostać aktywny mimo nieudanej kolejnej płatności lub anulowania; użytkownik nie ma pełnego samoobsługowego zarządzania abonamentem. Dodatkowo tworzenie kolejnego checkoutu jest blokowane, gdy agencja ma `billingSubscriptionId` ([`agency-plan-checkout-attempts.service.ts`](../apps/api/src/agency-plan-commerce/agency-plan-checkout-attempts.service.ts)). Przed pobieraniem cyklicznych opłat trzeba obsłużyć odnowienie, `past_due`, anulowanie, zmianę planu i potwierdzić je testami ze Stripe. Alternatywa na zamkniętą betę: nie sprzedawać jeszcze abonamentów odnawialnych.

2. **Unieważniać sesje po resecie/zmianie hasła i przy wylogowaniu.** Access i refresh są JWT podpisanymi tym samym sekretem i bez rozróżniającego typu; strategia refresh akceptuje dowolny poprawny JWT z odpowiednim payloadem, także access token podany jako `x-refresh-token` ([`auth.service.ts`](../apps/api/src/auth/auth.service.ts), [`jwt-refresh.strategy.ts`](../apps/api/src/auth/strategies/jwt-refresh.strategy.ts)). Reset hasła zmienia hash, ale nie odwołuje wcześniej wydanych tokenów. Wystarczy skradziony token, aby przedłużyć dostęp; samo czyszczenie cookies przez logout nie rozwiązuje tego problemu. Dodać typ tokena, identyfikator sesji lub wersję tokenów zapisaną po stronie serwera, rotację refresh oraz odwołanie wszystkich sesji po resecie hasła.

3. **Zweryfikować e-mail właściciela konta.** `register` od razu zakłada konto i wydaje tokeny, a `login` wymaga tylko hasła ([`auth.service.ts`](../apps/api/src/auth/auth.service.ts)). Weryfikacja e-maila zgłoszenia oferty nie jest weryfikacją konta. Można założyć konto na cudzy adres i blokować prawowitego właściciela albo zanieczyścić leady. Dodać potwierdzenie adresu przed dostępem do funkcji wrażliwych i bezpieczne ponowienie maila. Ustalić procedurę istniejących niezweryfikowanych kont.

4. **Przeprowadzić pełne testy obu rodzajów płatności na stagingu.** Testy jednostkowe usług i adapterów nie dowodzą, że Stripe Price ID, sekrety, webhook, migracje, przekierowanie i UI działają razem. W [`PRIVATE_SELLER_PRICING_AND_PROMOTIONS_PLAN.md`](PRIVATE_SELLER_PRICING_AND_PROMOTIONS_PLAN.md) sekcje 18.31 oraz 19.3–19.4 pozostawiają te testy otwarte. Sprawdzić sukces, anulowanie, ponowienie, opóźniony/powtórzony webhook, charge bez uprawnienia oraz uprawnienie bez charge; zapisać identyfikatory prób i stan bazy. Włączyć płatności dopiero po przejściu tych scenariuszy.

### P0 — trwałość danych i wdrożenie

5. **Rozwiązać przechowywanie zdjęć i dokumentów.** Kod obsługuje tylko lokalny driver; w `NODE_ENV=production` blokuje start bez `FILE_STORAGE_ALLOW_LOCAL_IN_PRODUCTION=true` ([`file-storage.config.ts`](../apps/api/src/common/file-storage.config.ts)). Ustawienie wyjątku na efemerycznym dysku grozi utratą zdjęć po deployu. Produkcyjny adapter obiektowy (lub świadomie zarządzany trwały wolumen z backupem na ograniczoną betę) jest warunkiem przyjmowania ofert. Aktualny dokument wdrożeniowy też to wskazuje ([`DEPLOYMENT.md`](../DEPLOYMENT.md)).

6. **Mieć odtwarzalne migracje i backup.** Migracje to surowe SQL uruchamiane ręcznie; workflow deploy nie uruchamia ich ([`DEPLOYMENT.md`](../DEPLOYMENT.md), [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)). Bez kontrolowanej historii migracji aplikacja może wystartować z niezgodnym schematem. Przygotować staging z kopią procesu deployu, rejestr migracji, backup bazy i plików oraz próbę odtworzenia. Nie korzystać z deweloperskiego [`docker-compose.yml`](../docker-compose.yml) na produkcji: ma jawne hasła, Mailpit, otwarte porty i `NODE_ENV=development`.

7. **Skonfigurować produkcyjne SMTP i przetestować doręczenie.** Domyślny provider e-mail to `log`, który nie wysyła wiadomości; lokalny Compose używa Mailpit ([`email.service.ts`](../apps/api/src/email/email.service.ts), [`docker-compose.yml`](../docker-compose.yml)). Bez SMTP nie zadziała reset hasła, potwierdzenie oferty i kontakt. Sprawdzić SPF/DKIM/DMARC i skrzynki support/abuse.

8. **Uzupełnić warstwę prawno-operacyjną płatności i danych.** W repo są regulamin i polityki, lecz `LEGAL_META` nadal ma wersję MVP, a opis retencji ma postać „powinny być przechowywane” ([`legal.ts`](../apps/web/src/lib/legal.ts)). Przed publiczną płatnością trzeba potwierdzić dane operatora, regulamin usługi płatnej, zwroty/reklamacje, fakturowanie i retencję. To wymaga także decyzji biznesowej i opinii księgowo-prawnej; repo tego nie rozstrzyga.

## Ważne przed otwartą betą

- **Ograniczenia antyspamowe:** globalny limit 30 żądań/min i limity wybranych formularzy są włączone ([`app.module.ts`](../apps/api/src/app.module.ts)), ale limit w pamięci pojedynczego procesu nie jest pełną ochroną przy wielu instancjach lub za proxy. Przetestować poprawne IP klienta, limity logowania/rejestracji, uploadu i leadów; ustawić alerty na wzrost błędów/abusów.
- **Upload zdjęć:** rozmiar, MIME i sygnatura pliku są sprawdzane ([`public-listing-submissions.controller.ts`](../apps/api/src/public-listing-submissions/public-listing-submissions.controller.ts), [`image-upload-security.ts`](../apps/api/src/common/image-upload-security.ts)). Potrzebny test plików uszkodzonych, bardzo dużych wymiarów i czyszczenia nieprzejętych zdjęć; limit 10 MB na plik nie zamyka wszystkich ryzyk zużycia pamięci.
- **Dostęp między kontami:** middleware JWT i role są globalne, a usługi egzekwują własność zasobów. Przed startem wykonać test prób odczytu/edycji cudzej oferty, leadu, dokumentu, zamówienia oraz próby użycia cudzego `quoteId` w checkoutcie. To bardziej wartościowy test niż kolejne testy wyglądu UI.
- **Cennik i flagi:** prywatny checkout jest domyślnie wyłączony w [`release-flags.service.ts`](../apps/api/src/release-flags/release-flags.service.ts); lokalny Compose ustawia go na `true`. Zestaw flag, produktów, cen PLN, VAT, Stripe Price ID i treści cennika musi być jawnie zatwierdzony dla produkcji. Nie należy pokazywać możliwości zakupu, której serwer nie udostępnia.
- **Obsługa klienta:** ustalić kto codziennie moderuje oferty i obsługuje nadużycia, błędne płatności, zwroty, odwołania i prośby o usunięcie danych. Wpływa to bezpośrednio na bezpieczeństwo użytkowników, nawet przy małej liczbie funkcji.

## Co można zostawić po starcie

Rozbudowane promocje, automatyczne benefity dla istniejących abonentów, dodatkowe raporty, integracje z portalami, marketplace agentów i rozbudowana analityka nie są konieczne do bezpiecznego pierwszego wydania. Jeśli nie są sprawdzone, pozostawić je wyłączone flagami i nie obiecywać ich w cenniku. Nie odkładać zabezpieczeń kont, spójności płatności, trwałości zdjęć ani obsługi zgłoszeń.

## Minimalna bramka wydania

1. Na stagingu z produkcyjnym schematem przejść: agent Free → oferta → lead; agent płatny → Stripe → aktywny plan → odnowienie/nieudana płatność/anulowanie; prywatny sprzedający → konto → zgłoszenie → e-mail → moderacja → płatność → publikacja → wygaśnięcie.
2. Sprawdzić po każdej płatności stan Stripe, bazy, panelu i logów webhooka; przetestować duplikaty i opóźnienia.
3. Potwierdzić działanie HTTPS, CORS/CSRF, sekretów, SMTP, storage, backupu i odtworzenia oraz konta administratora bez danych testowych.
4. Ustawić monitoring dostępności, błędów 5xx, nieudanych webhooków i opłaconych zamówień bez uprawnienia; wskazać osobę reagującą.
5. Udokumentować wynik i datę testu, konfigurację flag oraz decyzję **go/no-go**. Do tego czasu nie ogłaszać publicznie płatnego startu.

## Wykonana weryfikacja w tym audycie

- `pnpm --filter api type-check` — OK.
- `pnpm --filter web type-check` — OK.
- Wybrane testy API: auth, płatności planów, płatności ofert, zgłoszenia ofert — **5 suites, 56 testów, OK**.
- Wybrane testy web: checkout obu rodzajów, wizard i granice tworzenia oferty — **4 suites, 53 testy, OK**.
- Nie uruchamiałem pełnego zestawu testów, Playwright ani testu na żywej bazie/Stripe. Istniejące testy przeglądarkowe w `apps/web/e2e` obejmują głównie cennik, nie pełne ścieżki zakupowe.

**Priorytet następnego sprintu:** bezpieczeństwo sesji i weryfikacja kont → cykl życia subskrypcji → trwały storage i migracje → pełne testy staging obu płatności → dopiero włączenie flag dla pierwszych użytkowników.
