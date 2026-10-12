-- Safety inspections and their checklist items.
-- Status transitions and "closed inspections are frozen" are enforced here;
-- src/features/inspections/domain.ts mirrors the rules for the UI (D-006).

create type public.inspection_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
create type public.check_result as enum ('pending', 'pass', 'fail', 'not_applicable');
-- Shared by finding severity and work-order priority.
create type public.severity as enum ('low', 'medium', 'high', 'critical');

-- ---------------------------------------------------------------------------
-- inspections
-- ---------------------------------------------------------------------------
create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  vessel_id uuid not null,
  inspector_id uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(trim(title)) between 3 and 160),
  status public.inspection_status not null default 'scheduled',
  scheduled_for date not null,
  completed_at timestamptz,
  notes text check (char_length(notes) <= 4000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (vessel_id, organization_id)
    references public.vessels (id, organization_id) on delete restrict,
  unique (id, organization_id),
  check ((status = 'completed') = (completed_at is not null))
);

create index inspections_org_status_scheduled_idx
  on public.inspections (organization_id, status, scheduled_for);
-- Composite indexes cover the composite (…, organization_id) foreign keys.
create index inspections_vessel_org_idx on public.inspections (vessel_id, organization_id);
create index inspections_inspector_id_idx on public.inspections (inspector_id);
create index inspections_created_by_idx on public.inspections (created_by);

-- ---------------------------------------------------------------------------
-- inspection_items
-- ---------------------------------------------------------------------------
create table public.inspection_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  inspection_id uuid not null,
  position integer not null check (position >= 1),
  category text not null check (char_length(trim(category)) between 1 and 80),
  description text not null check (char_length(trim(description)) between 1 and 500),
  result public.check_result not null default 'pending',
  finding text check (char_length(finding) <= 2000),
  severity public.severity,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (inspection_id, organization_id)
    references public.inspections (id, organization_id) on delete restrict,
  unique (inspection_id, position),
  unique (id, organization_id),
  -- A failed check always records what was found and how severe it is.
  check ((result = 'fail') = (severity is not null)),
  check (result <> 'fail' or char_length(trim(coalesce(finding, ''))) > 0)
);

create index inspection_items_inspection_org_idx on public.inspection_items (inspection_id, organization_id);
create index inspection_items_org_result_idx on public.inspection_items (organization_id, result);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create trigger inspections_set_updated_at
  before update on public.inspections
  for each row execute function private.set_updated_at();

create trigger inspections_set_created_by
  before insert on public.inspections
  for each row execute function private.set_created_by();

create trigger inspection_items_set_updated_at
  before update on public.inspection_items
  for each row execute function private.set_updated_at();

create function private.inspections_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.inspector_id is not null
     and (tg_op = 'INSERT' or new.inspector_id is distinct from old.inspector_id) then
    perform private.assert_member_with_role(
      new.organization_id,
      new.inspector_id,
      array['admin', 'manager', 'inspector']::public.org_role[],
      'Inspector'
    );
  end if;

  if tg_op = 'UPDATE' then
    if old.status in ('completed', 'cancelled') then
      raise exception 'Inspection is % and can no longer be changed', old.status
        using errcode = 'P0001';
    end if;

    if new.status is distinct from old.status then
      if not (
        (old.status = 'scheduled' and new.status in ('in_progress', 'cancelled'))
        or (old.status = 'in_progress' and new.status in ('completed', 'cancelled'))
      ) then
        raise exception 'Invalid inspection status change: % -> %', old.status, new.status
          using errcode = 'P0001';
      end if;

      if new.status = 'completed' then
        if not exists (select 1 from public.inspection_items i where i.inspection_id = new.id) then
          raise exception 'An inspection needs at least one checklist item before it can be completed'
            using errcode = 'P0001';
        end if;
        if exists (
          select 1 from public.inspection_items i
          where i.inspection_id = new.id and i.result = 'pending'
        ) then
          raise exception 'All checklist items must have a result before completing the inspection'
            using errcode = 'P0001';
        end if;
        new.completed_at := now();
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.inspections_before_write() from public;

create trigger inspections_before_write
  before insert or update on public.inspections
  for each row execute function private.inspections_before_write();

-- Checklist items can only be added or changed while the inspection is open.
create function private.inspection_items_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_status public.inspection_status;
begin
  select i.status into parent_status
  from public.inspections i
  where i.id = new.inspection_id;

  if parent_status in ('completed', 'cancelled') then
    raise exception 'Inspection is % and its checklist can no longer be changed', parent_status
      using errcode = 'P0001';
  end if;

  -- Clear failure details when a result is changed away from "fail".
  if new.result <> 'fail' then
    new.finding := nullif(trim(coalesce(new.finding, '')), '');
    new.severity := null;
  end if;

  return new;
