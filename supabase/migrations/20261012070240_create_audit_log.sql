-- Append-only audit log. Rows are written only by the trigger below; app roles
-- can read their organization's events and nothing else.

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  -- No FK: history must survive user deletion. Null means a trusted system context.
  actor_id uuid,
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('insert', 'update', 'status_change')),
  -- insert: snapshot of the new row; update: {column: {old, new}} for changed columns.
  changes jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index audit_events_org_occurred_idx on public.audit_events (organization_id, occurred_at desc);
create index audit_events_entity_idx on public.audit_events (entity_type, entity_id, occurred_at desc);

-- security definer: writes the audit row regardless of the caller's privileges.
-- actor_id comes from the verified JWT (auth.uid()), never from client input.
create function private.record_audit_event()
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

revoke all on function private.record_audit_event() from public;

create trigger memberships_audit
  after insert or update on public.memberships
  for each row execute function private.record_audit_event();

create trigger vessels_audit
  after insert or update on public.vessels
  for each row execute function private.record_audit_event();

create trigger inspections_audit
  after insert or update on public.inspections
  for each row execute function private.record_audit_event();

create trigger inspection_items_audit
  after insert or update on public.inspection_items
  for each row execute function private.record_audit_event();

create trigger work_orders_audit
  after insert or update on public.work_orders
  for each row execute function private.record_audit_event();

create trigger handovers_audit
  after insert or update on public.handovers
  for each row execute function private.record_audit_event();

-- ---------------------------------------------------------------------------
-- RLS and grants: read-only for members, no writes for any app role
-- ---------------------------------------------------------------------------
alter table public.audit_events enable row level security;
revoke all on public.audit_events from anon, authenticated;

grant select on public.audit_events to authenticated;

create policy "audit_events: select members"
  on public.audit_events for select
  to authenticated
  using (organization_id in (select private.my_org_ids()));
