import type { MetadataRoute } from 'next';
import { fetchPublicBlogSitemapEntries } from '@/lib/blog';
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
    {
      url: absoluteUrl('/blog'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    ...PUBLIC_CATALOG_SEO_CITIES.map((city) => ({
      url: absoluteUrl(getPublicCatalogCityHref(city.name)),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.55,
    })),
  ];

  const [publicListingsResult, blogPostsResult] = await Promise.allSettled([
    fetchPublicListingSitemapEntries(),
    fetchPublicBlogSitemapEntries(),
  ]);

  const publicListings =
    publicListingsResult.status === 'fulfilled'
      ? publicListingsResult.value
      : [];
  const blogPosts =
    blogPostsResult.status === 'fulfilled' ? blogPostsResult.value : [];

  return [
    ...staticRoutes,
    ...publicListings.map((listing) => ({
      url: absoluteUrl(`/oferty/${listing.slug}`),
      lastModified: new Date(listing.updatedAt),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...blogPosts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: new Date(post.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    })),
  ];
}
