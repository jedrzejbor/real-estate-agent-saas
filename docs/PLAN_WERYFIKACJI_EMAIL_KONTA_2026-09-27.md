# Plan wdrożenia weryfikacji adresu e-mail konta

**Data:** 27.09.2026  
**Status:** plan do implementacji  
**Cel:** nowy agent i prywatny sprzedający potwierdzają własność adresu e-mail, zanim uzyskają dostęp do konta, kupią plan lub przejmą ofertę. Zakres dotyczy konta `users`; weryfikacja e-maila pojedynczego zgłoszenia oferty jest osobnym mechanizmem.

## 1. Stan obecny i problem

- [`AuthService.register`](../apps/api/src/auth/auth.service.ts) od razu tworzy użytkownika, agencję i profil agenta oraz wystawia access i refresh token. [`AuthService.login`](../apps/api/src/auth/auth.service.ts) sprawdza tylko hasło i `isActive`. W [`users`](../apps/api/src/users/entities/user.entity.ts) nie ma informacji o potwierdzeniu adresu.
- Formularz [`/register`](<../apps/web/src/app/(auth)/register/page.tsx>) po rejestracji może natychmiast rozpocząć Stripe Checkout albo wykonać `claimPublicListingSubmission`. Samo ukrycie przycisków w UI nie wystarczy: backend musi egzekwować warunek.
- Zgłoszenie prywatnej oferty ma już własny token e-mail i token przejęcia, ale potwierdza adres zgłoszenia, a nie automatycznie adres dowolnego konta ([`public-listing-submissions.service.ts`](../apps/api/src/public-listing-submissions/public-listing-submissions.service.ts)).
- [`EmailService`](../apps/api/src/email/email.service.ts) domyślnie używa providera `log`; produkcja wymaga realnego SMTP. Nowe konta nie mogą pozostać bez możliwości potwierdzenia z powodu źle ustawionej poczty.

## 2. Decyzje projektowe na V1

1. **Brak pełnej sesji przed weryfikacją.** `POST /auth/register` tworzy konto w stanie oczekiwania, nie ustawia cookies JWT i zwraca `202 Accepted` z neutralną informacją o wiadomości. Po kliknięciu linku użytkownik loguje się hasłem. Link weryfikacyjny nie jest linkiem logowania.
2. **Jeden znacznik prawdy:** `users.email_verified_at TIMESTAMPTZ NULL`. `is_active` nadal oznacza dezaktywację konta; nie mieszać obu stanów. Warunek autoryzacji to `isActive && emailVerifiedAt != null` dla zwykłych sesji.
3. **Token losowy, jednorazowy i krótkotrwały.** 32 bajty z `crypto.randomBytes`, w bazie wyłącznie SHA-256 tokena, ważność 24 godziny. Ponowna wysyłka unieważnia poprzedni token. Operacja potwierdzenia jest atomowa; drugi klik nie może wykonać jej ponownie.
4. **Potwierdzenie na innym urządzeniu działa.** Link tylko potwierdza konto i pokazuje ekran „Adres potwierdzony — zaloguj się”. Nie wymaga poprzedniej sesji ani pamięci lokalnej.
5. **Płatny plan i przejęcie oferty czekają.** Po potwierdzeniu i logowaniu wycena planu jest liczona od nowa; stary `quoteId` nie jest używany. Powiązanie ze zgłoszeniem oferty jest zachowane po stronie serwera i wykonywane dopiero po weryfikacji.
6. **Nie oznaczać starych kont jako zweryfikowane bez dowodu.** Procedura migracji zależy od tego, czy na produkcji są już realni użytkownicy (sekcja 8).

