/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArticleCta, type ArticleCtaVariant } from './article-cta';

interface BlogMarkdownProps {
  content: string;
  featuredListingsSlot?: ReactNode;
  blogContext?: {
    slug: string;
    title: string;
  };
}

export interface BlogHeading {
  id: string;
  level: 2 | 3;
  text: string;
}

export interface BlogFaqItem {
  question: string;
  answer: string;
}

type MarkdownBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'image'; alt: string; src: string }
  | { type: 'cta'; variant: ArticleCtaVariant }
  | { type: 'faq'; items: BlogFaqItem[] }
  | { type: 'featuredListings' };

export interface MarkdownContentIssue {
  field: string;
  message: string;
}

export function BlogMarkdown({
  content,
  featuredListingsSlot,
  blogContext,
}: BlogMarkdownProps) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-6">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const Heading = block.level === 2 ? 'h2' : 'h3';

          return (
            <Heading
              key={index}
              id={getHeadingId(block.text)}
              className={
                block.level === 2
                  ? 'pt-4 font-heading text-2xl font-semibold leading-tight text-[#1C1917] sm:text-3xl'
                  : 'pt-2 font-heading text-xl font-semibold leading-tight text-[#1C1917]'
              }
            >
              {renderInlineMarkdown(block.text)}
            </Heading>
          );
        }

        if (block.type === 'list') {
          return (
            <ul
              key={index}
              className="list-disc space-y-2 pl-6 text-base leading-8 text-[#44403C]"
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'quote') {
          return (
            <blockquote
              key={index}
              className="border-l-4 border-primary bg-[#ECFDF5] px-5 py-4 text-base leading-8 text-[#1C1917]"
            >
              {renderInlineMarkdown(block.text)}
            </blockquote>
          );
        }

        if (block.type === 'image') {
          const safeSrc = getSafeHref(block.src);
          const alt = block.alt.trim();

          if (!safeSrc || !alt) {
            return (
              <div
                key={index}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
              >
                Obraz w treści wymaga bezpiecznego adresu URL i opisowego altu.
              </div>
            );
          }

          return (
            <figure key={index} className="space-y-3">
              <img
                src={safeSrc}
                alt={alt}
                loading="lazy"
                className="aspect-[16/9] w-full rounded-2xl object-cover shadow-sm"
              />
              <figcaption className="text-sm leading-6 text-muted-foreground">
                {alt}
              </figcaption>
            </figure>
          );
        }

        if (block.type === 'cta') {
          return (
            <ArticleCta
              key={index}
              variant={block.variant}
              blogContext={blogContext}
            />
          );
        }

        if (block.type === 'faq') {
          return <BlogFaq key={index} items={block.items} />;
        }

        if (block.type === 'featuredListings') {
          return featuredListingsSlot ? (
            <div key={index}>{featuredListingsSlot}</div>
          ) : null;
        }

        return (
          <p key={index} className="text-base leading-8 text-[#44403C]">
            {renderInlineMarkdown(block.text)}
          </p>
        );
      })}
    </div>
  );
}

export function getMarkdownHeadings(content: string): BlogHeading[] {
  return parseMarkdownBlocks(content)
    .filter(
      (block): block is Extract<MarkdownBlock, { type: 'heading' }> =>
        block.type === 'heading',
    )
    .map((block) => ({
      id: getHeadingId(block.text),
      level: block.level,
      text: block.text,
    }));
}

export function getMarkdownFaqItems(content: string): BlogFaqItem[] {
  return parseMarkdownBlocks(content)
    .filter(
      (block): block is Extract<MarkdownBlock, { type: 'faq' }> =>
        block.type === 'faq',
    )
    .flatMap((block) => block.items);
}

export function hasMarkdownFeaturedListingsBlock(content: string): boolean {
  return parseMarkdownBlocks(content).some(
    (block) => block.type === 'featuredListings',
  );
}

export function getMarkdownContentIssues(
  content: string,
): MarkdownContentIssue[] {
  const issues: MarkdownContentIssue[] = [];

  if (/(^|\n)\s*#\s+|<h1\b/i.test(content)) {
    issues.push({
      field: 'content',
      message: 'Usuń nagłówek H1 z treści artykułu.',
    });
  }

  for (const issue of getMarkdownImageIssues(content)) {
    issues.push(issue);
  }

  for (const issue of getMarkdownEditorialBlockIssues(content)) {
    issues.push(issue);
  }

  return issues;
}

export function getMarkdownImageIssues(
  content: string,
): MarkdownContentIssue[] {
  const issues: MarkdownContentIssue[] = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line.startsWith('![')) {
      return;
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    const lineNumber = index + 1;

    if (!imageMatch) {
      issues.push({
        field: `content-image-${lineNumber}`,
        message: `Popraw składnię obrazu w linii ${lineNumber}: ![alt](url).`,
      });
      return;
    }

    const alt = imageMatch[1].trim();
    const src = imageMatch[2].trim();

    if (!alt) {
      issues.push({
        field: `content-image-alt-${lineNumber}`,
        message: `Dodaj opisowy alt do obrazu w linii ${lineNumber}.`,
      });
    }

    if (!getSafeHref(src)) {
      issues.push({
        field: `content-image-url-${lineNumber}`,
        message: `Użyj bezpiecznego URL obrazu w linii ${lineNumber}.`,
      });
    }
  });

  return issues;
}

