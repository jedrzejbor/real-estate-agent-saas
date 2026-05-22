# Analiza flow dodawania ogłoszeń przez klienta prywatnego

> Stan na: 20 maja 2026  
> Cel dokumentu: Opisać aktualne flow, zidentyfikować problemy i zaplanować docelowy flow, w którym klient prywatny samodzielnie zarządza swoim ogłoszeniem.

---

## 1. Aktualne flow — jak działa dziś

### Ścieżka A: Bez konta (public wizard)

```
Klient wchodzi na /dodaj-oferte
        ↓
Wypełnia formularz (tytuł, opis, zdjęcia, cena, lokalizacja)
        ↓
POST /api/public-listing-submissions
→ Tworzy PublicListingSubmission { status: "pending_email_verification" }
→ Wysyła email z linkiem weryfikacyjnym
        ↓
Klient klika link w emailu → /dodaj-oferte/potwierdzono?token=XYZ
        ↓
POST /api/public-listing-submissions/verify
→ Submission { status: "verified" }
→ Generuje claimToken (jednorazowy)
        ↓
❗ TUTAJ JEST PROBLEM — klient musi "przejąć" ogłoszenie (claim)
        ↓
Jeśli klient ma konto → POST /api/public-listing-submissions/claim
→ Tworzy Listing z ownerUserId = klient
→ Submission { status: "claimed" }
→ Listing pojawia się na stronie

Jeśli klient NIE MA konta → musi się zarejestrować, zalogować i dopiero wtedy zrobić claim
Jeśli admin zrobi claim zamiast klienta → Listing.ownerUserId = null lub agentId = admina ❌
```

### Ścieżka B: Z kontem (zalogowany private_seller)

```
Klient zalogowany jako private_seller
        ↓
Wchodzi na /dodaj-oferte (ten sam wizard)
→ Formularz wysyłany przez CHRONIONY endpoint (ownerUserId z JWT)
        ↓
Email weryfikacyjny
        ↓
Klient klika link → verify → dostaje claimToken
        ↓
Klient musi się zalogować i zrobić claim → Listing z ownerUserId = klient ✅
        ↓
Panel /seller pokazuje ogłoszenie z pełnym dostępem
```

---

## 2. Zidentyfikowane problemy

### Problem 1 — Claim przez admina kradnie ogłoszenie klientowi
Gdy admin robi claim (bo "ogłoszenie wymaga zatwierdzenia"), Listing jest przypisany do agenta admina, nie do klienta. Klient widzi status `claimed` i traci dostęp do ogłoszenia.

**Docelowo:** Claim powinien wykonywać tylko właściciel (klient). Admin może *zatwierdzić/odrzucić*, ale nie przejmować własności.

### Problem 2 — Brak jasnej informacji dla klienta co robić po weryfikacji
Po kliknięciu linku w emailu klient widzi komunikat sukcesu, ale nie jest prowadzony za rękę do rejestracji/logowania i claimu.

### Problem 3 — Krok "claim" jest niezrozumiały dla klienta
Klient nie rozumie po co "przejmować" ogłoszenie, które sam stworzył. Z jego perspektywy: dodał ogłoszenie, potwierdził email, powinno być opublikowane.

### Problem 4 — Flow moderacji jest niewidoczny
Status `w weryfikacji` nie tłumaczy klientowi co się dzieje i ile czeka. Brak kontaktu zwrotnego.

### Problem 5 — Brak wyświetlenia statystyk w panelu /seller
Mechanizm `publicViewCount` istnieje w backendzie (`attachPublicViewCounts`), ale panel `/seller` jeszcze go nie pokazuje (zaplanowane jako Etap 4 w PRIVATE_SELLER_DASHBOARD_PLAN.md).

---

## 3. Docelowe flow — co chcemy osiągnąć

### Uproszczony flow dla klienta prywatnego

