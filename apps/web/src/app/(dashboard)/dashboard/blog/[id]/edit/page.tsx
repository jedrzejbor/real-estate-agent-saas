'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BlogPostForm } from '@/components/blog/blog-post-form';
import { getApiErrorMessage } from '@/lib/api-client';
import { fetchBlogPostAdmin, type AdminBlogPost } from '@/lib/blog';

interface EditBlogPostPageProps {
  params: Promise<{ id: string }>;
}

export default function EditBlogPostPage({ params }: EditBlogPostPageProps) {
  const { id } = use(params);
  const [post, setPost] = useState<AdminBlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPost() {
      try {
        const response = await fetchBlogPostAdmin(id);
        if (!isMounted) return;
        setPost(response);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(fetchError));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPost();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/blog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do listy wpisów
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-card p-8 text-center shadow-sm">
          <h1 className="font-heading text-2xl font-semibold">
            Nie udało się pobrać wpisu
          </h1>
          <p className="mt-2 text-sm text-destructive">
            {error ?? 'Wpis nie istnieje albo nie masz do niego dostępu.'}
          </p>
        </div>
      </div>
    );
  }

  return <BlogPostForm post={post} />;
}
