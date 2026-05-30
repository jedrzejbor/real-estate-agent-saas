# EstateFlow — plan brandowych stron biur nieruchomości

> Dokument planistyczny.
> Data utworzenia: 2026-05-30
> Cel: opisać, jak EstateFlow ma umożliwić biurom nieruchomości stworzenie
> własnej brandowej strony opartej o dane, oferty, agentów, leady i panel CRM
> EstateFlow.

---

## 1. Cel produktu

Biuro nieruchomości powinno móc uruchomić własną stronę publiczną bez budowania
osobnego serwisu od zera.

Strona ma:

- prezentować markę biura,
- publikować oferty wszystkich agentów z danej agencji,
- publikować wpisy blogowe i poradnikowe,
- zbierać leady z formularzy ofert, profilu biura i treści blogowych,
- działać na subdomenie EstateFlow lub własnej domenie biura,
- być zarządzana z tego samego panelu, w którym biuro obsługuje oferty,
  klientów, zapytania, agentów i raporty.

To nie ma być osobny kreator stron oderwany od CRM. To ma być publiczna warstwa
sprzedażowo-marketingowa zasilana danymi z EstateFlow.

---

## 2. Użytkownicy i potrzeby

### Właściciel biura

Potrzebuje:

- strony, która wygląda jak strona jego firmy,
- listy wszystkich ofert biura,
- prezentacji zespołu agentów,
- raportów o leadach i skuteczności ofert,
- kontroli nad brandingiem, domeną i treściami,
- prostego publikowania bez angażowania software house'u.

### Agent w biurze

Potrzebuje:

- publikować swoje oferty w ramach strony biura,
- mieć własny profil na stronie biura,
- widzieć leady dotyczące swoich ofert,
- nie zarządzać całym CMS-em, jeśli nie ma takiej roli.

### Klient końcowy

Potrzebuje:

- szybko znaleźć ofertę,
- zaufać marce biura,
- poznać agenta prowadzącego ofertę,
- wysłać zapytanie bez tarcia,
- przeczytać poradniki lub wpisy wspierające decyzję zakupową/sprzedażową.

---

## 3. Zasada architektoniczna

Źródłem prawdy pozostaje `Agency`.

Obecny model już wspiera ten kierunek:

- `Agency` przechowuje nazwę, logo, adres, plan i ownera,
- `Agent` należy do `Agency`,
- oferty należą do agentów, ale raporty i limity działają w scope agencji,
- entitlements mają flagi `customBranding` i `multiUser`,
- publiczne oferty już zwracają dane agenta i agencji.

Docelowo strona brandowa powinna być osobnym publicznym modułem przypiętym do
agencji, ale zasilanym istniejącymi encjami:

- `Agency` — organizacja i billing,
- `Agent` — zespół i autorzy ofert,
- `Listing` — oferty,
- `PublicLead` — zapytania,
- nowe encje CMS — strony, wpisy blogowe, konfiguracja motywu i domeny.

---

## 4. Docelowy zakres funkcjonalny

### 4.1 Strona główna biura

Publiczna strona biura powinna zawierać:

- hero z nazwą biura, claimem, lokalizacją i CTA,
- wyszukiwarkę ofert,
- wyróżnione oferty,
- sekcję typów nieruchomości lub lokalizacji,
- sekcję zespołu,
- wybrane wpisy blogowe,
- dane kontaktowe i formularz kontaktowy,
- stopkę z danymi prawnymi, linkami i brandingiem zgodnym z planem.

### 4.2 Katalog ofert biura

Katalog powinien pokazywać tylko oferty danej agencji:

- filtrowanie po lokalizacji, typie, transakcji, cenie, metrażu, pokojach,
- sortowanie,
- widok listy/kart,
- opcjonalnie mapa,
- link do szczegółu oferty w ramach domeny biura,
- informację o agencie prowadzącym.

Ważne: publiczny katalog globalny `/oferty` i katalog brandowy biura mogą
korzystać z podobnych komponentów, ale muszą mieć osobny scope danych.

### 4.3 Szczegół oferty na stronie biura

Szczegół oferty powinien używać tych samych danych co publiczna oferta
EstateFlow, ale w brandingu biura:

