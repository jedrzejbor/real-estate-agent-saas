# Cookie consent readiness plan

Data utworzenia: 2026-06-10

## Cel

Przygotować EstateFlow do produkcyjnego uruchomienia pod kątem cookies, browser storage, zgód na analitykę i dokumentacji prywatnościowej.

Sprint ma doprowadzić aplikację do stanu, w którym:

- użytkownik dostaje jasną informację o cookies, `localStorage`, `sessionStorage` i analityce,
- analityka publiczna i produktowa nie startuje bez właściwej zgody,
- preferencje zgód są zapisane i możliwe do zmiany,
- polityka prywatności i polityka cookies opisują faktyczny stan aplikacji,
- auth/storage jest świadomie sklasyfikowany,
- release ma jasne kryteria go/no-go.

## Obecny stan

### Istnieje

- Publiczne dokumenty:
  - `/regulamin`,
  - `/polityka-prywatnosci`,
  - `/zasady-publikacji`.
- Centralne linki i copy legal w `apps/web/src/lib/legal.ts`.
- Własny moduł analytics:
  - `apps/web/src/lib/analytics.ts`,
  - `apps/api/src/analytics/*`,
  - tabela `analytics_events`.
- Publiczne eventy ofert i bloga:
  - `public_listing_viewed`,
  - `public_listing_share_clicked`,
  - `public_listing_gallery_opened`,
  - `public_listing_gallery_image_viewed`,
  - `public_listing_catalog_result_clicked`,
  - `public_listing_map_search_used`,
  - `blog_article_viewed`,
  - `blog_cta_clicked`.
- Storage w przeglądarce:
  - tokeny auth w `localStorage`,
  - draft publicznego wizardu `/dodaj-oferte`,
  - motyw UI,
  - onboarding state,
  - pomocnicze flagi analityczne w `sessionStorage`.

### Brakuje

- Banera cookie consent.
- Panelu preferencji zgód.
- Osobnej polityki cookies albo pełnej sekcji cookies/storage w polityce prywatności.
- Consent gate przed wysłaniem publicznych i produktowych eventów analytics.
- Linku "Ustawienia cookies" w stopce.
- Jasnej decyzji, czy tokeny auth zostają w `localStorage`, czy migrują do httpOnly cookies.
- Testów i checklisty release dla cookies/analytics.

## Zakres sprintu

Sprint obejmuje warstwę produktu, frontend, backendowe konsekwencje analytics, dokumentację legal i testy release.

Poza zakresem sprintu, ale do decyzji:

- pełna migracja auth z `localStorage` na httpOnly secure cookies,
- wdrożenie zewnętrznego CMP typu Cookiebot/CookieYes,
- wdrożenie zewnętrznych narzędzi marketingowych lub remarketingowych.

## Klasyfikacja storage i tracking

Docelowo każda rzecz zapisywana w przeglądarce albo wysyłana jako event powinna mieć kategorię.

### Niezbędne

Używane do działania aplikacji, bezpieczeństwa, sesji, zapamiętania decyzji użytkownika i obsługi żądań.

Przykłady:

- preferencje cookie consent,
- sesja/logowanie,
- techniczne dane antyspamowe,
- eventy bezpieczeństwa i abuse, jeśli są potrzebne do obsługi naruszeń.

### Funkcjonalne

Poprawiają wygodę, ale nie są konieczne do podstawowego działania.

Przykłady:

- motyw UI,
- draft formularza `/dodaj-oferte`,
- onboarding checklist,
- lokalne preferencje interfejsu.

### Analityczne

Służą do pomiaru produktu, ruchu i skuteczności funkcji.

Przykłady:

- public listing views,
- blog article views,
- CTA clicks,
- onboarding events,
- upgrade CTA clicks,
- catalog/map search events.

### Marketingowe

Służą do remarketingu, pikseli reklamowych, profilowania marketingowego lub integracji reklamowych.

Obecny status: brak aktywnego zakresu, ale kategoria powinna istnieć w modelu zgód na przyszłość.

## Zadania sprintu

### C1. Audyt storage, cookies i analytics

Status: do zrobienia

Zakres:

- Spisać wszystkie użycia:
  - `localStorage`,
  - `sessionStorage`,
  - `document.cookie`,
  - `request.cookies`,
  - public analytics,
  - product analytics,
  - zewnętrzne skrypty i piksele, jeśli się pojawią.
- Dla każdego elementu ustalić:
  - nazwę klucza albo eventu,
  - miejsce w kodzie,
  - kategorię consentu,
  - cel,
  - retencję,
  - czy zawiera dane osobowe albo identyfikatory,
  - czy wymaga zgody przed uruchomieniem.

Output:

- Sekcja "Inventory" w tym dokumencie albo osobny dokument `COOKIE_STORAGE_INVENTORY.md`.

Kryteria akceptacji:

