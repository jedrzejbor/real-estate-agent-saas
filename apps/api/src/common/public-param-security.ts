import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_PUBLIC_SLUG_LENGTH = 160;

@Injectable()
export class PublicSlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const slug = value?.trim();

    if (
      !slug ||
      slug.length > MAX_PUBLIC_SLUG_LENGTH ||
      !PUBLIC_SLUG_PATTERN.test(slug)
    ) {
      throw new BadRequestException('Nieprawidłowy identyfikator publiczny');
    }

    return slug;
  }
}
