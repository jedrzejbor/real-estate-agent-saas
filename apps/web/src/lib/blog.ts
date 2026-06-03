import { apiFetch } from './api-client';

export const BlogContentFormat = {
  MARKDOWN: 'markdown',
  HTML: 'html',
  JSON: 'json',
} as const;

export type BlogContentFormat =
  (typeof BlogContentFormat)[keyof typeof BlogContentFormat];

export const BlogPostStatus = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export type BlogPostStatus =
  (typeof BlogPostStatus)[keyof typeof BlogPostStatus];

export const BlogRobotsDirective = {
  INDEX_FOLLOW: 'index_follow',
  NOINDEX_FOLLOW: 'noindex_follow',
} as const;

export type BlogRobotsDirective =
  (typeof BlogRobotsDirective)[keyof typeof BlogRobotsDirective];

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

export interface AdminBlogPost extends PublicBlogPost {
  status: BlogPostStatus;
  robots: BlogRobotsDirective;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
}

export interface AdminBlogCategory extends PublicBlogCategory {
  sortOrder: number;
}

export interface AdminBlogAuthor extends BlogAuthorSummary {
  createdAt: string;
  updatedAt: string;
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

export interface AdminBlogPostsResponse {
  data: AdminBlogPost[];
  meta: PaginationMeta;
}

export interface PublicBlogPostsFilters {
  categoryId?: string;
  page?: number;
  limit?: number;
}

export interface AdminBlogPostsFilters {
  status?: BlogPostStatus;
  categoryId?: string;
  authorId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function buildQueryString(filters: object): string {
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

export async function fetchBlogPostsAdmin(
  filters: AdminBlogPostsFilters = {},
): Promise<AdminBlogPostsResponse> {
  return apiFetch<AdminBlogPostsResponse>(
    `/admin/blog/posts${buildQueryString(filters)}`,
  );
}

export async function fetchBlogCategoriesAdmin(): Promise<AdminBlogCategory[]> {
  return apiFetch<AdminBlogCategory[]>('/admin/blog/categories');
}

export async function fetchBlogAuthorsAdmin(): Promise<AdminBlogAuthor[]> {
  return apiFetch<AdminBlogAuthor[]>('/admin/blog/authors');
}

export async function publishBlogPostAdmin(id: string): Promise<AdminBlogPost> {
  return apiFetch<AdminBlogPost>(`/admin/blog/posts/${id}/publish`, {
    method: 'POST',
  });
}

export async function unpublishBlogPostAdmin(
  id: string,
): Promise<AdminBlogPost> {
  return apiFetch<AdminBlogPost>(`/admin/blog/posts/${id}/unpublish`, {
    method: 'POST',
  });
}

export async function archiveBlogPostAdmin(id: string): Promise<AdminBlogPost> {
  return apiFetch<AdminBlogPost>(`/admin/blog/posts/${id}`, {
    method: 'DELETE',
  });
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
