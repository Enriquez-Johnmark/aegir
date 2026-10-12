-- Work orders: transitions, assignee-only status changes, follow-up integrity.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Inspector (Ingrid) raises work orders --------------------------------------
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000003", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.work_orders (organization_id, vessel_id, inspection_item_id, title, priority, assignee_id)
     values ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
             'a6000000-0000-4000-8000-000000000102', 'Second follow-up on ER-04', 'high',
             'a1000000-0000-4000-8000-000000000004') $$,
  'an inspector can raise a work order from a failed check'
);

select throws_ok(
  $$ insert into public.work_orders (organization_id, vessel_id, inspection_item_id, title)
     values ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
             'a6000000-0000-4000-8000-000000000101', 'From a passed check') $$,
  'P0001', 'Work orders can only be raised from failed checklist items',
  'a work order cannot follow up a passed check'
);

select throws_ok(
  $$ insert into public.work_orders (organization_id, vessel_id, inspection_item_id, title)
     values ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002',
             'a6000000-0000-4000-8000-000000000102', 'Wrong vessel') $$,
  'P0001', 'Work order vessel must match the inspected vessel',
  'a follow-up work order must be on the inspected vessel'
);

select throws_ok(
  $$ insert into public.work_orders (organization_id, vessel_id, inspection_item_id, title)
     values ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
             'b6000000-0000-4000-8000-000000000101', 'Cross-org item') $$,
  'P0002', 'Checklist item not found',
  'a work order cannot reference another organization''s checklist item'
);

select throws_ok(
  $$ insert into public.work_orders (organization_id, vessel_id, title, assignee_id)
     values ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
             'Foreign assignee', 'b1000000-0000-4000-8000-000000000002') $$,
  '23514', null,
  'the assignee must belong to the organization'
);

-- Assigned technician (Tomas) on "Restore oily water separator alarm" (open) --
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000004", "role": "authenticated"}';

select throws_ok(
  $$ update public.work_orders set status = 'completed' where id = 'a4000000-0000-4000-8000-000000000003' $$,
  'P0001', 'Invalid work order status change: open -> completed',
  'open -> completed is not a valid transition'
);

select throws_ok(
  $$ update public.work_orders set status = 'blocked' where id = 'a4000000-0000-4000-8000-000000000003' $$,
  '23514', null,
  'blocking a work order requires a reason'
);

select lives_ok(
  $$ update public.work_orders set status = 'in_progress' where id = 'a4000000-0000-4000-8000-000000000003' $$,
  'the assignee can start their work order'
);

select throws_ok(
  $$ update public.work_orders set title = 'Renamed by tech' where id = 'a4000000-0000-4000-8000-000000000003' $$,
  '42501', null,
  'the assignee cannot edit work order details'
);

select lives_ok(
  $$ update public.work_orders set status = 'completed' where id = 'a4000000-0000-4000-8000-000000000003' $$,
  'the assignee can complete an in-progress work order'
);

select throws_ok(
  $$ update public.work_orders set status = 'in_progress' where id = 'a4000000-0000-4000-8000-000000000003' $$,
  'P0001', 'Completed work orders can no longer be changed',
  'completed is terminal'
);

-- Not assigned to Tomas (assigned to Kenji)
update public.work_orders set status = 'in_progress' where id = 'a4000000-0000-4000-8000-000000000006';

-- Viewer (Vera) --------------------------------------------------------------
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000005", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.work_orders (organization_id, vessel_id, title)
     values ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'Viewer WO') $$,
  '42501', null,
  'a viewer cannot create work orders'
);

reset role;

select is(
  (select status::text from public.work_orders where id = 'a4000000-0000-4000-8000-000000000006'),
  'open',
  'a technician cannot change a work order assigned to someone else'
);

select isnt(
  (select completed_at from public.work_orders where id = 'a4000000-0000-4000-8000-000000000003'),
  null,
  'completing a work order stamps completed_at'
);

select * from finish();
rollback;
