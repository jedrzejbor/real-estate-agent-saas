import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BlogService } from './blog.service';
import {
  BlogContentFormat,
  BlogPost,
  BlogPostStatus,
  BlogRobotsDirective,
} from './entities';

function buildPost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'post-1',
    title: 'Jak przygotować mieszkanie do sprzedaży',
    slug: 'jak-przygotowac-mieszkanie-do-sprzedazy',
    excerpt: 'Praktyczny poradnik dla sprzedających.',
    content: '## Przygotowanie\nTreść poradnika.',
    contentFormat: BlogContentFormat.MARKDOWN,
    coverImageUrl: 'https://cdn.example.com/blog/cover.jpg',
    coverImageAlt: 'Salon przygotowany do sesji zdjęciowej',
    status: BlogPostStatus.DRAFT,
    categoryId: null,
    authorId: null,
    seoTitle: 'Jak przygotować mieszkanie do sprzedaży',
    seoDescription: 'Sprawdź, jak przygotować mieszkanie do sprzedaży.',
    canonicalUrl: null,
    robots: BlogRobotsDirective.NOINDEX_FOLLOW,
    publishedAt: null,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    category: null,
    author: null,
    tags: [],
    ...overrides,
  };
}

function buildQueryBuilder(result: BlogPost[], total = result.length) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([result, total]),
  };
}

function buildService(overrides: { post?: BlogPost | null } = {}) {
  const defaultPost =
    overrides.post === undefined ? buildPost() : overrides.post;
  const blogPostRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({
      id: 'post-1',
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      ...value,
    })),
    findOne: jest.fn().mockResolvedValue(defaultPost),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn(),
  };
  const blogCategoryRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({
      id: 'category-1',
      name: 'Sprzedaż',
      slug: 'sprzedaz',
      description: 'Poradniki o sprzedaży nieruchomości.',
      seoTitle: 'Sprzedaż nieruchomości',
      seoDescription: 'Poradniki o sprzedaży nieruchomości.',
      sortOrder: 0,
      isIndexable: true,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-02T00:00:00.000Z'),
    }),
    exist: jest.fn().mockResolvedValue(true),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'category-1', ...value })),
  };
  const blogAuthorRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    exist: jest.fn().mockResolvedValue(true),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'author-1', ...value })),
  };
  const blogPostTagRepo = {
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
    create: jest.fn((value) => value),
    save: jest.fn().mockResolvedValue([]),
  };

  return {
    service: new BlogService(
      blogPostRepo as never,
      blogCategoryRepo as never,
      blogAuthorRepo as never,
      blogPostTagRepo as never,
    ),
    blogPostRepo,
    blogCategoryRepo,
    blogAuthorRepo,
    blogPostTagRepo,
  };
}

describe('BlogService', () => {
  it('creates a draft without requiring SEO publication fields', async () => {
    const draft = buildPost({
      excerpt: null,
      content: '',
      coverImageUrl: null,
      coverImageAlt: null,
      seoTitle: null,
      seoDescription: null,
    });
    const { service, blogPostRepo } = buildService({ post: draft });

    const result = await service.createPostForAdmin('user-1', {
      title: 'Szkic wpisu',
      slug: 'szkic-wpisu',
    });

    expect(blogPostRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Szkic wpisu',
        slug: 'szkic-wpisu',
        status: BlogPostStatus.DRAFT,
        robots: BlogRobotsDirective.NOINDEX_FOLLOW,
      }),
    );
    expect(result.status).toBe(BlogPostStatus.DRAFT);
  });

  it('blocks publishing without required SEO and content fields', async () => {
    const { service } = buildService();

    await expect(
      service.createPostForAdmin('user-1', {
        title: 'Niekompletny wpis',
        slug: 'niekompletny-wpis',
        status: BlogPostStatus.PUBLISHED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('publishes a complete post and forces index_follow robots', async () => {
    const post = buildPost();
    const { service, blogPostRepo } = buildService({ post });

    await service.publishPostForAdmin('user-1', 'post-1');

    expect(blogPostRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: BlogPostStatus.PUBLISHED,
        robots: BlogRobotsDirective.INDEX_FOLLOW,
        updatedBy: 'user-1',
      }),
    );
  });

  it('archives a post instead of hard deleting it', async () => {
    const post = buildPost({ status: BlogPostStatus.PUBLISHED });
    const { service, blogPostRepo } = buildService({ post });

    await service.archivePostForAdmin('user-1', 'post-1');

    expect(blogPostRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: BlogPostStatus.ARCHIVED,
        robots: BlogRobotsDirective.NOINDEX_FOLLOW,
      }),
    );
  });

  it('lists only public published posts with publication date in the past', async () => {
    const publishedPost = buildPost({
      status: BlogPostStatus.PUBLISHED,
      robots: BlogRobotsDirective.INDEX_FOLLOW,
      publishedAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    const queryBuilder = buildQueryBuilder([publishedPost]);
    const { service, blogPostRepo } = buildService();
    blogPostRepo.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findPublicPosts({ page: 1, limit: 12 });

    expect(queryBuilder.where).toHaveBeenCalledWith('post.status = :status', {
      status: BlogPostStatus.PUBLISHED,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'post.publishedAt <= :now',
      { now: expect.any(Date) },
    );
    expect(result.data[0]).not.toHaveProperty('content');
  });

  it('throws for missing admin post', async () => {
    const { service } = buildService({ post: null });

    await expect(service.findPostForAdmin('post-404')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns public category indexability based on published post count', async () => {
    const { service, blogPostRepo } = buildService();
    blogPostRepo.count.mockResolvedValue(3);

    const result = await service.findPublicCategoryBySlug('sprzedaz');

    expect(blogPostRepo.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        categoryId: 'category-1',
        status: BlogPostStatus.PUBLISHED,
        publishedAt: expect.any(Object),
      }),
    });
    expect(result).toMatchObject({
      id: 'category-1',
      slug: 'sprzedaz',
      isIndexable: true,
      publishedPostCount: 3,
    });
  });
});
