import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { fetchPublicBlogPosts } from '@/lib/blog';
import { absoluteUrl, getSiteUrl } from '@/lib/seo';
import { BlogPagination, BlogPostCard } from '@/components/blog';

type SearchParams = Record<string, string | string[] | undefined>;

interface BlogIndexPageProps {
  searchParams: Promise<SearchParams>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: BlogIndexPageProps): Promise<Metadata> {
  const page = getPageParam((await searchParams).page);
  const isFirstPage = page === 1;
  const title = isFirstPage
    ? 'Blog EstateFlow | Poradniki nieruchomości i SEO dla agentów'
    : `Blog EstateFlow, strona ${page} | Poradniki nieruchomości`;
  const description =
    'Praktyczne poradniki o sprzedaży, kupnie i wynajmie nieruchomości oraz pracy agentów i biur nieruchomości.';

  return {
    metadataBase: getSiteUrl(),
    title,
    description,
    alternates: {
      canonical: absoluteUrl('/blog'),
    },
    robots: {
      index: isFirstPage,
      follow: true,
      googleBot: {
        index: isFirstPage,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title: 'Blog EstateFlow',
      description:
        'Poradniki nieruchomości dla właścicieli, kupujących, agentów i biur.',
      url: absoluteUrl('/blog'),
      siteName: 'EstateFlow',
      type: 'website',
      locale: 'pl_PL',
    },
  };
}

export default async function BlogIndexPage({
  searchParams,
}: BlogIndexPageProps) {
  const page = getPageParam((await searchParams).page);
  const result = await getBlogPosts(page);
  const posts = result.data?.data ?? [];
  const meta = result.data?.meta;
  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);

  return (
    <div className="overflow-x-hidden bg-background">
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-18">
          <div className="grid min-w-0 gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div className="min-w-0 max-w-[320px] sm:max-w-none">
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-primary">
                <BookOpen className="h-4 w-4" />
                Blog EstateFlow
              </p>
              <h1 className="mt-3 max-w-4xl break-words font-heading text-2xl font-bold leading-tight text-foreground sm:text-5xl">
                Poradniki nieruchomości dla sprzedających, kupujących i agentów
              </h1>
              <p className="mt-5 max-w-3xl break-words text-base leading-7 text-muted-foreground sm:text-lg">
                Praktyczna wiedza o ofertach, sprzedaży, wynajmie, obsłudze
                leadów i pracy biura nieruchomości. Publikujemy treści, które
                pomagają podejmować lepsze decyzje i lepiej zarządzać procesem.
              </p>
            </div>

            <div className="max-w-[320px] rounded-2xl border border-border bg-muted p-5 sm:max-w-none">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card text-primary">
                  <Search className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Content hub SEO
                  </p>
                  <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                    Artykuły są tworzone pod konkretne intencje wyszukiwania i
                    linkują do ofert, formularzy oraz funkcji EstateFlow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        {result.error ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
            Nie udało się pobrać wpisów blogowych. Spróbuj ponownie później.
          </div>
        ) : posts.length === 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <h2 className="font-heading text-2xl font-semibold">
              Pierwsze artykuły są w przygotowaniu
            </h2>
            <p className="mx-auto mt-3 max-w-[280px] break-words text-sm leading-7 text-muted-foreground sm:max-w-2xl">
              Blog jest gotowy technicznie. Po publikacji pierwszych wpisów
              pojawią się tutaj poradniki dla właścicieli, kupujących i agentów.
            </p>
            <Link
              href="/oferty"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Zobacz oferty
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {featuredPost ? (
              <div>
                <p className="mb-3 text-sm font-semibold uppercase text-primary">
                  Najnowszy artykuł
                </p>
                <BlogPostCard post={featuredPost} priority />
              </div>
            ) : null}

            {regularPosts.length > 0 ? (
              <div className="grid gap-6">
                {regularPosts.map((post) => (
                  <BlogPostCard key={post.id} post={post} />
                ))}
              </div>
            ) : null}

            {meta ? <BlogPagination meta={meta} basePath="/blog" /> : null}
          </div>
        )}
      </section>
    </div>
  );
}

async function getBlogPosts(page: number) {
  try {
    return {
      data: await fetchPublicBlogPosts({ limit: 12, page }),
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
