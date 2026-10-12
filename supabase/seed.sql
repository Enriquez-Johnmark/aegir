-- Synthetic demo data for LOCAL development, applied by `npm run db:reset`.
-- All people, companies, vessels and IMO numbers are fictional. Never put real data here.
--
-- Runs as `postgres` (no user JWT): RLS does not apply, created_by/from_user_id
-- values given here are kept, and audit events are recorded with actor_id = null.
-- Status changes go through the same transition triggers the app uses.
--
-- FIXTURE CONTRACT: supabase/tests/*.test.sql rely on these fixed IDs.
--   Organizations  Northwind Shipping  a0000000-0000-4000-8000-000000000001
--                  Meridian Tankers    b0000000-0000-4000-8000-000000000001
--   Northwind users a1000000-0000-4000-8000-00000000000N
--                   1 admin · 2 manager · 3 inspector · 4 technician · 5 viewer · 6 technician
--   Meridian users  b1000000-0000-4000-8000-00000000000N   1 manager · 2 technician
--   Every seeded user's password: AegirDemo2026 (local only).

-- ---------------------------------------------------------------------------
-- Users (auth.users + auth.identities; profiles are created by trigger)
-- ---------------------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in
    select *
    from (values
      ('a1000000-0000-4000-8000-000000000001'::uuid, 'amelia.hart@northwind.example', 'Amelia Hart'),
      ('a1000000-0000-4000-8000-000000000002'::uuid, 'marcus.reyes@northwind.example', 'Marcus Reyes'),
      ('a1000000-0000-4000-8000-000000000003'::uuid, 'ingrid.solberg@northwind.example', 'Ingrid Solberg'),
      ('a1000000-0000-4000-8000-000000000004'::uuid, 'tomas.okafor@northwind.example', 'Tomas Okafor'),
      ('a1000000-0000-4000-8000-000000000005'::uuid, 'vera.lindqvist@northwind.example', 'Vera Lindqvist'),
      ('a1000000-0000-4000-8000-000000000006'::uuid, 'kenji.watanabe@northwind.example', 'Kenji Watanabe'),
      ('b1000000-0000-4000-8000-000000000001'::uuid, 'owen.price@meridian.example', 'Owen Price'),
      ('b1000000-0000-4000-8000-000000000002'::uuid, 'sofia.marin@meridian.example', 'Sofia Marin')
    ) as t (id, email, full_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('AegirDemo2026', extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('full_name', u.full_name), now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      u.id, u.id::text,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Organizations and memberships
-- ---------------------------------------------------------------------------
insert into public.organizations (id, name, slug) values
  ('a0000000-0000-4000-8000-000000000001', 'Northwind Shipping', 'northwind-shipping'),
  ('b0000000-0000-4000-8000-000000000001', 'Meridian Tankers', 'meridian-tankers');

insert into public.memberships (organization_id, user_id, role) values
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'admin'),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 'manager'),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003', 'inspector'),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000004', 'technician'),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000005', 'viewer'),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000006', 'technician'),
  ('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'manager'),
  ('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000002', 'technician');

-- ---------------------------------------------------------------------------
-- Vessels (IMO numbers are fictional but carry valid check digits)
-- ---------------------------------------------------------------------------
insert into public.vessels
  (id, organization_id, name, imo_number, vessel_type, flag_state, status, year_built, gross_tonnage, created_by)
values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Northwind Aurora',  '9384124', 'bulk_carrier',     'Marshall Islands', 'active',         2012, 43500, 'a1000000-0000-4000-8000-000000000002'),
  ('a2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Northwind Halcyon', '9415571', 'container',        'Liberia',          'active',         2016, 94100, 'a1000000-0000-4000-8000-000000000002'),
  ('a2000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Northwind Fjord',   '9520637', 'tanker',           'Norway',           'in_maintenance', 2009, 61200, 'a1000000-0000-4000-8000-000000000002'),
  ('a2000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Northwind Petrel',  '9672181', 'offshore_support', 'Singapore',        'active',         2018,  4800, 'a1000000-0000-4000-8000-000000000002'),
  ('a2000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'Northwind Tern',    '9733052', 'tug',              'Malta',            'laid_up',        2005,   480, 'a1000000-0000-4000-8000-000000000002'),
  ('a2000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'Northwind Corsair', '9801469', 'general_cargo',    'Panama',           'active',         2014, 12900, 'a1000000-0000-4000-8000-000000000001'),
  ('b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Meridian Star',     '9158202', 'tanker',           'Greece',           'active',         2011, 58300, 'b1000000-0000-4000-8000-000000000001'),
  ('b2000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Meridian Crest',    '9267314', 'tanker',           'Cyprus',           'active',         2015, 62750, 'b1000000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------------------
-- Inspections (dates relative to today so overdue/upcoming stay meaningful)
-- ---------------------------------------------------------------------------
insert into public.inspections
  (id, organization_id, vessel_id, inspector_id, title, scheduled_for, notes, created_by)
values
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003', 'Quarterly safety inspection',  current_date - 20, 'Carried out alongside in port.', 'a1000000-0000-4000-8000-000000000002'),
  ('a3000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', 'Pre-maintenance survey',       current_date - 10, 'Ahead of scheduled dry-dock maintenance.', 'a1000000-0000-4000-8000-000000000002'),
  ('a3000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 'Monthly fire safety audit',    current_date - 2,  null, 'a1000000-0000-4000-8000-000000000002'),
  ('a3000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000003', 'Annual life-saving appliances inspection', current_date - 5, null, 'a1000000-0000-4000-8000-000000000002'),
  ('a3000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000003', 'Quarterly safety inspection',  current_date + 7,  null, 'a1000000-0000-4000-8000-000000000002'),
  ('a3000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', null,                                   'Navigation equipment check',   current_date + 14, null, 'a1000000-0000-4000-8000-000000000002'),
  ('b3000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'Cargo tank inspection',        current_date - 7,  null, 'b1000000-0000-4000-8000-000000000001');

insert into public.inspection_items
  (id, organization_id, inspection_id, position, category, description, result, finding, severity)
values
  -- Quarterly safety inspection, Northwind Aurora
  ('a6000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 1, 'Fire safety', 'Fire detection panel tested and alarms audible', 'pass', null, null),
  ('a6000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 2, 'Fire safety', 'Portable fire extinguishers in date and accessible', 'fail', 'Engine-room CO2 extinguisher (ER-04) is four months past its service date.', 'high'),
  ('a6000000-0000-4000-8000-000000000103', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 3, 'Life-saving appliances', 'Lifejackets stowed and lights working', 'pass', null, null),
  ('a6000000-0000-4000-8000-000000000104', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 4, 'Navigation', 'Navigation lights operational', 'pass', null, null),
  ('a6000000-0000-4000-8000-000000000105', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 5, 'Pollution prevention', 'Garbage management plan posted', 'not_applicable', 'Plan replaced fleet-wide last month; checked separately.', null),
  -- Pre-maintenance survey, Northwind Fjord
  ('a6000000-0000-4000-8000-000000000201', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000002', 1, 'Machinery', 'Main engine fuel system free of leaks', 'fail', 'Diesel weeping from the main engine fuel pump seal; drip tray half full.', 'critical'),
  ('a6000000-0000-4000-8000-000000000202', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000002', 2, 'Pollution prevention', 'Oily water separator 15 ppm alarm functional', 'fail', 'Alarm did not trigger during the test discharge.', 'medium'),
  ('a6000000-0000-4000-8000-000000000203', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000002', 3, 'Hull & structure', 'Ballast tank coatings visually intact', 'pass', null, null),
  ('a6000000-0000-4000-8000-000000000204', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000002', 4, 'Fire safety', 'Emergency fire pump starts and delivers pressure', 'pass', null, null),
  -- Monthly fire safety audit, Northwind Halcyon (in progress)
  ('a6000000-0000-4000-8000-000000000301', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000003', 1, 'Fire safety', 'Fire doors close and latch', 'pass', null, null),
  ('a6000000-0000-4000-8000-000000000302', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000003', 2, 'Fire safety', 'Fire hoses and nozzles complete at each station', 'pass', null, null),
  ('a6000000-0000-4000-8000-000000000303', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000003', 3, 'Fire safety', 'Fixed CO2 system release controls sealed', 'pending', null, null),
  ('a6000000-0000-4000-8000-000000000304', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000003', 4, 'Fire safety', 'Firefighter outfits complete with breathing apparatus', 'pending', null, null),
  -- Annual LSA inspection, Northwind Petrel (scheduled, overdue)
  ('a6000000-0000-4000-8000-000000000401', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 1, 'Life-saving appliances', 'Liferafts within service interval', 'pending', null, null),
  ('a6000000-0000-4000-8000-000000000402', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 2, 'Life-saving appliances', 'Rescue boat engine starts', 'pending', null, null),
  ('a6000000-0000-4000-8000-000000000403', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000004', 3, 'Life-saving appliances', 'EPIRB battery and hydrostatic release in date', 'pending', null, null),
  -- Quarterly safety inspection, Northwind Corsair (upcoming)
  ('a6000000-0000-4000-8000-000000000501', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000005', 1, 'Fire safety', 'Fire detection panel tested and alarms audible', 'pending', null, null),
  ('a6000000-0000-4000-8000-000000000502', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000005', 2, 'Navigation', 'Navigation lights operational', 'pending', null, null),
  -- Navigation equipment check, Northwind Aurora (upcoming, unassigned)
  ('a6000000-0000-4000-8000-000000000601', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000006', 1, 'Navigation', 'Radar and ARPA performance check', 'pending', null, null),
  ('a6000000-0000-4000-8000-000000000602', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000006', 2, 'Navigation', 'ECDIS charts up to date', 'pending', null, null),
  -- Meridian: cargo tank inspection, Meridian Star
  ('b6000000-0000-4000-8000-000000000101', 'b0000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 1, 'Cargo', 'Cargo tank level gauges read correctly', 'fail', 'Tank 3P gauge reads 0.4 m low against manual sounding.', 'high'),
  ('b6000000-0000-4000-8000-000000000102', 'b0000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 2, 'Cargo', 'Inert gas system pressure normal', 'pass', null, null);

-- Move inspections through their lifecycle via the transition triggers.
update public.inspections set status = 'in_progress'
where id in (
  'a3000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000002',
  'a3000000-0000-4000-8000-000000000003', 'b3000000-0000-4000-8000-000000000001'
);
update public.inspections set status = 'completed'
where id in (
  'a3000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000002',
  'b3000000-0000-4000-8000-000000000001'
);

-- ---------------------------------------------------------------------------
-- Work orders
-- ---------------------------------------------------------------------------
insert into public.work_orders
  (id, organization_id, vessel_id, inspection_item_id, title, description, priority, assignee_id, due_date, created_by)
values
  ('a4000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000102', 'Replace expired engine-room CO2 extinguisher', 'Swap ER-04 for a serviced unit and update the extinguisher register.', 'high', 'a1000000-0000-4000-8000-000000000004', current_date - 2, 'a1000000-0000-4000-8000-000000000003'),
  ('a4000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000003', 'a6000000-0000-4000-8000-000000000201', 'Repair main engine fuel pump seal', 'Replace the seal kit and pressure-test the fuel line before restart.', 'critical', 'a1000000-0000-4000-8000-000000000006', current_date + 3, 'a1000000-0000-4000-8000-000000000003'),
  ('a4000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000003', 'a6000000-0000-4000-8000-000000000202', 'Restore oily water separator 15 ppm alarm', null, 'medium', 'a1000000-0000-4000-8000-000000000004', current_date + 10, 'a1000000-0000-4000-8000-000000000003'),
  ('a4000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002', null, 'Service lifeboat davit winch', 'Planned maintenance: grease, brake test, wire inspection.', 'medium', 'a1000000-0000-4000-8000-000000000004', current_date - 8, 'a1000000-0000-4000-8000-000000000002'),
  ('a4000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000006', null, 'Replace corroded deck railing section', 'Starboard main deck, frames 42-46.', 'low', null, current_date - 5, 'a1000000-0000-4000-8000-000000000002'),
  ('a4000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000004', null, 'Calibrate fixed gas detection sensors', null, 'high', 'a1000000-0000-4000-8000-000000000006', current_date + 5, 'a1000000-0000-4000-8000-000000000002'),
  ('b4000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001', 'b6000000-0000-4000-8000-000000000101', 'Recalibrate tank 3P level gauge', null, 'high', 'b1000000-0000-4000-8000-000000000002', current_date + 4, 'b1000000-0000-4000-8000-000000000001');

update public.work_orders set status = 'in_progress'
where id in ('a4000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000004');
update public.work_orders set status = 'completed'
where id = 'a4000000-0000-4000-8000-000000000004';
update public.work_orders
set status = 'blocked', blocked_reason = 'Awaiting replacement seal kit from supplier (ETA 2 days).'
where id = 'a4000000-0000-4000-8000-000000000002';

-- ---------------------------------------------------------------------------
-- Handovers
-- ---------------------------------------------------------------------------
insert into public.handovers
  (id, organization_id, vessel_id, work_order_id, from_user_id, to_user_id, summary, outstanding_tasks)
values
  ('a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', null, 'a4000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000006', 'Engine-room extinguisher swap half done', 'Replacement unit is in the ER store. Mount it at ER-04, tag the old unit for shore service, update the register.'),
  ('a5000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000003', null, 'a1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000004', 'Night shift: Fjord fuel pump isolation', 'Fuel pump isolated and tagged out. Drip tray emptied at 02:00. Do not restart until the seal kit is fitted.'),
  ('a5000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000004', null, 'a1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003', 'Petrel LSA inspection is overdue', 'Please prioritise the annual LSA inspection on Petrel this week; the vessel sails Friday.'),
  ('b5000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', null, 'b4000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000002', 'Tank 3P gauge recalibration', 'Calibration kit arrives tomorrow; compare against manual soundings at three levels.');

update public.handovers set status = 'acknowledged'
where id = 'a5000000-0000-4000-8000-000000000002';
