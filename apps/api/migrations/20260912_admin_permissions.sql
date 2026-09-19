alter table users
  add column if not exists admin_permissions text[] null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_users_admin_permissions_role'
      and conrelid = 'users'::regclass
  ) then
    alter table users
      add constraint chk_users_admin_permissions_role
      check (
        admin_permissions is null
        or role = 'admin'
      );
  end if;
end $$;
