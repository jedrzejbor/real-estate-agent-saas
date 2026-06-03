import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { BlogService } from './blog.service';
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

@Controller('public-blog')
export class PublicBlogController {
  constructor(private readonly blogService: BlogService) {}

  /** GET /api/public-blog/posts — list published blog posts. */
  @Public()
  @Get('posts')
  async findPublishedPosts(@Query() query: PublicBlogPostQueryDto) {
    return this.blogService.findPublicPosts(query);
  }

  /** GET /api/public-blog/categories/:slug — get one public blog category by slug. */
  @Public()
  @Get('categories/:slug')
  async findPublicCategory(@Param('slug') slug: string) {
    return this.blogService.findPublicCategoryBySlug(slug);
  }

  /** GET /api/public-blog/posts/:slug — get one published blog post by slug. */
  @Public()
  @Get('posts/:slug')
  async findPublishedPost(@Param('slug') slug: string) {
    return this.blogService.findPublicPostBySlug(slug);
  }
}

@Controller('admin/blog')
@Roles(UserRole.ADMIN)
export class AdminBlogController {
  constructor(private readonly blogService: BlogService) {}

  /** GET /api/admin/blog/posts — list blog posts for editorial work. */
  @Get('posts')
  async findPosts(@Query() query: BlogPostQueryDto) {
    return this.blogService.findPostsForAdmin(query);
  }

  /** POST /api/admin/blog/posts — create a blog post draft or published post. */
  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  async createPost(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBlogPostDto,
  ) {
    return this.blogService.createPostForAdmin(userId, dto);
  }

  /** GET /api/admin/blog/posts/:id — get one blog post for editing. */
  @Get('posts/:id')
  async findPost(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogService.findPostForAdmin(id);
  }

  /** PATCH /api/admin/blog/posts/:id — update a blog post. */
  @Patch('posts/:id')
  async updatePost(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlogPostDto,
  ) {
    return this.blogService.updatePostForAdmin(userId, id, dto);
  }

  /** POST /api/admin/blog/posts/:id/publish — publish a blog post. */
  @Post('posts/:id/publish')
  async publishPost(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.blogService.publishPostForAdmin(userId, id);
  }

  /** POST /api/admin/blog/posts/:id/unpublish — move a blog post back to draft. */
  @Post('posts/:id/unpublish')
  async unpublishPost(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.blogService.unpublishPostForAdmin(userId, id);
  }

  /** DELETE /api/admin/blog/posts/:id — archive a blog post instead of hard deleting. */
  @Delete('posts/:id')
  async archivePost(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.blogService.archivePostForAdmin(userId, id);
  }

  /** GET /api/admin/blog/categories — list blog categories. */
  @Get('categories')
  async findCategories() {
    return this.blogService.findCategories();
  }

  /** POST /api/admin/blog/categories — create a blog category. */
  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() dto: CreateBlogCategoryDto) {
    return this.blogService.createCategory(dto);
  }

  /** PATCH /api/admin/blog/categories/:id — update a blog category. */
  @Patch('categories/:id')
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlogCategoryDto,
  ) {
    return this.blogService.updateCategory(id, dto);
  }

  /** GET /api/admin/blog/authors — list blog authors. */
  @Get('authors')
  async findAuthors() {
    return this.blogService.findAuthors();
  }

  /** POST /api/admin/blog/authors — create a blog author. */
  @Post('authors')
  @HttpCode(HttpStatus.CREATED)
  async createAuthor(@Body() dto: CreateBlogAuthorDto) {
    return this.blogService.createAuthor(dto);
  }

  /** PATCH /api/admin/blog/authors/:id — update a blog author. */
  @Patch('authors/:id')
  async updateAuthor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlogAuthorDto,
  ) {
    return this.blogService.updateAuthor(id, dto);
  }
}
