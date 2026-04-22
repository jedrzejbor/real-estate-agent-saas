# Copilot i wytyczne tworzenia kodu

Cel: centralne miejsce z zasadami, przykładami i oczekiwaniami dotyczącymi tworzenia kodu, które będzie czytelne dla programistów i pomocne, gdy Copilot podpowiada zmiany.

Zakres:
- Styl TypeScript/NestJS/Next.js używany w repozytorium.
- Konwencje nazw, struktura modułów, testy, PR/commit messages.
- Zasady bezpieczeństwa i prywatności (nie ujawniać sekretów).

1. Zasady ogólne
- Przestrzegaj istniejącej struktury projektu i konwencji (szczególnie w `apps/api` i `apps/web`).
- Preferuj jawne typy — unikaj `any` bez uzasadnienia.
- Małe, atomowe commity; commit message zgodny z konwencją: `scope: krótkie-opis` (np. `auth: fix user resolver`).

2. Backend (NestJS)
- Kontrolery powinny być cienkie — logika biznesowa w serwisach.
- Używaj DTO z `class-validator` i `class-transformer` dla inputów.
- Repozytoria TypeORM — stosuj relacje i `relations` tylko kiedy potrzebne.
- Obsługa błędów: używaj wyjątków Nest (`NotFoundException`, `BadRequestException`).

3. Frontend (Next.js / React)
- Preferuj komponenty funkcyjne i hooki.
- Stosuj istniejące wzorce komponentów i style z `apps/web/src/components`.
- Dla routingu wewnętrznego używaj linków w postaci `/dashboard/...`.

4. Testy
- Nowe funkcjonalności powinny mieć testy jednostkowe (backend) i/lub komponentowe (frontend).
- Uruchamiaj `pnpm --filter <package> test` przed PR.

5. Bezpieczeństwo & sekrety
- Nigdy nie commituj sekretów ani credentiali. Zamiast tego użyj env vars i dokumentacji w `docs/LOCAL_SETUP.md`.

6. PR i commit
- Commit: krótki temat + dodatkowy opis w ciele commit gdy potrzeba.
- PR: opis problemu, co zmieniono, jak sprawdzić lokalnie, lista zależności.

7. Przykłady
- Commit message: `notifications: add docs/NOTIFICATIONS.md`
- PR opis:
  - Cel: Dodanie dokumentacji powiadomień
  - Zmiany: `docs/NOTIFICATIONS.md` (nowy plik)
  - Jak przetestować: `pnpm --filter api test` i manualne sprawdzenie endpointu `GET /notifications`

8. Jak aktualizować ten plik
- Zaktualizuj sekcję odpowiadającą dotkniętemu obszarowi kodu i dodaj przykłady.
- Dobrą praktyką jest dodać referencję do plików źródłowych (np. `apps/api/src/notifications/notifications.service.ts`).

9. Użycie z Copilot
- Umieszczając ten plik w repozytorium, Copilot (oraz inni deweloperzy) mogą odczytać wytyczne i proponować zgodne ze stylem rozwiązania.
- Jeżeli chcesz, Copilot może automatycznie proponować uzupełnienia commitów lub PR opisów na podstawie tych reguł.

---
Aktualizuj ten dokument gdy przyjmiesz nowe reguły lub standardy kodowania.
