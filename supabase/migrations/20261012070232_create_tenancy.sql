-- Tenancy foundation: organizations, user profiles, memberships with roles,
-- and the private helper functions every RLS policy builds on.
-- See docs/DATA_MODEL.md and docs/SECURITY.md.

-- ---------------------------------------------------------------------------
-- Secure-by-default privileges
-- ---------------------------------------------------------------------------
-- The Supabase image still grants ALL on new public tables, sequences and
-- functions to anon/authenticated by default. Remove that so every object is
-- private until a migration grants exactly what its RLS policies allow (D-009).
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- Helper functions live in a schema the Data API does not expose.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.org_role as enum ('admin', 'manager', 'inspector', 'technician', 'viewer');

-- ---------------------------------------------------------------------------
-- Shared trigger functions
-- ---------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Stamps created_by with the acting user so clients cannot forge authorship.
-- Trusted contexts without a user JWT (migrations, seed) keep the given value.
create function private.set_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_by := coalesce((select auth.uid()), new.created_by);
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;
revoke all on function private.set_created_by() from public;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Creates the profile for every new auth user. full_name from user metadata is
-- display-only: user_metadata is user-editable and never used for authorization.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'User'
      ),
      120
    )
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------------------
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- organization_id is covered by the unique index above.
create index memberships_user_id_idx on public.memberships (user_id);

create trigger memberships_set_updated_at
  before update on public.memberships
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helper functions
-- ---------------------------------------------------------------------------
-- security definer so policies on memberships do not recurse. They only ever
-- answer questions about the calling user (auth.uid()).
-- Policies use them as `organization_id in (select private.my_org_ids())`:
-- an uncorrelated subquery that runs once per statement, not once per row.
create function private.my_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id
  from public.memberships m
  where m.user_id = (select auth.uid());
$$;

create function private.my_org_ids_with_role(roles public.org_role[])
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id
  from public.memberships m
  where m.user_id = (select auth.uid())
    and m.role = any (roles);
$$;

-- Users who share at least one organization with the calling user (incl. self).
create function private.my_colleague_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct theirs.user_id
  from public.memberships mine
  join public.memberships theirs on theirs.organization_id = mine.organization_id
  where mine.user_id = (select auth.uid());
$$;

-- Raises unless user_id belongs to org_id with one of the given roles. Used by
-- triggers to validate assignees/inspectors/recipients.
create function private.assert_member_with_role(
  p_org_id uuid,
  p_user_id uuid,
  p_roles public.org_role[],
  p_label text
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Callers outside the organization learn nothing about its members.
  if (select auth.uid()) is not null
     and p_org_id not in (select private.my_org_ids()) then
    raise exception 'permission denied for organization' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.memberships m
    where m.organization_id = p_org_id
      and m.user_id = p_user_id
      and m.role = any (p_roles)
  ) then
    raise exception '% must be a member of this organization with role %', p_label, p_roles
      using errcode = '23514';
  end if;
end;
$$;

revoke all on function private.my_org_ids() from public;
revoke all on function private.my_org_ids_with_role(public.org_role[]) from public;
revoke all on function private.my_colleague_ids() from public;
revoke all on function private.assert_member_with_role(uuid, uuid, public.org_role[], text) from public;
grant execute on function private.my_org_ids() to authenticated;
grant execute on function private.my_org_ids_with_role(public.org_role[]) to authenticated;
grant execute on function private.my_colleague_ids() to authenticated;
grant execute on function private.assert_member_with_role(uuid, uuid, public.org_role[], text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row-Level Security and grants
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;

revoke all on public.organizations, public.profiles, public.memberships from anon, authenticated;

-- organizations: members can read their organizations. Org setup is seed-only.
grant select on public.organizations to authenticated;

create policy "organizations: select members"
  on public.organizations for select
  to authenticated
  using (id in (select private.my_org_ids()));

-- profiles: read yourself and colleagues; edit only your own display name.
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy "profiles: select self and colleagues"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or id in (select private.my_colleague_ids()));

create policy "profiles: update self"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- memberships: members can see who belongs to their organizations.
-- Membership management is seed-only in the MVP (no write grants).
grant select on public.memberships to authenticated;

create policy "memberships: select members"
  on public.memberships for select
  to authenticated
  using (organization_id in (select private.my_org_ids()));