- galeria,
- opis i parametry,
- lokalizacja zgodna z ustawieniami widoczności,
- dane agenta,
- formularz zapytania,
- podobne oferty z tej samej agencji,
- SEO metadata i JSON-LD.

### 4.4 Zespół i profile agentów

Biuro powinno móc pokazać:

- listę agentów,
- profil każdego agenta,
- zdjęcie/avatar,
- bio, telefon, licencję, specjalizacje,
- oferty danego agenta,
- formularz kontaktowy do agenta.

To rozwija obecny publiczny profil agenta `/agenci/[id]` w kierunku profilu
wewnątrz strony biura.

### 4.5 Blog / poradnik

CMS powinien pozwolić publikować:

- wpisy blogowe,
- poradniki dla kupujących,
- poradniki dla sprzedających,
- strony lokalizacyjne,
- aktualności biura.

Każdy wpis powinien mieć:

- tytuł,
- slug,
- lead,
- treść,
- cover image,
- autora,
- status draft/published,
- datę publikacji,
- SEO title/description,
- kategorię/tagi,
- opcjonalne CTA do ofert lub formularza kontaktowego.

### 4.6 Strony statyczne

Minimum:

- O nas,
- Kontakt,
- Polityka prywatności,
- Regulamin lub nota prawna,
- Dla sprzedających,
- Dla kupujących.

Na początku mogą być generowane z gotowych sekcji i pól formularza, bez pełnego
edytora drag-and-drop.

### 4.7 Panel zarządzania stroną

W dashboardzie agencji powinien powstać moduł `Strona biura`.

Zakres panelu:

- status strony: nieaktywna / draft / opublikowana,
- slug/subdomena,
- domena własna,
- logo, kolory, font pair z ograniczonej listy,
- hero copy,
- dane kontaktowe,
- social media,
- wybór wyróżnionych ofert,
- ustawienia widoczności agentów,
- blog i strony,
- podgląd strony,
- publikuj / wycofaj.

Nie zaczynamy od pełnego kreatora typu Webflow. Najpierw budujemy kontrolowany
system sekcji, żeby łatwo utrzymać jakość, SEO, bezpieczeństwo i spójność UI.

---

## 5. Routing i domeny

### Etap 1 — subdomena / ścieżka EstateFlow

Najprostszy start:

- `estateflow.pl/biura/[agencySlug]`
- albo `agencySlug.estateflow.pl`, jeśli infrastruktura pozwala.

Rekomendacja MVP: zacząć od ścieżki `/biura/[agencySlug]`.

Powody:

- mniej pracy infrastrukturalnej,
- prostsze testowanie,
- brak obsługi DNS i certyfikatów na starcie,
- szybszy release.

### Etap 2 — subdomena EstateFlow

Docelowo:

- `agencySlug.estateflow.pl`

Wymaga:

- wildcard DNS,
- wildcard TLS,
- resolvera tenantów po hostname,
- jasnego canonical URL,
- zabezpieczenia przed przejęciem sluga.

### Etap 3 — własna domena biura

Enterprise / wyższy plan:

- `www.biuro-example.pl`
- `oferty.biuro-example.pl`

Wymaga:

- konfiguracji domeny w panelu,
- instrukcji DNS,
- weryfikacji domeny,
- automatycznego TLS,
- statusu propagacji,
- blokady użycia domeny przez inną agencję,
- decyzji, czy domena główna ma obsługiwać całą stronę, czy tylko katalog.

---

## 6. Model danych — propozycja

### `AgencyWebsite`

Konfiguracja strony biura.

Pola:

- `id`
- `agencyId`
- `status`: `draft | published | suspended`
- `slug`
- `primaryDomain`
- `domainStatus`: `not_configured | pending_dns | verified | failed`
- `siteName`
- `headline`
- `subheadline`
- `logoUrl`
- `faviconUrl`
- `primaryColor`
- `accentColor`
- `fontPreset`
- `contactEmail`
- `contactPhone`
- `address`
- `socialLinks`
- `heroImageUrl`
- `featuredListingIds`
- `showAgents`
- `showEstateFlowBranding`
- `seoTitle`
- `seoDescription`
- `createdAt`
- `updatedAt`
- `publishedAt`

### `AgencyWebsitePage`

Strony statyczne.

