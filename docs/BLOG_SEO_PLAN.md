# EstateFlow — plan strony blogowej i SEO content hub

> Dokument planistyczny.
> Data utworzenia: 2026-06-03
> Cel: rozpisać zadania potrzebne do przygotowania bloga, który będzie
> wspierał pozyskiwanie ruchu organicznego, budowanie topical authority i
> konwersję użytkowników na leady oraz rejestracje w EstateFlow.

---

## 1. Cel bloga

Blog nie ma być tylko listą aktualności. Ma działać jako content hub SEO dla
rynku nieruchomości i wspierać trzy cele:

- pozyskiwanie ruchu z Google na frazy poradnikowe i lokalne,
- budowanie wiarygodności EstateFlow jako narzędzia dla agentów, biur i
  właścicieli nieruchomości,
- kierowanie czytelników do ofert, formularzy kontaktowych, rejestracji i
  modułów produktowych.

Zakładany rytm publikacji: minimum 1 artykuł tygodniowo.

Na start budujemy blog centralny EstateFlow pod domeną główną. Blogi agencji na
stronach brandowych powinny wykorzystywać tę samą bazową infrastrukturę CMS, ale
mogą zostać włączone jako kolejny etap.

---

## 2. Priorytety

- 🔴 **BLOCKER SEO** — bez tego blog nie powinien być indeksowany publicznie
- 🟠 **WAŻNE** — powinno wejść w MVP, mocno wpływa na jakość SEO i publikację
- 🟡 **ZALECANE** — warto zrobić szybko po MVP
- 🟢 **OPCJONALNE** — rozwój po pierwszych danych z Search Console

---

## 3. Zakres MVP

### Publiczny blog

- [ ] 🔴 Trasa listy wpisów: `/blog`
- [ ] 🔴 Trasa szczegółu wpisu: `/blog/[slug]`
- [ ] 🔴 Lista wpisów pokazuje tylko status `published`
- [ ] 🔴 Szczegół wpisu nie pokazuje draftów, archived ani wpisów z przyszłą datą
- [ ] 🔴 Każdy wpis ma stabilny, unikalny `slug`
- [ ] 🔴 Każdy wpis ma canonical do własnego URL
- [ ] 🔴 Każdy wpis ma unikalne `title`, `description`, `h1` i datę publikacji
- [ ] 🟠 Kategorie: kupno, sprzedaż, wynajem, inwestowanie, prawo, kredyt,
      poradnik agenta, rynek lokalny
- [ ] 🟠 Strony kategorii: `/blog/kategoria/[slug]`
- [ ] 🟠 Widok autora: `/blog/autor/[slug]` lub prosty blok autora na wpisie
- [ ] 🟠 Sekcja powiązanych wpisów na końcu artykułu
- [ ] 🟠 CTA we wpisie: przejście do ofert, dodanie oferty, kontakt lub rejestracja
- [ ] 🟡 Tagi jako wewnętrzna organizacja treści; publiczne tag pages dopiero po
      kontroli jakości i liczbie wpisów

### Panel zarządzania treścią

- [ ] 🔴 Moduł w dashboardzie: `/dashboard/blog`
- [ ] 🔴 Lista wpisów z filtrami: status, kategoria, autor, data
- [ ] 🔴 Tworzenie wpisu
- [ ] 🔴 Edycja wpisu
- [ ] 🔴 Statusy: `draft | scheduled | published | archived`
- [ ] 🔴 Podgląd draftu bez indeksowania
- [ ] 🔴 Publikuj / wycofaj publikację
- [ ] 🟠 Planowana publikacja po `publishedAt`
- [ ] 🟠 Walidacja SEO przed publikacją
- [ ] 🟠 Biblioteka obrazów lub upload cover image do istniejącego storage
- [ ] 🟡 Historia zmian lub minimum `updatedAt` i `lastEditedBy`

### Edytor treści

- [ ] 🔴 Obsługa nagłówków `h2`, `h3`, akapitów, list, cytatów i linków
- [ ] 🔴 Obsługa obrazów wewnątrz artykułu z `alt`
- [ ] 🔴 Sanitizacja HTML/Markdown po stronie API
- [ ] 🔴 Automatyczne blokowanie więcej niż jednego `h1` w treści
- [ ] 🟠 Spis treści generowany z `h2`
- [ ] 🟠 Bloki CTA: link do katalogu ofert, formularz kontaktowy, rejestracja,
      dodanie oferty
- [ ] 🟠 Bloki ofert: ręcznie wybrane oferty lub automatyczne powiązanie po
      lokalizacji/kategorii
- [ ] 🟡 FAQ block generujący schema `FAQPage`, używany tylko gdy pytania i
      odpowiedzi są faktycznie widoczne na stronie

---

## 4. Model danych

### `BlogPost`

Pola:

- `id`
- `title`
- `slug`
- `excerpt`
- `content`
- `contentFormat`: `markdown | html | json`
- `coverImageUrl`
- `coverImageAlt`
- `status`: `draft | scheduled | published | archived`
- `categoryId`
- `authorId`
- `seoTitle`
- `seoDescription`
- `canonicalUrl`
- `robots`: `index_follow | noindex_follow`
- `publishedAt`
- `updatedAt`
- `createdAt`
- `createdBy`
- `updatedBy`

Uwagi:

- `canonicalUrl` domyślnie powinien wskazywać własny URL wpisu.
- Niestandardowy canonical dopuszczamy tylko dla świadomie syndykowanych treści.
- Wpis z `status != published` zawsze ma `noindex, nofollow` albo nie jest
  dostępny publicznie.

### `BlogCategory`

Pola:

- `id`
- `name`
- `slug`
- `description`
- `seoTitle`
- `seoDescription`
- `sortOrder`
- `isIndexable`
- `createdAt`
- `updatedAt`

### `BlogAuthor`

Pola:

- `id`
- `displayName`
- `slug`
- `bio`
- `avatarUrl`
- `role`
- `expertise`
- `sameAsLinks`
- `createdAt`
- `updatedAt`

Na start autor może być powiązany z kontem admina lub agentem. Docelowo autor
powinien wspierać E-E-A-T: bio, specjalizacja, linki i jasny profil ekspercki.

### `BlogPostTag`

Pola:

- `id`
- `postId`
- `tag`

Tagi na start służą do organizacji i wyszukiwania w panelu. Publiczne strony
tagów powinny być `noindex` do czasu, aż będą mieć wystarczająco dużo
unikalnej treści.

