import { BlogPostCard } from './blog-post-card';
import type { PublicBlogPostListItem } from '@/lib/blog';

interface RelatedPostsProps {
  posts: PublicBlogPostListItem[];
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase text-primary">
          Czytaj dalej
        </p>
        <h2 className="mt-1 font-heading text-2xl font-semibold text-[#1C1917]">
          Powiązane artykuły
        </h2>
      </div>
      <div className="grid gap-5">
        {posts.map((post) => (
          <BlogPostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