end;
$$;

revoke all on function private.inspection_items_before_write() from public;

create trigger inspection_items_before_write
  before insert or update on public.inspection_items
  for each row execute function private.inspection_items_before_write();

-- ---------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------
alter table public.inspections enable row level security;
alter table public.inspection_items enable row level security;
revoke all on public.inspections, public.inspection_items from anon, authenticated;

grant select on public.inspections, public.inspection_items to authenticated;
-- status is not insertable (always starts 'scheduled'); completed_at is set by trigger.
grant insert (organization_id, vessel_id, inspector_id, title, scheduled_for, notes)
  on public.inspections to authenticated;
grant update (inspector_id, title, status, scheduled_for, notes)
  on public.inspections to authenticated;
grant insert (organization_id, inspection_id, position, category, description)
  on public.inspection_items to authenticated;
grant update (result, finding, severity)
  on public.inspection_items to authenticated;

create policy "inspections: select members"
  on public.inspections for select
  to authenticated
  using (organization_id in (select private.my_org_ids()));

create policy "inspections: insert inspectors"
  on public.inspections for insert
  to authenticated
  with check (
    organization_id in (
      select private.my_org_ids_with_role(array['admin', 'manager', 'inspector']::public.org_role[])
    )
  );

-- Managers can update any inspection; inspectors only the ones assigned to them.
create policy "inspections: update managers or assigned inspector"
  on public.inspections for update
  to authenticated
  using (
    organization_id in (select private.my_org_ids_with_role(array['admin', 'manager']::public.org_role[]))
    or (
      inspector_id = (select auth.uid())
      and organization_id in (select private.my_org_ids_with_role(array['inspector']::public.org_role[]))
    )
  )
  with check (
    organization_id in (select private.my_org_ids_with_role(array['admin', 'manager']::public.org_role[]))
    or (
      inspector_id = (select auth.uid())
      and organization_id in (select private.my_org_ids_with_role(array['inspector']::public.org_role[]))
    )
  );

create policy "inspection_items: select members"
  on public.inspection_items for select
  to authenticated
  using (organization_id in (select private.my_org_ids()));

create policy "inspection_items: insert inspectors"
  on public.inspection_items for insert
  to authenticated
  with check (
    organization_id in (
      select private.my_org_ids_with_role(array['admin', 'manager', 'inspector']::public.org_role[])
    )
  );

create policy "inspection_items: update managers or assigned inspector"
  on public.inspection_items for update
  to authenticated
  using (
    organization_id in (select private.my_org_ids_with_role(array['admin', 'manager']::public.org_role[]))
    or inspection_id in (
      select i.id from public.inspections i where i.inspector_id = (select auth.uid())
    )
  )
  with check (
    organization_id in (select private.my_org_ids_with_role(array['admin', 'manager']::public.org_role[]))
    or inspection_id in (
      select i.id from public.inspections i where i.inspector_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- RPC: create an inspection and its checklist atomically
-- ---------------------------------------------------------------------------
-- security invoker: runs as the caller, so every insert is checked by RLS.
create function public.create_inspection(
  p_vessel_id uuid,
  p_title text,
  p_scheduled_for date,
  p_inspector_id uuid,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_inspection_id uuid;
begin
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'An inspection needs between 1 and 100 checklist items'
      using errcode = '22023';
  end if;

  -- RLS hides vessels from other organizations, so this also checks access.
  select v.organization_id into v_org_id
  from public.vessels v
  where v.id = p_vessel_id;

  if v_org_id is null then
    raise exception 'Vessel not found' using errcode = 'P0002';
  end if;

  insert into public.inspections (organization_id, vessel_id, inspector_id, title, scheduled_for, notes)
  values (v_org_id, p_vessel_id, p_inspector_id, p_title, p_scheduled_for, p_notes)
  returning id into v_inspection_id;

  insert into public.inspection_items (organization_id, inspection_id, position, category, description)
  select v_org_id, v_inspection_id, item.ordinality::int, item.value ->> 'category', item.value ->> 'description'
  from jsonb_array_elements(p_items) with ordinality as item (value, ordinality);

  return v_inspection_id;
end;
$$;

revoke all on function public.create_inspection(uuid, text, date, uuid, text, jsonb) from public, anon;
grant execute on function public.create_inspection(uuid, text, date, uuid, text, jsonb) to authenticated;
