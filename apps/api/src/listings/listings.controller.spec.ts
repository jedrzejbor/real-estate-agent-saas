import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { ListingsController } from './listings.controller';

describe('ListingsController public catalog contract', () => {
  it('keeps public listing catalog available without authentication', () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ListingsController.prototype.findPublicCatalog,
      ),
    ).toBe(true);
  });

  it('keeps public listing details available without authentication', () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ListingsController.prototype.findPublicBySlug,
      ),
    ).toBe(true);
  });
});