---

## 5. API

### Prywatne API panelu

- [ ] 🔴 `GET /api/blog/posts`
- [ ] 🔴 `POST /api/blog/posts`
- [ ] 🔴 `GET /api/blog/posts/:id`
- [ ] 🔴 `PATCH /api/blog/posts/:id`
- [ ] 🔴 `DELETE /api/blog/posts/:id` lub archiwizacja zamiast twardego usuwania
- [ ] 🔴 `POST /api/blog/posts/:id/publish`
- [ ] 🔴 `POST /api/blog/posts/:id/unpublish`
- [ ] 🟠 `POST /api/blog/posts/:id/preview-token`
- [ ] 🟠 `GET /api/blog/categories`
- [ ] 🟠 `POST /api/blog/categories`
- [ ] 🟠 `PATCH /api/blog/categories/:id`
- [ ] 🟡 `GET /api/blog/authors`
- [ ] 🟡 `POST /api/blog/authors`

Wymagania:

- wszystkie operacje zapisu wymagają roli admin/owner lub osobnego uprawnienia
  `blog:manage`,
- API nie może pozwalać na publikację wpisu bez wymaganych pól SEO,
- slug musi być unikalny i odporny na kolizje,
- preview draftu powinien działać przez czasowy token, nie przez publiczny URL.

### Publiczne API

- [ ] 🔴 `GET /api/public-blog/posts`
- [ ] 🔴 `GET /api/public-blog/posts/:slug`
- [ ] 🟠 `GET /api/public-blog/categories/:slug`
- [ ] 🟡 `GET /api/public-blog/authors/:slug`

Wymagania:

- publiczne endpointy zwracają wyłącznie opublikowane wpisy,
- odpowiedzi powinny zawierać dane potrzebne do SEO metadata i schema,
- nie zwracamy pól administracyjnych ani draft contentu.

---

## 6. Frontend i UX

### Struktura tras

- [ ] 🔴 `apps/web/src/app/(marketing)/blog/page.tsx`
- [ ] 🔴 `apps/web/src/app/(marketing)/blog/[slug]/page.tsx`
- [ ] 🟠 `apps/web/src/app/(marketing)/blog/kategoria/[slug]/page.tsx`
- [ ] 🟡 `apps/web/src/app/(marketing)/blog/autor/[slug]/page.tsx`
- [ ] 🔴 `apps/web/src/app/(dashboard)/dashboard/blog/page.tsx`
- [ ] 🟠 `apps/web/src/app/(dashboard)/dashboard/blog/new/page.tsx`
- [ ] 🟠 `apps/web/src/app/(dashboard)/dashboard/blog/[id]/edit/page.tsx`

### Lista bloga

- [ ] 🔴 H1: `Blog EstateFlow` lub docelowa nazwa content hubu
- [ ] 🔴 Intro tekstowe opisujące tematykę bloga, bez przesadnego marketingu
- [ ] 🔴 Karty wpisów: title, excerpt, kategoria, data, cover image, autor
- [ ] 🟠 Sekcja wyróżnionego wpisu
- [ ] 🟠 Filtrowanie po kategorii jako linki do czystych URL, nie query params
- [ ] 🟠 Paginacja z poprawnym canonical i robots
- [ ] 🟡 Newsletter lub zapis na powiadomienia po wdrożeniu email marketingu

### Szczegół wpisu

- [ ] 🔴 Jeden `h1`
- [ ] 🔴 Widoczny autor i data publikacji
- [ ] 🔴 Widoczna data aktualizacji, jeśli treść była istotnie zmieniona
- [ ] 🔴 Cover image z opisowym `alt`
- [ ] 🔴 Czytelna typografia artykułu
- [ ] 🔴 Linki wewnętrzne do ofert, stron produktowych i powiązanych artykułów
- [ ] 🟠 Spis treści dla dłuższych wpisów
- [ ] 🟠 Blok autora pod artykułem
- [ ] 🟠 Powiązane wpisy
- [ ] 🟠 CTA dobrane do intencji artykułu
- [ ] 🟡 FAQ na końcu wpisów poradnikowych

---

## 7. SEO techniczne

### Metadata

- [ ] 🔴 `generateMetadata` dla `/blog`, kategorii i wpisów
- [ ] 🔴 Unikalny `title` dla każdego wpisu, najlepiej do ok. 50-60 znaków
- [ ] 🔴 Unikalny `description`, najlepiej do ok. 150-160 znaków
- [ ] 🔴 Canonical URL dla każdej indeksowalnej strony
- [ ] 🔴 `robots: index, follow` tylko dla publicznych, jakościowych stron
- [ ] 🔴 Draft, preview, search i puste listingi zawsze `noindex`
- [ ] 🟠 Open Graph title/description/image
- [ ] 🟠 Twitter card metadata

### Sitemap

- [ ] 🔴 Dodać opublikowane wpisy blogowe do `apps/web/src/app/sitemap.ts`
- [ ] 🔴 Dodać `lastModified` na podstawie `updatedAt`
- [ ] 🔴 Sitemap nie zawiera draftów, archived ani scheduled
- [ ] 🟠 Dodać indeksowalne kategorie, jeśli mają minimum kilka wpisów i opis
- [ ] 🟡 Osobny sitemap segment dla bloga, jeśli liczba URL zacznie rosnąć

### Robots i indeksacja

- [ ] 🔴 `robots.ts` nie blokuje `/blog`
- [ ] 🔴 Preview URL i panel dashboardu nie są indeksowalne
- [ ] 🔴 Strony wyszukiwania bloga, jeśli powstaną, mają `noindex, follow`
- [ ] 🟠 Paginacja `/blog/page/[page]`: indeksować tylko jeśli strony mają
      wystarczającą wartość; na start można dać canonical do `/blog` albo
      `noindex, follow` dla stron 2+

### Schema.org

- [ ] 🔴 `BlogPosting` na szczególe wpisu
- [ ] 🔴 `BreadcrumbList` na wpisie i kategorii
- [ ] 🟠 `Person` albo `Organization` dla autora/wydawcy
- [ ] 🟠 `ImageObject` dla cover image
- [ ] 🟡 `FAQPage` tylko dla wpisów z realnym, widocznym FAQ

### Performance