- Każdy znany storage key i analytics event ma przypisaną kategorię.
- Public analytics i product analytics są wyraźnie oddzielone od eventów operacyjnych/security.
- Wiadomo, które funkcje trzeba blokować przed zgodą.

### C2. Model zgód i provider

Status: do zrobienia

Zakres:

- Dodać moduł consentu w frontendzie, np. `apps/web/src/lib/cookie-consent.ts`.
- Dodać provider/hook, np.:
  - `CookieConsentProvider`,
  - `useCookieConsent`,
  - `hasAnalyticsConsent`,
  - `hasFunctionalConsent`,
  - `acceptAll`,
  - `rejectOptional`,
  - `savePreferences`,
  - `resetConsent`.
- Przechowywać preferencje w `localStorage` pod stabilnym kluczem, np. `estateflow-cookie-consent`.
- Dodać wersjonowanie zgód przez `version`.

Proponowany model:

```ts
type CookieConsentPreferences = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
  version: string;
};
```

Kryteria akceptacji:

- Brak zgody oznacza stan nieustalony i pokazanie banera.
- `necessary` jest zawsze `true`.
- Zmiana wersji zgód może wymusić ponowne pokazanie banera.
- Kod działa bez błędów w SSR/Next.js.

### C3. Banner consent i panel preferencji

Status: do zrobienia

Zakres:

- Dodać globalny banner cookie consent w layoucie.
- Dodać panel/modal preferencji.
- Dodać link w stopce: "Ustawienia cookies".
- Dodać link do polityki prywatności i polityki cookies.

Minimalne akcje w UI:

- "Akceptuję wszystkie",
- "Odrzuć opcjonalne",
- "Dostosuj".

Kategorie w panelu:

- Niezbędne: zawsze aktywne, bez możliwości wyłączenia,
- Funkcjonalne,
- Analityczne,
- Marketingowe.

Kryteria akceptacji:

- Banner pojawia się na pierwszej wizycie.
- Preferencje zapisują się po wyborze.
- Banner nie wraca po refreshu, jeśli zgoda jest aktualna.
- Użytkownik może ponownie otworzyć ustawienia ze stopki.
- UI działa na mobile i desktop.

### C4. Consent gate dla analytics

Status: do zrobienia

Zakres:

- Zmienić `apps/web/src/lib/analytics.ts`, żeby eventy analityczne respektowały zgodę.
- Publiczne eventy ofert i bloga nie mogą być wysyłane bez `analytics: true`.
- Product analytics dla zalogowanych użytkowników powinny również respektować `analytics: true`, jeśli są pomiarowe.
- Eventy operacyjne/security, np. abuse workflow, powinny zostać rozdzielone od product analytics i nie zależeć od zgody, jeśli są potrzebne do bezpieczeństwa lub obsługi zgłoszenia.

Kryteria akceptacji:

- Przy odrzuceniu opcjonalnych zgód `public_listing_viewed` nie wysyła requestu do API.
- Przy zgodzie analitycznej `public_listing_viewed` wysyła request do API.
- Blog analytics działa tak samo.
- Abuse/security flow nadal działa.
- Brak błędów w konsoli przy braku zgody.

### C5. Polityka cookies i aktualizacja dokumentów legal

Status: do zrobienia

Zakres:

- Dodać trasę `/polityka-cookies` albo pełną sekcję cookies w `/polityka-prywatnosci`.
- Zaktualizować `LEGAL_LINKS` w `apps/web/src/lib/legal.ts`.
- Zaktualizować stopkę.
- Zaktualizować politykę prywatności o:
  - browser storage,
  - własną analitykę,
  - kategorie zgód,
  - retencję,
  - sposób zmiany preferencji,
  - brak albo listę zewnętrznych dostawców analytics/marketing.

Polityka cookies powinna opisać:

- czym są cookies, `localStorage` i `sessionStorage`,
- jakie kategorie stosuje EstateFlow,
- które mechanizmy są niezbędne,
- które są funkcjonalne,
- które są analityczne,
- czy są stosowane cookies marketingowe,
- jak użytkownik może zmienić zgodę,
- jak długo przechowywane są preferencje,
- kontakt w sprawach prywatności.

Kryteria akceptacji:

- Dokument jest dostępny publicznie.
- Link jest w stopce.
- Banner linkuje do dokumentu.
- Treść zgadza się z faktyczną implementacją.
- Dokument nadal jest oznaczony jako wymagający review prawnego, jeśli nie został jeszcze zweryfikowany.

### C6. Decyzja auth storage

Status: do zrobienia

Zakres:

- Podjąć decyzję, czy przed produkcją migrujemy auth z `localStorage` na httpOnly secure SameSite cookies.
- Jeżeli nie migrujemy w tym sprincie:
  - opisać ryzyko w dokumentacji,
  - poprawić niespójność middleware/commentów,
  - sklasyfikować token storage jako niezbędny mechanizm sesji.
