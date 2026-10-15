-- A failed check that a work order follows up is evidence for that work: its
-- result can no longer be changed away from "fail" (D-037). Before this, one
-- tap on Pass or N/A cleared the finding and severity (inspection_items_before_write
-- nulls them), leaving a work order that pointed at a passed check.
--
-- The finding text and severity of such a check may still be refined while the
-- inspection is open; every change is kept in audit_events.
--
-- Security invoker: anyone allowed to update a checklist item is a member of its
-- organization and can read that organization's work orders (RLS "select members"),
-- so no definer bypass is needed (CONVENTIONS.md §4).

create function private.inspection_items_protect_linked_failure()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.result = 'fail'
     and new.result is distinct from 'fail'
     and exists (
       select 1
       from public.work_orders wo
       where wo.inspection_item_id = old.id
         and wo.organization_id = old.organization_id
     )
  then
    raise exception 'A failed check with a work order can no longer change its result'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function private.inspection_items_protect_linked_failure() from public;

create trigger inspection_items_protect_linked_failure
  before update of result on public.inspection_items
  for each row execute function private.inspection_items_protect_linked_failure();
