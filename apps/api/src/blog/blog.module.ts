import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminBlogController, PublicBlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogAuthor, BlogCategory, BlogPost, BlogPostTag } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlogPost, BlogCategory, BlogAuthor, BlogPostTag]),
  ],
  controllers: [PublicBlogController, AdminBlogController],
  providers: [BlogService],
  exports: [TypeOrmModule, BlogService],
})
export class BlogModule {}