- Jeżeli migrujemy:
  - przygotować osobny mini-sprint security,
  - zmienić login/register/refresh/logout,
  - zmienić API client,
  - dodać CSRF strategy, jeśli będzie wymagana.

Rekomendacja:

- Docelowo migrować na httpOnly cookies przed pełnym produkcyjnym launch'em.
- Jeżeli launch MVP ma być szybki, świadomie zaakceptować `localStorage` jako tymczasowe rozwiązanie i zapisać ryzyko w release checklist.

Kryteria akceptacji:

- Decyzja jest zapisana w dokumencie.
- Nie ma rozbieżności między dokumentacją a zachowaniem aplikacji.
- Release checklist zawiera decyzję i ewentualny follow-up security.

### C7. Test plan i release gate

Status: do zrobienia

Zakres:

- Dodać checklistę testów manualnych.
- Dodać testy automatyczne tam, gdzie koszt jest rozsądny.
- Zaktualizować `PRODUCTION_LAUNCH_CHECKLIST.md`.

Testy manualne:

- Pierwsza wizyta pokazuje banner.
- "Odrzuć opcjonalne" blokuje public listing analytics.
- "Akceptuję wszystkie" pozwala wysłać public listing analytics.
- "Dostosuj" zapisuje tylko wybrane kategorie.
- Preferencje przetrwają refresh.
- Link "Ustawienia cookies" otwiera panel ponownie.
- Polityka cookies jest dostępna ze stopki.
- Publiczne formularze dalej działają.
- Abuse report dalej działa.
- Blog analytics respektuje zgodę.
- Dashboard product analytics respektuje zgodę.
- Draft `/dodaj-oferte` zachowuje się zgodnie z decyzją klasyfikacyjną.

Kryteria akceptacji:

- Jest checklist z wynikiem testów.
- Najważniejsze ścieżki publiczne przechodzą po odrzuceniu opcjonalnych zgód.
- Najważniejsze ścieżki publiczne przechodzą po zaakceptowaniu wszystkich zgód.
- Brak requestów analytics bez zgody.

## Release gate

Nie wpuszczamy produkcyjnego ruchu, dopóki nie są spełnione warunki:

- [ ] Jest banner cookie consent.
- [ ] Jest panel preferencji zgód.
- [ ] Jest link "Ustawienia cookies" w stopce.
- [ ] Jest publiczna polityka cookies albo pełna sekcja cookies w polityce prywatności.
- [ ] Analytics publiczny nie wysyła eventów bez zgody analitycznej.
- [ ] Analytics bloga nie wysyła eventów bez zgody analitycznej.
- [ ] Product analytics zalogowanego użytkownika respektuje decyzję consentu albo ma uzasadnione rozdzielenie eventów operacyjnych.
- [ ] Abuse/security events są rozdzielone od product analytics.
- [ ] Storage inventory jest aktualne.
- [ ] Decyzja o auth storage jest zapisana.
- [ ] `PRODUCTION_LAUNCH_CHECKLIST.md` jest zaktualizowany.
- [ ] Dokumenty prawne zostały oznaczone jako zweryfikowane albo pozostają blockerem launchu.

## Proponowana kolejność realizacji

1. C1 - Audyt storage, cookies i analytics.
2. C2 - Model zgód i provider.
3. C3 - Banner consent i panel preferencji.
4. C4 - Consent gate dla analytics.
5. C5 - Polityka cookies i aktualizacja dokumentów legal.
6. C6 - Decyzja auth storage.
7. C7 - Test plan i release gate.

## Otwarte decyzje

- Czy polityka cookies ma być osobną trasą `/polityka-cookies`, czy sekcją w `/polityka-prywatnosci`?
- Czy draft `/dodaj-oferte` traktujemy jako funkcjonalny storage wymagający zgody, czy jako niezbędny element rozpoczętego formularza?
- Czy onboarding state traktujemy jako funkcjonalny storage wymagający zgody?
- Czy wszystkie product analytics dla zalogowanych użytkowników wymagają zgody, czy część klasyfikujemy jako uzasadnione pomiary operacyjne?
- Czy auth migruje na httpOnly cookies przed launch'em, czy zostaje jako follow-up security?
- Czy używamy własnego consent managera, czy zewnętrznego CMP?

## Notatki implementacyjne

- Nie dodawać zewnętrznych skryptów analytics/marketing bez rozszerzenia consent modelu i polityki cookies.
- Preferencje zgód powinny być odczytywane defensywnie, żeby uszkodzony JSON w `localStorage` nie blokował aplikacji.
- Consent UI powinien działać bez logowania.
- Consent state nie powinien wymagać requestu do API w MVP.
- Przy przyszłych integracjach z GA, Meta Pixel, Hotjar, Clarity albo podobnymi narzędziami należy dodać vendor list i blokadę ładowania skryptu przed zgodą.
