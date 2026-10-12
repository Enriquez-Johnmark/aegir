-- Handovers: sender cannot be forged, content immutable, only the recipient acknowledges.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Technician (Tomas) hands over to Kenji -------------------------------------
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000004", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.handovers (organization_id, work_order_id, to_user_id, summary, outstanding_tasks)
     values ('a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000003',
             'a1000000-0000-4000-8000-000000000006', 'OWS alarm troubleshooting', 'Check the sensor wiring.') $$,
  'a crew member can create a handover'
);

select results_eq(
  $$ select from_user_id, vessel_id from public.handovers where summary = 'OWS alarm troubleshooting' $$,
  $$ values ('a1000000-0000-4000-8000-000000000004'::uuid, 'a2000000-0000-4000-8000-000000000003'::uuid) $$,
  'the sender is the acting user and the vessel is taken from the work order'
);

select throws_ok(
  $$ insert into public.handovers (organization_id, vessel_id, to_user_id, summary, outstanding_tasks, from_user_id)
     values ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
             'a1000000-0000-4000-8000-000000000006', 'Forged', 'x', 'a1000000-0000-4000-8000-000000000002') $$,
  '42501', null,
  'the sender cannot be supplied by the client'
);

select throws_ok(
  $$ insert into public.handovers (organization_id, vessel_id, to_user_id, summary, outstanding_tasks)
     values ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
             'a1000000-0000-4000-8000-000000000005', 'To a viewer', 'x') $$,
  '23514', null,
  'a handover cannot be addressed to a read-only viewer'
);

select throws_ok(
  $$ update public.handovers set summary = 'Rewritten' where id = 'a5000000-0000-4000-8000-000000000001' $$,
  '42501', null,
  'handover content cannot be edited'
);

-- Tomas is not the recipient of handover 1 (Kenji is)
update public.handovers set status = 'acknowledged' where id = 'a5000000-0000-4000-8000-000000000001';

-- Recipient (Kenji) ----------------------------------------------------------
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000006", "role": "authenticated"}';

reset role;
select is(
  (select status::text from public.handovers where id = 'a5000000-0000-4000-8000-000000000001'),
  'pending',
  'only the recipient can acknowledge a handover'
);

set local role authenticated;
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000006", "role": "authenticated"}';

select lives_ok(
  $$ update public.handovers set status = 'acknowledged' where id = 'a5000000-0000-4000-8000-000000000001' $$,
  'the recipient can acknowledge a handover'
);

select isnt(
  (select acknowledged_at from public.handovers where id = 'a5000000-0000-4000-8000-000000000001'),
  null,
  'acknowledging stamps acknowledged_at'
);

select throws_ok(
  $$ update public.handovers set status = 'pending' where id = 'a5000000-0000-4000-8000-000000000001' $$,
  'P0001', null,
  'an acknowledged handover cannot be reopened'
);

select * from finish();
rollback;