Pola:

- `id`
- `agencyWebsiteId`
- `type`: `about | contact | sellers | buyers | custom`
- `title`
- `slug`
- `content`
- `sections`
- `status`
- `seoTitle`
- `seoDescription`
- `createdAt`
- `updatedAt`
- `publishedAt`

### `AgencyBlogPost`

Wpis blogowy.

Pola:

- `id`
- `agencyId`
- `authorAgentId`
- `title`
- `slug`
- `excerpt`
- `content`
- `coverImageUrl`
- `status`: `draft | published | archived`
- `category`
- `tags`
- `seoTitle`
- `seoDescription`
- `createdAt`
- `updatedAt`
- `publishedAt`

### `AgencyDomain`

Jeśli domeny własne będą osobnym procesem.

Pola:

- `id`
- `agencyId`
- `hostname`
- `status`
- `verificationToken`
- `verifiedAt`
- `lastCheckedAt`
- `createdAt`
- `updatedAt`

---

## 7. API — propozycja modułów

### Prywatne API panelu

Nowy moduł: `agency-website`.

Endpointy:

- `GET /api/agency-website`
- `POST /api/agency-website`
- `PATCH /api/agency-website`
- `POST /api/agency-website/publish`
- `POST /api/agency-website/unpublish`
- `GET /api/agency-website/pages`
- `POST /api/agency-website/pages`
- `PATCH /api/agency-website/pages/:id`
- `DELETE /api/agency-website/pages/:id`
- `GET /api/agency-website/blog-posts`
- `POST /api/agency-website/blog-posts`
- `PATCH /api/agency-website/blog-posts/:id`
- `DELETE /api/agency-website/blog-posts/:id`
- `POST /api/agency-website/domains`
- `POST /api/agency-website/domains/:id/verify`

Wszystkie prywatne endpointy muszą działać w scope `agencyId` bieżącego
użytkownika.

### Publiczne API strony

Nowy moduł lub rozszerzenie public listings:

- `GET /api/public-agency-sites/:slug`
- `GET /api/public-agency-sites/:slug/listings`
- `GET /api/public-agency-sites/:slug/listings/:listingSlug`
- `GET /api/public-agency-sites/:slug/agents`
- `GET /api/public-agency-sites/:slug/agents/:agentId`
- `GET /api/public-agency-sites/:slug/blog`
- `GET /api/public-agency-sites/:slug/blog/:postSlug`
- `POST /api/public-agency-sites/:slug/contact`

Publiczne API nie może zwracać draftów, danych prywatnych ani ofert spoza
agencji.

---

## 8. Frontend — proponowana struktura

### Panel

Nowe trasy:

- `/dashboard/website`
- `/dashboard/website/design`
- `/dashboard/website/pages`
- `/dashboard/website/blog`
- `/dashboard/website/domain`
- `/dashboard/website/preview`

### Publiczna strona biura

MVP na ścieżce:

- `/biura/[agencySlug]`
- `/biura/[agencySlug]/oferty`
- `/biura/[agencySlug]/oferty/[listingSlug]`
- `/biura/[agencySlug]/agenci`
- `/biura/[agencySlug]/agenci/[agentId]`
- `/biura/[agencySlug]/blog`
- `/biura/[agencySlug]/blog/[postSlug]`
- `/biura/[agencySlug]/kontakt`

Przy domenach własnych routing powinien używać tego samego kodu, tylko tenant
jest rozpoznawany po `Host`.

---

## 9. Entitlementy i plany

Proponowany podział:

| Funkcja | Free | Starter | Professional | Enterprise |
| --- | --- | --- | --- | --- |
| Publiczne oferty EstateFlow | Tak | Tak | Tak | Tak |
| Profil agenta | Tak | Tak | Tak | Tak |
| Strona biura na `/biura/[slug]` | Nie | Ograniczona | Tak | Tak |
| Blog | Nie | Nie / limitowany | Tak | Tak |
| Custom branding | Nie | Nie | Tak | Tak |
| Usunięcie brandingu EstateFlow | Nie | Nie | Tak | Tak |
| Własna domena | Nie | Nie | Nie / add-on | Tak |
| Wielu agentów | Nie | Nie | Tak | Tak |
| Zaawansowana analityka strony | Nie | Nie | Tak | Tak |

