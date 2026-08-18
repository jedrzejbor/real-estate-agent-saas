# Paleta kolorow UX/UI

Dokument opisuje kolory faktycznie uzywane w aplikacji webowej. Zrodlem prawdy dla tokenow sa zmienne CSS w `apps/web/src/app/globals.css`; ten plik jest rozpiska robocza dla osoby odpowiedzialnej za UX/UI.

## Zasady pracy z paleta

- Projektuj najpierw na tokenach, nie na pojedynczych wartosciach HEX: `primary`, `background`, `card`, `muted`, `border`, `status-*`, `brand-*`.
- Główna estetyka produktu to cieple neutralne tlo, biale powierzchnie, szmaragdowy kolor akcji i zloty akcent premium.
- Czysta czern nie jest domyslnym kolorem tekstu. Dla tekstu uzywamy cieplego `#1C1917`, a czern pojawia sie tylko w overlayach, galerii, modalu lub wariantach print.
- Kolory Tailwind typu `amber-*`, `blue-*`, `red-*`, `stone-*` wystepuja w kilku starszych/lokalnych statusach. Przy nowych ekranach preferuj tokeny `status-*` i `brand-*`.

## Kolory marki

| Token CSS | Tailwind | Nazwa robocza | HEX | RGB | Uzycie UX/UI |
|---|---|---|---|---|---|
| `--brand-emerald` / `--primary` | `brand-emerald`, `primary` | Emerald Green | `#059669` | `5, 150, 105` | Glowne CTA, aktywne ikony, linki, focus, pozytywny akcent marki |
| `--brand-emerald-dark` | `brand-emerald-dark` | Dark Emerald | `#047857` | `4, 120, 87` | Hover/pressed dla primary, mocniejszy tekst na jasnych zielonych tlach |
| `--brand-emerald-light` | `brand-emerald-light` | Emerald Light | `#ECFDF5` | `236, 253, 245` | Subtelne tla badge, highlight, sekcje CTA o niskim nasyceniu |
| `--brand-gold` / `--secondary` | `brand-gold`, `secondary` | Rich Gold | `#D4A853` | `212, 168, 83` | Akcent premium, wyróznione plany, gwiazdki, elementy sprzedazowe |
| `--brand-gold-dark` | `brand-gold-dark` | Dark Gold | `#B8922F` | `184, 146, 47` | Tekst i ikony na jasnym zlotym tle, hover wariantu gold |
| `--brand-gold-light` | `brand-gold-light` | Gold Light | `#FFF9E6` | `255, 249, 230` | Tlo badge premium, karty upsell, delikatne ramki premium |
| `--brand-terracotta` / `--accent` | `brand-terracotta`, `accent` | Warm Terracotta | `#C2724B` | `194, 114, 75` | Akcenty specjalne, ilustracje, kontrapunkt do zieleni i zlota |

## Powierzchnie i neutralne

| Token CSS | Tailwind | Nazwa robocza | HEX | RGB | Uzycie UX/UI |
|---|---|---|---|---|---|
| `--background` / `--warm-white` | `background`, `warm-white` | Warm White | `#FAFAF9` | `250, 250, 249` | Glowne tlo aplikacji i stron publicznych |
| `--card` | `card` | Pure White | `#FFFFFF` | `255, 255, 255` | Karty, modale, popovery, pola z powierzchnia na tle aplikacji |
| `--muted` / `--warm-cream` | `muted`, `warm-cream` | Warm Cream | `#F5F0EB` | `245, 240, 235` | Sidebar, sekcje pomocnicze, hover state, panele o mniejszej wadze |
| `--border` / `--input` | `border`, `input` | Stone Border | `#E7E5E4` | `231, 229, 228` | Obramowania kart, inputow, separatorow i sidebaru |
| brak stalego tokenu | `stone-200` | Hover Border | `#D6D3D1` | `214, 211, 209` | Hover obramowan i mocniejsze separatory; opisane w design systemie |
| brak stalego tokenu | `stone-100` | Muted Separator | `#F5F5F4` | `245, 245, 244` | Bardzo subtelne separatory, skeleton loading |

## Tekst

