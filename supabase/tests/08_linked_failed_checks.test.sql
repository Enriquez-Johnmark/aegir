-- A failed check with a work order keeps its "fail" result (D-037,
-- 20261015051635_protect_linked_failed_checks).
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- Ingrid (inspector) is assigned to the Halcyon fire safety audit (a3…03), which is in progress.
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000003", "role": "authenticated"}';

-- Check 4 fails and work is raised for it; check 3 fails with no work order.
update public.inspection_items
set result = 'fail', finding = 'Breathing apparatus cylinder below 80% charge.', severity = 'high'
where id = 'a6000000-0000-4000-8000-000000000304';
update public.inspection_items
set result = 'fail', finding = 'CO2 release cabinet seal broken.', severity = 'medium'
where id = 'a6000000-0000-4000-8000-000000000303';
insert into public.work_orders (organization_id, vessel_id, inspection_item_id, title, priority)
values ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002',
        'a6000000-0000-4000-8000-000000000304', 'Recharge BA cylinder', 'high');

select throws_ok(
  $$ update public.inspection_items set result = 'pass' where id = 'a6000000-0000-4000-8000-000000000304' $$,
  'P0001', 'A failed check with a work order can no longer change its result',
  'the inspector cannot turn a failed check with a work order into a pass'
);

select throws_ok(
  $$ update public.inspection_items set result = 'not_applicable' where id = 'a6000000-0000-4000-8000-000000000304' $$,
  'P0001', 'A failed check with a work order can no longer change its result',
  'nor into not applicable'
);

-- Refining the finding of a linked failure is still allowed (the audit log keeps every version).
select lives_ok(
  $$ update public.inspection_items
     set result = 'fail', finding = 'Breathing apparatus cylinder at 70% charge.', severity = 'critical'
     where id = 'a6000000-0000-4000-8000-000000000304' $$,
  'the finding and severity of a linked failure can still be refined'
);

-- A failure without a work order can still be corrected.
select lives_ok(
  $$ update public.inspection_items set result = 'pass' where id = 'a6000000-0000-4000-8000-000000000303' $$,
  'a failed check without a work order can still be changed'
);

-- Managers are held to the same rule.
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$ update public.inspection_items set result = 'pass' where id = 'a6000000-0000-4000-8000-000000000304' $$,
  'P0001', 'A failed check with a work order can no longer change its result',
  'a manager cannot turn a linked failure into a pass either'
);

reset role;
select results_eq(
  $$ select result::text, finding, severity::text from public.inspection_items
     where id = 'a6000000-0000-4000-8000-000000000304' $$,
  $$ values ('fail', 'Breathing apparatus cylinder at 70% charge.', 'critical') $$,
  'the linked failure keeps its result and the refined finding'
);
-- (inspection_items_before_write clears the severity and keeps any note text.)
select results_eq(
  $$ select result::text, severity::text from public.inspection_items
     where id = 'a6000000-0000-4000-8000-000000000303' $$,
  $$ values ('pass', null::text) $$,
  'the unlinked failure was corrected and its severity cleared'
);

select * from finish();
rollback;
