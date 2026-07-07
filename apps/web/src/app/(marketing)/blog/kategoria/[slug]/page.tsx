import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import {
  fetchPublicBlogCategory,
  fetchPublicBlogPosts,
  type PublicBlogCategory,
} from '@/lib/blog';
import { APP_NAME } from '@/lib/brand';
import { absoluteUrl, getSiteUrl } from '@/lib/seo';
import { BlogPagination, BlogPostCard } from '@/components/blog';

type SearchParams = Record<string, string | string[] | undefined>;

interface BlogCategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
  searchParams,
}: BlogCategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPageParam((await searchParams).page);
  const category = await getCategory(slug);

  if (!category) {
    return {
      title: `Kategoria nie znaleziona | ${APP_NAME}`,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const isFirstPage = page === 1;
  const shouldIndex = category.isIndexable && isFirstPage;
  const canonicalUrl = absoluteUrl(`/blog/kategoria/${category.slug}`);
  const title =
    category.seoTitle ||
    (isFirstPage
      ? `${category.name} | Blog ${APP_NAME}`
      : `${category.name}, strona ${page} | Blog ${APP_NAME}`);
  const description =
    category.seoDescription ||
    category.description ||
    `Artykuły z kategorii ${category.name} w blogu ${APP_NAME}.`;

  return {
    metadataBase: getSiteUrl(),
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: shouldIndex,
      follow: true,
      googleBot: {
        index: shouldIndex,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: APP_NAME,
      type: 'website',
      locale: 'pl_PL',
    },
  };
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: BlogCategoryPageProps) {
  const { slug } = await params;
  const page = getPageParam((await searchParams).page);
  const category = await getCategory(slug);

  if (!category) {
    notFound();
  }

  const result = await getCategoryPosts(category, page);
  const posts = result.data?.data ?? [];
  const meta = result.data?.meta;
  const basePath = `/blog/kategoria/${category.slug}`;

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Blog
          </Link>

          <div className="mt-8 max-w-4xl">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-primary">
              <FolderOpen className="h-4 w-4" />
              Kategoria
            </p>
            <h1 className="mt-3 font-heading text-4xl font-bold leading-tight text-foreground sm:text-5xl">
              {category.name}
            </h1>
            {category.description ? (
              <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                {category.description}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        {result.error ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
            Nie udało się pobrać wpisów z tej kategorii. Spróbuj ponownie
            później.
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <h2 className="font-heading text-2xl font-semibold">
              Brak opublikowanych wpisów
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Ta kategoria nie ma jeszcze publicznych artykułów.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
            {meta ? <BlogPagination meta={meta} basePath={basePath} /> : null}
          </div>
        )}
      </section>
    </div>
  );
}

async function getCategory(slug: string) {
  try {
    return await fetchPublicBlogCategory(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

async function getCategoryPosts(category: PublicBlogCategory, page: number) {
  try {
    return {
      data: await fetchPublicBlogPosts({
        categoryId: category.id,
        limit: 12,
        page,
      }),
      error: null,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return { data: null, error: error.message };
    }

    throw error;
  }
}

function getPageParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const page = Number(rawValue);

  return Number.isInteger(page) && page > 0 ? page : 1;
}
