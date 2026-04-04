# EstateFlow — Design System

> **Koncept B: ☀️ „Light Luxury Warm"**
>
> Ciepło, przystępność, elegancja — jak ekskluzywne biuro real estate z drewnianym wykończeniem.

## Spis treści

- [Kontekst projektu](#kontekst-projektu)
- [Filozofia designu](#filozofia-designu)
- [Paleta kolorów](#paleta-kolorów)
- [Typografia](#typografia)
- [Spacing & Layout](#spacing--layout)
- [Border Radius](#border-radius)
- [Shadows](#shadows)
- [Komponenty UI](#komponenty-ui)
- [Animacje i mikro-interakcje](#animacje-i-mikro-interakcje)
- [Responsywność](#responsywność)
- [Ikony](#ikony)
- [Struktura aplikacji](#struktura-aplikacji)
- [CSS Variables (implementacja)](#css-variables-implementacja)

---

## Kontekst projektu

**EstateFlow** to platforma SaaS dla agentów nieruchomości do zarządzania:
- **Ofertami** nieruchomości (CRUD, statusy, zdjęcia)
- **Klientami** (CRM, leady, historia kontaktów)
- **Spotkaniami** (kalendarz, planowanie, przypomnienia)
- **Raportami** (statystyki sprzedaży, konwersje, przychody)

### Tech Stack

| Warstwa | Technologia |
|---------|-------------|
| Monorepo | Turborepo + pnpm |
| Frontend | Next.js 16 (App Router) |
| UI Library | shadcn/ui (base-nova) |
| Styling | Tailwind CSS 4 |
| Backend | NestJS 11 + TypeORM |
| Database | PostgreSQL 16 |
| Infrastruktura | Docker Compose |

---

## Filozofia designu

Koncept B został wybrany z następujących powodów:

1. **Ciepło i przystępność** — buduje zaufanie u klientów agentów
2. **Elegancja bez przesady** — premium feel bez dystansu
3. **Jasne tło** — lepsza czytelność treści i zdjęć nieruchomości
4. **Uniwersalność** — pasuje zarówno do landing page jak i dashboardu

### Inspiracje wizualne

- Ekskluzywne biura nieruchomości z drewnianymi akcentami
- Magazyny architektoniczne (Architectural Digest, Dezeen)
- Premium SaaS dashboardy (Notion, Linear — ale w jasnej wersji)
- Apartamenty premium — tonacja naturalnych materiałów

---

## Paleta kolorów

### Kolory podstawowe

| Rola | Nazwa | Hex | RGB | OKLCH | Użycie |
|------|-------|-----|-----|-------|--------|
| **Background** | Warm White | `#FAFAF9` | `250, 250, 249` | `oklch(0.985 0.002 90)` | Główne tło aplikacji |
| **Surface** | Pure White | `#FFFFFF` | `255, 255, 255` | `oklch(1 0 0)` | Karty, modals, popovery |
| **Surface Muted** | Warm Cream | `#F5F0EB` | `245, 240, 235` | `oklch(0.96 0.01 70)` | Sidebar, sekcje tła, hover states |
| **Primary** | Emerald Green | `#059669` | `5, 150, 105` | `oklch(0.60 0.14 160)` | CTA przyciski, ikony aktywne, linki |
| **Primary Hover** | Dark Emerald | `#047857` | `4, 120, 87` | `oklch(0.52 0.13 160)` | Hover state primary |
| **Primary Light** | Emerald 50 | `#ECFDF5` | `236, 253, 245` | `oklch(0.98 0.02 160)` | Tło badge success, subtle highlights |
| **Secondary** | Rich Gold | `#D4A853` | `212, 168, 83` | `oklch(0.76 0.11 80)` | Badge premium, akcenty, ikony |
| **Secondary Hover** | Dark Gold | `#B8922F` | `184, 146, 47` | `oklch(0.68 0.12 80)` | Hover state secondary |
| **Secondary Light** | Gold 50 | `#FFF9E6` | `255, 249, 230` | `oklch(0.99 0.02 90)` | Tło badge gold |
| **Accent** | Warm Terracotta | `#C2724B` | `194, 114, 75` | `oklch(0.60 0.12 45)` | Specjalne akcenty, ilustracje |

### Kolory statusów

| Rola | Hex | Użycie |
|------|-----|--------|
| **Success** | `#16A34A` | Operacja udana, status „Aktywna" |
| **Success BG** | `#F0FDF4` | Tło badge success |
| **Warning** | `#EA580C` | Ostrzeżenia, status „Oczekująca" |
| **Warning BG** | `#FFF7ED` | Tło badge warning |
| **Destructive** | `#DC2626` | Błędy, usuwanie, status „Sprzedana" |
| **Destructive BG** | `#FEF2F2` | Tło badge destructive |
| **Info** | `#2563EB` | Informacje, status „Nowa" |
| **Info BG** | `#EFF6FF` | Tło badge info |

### Kolory tekstu

| Rola | Hex | Użycie |
|------|-----|--------|
| **Text Primary** | `#1C1917` | Nagłówki, treść główna |
| **Text Secondary** | `#44403C` | Podtytuły, opisy |
| **Text Muted** | `#78716C` | Placeholder, metadata, timestamps |
| **Text Disabled** | `#A8A29E` | Elementy nieaktywne |
| **Text On Primary** | `#FFFFFF` | Tekst na przyciskach primary |
| **Text On Secondary** | `#FFFFFF` | Tekst na przyciskach secondary |

### Kolory obramowań

| Rola | Hex | Użycie |
|------|-----|--------|
| **Border Default** | `#E7E5E4` | Obramowania kart, inputów |
| **Border Hover** | `#D6D3D1` | Hover state obramowań |
| **Border Focus** | `#059669` | Focus ring (primary color) |
| **Border Muted** | `#F5F5F4` | Subtelne separatory |

---

## Typografia

### Fonty

| Rola | Font | Fallback | Google Fonts |
|------|------|----------|--------------|
| **Headings** | `Outfit` | `sans-serif` | `https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap` |
| **Body** | `Inter` | `sans-serif` | `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap` |
| **Mono/Code** | `JetBrains Mono` | `monospace` | `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap` |

> **Alternatywa**: Dla efektu „magazynu architektonicznego" można użyć `Playfair Display` (serif) zamiast `Outfit` na headingach.

### Skala typograficzna

| Nazwa | Size | Line Height | Weight | Font | Użycie |
|-------|------|-------------|--------|------|--------|
| `display-xl` | `3rem` (48px) | `1.1` | 700 | Outfit | Landing hero |
| `display-lg` | `2.25rem` (36px) | `1.2` | 700 | Outfit | Sekcje landing page |
| `h1` | `1.875rem` (30px) | `1.3` | 600 | Outfit | Tytuły stron |
| `h2` | `1.5rem` (24px) | `1.35` | 600 | Outfit | Tytuły sekcji |
| `h3` | `1.25rem` (20px) | `1.4` | 600 | Outfit | Tytuły kart |
| `h4` | `1.125rem` (18px) | `1.4` | 500 | Outfit | Podtytuły |
| `body-lg` | `1.125rem` (18px) | `1.6` | 400 | Inter | Lead text |
| `body` | `1rem` (16px) | `1.6` | 400 | Inter | Treść główna |
| `body-sm` | `0.875rem` (14px) | `1.5` | 400 | Inter | Opisy wtórne |
| `caption` | `0.75rem` (12px) | `1.5` | 500 | Inter | Etykiety, metadata |
| `overline` | `0.75rem` (12px) | `1.5` | 600 | Inter | Uppercase labels |

---

## Spacing & Layout

### Skala spacingów

Bazowa jednostka: `4px`

| Token | Wartość | Użycie |
|-------|---------|--------|
| `space-0` | `0px` | — |
| `space-1` | `4px` | Micro spacing, gap ikon |
| `space-2` | `8px` | Padding wewnętrzny badge, małe gaps |
| `space-3` | `12px` | Padding mały |
| `space-4` | `16px` | Padding standardowy, gap kart |
| `space-5` | `20px` | Padding w kartach |
| `space-6` | `24px` | Gap między sekcjami |
| `space-8` | `32px` | Sekcja padding |
| `space-10` | `40px` | Duże odstępy |
| `space-12` | `48px` | Sekcje landing page |
| `space-16` | `64px` | Duże sekcje |
| `space-20` | `80px` | Hero sections |
| `space-24` | `96px` | Top/bottom page padding |

### Layout

| Element | Wartość |
|---------|---------|
| **Max container width** | `1280px` |
| **Sidebar width** | `260px` (desktop), `0` (mobile — hidden) |
| **Sidebar collapsed** | `72px` |
| **Top bar height** | `64px` |
| **Grid kolumny** | `12-column grid` |
| **Grid gap** | `24px` |
| **Card grid — desktop** | `4 kolumny` |
| **Card grid — tablet** | `2 kolumny` |
| **Card grid — mobile** | `1 kolumna` |

---

## Border Radius

| Token | Wartość | Użycie |
|-------|---------|--------|
| `radius-sm` | `6px` | Małe elementy: badge, chip |
| `radius-md` | `8px` | Inputy, mniejsze przyciski |
| `radius-lg` | `12px` | Karty, dialogi |
| `radius-xl` | `16px` | Hero karty, duże powierzchnie |
| `radius-2xl` | `24px` | Specjalne elementy, CTA |
| `radius-full` | `9999px` | Pill buttons, avatary |

---

## Shadows

Cienie mają ciepły odcień (stone) zamiast neutralnego szarości.

| Token | Wartość CSS | Użycie |
|-------|-----------|--------|
| `shadow-sm` | `0 1px 2px rgba(28, 25, 23, 0.05)` | Subtelne elevation |
| `shadow-md` | `0 4px 6px -1px rgba(28, 25, 23, 0.07), 0 2px 4px -2px rgba(28, 25, 23, 0.05)` | Karty, dropdowny |
| `shadow-lg` | `0 10px 15px -3px rgba(28, 25, 23, 0.08), 0 4px 6px -4px rgba(28, 25, 23, 0.04)` | Modals, popovery |
| `shadow-xl` | `0 20px 25px -5px rgba(28, 25, 23, 0.08), 0 8px 10px -6px rgba(28, 25, 23, 0.04)` | Floating elements |
| `shadow-card` | `0 1px 3px rgba(28, 25, 23, 0.06), 0 1px 2px rgba(28, 25, 23, 0.04)` | Domyślny cień kart |
| `shadow-card-hover` | `0 10px 25px -5px rgba(28, 25, 23, 0.1), 0 4px 6px -2px rgba(28, 25, 23, 0.05)` | Hover kart |

---

## Komponenty UI

Wszystkie komponenty bazują na **shadcn/ui** z customowym theme Koncept B.

### Przyciski

| Wariant | Background | Text | Border | Hover |
|---------|-----------|------|--------|-------|
| **Primary** | `#059669` | `#FFFFFF` | — | `#047857` |
| **Secondary** | `#D4A853` | `#FFFFFF` | — | `#B8922F` |
| **Outline** | transparent | `#059669` | `#059669` | `#ECFDF5` bg |
| **Ghost** | transparent | `#44403C` | — | `#F5F0EB` bg |
| **Destructive** | `#DC2626` | `#FFFFFF` | — | `#B91C1C` |
| **Link** | transparent | `#059669` | — | underline |

Rozmiany: `sm` (32px), `default` (40px), `lg` (48px), `icon` (40×40px)

### Karty (Card)

- Background: `#FFFFFF`
- Border: `1px solid #E7E5E4`
- Border Radius: `12px`
- Padding: `20px–24px`
- Shadow: `shadow-card`
- Hover: `shadow-card-hover` + border `#D6D3D1`
- Transition: `all 200ms ease`

### Inputy (Input, Select, Textarea)

- Background: `#FFFFFF`
- Border: `1px solid #E7E5E4`
- Border Radius: `8px`
- Padding: `10px 12px`
- Focus: border `#059669` + ring `0 0 0 3px rgba(5, 150, 105, 0.1)`
- Placeholder: `#78716C`

### Badge / Chip

| Status | Background | Text | Border |
|--------|-----------|------|--------|
| **Aktywna** | `#F0FDF4` | `#16A34A` | `#BBF7D0` |
| **Premium** | `#FFF9E6` | `#B8922F` | `#FDE68A` |
| **Sprzedana** | `#FEF2F2` | `#DC2626` | `#FECACA` |
| **Oczekująca** | `#FFF7ED` | `#EA580C` | `#FED7AA` |
| **Nowa** | `#EFF6FF` | `#2563EB` | `#BFDBFE` |

Border Radius: `6px`, Font size: `12px`, Weight: `500`, Padding: `4px 8px`

### Sidebar

- Background: `#F5F0EB` (cream)
- Width: `260px`
- Item padding: `10px 16px`
- Item active: background `#059669`, text `#FFFFFF`, border-radius `8px`
- Item hover: background `rgba(5, 150, 105, 0.08)`
- Item icon: `20px`, margin-right `12px`
- Separator: `1px solid #E7E5E4`
- Logo area height: `64px`

### Data Table

- Header: background `#F5F0EB`, font-weight `600`, font-size `12px`, uppercase, color `#78716C`
- Row: border-bottom `1px solid #F5F5F4`
- Row hover: background `#FAFAF9`
- Cell padding: `12px 16px`
- Sortable header: cursor pointer, hover color `#1C1917`

### Stat Card (metryki dashboard)

- Background: `#FFFFFF`
- Border: `1px solid #E7E5E4`
- Border Radius: `12px`
- Icon: `40px × 40px` container z `border-radius: 8px`
- Icon background: kolory pasujące do metryki (primary green, gold, etc.)
- Wartość: `h2` size, `font-weight: 700`
- Etykieta: `caption` size, `color: #78716C`

---

## Animacje i mikro-interakcje

### Transitions

| Cel | Właściwość | Duration | Easing |
|-----|-----------|----------|--------|
| Hover kart | `box-shadow, border-color` | `200ms` | `ease` |
| Hover scale (karty ofert) | `transform` | `200ms` | `ease-out` |
| Button hover | `background-color` | `150ms` | `ease` |
| Sidebar item | `background-color` | `150ms` | `ease` |
| Modal open | `opacity, transform` | `200ms` | `ease-out` |
| Modal close | `opacity, transform` | `150ms` | `ease-in` |
| Page transitions | `opacity` | `300ms` | `ease` |
| Tooltip | `opacity` | `150ms` | `ease` |

### Animacje specjalne

1. **Hover zoom na zdjęciach nieruchomości**: `transform: scale(1.05)` w `300ms` z `overflow: hidden` na kontenerze
2. **Number counter** na statystykach dashboardu: animacja od 0 do docelowej wartości w `800ms` z `ease-out`
3. **Skeleton loading**: pulsujący gradient zamiast spinnerów, kolory `#F5F0EB → #E7E5E4 → #F5F0EB`
4. **Toast notifications**: wjazd z prawej z progress bar (duration `5000ms`)
5. **Chart animations**: dane wejściowe z animacją w `600ms`

### Framer Motion — sugerowane warianty

```tsx
// Page transition
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// Stagger children (lista kart)
const containerVariants = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

// Hover card
const cardHover = {
  scale: 1.02,
  transition: { duration: 0.2 },
};
```

---

## Responsywność

### Breakpointy

| Nazwa | Min Width | Opis |
|-------|-----------|------|
| `sm` | `640px` | Małe telefony → duże telefony |
| `md` | `768px` | Tablety (portrait) |
| `lg` | `1024px` | Tablety (landscape), małe laptopy |
| `xl` | `1280px` | Desktopy |
| `2xl` | `1536px` | Duże monitory |

### Zachowania responsywne

| Element | Mobile (<768px) | Tablet (768-1024px) | Desktop (>1024px) |
|---------|-----------------|--------------------|--------------------|
| **Sidebar** | Bottom nav (5 ikon) | Collapsed (72px) | Full (260px) |
| **Grid ofert** | 1 kolumna | 2 kolumny | 3-4 kolumny |
| **Stat cards** | 2×2 grid | 4 w jednym rzędzie | 4 w jednym rzędzie |
| **Tabele** | Horizontal scroll lub card view | Pełna tabela | Pełna tabela |
| **Nawigacja** | Hamburger → drawer | Sidebar collapsed | Sidebar full |
| **Dashboard charts** | Stack pionowy | 2 kolumny | 2 kolumny |

---

## Ikony

### Sugerowana biblioteka: `lucide-react`

(Kompatybilna z shadcn/ui i już zainstalowana w projekcie.)

### Mapowanie ikon nawigacji

| Element | Ikona Lucide | Uwagi |
|---------|-------------|-------|
| Dashboard | `LayoutDashboard` | — |
| Oferty | `Building2` | lub `Home` |
| Klienci | `Users` | — |
| Kalendarz | `Calendar` | — |
| Raporty | `BarChart3` | — |
| Ustawienia | `Settings` | — |
| Wyszukiwanie | `Search` | — |
| Powiadomienia | `Bell` | z badge counter |
| Profil | `User` | lub avatar |
| Dodaj | `Plus` | — |
| Edytuj | `Pencil` | — |
| Usuń | `Trash2` | — |
| Filtruj | `Filter` | — |
| Sortuj | `ArrowUpDown` | — |

---

## Struktura aplikacji

```
apps/web/src/app/
├── (marketing)/                ← Landing page (publiczna)
│   ├── page.tsx                ← Strona główna
│   ├── pricing/page.tsx        ← Cennik
│   ├── about/page.tsx          ← O nas
│   ├── blog/                   ← Blog
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── contact/page.tsx        ← Kontakt
│   └── layout.tsx              ← Layout z nawigacją marketingową
│
├── (auth)/                     ← Autoryzacja
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   └── layout.tsx
│
├── (dashboard)/                ← Panel agenta (chroniony)
│   ├── layout.tsx              ← Layout z sidebar + topbar
│   ├── page.tsx                ← Dashboard home (statystyki)
│   ├── listings/               ← Zarządzanie ofertami
│   │   ├── page.tsx            ← Lista ofert
│   │   ├── new/page.tsx        ← Nowa oferta
│   │   └── [id]/
│   │       ├── page.tsx        ← Szczegóły oferty
│   │       └── edit/page.tsx   ← Edycja oferty
│   ├── clients/                ← CRM
│   │   ├── page.tsx            ← Lista klientów
│   │   ├── new/page.tsx        ← Nowy klient
│   │   └── [id]/page.tsx       ← Profil klienta
│   ├── calendar/page.tsx       ← Kalendarz spotkań
│   ├── reports/page.tsx        ← Raporty i statystyki
│   └── settings/               ← Ustawienia
│       ├── page.tsx            ← Profil
│       ├── billing/page.tsx    ← Subskrypcja
│       └── team/page.tsx       ← Zespół (jeśli multi-agent)
│
├── globals.css                 ← CSS variables z design system
└── layout.tsx                  ← Root layout (fonty, metadata)
```

### Sekcje Landing Page

1. **Hero** — nagłówek + CTA + grid zdjęć nieruchomości
2. **Features** — 4 karty funkcjonalności (zarządzanie, CRM, analizy, marketing)
3. **How it works** — 3 kroki (zarejestruj, dodaj, zarządzaj)
4. **Testimonials** — opinie agentów z avatarami i cytatami
5. **Pricing** — 3 plany (Starter, Professional, Enterprise)
6. **CTA final** — zachęta do rejestracji
7. **Footer** — linki, social media, legal

---

## CSS Variables (implementacja)

Poniższy blok CSS powinien znaleźć się w `globals.css`:

```css
@layer base {
  :root {
    /* === Background === */
    --background: 40 20% 98%;         /* #FAFAF9 Warm White */
    --foreground: 24 10% 10%;         /* #1C1917 Dark Warm */

    /* === Card / Surface === */
    --card: 0 0% 100%;                /* #FFFFFF Pure White */
    --card-foreground: 24 10% 10%;    /* #1C1917 */

    /* === Muted / Cream === */
    --muted: 30 18% 94%;              /* #F5F0EB Warm Cream */
    --muted-foreground: 25 5% 45%;    /* #78716C */

    /* === Primary (Emerald Green) === */
    --primary: 162 95% 30%;           /* #059669 */
    --primary-foreground: 0 0% 100%;  /* #FFFFFF */

    /* === Secondary (Rich Gold) === */
    --secondary: 39 58% 58%;          /* #D4A853 */
    --secondary-foreground: 0 0% 100%;/* #FFFFFF */

    /* === Accent (Terracotta) === */
    --accent: 20 48% 53%;             /* #C2724B */
    --accent-foreground: 0 0% 100%;   /* #FFFFFF */

    /* === Destructive === */
    --destructive: 0 72% 51%;         /* #DC2626 */
    --destructive-foreground: 0 0% 100%;

    /* === Border === */
    --border: 24 6% 91%;              /* #E7E5E4 Stone */
    --input: 24 6% 91%;               /* #E7E5E4 */
    --ring: 162 95% 30%;              /* #059669 Focus ring */

    /* === Radius === */
    --radius: 0.75rem;                /* 12px base */

    /* === Sidebar === */
    --sidebar-background: 30 18% 94%; /* #F5F0EB */
    --sidebar-foreground: 24 10% 10%;
    --sidebar-primary: 162 95% 30%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 30 18% 90%;
    --sidebar-accent-foreground: 24 10% 10%;
    --sidebar-border: 24 6% 91%;

    /* === Chart colors === */
    --chart-1: 162 95% 30%;           /* Emerald */
    --chart-2: 39 58% 58%;            /* Gold */
    --chart-3: 20 48% 53%;            /* Terracotta */
    --chart-4: 142 71% 45%;           /* Success Green */
    --chart-5: 24 95% 53%;            /* Warning Orange */

    /* === Custom tokens === */
    --shadow-warm: rgba(28, 25, 23, 0.06);
    --gold: 39 58% 58%;
    --gold-light: 48 100% 95%;
  }
}
```

---

## Mockupy referencyjne

Mockupy wizualne znajdują się w folderze `docs/design/assets/`:

- `mockup-landing-page.png` — układ landing page
- `mockup-dashboard.png` — układ panelu dashboard

> **Uwaga**: Jeśli brakuje plików graficznych, można je wygenerować ponownie na podstawie opisu powyżej. Kluczowe elementy to:
> - Landing: jasne tło biało-kremowe, emerald green CTA, grid zdjęć nieruchomości, feature cards
> - Dashboard: sidebar cream #F5F0EB, stat cards na górze, tabela ofert, wykres bar chart, zaokrąglone karty

---

## Zasady implementacji

1. **Nigdy nie używaj czystych kolorów** (red, blue, green) — zawsze używaj zdefiniowanych tokenów
2. **Cienie zawsze z ciepłym odcieniem** — `rgba(28, 25, 23, ...)` zamiast `rgba(0, 0, 0, ...)`
3. **Border-radius minimum 6px** — unikaj ostrych krawędzi
4. **Każdy interaktywny element ma hover state** — karty, przyciski, linki, wiersze tabeli
5. **Skeleton loading zamiast spinnerów** — konsekwentnie w całej aplikacji
6. **Zdjęcia nieruchomości z aspect-ratio** — `16:10` lub `4:3` w gridach, `16:9` w hero
7. **Fonty ładowane przez Google Fonts** — `Outfit` + `Inter` + `JetBrains Mono`
8. **Mobile-first** — style bazowe dla mobile, rozszerzane media queries dla większych ekranów
