import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('listing edit flow regression', () => {
  it('opens dashboard listing edit directly in ListingForm edit mode', () => {
    const source = readSource(
      '../app/(dashboard)/dashboard/listings/[id]/edit/page.tsx',
    );

    expect(source).not.toContain('ListingIntentSelector');
    expect(source).toContain('<ListingForm listing={listing} />');
    expect(source).not.toContain('initialPropertyType');
    expect(source).not.toContain('initialTransactionType');
  });

  it('opens seller listing edit as an edit form, not as the start intent selector', () => {
    const source = readSource(
      '../app/(seller)/seller/listings/[id]/edit/page.tsx',
    );

    expect(source).not.toContain('ListingIntentSelector');
    expect(source).toContain('Edycja ogłoszenia');
    expect(source).toContain('label="Typ transakcji"');
    expect(source).toContain('label="Typ nieruchomości"');
  });
});

function readSource(relativePath: string): string {
  return readFileSync(join(__dirname, relativePath), 'utf8');
}
