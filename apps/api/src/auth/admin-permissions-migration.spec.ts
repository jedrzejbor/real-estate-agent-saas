import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AdminPermission } from '../common/enums';

describe('admin permissions migration', () => {
  const migration = readFileSync(
    join(__dirname, '../../migrations/20260912_admin_permissions.sql'),
    'utf8',
  );

  it('adds explicit admin permission storage to users', () => {
    expect(Object.values(AdminPermission)).toEqual([
      'listing_commerce:read',
      'listing_commerce:manage_products',
      'listing_commerce:manage_promotions',
      'listing_commerce:manage_grants',
      'listing_commerce:manage_adjustments',
    ]);
    expect(migration).toContain('add column if not exists admin_permissions');
    expect(migration).toContain('text[] null');
  });

  it('keeps admin permissions restricted to admin users', () => {
    expect(migration).toContain('chk_users_admin_permissions_role');
    expect(migration).toContain("or role = 'admin'");
  });
});