- [ ] 🔴 Obrazy przez `next/image` lub istniejący mechanizm optymalizacji
- [ ] 🔴 Lazy loading obrazów w treści poza pierwszym ekranem
- [ ] 🔴 Brak ciężkich embedów bez zgody użytkownika i bez lazy loadingu
- [ ] 🟠 Cache publicznych wpisów i list
- [ ] 🟠 Stabilne wymiary obrazów, żeby ograniczyć CLS
- [ ] 🟡 Web Vitals monitorowane po launchu

---

## 8. Strategia treści

### Główne klastry tematyczne

1. **Sprzedaż nieruchomości**
   - jak przygotować mieszkanie do sprzedaży,
   - jak wycenić mieszkanie,
   - jakie dokumenty są potrzebne do sprzedaży,
   - jak wybrać pośrednika,
   - błędy sprzedających.

2. **Kupno nieruchomości**
   - jak sprawdzić mieszkanie przed zakupem,
   - księga wieczysta,
   - zadatek vs zaliczka,
   - koszty notarialne,
   - negocjacja ceny.

3. **Wynajem**
   - umowa najmu okazjonalnego,
   - jak zweryfikować najemcę,
   - protokół zdawczo-odbiorczy,
   - podatki od wynajmu,
   - najczęstsze problemy właścicieli.

4. **Dla agentów i biur nieruchomości**
   - CRM dla agenta nieruchomości,
   - automatyzacja obsługi leadów,
   - jak pisać opisy ofert,
   - jak mierzyć skuteczność ogłoszeń,
   - jak prowadzić bazę klientów.

5. **Lokalne SEO nieruchomości**
   - rynek mieszkaniowy w konkretnych miastach,
   - poradniki lokalizacyjne,
   - dzielnice i typy nieruchomości,
   - frazy typu `mieszkania na sprzedaż [miasto]` jako osobne landing pages,
     nie jako przypadkowe filtry katalogu.

### Priorytet pierwszych 12 tygodni

- [ ] 🟠 Tydzień 1: `Jak przygotować mieszkanie do sprzedaży krok po kroku`
- [ ] 🟠 Tydzień 2: `Jak wycenić mieszkanie przed wystawieniem ogłoszenia`
- [ ] 🟠 Tydzień 3: `Jak napisać skuteczny opis ogłoszenia nieruchomości`
- [ ] 🟠 Tydzień 4: `Jakie zdjęcia mieszkania zwiększają liczbę zapytań`
- [ ] 🟠 Tydzień 5: `CRM dla agenta nieruchomości: co powinien automatyzować`
- [ ] 🟠 Tydzień 6: `Jak agent nieruchomości powinien obsługiwać leady`
- [ ] 🟠 Tydzień 7: `Najczęstsze błędy przy sprzedaży mieszkania`
- [ ] 🟠 Tydzień 8: `Jak sprawdzić księgę wieczystą mieszkania`
- [ ] 🟠 Tydzień 9: `Zadatek a zaliczka przy zakupie nieruchomości`
- [ ] 🟠 Tydzień 10: `Jak przygotować mieszkanie do wynajmu`
- [ ] 🟠 Tydzień 11: `Najem okazjonalny: co powinien wiedzieć właściciel`
- [ ] 🟠 Tydzień 12: `Jak mierzyć skuteczność ogłoszeń nieruchomości`

Każdy artykuł powinien linkować do minimum 2-4 innych wpisów lub stron
EstateFlow, gdy takie treści już istnieją.

---

## 9. Checklist publikacji artykułu

Przed publikacją każdego wpisu:

- [ ] 🔴 Fraza główna jest wybrana i wpis odpowiada na konkretną intencję
      wyszukiwania
- [ ] 🔴 Tytuł artykułu jest naturalny i zawiera główny temat
- [ ] 🔴 `seoTitle` jest unikalny
- [ ] 🔴 `seoDescription` jest unikalny i zachęca do kliknięcia
- [ ] 🔴 Slug jest krótki, czytelny i bez daty
- [ ] 🔴 Wpis ma jeden `h1`
- [ ] 🔴 Struktura używa logicznych `h2` i `h3`
- [ ] 🔴 Cover image ma opisowy `alt`
- [ ] 🔴 Wpis ma minimum 2 linki wewnętrzne, jeśli istnieją pasujące treści
- [ ] 🔴 Wpis ma CTA dopasowane do intencji
- [ ] 🟠 Wpis ma sekcję FAQ, jeśli temat naturalnie tego wymaga
- [ ] 🟠 Treść zawiera aktualne informacje prawne/rynkowe, jeśli temat jest
      wrażliwy na zmiany
- [ ] 🟠 Autor jest widoczny i wiarygodny
- [ ] 🟠 Podgląd mobile i desktop jest sprawdzony
- [ ] 🟠 URL został dodany do sitemap automatycznie po publikacji

---

## 10. Linkowanie wewnętrzne

Zasady:

- wpisy poradnikowe linkują do powiązanych wpisów i katalogu ofert,
- wpisy dla agentów linkują do strony rejestracji, funkcji produktu i dashboardu
  po zalogowaniu,
- wpisy o sprzedaży linkują do formularza dodania oferty lub kontaktu,
- wpisy lokalne linkują do przyszłych landing pages lokalizacyjnych, nie do
  indeksowanych query params,
- nie tworzymy automatycznie setek linków do pustych lub niskiej jakości stron.

Zadania:

- [ ] 🟠 Dodać pole `relatedPostIds` albo automatyczne powiązania po kategorii
- [ ] 🟠 Dodać komponent `RelatedPosts`
- [ ] 🟠 Dodać komponent `ArticleCta`
- [ ] 🟡 Dodać raport w panelu: wpisy bez linków wewnętrznych
- [ ] 🟡 Dodać sugestie linkowania na podstawie kategorii i fraz

---

## 11. Analityka i mierniki

### Narzędzia

- [ ] 🔴 Google Search Console dla domeny produkcyjnej
- [ ] 🔴 Sitemap zgłoszony w Search Console
- [ ] 🟠 Analytics zgodne z cookie consent i RODO
- [ ] 🟠 Eventy CTA z artykułów
- [ ] 🟡 Dashboard content performance w panelu admina

### KPI

Mierzymy:

- liczba zaindeksowanych wpisów,
- kliknięcia z Google,
- wyświetlenia w wynikach wyszukiwania,
- średnia pozycja dla głównych fraz,
- CTR,
- wejścia na artykuły,
- przejścia z artykułów do ofert/rejestracji/formularzy,
- leady przypisane do bloga,
- liczba wpisów opublikowanych w miesiącu.

