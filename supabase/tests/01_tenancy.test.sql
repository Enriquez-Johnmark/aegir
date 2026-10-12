-- Tenancy baseline: RLS everywhere, no anon access, organization isolation,
-- profiles and memberships visibility. Fixture IDs: see supabase/seed.sql.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Structural guarantees ------------------------------------------------------
select is_empty(
  $$ select c.relname from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity $$,
  'RLS is enabled on every table in public'
);

select is_empty(
  $$ select table_name, privilege_type from information_schema.role_table_grants
     where grantee = 'anon' and table_schema = 'public' $$,
  'anon has no table privileges in public'
);

select is_empty(
  $$ select p.proname from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private' and has_function_privilege('anon', p.oid, 'execute') $$,
  'anon cannot execute any private function'
);

select is_empty(
  $$ select p.proname from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and p.prosecdef
       and not exists (select 1 from unnest(p.proconfig) cfg where cfg like 'search_path=%') $$,
  'every security definer function pins search_path'
);

-- Profile trigger ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data)
values ('c1000000-0000-4000-8000-000000000001', 'new.user@example.test', '{"full_name": "New User"}');

select is(
  (select full_name from public.profiles where id = 'c1000000-0000-4000-8000-000000000001'),
  'New User',
  'a profile is created for each new auth user'
);

-- Isolation as a Northwind technician -----------------------------------------
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000004", "role": "authenticated"}';

select results_eq(
  $$ select name from public.organizations $$,
  $$ values ('Northwind Shipping') $$,
  'a member sees only their own organization'
);

select is(
  (select count(*) from public.memberships where organization_id = 'b0000000-0000-4000-8000-000000000001'),
  0::bigint,
  'a member sees no memberships of another organization'
);

select is(
  (select count(*) from public.profiles),
  6::bigint,
  'a member sees exactly their colleagues'' profiles'
);

select is(
  (select count(*) from public.profiles where id = 'b1000000-0000-4000-8000-000000000001'),
  0::bigint,
  'a member cannot see profiles from another organization'
);

update public.profiles set full_name = 'Tomas O.' where id = 'a1000000-0000-4000-8000-000000000004';
update public.profiles set full_name = 'Hacked' where id = 'a1000000-0000-4000-8000-000000000003';

select is(
  (select full_name from public.profiles where id = 'a1000000-0000-4000-8000-000000000004'),
  'Tomas O.',
  'a user can rename their own profile'
);

select is(
  (select full_name from public.profiles where id = 'a1000000-0000-4000-8000-000000000003'),
  'Ingrid Solberg',
  'a user cannot rename a colleague''s profile'
);

select throws_ok(
  $$ insert into public.memberships (organization_id, user_id, role)
     values ('b0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000004', 'admin') $$,
  '42501', null,
  'clients cannot grant themselves memberships'
);

select throws_ok(
  $$ update public.memberships set role = 'admin' where user_id = 'a1000000-0000-4000-8000-000000000004' $$,
  '42501', null,
  'clients cannot change their own role'
);

-- Anonymous ----------------------------------------------------------------
reset role;
set local role anon;
select throws_ok(
  $$ select * from public.organizations $$,
  '42501', null,
  'anon cannot read organizations'
);

select * from finish();
rollback;
