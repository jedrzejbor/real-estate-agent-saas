-- Blog CMS foundation.
-- Safe to run more than once on PostgreSQL.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'blog_posts_status_enum'
  ) THEN
    CREATE TYPE blog_posts_status_enum AS ENUM (
      'draft',
      'scheduled',
      'published',
      'archived'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'blog_posts_contentformat_enum'
  ) THEN
    CREATE TYPE blog_posts_contentformat_enum AS ENUM (
      'markdown',
      'html',
      'json'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'blog_posts_robots_enum'
  ) THEN
    CREATE TYPE blog_posts_robots_enum AS ENUM (
      'index_follow',
      'noindex_follow'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(80) NOT NULL,
  slug varchar(100) NOT NULL,
  description varchar(500),
  "seoTitle" varchar(70),
  "seoDescription" varchar(180),
  "sortOrder" integer NOT NULL DEFAULT 0,
  "isIndexable" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_blog_categories_slug_unique"
  ON blog_categories (slug);

CREATE INDEX IF NOT EXISTS "IDX_blog_categories_sortOrder"
  ON blog_categories ("sortOrder", name);

CREATE TABLE IF NOT EXISTS blog_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "displayName" varchar(120) NOT NULL,
  slug varchar(120) NOT NULL,
  bio varchar(1000),
  "avatarUrl" varchar(500),
  role varchar(120),
  expertise varchar(500),
  "sameAsLinks" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_blog_authors_slug_unique"
  ON blog_authors (slug);

CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(180) NOT NULL,
  slug varchar(160) NOT NULL,
  excerpt varchar(500),
  content text NOT NULL DEFAULT '',
  "contentFormat" blog_posts_contentformat_enum NOT NULL DEFAULT 'markdown',
  "coverImageUrl" varchar(500),
  "coverImageAlt" varchar(180),
  status blog_posts_status_enum NOT NULL DEFAULT 'draft',
  "categoryId" uuid,
  "authorId" uuid,
  "seoTitle" varchar(70),
  "seoDescription" varchar(180),
  "canonicalUrl" varchar(500),
  robots blog_posts_robots_enum NOT NULL DEFAULT 'noindex_follow',
  "publishedAt" timestamptz,
  "createdBy" uuid,
  "updatedBy" uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "FK_blog_posts_category"
    FOREIGN KEY ("categoryId") REFERENCES blog_categories(id)
    ON DELETE SET NULL,
  CONSTRAINT "FK_blog_posts_author"
    FOREIGN KEY ("authorId") REFERENCES blog_authors(id)
    ON DELETE SET NULL,
  CONSTRAINT "FK_blog_posts_createdBy"
    FOREIGN KEY ("createdBy") REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT "FK_blog_posts_updatedBy"
    FOREIGN KEY ("updatedBy") REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_blog_posts_slug_unique"
  ON blog_posts (slug);

CREATE INDEX IF NOT EXISTS "IDX_blog_posts_status_publishedAt"
  ON blog_posts (status, "publishedAt");

CREATE INDEX IF NOT EXISTS "IDX_blog_posts_category_publishedAt"
  ON blog_posts ("categoryId", "publishedAt");

CREATE INDEX IF NOT EXISTS "IDX_blog_posts_author_publishedAt"
  ON blog_posts ("authorId", "publishedAt");

CREATE TABLE IF NOT EXISTS blog_post_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "postId" uuid NOT NULL,
  tag varchar(80) NOT NULL,
  CONSTRAINT "FK_blog_post_tags_post"
    FOREIGN KEY ("postId") REFERENCES blog_posts(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_blog_post_tags_post_tag_unique"
  ON blog_post_tags ("postId", tag);

CREATE INDEX IF NOT EXISTS "IDX_blog_post_tags_tag"
  ON blog_post_tags (tag);

COMMIT;
