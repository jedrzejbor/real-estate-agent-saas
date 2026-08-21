import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('listing creation boundary regression', () => {
  it('keeps the public submission wizard outside dashboard-specific components', () => {
    const source = readSource('../app/(public)/dodaj-oferte/page.tsx');

    expect(source).not.toContain('@/components/dashboard');
    expect(source).not.toContain('@/app/(dashboard)');
    expect(source).not.toContain('ListingForm');
    expect(source).toContain(
      '@/components/public-listing-submissions/public-listing-submission-process',
    );
  });

  it('keeps dashboard listing creation outside public submission modules', () => {
    const source = readSource('../app/(dashboard)/dashboard/listings/new/page.tsx');

    expect(source).not.toContain('@/lib/public-listing-wizard');
    expect(source).not.toContain('@/lib/public-listing-submissions');
    expect(source).not.toContain('@/lib/public-listing-form-fields');
    expect(source).not.toContain('PublicListingSubmissionProcess');
  });

  it('stores public submission UI outside the shared listing components barrel', () => {
    const listingComponentsIndex = readSource('../components/listings/index.ts');

    expect(
      existsSync(
        join(
          __dirname,
          '../components/public-listing-submissions/public-listing-submission-process.tsx',
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(
          __dirname,
          '../components/listings/public-listing-submission-process.tsx',
        ),
      ),
    ).toBe(false);
    expect(listingComponentsIndex).not.toContain(
      'public-listing-submission-process',
    );
  });
});

function readSource(relativePath: string): string {
  return readFileSync(join(__dirname, relativePath), 'utf8');
}
