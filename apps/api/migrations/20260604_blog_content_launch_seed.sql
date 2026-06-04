-- Blog content launch seed.
-- Creates launch categories, a default editorial author and the first 3 draft posts.
-- Safe to run more than once on PostgreSQL.

BEGIN;

DO $$
DECLARE
  seller_category_id uuid;
  pricing_category_id uuid;
  marketing_category_id uuid;
  buyer_category_id uuid;
  agent_category_id uuid;
  author_id uuid;
  post_prepare_id uuid;
  post_pricing_id uuid;
  post_description_id uuid;
BEGIN
  INSERT INTO blog_categories (
    name,
    slug,
    description,
    "seoTitle",
    "seoDescription",
    "sortOrder",
    "isIndexable"
  )
  VALUES
    (
      'Sprzedaż nieruchomości',
      'sprzedaz-nieruchomosci',
      'Praktyczne poradniki dla właścicieli mieszkań i domów: przygotowanie oferty, wycena, prezentacja, negocjacje i bezpieczna finalizacja sprzedaży.',
      'Sprzedaż nieruchomości krok po kroku | EstateFlow',
      'Poradniki o sprzedaży mieszkania i domu: przygotowanie, wycena, opis oferty, zdjęcia, prezentacje i obsługa zapytań.',
      10,
      true
    )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    "seoTitle" = EXCLUDED."seoTitle",
    "seoDescription" = EXCLUDED."seoDescription",
    "sortOrder" = EXCLUDED."sortOrder",
    "isIndexable" = EXCLUDED."isIndexable",
    "updatedAt" = now()
  RETURNING id INTO seller_category_id;

  INSERT INTO blog_categories (
    name,
    slug,
    description,
    "seoTitle",
    "seoDescription",
    "sortOrder",
    "isIndexable"
  )
  VALUES
    (
      'Wycena nieruchomości',
      'wycena-nieruchomosci',
      'Materiały pomagające zrozumieć, jak ustalić cenę mieszkania, domu lub działki przed publikacją ogłoszenia i rozmowami z kupującymi.',
      'Wycena nieruchomości przed sprzedażą | EstateFlow',
      'Jak wycenić mieszkanie lub dom przed sprzedażą: analiza rynku, porównanie ofert, korekty ceny i najczęstsze błędy.',
      20,
      true
    )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    "seoTitle" = EXCLUDED."seoTitle",
    "seoDescription" = EXCLUDED."seoDescription",
    "sortOrder" = EXCLUDED."sortOrder",
    "isIndexable" = EXCLUDED."isIndexable",
    "updatedAt" = now()
  RETURNING id INTO pricing_category_id;

  INSERT INTO blog_categories (
    name,
    slug,
    description,
    "seoTitle",
    "seoDescription",
    "sortOrder",
    "isIndexable"
  )
  VALUES
    (
      'Marketing ofert',
      'marketing-ofert',
      'Wskazówki dotyczące zdjęć, tytułów, opisów, promocji i linkowania ofert nieruchomości, które pomagają zdobywać lepsze zapytania.',
      'Marketing ofert nieruchomości | EstateFlow',
      'Jak tworzyć skuteczne ogłoszenia nieruchomości: tytuły, opisy, zdjęcia, CTA, linkowanie i promocja oferty.',
      30,
      true
    )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    "seoTitle" = EXCLUDED."seoTitle",
    "seoDescription" = EXCLUDED."seoDescription",
    "sortOrder" = EXCLUDED."sortOrder",
    "isIndexable" = EXCLUDED."isIndexable",
    "updatedAt" = now()
  RETURNING id INTO marketing_category_id;

  INSERT INTO blog_categories (
    name,
    slug,
    description,
    "seoTitle",
    "seoDescription",
    "sortOrder",
    "isIndexable"
  )
  VALUES
    (
      'Kupno i wynajem',
      'kupno-i-wynajem',
      'Poradniki dla osób szukających nieruchomości: analiza ogłoszeń, porównywanie ofert, pytania do właściciela i przygotowanie do oględzin.',
      'Kupno i wynajem nieruchomości | EstateFlow',
      'Praktyczne poradniki dla kupujących i najemców: jak czytać ogłoszenia, porównywać oferty i zadawać dobre pytania.',
      40,
      true
    )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    "seoTitle" = EXCLUDED."seoTitle",
    "seoDescription" = EXCLUDED."seoDescription",
    "sortOrder" = EXCLUDED."sortOrder",
    "isIndexable" = EXCLUDED."isIndexable",
    "updatedAt" = now()
  RETURNING id INTO buyer_category_id;

  INSERT INTO blog_categories (
    name,
    slug,
    description,
    "seoTitle",
    "seoDescription",
    "sortOrder",
    "isIndexable"
  )
  VALUES
    (
      'Praca agenta',
      'praca-agenta',
      'Materiały dla agentów i biur nieruchomości o obsłudze leadów, procesie sprzedaży, CRM, raportowaniu i automatyzacji codziennej pracy.',
      'Praca agenta nieruchomości i CRM | EstateFlow',
      'Poradniki dla agentów i biur: obsługa klientów, CRM, publikacja ofert, raportowanie i automatyzacja procesu sprzedaży.',
      50,
      true
    )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    "seoTitle" = EXCLUDED."seoTitle",
    "seoDescription" = EXCLUDED."seoDescription",
    "sortOrder" = EXCLUDED."sortOrder",
    "isIndexable" = EXCLUDED."isIndexable",
    "updatedAt" = now()
  RETURNING id INTO agent_category_id;

  INSERT INTO blog_authors (
    "displayName",
    slug,
    bio,
    "avatarUrl",
    role,
    expertise,
    "sameAsLinks"
  )
  VALUES (
    'Redakcja EstateFlow',
    'redakcja-estateflow',
    'Zespół EstateFlow przygotowuje praktyczne poradniki o sprzedaży, wynajmie i obsłudze ofert nieruchomości. Łączymy perspektywę właściciela, kupującego i agenta, żeby pokazywać proces możliwie konkretnie.',
    null,
    'Zespół redakcyjny',
    'sprzedaż nieruchomości, marketing ofert, CRM dla agentów, obsługa leadów',
    '[]'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    "displayName" = EXCLUDED."displayName",
    bio = EXCLUDED.bio,
    "avatarUrl" = EXCLUDED."avatarUrl",
    role = EXCLUDED.role,
    expertise = EXCLUDED.expertise,
    "sameAsLinks" = EXCLUDED."sameAsLinks",
    "updatedAt" = now()
  RETURNING id INTO author_id;

  INSERT INTO blog_posts (
    title,
    slug,
    excerpt,
    content,
    "contentFormat",
    "coverImageUrl",
    "coverImageAlt",
    status,
    "categoryId",
    "authorId",
    "seoTitle",
    "seoDescription",
    "canonicalUrl",
    robots,
    "publishedAt"
  )
  VALUES (
    'Jak przygotować mieszkanie do sprzedaży krok po kroku',
    'jak-przygotowac-mieszkanie-do-sprzedazy-krok-po-kroku',
    'Praktyczna checklista przygotowania mieszkania do sprzedaży: porządki, dokumenty, zdjęcia, wycena, opis oferty i obsługa pierwszych zapytań.',
    $post$
## Od czego zacząć przygotowanie mieszkania do sprzedaży

Dobre przygotowanie mieszkania zaczyna się zanim pojawi się ogłoszenie. Najpierw warto spojrzeć na nieruchomość oczami osoby, która widzi ją pierwszy raz: czy układ jest czytelny, czy wnętrze wygląda jasno, czy zdjęcia pokażą realne atuty, czy opis odpowie na pytania, które kupujący zadają najczęściej.

Sprzedaż nie polega tylko na wystawieniu ceny. Kupujący porównuje wiele ofert naraz, dlatego mieszkanie powinno być łatwe do zrozumienia już po kilku sekundach. To oznacza prosty przekaz, komplet informacji i brak elementów, które budzą niepewność.

![Jasny salon przygotowany do sprzedaży mieszkania](/images/hero/interior-1.jpg)

## Przygotuj dokumenty i podstawowe informacje

Zanim zaczniesz sprzątać albo robić zdjęcia, zbierz dane potrzebne do rozmów z kupującymi. Brak odpowiedzi na podstawowe pytania spowalnia sprzedaż i osłabia zaufanie.

- metraż z dokumentów i rozkład pomieszczeń
- forma własności i numer księgi wieczystej
- wysokość czynszu administracyjnego
- informacje o funduszu remontowym i planowanych pracach
- koszty mediów oraz ogrzewania
- dostępne wyposażenie i elementy zostające w cenie
- termin wydania mieszkania

Jeśli planujesz publikację oferty samodzielnie, przygotuj też materiały do kontaktu z zainteresowanymi. Pomocny będzie publiczny katalog, w którym klient może od razu przejść do szczegółów i formularza kontaktowego: [aktualne oferty nieruchomości](/oferty).

## Uporządkuj mieszkanie pod zdjęcia i prezentacje

Najważniejsza zasada jest prosta: kupujący ma zobaczyć przestrzeń, nie prywatne życie obecnego właściciela. Nie chodzi o sztuczne wnętrze, ale o ograniczenie rozpraszaczy.

Usuń nadmiar dekoracji, schowaj prywatne zdjęcia, uporządkuj blaty i odsłoń okna. Jeżeli mieszkanie jest małe, szczególnie pilnuj przejść między pomieszczeniami. Zdjęcia powinny pokazać proporcje, światło i funkcję każdego pokoju.

## Zadbaj o drobne naprawy

Małe usterki często robią większe wrażenie niż ich realny koszt. Niedokręcona klamka, przepalona żarówka, pęknięta listwa czy niedomyte fugi mogą sugerować, że mieszkanie było zaniedbane.

Przed sesją zdjęciową przejdź po mieszkaniu z checklistą:

- wymień przepalone żarówki
- popraw silikon w łazience, jeśli wygląda źle
- napraw widoczne drobiazgi
- umyj okna i lustra
- sprawdź, czy drzwi i szafki domykają się bez problemu

## Przygotuj cenę i argumenty

Kupujący zapyta, skąd wynika cena. Dlatego przed publikacją oferty przygotuj porównanie podobnych mieszkań. Sama obserwacja najwyższych cen z portali nie wystarczy, bo część ofert może wisieć miesiącami bez transakcji.

Wycena powinna uwzględniać lokalizację, piętro, standard, układ, windę, balkon, miejsce parkingowe, stan budynku i realną konkurencję. Szerzej opisujemy to w artykule [Jak wycenić mieszkanie przed wystawieniem ogłoszenia](/blog/jak-wycenic-mieszkanie-przed-wystawieniem-ogloszenia).

::featured-listings

## Napisz opis, który odpowiada na pytania

Opis nie powinien być reklamową laurką. Najlepiej działa tekst, który szybko wyjaśnia, dla kogo jest mieszkanie, co jest jego największym atutem i jakie informacje są ważne przed kontaktem.

Dobry opis zawiera:

- lokalizację i komunikację
- układ pomieszczeń
- najważniejsze wyposażenie
- koszty utrzymania
- stan prawny
- termin wydania
- jasne wezwanie do kontaktu

Jeżeli chcesz dopracować ten etap, przejdź do poradnika [Jak napisać skuteczny opis ogłoszenia nieruchomości](/blog/jak-napisac-skuteczny-opis-ogloszenia-nieruchomosci).

::cta submit-listing

## Zaplanuj obsługę pierwszych zapytań

Po publikacji najważniejsza jest szybkość reakcji. Kupujący często wysyła zapytania do kilku ofert jednocześnie. Jeśli odpowiedź przyjdzie po dwóch dniach, rozmowa może być już nieaktualna.

Ustal wcześniej, kiedy możesz odbierać telefon, jak będziesz umawiać prezentacje i jakie informacje wyślesz po pierwszym kontakcie. Jeżeli korzystasz z narzędzia CRM, zapisuj źródło zapytania i status rozmowy. To pomaga ocenić, czy cena, zdjęcia i opis działają.

:::faq
### Czy warto odświeżyć mieszkanie przed sprzedażą?
Tak, jeśli koszt jest niski i poprawia pierwsze wrażenie. Najczęściej wystarczą porządki, drobne naprawy, lepsze światło i neutralne dodatki. Duży remont przed sprzedażą wymaga osobnej kalkulacji.

### Czy mieszkanie powinno być puste do zdjęć?
Nie zawsze. Puste mieszkanie może wydawać się mniejsze i mniej funkcjonalne. Ważniejsze jest uporządkowanie przestrzeni oraz pokazanie skali pomieszczeń.

### Kiedy przygotować dokumenty do sprzedaży?
Najlepiej przed publikacją ogłoszenia. Kupujący szybko pyta o księgę wieczystą, czynsz, termin wydania i stan prawny, dlatego brak danych może opóźnić decyzję.
:::
$post$,
    'markdown',
    '/images/hero/interior-1.jpg',
    'Jasny salon przygotowany do sprzedaży mieszkania',
    'draft',
    seller_category_id,
    author_id,
    'Jak przygotować mieszkanie do sprzedaży krok po kroku',
    'Checklista przygotowania mieszkania do sprzedaży: dokumenty, porządki, zdjęcia, cena, opis oferty i obsługa zapytań.',
    null,
    'noindex_follow',
    null
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    "contentFormat" = EXCLUDED."contentFormat",
    "coverImageUrl" = EXCLUDED."coverImageUrl",
    "coverImageAlt" = EXCLUDED."coverImageAlt",
    status = EXCLUDED.status,
    "categoryId" = EXCLUDED."categoryId",
    "authorId" = EXCLUDED."authorId",
    "seoTitle" = EXCLUDED."seoTitle",
    "seoDescription" = EXCLUDED."seoDescription",
    "canonicalUrl" = EXCLUDED."canonicalUrl",
    robots = EXCLUDED.robots,
    "publishedAt" = EXCLUDED."publishedAt",
    "updatedAt" = now()
  RETURNING id INTO post_prepare_id;

  INSERT INTO blog_posts (
    title,
    slug,
    excerpt,
    content,
    "contentFormat",
    "coverImageUrl",
    "coverImageAlt",
    status,
    "categoryId",
    "authorId",
    "seoTitle",
    "seoDescription",
    "canonicalUrl",
    robots,
    "publishedAt"
  )
  VALUES (
    'Jak wycenić mieszkanie przed wystawieniem ogłoszenia',
    'jak-wycenic-mieszkanie-przed-wystawieniem-ogloszenia',
    'Jak ustalić realną cenę ofertową mieszkania: analiza porównawcza, korekty, konkurencja, margines negocjacji i sygnały do zmiany ceny.',
    $post$
## Dlaczego dobra wycena jest ważna już na starcie

Cena ustawiona na początku ma duży wpływ na liczbę zapytań. Zbyt wysoka może zniechęcić kupujących i sprawić, że oferta zacznie się starzeć. Zbyt niska może przyciągnąć kontakt, ale ograniczyć wynik finansowy właściciela.

Dobra wycena mieszkania przed publikacją ogłoszenia nie jest jedną liczbą znalezioną w internecie. To wynik porównania podobnych ofert, oceny standardu i decyzji, jak szybko chcesz sprzedać nieruchomość.

![Stół z notatkami i laptopem podczas analizy ceny mieszkania](/images/hero/interior-2.jpg)

## Zbierz porównywalne oferty

Najpierw wybierz mieszkania podobne do Twojego. Porównuj lokalizację, metraż, liczbę pokoi, piętro, windę, balkon, miejsce parkingowe, standard i rok budynku. Jeśli mieszkanie ma 48 m², nie porównuj go bezpośrednio z lokalem 75 m² tylko dlatego, że znajduje się w tej samej dzielnicy.

Warto zebrać minimum 8-12 ofert, a potem odrzucić skrajności. Najdroższa oferta nie musi oznaczać realnej ceny transakcyjnej. Może być po prostu mieszkaniem, które długo czeka na kupującego.

## Policz cenę za metr, ale nie kończ na niej analizy

Cena za metr kwadratowy pomaga szybko porównać rynek, ale nie powinna być jedynym kryterium. Dwa mieszkania o tej samej powierzchni mogą mieć zupełnie inną wartość, jeśli jedno ma lepszy rozkład, balkon i miejsce parkingowe, a drugie wymaga generalnego remontu.

Uwzględnij korekty za:

- standard wykończenia
- układ i liczbę niezależnych pokoi
- piętro oraz windę
- ekspozycję i poziom hałasu
- balkon, ogródek lub taras
- miejsce parkingowe i komórkę lokatorską
- stan budynku i części wspólnych

## Sprawdź aktywną konkurencję

Kupujący nie ocenia Twojej oferty w próżni. Widzi listę mieszkań podobnych cenowo i lokalizacyjnie. Dlatego przed publikacją sprawdź, co klient zobaczy obok Twojego ogłoszenia.

Jeśli Twoje mieszkanie jest droższe od konkurencji, opis i zdjęcia muszą jasno uzasadniać różnicę. Jeżeli przewaga nie jest widoczna, cena może blokować kontakt.

::featured-listings

## Ustal strategię ceny ofertowej

Cena ofertowa może zawierać margines negocjacji, ale powinien być rozsądny. Zbyt duży margines często sprawia, że kupujący w ogóle nie kliknie ogłoszenia. Lepsza jest cena, która mieści się w realnym zakresie rynkowym i pozwala prowadzić rozmowę.

Jeśli zależy Ci na szybkiej sprzedaży, cena powinna być bliżej najatrakcyjniejszych konkurencyjnych ofert. Jeśli możesz poczekać, możesz testować wyższy poziom, ale ustal wcześniej moment korekty.

## Obserwuj reakcję rynku po publikacji

Pierwsze 7-14 dni pokazuje, czy cena działa. Jeśli oferta ma dużo wyświetleń, ale mało zapytań, problemem może być cena, zdjęcia albo opis. Jeśli zapytania są, ale nie ma prezentacji, sprawdź jakość leadów i informacje przekazywane w ogłoszeniu.

Przed publikacją warto też przygotować mieszkanie wizualnie. Pomaga w tym poradnik [Jak przygotować mieszkanie do sprzedaży krok po kroku](/blog/jak-przygotowac-mieszkanie-do-sprzedazy-krok-po-kroku).

::cta contact

## Nie zmieniaj ceny bez powodu

Korekta ceny powinna wynikać z danych, nie z nerwowej reakcji po dwóch dniach. Ustal progi: liczba wyświetleń, liczba zapytań, liczba prezentacji i feedback po oględzinach. Dopiero wtedy decyzja o obniżce jest racjonalna.

:::faq
### Czy cena ofertowa powinna być wyższa od oczekiwanej?
Może zawierać niewielki margines negocjacji, ale zbyt wysoka cena ogranicza liczbę zapytań. Najlepiej ustalić zakres, w którym oferta nadal wygląda konkurencyjnie.

### Ile ofert porównać przed wyceną mieszkania?
Dobrym minimum jest 8-12 porównywalnych ogłoszeń. Ważne, żeby były podobne lokalizacją, metrażem, standardem i typem budynku.

### Kiedy obniżyć cenę mieszkania?
Najpierw sprawdź wyświetlenia, zapytania i feedback z prezentacji. Jeśli przez 2-3 tygodnie oferta nie generuje sensownego kontaktu, warto rozważyć korektę.
:::
$post$,
    'markdown',
    '/images/hero/interior-2.jpg',
    'Analiza ceny mieszkania przed publikacją ogłoszenia',
    'draft',
    pricing_category_id,
    author_id,
    'Jak wycenić mieszkanie przed ogłoszeniem',
    'Jak wycenić mieszkanie przed sprzedażą: porównanie ofert, cena za metr, konkurencja, strategia ceny i korekty.',
    null,
    'noindex_follow',
    null
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    "contentFormat" = EXCLUDED."contentFormat",
    "coverImageUrl" = EXCLUDED."coverImageUrl",
    "coverImageAlt" = EXCLUDED."coverImageAlt",
    status = EXCLUDED.status,
    "categoryId" = EXCLUDED."categoryId",
    "authorId" = EXCLUDED."authorId",
    "seoTitle" = EXCLUDED."seoTitle",
    "seoDescription" = EXCLUDED."seoDescription",
    "canonicalUrl" = EXCLUDED."canonicalUrl",
    robots = EXCLUDED.robots,
    "publishedAt" = EXCLUDED."publishedAt",
    "updatedAt" = now()
  RETURNING id INTO post_pricing_id;

  INSERT INTO blog_posts (
    title,
    slug,
    excerpt,
    content,
    "contentFormat",
    "coverImageUrl",
    "coverImageAlt",
    status,
    "categoryId",
    "authorId",
    "seoTitle",
    "seoDescription",
    "canonicalUrl",
    robots,
    "publishedAt"
  )
  VALUES (
    'Jak napisać skuteczny opis ogłoszenia nieruchomości',
    'jak-napisac-skuteczny-opis-ogloszenia-nieruchomosci',
    'Struktura skutecznego opisu ogłoszenia nieruchomości: tytuł, pierwszy akapit, atuty, konkrety, koszty, stan prawny i wezwanie do kontaktu.',
    $post$
## Po co opis ogłoszenia, skoro kupujący patrzy na zdjęcia

Zdjęcia przyciągają uwagę, ale opis pomaga podjąć decyzję o kontakcie. Kupujący chce szybko sprawdzić, czy mieszkanie pasuje do jego potrzeb, budżetu i sytuacji życiowej. Jeśli opis jest ogólny albo pełen pustych haseł, oferta traci część potencjalnych zapytań.

Skuteczny opis ogłoszenia nieruchomości powinien być konkretny, uporządkowany i łatwy do przeskanowania. Nie musi być długi, ale musi odpowiadać na realne pytania.

![Biurko z laptopem podczas pisania opisu ogłoszenia nieruchomości](/images/hero/house-1.jpg)

## Zacznij od mocnego tytułu

Tytuł powinien mówić, co jest najważniejsze: lokalizacja, typ nieruchomości, liczba pokoi albo wyróżnik. Unikaj ogólników w stylu "super okazja" albo "piękne mieszkanie". Lepiej napisać konkretnie:

- 3-pokojowe mieszkanie z balkonem blisko metra
- Dom z ogrodem i garażem, spokojna okolica
- Kawalerka po remoncie, gotowa do wynajmu

Tytuł ma pomóc kupującemu zdecydować, czy warto kliknąć ofertę. Nie powinien obiecywać czegoś, czego opis i zdjęcia nie potwierdzą.

## Pierwszy akapit powinien odpowiedzieć na intencję

Pierwsze 2-3 zdania są najważniejsze. Napisz, dla kogo jest nieruchomość i co ją wyróżnia. Przykład: "Mieszkanie sprawdzi się dla pary lub rodziny, która szuka trzech pokoi w dobrze skomunikowanej części miasta. Największym atutem jest jasny salon z balkonem oraz osobna kuchnia."

Taki wstęp daje kontekst. Kupujący od razu rozumie, czy oferta pasuje do jego sytuacji.

## Uporządkuj opis w sekcje

Najlepiej działają krótkie bloki informacji. Możesz użyć prostych nagłówków: lokalizacja, układ, standard, koszty, stan prawny, kontakt. Dzięki temu klient nie musi czytać całego tekstu, żeby znaleźć jedną informację.

W opisie warto uwzględnić:

- metraż i liczbę pokoi
- piętro, windę i balkon
- standard wykończenia
- wyposażenie zostające w cenie
- czynsz i najważniejsze koszty
- komunikację i usługi w okolicy
- stan prawny i termin wydania

## Nie ukrywaj informacji, które i tak wyjdą w rozmowie

Jeśli mieszkanie wymaga remontu, napisz to wprost i pokaż potencjał. Jeśli budynek nie ma windy, nie pomijaj tej informacji. Transparentny opis przyciąga lepiej dopasowanych klientów i ogranicza stracone prezentacje.

Przed opisem warto też dobrze przygotować samą nieruchomość. Pomaga w tym checklista [Jak przygotować mieszkanie do sprzedaży krok po kroku](/blog/jak-przygotowac-mieszkanie-do-sprzedazy-krok-po-kroku).

::featured-listings

## Dodaj CTA, które mówi co zrobić dalej

Opis powinien kończyć się prostym wezwaniem do działania. Kupujący ma wiedzieć, czy powinien zadzwonić, wysłać formularz, umówić prezentację albo zapytać o dokumenty.

Przykłady:

- Napisz, jeśli chcesz otrzymać pełny plan mieszkania.
- Skontaktuj się, żeby umówić prezentację.
- Dodaj zapytanie przez formularz, a opiekun oferty wróci z terminami.

Jeżeli publikujesz ofertę samodzielnie, możesz zacząć od formularza: [dodaj ofertę nieruchomości](/dodaj-oferte).

::cta submit-listing

## Po publikacji mierz jakość zapytań

Dobry opis nie tylko wygląda profesjonalnie. Powinien zwiększać liczbę sensownych kontaktów i ograniczać pytania o podstawowe informacje. Jeśli wiele osób pyta o cenę, czynsz albo termin wydania, prawdopodobnie opis nie jest wystarczająco konkretny.

Warto porównać opis z ceną. Jeśli tekst jest dobry, zdjęcia są czytelne, a zapytań nadal brakuje, wróć do artykułu [Jak wycenić mieszkanie przed wystawieniem ogłoszenia](/blog/jak-wycenic-mieszkanie-przed-wystawieniem-ogloszenia).

:::faq
### Jak długi powinien być opis ogłoszenia nieruchomości?
Najczęściej wystarczy 250-500 słów. Ważniejsze od długości jest uporządkowanie informacji i konkretne odpowiedzi na pytania kupującego.

### Czy opis powinien zawierać wady mieszkania?
Tak, jeśli są istotne dla decyzji. Transparentność ogranicza nietrafione zapytania i buduje zaufanie przed prezentacją.

### Co powinno znaleźć się na końcu opisu?
Na końcu warto dodać jasne CTA: zaproszenie do kontaktu, prezentacji, wysłania formularza albo pobrania dodatkowych informacji.
:::
$post$,
    'markdown',
    '/images/hero/house-1.jpg',
    'Biurko z laptopem podczas pisania opisu ogłoszenia nieruchomości',
    'draft',
    marketing_category_id,
    author_id,
    'Jak napisać skuteczny opis ogłoszenia nieruchomości',
    'Jak napisać opis ogłoszenia nieruchomości: tytuł, struktura, konkrety, CTA, informacje o kosztach i stanie prawnym.',
    null,
    'noindex_follow',
    null
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    "contentFormat" = EXCLUDED."contentFormat",
    "coverImageUrl" = EXCLUDED."coverImageUrl",
    "coverImageAlt" = EXCLUDED."coverImageAlt",
    status = EXCLUDED.status,
    "categoryId" = EXCLUDED."categoryId",
    "authorId" = EXCLUDED."authorId",
    "seoTitle" = EXCLUDED."seoTitle",
    "seoDescription" = EXCLUDED."seoDescription",
    "canonicalUrl" = EXCLUDED."canonicalUrl",
    robots = EXCLUDED.robots,
    "publishedAt" = EXCLUDED."publishedAt",
    "updatedAt" = now()
  RETURNING id INTO post_description_id;

  DELETE FROM blog_post_tags
  WHERE "postId" IN (post_prepare_id, post_pricing_id, post_description_id);

  INSERT INTO blog_post_tags ("postId", tag)
  VALUES
    (post_prepare_id, 'sprzedaż mieszkania'),
    (post_prepare_id, 'przygotowanie nieruchomości'),
    (post_prepare_id, 'home staging'),
    (post_pricing_id, 'wycena mieszkania'),
    (post_pricing_id, 'cena ofertowa'),
    (post_pricing_id, 'sprzedaż nieruchomości'),
    (post_description_id, 'opis ogłoszenia'),
    (post_description_id, 'marketing ofert'),
    (post_description_id, 'ogłoszenie nieruchomości')
  ON CONFLICT ("postId", tag) DO NOTHING;
END $$;

COMMIT;