Nowe flagi entitlementów do rozważenia:

- `agencyWebsite`
- `agencyWebsiteBlog`
- `agencyWebsiteCustomDomain`
- `agencyWebsiteCustomTheme`
- `agencyWebsiteRemoveEstateFlowBranding`
- `agencyWebsiteAnalytics`

Można też zacząć od jednej flagi `customBranding`, ale docelowo warto rozdzielić
funkcje, bo strona biura, blog i domena własna mają różną wartość biznesową.

---

## 10. SEO

Strony biur powinny być pełnoprawnymi stronami SEO.

Wymagania:

- unikalne `title` i `description`,
- canonical per strona,
- sitemap dla strony biura,
- schema.org:
  - `RealEstateAgent` lub `RealEstateBusiness`,
  - `Offer`/`Residence` dla ofert,
  - `BlogPosting` dla wpisów,
- `robots` kontrolowany przez status publikacji,
- noindex dla preview i draftów,
- przekierowania po zmianie sluga,
- unikanie duplikacji między globalnym `/oferty/[slug]` a stroną biura.

Decyzja do podjęcia:

- Czy szczegół oferty ma być indeksowany w globalnym katalogu, w stronie biura,
  czy w obu miejscach z canonical wskazującym preferowany wariant.

Rekomendacja:

- Free/Starter: canonical na globalny EstateFlow.
- Professional/Enterprise z brandową stroną: canonical na stronę biura.

---

## 11. Leady i analityka

Każdy formularz na stronie biura powinien tworzyć lead z kontekstem:

- `agencyId`
- `agentId`, jeśli dotyczy konkretnego agenta,
- `listingId`, jeśli dotyczy oferty,
- `source`: np. `agency_website`, `agency_blog`, `agency_contact_page`,
- `sourceUrl`
- UTM,
- landing page,
- referrer.

W panelu biuro powinno widzieć:

- leady z całej strony,
- leady per oferta,
- leady per agent,
- leady per wpis blogowy,
- konwersję formularzy,
- najczęściej oglądane oferty,
- najskuteczniejsze lokalizacje i typy nieruchomości.

To powinno zasilać istniejące moduły:

- `PublicLead`,
- `AnalyticsEvent`,
- raporty agencyjne.

---

## 12. Role i uprawnienia

Minimalne role docelowe:

- owner biura,
- admin biura,
- agent,
- marketing/editor.

MVP może zacząć od ownera/admina, ale plan powinien przewidywać:

- agent może edytować swoje oferty i profil,
- agent nie może zmienić domeny, brandingu ani strony głównej biura,
- editor może zarządzać blogiem i stronami, ale nie billingiem,
- owner/admin może publikować stronę i zarządzać domeną.

Do czasu pełnych ról wszystkie operacje `agency-website` powinny być dostępne
tylko dla ownera agencji albo admina.

---

## 13. Bezpieczeństwo i ryzyka

Najważniejsze ryzyka:

- wyciek ofert/danych z innej agencji przez błędny tenant scope,
- publiczne zwrócenie draftów ofert, wpisów lub stron,
- przejęcie sluga albo domeny innej agencji,
- XSS przez treść bloga/CMS,
- upload niebezpiecznych assetów,
- indeksacja preview/draftów,
- formularze kontaktowe jako wektor spamu,
- niejasna odpowiedzialność RODO między biurem a EstateFlow,
- duplikacja treści SEO i konflikty canonical.

Minimalne zabezpieczenia:

- wszystkie prywatne operacje po `agencyId`,
- publiczny resolver strony tylko dla `status = published`,
- walidacja slugów,
- sanitizacja treści CMS,
- kontrolowany edytor treści zamiast raw HTML,
- ograniczenia uploadów jak przy zdjęciach ofert,
- weryfikacja domeny tokenem DNS lub plikiem,
- rate limiting formularzy,
- audit log dla publikacji, domeny i zmian brandingu,
- noindex dla draft/preview.

Ten moduł po rozpoczęciu implementacji powinien dostać osobny wpis w
`SECURITY_MODULE_AUDIT_MAP.md`.

---

## 14. Etapy wdrożenia

### Etap 0 — decyzje produktowe

