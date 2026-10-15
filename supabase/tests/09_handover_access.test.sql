-- Handover access beyond 05_handovers: viewers, other organizations, senders.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

set local role authenticated;

-- Vera (viewer) can read handovers but not create one ----------------------
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000005", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.handovers (organization_id, vessel_id, to_user_id, summary, outstanding_tasks)
     values ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
             'a1000000-0000-4000-8000-000000000002', 'Viewer handover', 'x') $$,
  '42501', null,
  'a read-only viewer cannot create a handover'
);

-- Owen (Meridian manager) ---------------------------------------------------
set local "request.jwt.claims" to '{"sub": "b1000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(
  (select count(*)::int from public.handovers where organization_id = 'a0000000-0000-4000-8000-000000000001'),
  0,
  'another organization sees none of our handovers'
);
select throws_ok(
  $$ insert into public.handovers (organization_id, vessel_id, to_user_id, summary, outstanding_tasks)
     values ('a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
             'a1000000-0000-4000-8000-000000000002', 'Into Northwind', 'x') $$,
  '42501', null,
  'another organization cannot write a handover into ours'
);
select throws_ok(
  $$ insert into public.handovers (organization_id, vessel_id, to_user_id, summary, outstanding_tasks)
     values ('b0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
             'b1000000-0000-4000-8000-000000000002', 'About a Northwind vessel', 'x') $$,
  '23503', null,
  'a handover cannot point at another organization''s vessel'
);

-- Marcus sent handover 3 to Ingrid: the sender can't acknowledge it --------
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000002", "role": "authenticated"}';
update public.handovers set status = 'acknowledged' where id = 'a5000000-0000-4000-8000-000000000003';

reset role;
select is(
  (select status::text from public.handovers where id = 'a5000000-0000-4000-8000-000000000003'),
  'pending',
  'the sender cannot acknowledge their own handover'
);

select * from finish();
rollback;