Zadania:

- [ ] 🟠 Dodać UTM lub event source dla CTA z bloga
- [ ] 🟠 Rozróżnić leady z bloga od leadów z katalogu ofert
- [ ] 🟡 Miesięczny przegląd wpisów: co rośnie, co wymaga aktualizacji
- [ ] 🟡 Lista artykułów do odświeżenia po 3-6 miesiącach

---

## 12. Governance SEO

### Reguły indeksowania

Indeksujemy:

- `/blog`
- `/blog/[slug]`
- `/blog/kategoria/[slug]`, jeśli kategoria ma opis i sensowną liczbę wpisów

Nie indeksujemy:

- draftów,
- preview,
- wyników wyszukiwania bloga,
- pustych kategorii,
- tagów na starcie,
- stron paginacji o niskiej wartości,
- automatycznych archiwów po dacie.

### Duplicate content

- [ ] 🔴 Ten sam artykuł nie może być publikowany pod wieloma URL
- [ ] 🔴 Kategoria nie powiela pełnych treści artykułów, tylko excerpt
- [ ] 🔴 Paginacja i filtrowanie nie tworzą indeksowalnych duplikatów
- [ ] 🟠 Przy aktualizacji artykułu zachowujemy ten sam slug, jeśli temat się nie
      zmienił
- [ ] 🟠 Jeśli slug musi się zmienić, dodajemy redirect 301 ze starego URL

### Jakość treści

- [ ] 🔴 Nie publikować wpisów krótkich, generycznych i bez realnej wartości
- [ ] 🔴 Artykuły prawne i podatkowe oznaczać jako informacyjne, nie jako poradę
      prawną
- [ ] 🟠 Treści zależne od przepisów mają datę aktualizacji i regularny review
- [ ] 🟠 Przy tematach eksperckich podawać autora lub konsultanta merytorycznego

---

## 13. Rozszerzenie: blogi agencji

Po uruchomieniu bloga centralnego można wykorzystać ten sam mechanizm dla
stron brandowych biur.

Zakres:

- [ ] 🟡 `AgencyBlogPost` albo rozszerzenie `BlogPost` o `agencyId`
- [ ] 🟡 Publiczne trasy: `/biura/[agencySlug]/blog`
- [ ] 🟡 Publiczne trasy: `/biura/[agencySlug]/blog/[slug]`
- [ ] 🟡 Panel w `/dashboard/website/blog`
- [ ] 🟡 Autorzy powiązani z agentami agencji
- [ ] 🟡 CTA do ofert tylko z danej agencji
- [ ] 🟡 Sitemap stron brandowych uwzględnia wpisy tylko opublikowanych stron
      agencji
- [ ] 🟠 Canonical musi wskazywać domenę/ścieżkę danej agencji, nie centralny
      blog EstateFlow

Ryzyko:

- wiele agencji może publikować podobne poradniki,
- grozi duplicate content między blogiem centralnym i blogami agencji,
- potrzebne będą szablony i walidatory jakości, żeby nie indeksować masowo
  cienkich treści.

Rekomendacja:

- najpierw blog centralny EstateFlow,
- potem blog agencji tylko dla planów płatnych,
- na starcie blog agencji z limitem publikacji i ręcznym review SEO.

---

## 14. Etapy wdrożenia

### Etap 1 — Fundament techniczny

- [ ] 🔴 Zaprojektować migracje DB dla `BlogPost`, `BlogCategory`,
      `BlogAuthor`, `BlogPostTag`
- [ ] 🔴 Dodać moduł API `blog`
- [ ] 🔴 Dodać publiczne endpointy bloga
- [ ] 🔴 Dodać podstawowe testy API dla statusów publikacji i widoczności draftów
- [ ] 🔴 Dodać routing `/blog` i `/blog/[slug]`
- [ ] 🔴 Dodać metadata, canonical, schema i sitemap

### Etap 2 — Panel redakcyjny

- [ ] 🔴 Dodać `/dashboard/blog`
- [ ] 🔴 Dodać formularz tworzenia/edycji wpisu
- [ ] 🔴 Dodać walidację SEO przed publikacją
- [ ] 🔴 Dodać preview draftu
- [ ] 🟠 Dodać upload cover image
- [ ] 🟠 Dodać planowanie publikacji

### Etap 3 — Content launch

- [ ] 🟠 Przygotować 5-8 artykułów przed publicznym uruchomieniem bloga
- [ ] 🟠 Przygotować kategorie z opisami SEO
- [ ] 🟠 Ustawić linkowanie wewnętrzne między pierwszymi artykułami
- [ ] 🟠 Zgłosić sitemap w Search Console
- [ ] 🟠 Sprawdzić indeksację pierwszych URL

### Etap 4 — Optymalizacja

- [ ] 🟡 Monitorować Search Console co tydzień przez pierwsze 2 miesiące
- [ ] 🟡 Aktualizować artykuły, które mają wyświetlenia bez kliknięć
- [ ] 🟡 Rozbudować artykuły, które zaczynają rankować na long tail
- [ ] 🟡 Dodać lokalne landing pages dopiero po zebraniu danych i ofert
- [ ] 🟢 Dodać newsletter, jeśli blog zacznie generować powracających czytelników

---

## 15. Kryteria gotowości MVP

Blog można uznać za gotowy do publikacji, gdy:

- [ ] 🔴 `/blog` i `/blog/[slug]` działają produkcyjnie
- [ ] 🔴 drafty nie są dostępne publicznie
- [ ] 🔴 metadata i canonical działają dla listy i wpisów
- [ ] 🔴 sitemap zawiera opublikowane wpisy
- [ ] 🔴 schema `BlogPosting` jest poprawna
- [ ] 🔴 panel pozwala stworzyć, edytować i opublikować wpis
- [ ] 🔴 każdy wpis można opublikować z cover image, excerptem i polami SEO
- [ ] 🔴 obrazy mają `alt`
- [ ] 🔴 linki wewnętrzne i CTA są dostępne we wpisie
- [ ] 🟠 Search Console jest skonfigurowany
- [ ] 🟠 na start są gotowe minimum 3 jakościowe wpisy

---

## 16. Sprinty i dziennik wykonania

