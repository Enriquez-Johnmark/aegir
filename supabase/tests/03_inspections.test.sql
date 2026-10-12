-- Inspections: atomic creation RPC, status transitions, freezing, failure rules.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Inspector (Ingrid) ---------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000003", "role": "authenticated"}';

select lives_ok(
  $$ select public.create_inspection(
       'a2000000-0000-4000-8000-000000000005', 'Lay-up condition check', current_date + 1,
       'a1000000-0000-4000-8000-000000000003', null,
       '[{"category": "Hull & structure", "description": "Moorings secure"},
         {"category": "Fire safety", "description": "Fire watch rounds logged"}]'::jsonb) $$,
  'an inspector can create an inspection with its checklist'
);

select results_eq(
  $$ select i.status::text, count(it.*)::int
     from public.inspections i join public.inspection_items it on it.inspection_id = i.id
     where i.title = 'Lay-up condition check' group by i.status $$,
  $$ values ('scheduled', 2) $$,
  'the inspection starts scheduled with all checklist items'
);

select throws_ok(
  $$ select public.create_inspection(
       'a2000000-0000-4000-8000-000000000005', 'No items', current_date, null, null, '[]'::jsonb) $$,
  '22023', null,
  'an inspection without checklist items is rejected'
);

select throws_ok(
  $$ select public.create_inspection(
       'a2000000-0000-4000-8000-000000000005', 'Bad item', current_date, null, null,
       '[{"category": "Fire safety"}]'::jsonb) $$,
  '23502', null,
  'a checklist item without a description is rejected (and nothing is saved)'
);

select is(
  (select count(*) from public.inspections where title = 'Bad item'),
  0::bigint,
  'a failed RPC leaves no partial inspection behind'
);

select throws_ok(
  $$ select public.create_inspection(
       'b2000000-0000-4000-8000-000000000001', 'Cross-org', current_date, null, null,
       '[{"category": "Cargo", "description": "x"}]'::jsonb) $$,
  'P0002', null,
  'an inspection cannot be created for another organization''s vessel'
);

select throws_ok(
  $$ select public.create_inspection(
       'a2000000-0000-4000-8000-000000000005', 'Foreign inspector', current_date,
       'b1000000-0000-4000-8000-000000000001', null,
       '[{"category": "Cargo", "description": "x"}]'::jsonb) $$,
  '23514', null,
  'the inspector must belong to the organization'
);

-- Transitions on the in-progress fire audit (assigned to Ingrid) ---------------
select throws_ok(
  $$ update public.inspections set status = 'completed' where id = 'a3000000-0000-4000-8000-000000000003' $$,
  'P0001', 'All checklist items must have a result before completing the inspection',
  'an inspection with pending items cannot be completed'
);

select throws_ok(
  $$ update public.inspection_items set result = 'fail' where id = 'a6000000-0000-4000-8000-000000000303' $$,
  '23514', null,
  'a failed check without severity and finding is rejected'
);

update public.inspection_items
set result = 'fail', finding = 'CO2 release cabinet seal broken.', severity = 'high'
where id = 'a6000000-0000-4000-8000-000000000303';
update public.inspection_items set result = 'pass' where id = 'a6000000-0000-4000-8000-000000000304';

select lives_ok(
  $$ update public.inspections set status = 'completed' where id = 'a3000000-0000-4000-8000-000000000003' $$,
  'the assigned inspector can complete the inspection once every item has a result'
);

select isnt(
  (select completed_at from public.inspections where id = 'a3000000-0000-4000-8000-000000000003'),
  null,
  'completing an inspection stamps completed_at'
);

select throws_ok(
  $$ update public.inspections set notes = 'late edit' where id = 'a3000000-0000-4000-8000-000000000003' $$,
  'P0001', null,
  'a completed inspection is frozen'
);

select throws_ok(
  $$ update public.inspection_items set result = 'pass' where id = 'a6000000-0000-4000-8000-000000000303' $$,
  'P0001', null,
  'checklist results of a completed inspection are frozen'
);

select throws_ok(
  $$ update public.inspections set status = 'completed' where id = 'a3000000-0000-4000-8000-000000000005' $$,
  'P0001', null,
  'a scheduled inspection cannot jump straight to completed'
);

-- Technician (Tomas) ---------------------------------------------------------
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000004", "role": "authenticated"}';

select throws_ok(
  $$ select public.create_inspection(
       'a2000000-0000-4000-8000-000000000005', 'Tech inspection', current_date, null, null,
       '[{"category": "Cargo", "description": "x"}]'::jsonb) $$,
  '42501', null,
  'a technician cannot create inspections'
);

update public.inspection_items set result = 'pass' where id = 'a6000000-0000-4000-8000-000000000401';

reset role;
select is(
  (select result::text from public.inspection_items where id = 'a6000000-0000-4000-8000-000000000401'),
  'pending',
  'a technician cannot record inspection results'
);

select * from finish();
rollback;