```
[OPCJA 1 — Najpierw rejestracja]

Klient rejestruje się → rola private_seller
        ↓
Przekierowanie do /seller (panel właściciela)
        ↓
Klika "Dodaj ogłoszenie" → /dodaj-oferte (chroniony endpoint, ownerUserId z JWT)
        ↓
Weryfikacja emaila (jednorazowa przy rejestracji lub per-ogłoszenie)
        ↓
Ogłoszenie trafia do moderacji (automatyczna lub manualna)
→ Jeśli auto-moderacja OK → status "published" → widoczne w katalogu
→ Jeśli wymaga przeglądu → admin zatwierdza → klient dostaje powiadomienie
        ↓
Klient w /seller widzi:
  - status ogłoszenia
  - liczbę wyświetleń
  - zapytania od zainteresowanych
  - akcje: edytuj / wycofaj / odnów
```

```
[OPCJA 2 — Najpierw ogłoszenie (bez konta)]

Klient dodaje ogłoszenie bez konta
        ↓
Weryfikacja emaila
        ↓
Strona potwierdzenia → CTA: "Zarejestruj się, żeby zarządzać ogłoszeniem"
→ Rejestracja z powiązaniem claimToken w URL
→ Po rejestracji automatyczny claim do konta klienta
        ↓
Klient trafia do /seller z opublikowanym ogłoszeniem
```

---

## 4. Co jest już zbudowane ✅

| Funkcja | Status | Gdzie |
|---------|--------|-------|
| Formularz dodawania ogłoszenia | ✅ Działa | `/dodaj-oferte` |
| Weryfikacja emaila | ✅ Działa | `public-listing-submissions/verify` |
| Panel `/seller` | ✅ Działa | `/seller` |
| Lista własnych ogłoszeń | ✅ Działa | `GET /api/public-listing-submissions/seller` |
| Edycja ogłoszenia | ✅ Działa | `/seller/listings/[id]/edit` |
| Zapytania (leads) w panelu | ✅ Działa | `GET /api/public-leads/seller` |
| Zmiana statusu zapytania | ✅ Działa | `PATCH /api/public-leads/seller/:id` |
| Powiadomienia email o zapytaniach | ✅ Działa | `notifyPrivateSellerAboutLead` |
| Wycofanie ogłoszenia | ✅ Działa | `unpublish` w `/seller` |
| Odnawianie ogłoszenia | ✅ Działa | `renew` w `/seller` |
| Wygasanie ogłoszeń (60 dni) | ✅ Działa | `expiresAt` |
| Licznik wyświetleń (backend) | ✅ Działa | `attachPublicViewCounts` |
| ownerUserId na Listing i Submission | ✅ Działa | migracja `20260516` |

---

## 5. Co wymaga naprawy lub budowy ❌

### Priorytet 1 — Naprawić claim flow (krytyczne)

**Problem:** Admin nie powinien robić claim zamiast klienta.

**Rozwiązanie:**
- Claim powinien być dostępny tylko dla zalogowanego właściciela z matching `ownerUserId` lub przez token.
- Moderacja (admin) powinna operować na `PublicListingSubmission.status` lub na `Listing.publicationStatus`, NIE na claimie.
- Rozdzielić pojęcia: **claim** (przeniesienie własności) od **approve** (zatwierdzenie przez moderatora).

**Nowy endpoint moderacji admina:**
```
POST /api/admin/listing-submissions/:id/approve
POST /api/admin/listing-submissions/:id/reject
```
Te endpointy NIE zmieniają właściciela — tylko ustawiają `publicationStatus`.

### Priorytet 2 — Auto-claim po rejestracji

**Problem:** Klient po weryfikacji emaila musi ręcznie "przejąć" ogłoszenie.

**Rozwiązanie:**
- Przy rejestracji klienta sprawdzić czy w URL/session jest `claimToken`.
- Jeśli tak — automatycznie wykonać claim po rejestracji.
- Klient trafia prosto do `/seller` z ogłoszeniem.

