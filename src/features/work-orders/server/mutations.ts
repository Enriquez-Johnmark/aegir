import "server-only";

import { canManage } from "@/features/work-orders/domain";
import type {
  CreateWorkOrderValues,
  StatusChangeValues,
  WorkOrderDetailsValues,
} from "@/features/work-orders/schemas";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type DbError = { code?: string; message?: string };

export type WorkOrderFieldErrors = { vesselId?: string[]; assigneeId?: string[] };

export type SaveResult =
  | { ok: true; workOrderId: string; /** Set when the work follows up a failed check. */ inspectionId?: string | null }
  | { ok: false; formError?: string; fieldErrors?: WorkOrderFieldErrors };

export type StatusResult = { ok: true } | { ok: false; error: string };

const NO_CREATE_PERMISSION =
  "Only safety inspectors, fleet managers and administrators can raise work orders.";
const NO_EDIT_PERMISSION = "Only fleet managers and administrators can edit work order details.";
const GONE = "This work order no longer exists or you can't change it.";

function toRow(values: WorkOrderDetailsValues) {
  return {
    title: values.title,
    description: values.description,
    priority: values.priority,
    assignee_id: values.assigneeId,
    due_date: values.dueDate,
  };
}

/** Explains the trigger's decisions (P0001, 23514, 42501) in plain language. */
function explain(error: DbError, fallback: string): { formError?: string; fieldErrors?: WorkOrderFieldErrors } {
  const message = error.message ?? "";
  if (error.code === "23514" && message.includes("Assignee")) {
    return { fieldErrors: { assigneeId: ["This person can't be assigned work. Choose someone else."] } };
  }
  if (error.code === "42501") {
    return { formError: message.includes("Only managers") ? NO_EDIT_PERMISSION : GONE };
  }
  if (error.code === "P0002") {
    return { formError: "The failed check this work order follows up is no longer visible." };
  }
  if (error.code === "P0001") {
    if (message.includes("failed checklist items")) {
      return { formError: "Work orders can only be raised from a failed check." };
    }
    if (message.includes("must match the inspected vessel")) {
      return { fieldErrors: { vesselId: ["A follow-up must be on the inspected vessel."] } };
    }
    if (message.includes("Completed work orders")) {
      return { formError: "This work order is completed, so it can no longer be changed." };
    }
  }
  return { formError: fallback };
}

/** The organization comes from the session; a follow-up's vessel is checked by the trigger. */
export async function createWorkOrder(values: CreateWorkOrderValues): Promise<SaveResult> {
  const user = await requireUser();
  if (!can(user.role, "work-orders:create")) {
    return { ok: false, formError: NO_CREATE_PERMISSION };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .insert({
      ...toRow(values),
      organization_id: user.organization.id,
      vessel_id: values.vesselId,
      inspection_item_id: values.inspectionItemId,
    })
    .select("id, item:inspection_items!work_orders_inspection_item_id_organization_id_fkey (inspection_id)")
    .single();

  if (error) {
    // A vessel from another organization fails the composite foreign key (23503).
    if (error.code === "23503") {
      return { ok: false, fieldErrors: { vesselId: ["This vessel is no longer in your fleet."] } };
    }
    return { ok: false, ...explain(error, "The work order could not be saved. Check the details and try again.") };
  }
  return { ok: true, workOrderId: data.id, inspectionId: data.item?.inspection_id ?? null };
}

export async function updateWorkOrderDetails(
  workOrderId: string,
  values: WorkOrderDetailsValues,
): Promise<SaveResult> {
  const user = await requireUser();
  if (!canManage(user.role)) {
    return { ok: false, formError: NO_EDIT_PERMISSION };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .update(toRow(values))
    .eq("id", workOrderId)
    .eq("organization_id", user.organization.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, ...explain(error, "The changes could not be saved. Check the details and try again.") };
  }
  // RLS turns a forbidden or foreign row into "no row updated".
  return data ? { ok: true, workOrderId: data.id } : { ok: false, formError: GONE };
}

export async function changeWorkOrderStatus(
  workOrderId: string,
  values: StatusChangeValues,
): Promise<StatusResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .update({ status: values.status, blocked_reason: values.blockedReason })
    .eq("id", workOrderId)
    .eq("organization_id", user.organization.id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "P0001" && (error.message ?? "").includes("Invalid work order status change")) {
      return { ok: false, error: "This work order has already moved on. Refresh the page to see its current state." };
    }
    return { ok: false, error: explain(error, "The status could not be changed. Refresh the page and try again.").formError ?? GONE };
  }
  return data ? { ok: true } : { ok: false, error: GONE };
}
