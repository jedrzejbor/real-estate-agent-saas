import type { BlogHeading } from './blog-markdown';

interface BlogTableOfContentsProps {
  headings: BlogHeading[];
}

export function BlogTableOfContents({ headings }: BlogTableOfContentsProps) {
  const h2Headings = headings.filter((heading) => heading.level === 2);

  if (h2Headings.length < 2) {
    return null;
  }

  return (
    <nav
      aria-label="Spis treści artykułu"
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <p className="text-sm font-semibold text-foreground">Spis treści</p>
      <ol className="mt-3 space-y-2">
        {h2Headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className="text-sm leading-6 text-muted-foreground transition-colors hover:text-primary"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
