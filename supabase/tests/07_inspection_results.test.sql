-- Recording inspection results: who may write checklist items, and the
-- role re-check added in 20261014174645_require_inspector_role_for_item_updates.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- Ingrid (inspector) is assigned to the Petrel LSA inspection (a3…04), which is scheduled.
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000003", "role": "authenticated"}';

update public.inspections set status = 'in_progress' where id = 'a3000000-0000-4000-8000-000000000004';
update public.inspection_items set result = 'pass' where id = 'a6000000-0000-4000-8000-000000000401';

reset role;
select is(
  (select result::text from public.inspection_items where id = 'a6000000-0000-4000-8000-000000000401'),
  'pass',
  'the assigned inspector can record a result'
);

-- Ingrid is not assigned to the Aurora navigation check (a3…06, unassigned).
set local role authenticated;
update public.inspection_items set result = 'pass' where id = 'a6000000-0000-4000-8000-000000000601';

reset role;
select is(
  (select result::text from public.inspection_items where id = 'a6000000-0000-4000-8000-000000000601'),
  'pending',
  'an inspector cannot record results on an inspection assigned to someone else'
);

-- Marcus (manager) can record results on any inspection in the organization.
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000002", "role": "authenticated"}';
update public.inspection_items set result = 'not_applicable' where id = 'a6000000-0000-4000-8000-000000000601';

reset role;
select is(
  (select result::text from public.inspection_items where id = 'a6000000-0000-4000-8000-000000000601'),
  'not_applicable',
  'a manager can record results on any inspection'
);

-- Ingrid's role changes to viewer while she is still the assigned inspector.
update public.memberships set role = 'viewer'
where user_id = 'a1000000-0000-4000-8000-000000000003'
  and organization_id = 'a0000000-0000-4000-8000-000000000001';

set local role authenticated;
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000003", "role": "authenticated"}';
update public.inspection_items set result = 'pass' where id = 'a6000000-0000-4000-8000-000000000402';
update public.inspections set notes = 'Viewer edit' where id = 'a3000000-0000-4000-8000-000000000004';

reset role;
select is(
  (select result::text from public.inspection_items where id = 'a6000000-0000-4000-8000-000000000402'),
  'pending',
  'a former inspector who is now a viewer can no longer record results'
);

select is(
  (select notes from public.inspections where id = 'a3000000-0000-4000-8000-000000000004'),
  null,
  'a former inspector who is now a viewer can no longer edit the inspection'
);

select * from finish();
rollback;
