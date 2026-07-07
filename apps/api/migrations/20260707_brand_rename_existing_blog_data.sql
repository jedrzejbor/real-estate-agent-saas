-- PodAdresem brand rename cleanup for existing blog data.
-- Safe to run more than once on PostgreSQL.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.blog_categories') IS NOT NULL THEN
    UPDATE blog_categories
    SET
      description = replace(description, 'EstateFlow', 'PodAdresem'),
      "seoTitle" = replace("seoTitle", 'EstateFlow', 'PodAdresem'),
      "seoDescription" = replace("seoDescription", 'EstateFlow', 'PodAdresem'),
      "updatedAt" = now()
    WHERE
      description LIKE '%EstateFlow%'
      OR "seoTitle" LIKE '%EstateFlow%'
      OR "seoDescription" LIKE '%EstateFlow%';
  END IF;

  IF to_regclass('public.blog_authors') IS NOT NULL THEN
    UPDATE blog_authors
    SET
      "displayName" = replace("displayName", 'EstateFlow', 'PodAdresem'),
      slug = CASE
        WHEN slug = 'redakcja-estateflow'
          AND NOT EXISTS (
            SELECT 1
            FROM blog_authors existing_author
            WHERE existing_author.slug = 'redakcja-podadresem'
          )
          THEN 'redakcja-podadresem'
        ELSE slug
      END,
      bio = replace(bio, 'EstateFlow', 'PodAdresem'),
      role = replace(role, 'EstateFlow', 'PodAdresem'),
      expertise = replace(expertise, 'EstateFlow', 'PodAdresem'),
      "updatedAt" = now()
    WHERE
      "displayName" LIKE '%EstateFlow%'
      OR slug LIKE '%estateflow%'
      OR bio LIKE '%EstateFlow%'
      OR role LIKE '%EstateFlow%'
      OR expertise LIKE '%EstateFlow%';
  END IF;

  IF to_regclass('public.blog_posts') IS NOT NULL THEN
    UPDATE blog_posts
    SET
      title = replace(title, 'EstateFlow', 'PodAdresem'),
      excerpt = replace(excerpt, 'EstateFlow', 'PodAdresem'),
      content = replace(content, 'EstateFlow', 'PodAdresem'),
      "coverImageAlt" = replace("coverImageAlt", 'EstateFlow', 'PodAdresem'),
      "seoTitle" = replace("seoTitle", 'EstateFlow', 'PodAdresem'),
      "seoDescription" = replace("seoDescription", 'EstateFlow', 'PodAdresem'),
      "canonicalUrl" = replace("canonicalUrl", 'estateflow.pl', 'podadresem.pl'),
      "updatedAt" = now()
    WHERE
      title LIKE '%EstateFlow%'
      OR excerpt LIKE '%EstateFlow%'
      OR content LIKE '%EstateFlow%'
      OR "coverImageAlt" LIKE '%EstateFlow%'
      OR "seoTitle" LIKE '%EstateFlow%'
      OR "seoDescription" LIKE '%EstateFlow%'
      OR "canonicalUrl" LIKE '%estateflow.pl%';
  END IF;
END $$;

COMMIT;
