-- Fixes from the independent review (D-043). Forward only: earlier migrations are
-- applied and never edited; functions are replaced with `create or replace`.
--
-- 1. User deletion: the freeze triggers on completed/cancelled inspections and
--    completed work orders rejected the ON DELETE SET NULL that removing a user
--    performs, so most users couldn't be deleted. Only that cleanup may pass now.
-- 2. Checklist inserts: any inspector could add checks to any inspection. Now
--    managers/admins, the assigned inspector, or the creator while scheduled
--    (create_inspection runs as the caller and must keep working).
-- 3. Races: closing an inspection and adding/changing a check, and linking a work
--    order to a check while its result changes, could interleave. The writers now
--    take FOR SHARE on the parent row through narrow definer helpers.
-- 4. Acknowledging a handover re-checks the recipient's role (as D-031 did for checks).
-- 5. Deletions are audited (action 'delete'), so removing a membership leaves a trace.

-- ---------------------------------------------------------------------------
-- Helpers (security definer, private schema, CONVENTIONS.md §4)
-- ---------------------------------------------------------------------------

-- Whether a profile still exists. Definer: RLS would hide non-colleagues' profiles.
create function private.profile_exists(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = p_profile_id);
$$;

-- FOR SHARE lock on an inspection of the caller's organizations; returns its status.
-- Definer: a FOR SHARE read must pass the UPDATE policy, which most writers of
-- checklist items don't (they may update items, not the inspection).
create function private.lock_inspection(p_inspection_id uuid)
returns public.inspection_status
language sql
security definer
set search_path = ''
as $$
  select i.status
  from public.inspections i
  where i.id = p_inspection_id
    and ((select auth.uid()) is null or i.organization_id in (select private.my_org_ids()))
  for share;
$$;

-- FOR SHARE lock on a checklist item of the caller's organizations; returns its result.
create function private.lock_inspection_item(p_item_id uuid)
returns public.check_result
language sql
security definer
set search_path = ''
as $$
  select item.result
  from public.inspection_items item
  where item.id = p_item_id
    and ((select auth.uid()) is null or item.organization_id in (select private.my_org_ids()))
  for share;
$$;

