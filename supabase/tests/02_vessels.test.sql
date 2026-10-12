-- Vessels: role limits, cross-organization isolation, immutable columns, IMO validation.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- IMO check digit (as postgres) ------------------------------------------------
select ok(private.is_valid_imo('9074729'), 'a real-format IMO with a correct check digit is valid');
select ok(not private.is_valid_imo('9074728'), 'an IMO with a wrong check digit is invalid');
select ok(not private.is_valid_imo('907472'), 'an IMO must have 7 digits');

-- Northwind manager ----------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000002", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.vessels (organization_id, name, imo_number, vessel_type, flag_state)
     values ('a0000000-0000-4000-8000-000000000001', 'Northwind Kestrel', '9441025', 'tug', 'Malta') $$,
  'a manager can add a vessel to their organization'
);

select is(
  (select created_by from public.vessels where imo_number = '9441025'),
  'a1000000-0000-4000-8000-000000000002'::uuid,
  'created_by is stamped with the acting user'
);

select throws_ok(
  $$ insert into public.vessels (organization_id, name, imo_number, vessel_type, flag_state, created_by)
     values ('a0000000-0000-4000-8000-000000000001', 'Forged', '9384124', 'tug', 'Malta',
             'a1000000-0000-4000-8000-000000000001') $$,
  '42501', null,
  'clients cannot supply created_by'
);

select throws_ok(
  $$ insert into public.vessels (organization_id, name, imo_number, vessel_type, flag_state)
     values ('b0000000-0000-4000-8000-000000000001', 'Intruder', '9441025', 'tug', 'Malta') $$,
  '42501', null,
  'a manager cannot add a vessel to another organization'
);

select throws_ok(
  $$ insert into public.vessels (organization_id, name, imo_number, vessel_type, flag_state)
     values ('a0000000-0000-4000-8000-000000000001', 'Bad IMO', '9441026', 'tug', 'Malta') $$,
  '23514', null,
  'an invalid IMO number is rejected'
);

select throws_ok(
  $$ update public.vessels set organization_id = 'b0000000-0000-4000-8000-000000000001'
     where id = 'a2000000-0000-4000-8000-000000000001' $$,
  '42501', null,
  'a vessel cannot be moved to another organization'
);

update public.vessels set name = 'Renamed by Northwind'
where id = 'b2000000-0000-4000-8000-000000000001';

-- Northwind technician -------------------------------------------------------
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000004", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.vessels (organization_id, name, imo_number, vessel_type, flag_state)
     values ('a0000000-0000-4000-8000-000000000001', 'Tech Boat', '9267314', 'tug', 'Malta') $$,
  '42501', null,
  'a technician cannot add vessels'
);

update public.vessels set status = 'decommissioned'
where id = 'a2000000-0000-4000-8000-000000000001';

-- Northwind viewer -----------------------------------------------------------
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000005", "role": "authenticated"}';
update public.vessels set name = 'Viewer edit' where id = 'a2000000-0000-4000-8000-000000000002';

-- Verify as postgres ---------------------------------------------------------
reset role;

select is(
  (select name from public.vessels where id = 'b2000000-0000-4000-8000-000000000001'),
  'Meridian Star',
  'a manager cannot edit another organization''s vessel'
);

select is(
  (select status::text from public.vessels where id = 'a2000000-0000-4000-8000-000000000001'),
  'active',
  'a technician cannot edit vessels'
);

select is(
  (select name from public.vessels where id = 'a2000000-0000-4000-8000-000000000002'),
  'Northwind Halcyon',
  'a viewer cannot edit vessels'
);

select * from finish();
rollback;
