-- Vessels: the fleet register. Never hard-deleted; retired via status.

create type public.vessel_type as enum (
  'bulk_carrier',
  'tanker',
  'container',
  'general_cargo',
  'offshore_support',
  'passenger',
  'tug',
  'other'
);

create type public.vessel_status as enum ('active', 'in_maintenance', 'laid_up', 'decommissioned');

-- IMO ship identification number: 7 digits where the last is a check digit,
-- sum(d1*7 + d2*6 + ... + d6*2) mod 10. Mirrored in src/features/vessels/schemas.ts.
create function private.is_valid_imo(imo text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select imo ~ '^[0-9]{7}$'
    and (
      substr(imo, 1, 1)::int * 7 + substr(imo, 2, 1)::int * 6 + substr(imo, 3, 1)::int * 5
      + substr(imo, 4, 1)::int * 4 + substr(imo, 5, 1)::int * 3 + substr(imo, 6, 1)::int * 2
    ) % 10 = substr(imo, 7, 1)::int;
$$;

revoke all on function private.is_valid_imo(text) from public;
grant execute on function private.is_valid_imo(text) to authenticated;

create table public.vessels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 120),
  imo_number text not null check (private.is_valid_imo(imo_number)),
  vessel_type public.vessel_type not null,
  flag_state text not null check (char_length(trim(flag_state)) between 2 and 60),
  status public.vessel_status not null default 'active',
  year_built integer check (year_built between 1900 and 2100),
  gross_tonnage integer check (gross_tonnage > 0),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, imo_number),
  -- Target for composite foreign keys that keep children in the same organization.
  unique (id, organization_id)
);

-- organization_id is covered by the (organization_id, imo_number) unique index.
create index vessels_organization_id_status_idx on public.vessels (organization_id, status);
create index vessels_created_by_idx on public.vessels (created_by);

create trigger vessels_set_updated_at
  before update on public.vessels
  for each row execute function private.set_updated_at();

create trigger vessels_set_created_by
  before insert on public.vessels
  for each row execute function private.set_created_by();

-- ---------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------
alter table public.vessels enable row level security;
revoke all on public.vessels from anon, authenticated;

-- Column-level grants: organization_id and created_by can never be changed by
-- clients after insert, and created_by is never client-supplied.
grant select on public.vessels to authenticated;
grant insert (organization_id, name, imo_number, vessel_type, flag_state, status, year_built, gross_tonnage)
  on public.vessels to authenticated;
grant update (name, imo_number, vessel_type, flag_state, status, year_built, gross_tonnage)
  on public.vessels to authenticated;

create policy "vessels: select members"
  on public.vessels for select
  to authenticated
  using (organization_id in (select private.my_org_ids()));

create policy "vessels: insert managers"
  on public.vessels for insert
  to authenticated
  with check (
    organization_id in (select private.my_org_ids_with_role(array['admin', 'manager']::public.org_role[]))
  );

create policy "vessels: update managers"
  on public.vessels for update
  to authenticated
  using (
    organization_id in (select private.my_org_ids_with_role(array['admin', 'manager']::public.org_role[]))
  )
  with check (
    organization_id in (select private.my_org_ids_with_role(array['admin', 'manager']::public.org_role[]))
  );