**Plik do zmiany:** `apps/web/src/app/(public)/rejestracja/page.tsx` lub odpowiednik.

### Priorytet 3 — Wyświetlenia w panelu /seller ❌

**Problem:** `publicViewCount` jest obliczany w backendzie, ale panel `/seller` go nie pokazuje.

**Co zrobić:**
- Dodać `viewCount` do odpowiedzi `GET /api/public-listing-submissions/seller`.
- Backend: w `listForCurrentSeller` dołączyć `publicViewCount` z powiązanego `publishedListing`.
- Frontend: w karcie ogłoszenia w `/seller` pokazać licznik wyświetleń (ikona `Eye`).

**Pliki do zmiany:**
- `apps/api/src/public-listing-submissions/public-listing-submissions.service.ts` — `listForCurrentSeller` / `toSellerListItem`
- `apps/web/src/lib/public-listing-submissions.ts` — typ `SellerPublicListingSubmissionListItem`
- `apps/web/src/app/(seller)/seller/page.tsx` — karta ogłoszenia

### Priorytet 4 — Panel moderacji dla admina ❌

**Problem:** Admin nie ma UI do zarządzania zgłoszeniami (zatwierdź/odrzuć).

**Co zrobić:**
- Prosta strona `/dashboard/admin/submissions` (tylko dla roli `admin`).
- Lista zgłoszeń z statusem `verified` lub `claimed` wymagających przeglądu.
- Akcje: `Zatwierdź` → `publicationStatus: published`, `Odrzuć` → `publicationStatus: rejected` + email do klienta.

### Priorytet 5 — Strona potwierdzenia lepsza UX ❌

**Problem:** Po weryfikacji emaila klient jest zagubiony.

**Plik:** `apps/web/src/app/(public)/dodaj-oferte/potwierdzono/page.tsx`

**Co zrobić:**
- Jeśli klient NIE jest zalogowany → CTA "Zarejestruj się żeby zarządzać ogłoszeniem" z claimToken w URL.
- Jeśli klient JEST zalogowany (private_seller) → automatyczny claim + przekierowanie do `/seller`.
- Jasny komunikat: "Twoje ogłoszenie trafi do katalogu po weryfikacji przez nasz zespół (do 24h)".

---

## 6. Kolejność wdrożenia (rekomendowana)

```
Sprint A (naprawa krytyczna):
  1. Naprawić stronę /dodaj-oferte/potwierdzono — auto-claim dla zalogowanych
  2. Naprawić rejestrację — auto-claim z claimToken w URL
  3. Dodać endpoint admin approve/reject (bez UI na razie — przez API)

Sprint B (panel klienta):
  4. Wyświetlenia w /seller (viewCount na kartach ogłoszeń)
  5. Strona szczegółów ogłoszenia /seller/listings/[id] z pełnymi statystykami
  6. Liczba zapytań na karcie ogłoszenia

Sprint C (panel admina):
  7. /dashboard/admin/submissions — lista do moderacji
  8. Email do klienta przy approve/reject
```

---

## 7. Docelowy widok panelu /seller (co klient powinien widzieć)

### Karta ogłoszenia

```
┌─────────────────────────────────────────────────────┐
│ [Zdjęcie]  Mieszkanie 3-pokojowe, Warszawa Mokotów  │
│            ul. Przykładowa 5/10                     │
│            850 000 zł                               │
│                                                     │
│  ● Opublikowane (wygasa za 45 dni)                  │
│                                                     │
│  👁 342 wyświetlenia   💬 3 zapytania               │
│                                                     │
│  [Edytuj]  [Zobacz ogłoszenie]  [Wycofaj]  [Odnów] │
└─────────────────────────────────────────────────────┘
```

### Sekcja zapytań

