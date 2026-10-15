-- Fix forward (20261012070235_create_inspections.sql is applied and shared).
--
-- The original update policy on inspection_items let the assigned inspector
-- record results without re-checking their role. The inspector_id is validated
-- when it is assigned, but a member whose role later changes (e.g. inspector →
-- viewer) kept write access to that checklist. The inspections policy already
-- re-checks the role; this brings checklist items in line with it.

drop policy "inspection_items: update managers or assigned inspector" on public.inspection_items;

create policy "inspection_items: update managers or assigned inspector"
  on public.inspection_items for update
  to authenticated
  using (
    organization_id in (select private.my_org_ids_with_role(array['admin', 'manager']::public.org_role[]))
    or (
      organization_id in (select private.my_org_ids_with_role(array['inspector']::public.org_role[]))
      and inspection_id in (
        select i.id from public.inspections i where i.inspector_id = (select auth.uid())
      )
    )
  )
  with check (
    organization_id in (select private.my_org_ids_with_role(array['admin', 'manager']::public.org_role[]))
    or (
      organization_id in (select private.my_org_ids_with_role(array['inspector']::public.org_role[]))
      and inspection_id in (
        select i.id from public.inspections i where i.inspector_id = (select auth.uid())
      )
    )
  );
