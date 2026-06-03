import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, LessThanOrEqual, Repository } from 'typeorm';
import {
  BlogAuthor,
  BlogCategory,
  BlogPost,
  BlogPostStatus,
  BlogPostTag,
  BlogRobotsDirective,
} from './entities';
import {
  BlogPostQueryDto,
  CreateBlogAuthorDto,
  CreateBlogCategoryDto,
  CreateBlogPostDto,
  PublicBlogPostQueryDto,
  UpdateBlogAuthorDto,
  UpdateBlogCategoryDto,
  UpdateBlogPostDto,
} from './dto';

const UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost)
    private readonly blogPostRepo: Repository<BlogPost>,
    @InjectRepository(BlogCategory)
    private readonly blogCategoryRepo: Repository<BlogCategory>,
    @InjectRepository(BlogAuthor)
    private readonly blogAuthorRepo: Repository<BlogAuthor>,
    @InjectRepository(BlogPostTag)
    private readonly blogPostTagRepo: Repository<BlogPostTag>,
  ) {}

  async findPostsForAdmin(query: BlogPostQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.blogPostRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.tags', 'tags')
      .orderBy('post.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      qb.andWhere('post.status = :status', { status: query.status });
    }

    if (query.categoryId) {
      qb.andWhere('post.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.authorId) {
      qb.andWhere('post.authorId = :authorId', { authorId: query.authorId });
    }

    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('LOWER(post.title) LIKE LOWER(:search)', {
              search: `%${search}%`,
            })
            .orWhere('LOWER(post.slug) LIKE LOWER(:search)', {
              search: `%${search}%`,
            })
            .orWhere('LOWER(post.excerpt) LIKE LOWER(:search)', {
              search: `%${search}%`,
            });
        }),
      );
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((post) => this.toAdminPostView(post)),
      meta: this.toPaginationMeta(total, page, limit),
    };
  }

  async findPostForAdmin(id: string) {
    const post = await this.blogPostRepo.findOne({
      where: { id },
      relations: ['category', 'author', 'tags'],
    });

    if (!post) {
      throw new NotFoundException('Wpis blogowy nie znaleziony');
    }

    return this.toAdminPostView(post);
  }

  async createPostForAdmin(userId: string, dto: CreateBlogPostDto) {
    await this.assertCategoryAndAuthorExist(dto.categoryId, dto.authorId);

    const status = dto.status ?? BlogPostStatus.DRAFT;
    const post = this.blogPostRepo.create({
      title: this.requiredTrim(dto.title, 'Tytuł jest wymagany'),
      slug: this.normalizeSlug(dto.slug),
      excerpt: this.optionalTrim(dto.excerpt),
      content: this.sanitizeContent(dto.content ?? ''),
      contentFormat: dto.contentFormat,
      coverImageUrl: this.optionalTrim(dto.coverImageUrl),
      coverImageAlt: this.optionalTrim(dto.coverImageAlt),
      status,
      categoryId: dto.categoryId ?? null,
      authorId: dto.authorId ?? null,
      seoTitle: this.optionalTrim(dto.seoTitle),
      seoDescription: this.optionalTrim(dto.seoDescription),
      canonicalUrl: this.optionalTrim(dto.canonicalUrl),
      robots:
        status === BlogPostStatus.PUBLISHED
          ? BlogRobotsDirective.INDEX_FOLLOW
          : (dto.robots ?? BlogRobotsDirective.NOINDEX_FOLLOW),
      publishedAt: this.resolvePublishedAt(status, dto.publishedAt),
      createdBy: userId,
      updatedBy: userId,
    });

    this.assertPublishable(post);

    try {
      const savedPost = await this.blogPostRepo.save(post);
      await this.replaceTags(savedPost.id, dto.tags ?? []);
      return this.findPostForAdmin(savedPost.id);
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async updatePostForAdmin(userId: string, id: string, dto: UpdateBlogPostDto) {
    const post = await this.blogPostRepo.findOne({
      where: { id },
      relations: ['tags'],
    });

    if (!post) {
      throw new NotFoundException('Wpis blogowy nie znaleziony');
    }

    await this.assertCategoryAndAuthorExist(dto.categoryId, dto.authorId);

    if (dto.title !== undefined) {
      post.title = this.requiredTrim(dto.title, 'Tytuł jest wymagany');
    }

    if (dto.slug !== undefined) {
      post.slug = this.normalizeSlug(dto.slug);
    }

    if (dto.excerpt !== undefined) {
      post.excerpt = this.optionalTrim(dto.excerpt);
    }

    if (dto.content !== undefined) {
      post.content = this.sanitizeContent(dto.content);
    }

    if (dto.contentFormat !== undefined) {
      post.contentFormat = dto.contentFormat;
    }

    if (dto.coverImageUrl !== undefined) {
      post.coverImageUrl = this.optionalTrim(dto.coverImageUrl);
    }

    if (dto.coverImageAlt !== undefined) {
      post.coverImageAlt = this.optionalTrim(dto.coverImageAlt);
    }

    if (dto.categoryId !== undefined) {
      post.categoryId = dto.categoryId ?? null;
    }

    if (dto.authorId !== undefined) {
      post.authorId = dto.authorId ?? null;
    }

    if (dto.seoTitle !== undefined) {
      post.seoTitle = this.optionalTrim(dto.seoTitle);
    }

    if (dto.seoDescription !== undefined) {
      post.seoDescription = this.optionalTrim(dto.seoDescription);
    }

    if (dto.canonicalUrl !== undefined) {
      post.canonicalUrl = this.optionalTrim(dto.canonicalUrl);
    }

    if (dto.robots !== undefined) {
      post.robots = dto.robots;
    }

    if (dto.status !== undefined) {
      post.status = dto.status;
    }

    if (dto.publishedAt !== undefined) {
      post.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;
    } else if (post.status === BlogPostStatus.PUBLISHED && !post.publishedAt) {
      post.publishedAt = new Date();
    }

    if (post.status === BlogPostStatus.PUBLISHED) {
      post.robots = BlogRobotsDirective.INDEX_FOLLOW;
    } else {
      post.robots = BlogRobotsDirective.NOINDEX_FOLLOW;
    }

    post.updatedBy = userId;
    this.assertPublishable(post);

    try {
      const savedPost = await this.blogPostRepo.save(post);
      if (dto.tags !== undefined) {
        await this.replaceTags(savedPost.id, dto.tags);
      }
      return this.findPostForAdmin(savedPost.id);
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async publishPostForAdmin(userId: string, id: string) {
    return this.updatePostForAdmin(userId, id, {
      status: BlogPostStatus.PUBLISHED,
      publishedAt: new Date().toISOString(),
      robots: BlogRobotsDirective.INDEX_FOLLOW,
    });
  }

  async unpublishPostForAdmin(userId: string, id: string) {
    return this.updatePostForAdmin(userId, id, {
      status: BlogPostStatus.DRAFT,
      robots: BlogRobotsDirective.NOINDEX_FOLLOW,
    });
  }

  async archivePostForAdmin(userId: string, id: string) {
    return this.updatePostForAdmin(userId, id, {
      status: BlogPostStatus.ARCHIVED,
      robots: BlogRobotsDirective.NOINDEX_FOLLOW,
    });
  }

  async findPublicPosts(query: PublicBlogPostQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const qb = this.blogPostRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.tags', 'tags')
      .where('post.status = :status', { status: BlogPostStatus.PUBLISHED })
      .andWhere('post.publishedAt <= :now', { now: new Date() })
      .orderBy('post.publishedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.categoryId) {
      qb.andWhere('post.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((post) => this.toPublicPostListView(post)),
      meta: this.toPaginationMeta(total, page, limit),
    };
  }

  async findPublicPostBySlug(slug: string) {
    const post = await this.blogPostRepo.findOne({
      where: {
        slug,
        status: BlogPostStatus.PUBLISHED,
        publishedAt: LessThanOrEqual(new Date()),
      },
      relations: ['category', 'author', 'tags'],
    });

    if (!post) {
      throw new NotFoundException('Wpis blogowy nie znaleziony');
    }

    return this.toPublicPostDetailView(post);
  }

  async findPublicCategoryBySlug(slug: string) {
    const category = await this.blogCategoryRepo.findOne({
      where: { slug: this.normalizeSlug(slug) },
    });

    if (!category) {
      throw new NotFoundException('Kategoria bloga nie znaleziona');
    }

    const publishedPostCount = await this.blogPostRepo.count({
      where: {
        categoryId: category.id,
        status: BlogPostStatus.PUBLISHED,
        publishedAt: LessThanOrEqual(new Date()),
      },
    });

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      seoTitle: category.seoTitle,
      seoDescription: category.seoDescription,
      isIndexable: category.isIndexable && publishedPostCount > 0,
      publishedPostCount,
      updatedAt: category.updatedAt,
    };
  }

  async findCategories() {
    return this.blogCategoryRepo.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async createCategory(dto: CreateBlogCategoryDto) {
    const category = this.blogCategoryRepo.create({
      name: this.requiredTrim(dto.name, 'Nazwa kategorii jest wymagana'),
      slug: this.normalizeSlug(dto.slug),
      description: this.optionalTrim(dto.description),
      seoTitle: this.optionalTrim(dto.seoTitle),
      seoDescription: this.optionalTrim(dto.seoDescription),
      sortOrder: dto.sortOrder ?? 0,
      isIndexable: dto.isIndexable ?? false,
    });

    try {
      return await this.blogCategoryRepo.save(category);
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async updateCategory(id: string, dto: UpdateBlogCategoryDto) {
    const category = await this.blogCategoryRepo.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException('Kategoria bloga nie znaleziona');
    }

    if (dto.name !== undefined) {
      category.name = this.requiredTrim(
        dto.name,
        'Nazwa kategorii jest wymagana',
      );
    }
    if (dto.slug !== undefined) {
      category.slug = this.normalizeSlug(dto.slug);
    }
    if (dto.description !== undefined) {
      category.description = this.optionalTrim(dto.description);
    }
    if (dto.seoTitle !== undefined) {
      category.seoTitle = this.optionalTrim(dto.seoTitle);
    }
    if (dto.seoDescription !== undefined) {
      category.seoDescription = this.optionalTrim(dto.seoDescription);
    }
    if (dto.sortOrder !== undefined) {
      category.sortOrder = dto.sortOrder;
    }
    if (dto.isIndexable !== undefined) {
      category.isIndexable = dto.isIndexable;
    }

    try {
      return await this.blogCategoryRepo.save(category);
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findAuthors() {
    return this.blogAuthorRepo.find({ order: { displayName: 'ASC' } });
  }

  async createAuthor(dto: CreateBlogAuthorDto) {
    const author = this.blogAuthorRepo.create({
      displayName: this.requiredTrim(
        dto.displayName,
        'Nazwa autora jest wymagana',
      ),
      slug: this.normalizeSlug(dto.slug),
      bio: this.optionalTrim(dto.bio),
      avatarUrl: this.optionalTrim(dto.avatarUrl),
      role: this.optionalTrim(dto.role),
      expertise: this.optionalTrim(dto.expertise),
      sameAsLinks: dto.sameAsLinks ?? [],
    });

    try {
      return await this.blogAuthorRepo.save(author);
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async updateAuthor(id: string, dto: UpdateBlogAuthorDto) {
    const author = await this.blogAuthorRepo.findOne({ where: { id } });

    if (!author) {
      throw new NotFoundException('Autor bloga nie znaleziony');
    }

    if (dto.displayName !== undefined) {
      author.displayName = this.requiredTrim(
        dto.displayName,
        'Nazwa autora jest wymagana',
      );
    }
    if (dto.slug !== undefined) {
      author.slug = this.normalizeSlug(dto.slug);
    }
    if (dto.bio !== undefined) {
      author.bio = this.optionalTrim(dto.bio);
    }
    if (dto.avatarUrl !== undefined) {
      author.avatarUrl = this.optionalTrim(dto.avatarUrl);
    }
    if (dto.role !== undefined) {
      author.role = this.optionalTrim(dto.role);
    }
    if (dto.expertise !== undefined) {
      author.expertise = this.optionalTrim(dto.expertise);
    }
    if (dto.sameAsLinks !== undefined) {
      author.sameAsLinks = dto.sameAsLinks;
    }

    try {
      return await this.blogAuthorRepo.save(author);
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  private async assertCategoryAndAuthorExist(
    categoryId?: string | null,
    authorId?: string | null,
  ) {
    if (categoryId) {
      const categoryExists = await this.blogCategoryRepo.exist({
        where: { id: categoryId },
      });
      if (!categoryExists) {
        throw new BadRequestException('Wybrana kategoria bloga nie istnieje');
      }
    }

    if (authorId) {
      const authorExists = await this.blogAuthorRepo.exist({
        where: { id: authorId },
      });
      if (!authorExists) {
        throw new BadRequestException('Wybrany autor bloga nie istnieje');
      }
    }
  }

  private assertPublishable(post: BlogPost) {
    if (post.status !== BlogPostStatus.PUBLISHED) {
      return;
    }

    const requiredFields = [
      ['excerpt', post.excerpt],
      ['content', post.content],
      ['seoTitle', post.seoTitle],
      ['seoDescription', post.seoDescription],
      ['coverImageUrl', post.coverImageUrl],
      ['coverImageAlt', post.coverImageAlt],
    ];
    const missingFields = requiredFields
      .filter(([, value]) => !this.optionalTrim(value as string | null))
      .map(([field]) => field);

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Nie można opublikować wpisu bez pól: ${missingFields.join(', ')}`,
      );
    }

    if (this.containsH1(post.content)) {
      throw new BadRequestException(
        'Treść wpisu nie może zawierać nagłówka H1',
      );
    }
  }

  private resolvePublishedAt(
    status: BlogPostStatus,
    publishedAt?: string | null,
  ) {
    if (publishedAt) {
      return new Date(publishedAt);
    }

    if (status === BlogPostStatus.PUBLISHED) {
      return new Date();
    }

    return null;
  }

  private async replaceTags(postId: string, tags: string[]) {
    const normalizedTags = Array.from(
      new Set(
        tags
          .map((tag) => tag.trim().toLowerCase())
          .filter((tag) => tag.length > 0),
      ),
    ).slice(0, 20);

    await this.blogPostTagRepo.delete({ postId });

    if (normalizedTags.length === 0) {
      return;
    }

    await this.blogPostTagRepo.save(
      normalizedTags.map((tag) => this.blogPostTagRepo.create({ postId, tag })),
    );
  }

  private toAdminPostView(post: BlogPost) {
    return {
      ...this.toBasePostView(post),
      content: post.content,
      contentFormat: post.contentFormat,
      status: post.status,
      robots: post.robots,
      createdBy: post.createdBy,
      updatedBy: post.updatedBy,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  private toPublicPostListView(post: BlogPost) {
    return this.toBasePostView(post);
  }

  private toPublicPostDetailView(post: BlogPost) {
    return {
      ...this.toBasePostView(post),
      content: post.content,
      contentFormat: post.contentFormat,
    };
  }

  private toBasePostView(post: BlogPost) {
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      coverImageUrl: post.coverImageUrl,
      coverImageAlt: post.coverImageAlt,
      category: post.category
        ? {
            id: post.category.id,
            name: post.category.name,
            slug: post.category.slug,
          }
        : null,
      author: post.author
        ? {
            id: post.author.id,
            displayName: post.author.displayName,
            slug: post.author.slug,
            bio: post.author.bio,
            avatarUrl: post.author.avatarUrl,
            role: post.author.role,
            expertise: post.author.expertise,
            sameAsLinks: post.author.sameAsLinks,
          }
        : null,
      tags: (post.tags ?? []).map((tag) => tag.tag).sort(),
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      canonicalUrl: post.canonicalUrl,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
    };
  }

  private toPaginationMeta(total: number, page: number, limit: number) {
    return {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private requiredTrim(value: string, message: string) {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      throw new BadRequestException(message);
    }

    return trimmedValue;
  }

  private optionalTrim(value?: string | null) {
    const trimmedValue = value?.trim();
    return trimmedValue ? trimmedValue : null;
  }

  private normalizeSlug(slug: string) {
    return slug.trim().toLowerCase();
  }

  private sanitizeContent(content: string) {
    return content
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
      .replace(/<(iframe|object|embed|link|meta)\b[\s\S]*?>/gi, '')
      .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '');
  }

  private containsH1(content: string) {
    return /(^|\n)\s*#\s+/.test(content) || /<h1\b/i.test(content);
  }

  private handlePersistenceError(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === UNIQUE_VIOLATION_CODE
    ) {
      throw new BadRequestException('Slug musi być unikalny');
    }

    throw error;
  }
}
