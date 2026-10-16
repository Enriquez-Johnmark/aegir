-- Fixes from the independent review (D-043): user deletion past frozen records,
-- who may add checklist items, the acknowledging recipient's role, audited deletes.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- Amelia (admin, no handovers) inspects and completes work, then is deleted --
insert into public.inspections (id, organization_id, vessel_id, inspector_id, title, scheduled_for)
values ('a3000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-000000000001',
        'a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
        'Hardening probe', current_date);
insert into public.inspection_items (organization_id, inspection_id, position, category, description, result)
values ('a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-0000000000f1', 1, 'Fire safety', 'Probe check', 'pass');
update public.inspections set status = 'in_progress' where id = 'a3000000-0000-4000-8000-0000000000f1';
update public.inspections set status = 'completed' where id = 'a3000000-0000-4000-8000-0000000000f1';

insert into public.work_orders (id, organization_id, vessel_id, title, priority, assignee_id)
values ('a4000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-000000000001',
        'a2000000-0000-4000-8000-000000000001', 'Hardening probe work', 'low', 'a1000000-0000-4000-8000-000000000001');
update public.work_orders set status = 'in_progress' where id = 'a4000000-0000-4000-8000-0000000000f1';
update public.work_orders set status = 'completed' where id = 'a4000000-0000-4000-8000-0000000000f1';

select lives_ok(
  $$ delete from auth.users where id = 'a1000000-0000-4000-8000-000000000001' $$,
  'a user who conducted a completed inspection and completed work can be deleted'
);
select is(
  (select inspector_id from public.inspections where id = 'a3000000-0000-4000-8000-0000000000f1'),
  null,
  'the completed inspection keeps its record, with the inspector reference cleared'
);
select is(
  (select assignee_id from public.work_orders where id = 'a4000000-0000-4000-8000-0000000000f1'),
  null,
  'the completed work order keeps its record, with the assignee reference cleared'
);
select is(
  (select count(*)::int from public.audit_events
   where entity_type = 'memberships' and action = 'delete'
     and changes ->> 'user_id' = 'a1000000-0000-4000-8000-000000000001'),
  1,
  'removing the membership is audited, with a snapshot of who and which role'
);

-- Tomas becomes an inspector for this test; Ingrid is demoted to viewer later --
update public.memberships set role = 'inspector'
where user_id = 'a1000000-0000-4000-8000-000000000004' and organization_id = 'a0000000-0000-4000-8000-000000000001';

set local role authenticated;

-- Marcus (manager) -----------------------------------------------------------
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$ update public.inspections set inspector_id = null where id = 'a3000000-0000-4000-8000-000000000001' $$,
  'P0001', null,
  'a closed inspection still can''t be changed by a client, not even to clear a reference'
);
select lives_ok(
  $$ insert into public.inspection_items (organization_id, inspection_id, position, category, description)
     values ('a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 90, 'Navigation', 'Manager adds') $$,
  'a manager can add a check to any open inspection'
);

-- Tomas (now an inspector, not assigned to Ingrid's inspections) ---------------
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000004", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.inspection_items (organization_id, inspection_id, position, category, description)
     values ('a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000003', 91, 'Navigation', 'Injected') $$,
  '42501', null,
  'an inspector cannot add checks to another inspector''s inspection'
);
select lives_ok(
  $$ select public.create_inspection(
       'a2000000-0000-4000-8000-000000000001', 'Scheduled for Ingrid', current_date + 3,
       'a1000000-0000-4000-8000-000000000003', null,
       '[{"category": "Fire safety", "description": "Extinguishers in date"}]'::jsonb) $$,
  'an inspector can still schedule an inspection, with its checklist, for a colleague'
);

-- Ingrid (assigned inspector) -------------------------------------------------
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000003", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.inspection_items (organization_id, inspection_id, position, category, description)
     values ('a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000003', 92, 'Navigation', 'Assignee adds') $$,
  'the assigned inspector can add a check to their own open inspection'
);

-- Ingrid demoted to viewer: handover 3 is addressed to her ---------------------
reset role;
update public.memberships set role = 'viewer'
where user_id = 'a1000000-0000-4000-8000-000000000003' and organization_id = 'a0000000-0000-4000-8000-000000000001';
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000003", "role": "authenticated"}';
update public.handovers set status = 'acknowledged' where id = 'a5000000-0000-4000-8000-000000000003';

reset role;
select is(
  (select status::text from public.handovers where id = 'a5000000-0000-4000-8000-000000000003'),
  'pending',
  'a recipient who is now a viewer cannot acknowledge (no crew role)'
);
select is(
  (select count(*)::int from public.audit_events where action = 'delete' and entity_type <> 'memberships'),
  0,
  'nothing else was deleted along the way'
);

select * from finish();
rollback;
