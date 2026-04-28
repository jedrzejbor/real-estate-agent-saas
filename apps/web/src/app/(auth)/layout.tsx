import Link from 'next/link';
import { Logo } from '@/components/common/logo';

/** Centered card layout for login / register pages. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#FAFAF9] to-[#F5F5F4] px-4 py-12">
      <Link href="/" className="mb-8" aria-label="Strona główna">
        <Logo size="lg" />
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} EstateFlow. Wszelkie prawa
        zastrzeżone.
      </p>
    </div>
  );
}