Ta sekcja jest roboczą listą zadań. Po wykonaniu zadania odznaczamy checkbox i
dopisujemy krótką notatkę w polu `Wykonano`, najlepiej z datą, nazwą plików,
endpointów albo decyzją techniczną.

Format notatki:

```md
- [x] Zadanie
  - Wykonano: 2026-06-03 — krótki opis zmiany, pliki, endpointy, decyzje.
```

### Sprint 1 — Fundament danych i API

Cel sprintu: przygotować backendową bazę bloga, żeby dało się tworzyć,
edytować, publikować i bezpiecznie pobierać wpisy.

- [x] 🔴 Sprawdzić obecne wzorce modułów API, migracji i encji w `apps/api/src`
  - Wykonano: 2026-06-03 — sprawdzono wzorce NestJS/TypeORM w modułach
    `product-feedback`, `listings`, `users`, globalny `ValidationPipe`, role
    admina i ręczne migracje SQL w `apps/api/migrations`.
- [x] 🔴 Zaprojektować migracje DB dla `BlogPost`, `BlogCategory`,
      `BlogAuthor`, `BlogPostTag`
  - Wykonano: 2026-06-03 — dodano migrację
    `apps/api/migrations/20260603_blog_cms.sql` z tabelami bloga, indeksami,
    FK do `users` oraz typami enum PostgreSQL.
- [x] 🔴 Dodać enum statusów wpisu: `draft | scheduled | published | archived`
  - Wykonano: 2026-06-03 — dodano `BlogPostStatus` w
    `apps/api/src/blog/entities/blog-post.entity.ts` oraz typ
    `blog_posts_status_enum` w migracji.
- [x] 🔴 Dodać unikalność sluga wpisu i kategorii
  - Wykonano: 2026-06-03 — dodano unikalne indeksy dla `blog_posts.slug`,
    `blog_categories.slug` i `blog_authors.slug`; DTO walidują format sluga.
- [x] 🔴 Dodać pola SEO: `seoTitle`, `seoDescription`, `canonicalUrl`,
      `robots`
  - Wykonano: 2026-06-03 — pola SEO dodane w encji, migracji i DTO; serwis
    wymaga ich przed publikacją wpisu.
- [x] 🔴 Dodać pola publikacji: `publishedAt`, `createdAt`, `updatedAt`,
      `createdBy`, `updatedBy`
  - Wykonano: 2026-06-03 — pola publikacji i audytu dodane w `BlogPost`;
    `publishedAt` ustawia się automatycznie przy publikacji, jeśli nie podano
    daty.
- [x] 🔴 Utworzyć moduł backendowy `blog`
  - Wykonano: 2026-06-03 — dodano `BlogModule`, `BlogService`, kontrolery,
    encje, DTO i eksport `apps/api/src/blog/index.ts`; moduł podłączono w
    `AppModule`.
- [x] 🔴 Dodać prywatne endpointy CRUD dla wpisów
  - Wykonano: 2026-06-03 — dodano adminowe endpointy pod
    `/api/admin/blog/posts`; `DELETE` archiwizuje wpis zamiast usuwać go z DB.
- [x] 🔴 Dodać endpointy publikacji i wycofania publikacji
  - Wykonano: 2026-06-03 — dodano
    `POST /api/admin/blog/posts/:id/publish` i
    `POST /api/admin/blog/posts/:id/unpublish`.
- [x] 🔴 Dodać publiczne endpointy zwracające tylko opublikowane wpisy
  - Wykonano: 2026-06-03 — dodano `GET /api/public-blog/posts` i
    `GET /api/public-blog/posts/:slug`; lista nie zwraca pełnej treści wpisu.
- [x] 🔴 Zablokować publiczny dostęp do draftów, archived i scheduled
  - Wykonano: 2026-06-03 — publiczne query filtrują wyłącznie
    `status = published` i `publishedAt <= now`.
- [x] 🔴 Dodać walidację wymaganych pól przed publikacją
  - Wykonano: 2026-06-03 — publikacja wymaga `excerpt`, `content`, `seoTitle`,
    `seoDescription`, `coverImageUrl`, `coverImageAlt` i blokuje `H1` w treści.
- [x] 🔴 Dodać sanitizację treści po stronie API
  - Wykonano: 2026-06-03 — dodano podstawową sanitizację w `BlogService`:
    usuwanie `script/style/iframe/object/embed/link/meta`, handlerów `on*` i
    `javascript:` w linkach.
- [x] 🟠 Dodać endpointy kategorii
  - Wykonano: 2026-06-03 — dodano `GET/POST/PATCH /api/admin/blog/categories`
    oraz encję i DTO kategorii.
- [ ] 🟠 Dodać endpoint preview tokenu dla draftów
  - Wykonano:
- [x] 🟡 Dodać endpointy autorów
  - Wykonano: 2026-06-03 — dodano `GET/POST/PATCH /api/admin/blog/authors`
    oraz encję i DTO autorów z polami pod E-E-A-T.
- [x] 🔴 Dodać testy backendu dla widoczności statusów wpisów
  - Wykonano: 2026-06-03 — dodano test `BlogService`, który sprawdza, że
    publiczna lista filtruje tylko opublikowane wpisy z datą publikacji w
    przeszłości.
- [x] 🔴 Dodać testy backendu dla publikacji bez wymaganych pól SEO
  - Wykonano: 2026-06-03 — dodano test blokujący publikację niekompletnego
    wpisu oraz testy publikacji i archiwizacji.

### Sprint 2 — Publiczny blog i SEO techniczne

Cel sprintu: uruchomić indeksowalne strony bloga z poprawnymi metadanymi,
canonicalami, schema i sitemapą.

- [x] 🔴 Dodać trasę `/blog`
  - Wykonano: 2026-06-03 — dodano publiczną stronę listy wpisów w
    `apps/web/src/app/(marketing)/blog/page.tsx` z pustym stanem, hero i kartami
    artykułów.
- [x] 🔴 Dodać trasę `/blog/[slug]`
  - Wykonano: 2026-06-03 — dodano szczegół wpisu w
    `apps/web/src/app/(marketing)/blog/[slug]/page.tsx` z cover image, autorem,
    datami, treścią i CTA bocznym.
- [x] 🔴 Dodać pobieranie listy opublikowanych wpisów na `/blog`
  - Wykonano: 2026-06-03 — dodano klienta publicznego API w
    `apps/web/src/lib/blog.ts` i użycie `fetchPublicBlogPosts({ limit: 12 })`.
