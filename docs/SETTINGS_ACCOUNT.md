# Ustawienia konta

## Plan wdrożenia

1. Backend profilu i hasła.
2. Backend dezaktywacji konta z blokadą admina.
3. Frontend klient API + odświeżanie użytkownika w `AuthContext`.
4. Przebudowa `/dashboard/settings`.
5. Testy i weryfikacja.

## Status

### 1. Backend profilu i hasła

Status: zrobione.

- `PATCH /api/auth/me/profile`
- `POST /api/auth/me/change-password`
- DTO profilu i zmiany hasła
- testy jednostkowe `AuthService`

### 2. Backend dezaktywacji konta z blokadą admina

Status: zrobione.

- dodano `DELETE /api/auth/me`,
- wymagane jest hasło użytkownika,
- wymagane jest potwierdzenie tekstem `USUŃ KONTO`,
- konta z rolą `admin` są blokowane przed self-service dezaktywacją,
- zwykły użytkownik jest dezaktywowany przez `UsersService.deactivate`,
- dodano testy jednostkowe dla sukcesu, błędnego hasła i blokady admina.