Te zasady odpowiadają zaleceniom OWASP dla weryfikacji adresu oraz tokenów odzyskiwania dostępu: losowość, jednorazowość, termin ważności, brak ujawniania istnienia kont i kontrola nadużyć. Źródła: [OWASP Email Validation and Verification](https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html), [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

## 3. Kontrakt przepływu

| Krok | API / UI | Oczekiwany wynik |
| --- | --- | --- |
| Rejestracja | `POST /api/auth/register` | Normalizacja e-maila zgodna z polityką projektu, transakcja tworząca konto pending; `202`, bez JWT. Jeżeli adres już istnieje, odpowiedź publiczna nie zdradza stanu konta; odpowiednią instrukcję otrzymuje tylko właściciel skrzynki. Nie nadpisywać istniejącego hasła ani profilu. |
| E-mail | link do `/verify-email#token=...` | Link HTTPS budowany wyłącznie z zaufanego `FRONTEND_URL`, bez zależności od nagłówka `Host`. Wiadomość mówi o ważności linku i ignorowaniu niezamówionej rejestracji. |
| Potwierdzenie | `POST /api/auth/email-verification/confirm` `{ token }` | Serwer hashuje token; atomowo ustawia `email_verified_at`, zeruje hash i termin. `204` lub neutralny sukces; token wygasły/użyty daje kontrolowany błąd i możliwość ponownej wysyłki. Nie wydaje sesji. |
| Ponowna wysyłka | `POST /api/auth/email-verification/request` `{ email }` | Zawsze neutralne `202`; tylko istniejące, aktywne i niezweryfikowane konto dostaje nowy link. Limit IP i adresu, cooldown 60 s oraz maks. 5 wiadomości na 24 h jako wartości startowe do konfiguracji. |
| Logowanie | `POST /api/auth/login` | Prawidłowe hasło + niezweryfikowany adres: status `EMAIL_VERIFICATION_REQUIRED`, bez cookies. Nieprawidłowe dane zachowują dotychczasowy ogólny błąd. |
| Autoryzacja | `JwtStrategy`, `JwtRefreshStrategy`, operacje wrażliwe | Brak dostępu dla niezweryfikowanego konta nawet z tokenem wydanym przed wdrożeniem. Sprawdzanie po stronie serwera, nie tylko w React. |
| Profil | `GET /api/auth/me` | Pole `emailVerifiedAt` lub `emailVerified: boolean` dla UI; nie ujawnia hashy ani historii wysyłek. |

**Szczegół frontendu:** strona `/verify-email` odczytuje token z fragmentu URL, od razu usuwa fragment przez `history.replaceState`, następnie wysyła `POST`. Ustawić `Referrer-Policy: no-referrer` na tej stronie i nie ładować tam skryptów analitycznych przed usunięciem tokena. Potwierdzenie nie powinno zachodzić przez `GET`, ponieważ skanery poczty potrafią automatycznie otwierać linki. Nie zapisywać tokena w `localStorage`, logach, telemetrii ani komunikatach błędów. Fragment URL ogranicza przesłanie tokena w żądaniu do serwera WWW, lecz nadal wymaga ostrożności w kodzie strony.

## 4. Model danych i migracja

**Migracja SQL** oraz zmiana encji `User`:

- `email_verified_at TIMESTAMPTZ NULL`;
- `email_verification_token_hash VARCHAR(64) NULL` z unikalnym indeksem częściowym dla niepustych hashy;
- `email_verification_expires_at TIMESTAMPTZ NULL`;
- `email_verification_sent_at TIMESTAMPTZ NULL`;
- liczniki okna wysyłkowego, np. `email_verification_window_started_at` i `email_verification_send_count`, albo oddzielny trwały rate limiter; nie opierać limitu dziennego na pamięci procesu;
- opcjonalny `email_verified_source` tylko gdy potrzebny do audytu migracji, np. `link` lub `legacy_manual`.

Zachować obecny unikalny indeks adresu. Przed migracją sprawdzić politykę kanonizacji: obecny kod wykonuje `toLowerCase().trim()` na całym adresie. Stosować **jedną** politykę w rejestracji, logowaniu, resendu i powiązaniu zgłoszenia. Nie wprowadzać przy tej zmianie agresywnego łączenia adresów (np. usuwania kropek Gmaila), bo może połączyć odrębne tożsamości. Po migracji wykonać odczyt kontrolny liczby kont verified/pending i sprawdzić, czy TypeORM nie próbuje automatycznie zmienić schematu.

## 5. Backend — kolejność implementacji

1. Dodać migrację i pola encji; dodać metody repozytorium do wystawienia oraz atomowego zużycia tokena. Potwierdzenie wykonać w transakcji lub `UPDATE ... WHERE token_hash = ... AND expires_at > now() AND email_verified_at IS NULL RETURNING id`. Równoległe żądania: dokładnie jedno wygrywa.
2. Wydzielić `AccountEmailVerificationService`: generowanie, hash, TTL, resend i wysyłka. Wysyłać e-mail po zatwierdzeniu transakcji utworzenia konta. Jeśli SMTP zawiedzie, konto pozostaje pending, błąd trafia do monitoringu, a użytkownik może ponowić wysyłkę; nie tworzyć sesji „awaryjnie”. Przy dużej skali można zastąpić synchroniczną wysyłkę outboxem, ale V1 wymaga co najmniej niezawodnej ścieżki retry.
3. Zmienić `AuthService.register/login/refresh` i obie strategie JWT. Konta pending nie mogą dostać nowego access ani refresh tokena. Dodać test, że stary token JWT nie omija warunku po wdrożeniu.
4. Dodać endpointy confirm/request, DTO i osobne limity. Zwracać neutralną odpowiedź z endpointu request niezależnie od istnienia konta. Ograniczać po IP i hashu adresu; za reverse proxy poprawnie ustawić `trust proxy` i nie ufać dowolnemu `X-Forwarded-For`. Rejestrację ograniczyć także per IP.
5. Dodać zdarzenia monitoringu: konto utworzone pending, wysyłka sukces/błąd, token potwierdzony, token niepoprawny/wygasły, limit resendu. Logować ID konta i zamaskowany adres; nigdy token, pełny link ani hasło.
6. Zabezpieczyć przyszłą zmianę e-maila. Obecne `UpdateMyProfileDto` nie zmienia adresu; gdy ta funkcja powstanie, nowy adres musi być potwierdzony przed zastąpieniem starego, z ponownym podaniem hasła i powiadomieniem starej skrzynki.

## 6. Integracja z istniejącymi ścieżkami

### Agent i plan płatny

Obecny formularz tworzy quote przed rejestracją i natychmiast po niej tworzy checkout attempt. Po zmianie: rejestracja → ekran „Sprawdź pocztę” → potwierdzenie → logowanie → nowa wycena → checkout. `selectedPlan` i okres rozliczeniowy zachować jako **intencję**, nie jako opłacony plan. Można zapisać je po stronie serwera przy pending koncie albo przekazać do bezpiecznego, niesekretnego linku kontynuacji. Kod promocyjny należy ponownie zweryfikować przy nowej wycenie; nie obiecywać utrzymania ceny lub rabatu z wygasłego quote. Checkout API musi odrzucać niezweryfikowanego użytkownika niezależnie od UI.

### Prywatny sprzedający i `claimToken`

Obecna rejestracja z `claimToken` od razu wykonuje claim. Nowy backend powinien przy rejestracji zweryfikować, że token wskazuje zgłoszenie w stanie `VERIFIED` oraz że adres zgłoszenia zgadza się z adresem nowego konta według jednej polityki normalizacji. Zapisać identyfikator zgłoszenia jako oczekującą intencję powiązaną z `userId`, **bez przechowywania jawnego claimTokena**. Po potwierdzeniu konta i logowaniu dokończyć claim w idempotentnej operacji backendu. Jeśli limit planu albo stan oferty uniemożliwia przejęcie, zachować intencję i pokazać użytkownikowi błąd z możliwością ponowienia. Gdy link weryfikacyjny jest otwierany na innym urządzeniu, intencja nadal pozostaje na serwerze.

Ten fragment wymaga osobnego testu bezpieczeństwa: posiadanie linku do zgłoszenia nie może pozwolić na związanie oferty z kontem o innym adresie. Sprawdzić również istniejące konta logujące się przez `/login?claimToken=...`; zasada dopasowania e-maila powinna obowiązywać również tam.

### Reset hasła i dezaktywacja

Reset hasła nie powinien sam oznaczać e-maila jako zweryfikowanego, chyba że zespół świadomie przyjmie tę politykę i udowodni, że link resetu trafił na aktualny adres konta. Zalecenie V1: oddzielić oba procesy. Konto zdezaktywowane nie dostaje resend ani możliwości potwierdzenia. Unieważnianie starych JWT po resecie hasła pozostaje osobnym zadaniem P0 z [analizy gotowości](ANALIZA_GOTOWOSCI_PRODUKCYJNEJ_2026-09-26.md) i nie powinno zostać pominięte przy zmianach auth.

## 7. UI i komunikacja

- `/register`: po `202` pokazać adres w zamaskowanej postaci, instrukcję sprawdzenia skrzynki i spamu oraz przycisk ponownej wysyłki. Nie pokazywać panelu ani „konto gotowe”. Zachować czytelny powrót do logowania.
- `/verify-email`: stany ładowania, potwierdzono, link wygasł/nieprawidłowy, błąd sieci. Po sukcesie CTA „Zaloguj się”. Nie renderować tokena w HTML lub toascie.
- `/login`: po poprawnym haśle konta pending pokazać ekran weryfikacji z resend; nie zdradzać tego stanu przy błędnym haśle.
- Dostępność i urządzenia mobilne: link, komunikaty oraz przyciski możliwe do obsługi klawiaturą; link działa także poza przeglądarką, w której zaczęto rejestrację.
- E-mail: krótki tekst PL, nazwa serwisu, ważność 24 h, ostrzeżenie „jeśli to nie Ty, zignoruj”, czytelny adres wsparcia. Treść bez hasła, ceny, kodu promocji i danych oferty.

## 8. Istniejące konta i rollout

**Przed wdrożeniem policzyć konta w bazie docelowej:** aktywne, płatne, administratorzy, konta testowe oraz konta z ofertami. Na podstawie wyniku wybrać jedną z poniższych ścieżek i zapisać decyzję:

- **Brak realnych użytkowników:** wszystkie nowe konta od dnia wdrożenia wymagają linku. Konta testowe można usunąć lub ręcznie potwierdzić w środowisku testowym. Nie backfillować `email_verified_at` dla wszystkich.
- **Są realni użytkownicy:** dodać migrację w trybie obserwacji, wysłać wiadomości do istniejących kont, dać ograniczony okres przejściowy dla bieżących sesji i następnie włączyć egzekwowanie. Płatność, zmiana danych wrażliwych i przejęcie oferty powinny wymagać potwierdzenia od początku. Konta administratorów potwierdzać osobną, audytowaną procedurą. Nie oznaczać ich automatycznie jako zweryfikowane wyłącznie dlatego, że kiedyś się zalogowały.

Rollout: migracja → kod w trybie obserwacji → kontrola SMTP i metryk → włączenie wymagania dla nowych rejestracji → migracja starych kont → usunięcie tymczasowej ścieżki zgodności. Każda faza ma mieć możliwość wstrzymania nowych rejestracji bez wyłączania już działających kont; rollback nie może oznaczać pending kont jako verified.

## 9. Testy i kryteria akceptacji

**Automatyczne:**

1. Rejestracja agenta i sprzedającego daje pending bez cookies; bez potwierdzenia nie działa login, refresh, `/auth/me`, checkout planu, checkout oferty ani claim.
2. Poprawny token potwierdza dokładnie raz; błędny, wygasły, ponownie użyty i unieważniony przez resend nie potwierdzają konta. Równoległe żądania confirm nie powodują dwóch sukcesów.
3. Resend ma neutralną odpowiedź dla adresu nieistniejącego, aktywnego i pending; limity oraz cooldown działają w prawdziwym PostgreSQL także przy równoległych żądaniach.
4. Płatny plan po weryfikacji używa świeżej wyceny; stary quote ani nieopłacony wybór planu nie aktywują benefitów. Claim oferty działa po weryfikacji także z innego urządzenia i odrzuca niezgodny adres.
5. Błąd SMTP pozostawia konto pending z możliwością retry. Token nie pojawia się w logach, analytics, `Referer`, historii po otwarciu strony ani w odpowiedzi API.
6. Dotychczasowe testy logowania, resetu hasła, CSRF, zgłoszenia oferty i Stripe nie regresują.

**Staging z realnym SMTP:** przejść agent Free, agent płatny i prywatny sprzedający, sprawdzić otrzymanie linku, kliknięcie na innym urządzeniu, opóźnienie maila, resend, wygaśnięcie, spam folder, rejestrację na zajęty adres i próbę nadużycia cudzego adresu. Zapis odbioru powinien zawierać datę, wersję aplikacji i wynik każdego scenariusza. Dopiero wtedy oznaczyć zadanie z analizy launchowej jako wykonane.

## 10. Proponowany podział prac

| Etap | Wynik możliwy do odebrania |
| --- | --- |
| A. Model i kontrakt | Migracja, encja, kontrakty API, decyzja o starych kontach; test migracji na kopii schematu. |
| B. Token i poczta | Jednorazowy token, wysyłka, resend, limity, monitoring; testy współbieżności i błędów SMTP. |
| C. Egzekwowanie auth | Rejestracja bez sesji, login/refresh/JWT guard odrzucają pending; testy API. |
| D. Integracje produktu | Plan agenta i claim sprzedającego odłożone do weryfikacji; świeży quote i idempotentny claim. |
| E. Frontend | Ekran oczekiwania, potwierdzenie, komunikaty logowania i kontynuacja intencji. |
| F. Odbiór | Test E2E z PostgreSQL + SMTP + przeglądarka, przegląd logów i rollout z metrykami. |

**Definicja ukończenia:** nie istnieje ścieżka API, w której świeżo założone, niezweryfikowane konto otrzyma pełną sesję, opłaci produkt lub przejmie ofertę; prawidłowy właściciel skrzynki może dokończyć proces także na innym urządzeniu; istniejący użytkownicy mają bezpieczną ścieżkę migracji.

## 11. Dziennik wdrożenia — etap A (27.09.2026)

**Zrobione w kodzie:**

- Dodano addytywną, powtarzalną migrację [`20260927_account_email_verification_foundation.sql`](../apps/api/migrations/20260927_account_email_verification_foundation.sql): znacznik potwierdzenia, hash i termin tokena, czas wysyłki, trwałe okno licznika, unikalny indeks częściowy oraz ograniczenia spójności. Migracja celowo nie ustawia `email_verified_at` dla istniejących kont.
- Rozszerzono encję [`User`](../apps/api/src/users/entities/user.entity.ts). Pola tokena i liczników mają `select: false` oraz `@Exclude`; kod etapu B będzie musiał pobierać je jawnie w kontrolowanych zapytaniach. Publiczny profil auth ma `emailVerified: boolean`; typ po stronie web jest zgodny. To pole jest wyłącznie informacyjne do chwili wdrożenia egzekwowania w etapie C.
- Kontrakt kolejnych etapów: rejestracja `202` bez JWT, confirm `204` bez JWT, resend `202` neutralny, login z poprawnym hasłem dla pending zwraca `EMAIL_VERIFICATION_REQUIRED`; opis w sekcji 3. **Endpointy i zmiana zachowania rejestracji nie są jeszcze wdrożone.**

**Sprawdzenie migracji:** uruchomiona dwa razy na izolowanej tabeli tymczasowej PostgreSQL; oba przebiegi zakończyły się poprawnie, a istniejący wiersz pozostał niezweryfikowany. Następnie zastosowana w lokalnej bazie deweloperskiej: przed i po było 9 kont; po migracji `email_verified_at` ma 0 wartości, hash tokena ma 0 wartości. Kontrola typów API/web i 17 testów auth/users przeszły; lokalne API odpowiada `200` na `/api`.

**Decyzja o starych kontach:** lokalnych 9 kont nie oznaczono automatycznie jako zweryfikowanych. Dla środowiska publicznego decyzja z sekcji 8 wymaga odczytu liczby i rodzaju realnych kont przed włączeniem etapu C; brak dostępu do takiego środowiska w tym zadaniu. Żaden kod w etapie A nie blokuje jeszcze istniejących użytkowników ani nie wydaje im nowych uprawnień na podstawie pola `emailVerified`.

## 12. Dziennik wdrożenia — etap B (28.09.2026)

**Zrobione:**

- Dodano [`AccountEmailVerificationService`](../apps/api/src/auth/account-email-verification.service.ts): 32-bajtowy losowy token, SHA-256 w bazie, 24-godzinny termin ważności, atomowe potwierdzenie konta, cooldown 60 s i limit 5 wysyłek na konto w 24 h. Rezerwacja tokena i licznika działa w transakcji z blokadą wiersza. Błąd SMTP przywraca poprzedni działający token oraz limit, jeśli nowy token nie został już zużyty.
- Dodano publiczne `POST /api/auth/email-verification/request` (`202`, neutralny wynik) i `POST /api/auth/email-verification/confirm` (`204`, bez utworzenia sesji), DTO oraz ograniczenia częstości żądań. Endpointy są dostępne, ale rejestracja **nie wywołuje jeszcze** wysyłki; to należy do etapu C.
- Link w wiadomości prowadzi do `/verify-email#token=...`; produkcja wymaga HTTPS w `FRONTEND_URL`. Dodano zdarzenia monitoringu bez tokenów i pełnych adresów e-mail oraz wspólną normalizację adresu dla rejestracji, logowania, resetu i resendu.
- [`EmailService`](../apps/api/src/email/email.service.ts) nie loguje treści ani pełnego adresu odbiorcy; w `NODE_ENV=production` odrzuca provider `log`, aby nie potwierdzać pozornego wysłania wiadomości.

**Weryfikacja:** 19 testów jednostkowych auth/e-mail OK, type-check API OK, lint API OK. Na lokalnym PostgreSQL + Mailpit: resend `202`, wiadomość dostarczona, pierwsze potwierdzenie `204`, ponowne użycie tokena `400`. Dwie równoczesne prośby o link dały dwie neutralne odpowiedzi `202`, ale tylko jedną wiadomość. Tymczasowe konta testowe zostały usunięte.

**Granica etapu:** nadal nie ma ekranu `/verify-email`, automatycznej wysyłki po rejestracji ani blokady sesji dla pending. To jest zakres etapów C i E. Ograniczenie endpointu po IP korzysta na razie z `@nestjs/throttler` w pamięci procesu; przed wdrożeniem wielu instancji trzeba podłączyć współdzielony storage limitera i poprawnie skonfigurować zaufane proxy. Neutralny status i treść odpowiedzi resend nie gwarantują identycznego czasu odpowiedzi przy synchronicznym SMTP; przed publicznym startem warto sprawdzić ten kanał enumeracji i w razie potrzeby wysyłać wiadomości przez trwałą kolejkę.

## 13. Dziennik wdrożenia — etap C (29.09.2026)

**Zrobione w kodzie:**

- Rejestracja przy `ACCOUNT_EMAIL_VERIFICATION_ENABLED=true` tworzy konto z `email_verification_required_at`, wysyła link i zwraca neutralne `202 {"status":"pending_email_verification"}` bez JWT. Kontroler usuwa ewentualne stare cookies sesji. Dla zajętego adresu odpowiedź jest taka sama, bez zmiany istniejącego konta. Przy awarii dostarczenia maila konto pozostaje pending; użytkownik może skorzystać z resendu.
- Login zwraca `403` z kodem `EMAIL_VERIFICATION_REQUIRED` dopiero po sprawdzeniu poprawnego hasła. Niepoprawne hasło daje nadal ogólny błąd. Obie strategie JWT odrzucają konto pending także wtedy, gdy token został wydany wcześniej. Refresh ponownie odczytuje stan konta i używa bieżącego e-maila/roli z bazy.
- Dodano migrację [`20260929_account_email_verification_enforcement.sql`](../apps/api/migrations/20260929_account_email_verification_enforcement.sql). `email_verification_required_at` to **przejściowy znacznik zakresu egzekwowania**: stare konta z `NULL` pozostają dostępne, ale nie są oznaczone jako zweryfikowane. Dla nich konieczna jest osobna decyzja i migracja według sekcji 8. Po zakończeniu migracji istniejących kont znacznik można usunąć i egzekwować samo `email_verified_at`.
- Rejestracja ma limit 5 żądań/minutę na IP. Domyślna wartość flagi to `false` w `.env.example` i Docker Compose, ponieważ obecny frontend zakłada sesję zaraz po rejestracji. **Nie włączać flagi dla ruchu użytkowników przed etapem E, kontrolą SMTP i migracją lokalnej/produkcyjnej bazy.** Wyłączenie flagi nie otwiera kont już oznaczonych jako wymagające weryfikacji.

**Weryfikacja:** type-check API, lint API i 24 testy auth/egzekwowania zakończone poprawnie. Testy pokrywają brak JWT i cookies, zajęty adres, poprawne/błędne hasło, odrzucenie access/refresh JWT oraz obsługę starych i zweryfikowanych kont. Migrację zastosowano w lokalnej bazie: 9 kont zachowało `email_verification_required_at=NULL` i `email_verified_at=NULL`. Pełny test HTTP z PostgreSQL, SMTP i przeglądarką pozostaje w etapie F.

**Przed aktywacją:** zastosować migrację we wszystkich bazach, ukończyć etapy D i E, sprawdzić profil kont istniejących w bazie docelowej, SMTP i limity w konfiguracji wieloinstancyjnej. Ponieważ wysyłka maila jest synchroniczna, czas odpowiedzi rejestracji może ujawniać istnienie adresu; należy sprawdzić ten kanał na staging i w razie potrzeby użyć trwałej kolejki. Żadna istniejąca skrzynka nie jest automatycznie uznana za potwierdzoną.
