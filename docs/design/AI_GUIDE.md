# EstateFlow — AI Development Guide

> Ten dokument służy jako instrukcja dla AI asystentów kodowania (Copilot, Cursor, Claude, Gemini, itp.), aby konsekwentnie implementowały UI EstateFlow zgodnie z wybranym design systemem.

## ⚡ Quick Reference

| Aspekt | Wartość |
|--------|---------|
| **Design** | Koncept B: Light Luxury Warm |
| **Wrażenie** | Ciepło, elegancja, przystępność |
| **Stack** | Next.js 16 + shadcn/ui + Tailwind CSS 4 |
| **UI Library** | shadcn/ui (base-nova) |
| **Monorepo** | Turborepo + pnpm |
| **Backend** | NestJS 11 + TypeORM + PostgreSQL 16 |
| **Język UI** | Polski (interfejs) |
| **Font headings** | Outfit (Google Fonts) |
| **Font body** | Inter (Google Fonts) |
| **Font mono** | JetBrains Mono |
| **Primary color** | Emerald Green `#059669` |
| **Secondary color** | Rich Gold `#D4A853` |
| **Background** | Warm White `#FAFAF9` |
| **Cards** | Pure White `#FFFFFF` |
| **Sidebar** | Warm Cream `#F5F0EB` |
| **Border radius** | 12px (default), 6px (sm), 16px (xl) |
| **Shadows** | Ciepły odcień stone, nie czysta czerń |
| **Ikony** | lucide-react |

---

## 📁 Pliki do przeczytania PRZED rozpoczęciem pracy

1. **`docs/design/DESIGN_SYSTEM.md`** — pełna specyfikacja kolorów, typografii, spacingu, CSS variables
2. **`docs/design/COMPONENT_PATTERNS.md`** — wzorce komponentów z wireframe'ami i kodem
3. **`docs/design/AI_GUIDE.md`** — ten dokument (quick reference i zasady)
4. **`README.md`** — ogólny opis projektu i komendy

---

## 🎨 Zasady designu — OBOWIĄZKOWE

### Kolory

```
✅ TAK:
- background: #FAFAF9 (warm white)
- karty: #FFFFFF z border #E7E5E4
- primary CTA: #059669 (emerald green)
- akcenty premium: #D4A853 (gold)
- tekst główny: #1C1917 (dark warm)
- tekst muted: #78716C

❌ NIE:
- czyste kolory: red, blue, green, black, gray
- zimne odcienie szarości (#808080, #cccccc)
- czysto czarne tło lub elementy
- neonowe, krzykliwe kolory
```

### Typografia

```
✅ TAK:
- Headings: font-family: 'Outfit', sans-serif
- Body: font-family: 'Inter', sans-serif
- Monospace: font-family: 'JetBrains Mono', monospace
- Headings: Bold (700) lub Semi-bold (600)
- Body: Regular (400) lub Medium (500)

❌ NIE:
- system-ui, Arial, Helvetica jako primary font
- font-weight poniżej 400 (thin, light)
- headingi w Interze (używaj Outfit)
```

### Cienie

```
✅ TAK:
- rgba(28, 25, 23, 0.06) — ciepły odcień
- Wielowarstwowe cienie (dwa box-shadow)
- Hover state z silniejszym cieniem

❌ NIE:
- rgba(0, 0, 0, ...) — czysty czarny cień
- Pojedynczy twardy cień
- Brak cienia na kartach
```

### Border Radius

```
✅ TAK:
- Karty: 12px
- Inputy: 8px
- Badge: 6px
- CTA buttons: 24px (pill)
- Ikony: 8px
- Avatar: 9999px (full)

❌ NIE:
- Ostre krawędzie (0px radius)
- Radius 2-4px (zbyt mały)
- Niespójne zaokrąglenia
```

---

## 🏗️ Wzorce implementacji

### Tworzenie nowego widoku dashboard

