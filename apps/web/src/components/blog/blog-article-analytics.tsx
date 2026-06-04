'use client';

import { useEffect } from 'react';
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
  useEffect(() => {
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
  }, [author, category, slug, title]);

  return null;
}
