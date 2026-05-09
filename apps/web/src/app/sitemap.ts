import type { MetadataRoute } from 'next';
import { fetchPublicListingSitemapEntries } from '@/lib/listings';
import {
  getPublicCatalogCityHref,
  PUBLIC_CATALOG_SEO_CITIES,
} from '@/lib/public-catalog-seo';
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
    {
      url: absoluteUrl('/oferty'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.6,
    },
    ...PUBLIC_CATALOG_SEO_CITIES.map((city) => ({
      url: absoluteUrl(getPublicCatalogCityHref(city.name)),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.55,
    })),
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
