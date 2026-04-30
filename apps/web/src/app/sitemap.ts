import type { MetadataRoute } from 'next';
import { fetchPublicListingSitemapEntries } from '@/lib/listings';
import { absoluteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  try {
    const publicListings = await fetchPublicListingSitemapEntries();

    return [
      ...staticRoutes,
      ...publicListings.map((listing) => ({
        url: absoluteUrl(`/oferty/${listing.slug}`),
        lastModified: new Date(listing.updatedAt),
        changeFrequency: 'daily' as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