- [x] 🔴 Dodać pobieranie szczegółu wpisu po slugu
  - Wykonano: 2026-06-03 — dodano `fetchPublicBlogPost(slug)` i obsługę błędów
    API na stronie szczegółu.
- [x] 🔴 Dodać stan 404 dla nieistniejącego lub nieopublikowanego wpisu
  - Wykonano: 2026-06-03 — `ApiError 404` z publicznego API mapuje się na
    `notFound()` w `/blog/[slug]`.
- [x] 🔴 Dodać `generateMetadata` dla listy bloga
  - Wykonano: 2026-06-03 — lista bloga ma title, description, canonical, robots
    i Open Graph.
- [x] 🔴 Dodać `generateMetadata` dla szczegółu wpisu
  - Wykonano: 2026-06-03 — szczegół wpisu buduje metadata z pól SEO wpisu,
    fallbacku do excerptu i cover image.
- [x] 🔴 Dodać canonical dla `/blog`
  - Wykonano: 2026-06-03 — canonical listy wskazuje `absoluteUrl('/blog')`.
- [x] 🔴 Dodać canonical dla `/blog/[slug]`
  - Wykonano: 2026-06-03 — canonical szczegółu wskazuje `post.canonicalUrl` albo
    `absoluteUrl('/blog/[slug]')`.
- [x] 🔴 Dodać schema `BlogPosting` na szczególe wpisu
  - Wykonano: 2026-06-03 — dodano JSON-LD `BlogPosting` z headline,
    description, image, datami, autorem i publisherem.
- [x] 🔴 Dodać schema `BreadcrumbList`
  - Wykonano: 2026-06-03 — dodano JSON-LD breadcrumbs:
    EstateFlow → Blog → tytuł wpisu.
- [x] 🔴 Dodać opublikowane wpisy do `apps/web/src/app/sitemap.ts`
  - Wykonano: 2026-06-03 — sitemap zawiera `/blog` i opublikowane wpisy z
    `fetchPublicBlogSitemapEntries()`. Pobieranie ofert i bloga używa
    `Promise.allSettled`, żeby awaria jednego źródła nie usuwała drugiego.
- [x] 🔴 Sprawdzić, że `robots.ts` nie blokuje `/blog`
  - Wykonano: 2026-06-03 — dodano jawne `allow: '/blog/'` w
    `apps/web/src/app/robots.ts`.
- [x] 🟠 Dodać Open Graph image dla wpisów
  - Wykonano: 2026-06-03 — szczegół wpisu używa `coverImageUrl` jako OG/Twitter
    image z fallbackiem do lokalnego obrazu.
- [x] 🟠 Dodać strony kategorii `/blog/kategoria/[slug]`
  - Wykonano: 2026-06-03 — dodano publiczny endpoint
    `GET /api/public-blog/categories/:slug`, typy i fetch w
    `apps/web/src/lib/blog.ts` oraz stronę
    `apps/web/src/app/(marketing)/blog/kategoria/[slug]/page.tsx`.
    Kategorie indeksują się tylko, gdy backend zwraca `isIndexable = true` i
    jest to pierwsza strona wyników.
- [x] 🟠 Dodać paginację listy bloga z decyzją `index/noindex`
  - Wykonano: 2026-06-03 — dodano `BlogPagination` i obsługę `?page=` na
    `/blog` oraz `/blog/kategoria/[slug]`. Strony paginacji 2+ mają
    `noindex, follow` i canonical do bazowego widoku.
- [x] 🟠 Dodać komponent `RelatedPosts`
  - Wykonano: 2026-06-03 — dodano `RelatedPosts`, który na szczególe wpisu
    pokazuje do 3 powiązanych artykułów z tej samej kategorii, z pominięciem
    aktualnego wpisu.
- [x] 🟠 Dodać komponent `ArticleCta`
  - Wykonano: 2026-06-03 — dodano reusable `ArticleCta` z wariantami:
    rejestracja, katalog ofert i dodanie oferty. Szczegół wpisu dobiera wariant
    na podstawie tytułu, kategorii i tagów.
- [x] 🟠 Dodać spis treści generowany z nagłówków `h2`
  - Wykonano: 2026-06-03 — rozszerzono bezpieczny renderer Markdown o stabilne
    ID nagłówków i dodano `BlogTableOfContents`, który pokazuje spis treści,
    gdy artykuł ma co najmniej dwa nagłówki `h2`.
- [ ] 🔴 Sprawdzić Lighthouse/Web Vitals dla listy i szczegółu wpisu
  - Wykonano: 2026-06-03 — wykonano weryfikację kompilacyjną zamiast Lighthouse:
    `web type-check`, lint dotkniętych plików i `api test` przechodzą. Pełny
    `web build` po pobraniu fontów zatrzymuje się na istniejącym problemie
    `/feedback` (`useSearchParams()` bez Suspense), niezwiązanym z blogiem.
    Lighthouse zostaje do wykonania po uruchomieniu dev/prod z danymi bloga.

### Sprint 3 — Panel redakcyjny

Cel sprintu: umożliwić zarządzanie blogiem z dashboardu bez ręcznego edytowania
bazy danych.

- [x] 🔴 Dodać trasę `/dashboard/blog`
  - Wykonano: 2026-06-03 — dodano klientową stronę
    `apps/web/src/app/(dashboard)/dashboard/blog/page.tsx` oraz link `Blog` w
    sidebarze dashboardu widoczny dla administratora.
- [x] 🔴 Dodać listę wpisów w panelu
  - Wykonano: 2026-06-03 — dodano listę wpisów z publicznym URL-em, statusem,
    kategorią, autorem, datą publikacji/aktualizacji, stanem pustym,
    odświeżaniem i paginacją.
- [x] 🔴 Dodać filtry: status, kategoria, autor, data
  - Wykonano: 2026-06-03 — dodano filtry statusu, kategorii, autora i
    wyszukiwanie tekstowe. Filtr daty nie został dodany jako osobne pole, bo
    backend Sprintu 1 nie ma jeszcze zakresów dat w `BlogPostQueryDto`; wróci
    przy rozbudowie API filtrów.
- [x] 🔴 Dodać tworzenie nowego wpisu
  - Wykonano: 2026-06-03 — dodano trasę `/dashboard/blog/new`, wspólny
    formularz `BlogPostForm` i funkcję `createBlogPostAdmin()` wywołującą
    `POST /api/admin/blog/posts`.