revoke all on function private.profile_exists(uuid) from public;
revoke all on function private.lock_inspection(uuid) from public;
revoke all on function private.lock_inspection_item(uuid) from public;
grant execute on function private.profile_exists(uuid) to authenticated;
grant execute on function private.lock_inspection(uuid) to authenticated;
grant execute on function private.lock_inspection_item(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 1 + 3. Trigger functions (bodies as before, with the marked changes)
-- ---------------------------------------------------------------------------

create or replace function private.inspections_before_write()
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
      -- The one change allowed on a closed inspection: a user deletion's
      -- ON DELETE SET NULL (people references only, only to null, only for
      -- profiles that no longer exist). Client updates run at trigger depth 1.
      if pg_trigger_depth() > 1
         and (to_jsonb(new) - array['inspector_id', 'created_by', 'updated_at'])
           = (to_jsonb(old) - array['inspector_id', 'created_by', 'updated_at'])
         and (new.inspector_id is not distinct from old.inspector_id
              or (new.inspector_id is null and not private.profile_exists(old.inspector_id)))
         and (new.created_by is not distinct from old.created_by
              or (new.created_by is null and not private.profile_exists(old.created_by)))
      then
        return new;
      end if;
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

create or replace function private.inspection_items_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_status public.inspection_status;
begin
  -- FOR SHARE on the parent: waits for an uncommitted completion or cancellation,
  -- so a check can't be added or changed while the inspection is being closed.
  parent_status := private.lock_inspection(new.inspection_id);

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

create or replace function private.work_orders_before_write()
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
      -- FOR SHARE on the check first: a concurrent change of its result waits for
      -- this insert (and the linked-failure guard then sees it), or this insert
      -- waits for that change and reads the committed result below.
      perform private.lock_inspection_item(new.inspection_item_id);
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
    -- As for inspections: only a user deletion's ON DELETE SET NULL gets through.
    if pg_trigger_depth() > 1
       and (to_jsonb(new) - array['assignee_id', 'created_by', 'updated_at'])
         = (to_jsonb(old) - array['assignee_id', 'created_by', 'updated_at'])
       and (new.assignee_id is not distinct from old.assignee_id
            or (new.assignee_id is null and not private.profile_exists(old.assignee_id)))
       and (new.created_by is not distinct from old.created_by
            or (new.created_by is null and not private.profile_exists(old.created_by)))
    then
      return new;
    end if;
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

create or replace function private.record_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new jsonb := to_jsonb(new);
  v_old jsonb;
  v_changes jsonb := '{}'::jsonb;
  v_action text;
  v_key text;
begin
  if tg_op = 'DELETE' then
    -- A removal (e.g. a membership, which is how access is withdrawn): snapshot of the old row.
    insert into public.audit_events (organization_id, actor_id, entity_type, entity_id, action, changes)
    values (
      old.organization_id, (select auth.uid()), tg_table_name, old.id, 'delete',
      to_jsonb(old) - 'id' - 'organization_id' - 'created_at' - 'updated_at'
    );
    return null;
  end if;

  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_changes := v_new - 'id' - 'organization_id' - 'created_at' - 'updated_at';
  else
    v_old := to_jsonb(old);
    for v_key in select jsonb_object_keys(v_new) loop
      if v_key <> 'updated_at' and (v_new -> v_key) is distinct from (v_old -> v_key) then
        v_changes := v_changes
          || jsonb_build_object(v_key, jsonb_build_object('old', v_old -> v_key, 'new', v_new -> v_key));
      end if;
    end loop;

    if v_changes = '{}'::jsonb then
      return null; -- no-op update, nothing to record
    end if;

    v_action := case when v_changes ? 'status' then 'status_change' else 'update' end;
  end if;

  insert into public.audit_events (organization_id, actor_id, entity_type, entity_id, action, changes)
  values (new.organization_id, (select auth.uid()), tg_table_name, new.id, v_action, v_changes);

  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Who may add checklist items
-- ---------------------------------------------------------------------------
drop policy "inspection_items: insert inspectors" on public.inspection_items;

create policy "inspection_items: insert managers, assigned inspector or creator"
  on public.inspection_items for insert
  to authenticated
  with check (
    organization_id in (select private.my_org_ids_with_role(array['admin', 'manager']::public.org_role[]))
    or (
      organization_id in (select private.my_org_ids_with_role(array['inspector']::public.org_role[]))
      and inspection_id in (
        select i.id from public.inspections i
        where i.inspector_id = (select auth.uid())
           or (i.created_by = (select auth.uid()) and i.status = 'scheduled')
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Acknowledging a handover requires a crew role (viewers can't take work over)
-- ---------------------------------------------------------------------------
drop policy "handovers: acknowledge recipient" on public.handovers;

create policy "handovers: acknowledge recipient"
  on public.handovers for update
  to authenticated
  using (
    to_user_id = (select auth.uid())
    and organization_id in (
      select private.my_org_ids_with_role(array['admin', 'manager', 'inspector', 'technician']::public.org_role[])
    )
  )
  with check (
    to_user_id = (select auth.uid())
    and organization_id in (
      select private.my_org_ids_with_role(array['admin', 'manager', 'inspector', 'technician']::public.org_role[])
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Deletions are audited
-- ---------------------------------------------------------------------------
alter table public.audit_events
  drop constraint audit_events_action_check,
  add constraint audit_events_action_check check (action in ('insert', 'update', 'status_change', 'delete'));

create trigger memberships_audit_delete
  after delete on public.memberships
  for each row execute function private.record_audit_event();

create trigger vessels_audit_delete
  after delete on public.vessels
  for each row execute function private.record_audit_event();

create trigger inspections_audit_delete
  after delete on public.inspections
  for each row execute function private.record_audit_event();

create trigger inspection_items_audit_delete
  after delete on public.inspection_items
  for each row execute function private.record_audit_event();

create trigger work_orders_audit_delete
  after delete on public.work_orders
  for each row execute function private.record_audit_event();

create trigger handovers_audit_delete
  after delete on public.handovers
  for each row execute function private.record_audit_event();
