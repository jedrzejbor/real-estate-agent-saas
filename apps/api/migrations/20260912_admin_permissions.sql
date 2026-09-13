alter table users
  add column if not exists admin_permissions text[] null;

alter table users
  add constraint chk_users_admin_permissions_role
  check (
    admin_permissions is null
    or role = 'admin'
  );