- [x] 🔴 Dodać edycję istniejącego wpisu
  - Wykonano: 2026-06-03 — dodano trasę `/dashboard/blog/[id]/edit`, pobieranie
    wpisu przez `fetchBlogPostAdmin()` i zapis przez `updateBlogPostAdmin()`.
    Lista wpisów ma link `Edytuj` przy każdym rekordzie.
- [x] 🔴 Dodać pola: title, slug, excerpt, content, cover image, category,
      author
  - Wykonano: 2026-06-03 — formularz obsługuje tytuł, slug z generowaniem,
    lead, treść Markdown, cover image URL, alt obrazka, kategorię, autora, tagi
    i datę publikacji.
- [x] 🔴 Dodać pola SEO: seoTitle, seoDescription, canonicalUrl, robots
  - Wykonano: 2026-06-03 — formularz ma sekcję SEO z `seoTitle`,
    `seoDescription`, `canonicalUrl` i `robots`.
- [x] 🔴 Dodać walidację SEO przed publikacją
  - Wykonano: 2026-06-03 — dodano panel `Gotowość SEO`; próba zapisu ze statusem
    `published` jest blokowana, jeśli brakuje leadu, treści, pól SEO, cover
    image, alt albo treść zawiera H1.
- [x] 🔴 Dodać akcję `Publikuj`
  - Wykonano: 2026-06-03 — lista wpisów ma akcję publikacji wywołującą
    `POST /api/admin/blog/posts/:id/publish` przez `publishBlogPostAdmin()`.
- [x] 🔴 Dodać akcję `Wycofaj publikację`
  - Wykonano: 2026-06-03 — lista wpisów ma akcję wycofania publikacji
    wywołującą `POST /api/admin/blog/posts/:id/unpublish` przez
    `unpublishBlogPostAdmin()`.
- [x] 🟠 Dodać archiwizację wpisu z listy
  - Wykonano: 2026-06-03 — lista wpisów ma akcję `Archiwizuj`, która wywołuje
    `DELETE /api/admin/blog/posts/:id`; backend archiwizuje wpis zamiast usuwać
    rekord z bazy.
- [x] 🔴 Dodać podgląd wpisu przed publikacją
  - Wykonano: 2026-06-03 — dodano dashboardowy podgląd roboczy
    `/dashboard/blog/[id]/preview`, dostępny po adminowym `id` wpisu. Podgląd
    renderuje tytuł, lead, cover image, metadane, Markdown, spis treści i CTA,
    niezależnie od statusu publikacji. Lista wpisów i formularz edycji mają link
    do podglądu roboczego; opublikowane wpisy nadal mają osobny link publiczny
    `/blog/[slug]`.
- [x] 🟠 Dodać planowanie publikacji po `publishedAt`
  - Wykonano: 2026-06-03 — formularz ma pole `datetime-local` mapowane na
    `publishedAt`; status `scheduled` i data publikacji są zapisywane przez API.
- [ ] 🟠 Dodać upload cover image do obecnego storage
  - Wykonano: 2026-06-03 — sprawdzono istniejące uploady; obecnie są
    powiązane z ofertami i zgłoszeniami publicznymi, a nie z blogiem. Zadanie
    zostaje otwarte do osobnej iteracji, żeby dodać dedykowany storage/endpoint
    blogowy zamiast podpinać cover image pod niepoprawny kontrakt ofert.
- [x] 🟠 Dodać zarządzanie kategoriami
  - Wykonano: 2026-06-03 — dodano trasę
    `/dashboard/blog/taxonomy` z tworzeniem i edycją kategorii, walidacją sluga,
    polami description, SEO title, SEO description, sort order i `isIndexable`.
    Dodano funkcje `createBlogCategoryAdmin()` i `updateBlogCategoryAdmin()` w
    kliencie API oraz link `Kategorie i autorzy` z listy wpisów.
- [x] 🟡 Dodać zarządzanie autorami
  - Wykonano: 2026-06-03 — na tej samej trasie
    `/dashboard/blog/taxonomy` dodano tworzenie i edycję autorów z polami
    display name, slug, bio, avatar URL, rola, ekspertyza i linki `sameAs`.
    Dodano funkcje `createBlogAuthorAdmin()` i `updateBlogAuthorAdmin()` oraz
    normalizację linków profilowych do bezpiecznych URL-i `http/https`.
- [ ] 🟡 Dodać prosty raport wpisów bez linków wewnętrznych
  - Wykonano:

### Sprint 4 — Edytor treści i komponenty artykułów

Cel sprintu: przygotować redaktorowi wygodne narzędzia do tworzenia artykułów,
które są czytelne, bezpieczne i dobrze linkują do produktu.

- [x] 🔴 Wybrać format treści: Markdown, HTML albo JSON editor
  - Wykonano: 2026-06-03 — jako format redakcyjny wybrano Markdown. Formularz
    wpisu zapisuje `contentFormat: markdown`, a publiczny artykuł i podgląd
    roboczy renderują treść przez własny, ograniczony renderer
    `BlogMarkdown`, bez wykonywania HTML.
- [x] 🔴 Dodać obsługę nagłówków `h2` i `h3`
  - Wykonano: 2026-06-03 — renderer obsługuje `##` jako H2 i `###` jako H3,
    generuje stabilne `id` dla nagłówków oraz zasila spis treści przez
    `getMarkdownHeadings()`.
- [x] 🔴 Dodać obsługę akapitów, list, cytatów i linków
  - Wykonano: 2026-06-03 — renderer obsługuje akapity, listy punktowane,
    cytaty i linki Markdown. Linki są filtrowane do bezpiecznych adresów:
    wewnętrzne ścieżki `/...` oraz zewnętrzne `http/https`; inne protokoły nie
    są renderowane jako link.
- [x] 🔴 Dodać obsługę obrazów w treści z wymaganym `alt`
  - Wykonano: 2026-06-03 — dodano obsługę bloków `![alt](url)` w
    `BlogMarkdown`. Obrazy są renderowane responsywnie z `loading="lazy"` i
    podpisem z altu. Walidacja publikacji blokuje obraz bez altu, obraz z
    błędną składnią oraz URL spoza bezpiecznych ścieżek `/...` i `http/https`.
