'use client';

import { useEffect } from 'react';
import { useCookieConsent } from '@/contexts/cookie-consent-context';
import { AnalyticsEventName, trackPublicBlogEvent } from '@/lib/analytics';

interface BlogArticleAnalyticsProps {
  slug: string;
  title: string;
  category?: string | null;
  author?: string | null;
}

export function BlogArticleAnalytics({
  slug,
  title,
  category,
  author,
}: BlogArticleAnalyticsProps) {
  const { hasAnalyticsConsent, isHydrated } = useCookieConsent();

  useEffect(() => {
    if (!isHydrated || !hasAnalyticsConsent) {
      return;
    }

    const sessionKey = `blog-article-viewed:${slug}`;

    try {
      if (sessionStorage.getItem(sessionKey)) {
        return;
      }

      sessionStorage.setItem(sessionKey, '1');
    } catch {
      // Browser storage policies should not block analytics.
    }

    trackPublicBlogEvent({
      slug,
      name: AnalyticsEventName.BLOG_ARTICLE_VIEWED,
      properties: {
        postTitle: title,
        category: category ?? null,
        author: author ?? null,
      },
    });
  }, [author, category, hasAnalyticsConsent, isHydrated, slug, title]);

  return null;
}
