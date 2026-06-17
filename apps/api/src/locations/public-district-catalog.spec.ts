import {
  getPublicDistrictLocationRank,
  isPublicDistrictLocationKind,
} from './public-district-catalog';

describe('public district catalog', () => {
  it('treats PRNG city parts as public district locations', () => {
    expect(isPublicDistrictLocationKind('district')).toBe(true);
    expect(isPublicDistrictLocationKind('neighborhood')).toBe(true);
    expect(isPublicDistrictLocationKind('część miasta')).toBe(true);
    expect(isPublicDistrictLocationKind('miasto')).toBe(false);
  });

  it('prefers manually curated district points over PRNG city parts', () => {
    const seedRank = getPublicDistrictLocationRank({
      kind: 'district',
      source: 'public-district-seed',
      priority: 80,
    });
    const prngRank = getPublicDistrictLocationRank({
      kind: 'część miasta',
      source: 'prng-m1',
      priority: 50,
    });

    expect(seedRank).toBeGreaterThan(prngRank);
  });
});