- [x] 🔴 Zablokować drugi `h1` wewnątrz treści
  - Wykonano: 2026-06-03 — walidacja treści została przeniesiona do wspólnej
    funkcji `getMarkdownContentIssues()`, która wykrywa `# H1` i `<h1>` w
    Markdownie; formularz blokuje publikację wpisu z takim błędem.
- [x] 🔴 Dodać czytelne renderowanie artykułu na mobile i desktop
  - Wykonano: 2026-06-03 — artykuł publiczny i dashboardowy podgląd używają
    tych samych komponentów renderujących: responsywny układ, czytelna
    typografia, obraz 16:9, spis treści na desktopie i bezpieczne linki.
- [x] 🟠 Dodać blok CTA: rejestracja, kontakt, dodanie oferty, katalog ofert
  - Wykonano: 2026-06-04 — rozszerzono `ArticleCta` o wariant `contact` oraz
    dodano obsługę bloków CTA bezpośrednio w Markdownie: `::cta register`,
    `::cta contact`, `::cta submit-listing` i `::cta listings`. Renderer
    obsługuje tylko znane warianty, a walidacja publikacji blokuje błędny zapis
    `::cta`.
- [ ] 🟠 Dodać blok wyróżnionych ofert
  - Wykonano:
- [x] 🟠 Dodać blok FAQ z widocznymi pytaniami i odpowiedziami
  - Wykonano: 2026-06-04 — dodano blok FAQ w Markdownie:
    `:::faq`, pytania jako `### Pytanie`, odpowiedzi jako zwykły tekst i
    zamknięcie `:::`. `BlogMarkdown` renderuje widoczną sekcję FAQ, a formularz
    pokazuje przykład składni i blokuje niedomknięte lub puste FAQ przed
    publikacją.
- [x] 🟠 Dodać automatyczne generowanie schema `FAQPage` tylko dla wpisów z FAQ
  - Wykonano: 2026-06-04 — dodano `getMarkdownFaqItems()` i publiczna strona
    wpisu `/blog/[slug]` generuje JSON-LD `FAQPage` wyłącznie wtedy, gdy treść
    zawiera poprawny blok FAQ. Szkice i podgląd roboczy renderują FAQ wizualnie,
    ale schema jest emitowana tylko na publicznym artykule.
- [ ] 🟡 Dodać sugestie linkowania do powiązanych wpisów
  - Wykonano:
- [ ] 🔴 Sprawdzić tekst, obrazy i CTA na mobile
  - Wykonano:

### Sprint 5 — Content launch

Cel sprintu: uruchomić blog z pierwszymi jakościowymi artykułami, kategoriami i
podstawowym pomiarem SEO.

- [ ] 🟠 Wybrać główne frazy dla pierwszych 12 artykułów
  - Wykonano:
- [ ] 🟠 Przygotować opisy kategorii bloga
  - Wykonano:
- [ ] 🟠 Napisać artykuł 1: `Jak przygotować mieszkanie do sprzedaży krok po
kroku`
  - Wykonano:
- [ ] 🟠 Napisać artykuł 2: `Jak wycenić mieszkanie przed wystawieniem
ogłoszenia`
  - Wykonano:
- [ ] 🟠 Napisać artykuł 3: `Jak napisać skuteczny opis ogłoszenia
nieruchomości`
  - Wykonano:
- [ ] 🟠 Przygotować minimum 3 cover images z opisowymi altami
  - Wykonano:
- [ ] 🟠 Ustawić linkowanie wewnętrzne między pierwszymi artykułami
  - Wykonano:
- [ ] 🟠 Dodać CTA do każdego pierwszego artykułu
  - Wykonano:
- [ ] 🟠 Skonfigurować Google Search Console
  - Wykonano:
- [ ] 🟠 Zgłosić sitemap w Search Console
  - Wykonano:
- [ ] 🟠 Sprawdzić indeksację pierwszych URL po publikacji
  - Wykonano:
- [ ] 🔴 Zweryfikować, że drafty i preview nie są w sitemapie
  - Wykonano:

### Sprint 6 — Analityka i optymalizacja po publikacji

Cel sprintu: mierzyć skuteczność bloga i poprawiać treści na podstawie danych,
nie intuicji.

- [ ] 🟠 Dodać eventy kliknięć CTA z artykułów
  - Wykonano:
- [ ] 🟠 Oznaczyć leady pochodzące z bloga
  - Wykonano:
- [ ] 🟠 Dodać podstawowy raport wejść i konwersji z bloga
  - Wykonano:
- [ ] 🟡 Dodać miesięczną listę artykułów do aktualizacji
  - Wykonano:
- [ ] 🟡 Przejrzeć Search Console po pierwszych 2 tygodniach
  - Wykonano:
- [ ] 🟡 Poprawić tytuły i description dla wpisów z wyświetleniami bez kliknięć
  - Wykonano:
- [ ] 🟡 Rozbudować wpisy, które zaczynają rankować na long tail
  - Wykonano:
- [ ] 🟡 Zaplanować kolejne 8-12 artykułów na podstawie danych
  - Wykonano:
- [ ] 🟢 Ocenić sens newslettera po pierwszych danych o ruchu powracającym
  - Wykonano:

### Sprint 7 — Blogi agencji

Cel sprintu: rozszerzyć mechanizm bloga na brandowe strony biur, ale dopiero po
stabilnym uruchomieniu bloga centralnego EstateFlow.

- [ ] 🟡 Podjąć decyzję, czy rozszerzamy `BlogPost` o `agencyId`, czy tworzymy
      osobne `AgencyBlogPost`
  - Wykonano:
- [ ] 🟡 Dodać blog agencji w panelu `/dashboard/website/blog`
  - Wykonano:
- [ ] 🟡 Dodać publiczną trasę `/biura/[agencySlug]/blog`
  - Wykonano:
- [ ] 🟡 Dodać publiczną trasę `/biura/[agencySlug]/blog/[slug]`
  - Wykonano:
- [ ] 🟡 Ograniczyć autorów do agentów danej agencji
  - Wykonano:
- [ ] 🟡 Ograniczyć CTA i wyróżnione oferty do danej agencji
  - Wykonano:
- [ ] 🟡 Dodać wpisy agencji do sitemap tylko dla opublikowanych stron agencji
  - Wykonano:
- [ ] 🟠 Dodać poprawny canonical dla domeny/ścieżki agencji
  - Wykonano:
- [ ] 🟠 Dodać zabezpieczenia przed duplicate content między blogiem centralnym i
      blogami agencji
  - Wykonano:
