-- Work orders: maintenance and corrective actions, optionally raised from a
-- failed inspection check. Transitions mirrored in src/features/work-orders/domain.ts.

create type public.work_order_status as enum ('open', 'in_progress', 'blocked', 'completed');

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  vessel_id uuid not null,
  inspection_item_id uuid,
  title text not null check (char_length(trim(title)) between 3 and 160),
  description text check (char_length(description) <= 4000),
  priority public.severity not null default 'medium',
  status public.work_order_status not null default 'open',
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  blocked_reason text check (char_length(blocked_reason) <= 1000),
  completed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (vessel_id, organization_id)
    references public.vessels (id, organization_id) on delete restrict,
  -- MATCH SIMPLE: only checked when inspection_item_id is set.
  foreign key (inspection_item_id, organization_id)
    references public.inspection_items (id, organization_id) on delete restrict,
  unique (id, organization_id),
  check ((status = 'blocked') = (char_length(trim(coalesce(blocked_reason, ''))) > 0)),
  check ((status = 'completed') = (completed_at is not null))
);

create index work_orders_org_status_due_idx on public.work_orders (organization_id, status, due_date);
-- Composite indexes cover the composite (…, organization_id) foreign keys.
create index work_orders_vessel_org_idx on public.work_orders (vessel_id, organization_id);
create index work_orders_inspection_item_org_idx on public.work_orders (inspection_item_id, organization_id);
create index work_orders_assignee_id_idx on public.work_orders (assignee_id);
create index work_orders_created_by_idx on public.work_orders (created_by);

create trigger work_orders_set_updated_at
  before update on public.work_orders
  for each row execute function private.set_updated_at();

create trigger work_orders_set_created_by
  before insert on public.work_orders
  for each row execute function private.set_created_by();

create function private.work_orders_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_item_result public.check_result;
  v_item_vessel_id uuid;
  v_is_manager boolean;
begin
  if new.assignee_id is not null
     and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    perform private.assert_member_with_role(
      new.organization_id,
      new.assignee_id,
      array['admin', 'manager', 'inspector', 'technician']::public.org_role[],
      'Assignee'
    );
  end if;

  if tg_op = 'INSERT' then
    -- A work order raised from a check must follow up an actual failure on the same vessel.
    if new.inspection_item_id is not null then
      select item.result, insp.vessel_id
        into v_item_result, v_item_vessel_id
      from public.inspection_items item
      join public.inspections insp on insp.id = item.inspection_id
      where item.id = new.inspection_item_id;

      -- RLS hides other organizations' items, so "not visible" reads as not found.
      if not found then
        raise exception 'Checklist item not found' using errcode = 'P0002';
      end if;
      if v_item_result is distinct from 'fail' then
        raise exception 'Work orders can only be raised from failed checklist items'
          using errcode = 'P0001';
      end if;
      if v_item_vessel_id is distinct from new.vessel_id then
        raise exception 'Work order vessel must match the inspected vessel'
          using errcode = 'P0001';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE
  if old.status = 'completed' then
    raise exception 'Completed work orders can no longer be changed' using errcode = 'P0001';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'open' and new.status in ('in_progress', 'blocked'))
      or (old.status = 'in_progress' and new.status in ('open', 'blocked', 'completed'))
      or (old.status = 'blocked' and new.status in ('open', 'in_progress'))
    ) then
      raise exception 'Invalid work order status change: % -> %', old.status, new.status
        using errcode = 'P0001';
    end if;

    if new.status = 'completed' then
      new.completed_at := now();
    end if;
  end if;

  if new.status <> 'blocked' then
    new.blocked_reason := null;
  end if;

  -- Assignees without a manager role may only move the work along.
  if (select auth.uid()) is not null then
    v_is_manager := new.organization_id in (
      select private.my_org_ids_with_role(array['admin', 'manager']::public.org_role[])
    );
    if not v_is_manager
       and (new.title, new.description, new.priority, new.assignee_id, new.due_date)
           is distinct from (old.title, old.description, old.priority, old.assignee_id, old.due_date) then
      raise exception 'Only managers can edit work order details; assignees can change status only'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.work_orders_before_write() from public;

create trigger work_orders_before_write
  before insert or update on public.work_orders
  for each row execute function private.work_orders_before_write();

-- ---------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------
alter table public.work_orders enable row level security;
revoke all on public.work_orders from anon, authenticated;

grant select on public.work_orders to authenticated;
-- status always starts 'open'; completed_at and created_by are set by triggers.
grant insert (organization_id, vessel_id, inspection_item_id, title, description, priority, assignee_id, due_date)
  on public.work_orders to authenticated;
grant update (title, description, priority, status, assignee_id, due_date, blocked_reason)
  on public.work_orders to authenticated;

create policy "work_orders: select members"
  on public.work_orders for select
  to authenticated
  using (organization_id in (select private.my_org_ids()));

create policy "work_orders: insert inspectors"
  on public.work_orders for insert
  to authenticated
  with check (
    organization_id in (
      select private.my_org_ids_with_role(array['admin', 'manager', 'inspector']::public.org_role[])
    )
  );

create policy "work_orders: update managers or assignee"
  on public.work_orders for update
  to authenticated
  using (
    organization_id in (select private.my_org_ids_with_role(array['admin', 'manager']::public.org_role[]))
    or (
      assignee_id = (select auth.uid())
      and organization_id in (
        select private.my_org_ids_with_role(array['inspector', 'technician']::public.org_role[])
      )
    )
  )
  with check (
    organization_id in (select private.my_org_ids_with_role(array['admin', 'manager']::public.org_role[]))
    or (
      assignee_id = (select auth.uid())
      and organization_id in (
        select private.my_org_ids_with_role(array['inspector', 'technician']::public.org_role[])
      )
    )
  );