Cel: zamknąć zakres MVP.

Decyzje:

- ścieżka `/biura/[slug]` czy od razu subdomeny,
- czy blog wchodzi do MVP, czy dopiero etap 2,
- jakie sekcje strony są konfigurowalne,
- które plany odblokowują stronę biura,
- czy globalne oferty i brandowe oferty mają oba indeksować SEO.

### Etap 1 — publiczna strona biura bez CMS

Zakres:

- `AgencyWebsite` z podstawową konfiguracją,
- publiczna trasa `/biura/[agencySlug]`,
- strona główna biura,
- katalog ofert biura,
- szczegół oferty w brandingu biura,
- lista agentów,
- formularz kontaktowy,
- podstawowy panel konfiguracji.

Bez:

- bloga,
- własnej domeny,
- pełnego edytora stron,
- zaawansowanego themingu.

To jest najlepszy pierwszy release, bo daje wartość biurom i wykorzystuje
obecne dane.

### Etap 2 — blog i strony treściowe

Zakres:

- `AgencyBlogPost`,
- lista wpisów,
- szczegół wpisu,
- kategorie/tagi,
- cover image,
- SEO metadata,
- CTA do ofert i kontaktu,
- panel bloga.

W tym etapie trzeba szczególnie zadbać o sanitizację treści.

### Etap 3 — branding premium

Zakres:

- więcej presetów motywu,
- kolor główny i akcent,
- favicon,
- ukrywanie brandingu EstateFlow zgodnie z planem,
- wybór układu hero,
- wyróżnione oferty,
- sekcje zaufania/opinii.

### Etap 4 — własne domeny

Zakres:

- `AgencyDomain`,
- instrukcja DNS,
- weryfikacja domeny,
- status domeny w panelu,
- TLS,
- canonical i sitemap per domena,
- redirect ze starego adresu.

### Etap 5 — analityka i optymalizacja

Zakres:

- raporty ruchu strony biura,
- konwersja formularzy,
- leady per agent/oferta/wpis,
- najpopularniejsze wpisy,
- sugestie: "oferta ma ruch, ale brak leadów",
- eksport danych marketingowych.

---

## 15. MVP — rekomendowany zakres pierwszej wersji

Pierwsza wersja powinna obejmować:

- stronę biura pod `/biura/[agencySlug]`,
- katalog ofert biura,
- szczegół oferty w brandingu biura,
- listę agentów,
- prosty panel ustawień strony,
- logo, nazwa, opis, kolory z ograniczonej listy,
- dane kontaktowe,
- formularz kontaktowy,
- leady w istniejącym module zapytań,
- podstawowe SEO,
- status draft/published.

Poza MVP:

- własna domena,
- blog,
- pełny page builder,
- zaawansowane role redakcyjne,
- pełna analityka strony.

Powód: największa wartość na start to publikacja ofert biura pod marką biura,
bez rozbijania zakresu na zbyt wiele trudnych obszarów naraz.

---

## 16. Otwarte decyzje

1. Czy biuro może mieć wiele stron, np. dla oddziałów, czy tylko jedną stronę
   per `Agency`?
2. Czy blog ma być dostępny dla Professional, czy dopiero Enterprise/add-on?
3. Czy agenci mogą samodzielnie publikować wpisy, czy tylko editor/admin?
4. Czy oferta może być indeksowana równolegle w globalnym katalogu i na stronie
   biura?
5. Czy custom domain ma być self-service, czy ręcznie obsługiwane przez support
   w pierwszej wersji?
6. Czy prywatny sprzedający może kiedyś przypisać ogłoszenie do strony biura po
   współpracy z agentem?
7. Czy strona biura ma obsługiwać wielojęzyczność?

---

## 17. Powiązane dokumenty

- `docs/PLANS_AND_ENTITLEMENTS_STRATEGY.md`
- `docs/FREEMIUM_SPRINT_PLAN.md`
- `docs/FREEMIUM_SPRINT_8_PUBLIC_CATALOG_CONTRACT.md`
- `docs/PUBLIC_CATALOG_AND_PRIVATE_SELLERS_PLAN.md`
- `docs/SECURITY_MODULE_AUDIT_MAP.md`
- `docs/REPORTS_MODULE_SPEC.md`
