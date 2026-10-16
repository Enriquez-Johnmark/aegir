-- Read isolation, table by table: each organization sees its own rows and none
-- of the other's. RLS select policies are the only guard here (the app also
-- filters by organization, so E2E "not found" checks can't prove this alone).
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

set local role authenticated;

-- Owen (Meridian manager) -----------------------------------------------
set local "request.jwt.claims" to '{"sub": "b1000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select ok((select count(*) from public.vessels where organization_id = 'b0000000-0000-4000-8000-000000000001') > 0, 'Owen sees their own vessels');
select is((select count(*)::int from public.vessels where organization_id = 'a0000000-0000-4000-8000-000000000001'), 0, 'Owen sees none of the other organization''s vessels');
select ok((select count(*) from public.inspections where organization_id = 'b0000000-0000-4000-8000-000000000001') > 0, 'Owen sees their own inspections');
select is((select count(*)::int from public.inspections where organization_id = 'a0000000-0000-4000-8000-000000000001'), 0, 'Owen sees none of the other organization''s inspections');
select ok((select count(*) from public.inspection_items where organization_id = 'b0000000-0000-4000-8000-000000000001') > 0, 'Owen sees their own inspection_items');
select is((select count(*)::int from public.inspection_items where organization_id = 'a0000000-0000-4000-8000-000000000001'), 0, 'Owen sees none of the other organization''s inspection_items');
select ok((select count(*) from public.work_orders where organization_id = 'b0000000-0000-4000-8000-000000000001') > 0, 'Owen sees their own work_orders');
select is((select count(*)::int from public.work_orders where organization_id = 'a0000000-0000-4000-8000-000000000001'), 0, 'Owen sees none of the other organization''s work_orders');
select ok((select count(*) from public.handovers where organization_id = 'b0000000-0000-4000-8000-000000000001') > 0, 'Owen sees their own handovers');
select is((select count(*)::int from public.handovers where organization_id = 'a0000000-0000-4000-8000-000000000001'), 0, 'Owen sees none of the other organization''s handovers');
select ok((select count(*) from public.audit_events where organization_id = 'b0000000-0000-4000-8000-000000000001') > 0, 'Owen sees their own audit_events');
select is((select count(*)::int from public.audit_events where organization_id = 'a0000000-0000-4000-8000-000000000001'), 0, 'Owen sees none of the other organization''s audit_events');
select ok((select count(*) from public.memberships where organization_id = 'b0000000-0000-4000-8000-000000000001') > 0, 'Owen sees their own memberships');
select is((select count(*)::int from public.memberships where organization_id = 'a0000000-0000-4000-8000-000000000001'), 0, 'Owen sees none of the other organization''s memberships');

-- Tomas (Northwind technician) ------------------------------------------
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000004", "role": "authenticated"}';
select ok((select count(*) from public.vessels where organization_id = 'a0000000-0000-4000-8000-000000000001') > 0, 'Tomas sees their own vessels');
select is((select count(*)::int from public.vessels where organization_id = 'b0000000-0000-4000-8000-000000000001'), 0, 'Tomas sees none of the other organization''s vessels');
select ok((select count(*) from public.inspections where organization_id = 'a0000000-0000-4000-8000-000000000001') > 0, 'Tomas sees their own inspections');
select is((select count(*)::int from public.inspections where organization_id = 'b0000000-0000-4000-8000-000000000001'), 0, 'Tomas sees none of the other organization''s inspections');
select ok((select count(*) from public.inspection_items where organization_id = 'a0000000-0000-4000-8000-000000000001') > 0, 'Tomas sees their own inspection_items');
select is((select count(*)::int from public.inspection_items where organization_id = 'b0000000-0000-4000-8000-000000000001'), 0, 'Tomas sees none of the other organization''s inspection_items');
select ok((select count(*) from public.work_orders where organization_id = 'a0000000-0000-4000-8000-000000000001') > 0, 'Tomas sees their own work_orders');
select is((select count(*)::int from public.work_orders where organization_id = 'b0000000-0000-4000-8000-000000000001'), 0, 'Tomas sees none of the other organization''s work_orders');
select ok((select count(*) from public.handovers where organization_id = 'a0000000-0000-4000-8000-000000000001') > 0, 'Tomas sees their own handovers');
select is((select count(*)::int from public.handovers where organization_id = 'b0000000-0000-4000-8000-000000000001'), 0, 'Tomas sees none of the other organization''s handovers');
select ok((select count(*) from public.audit_events where organization_id = 'a0000000-0000-4000-8000-000000000001') > 0, 'Tomas sees their own audit_events');
select is((select count(*)::int from public.audit_events where organization_id = 'b0000000-0000-4000-8000-000000000001'), 0, 'Tomas sees none of the other organization''s audit_events');
select ok((select count(*) from public.memberships where organization_id = 'a0000000-0000-4000-8000-000000000001') > 0, 'Tomas sees their own memberships');
select is((select count(*)::int from public.memberships where organization_id = 'b0000000-0000-4000-8000-000000000001'), 0, 'Tomas sees none of the other organization''s memberships');

select * from finish();
rollback;