```
┌─────────────────────────────────────────────────────┐
│ Jan Kowalski                       Nowe ●           │
│ jan@example.com | 600 100 200                       │
│ "Czy możliwy jest odbiór w weekend?"                │
│ 20 maja 2026, 14:32                                 │
│                                                     │
│  [Zadzwoń]  [Wyślij email]  [Archiwizuj]           │
└─────────────────────────────────────────────────────┘
```

---

## 8. Lista zadań do wykonania

### Sprint A — Naprawa krytyczna (claim flow)

- [x] **A1** — Strona `/dodaj-oferte/potwierdzono`: jeśli klient jest zalogowany jako `private_seller`, wykonaj auto-claim od razu po weryfikacji i przekieruj do `/seller`.
  - Plik: `apps/web/src/app/(public)/dodaj-oferte/potwierdzono/page.tsx`
  - Logika: `useAuth()` → jeśli `isPrivateSellerUser(user)` → wywołaj `claimPublicListingSubmission(claimToken)` → redirect `/seller`
  - Wykonano: po poprawnej weryfikacji emaila zalogowany właściciel dostaje stan "Dodajemy ofertę do panelu", aplikacja wykonuje `claimPublicListingSubmission(claimToken)`, pokazuje toast z wynikiem i przekierowuje do `/seller`.

- [x] **A2** — Strona `/dodaj-oferte/potwierdzono`: jeśli klient NIE jest zalogowany, pokaż CTA "Zarejestruj się i zarządzaj ogłoszeniem" z `claimToken` w URL rejestracji.
  - Plik: `apps/web/src/app/(public)/dodaj-oferte/potwierdzono/page.tsx`
  - Link: `/rejestracja?claimToken=XYZ`
  - Wykonano: niezalogowany klient widzi CTA do rejestracji i logowania z `claimToken` w URL. Aktualna ścieżka aplikacji to `/register?claimToken=XYZ` oraz `/login?claimToken=XYZ`.

- [x] **A3** — Rejestracja: po rejestracji sprawdzić `claimToken` w URL i automatycznie wykonać claim.
  - Plik: `apps/web/src/app/(public)/rejestracja/page.tsx` (lub odpowiednik — trzeba znaleźć)
  - Logika: po `register()` + `login()` → jeśli `claimToken` w searchParams → `claimPublicListingSubmission(claimToken)` → redirect `/seller`
  - Wykonano: odpowiednik to `apps/web/src/app/(auth)/register/page.tsx`. Rejestracja z `claimToken` wymusza konto `private_seller`, pomija automatyczny redirect auth, wykonuje claim i dopiero potem przechodzi do `/seller`. Backend claim przypisuje anonimowe zgłoszenie i listing do aktualnego `ownerUserId`.

- [x] **A4** — Backend: dodać endpoint `POST /api/admin/listing-submissions/:id/approve` (tylko rola `admin`).
  - Działanie: ustawia `Listing.publicationStatus = published`, `Listing.publishedAt = now`, NIE zmienia `ownerUserId`
  - Plik: `apps/api/src/public-listing-submissions/public-listing-submissions.controller.ts`
  - Plik: `apps/api/src/public-listing-submissions/public-listing-submissions.service.ts`
  - Wykonano: dodano kontroler `AdminListingSubmissionsController` pod `/api/admin/listing-submissions`, zabezpieczony `@Roles(UserRole.ADMIN)`. `approveByAdmin()` publikuje powiązany listing, generuje `publicSlug` jeśli go brakuje, ustawia daty publikacji/wygasania, zapisuje metadane `adminApproval` i log aktywności, bez zmiany `ownerUserId`.

