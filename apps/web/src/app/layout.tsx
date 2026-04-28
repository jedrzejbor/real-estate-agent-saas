import type { Metadata } from 'next';
import { Outfit, Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/auth-context';
import { ConfirmProvider } from '@/contexts/confirm-context';
import { ToastProvider } from '@/contexts/toast-context';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'EstateFlow — Platforma dla agentów nieruchomości',
  description:
    'Kompleksowe narzędzie SaaS do zarządzania ofertami, klientami i spotkaniami dla agentów nieruchomości.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${outfit.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#FAFAF9] text-[#1C1917]">
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>{children}</AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
