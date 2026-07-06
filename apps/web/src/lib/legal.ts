import {
  APP_ABUSE_EMAIL,
  APP_LEGAL_EMAIL,
  APP_NAME,
  APP_SUPPORT_EMAIL,
} from './brand';

export const LEGAL_LINKS = {
  terms: '/regulamin',
  privacy: '/polityka-prywatnosci',
  cookies: '/polityka-cookies',
  publicationRules: '/zasady-publikacji',
} as const;

export const LEGAL_META = {
  version: 'MVP-2026-05-03',
  effectiveDate: '2026-05-03',
  contactEmail: APP_LEGAL_EMAIL,
  abuseEmail: APP_ABUSE_EMAIL,
  supportEmail: APP_SUPPORT_EMAIL,
} as const;

export const LEGAL_RETENTION = {
  publicLeads:
    'Leady z formularzy publicznych powinny być przechowywane przez okres potrzebny do obsługi zapytania i relacji handlowej, a następnie zgodnie z decyzją administratora danych.',
  publicSubmissions:
    'Nieprzejęte publiczne zgłoszenia ofert i tymczasowe zdjęcia powinny zostać usunięte po zakończeniu okresu weryfikacji albo po decyzji operacyjnej zespołu.',
  analytics:
    'Eventy techniczne i analityczne powinny być przechowywane w formie ograniczonej do celów bezpieczeństwa, diagnostyki i pomiaru produktu.',
} as const;

export const LEGAL_COPY = {
  dataController:
    `Administratorem danych przekazanych przez formularz jest agent lub biuro obsługujące ofertę albo profil. ${APP_NAME} działa jako dostawca narzędzia do obsługi zgłoszeń.`,
  responsePurpose:
    'Dane są przetwarzane w celu obsługi zapytania, kontaktu zwrotnego oraz zabezpieczenia formularza przed nadużyciami.',
  publicationConsent:
    'Potwierdzam, że mam prawo do publikacji treści, zdjęć i danych oferty oraz akceptuję zasady publikacji ofert.',
  publicListingContactConsent:
    'Wyrażam zgodę na kontakt w sprawie tej oferty nieruchomości oraz przetwarzanie moich danych w celu obsługi zapytania.',
  publicProfileContactConsent:
    'Wyrażam zgodę na kontakt ze strony agenta lub biura nieruchomości oraz przetwarzanie moich danych w celu obsługi zapytania.',
  marketingConsent:
    'Chcę otrzymywać informacje o podobnych ofertach lub usługach. Zgodę mogę wycofać w dowolnym momencie.',
  rightsContact:
    `W sprawach prywatności, usunięcia danych lub publicznej oferty można skontaktować się z administratorem danych albo pomocniczo z ${APP_NAME}.`,
  abuseProcedure:
    'Zgłoszenia nadużyć są weryfikowane operacyjnie. Oferta może zostać ograniczona, wycofana albo przekazana do dalszej obsługi, jeśli narusza zasady publikacji.',
} as const;
