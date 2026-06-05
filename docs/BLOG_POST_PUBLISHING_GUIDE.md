# EstateFlow — instrukcja dodawania wpisów blogowych

Dokument opisuje, gdzie dodawać wpisy blogowe, jak wypełniać pola edytora i co
sprawdzić przed publikacją, żeby wpis wspierał SEO oraz konwersję.

## 1. Gdzie dodawać wpisy

Wpisy dodajemy w panelu administracyjnym:

- lista wpisów: `/dashboard/blog`
- nowy wpis: `/dashboard/blog/new`
- edycja wpisu: `/dashboard/blog/[id]/edit`
- podgląd roboczy: `/dashboard/blog/[id]/preview`
- słowniki kategorii i autorów: `/dashboard/blog/taxonomy`

Publiczne adresy po publikacji:

- lista bloga: `/blog`
- wpis: `/blog/[slug]`
- kategoria: `/blog/kategoria/[slug]`

Panel bloga jest przeznaczony dla administratorów. Nie dodajemy wpisów ręcznie w
bazie poza seedami developerskimi.

## 2. Standardowy workflow

1. Wejdź w `/dashboard/blog/taxonomy` i sprawdź, czy istnieje właściwa
   kategoria oraz autor.
2. Wejdź w `/dashboard/blog/new`.
3. Ustaw status `Szkic`.
4. Uzupełnij tytuł, slug, lead, treść, SEO, obrazek, kategorię, autora i tagi.
5. Zapisz szkic.
6. Otwórz `Podgląd roboczy` i sprawdź układ, linki, CTA, FAQ oraz obrazki.
7. Popraw błędy z panelu `Gotowość SEO`.
8. Dopiero po akceptacji ustaw:
   - status: `Opublikowany`
   - robots: `index, follow`
   - data publikacji: teraz albo przyszła data, jeśli wpis ma być zaplanowany
9. Zapisz wpis.
10. Po publikacji sprawdź publiczny URL `/blog/[slug]`.

## 3. Pola wpisu

### Treść Artykułu

- `Tytuł` — H1 strony publicznej. Nie dodawaj drugiego H1 w treści Markdown.
- `Slug` — krótki, czytelny adres bez polskich znaków, np.
  `jak-przygotowac-mieszkanie-do-sprzedazy`.
- `Status`:
  - `Szkic` — wpis roboczy, bez indeksacji.
  - `Zaplanowany` — wpis do publikacji w przyszłości.
  - `Opublikowany` — wpis widoczny publicznie, jeśli data publikacji nie jest z
    przyszłości.
  - `Archiwum` — wpis zdjęty z normalnej pracy redakcyjnej.
- `Lead / excerpt` — krótki opis widoczny na liście bloga i używany jako
  fallback dla metadanych.
- `Treść Markdown` — właściwa treść artykułu.

### SEO I Obrazek

- `SEO title` — najlepiej 50-60 znaków, maksymalnie 70.
- `SEO description` — najlepiej 150-160 znaków, maksymalnie 180.
- `Robots`:
  - dla szkiców: `noindex, follow`
  - dla gotowych wpisów publicznych: `index, follow`
- `Canonical URL` — zwykle zostaw puste. System użyje `/blog/[slug]`.
  Uzupełniaj tylko wtedy, gdy świadomie wskazujesz inny kanoniczny adres.
- `Cover image URL` — adres obrazka okładkowego.
- `Cover image alt` — opisowy alt, np. `Jasny salon przygotowany do sprzedaży
  mieszkania`.

### Organizacja

- `Kategoria` — wybierz jedną główną kategorię.
- `Autor` — wybierz autora z listy.
- `Data publikacji` — ustaw datę publikacji. Jeśli jest z przyszłości, wpis nie
  powinien być publicznie dostępny przed tym terminem.
- `Tagi` — wpisuj po przecinku, np. `sprzedaż, mieszkanie, poradnik`.

## 4. Składnia Markdown

Obsługujemy bezpieczny Markdown renderowany przez `BlogMarkdown`. Nie wklejamy
surowego HTML.

### Nagłówki

W treści używaj `##` i `###`.

```md
## Jak przygotować mieszkanie do zdjęć

Treść sekcji.

### Lista rzeczy do usunięcia z kadru

Treść podsekcji.
```

Nie używaj `#`, bo H1 generuje strona z pola `Tytuł`.

### Linki Wewnętrzne

Dodawaj linki w treści jako Markdown:

```md
[aktualne oferty nieruchomości](/oferty)
[dodaj ofertę nieruchomości](/dodaj-oferte)
[załóż konto w EstateFlow](/register)
[Sprzedaż nieruchomości](/blog/kategoria/sprzedaz-nieruchomosci)
```

W edytorze działa panel `Sugestie linkowania`, z którego można przepisać gotowe
linki do kategorii, produktu i powiązanych artykułów.

### Obrazy W Treści

Każdy obraz musi mieć opisowy alt i bezpieczny URL:

```md
![Salon mieszkania przygotowany do sesji zdjęciowej](/images/blog/salon.jpg)
```

Nie zostawiaj pustego altu.

### CTA

Dostępne bloki CTA:

```md
::cta register
::cta contact
::cta submit-listing
::cta listings
```

Kiedy używać:

- `register` — artykuły kierowane do agentów, biur i użytkowników produktu.
- `contact` — artykuły eksperckie, wdrożeniowe lub sprzedażowe.
- `submit-listing` — artykuły dla właścicieli nieruchomości.
- `listings` — artykuły dla osób szukających ofert.

