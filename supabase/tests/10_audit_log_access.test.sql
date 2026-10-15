-- The audit log screen (D-042) beyond 06_audit: what a viewer (the auditor role)
-- can read, whose names resolve, and the tie the log's paging relies on.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- Marcus makes two changes in one transaction, so there is something with a real actor.
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000002", "role": "authenticated"}';
update public.work_orders set priority = 'critical' where id = 'a4000000-0000-4000-8000-000000000005';
update public.vessels set flag_state = 'Panama' where id = 'a2000000-0000-4000-8000-000000000001';

-- Paging (listAuditEvents) orders by (occurred_at, id): events from one transaction
-- share occurred_at (now() is the transaction start), so the id must break the tie.
select is(
  (select count(distinct occurred_at)::int from public.audit_events
   where actor_id = 'a1000000-0000-4000-8000-000000000002'
     and entity_id in ('a4000000-0000-4000-8000-000000000005', 'a2000000-0000-4000-8000-000000000001')),
  1,
  'events written in one transaction share a timestamp (the log pages by timestamp, then id)'
);

-- What the whole organization's log holds, counted with RLS out of the way.
reset role;
create temp table expected_events on commit drop as
  select entity_type, count(*)::int as n from public.audit_events
  where organization_id = 'a0000000-0000-4000-8000-000000000001'
  group by entity_type;
grant select on expected_events to authenticated;

-- Vera (viewer) ---------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000005", "role": "authenticated"}';

select results_eq(
  $$ select entity_type, count(*)::int from public.audit_events group by entity_type order by entity_type $$,
  $$ select entity_type, n from expected_events order by entity_type $$,
  'a viewer reads the whole organization''s log, every record type, and nothing else'
);

select is(
  (select count(distinct entity_type)::int from public.audit_events),
  6,
  'the log covers all six audited record types, members included'
);

select is(
  (select count(*)::int from (select distinct actor_id from public.audit_events where actor_id is not null) actors
   where not exists (select 1 from public.profiles p where p.id = actors.actor_id)),
  0,
  'a viewer can resolve every actor''s name (no current member shows as a former member)'
);

select throws_ok(
  $$ delete from public.audit_events where organization_id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null,
  'a viewer cannot delete audit events'
);

-- Owen (Meridian manager) -----------------------------------------------------
set local "request.jwt.claims" to '{"sub": "b1000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(
  (select count(*)::int from public.profiles where id = 'a1000000-0000-4000-8000-000000000002'),
  0,
  'another organization cannot resolve our actors'' names (filtering by a known actor id leaks nothing)'
);

select * from finish();
rollback;