| Token CSS | Tailwind | Nazwa robocza | HEX | RGB | Uzycie UX/UI |
|---|---|---|---|---|---|
| `--foreground` / `--warm-text` | `foreground`, `warm-text` | Text Primary | `#1C1917` | `28, 25, 23` | Naglowki, glowna tresc, wazne liczby |
| `--warm-text-secondary` | `warm-text-secondary` | Text Secondary | `#44403C` | `68, 64, 60` | Podtytuly, opisy, mniej wazne etykiety |
| `--muted-foreground` / `--warm-text-muted` | `muted-foreground`, `warm-text-muted` | Text Muted | `#78716C` | `120, 113, 108` | Placeholdery, daty, metadata, tekst drugoplanowy |
| brak stalego tokenu | `stone-400` | Text Disabled | `#A8A29E` | `168, 162, 158` | Elementy nieaktywne, bardzo niska hierarchia |
| `--primary-foreground` | `primary-foreground` | Text On Primary | `#FFFFFF` | `255, 255, 255` | Tekst na primary CTA |
| `--secondary-foreground` | `secondary-foreground` | Text On Secondary | `#FFFFFF` | `255, 255, 255` | Tekst na secondary CTA |

## Statusy systemowe

| Token CSS | Tailwind | Nazwa robocza | HEX | RGB | Uzycie UX/UI |
|---|---|---|---|---|---|
| `--status-success` | `status-success` | Success | `#16A34A` | `22, 163, 74` | Sukces, aktywne statusy, wykonane zadania |
| `--status-success-bg` | `status-success-bg` | Success BG | `#F0FDF4` | `240, 253, 244` | Jasne tlo badge lub alertu sukcesu |
| `--status-warning` | `status-warning` | Warning | `#EA580C` | `234, 88, 12` | Ostrzezenia, ryzyko, wymagane dzialanie |
| `--status-warning-bg` | `status-warning-bg` | Warning BG | `#FFF7ED` | `255, 247, 237` | Jasne tlo ostrzezen |
| `--destructive` | `destructive` | Destructive | `#DC2626` | `220, 38, 38` | Bledy, usuwanie, zablokowane lub negatywne statusy |
| brak stalego tokenu | `red-50` | Destructive BG | `#FEF2F2` | `254, 242, 242` | Jasne tlo bledow; opisane w design systemie |
| `--status-info` | `status-info` | Info | `#2563EB` | `37, 99, 235` | Informacje, status "nowe", niekrytyczne komunikaty |
| `--status-info-bg` | `status-info-bg` | Info BG | `#EFF6FF` | `239, 246, 255` | Jasne tlo informacji |

## Sidebar i nawigacja

| Token CSS | Tailwind | HEX | Uzycie UX/UI |
|---|---|---|---|
| `--sidebar` | `sidebar` | `#F5F0EB` | Tlo bocznej nawigacji |
| `--sidebar-foreground` | `sidebar-foreground` | `#1C1917` | Tekst w sidebarze |
| `--sidebar-primary` | `sidebar-primary` | `#059669` | Aktywna pozycja, glowny akcent sidebaru |
| `--sidebar-primary-foreground` | `sidebar-primary-foreground` | `#FFFFFF` | Tekst na aktywnej pozycji |
| `--sidebar-accent` | `sidebar-accent` | `#E7E5E4` | Hover/akcent w sidebarze |
| `--sidebar-border` | `sidebar-border` | `#E7E5E4` | Obramowania i separatory |
| `--sidebar-ring` | `sidebar-ring` | `#059669` | Focus ring w nawigacji |

## Wykresy i raporty

| Token CSS | Tailwind | HEX | Rekomendowane uzycie |
|---|---|---|---|
| `--chart-1` | `chart-1` | `#059669` | Seria glowna, najwazniejszy pozytywny trend |
| `--chart-2` | `chart-2` | `#D4A853` | Seria premium, przychod, wyróznienie |
| `--chart-3` | `chart-3` | `#C2724B` | Seria dodatkowa, kontrast cieply |
| `--chart-4` | `chart-4` | `#16A34A` | Sukces/wzrost |
| `--chart-5` | `chart-5` | `#EA580C` | Ostrzezenie/spadek/ryzyko |

## Cienie, overlaye i elementy specjalne

| Wartosc | Uzycie UX/UI |
|---|---|
| `rgba(28, 25, 23, 0.04-0.10)` | Cienie kart, dropdownow i modali. Preferowany cieply odcien cienia. |
| `rgba(5, 150, 105, 0.10-0.40)` | Focus ring, glow i cien dla primary CTA. |
| `black / white` z opacity, np. `bg-black/40`, `bg-white/15` | Overlay modali, galerie zdjec, hero na zdjeciu. Nie stosowac jako bazowe tlo aplikacji. |
| `#1C1917` i `#FFFFFF` | Kolory QR/print oraz kontrastowe elementy eksportowane. |