export function getMarkdownEditorialBlockIssues(
  content: string,
): MarkdownContentIssue[] {
  const issues: MarkdownContentIssue[] = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    const lineNumber = index + 1;

    if (line.startsWith('::cta') && !parseCtaLine(line)) {
      issues.push({
        field: `content-cta-${lineNumber}`,
        message:
          'Popraw blok CTA. Dostępne warianty: register, contact, submit-listing, listings.',
      });
    }

    if (
      line.startsWith('::featured-listings') &&
      line !== '::featured-listings'
    ) {
      issues.push({
        field: `content-featured-listings-${lineNumber}`,
        message:
          'Blok wyróżnionych ofert zapisuj dokładnie jako ::featured-listings.',
      });
    }

    if (line === ':::faq') {
      const endIndex = lines
        .slice(index + 1)
        .findIndex((candidate) => candidate.trim() === ':::');

      if (endIndex === -1) {
        issues.push({
          field: `content-faq-${lineNumber}`,
          message: `Zamknij blok FAQ rozpoczęty w linii ${lineNumber} znacznikiem :::.`,
        });
        return;
      }

      const faqLines = lines.slice(index + 1, index + 1 + endIndex);
      if (parseFaqItems(faqLines).length === 0) {
        issues.push({
          field: `content-faq-empty-${lineNumber}`,
          message:
            'Dodaj pytania FAQ w formacie ### Pytanie oraz odpowiedź pod pytaniem.',
        });
      }
    }
  });

  return issues;
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  function flushParagraph() {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    }
  }

  function flushList() {
    if (listItems.length > 0) {
      blocks.push({ type: 'list', items: listItems });
      listItems = [];
    }
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex];
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', level: 2, text: h2Match[1] });
      continue;
    }

    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', level: 3, text: h3Match[1] });
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1]);
      continue;
    }

    const quoteMatch = line.match(/^>\s+(.+)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'quote', text: quoteMatch[1] });
      continue;
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: 'image',
        alt: imageMatch[1],
        src: imageMatch[2],
      });
      continue;
    }

    const ctaVariant = parseCtaLine(line);
    if (ctaVariant) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'cta', variant: ctaVariant });
      continue;
    }

    if (line === '::featured-listings') {
      flushParagraph();
      flushList();
      blocks.push({ type: 'featuredListings' });
      continue;
    }

    if (line === ':::faq') {
      flushParagraph();
      flushList();
      const faqLines: string[] = [];
      let faqEndIndex = -1;

      for (
        let nestedIndex = lineIndex + 1;
        nestedIndex < lines.length;
        nestedIndex += 1
      ) {
        if (lines[nestedIndex].trim() === ':::') {
          faqEndIndex = nestedIndex;
          break;
        }
        faqLines.push(lines[nestedIndex]);
      }

      if (faqEndIndex !== -1) {
        const items = parseFaqItems(faqLines);
        if (items.length > 0) {
          blocks.push({ type: 'faq', items });
        }

        lineIndex = faqEndIndex;
      } else {
        paragraph.push(line);
      }
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function BlogFaq({ items }: { items: BlogFaqItem[] }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <h2 className="font-heading text-2xl font-semibold leading-tight text-[#1C1917]">
        Najczęstsze pytania
      </h2>
      <div className="mt-4 divide-y divide-border">
        {items.map((item) => (
          <details key={item.question} className="group py-4" open>
            <summary className="cursor-pointer list-none font-heading text-base font-semibold text-[#1C1917]">
              <span>{renderInlineMarkdown(item.question)}</span>
            </summary>
            <p className="mt-3 text-base leading-8 text-[#44403C]">
              {renderInlineMarkdown(item.answer)}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function parseCtaLine(line: string): ArticleCtaVariant | null {
  const match = line.match(
    /^::cta\s+(register|contact|submit-listing|listings)$/,
  );
  return match ? (match[1] as ArticleCtaVariant) : null;
}

function parseFaqItems(lines: string[]): BlogFaqItem[] {
  const items: BlogFaqItem[] = [];
  let question: string | null = null;
  let answerLines: string[] = [];

  function flushItem() {
    const answer = answerLines.join(' ').trim();
    if (question && answer) {
      items.push({ question, answer });
    }
    answerLines = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const questionMatch = line.match(/^###\s+(.+)$/);

    if (questionMatch) {
      flushItem();
      question = questionMatch[1].trim();
      continue;
    }

    if (question && line) {
      answerLines.push(line);
    }
  }

  flushItem();

  return items;
}

function renderInlineMarkdown(text: string) {
  const nodes: ReactNode[] = [];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const label = match[1];
    const href = getSafeHref(match[2]);

    if (href) {
      const isExternal = href.startsWith('http');
      nodes.push(
        isExternal ? (
          <a
            key={`${match.index}-${href}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-4"
          >
            {label}
          </a>
        ) : (
          <Link
            key={`${match.index}-${href}`}
            href={href}
            className="font-medium text-primary underline underline-offset-4"
          >
            {label}
          </Link>
        ),
      );
    } else {
      nodes.push(label);
    }

    lastIndex = linkPattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function getSafeHref(href: string) {
  const trimmedHref = href.trim();

  if (trimmedHref.startsWith('/')) {
    return trimmedHref;
  }

  try {
    const url = new URL(trimmedHref);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function getHeadingId(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}
