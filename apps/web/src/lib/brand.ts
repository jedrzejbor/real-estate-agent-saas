export const APP_BRAND = {
  name: 'PodAdresem',
  previousName: 'EstateFlow',
  legalName: 'PodAdresem',
  domain: 'podadresem.pl',
  emails: {
    contact: 'kontakt@podadresem.pl',
    legal: 'legal@podadresem.pl',
    abuse: 'abuse@podadresem.pl',
    support: 'support@podadresem.pl',
  },
} as const;

export const APP_NAME = APP_BRAND.name;
export const APP_LEGAL_NAME = APP_BRAND.legalName;
export const APP_DOMAIN = APP_BRAND.domain;
export const APP_CONTACT_EMAIL = APP_BRAND.emails.contact;
export const APP_LEGAL_EMAIL = APP_BRAND.emails.legal;
export const APP_ABUSE_EMAIL = APP_BRAND.emails.abuse;
export const APP_SUPPORT_EMAIL = APP_BRAND.emails.support;
