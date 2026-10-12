-- Audit log: written by triggers with the real actor, readable per organization, immutable.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

set local role authenticated;
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000002", "role": "authenticated"}';

update public.work_orders set priority = 'critical' where id = 'a4000000-0000-4000-8000-000000000005';
update public.work_orders set status = 'in_progress' where id = 'a4000000-0000-4000-8000-000000000005';

select results_eq(
  $$ select action, actor_id, changes -> 'priority' ->> 'new'
     from public.audit_events
     where entity_id = 'a4000000-0000-4000-8000-000000000005' and action = 'update' $$,
  $$ values ('update', 'a1000000-0000-4000-8000-000000000002'::uuid, 'critical') $$,
  'an update is recorded with the acting user and the changed column'
);

select results_eq(
  $$ select changes -> 'status' ->> 'old', changes -> 'status' ->> 'new'
     from public.audit_events
     where entity_id = 'a4000000-0000-4000-8000-000000000005' and action = 'status_change' $$,
  $$ values ('open', 'in_progress') $$,
  'a status transition is recorded as status_change with old and new values'
);

select throws_ok(
  $$ insert into public.audit_events (organization_id, actor_id, entity_type, entity_id, action)
     values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
             'vessels', 'a2000000-0000-4000-8000-000000000001', 'update') $$,
  '42501', null,
  'clients cannot write audit events'
);

select throws_ok(
  $$ update public.audit_events set actor_id = null $$,
  '42501', null,
  'clients cannot modify audit events'
);

select throws_ok(
  $$ delete from public.audit_events $$,
  '42501', null,
  'clients cannot delete audit events'
);

select is(
  (select count(*) from public.audit_events where organization_id = 'b0000000-0000-4000-8000-000000000001'),
  0::bigint,
  'members cannot see another organization''s audit events'
);

reset role;
select is(
  (select count(*) from public.audit_events
   where entity_id = 'a4000000-0000-4000-8000-000000000005'
     and occurred_at >= now() and actor_id is distinct from 'a1000000-0000-4000-8000-000000000002'),
  0::bigint,
  'every event from this transaction carries the acting user'
);

select * from finish();
rollback;
