import Link from 'next/link';
import type { ReactNode } from 'react';

interface BlogMarkdownProps {
  content: string;
}

export interface BlogHeading {
  id: string;
  level: 2 | 3;
  text: string;
}

type MarkdownBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; text: string };

export function BlogMarkdown({ content }: BlogMarkdownProps) {
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

  for (const rawLine of lines) {
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

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
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