Kliknięcia CTA z publicznych artykułów są mierzone w analytics. Linki do ścieżek
aplikacji dostają parametry `source=blog` i `blogPost=<slug>`.

### Wyróżnione Oferty

Blok wyróżnionych ofert dodaj dokładnie tak:

```md
::featured-listings
```

Używaj go tylko wtedy, gdy pasuje do intencji artykułu. Najczęściej ma sens w
treściach dla kupujących, wynajmujących albo właścicieli porównujących rynek.

### FAQ

FAQ zapisuj w bloku `:::faq`. Pytania muszą być nagłówkami `###`.

```md
:::faq
### Ile trwa przygotowanie mieszkania do sprzedaży?
Najczęściej od jednego do kilku dni, zależnie od stanu mieszkania, zdjęć i
dokumentów.

### Czy warto dodać plan mieszkania do ogłoszenia?
Tak, bo plan pomaga kupującym szybciej ocenić układ i ogranicza nietrafione
zapytania.
:::
```

FAQ jest renderowane na stronie i generuje `FAQPage` JSON-LD dla publicznego
wpisu.

## 5. Minimalna Struktura Artykułu

Każdy wpis powinien mieć:

1. Tytuł z główną frazą.
2. Lead wyjaśniający, dla kogo jest artykuł i co czytelnik zyska.
3. Minimum 3-5 sekcji `##`.
4. Link wewnętrzny do produktu lub publicznej ścieżki.
5. Link do co najmniej jednego powiązanego artykułu, jeśli istnieje.
6. Jedno CTA.
7. FAQ z 2-4 pytaniami, jeśli temat naturalnie generuje pytania.
8. Cover image z opisowym altem.
9. SEO title i SEO description.

## 6. Checklist Przed Publikacją

- [ ] Status jest nadal `Szkic`, dopóki wpis nie przejdzie kontroli.
- [ ] Tytuł jest unikalny i zawiera główną frazę.
- [ ] Slug jest krótki, czytelny i bez polskich znaków.
- [ ] Treść nie zawiera nagłówka `#`.
- [ ] Treść nie zawiera surowego HTML.
- [ ] Wpis ma kategorię i autora.
- [ ] Wpis ma lead.
- [ ] Wpis ma SEO title i SEO description.
- [ ] Robots przed publikacją: `noindex, follow`.
- [ ] Robots przy publikacji: `index, follow`.
- [ ] Cover image URL działa.
- [ ] Cover image alt opisuje realną zawartość obrazu.
- [ ] Każdy obraz w treści ma alt.
- [ ] Jest minimum jeden link wewnętrzny.
- [ ] Jest CTA dopasowane do intencji artykułu.
- [ ] Podgląd roboczy wygląda poprawnie na desktopie i mobile.
- [ ] Po publikacji publiczny URL `/blog/[slug]` działa.

## 7. Co Robić Po Publikacji

Po publikacji wpisu:

1. Sprawdź publiczny URL.
2. Sprawdź, czy wpis pojawił się na `/blog`.
3. Sprawdź, czy kategoria działa pod `/blog/kategoria/[slug]`.
4. Po wdrożeniu produkcyjnym zgłoś sitemap w Google Search Console, jeśli nie
   była wcześniej zgłoszona.
5. Po 2 tygodniach sprawdź Search Console:
   - zapytania,
   - wyświetlenia,
   - CTR,
   - pozycje,
   - strony z wyświetleniami bez kliknięć.
6. W `/dashboard/reports?report=blog` sprawdź:
   - odsłony artykułów,
   - kliknięcia CTA,
   - CTR,
   - kliknięcia `submit-listing`,
   - top artykuły.

## 8. Czego Unikać

- Nie publikuj wpisu bez SEO title, SEO description i cover image.
- Nie indeksuj szkiców ani wpisów testowych.
- Nie twórz kilku wpisów z tym samym tematem i podobnym tytułem.
- Nie kopiuj opisów kategorii jako treści artykułu.
- Nie upychaj fraz kluczowych sztucznie w każdym akapicie.
- Nie używaj CTA niezgodnego z intencją czytelnika.
- Nie ustawiaj canonical na zewnętrzny URL bez świadomej decyzji SEO.
- Nie usuwaj opublikowanych wpisów bez planu przekierowania lub archiwizacji.

## 9. Przykładowy Szkielet Wpisu

```md
## Dlaczego przygotowanie mieszkania wpływa na sprzedaż

Krótki akapit wprowadzający z główną frazą i kontekstem dla czytelnika.

## Lista rzeczy do zrobienia przed zdjęciami

- uporządkowanie blatów
- usunięcie prywatnych przedmiotów
- doświetlenie pomieszczeń

![Jasny salon przygotowany do zdjęć sprzedażowych](/images/blog/salon.jpg)

## Jak opisać atuty mieszkania

W tym miejscu warto podlinkować powiązany artykuł:
[jak napisać skuteczny opis ogłoszenia nieruchomości](/blog/jak-napisac-skuteczny-opis-ogloszenia-nieruchomosci).

::cta submit-listing

:::faq
### Czy trzeba robić home staging przed sprzedażą?
Nie zawsze, ale nawet podstawowe uporządkowanie mieszkania poprawia odbiór
oferty i jakość zdjęć.

### Czy warto dodać zdjęcie klatki schodowej?
Tak, jeśli klatka jest zadbana i wspiera pozytywny odbiór nieruchomości.
:::
```

