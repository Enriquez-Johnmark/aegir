-- Task handovers between crew members. Content is immutable once written;
-- the only change allowed is the recipient acknowledging it.

create type public.handover_status as enum ('pending', 'acknowledged');

create table public.handovers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  vessel_id uuid,
  work_order_id uuid,
  from_user_id uuid not null references public.profiles (id) on delete restrict,
  to_user_id uuid not null references public.profiles (id) on delete restrict,
  summary text not null check (char_length(trim(summary)) between 3 and 200),
  outstanding_tasks text not null check (char_length(trim(outstanding_tasks)) between 1 and 4000),
  status public.handover_status not null default 'pending',
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (vessel_id, organization_id)
    references public.vessels (id, organization_id) on delete restrict,
  foreign key (work_order_id, organization_id)
    references public.work_orders (id, organization_id) on delete restrict,
  check (vessel_id is not null or work_order_id is not null),
  check (from_user_id <> to_user_id),
  check ((status = 'acknowledged') = (acknowledged_at is not null))
);

create index handovers_org_status_created_idx on public.handovers (organization_id, status, created_at desc);
-- Composite indexes cover the composite (…, organization_id) foreign keys.
create index handovers_vessel_org_idx on public.handovers (vessel_id, organization_id);
create index handovers_work_order_org_idx on public.handovers (work_order_id, organization_id);
create index handovers_from_user_id_idx on public.handovers (from_user_id);
create index handovers_to_user_id_idx on public.handovers (to_user_id);

create trigger handovers_set_updated_at
  before update on public.handovers
  for each row execute function private.set_updated_at();

create function private.handovers_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_work_order_vessel_id uuid;
begin
  if tg_op = 'INSERT' then
    -- The sender is always the acting user; trusted contexts (seed) keep the given value.
    new.from_user_id := coalesce((select auth.uid()), new.from_user_id);

    perform private.assert_member_with_role(
      new.organization_id,
      new.to_user_id,
      array['admin', 'manager', 'inspector', 'technician']::public.org_role[],
      'Recipient'
    );

    if new.work_order_id is not null then
      select wo.vessel_id into v_work_order_vessel_id
      from public.work_orders wo
      where wo.id = new.work_order_id;

      if new.vessel_id is null then
        new.vessel_id := v_work_order_vessel_id;
      elsif new.vessel_id is distinct from v_work_order_vessel_id then
        raise exception 'Handover vessel must match the work order vessel' using errcode = 'P0001';
      end if;
    end if;

    return new;
  end if;

  -- UPDATE: only pending -> acknowledged.
  if old.status = 'acknowledged' then
    raise exception 'Acknowledged handovers can no longer be changed' using errcode = 'P0001';
  end if;
  if new.status <> 'acknowledged' then
    raise exception 'A pending handover can only be acknowledged' using errcode = 'P0001';
  end if;

  new.acknowledged_at := now();
  return new;
end;
$$;

revoke all on function private.handovers_before_write() from public;

create trigger handovers_before_write
  before insert or update on public.handovers
  for each row execute function private.handovers_before_write();

-- ---------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------
alter table public.handovers enable row level security;
revoke all on public.handovers from anon, authenticated;

grant select on public.handovers to authenticated;
-- from_user_id is set by trigger; only status is ever updatable.
grant insert (organization_id, vessel_id, work_order_id, to_user_id, summary, outstanding_tasks)
  on public.handovers to authenticated;
grant update (status) on public.handovers to authenticated;

create policy "handovers: select members"
  on public.handovers for select
  to authenticated
  using (organization_id in (select private.my_org_ids()));

create policy "handovers: insert crew"
  on public.handovers for insert
  to authenticated
  with check (
    from_user_id = (select auth.uid())
    and organization_id in (
      select private.my_org_ids_with_role(
        array['admin', 'manager', 'inspector', 'technician']::public.org_role[]
      )
    )
  );

create policy "handovers: acknowledge recipient"
  on public.handovers for update
  to authenticated
  using (
    to_user_id = (select auth.uid())
    and organization_id in (select private.my_org_ids())
  )
  with check (
    to_user_id = (select auth.uid())
    and organization_id in (select private.my_org_ids())
  );
