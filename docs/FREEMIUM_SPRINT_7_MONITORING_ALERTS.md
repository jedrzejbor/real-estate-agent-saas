# Freemium Sprint 7 - monitoring i alerty dla kluczowych flow

Data analizy: 2026-05-03

## Decyzja

`F7.3` jest domknięte dla MVP. Aplikacja ma teraz wspólny backendowy monitoring dla kluczowych publicznych flow freemium oraz minimalne alerty progowe oparte o logi aplikacyjne.

To nie zastępuje produkcyjnego APM, ale daje bezpieczny punkt startowy: zdarzenia są strukturalne, dane osobowe są odfiltrowywane, a progi można konfigurować bez zmiany kodu.

## Co monitorujemy

- Publikacja oferty:
  - sukces `listing_published`,
  - błąd `publish_failed`.
- Wyłączenie publikacji:
  - sukces `listing_unpublished`,
  - błąd `unpublish_failed`.
- Formularz leada z publicznej oferty:
  - sukces `lead_captured`,
  - błąd `lead_capture_failed`.
- Formularz leada z publicznego profilu agenta:
  - sukces `lead_captured`,
  - błąd `lead_capture_failed`.
- Publiczny wizard dodania oferty:
  - sukces `submission_created`,
  - błąd `submission_create_failed`.
- Upload zdjęć w publicznym wizardzie:
  - sukces `images_uploaded`,
  - błąd `image_upload_failed`.
- Ponowna wysyłka weryfikacji:
  - sukces `verification_resent`,
  - błąd `verification_resend_failed`.
- Weryfikacja publicznego zgłoszenia:
  - sukces `submission_verified`,
  - ostrzeżenie `verification_expired`,
  - błąd `verification_failed`.
- Claim flow:
  - sukces `submission_claimed`,
  - błąd `claim_failed`.
- Public analytics:
  - błąd `event_track_failed`,
  - zdarzenie abuse `abuse_reported`.

## Alerty

Alerty są generowane jako `Logger.warn()` z payloadem `alert = freemium_flow_threshold`, kiedy liczba ostrzeżeń albo błędów dla danego flow przekroczy próg w oknie czasowym.

Zmienne środowiskowe:

- `MONITORING_WINDOW_MS` - długość okna alertowego, domyślnie `300000` ms.
- `MONITORING_FAILURE_ALERT_THRESHOLD` - próg błędów, domyślnie `5`.
- `MONITORING_WARNING_ALERT_THRESHOLD` - próg ostrzeżeń, domyślnie `10`.

## Ochrona danych

Monitoring nie powinien logować danych osobowych z publicznych formularzy. Centralny `MonitoringService` odfiltrowuje pola takie jak email, telefon, imię i nazwisko, wiadomość, tokeny, `ipHash` oraz `userAgent`.

Do logów trafiają identyfikatory techniczne, statusy, slug oferty, liczby plików, rozmiary uploadów, powody moderacji i typ błędu.

## Ograniczenia MVP

- Liczniki alertów są trzymane w pamięci procesu, więc w środowisku wieloinstancyjnym alerty będą liczone per instancja.
- Alerty są logowe, bez bezpośredniej integracji ze Slackiem, PagerDuty, Sentry albo Datadog.
- Nie ma jeszcze osobnego monitoringu drop-offów po stronie frontendu dla każdego kroku onboardingowego.

## Rekomendacja produkcyjna

Przed szerszym rolloutem warto podpiąć te same zdarzenia do trwałego narzędzia obserwowalności:

- Sentry albo OpenTelemetry dla wyjątków i tracingu,
- Datadog / Grafana / CloudWatch dla metryk progowych,
- osobny funnel analytics dla onboarding drop-offs i wizard step drop-offs,
- alert do kanału operacyjnego dla `publish_failed`, `lead_capture_failed`, `claim_failed` i `image_upload_failed`.