```tsx
// 1. Zawsze wewnątrz (dashboard) route group
// 2. Używaj Page Header pattern
// 3. Grid layout z gap-6

export default function MyPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit text-2xl font-semibold text-stone-900">
            Tytuł strony
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Opis strony
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj nowy
        </Button>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} value={24} label="Aktywne oferty" />
        {/* ... */}
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Sekcja</CardTitle>
        </CardHeader>
        <CardContent>
          {/* content */}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Tworzenie komponentu shadcn/ui z custom theme

Przy dodawaniu nowych komponentów shadcn/ui:

```bash
# Dodaj komponent
npx shadcn@latest add button

# Komponent automatycznie użyje CSS variables z globals.css
# Nie trzeba modyfikować kolorów w komponencie
```

### Import fontów (layout.tsx)

```tsx
// apps/web/src/app/layout.tsx
import { Outfit, Inter } from 'next/font/google';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${outfit.variable} ${inter.variable}`}>
      <body className="font-inter antialiased bg-[#FAFAF9] text-stone-900">
        {children}
      </body>
    </html>
  );
}
```

### Tailwind config — custom kolory

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      fontFamily: {
        outfit: ['var(--font-outfit)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        brand: {
          emerald: '#059669',
          'emerald-dark': '#047857',
          'emerald-light': '#ECFDF5',
          gold: '#D4A853',
          'gold-dark': '#B8922F',
          'gold-light': '#FFF9E6',
          terracotta: '#C2724B',
        },
        warm: {
          white: '#FAFAF9',
          cream: '#F5F0EB',
          text: '#1C1917',
          'text-secondary': '#44403C',
          'text-muted': '#78716C',
        },
      },
    },
  },
};
```

---

## 📐 Struktura folderów frontendu

```
apps/web/src/
├── app/
│   ├── (marketing)/          ← Publiczna strona (landing, cennik)
│   │   └── layout.tsx        ← Light theme, nawigacja top
│   ├── (auth)/               ← Login, rejestracja
│   │   └── layout.tsx        ← Centered layout
│   ├── (dashboard)/          ← Panel agenta (wymaga auth)
│   │   └── layout.tsx        ← Sidebar + topbar layout
│   ├── globals.css           ← CSS variables z design system
│   └── layout.tsx            ← Root (fonty, metadata)
├── components/
│   ├── ui/                   ← shadcn/ui components
│   ├── app-sidebar.tsx       ← Sidebar dashboard
│   ├── stat-card.tsx         ← Karta metryki
│   ├── listing-card.tsx      ← Karta nieruchomości
│   └── ...
├── lib/
│   └── utils.ts              ← cn() helper, formatery
└── hooks/
    └── ...
```

---

## 🌐 Konwencja nazw — język

| Co | Język | Przykład |
|----|-------|---------|
| **Kod** (zmienne, funkcje, komponenty) | Angielski | `ListingCard`, `useClients` |
| **UI tekst** (przyciski, labele, opisy) | Polski | `Zapisz`, `Nowa oferta`, `Klienci` |
| **Komentarze w kodzie** | Angielski | `// Fetch listings from API` |
| **Git commits** | Angielski | `feat: add listing card` |
| **Dokumentacja** | Polski | Ten dokument |

---

## ✅ Checklist przed commitem

- [ ] Kolory zgodne z paletą (sprawdź DESIGN_SYSTEM.md)
- [ ] Font headingów to Outfit, font body to Inter
- [ ] Border-radius minimum 6px
- [ ] Cienie z ciepłym odcieniem (nie `rgba(0,0,0,...)`
- [ ] Hover state na wszystkich klikalnych elementach
- [ ] Responsywność: sprawdź mobile + tablet + desktop
- [ ] Loading states: skeleton, nie spinner
- [ ] Accessibility: aria-label na icon buttons, focusable elements
- [ ] Tekst UI w języku polskim
- [ ] Kod / zmienne w języku angielskim

---

## 🔗 Przydatne linki

- [shadcn/ui Docs](https://ui.shadcn.com/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Lucide Icons](https://lucide.dev/icons)
- [Google Fonts — Outfit](https://fonts.google.com/specimen/Outfit)
- [Google Fonts — Inter](https://fonts.google.com/specimen/Inter)
