import type { Metadata } from 'next';
import Script from 'next/script';
import { CookieConsentManager } from '@/components/legal';
import { AuthProvider } from '@/contexts/auth-context';
import { ConfirmProvider } from '@/contexts/confirm-context';
import { CookieConsentProvider } from '@/contexts/cookie-consent-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { ToastProvider } from '@/contexts/toast-context';
import { APP_NAME } from '@/lib/brand';
import './globals.css';

const themeInitScript = `
  (function () {
    try {
      var themeKey = 'podadresem-theme';
      var legacyThemeKey = 'estateflow-theme';
      var theme = window.localStorage.getItem(themeKey);
      if (!theme) {
        theme = window.localStorage.getItem(legacyThemeKey);
        if (theme) window.localStorage.setItem(themeKey, theme);
      }
      theme = theme || 'light';
      if (theme !== 'dark' && theme !== 'light') theme = 'light';
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.dataset.theme = theme;
    } catch (_) {
      document.documentElement.dataset.theme = 'light';
    }
  })();
`;

export const metadata: Metadata = {
  title: `${APP_NAME} — Platforma dla agentów nieruchomości`,
  description:
    'Kompleksowe narzędzie SaaS do zarządzania ofertami, klientami i spotkaniami dla agentów nieruchomości.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" suppressHydrationWarning className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <ThemeProvider>
          <CookieConsentProvider>
            <ToastProvider>
              <ConfirmProvider>
                <AuthProvider>
                  {children}
                  <CookieConsentManager />
                </AuthProvider>
              </ConfirmProvider>
            </ToastProvider>
          </CookieConsentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