## Tryb ciemny

Tryb ciemny ma osobna palete w `.dark`. Jesli UX/UI projektuje wariant dark mode, nalezy uzyc ponizszych wartosci zamiast mechanicznego przyciemniania jasnej palety.

| Token CSS | HEX dark | Uzycie |
|---|---|---|
| `--background` | `#0F1115` | Glowne tlo dark mode |
| `--foreground` | `#F5F5F4` | Glowny tekst |
| `--card` | `#181A20` | Karty i powierzchnie |
| `--popover` | `#1F222A` | Popovery i modale |
| `--muted` | `#242832` | Tla pomocnicze |
| `--muted-foreground` | `#A8A29E` | Tekst drugoplanowy |
| `--primary` / `--brand-emerald` | `#34D399` | Akcje glowne |
| `--brand-emerald-dark` | `#10B981` | Hover/mocniejszy emerald |
| `--brand-emerald-light` | `#052E22` | Tlo emerald w dark mode |
| `--secondary` / `--brand-gold` | `#F2C46D` | Akcent premium |
| `--brand-gold-dark` | `#E0A837` | Mocniejszy gold |
| `--brand-gold-light` | `#3A2A12` | Tlo gold w dark mode |
| `--accent` / `--brand-terracotta` | `#F09A73` | Akcent dodatkowy |
| `--destructive` | `#F87171` | Bledy/destructive |
| `--border` / `--input` | `#30343D` | Obramowania |
| `--status-success` | `#4ADE80` | Sukces |
| `--status-success-bg` | `#052E16` | Tlo sukcesu |
| `--status-warning` | `#FB923C` | Ostrzezenie |
| `--status-warning-bg` | `#431407` | Tlo ostrzezenia |
| `--status-info` | `#60A5FA` | Informacja |
| `--status-info-bg` | `#172554` | Tlo informacji |

## Kolory lokalne do uporzadkowania

W kodzie wystepuja jeszcze lokalne klasy Tailwind bez dedykowanego tokenu. Projektujac nowe widoki, warto je zastapic tokenami z sekcji powyzej albo dopisac swiadomy token.

| Kolor/klasa | Przyklady uzycia | Rekomendacja UX/UI |
|---|---|---|
| `amber-50`, `amber-100`, `amber-200`, `amber-500`, `amber-700/800/900/950` | Ostrzezenia, rezerwacje, admin alerts | Dla nowych alertow uzywac `status-warning` i `status-warning-bg`; amber zostawic tylko, gdy potrzebny jest inny odcien niz firmowy warning. |
| `blue-50/100/400/500/700/800/900` | Info, nowe statusy, wykresy lokalne | Preferowac `status-info` i `status-info-bg`. |
| `red-50/100/400/900` | Bledy, spam, statusy negatywne | Preferowac `destructive` i `#FEF2F2` jako tlo destructive. |
| `green-600`, `emerald-200/600` | Pozytywne sygnaly i walidacja | Preferowac `status-success` albo `brand-emerald` zaleznie od znaczenia. |
| `stone-50/100/200/700/800/900/950` | Tla neutralne, galerie, raporty print | Dopuszczalne jako neutralne odcienie pomocnicze, ale podstawowy system opiera sie o `warm-*`, `foreground`, `muted`, `border`. |

## Szybkie mapowanie dla Figma

Proponowane grupy stylow kolorow:

- `Brand/Emerald` -> `#059669`
- `Brand/Emerald Dark` -> `#047857`
- `Brand/Emerald Light` -> `#ECFDF5`
- `Brand/Gold` -> `#D4A853`
- `Brand/Gold Dark` -> `#B8922F`
- `Brand/Gold Light` -> `#FFF9E6`
- `Brand/Terracotta` -> `#C2724B`
- `Surface/Background` -> `#FAFAF9`
- `Surface/Card` -> `#FFFFFF`
- `Surface/Muted` -> `#F5F0EB`
- `Text/Primary` -> `#1C1917`
- `Text/Secondary` -> `#44403C`
- `Text/Muted` -> `#78716C`
- `Border/Default` -> `#E7E5E4`
- `Status/Success` -> `#16A34A`
- `Status/Success BG` -> `#F0FDF4`
- `Status/Warning` -> `#EA580C`
- `Status/Warning BG` -> `#FFF7ED`
- `Status/Info` -> `#2563EB`
- `Status/Info BG` -> `#EFF6FF`
- `Status/Destructive` -> `#DC2626`
- `Status/Destructive BG` -> `#FEF2F2`