- [x] **A5** — Backend: dodać endpoint `POST /api/admin/listing-submissions/:id/reject` (tylko rola `admin`).
  - Działanie: ustawia `Listing.publicationStatus = draft`, `submission.status = rejected`, wysyła email do klienta z powodem
  - Plik: jak wyżej
  - Wykonano: dodano DTO z wymaganym powodem odrzucenia, endpoint `POST /api/admin/listing-submissions/:id/reject` zabezpieczony rolą `admin` oraz `rejectByAdmin()`. Odrzucenie przestawia listing na `draft`, czyści daty publikacji/wygasania, ustawia `submission.status = rejected`, zapisuje `adminRejection` w metadanych, loguje aktywność i wysyła email do klienta z powodem.

---

### Sprint B — Panel klienta (statystyki i UX)

- [x] **B1** — Backend: dołączyć `viewCount` do odpowiedzi `GET /api/public-listing-submissions/seller`.
  - Plik: `apps/api/src/public-listing-submissions/public-listing-submissions.service.ts` — funkcja `toSellerListItem`
  - Logika: pobrać `publicViewCount` z `publishedListing` (już obliczany przez `attachPublicViewCounts`)
  - Wykonano: `findForOwner()` agreguje eventy `public_listing_viewed` dla powiązanych listingów i uzupełnia `publishedListing.publicViewCount`; `toSellerListItem()` zwraca `viewCount`.

- [x] **B2** — Frontend typ: dodać pole `viewCount: number | null` do `SellerPublicListingSubmissionListItem`.
  - Plik: `apps/web/src/lib/public-listing-submissions.ts`
  - Wykonano: kontrakt frontendowy listy ogłoszeń właściciela zawiera `viewCount: number | null`.

- [x] **B3** — Frontend UI: pokazać licznik wyświetleń (`👁 X wyświetleń`) na karcie ogłoszenia w `/seller`.
  - Plik: `apps/web/src/app/(seller)/seller/page.tsx` — komponent `SellerSubmissionCard`
  - Ikona: `Eye` z lucide-react (już importowana)
  - Wykonano: karta ogłoszenia pokazuje ikonę `Eye` i sformatowany licznik wyświetleń, jeśli listing jest już powiązany z publiczną ofertą.

- [x] **B4** — Frontend UI: pokazać liczbę zapytań (`💬 X zapytań`) na karcie ogłoszenia w `/seller`.
  - Plik: `apps/web/src/app/(seller)/seller/page.tsx` — komponent `SellerSubmissionCard`
  - Dane: dodać `inquiryCount` do odpowiedzi backendowej lub obliczać z istniejącej listy `inquiries`
  - Wykonano: backend zwraca `inquiryCount` na bazie `public_leads`, typ frontendowy zawiera pole, a karta ogłoszenia pokazuje ikonę `MessageSquareText` i licznik zapytań.

- [x] **B5** — Strona szczegółów ogłoszenia `/seller/listings/[id]` — widok tylko do odczytu z pełnymi statystykami.
  - Strona powinna pokazywać: status, wyświetlenia, zapytania, daty, link do publicznego ogłoszenia, akcje (edytuj/wycofaj/odnów)
  - Plik do stworzenia: `apps/web/src/app/(seller)/seller/listings/[id]/page.tsx`
  - Wykonano: dodano stronę szczegółów z ochroną roli `private_seller`, statystykami, statusem, datami, ceną/opisem, linkiem publicznym oraz akcjami `Edytuj`, `Wycofaj`, `Odnów`. Karta w `/seller` ma link `Szczegóły`.

- [x] **B6** — Ulepszyć komunikat statusu `verified` / `w weryfikacji` w panelu `/seller`.
  - Zamiast ogólnego "W weryfikacji" pokazać: "Twoje ogłoszenie oczekuje na publikację. Zazwyczaj trwa to do 24h."
  - Plik: `apps/web/src/app/(seller)/seller/page.tsx` — etykiety statusów
  - Wykonano: status `verified` pokazuje nowy, konkretny komunikat, `claimed` z nieopublikowanym listingiem pokazuje "W weryfikacji przez zespół", a listing z `publicationStatus = published` jest prezentowany jako "Opublikowane".

