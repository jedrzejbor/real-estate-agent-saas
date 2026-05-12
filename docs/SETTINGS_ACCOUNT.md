Tak. Najsensowniej zrobić to jako rozbudowę obecnego `/dashboard/settings`, ale z podziałem na sekcje albo taby, bo teraz ta strona jest faktycznie stroną „Plan i limity”, nie pełnymi ustawieniami konta.

**Proponowany zakres**
1. **Profil użytkownika**
- Edycja imienia i nazwiska, bo w systemie „nazwa użytkownika” obecnie wynika z `agent.firstName` + `agent.lastName`.
- Opcjonalnie telefon i numer licencji, bo pola już istnieją w `Agent`.
- Po zapisie odświeżenie `AuthContext.user`, żeby topbar/sidebar od razu pokazały nowe dane.

2. **Zmiana hasła**
- Formularz:
  - obecne hasło,
  - nowe hasło,
  - powtórz nowe hasło.
- Walidacja taka sama jak przy rejestracji: minimum 8 znaków, wielka litera, mała litera, cyfra.
- Backend musi porównać obecne hasło przez bcrypt i zapisać nowy hash.
- Po zmianie hasła nie wylogowywałbym użytkownika automatycznie, ale można pokazać komunikat „hasło zmienione”.

3. **Plan i limity**
- Zachować obecny content, bo jest już rozbudowany.
- Dodać wyraźny button:
  - `Zmień plan` / `Przejdź do upgrade`
  - link do `/dashboard/upgrade`
- Pokazać:
  - obecny plan,
  - status subskrypcji,
  - najważniejsze limity,
  - warning, jeśli któryś limit jest blisko końca.

4. **Usunięcie/dezaktywacja konta**
- Tylko dla użytkowników poza `admin`.
- Technicznie zacząłbym od **dezaktywacji konta**, bo `UsersService.deactivate()` już istnieje.
- W UI:
  - osobna sekcja „Strefa ryzyka”,
  - wymagane wpisanie np. `USUŃ KONTO`,
  - wymagane hasło,
  - jasny komunikat, że konto zostanie dezaktywowane i użytkownik straci dostęp.
- Po sukcesie:
  - wyczyścić tokeny,
  - przekierować na `/login`.
- Admin nie widzi tej akcji albo widzi disabled komunikat: „Konto administratora nie może zostać usunięte z poziomu aplikacji”.

**Backend zadania**
1. Dodać DTO:
- `UpdateMyProfileDto`
- `ChangePasswordDto`
- `DeactivateMyAccountDto`

2. Dodać endpointy, najlepiej w `AuthController` albo nowym `AccountController`:
- `PATCH /api/auth/me/profile`
- `POST /api/auth/me/change-password`
- `DELETE /api/auth/me`

3. Dodać metody w `UsersService`:
- `updateProfile(userId, dto)`
- `changePassword(userId, currentPassword, newPassword)`
- `deactivateSelf(userId, password)` z blokadą dla `admin`

4. Dodać testy:
- aktualizacja profilu zapisuje `Agent.firstName/lastName`
- zmiana hasła odrzuca błędne obecne hasło
- zmiana hasła zapisuje nowy hash
- dezaktywacja blokuje admina
- dezaktywacja zwykłego użytkownika ustawia `isActive=false`

**Frontend zadania**
1. Przebudować `/dashboard/settings` na sekcje:
- `Konto`
- `Bezpieczeństwo`
- `Plan`
- `Strefa ryzyka`

2. Dodać klienta API w `apps/web/src/lib/auth.ts` albo osobnym `account.ts`:
- `updateMyProfile`
- `changeMyPassword`
- `deactivateMyAccount`

3. Rozszerzyć `AuthContext`:
- dodać `refreshUser()` albo `updateUser(profile)` po zapisie profilu.
- To ważne, żeby po zmianie imienia/nazwiska topbar od razu się zaktualizował.

4. UI:
- osobne formularze, każdy z własnym loading/error state
- toasty sukcesu/błędu
- walidacja po stronie klienta przez `zod`
- button upgrade w sekcji planu

**Dodatkowo bym rozważył**
- Zmiana emaila, ale nie robiłbym jej teraz bez flow potwierdzenia emaila.
- Historia aktywności/logowań: przydatne, ale osobny etap.
- Eksport danych przed usunięciem konta: sensowne później, zwłaszcza przed produkcją.
- Rozróżnienie „dezaktywuj konto” vs „usuń dane permanentnie”: teraz bezpieczniej zrobić dezaktywację.

**Proponowana kolejność**
1. Backend profilu i hasła.
2. Backend dezaktywacji konta z blokadą admina.
3. Frontend klient API + `AuthContext.refreshUser`.
4. Przebudowa `/dashboard/settings`.
5. Testy backendu.
6. Type-check web/api i scoped lint UI.