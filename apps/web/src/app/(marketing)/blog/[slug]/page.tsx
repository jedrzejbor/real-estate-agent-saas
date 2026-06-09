/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, UserRound } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import {
  fetchPublicBlogPosts,
  fetchPublicBlogPost,
  formatBlogDate,
  type PublicBlogPost,
} from '@/lib/blog';
import { absoluteUrl, compactJsonLd, getSiteUrl } from '@/lib/seo';
import {
  ArticleCta,
  BlogArticleAnalytics,
  BlogMarkdown,
  BlogTableOfContents,
  RelatedPosts,
} from '@/components/blog';
import {
  getMarkdownFaqItems,
  getMarkdownHeadings,
  hasMarkdownFeaturedListingsBlock,
  type BlogFaqItem,
} from '@/components/blog/blog-markdown';
import { FeaturedListingsBlock } from '@/components/blog/featured-listings-block';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

const FALLBACK_BLOG_IMAGE = '/images/hero/interior-1.jpg';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: 'Wpis nie znaleziony | EstateFlow',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = post.seoTitle || `${post.title} | EstateFlow`;
  const description = post.seoDescription || post.excerpt || post.title;
  const canonicalUrl = post.canonicalUrl || absoluteUrl(`/blog/${post.slug}`);
  const imageUrl = absoluteUrl(post.coverImageUrl || FALLBACK_BLOG_IMAGE);

  return {
    metadataBase: getSiteUrl(),
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
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
      siteName: 'EstateFlow',
      type: 'article',
      locale: 'pl_PL',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: [
        {
          url: imageUrl,
          alt: post.coverImageAlt || post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const canonicalUrl = post.canonicalUrl || absoluteUrl(`/blog/${post.slug}`);
  const imageUrl = post.coverImageUrl || FALLBACK_BLOG_IMAGE;
  const publishedDate = formatBlogDate(post.publishedAt);
  const updatedDate = formatBlogDate(post.updatedAt);
  const headings = getMarkdownHeadings(post.content);
  const faqItems = getMarkdownFaqItems(post.content);
  const shouldShowFeaturedListings = hasMarkdownFeaturedListingsBlock(
    post.content,
  );
  const relatedPosts = await getRelatedPosts(post);
  const jsonLd = buildBlogPostJsonLd(post, canonicalUrl, imageUrl);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(post, canonicalUrl);
  const faqJsonLd = buildFaqJsonLd(faqItems);
  const blogContext = { slug: post.slug, title: post.title };

  return (
    <article className="bg-background">
      <BlogArticleAnalytics
        slug={post.slug}
        title={post.title}
        category={post.category?.name}
        author={post.author?.displayName}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}

      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Blog
          </Link>

          <div className="mt-8">
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
              {post.category ? (
                <span className="rounded-full border border-primary/20 bg-brand-emerald-light px-3 py-1 text-primary">
                  {post.category.name}
                </span>
              ) : null}
              {publishedDate ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {publishedDate}
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 max-w-4xl font-heading text-4xl font-bold leading-tight text-foreground sm:text-5xl">
              {post.title}
            </h1>

            {post.excerpt ? (
              <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                {post.excerpt}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                {post.author?.displayName ?? 'EstateFlow'}
              </span>
              {updatedDate && updatedDate !== publishedDate ? (
                <span>Aktualizacja: {updatedDate}</span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
        <img
          src={imageUrl}
          alt={post.coverImageAlt || post.title}
          className="aspect-[16/9] w-full rounded-2xl object-cover shadow-sm"
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <BlogMarkdown
              content={post.content}
              featuredListingsSlot={
                shouldShowFeaturedListings ? <FeaturedListingsBlock /> : null
              }
              blogContext={blogContext}
            />
            <div className="mt-8">
              <ArticleCta
                variant={getArticleCtaVariant(post)}
                blogContext={blogContext}
              />
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <BlogTableOfContents headings={headings} />
            <SidebarCta />
          </aside>
        </div>

        <RelatedPosts posts={relatedPosts} />
      </div>
    </article>
  );
}

async function getRelatedPosts(post: PublicBlogPost) {
  try {
    const response = await fetchPublicBlogPosts({
      categoryId: post.category?.id,
      limit: 4,
    });

    return response.data
      .filter((relatedPost) => relatedPost.slug !== post.slug)
      .slice(0, 3);
  } catch (error) {
    if (error instanceof ApiError) {
      return [];
    }

    throw error;
  }
}

function getArticleCtaVariant(
  post: PublicBlogPost,
): 'register' | 'listings' | 'submit-listing' {
  const text =
    `${post.title} ${post.category?.name ?? ''} ${post.tags.join(' ')}`.toLowerCase();

  if (text.includes('sprzeda') || text.includes('wynaj')) {
    return 'submit-listing';
  }

  if (text.includes('kup') || text.includes('ofert')) {
    return 'listings';
  }

  return 'register';
}

function SidebarCta() {
  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold text-foreground">EstateFlow</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Zarządzaj ofertami, klientami i leadami z jednego panelu CRM dla rynku
          nieruchomości.
        </p>
        <Link
          href="/register"
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          Załóż konto
        </Link>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold text-foreground">Szukasz ofert?</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Przejdź do publicznego katalogu nieruchomości.
        </p>
        <Link
          href="/oferty"
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
        >
          Zobacz oferty
        </Link>
      </div>
    </>
  );
}

async function getBlogPost(slug: string) {
  try {
    return await fetchPublicBlogPost(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

function buildBlogPostJsonLd(
  post: PublicBlogPost,
  canonicalUrl: string,
  imageUrl: string,
) {
  return compactJsonLd({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${canonicalUrl}#article`,
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: absoluteUrl(imageUrl),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: canonicalUrl,
    author: post.author
      ? {
          '@type': 'Person',
          name: post.author.displayName,
          url: absoluteUrl(`/blog/autor/${post.author.slug}`),
        }
      : {
          '@type': 'Organization',
          name: 'EstateFlow',
          url: absoluteUrl('/'),
        },
    publisher: {
      '@type': 'Organization',
      name: 'EstateFlow',
      url: absoluteUrl('/'),
    },
  });
}

function buildBreadcrumbJsonLd(post: PublicBlogPost, canonicalUrl: string) {
  return compactJsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'EstateFlow',
        item: absoluteUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: absoluteUrl('/blog'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: canonicalUrl,
      },
    ],
  });
}

function buildFaqJsonLd(items: BlogFaqItem[]) {
  if (items.length === 0) {
    return null;
  }

  return compactJsonLd({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  });
}