---

### Sprint C — Panel moderacji admina

- [x] **C1** — Frontend: strona `/dashboard/admin/submissions` — lista zgłoszeń do moderacji (tylko dla roli `admin`).
  - Pokazuje zgłoszenia z `status = claimed` i `listing.publicationStatus = draft` (wymagające przeglądu)
  - Kolumny: data, email klienta, tytuł ogłoszenia, cena, lokalizacja, status
  - Wykonano: dodano admin-only stronę `/dashboard/admin/submissions` oraz link w sidebarze dla administratorów. Backend `GET /api/admin/listing-submissions` zwraca maksymalnie 100 zgłoszeń `claimed` z listingiem w `publicationStatus = draft`; UI pokazuje datę, email/telefon, właściciela, tytuł, cenę, lokalizację i status moderacji.

- [x] **C2** — Frontend: akcje na liście moderacji — `Zatwierdź` i `Odrzuć` (z polem powodu odrzucenia).
  - Wykonano: każda karta moderacji ma akcję `Zatwierdź` wywołującą `POST /api/admin/listing-submissions/:id/approve` oraz `Odrzuć` z wymaganym textarea powodu, który trafia do `POST /api/admin/listing-submissions/:id/reject`. Po sukcesie zgłoszenie znika z listy i użytkownik dostaje toast.

- [x] **C3** — Email do klienta przy zatwierdzeniu — "Twoje ogłoszenie zostało opublikowane, możesz je zobaczyć tutaj: [link]".
  - Wykonano: `approveByAdmin()` po publikacji wysyła email do właściciela z linkiem do `/oferty/:slug` zbudowanym na bazie `FRONTEND_URL`. Test serwisu sprawdza wysyłkę i poprawny publiczny URL.

- [x] **C4** — Email do klienta przy odrzuceniu — "Twoje ogłoszenie zostało odrzucone. Powód: [powód]. Możesz je poprawić i wysłać ponownie."
  - Wykonano: `rejectByAdmin()` wysyła email z tematem "Twoje ogłoszenie zostało odrzucone", powodem odrzucenia oraz linkiem do panelu właściciela `/seller`, gdzie klient może poprawić ogłoszenie i wysłać je ponownie do weryfikacji. Test serwisu sprawdza temat, powód i link.

---

### Sprint D — Dodatkowe ulepszenia

- [ ] **D1** — Ścieżka upgrade: CTA w panelu `/seller` "Chcesz więcej? Przejdź na konto agenta" z opisem benefitów.

- [ ] **D2** — Powiadomienie email do klienta gdy ogłoszenie wygasa za 7 dni — "Twoje ogłoszenie wygaśnie za 7 dni. Odnów je tutaj."

- [ ] **D3** — Możliwość wysłania ponownie zgłoszenia po odrzuceniu — klient edytuje i klika "Wyślij do ponownej weryfikacji".

---

## 9. Statusy ogłoszenia — co klient widzi vs co jest w bazie

| Status w bazie (`submission.status`) | Co klient widzi w /seller | Co powinno się dziać |
|--------------------------------------|--------------------------|---------------------|
| `pending_email_verification` | "Oczekuje na potwierdzenie emaila" | Klient klika link w emailu |
| `verified` | "W weryfikacji" | Oczekuje na claim lub moderację |
| `claimed` + listing `published` | "Opublikowane ✅" | Widoczne w katalogu |
| `claimed` + listing `draft` | "W weryfikacji przez zespół" | Admin zatwierdza |
| `claimed` + listing `unpublished` | "Wycofane" | Klient może odnowić |
| `claimed` + listing `expired` | "Wygasłe" | Klient może odnowić |
| `rejected` | "Odrzucone — powód: ..." | Klient może poprawić i wysłać ponownie |
| `expired` | "Wygasło bez weryfikacji" | Link w emailu wygasł |
