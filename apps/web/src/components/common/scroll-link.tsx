'use client';

import Link from 'next/link';
import { useSmoothScroll } from '@/hooks/use-smooth-scroll';
import { cn } from '@/lib/utils';

interface ScrollLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  /**
   * Pixel offset from the top (accounts for sticky navbar).
   * Defaults to 80px (navbar height).
   */
  offset?: number;
}

/**
 * Drop-in replacement for `<Link>` that adds smooth scrolling to on-page
 * anchor links (href starting with "#").
 *
 * External / internal page links work as normal Next.js `<Link>`.
 *
 * Usage:
 *   <ScrollLink href="#features" className="...">Cechy</ScrollLink>
 *   <ScrollLink href="/register" className="...">Zarejestruj</ScrollLink>
 */
export function ScrollLink({
  href,
  children,
  className,
  offset,
}: ScrollLinkProps) {
  const { scrollTo } = useSmoothScroll();

  // Internal page navigation — delegate to Next.js Link
  if (!href.startsWith('#')) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={cn(className)}
      onClick={(e) => {
        e.preventDefault();
        scrollTo(href, offset);
      }}
    >
      {children}
    </a>
  );
}
