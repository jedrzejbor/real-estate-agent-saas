import { apiFetch } from './api-client';

export const BlogContentFormat = {
  MARKDOWN: 'markdown',
  HTML: 'html',
  JSON: 'json',
} as const;

export type BlogContentFormat =
  (typeof BlogContentFormat)[keyof typeof BlogContentFormat];

export interface BlogCategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface PublicBlogCategory extends BlogCategorySummary {
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  isIndexable: boolean;
  publishedPostCount: number;
  updatedAt: string;
}

export interface BlogAuthorSummary {
  id: string;
  displayName: string;
  slug: string;
  bio?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  expertise?: string | null;
  sameAsLinks?: string[];
}

export interface PublicBlogPostListItem {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  category?: BlogCategorySummary | null;
  author?: BlogAuthorSummary | null;
  tags: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  publishedAt: string;
  updatedAt: string;
}

export interface PublicBlogPost extends PublicBlogPostListItem {
  content: string;
  contentFormat: BlogContentFormat;
}

export interface PublicBlogPostSitemapEntry {
  slug: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PublicBlogPostsResponse {
  data: PublicBlogPostListItem[];
  meta: PaginationMeta;
}

export interface PublicBlogPostsFilters {
  categoryId?: string;
  page?: number;
  limit?: number;
}

function buildQueryString(filters: PublicBlogPostsFilters): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function fetchPublicBlogPosts(
  filters: PublicBlogPostsFilters = {},
): Promise<PublicBlogPostsResponse> {
  return apiFetch<PublicBlogPostsResponse>(
    `/public-blog/posts${buildQueryString(filters)}`,
    { skipAuth: true },
  );
}

export async function fetchPublicBlogPost(
  slug: string,
): Promise<PublicBlogPost> {
  return apiFetch<PublicBlogPost>(`/public-blog/posts/${slug}`, {
    skipAuth: true,
  });
}

export async function fetchPublicBlogCategory(
  slug: string,
): Promise<PublicBlogCategory> {
  return apiFetch<PublicBlogCategory>(`/public-blog/categories/${slug}`, {
    skipAuth: true,
  });
}

export async function fetchPublicBlogSitemapEntries(): Promise<
  PublicBlogPostSitemapEntry[]
> {
  const response = await fetchPublicBlogPosts({ limit: 50 });

  return response.data.map((post) => ({
    slug: post.slug,
    updatedAt: post.updatedAt,
  }));
}

export function formatBlogDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export function getBlogPageHref(page: number, basePath = '/blog') {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}
