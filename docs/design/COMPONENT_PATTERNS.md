# EstateFlow — Wzorce komponentów

Dokument opisuje wzorce implementacji kluczowych komponentów UI aplikacji EstateFlow. Wszystkie komponenty bazują na **shadcn/ui** z customowym theme „Light Luxury Warm" (Koncept B).

## Spis treści

- [Layout Dashboard](#layout-dashboard)
- [Landing Page — Hero Section](#landing-page--hero-section)
- [Karta nieruchomości (Listing Card)](#karta-nieruchomości-listing-card)
- [Stat Card (metryka)](#stat-card-metryka)
- [Data Table z filtrami](#data-table-z-filtrami)
- [Formularz oferty](#formularz-oferty)
- [Profil klienta](#profil-klienta)
- [Kalendarz spotkań](#kalendarz-spotkań)
- [Command Palette (⌘+K)](#command-palette-k)
- [Toast / Notification](#toast--notification)

---

## Layout Dashboard

```
┌─────────────────────────────────────────┐
│ Sidebar (260px)  │    Top Bar (64px)    │
│                  ├──────────────────────│
│ Logo             │  Search   Bell User  │
│ ─────────        ├──────────────────────│
│ Dashboard ●      │                      │
│ Oferty           │   Main Content       │
│ Klienci          │   (scrollable)       │
│ Kalendarz        │                      │
│ Raporty          │                      │
│ ─────────        │                      │
│ Ustawienia       │                      │
│                  │                      │
│ [User Avatar]    │                      │
│ [Nazwa użytk.]   │                      │
└──────────────────┴──────────────────────┘
```

### Wzorzec kodu (layout.tsx)

```tsx
// apps/web/src/app/(dashboard)/layout.tsx
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 flex flex-col min-h-svh">
        <header className="flex items-center justify-between h-16 px-6 border-b border-stone-200">
          <SidebarTrigger />
          <div className="flex items-center gap-4">
            {/* Search, Notifications, User menu */}
          </div>
        </header>
        <div className="flex-1 p-6 bg-[#FAFAF9]">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
```

---

## Landing Page — Hero Section

### Struktura

```
┌─────────────────────────────────────────────────┐
│ Nav: Logo | Funkcje  Cennik  O nas  Blog | CTA  │
├─────────────────────────────────────────────────┤
│                                                  │
│  [Heading]                    ┌───┬───┐          │
│  Usprawnij swoją              │   │   │          │
│  pracę jako agent             ├───┤   │          │
│  nieruchomości                │   │   │          │
│                               ├───┼───┤          │
│  [Opis tekst]                 │   │   │          │
│                               └───┴───┘          │
│  [CTA Button]  [Secondary]     (Photo Grid)      │
│                                                  │
├─────────────────────────────────────────────────┤
│  Feature Cards: ┌──┐ ┌──┐ ┌──┐ ┌──┐             │
│                 └──┘ └──┘ └──┘ └──┘              │
└─────────────────────────────────────────────────┘
```

### Klasy CSS hero

```css
.hero {
  background: linear-gradient(180deg, #FAFAF9 0%, #F5F0EB 100%);
  padding: 80px 0 96px;
}

.hero-heading {
  font-family: 'Outfit', sans-serif;
  font-size: 3rem;          /* 48px */
  font-weight: 700;
  line-height: 1.1;
  color: #1C1917;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 1.125rem;      /* 18px */
  color: #78716C;
  line-height: 1.6;
  max-width: 480px;
}

.hero-cta-primary {
  background: #059669;
  color: white;
  padding: 14px 32px;
  border-radius: 24px;      /* Pill shape */
  font-weight: 600;
  font-size: 1rem;
  transition: background 150ms ease;
}

.hero-cta-primary:hover {
  background: #047857;
}

.hero-cta-secondary {
  background: transparent;
  color: #D4A853;
  border: 2px solid #D4A853;
  padding: 12px 32px;
  border-radius: 24px;
  font-weight: 600;
  transition: all 150ms ease;
}

.hero-cta-secondary:hover {
  background: #FFF9E6;
}
```

### Photo Grid (hero)

- Layout: CSS Grid `2×3` lub `3×3`
- Zdjęcia z `border-radius: 12px`
- `object-fit: cover`
- Hover: `transform: scale(1.05)` w `300ms` z `overflow: hidden`

---

## Karta nieruchomości (Listing Card)

```
┌─────────────────────────────────┐
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │       Zdjęcie (16:10)       │ │
│ │                             │ │
│ │  [Badge: Premium ★]        │ │
│ └─────────────────────────────┘ │
│                                 │
│ ul. Marszałkowska 15, Warszawa  │
│ Mieszkanie • 72 m²              │
│                                 │
│ 850 000 PLN                     │
│                                 │
│ 🏠 3 pokoje  🛁 2 łazienki     │
│                                 │
│ [Badge: Aktywna]    [→ Szczeg.] │
└─────────────────────────────────┘
```

### Specyfikacja

```tsx
interface ListingCardProps {
  id: string;
  photo: string;           // URL zdjęcia
  title: string;           // Adres
  type: string;            // Mieszkanie, Dom, Lokal
  area: number;            // m²
  price: number;           // PLN
  rooms: number;
  bathrooms: number;
  status: 'active' | 'premium' | 'sold' | 'pending' | 'new';
  isPremium?: boolean;
}
```

### Style karty

```css
.listing-card {
  background: #FFFFFF;
  border: 1px solid #E7E5E4;
  border-radius: 12px;
  overflow: hidden;
  transition: all 200ms ease;
}

.listing-card:hover {
  box-shadow: 0 10px 25px -5px rgba(28, 25, 23, 0.1),
              0 4px 6px -2px rgba(28, 25, 23, 0.05);
  border-color: #D6D3D1;
  transform: scale(1.02);
}

.listing-card__image {
  aspect-ratio: 16 / 10;
  object-fit: cover;
  width: 100%;
}

.listing-card__price {
  font-family: 'Outfit', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1C1917;
}

.listing-card__address {
  font-size: 0.875rem;
  color: #44403C;
  font-weight: 500;
}

.listing-card__meta {
  font-size: 0.75rem;
  color: #78716C;
}
```

---

## Stat Card (metryka)

```
┌────────────────────────┐
│  [Icon]                │
│                        │
│  24                    │
│  Aktywne oferty        │
│                        │
│  ↑ 12% vs. ub. mies.  │
└────────────────────────┘
```

### Specyfikacja

```tsx
interface StatCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  change?: {
    value: number;      // procent
    direction: 'up' | 'down';
  };
  iconBgColor?: string;  // np. 'bg-emerald-50'
  iconColor?: string;    // np. 'text-emerald-600'
}
```

### Warianty ikonowych tł

| Metryka | Icon BG | Icon Color |
|---------|---------|------------|
| Aktywne oferty | `#ECFDF5` | `#059669` |
| Nowi klienci | `#FFF9E6` | `#D4A853` |
| Spotkania | `#EFF6FF` | `#2563EB` |
| Przychód | `#FEF2F2` | `#DC2626` |

---

## Data Table z filtrami

### Struktura

```
┌─────────────────────────────────────────────────┐
│  Filtry: [Status ▾]  [Typ ▾]  [Cena min-max]   │
│          [🔍 Szukaj...]              [+ Dodaj]   │
├─────────────────────────────────────────────────┤
│  📷 │ Adres          │ Typ        │ Cena    │ St │
│─────┼────────────────┼────────────┼─────────┼────│
│  🏠 │ ul. Marsz. 15  │ Mieszkanie │ 850k    │ ● │
│  🏠 │ ul. Mokot. 22  │ Dom        │ 1.2M    │ ★ │
│  🏠 │ al. Ujazdow.  │ Lokal      │ 450k    │ ○  │
├─────────────────────────────────────────────────┤
│  ◀ Strona 1 z 5 ▶                   10 / strona │
└─────────────────────────────────────────────────┘
```

### Użycie shadcn DataTable

Komponent bazowy: `@tanstack/react-table` + shadcn/ui `Table`.

Filtrowanie:
- Select (status, typ) — shadcn `Select`
- Input szukaj — shadcn `Input` z ikoną `Search`
- Range cena — shadcn `Slider` lub dwa `Input`
- Button dodaj — shadcn `Button` primary

Paginacja:
- shadcn `Pagination`
- 10 / 25 / 50 na stronę

---

## Formularz oferty

### Pola formularza

| Pole | Typ | Walidacja |
|------|-----|-----------|
| Tytuł | `Input` | required, min 5 znaków |
| Opis | `Textarea` | required, min 20 znaków |
| Typ nieruchomości | `Select` | required (Mieszkanie/Dom/Lokal/Działka) |
| Adres | `Input` | required |
| Miasto | `Input` | required |
| Kod pocztowy | `Input` | pattern: XX-XXX |
| Cena (PLN) | `Input[type=number]` | required, min 0 |
| Powierzchnia (m²) | `Input[type=number]` | required, min 1 |
| Pokoje | `Input[type=number]` | min 0 |
| Łazienki | `Input[type=number]` | min 0 |
| Piętro | `Input[type=number]` | — |
| Rok budowy | `Input[type=number]` | 1900-2030 |
| Zdjęcia | `FileUpload` (drag & drop) | max 20, max 10MB każde |
| Status | `Select` | required (Aktywna/Oczekująca/Sprzedana) |
| Notatki | `Textarea` | opcjonalne |

### Layout formularza

- 2-kolumnowy grid na desktop (pola obok siebie)
- 1-kolumnowy na mobile
- Sekcje z headerami: Podstawowe, Adres, Szczegóły, Zdjęcia, Status
- Sticky footer z przyciskami Zapisz / Anuluj

---

## Profil klienta

```
┌───────────────────────────────────────────────┐
│  [Avatar]  Jan Kowalski                       │
│            📧 jan@email.com                   │
│            📱 +48 123 456 789                 │
│            [Badge: Aktywny klient]            │
│                                               │
│  ═══════════════════════════════════════════  │
│                                               │
│  Tabs: Oferty (3) | Spotkania (5) | Notatki  │
│  ──────────────────────────────────────────   │
│                                               │
│  [Lista powiązanych ofert / spotkań]          │
│                                               │
│  ═══════════════════════════════════════════  │
│  Timeline:                                    │
│  • 12.03 — Spotkanie oglądanie mieszkania     │
│  • 10.03 — Wysłano 3 oferty                  │
│  • 08.03 — Pierwszy kontakt (telefon)         │
└───────────────────────────────────────────────┘
```

---

## Kalendarz spotkań

- Komponent bazowy: shadcn `Calendar` + custom full-calendar view
- Widoki: dzień / tydzień / miesiąc
- Spotkania jako kolorowe bloki:
  - Oglądanie: `#059669` (primary emerald)
  - Negocjacje: `#D4A853` (gold)
  - Podpisanie: `#2563EB` (info blue)
  - Inne: `#78716C` (muted)
- Kliknięcie na spotkanie → Sheet/Dialog ze szczegółami
- Drag & drop do przesuwania spotkań

---

## Command Palette (⌘+K)

- Komponent bazowy: shadcn `Command`
- Skrót: `⌘+K` (Mac) / `Ctrl+K` (Windows)
- Akcje:
  - Szukaj ofertę po adresie
  - Szukaj klienta po nazwisku
  - Przejdź do strony (Dashboard, Oferty, etc.)
  - Dodaj nową ofertę
  - Dodaj nowego klienta
  - Przejdź do ustawień

---

## Toast / Notification

### Warianty

| Typ | Icon | Border-left color | Przykład |
|-----|------|------------------|---------|
| Success | `CheckCircle` | `#16A34A` | „Oferta została zapisana" |
| Error | `XCircle` | `#DC2626` | „Nie udało się zapisać" |
| Warning | `AlertTriangle` | `#EA580C` | „Brak zdjęć oferty" |
| Info | `Info` | `#2563EB` | „Nowe spotkanie za 15 min" |

### Zachowanie

- Pojawia się z prawej strony (top-right)
- Auto-dismiss po `5000ms`
- Progress bar na dole (opcjonalnie)
- Kliknięcie → dismiss
- Max 3 toasty jednocześnie (stacking)
