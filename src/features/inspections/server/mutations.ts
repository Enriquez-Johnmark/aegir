import "server-only";

import type { InspectionStatus } from "@/features/inspections/domain";
import type { RecordResultValues, ScheduleInspectionValues } from "@/features/inspections/schemas";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type DbError = { code?: string; message?: string };

export type ScheduleResult =
  | { ok: true; inspectionId: string }
  | { ok: false; formError?: string; fieldErrors?: { vesselId?: string[]; inspectorId?: string[] } };

export type ActionResult = { ok: true } | { ok: false; error: string };

const NO_SCHEDULE_PERMISSION = "Only safety inspectors, fleet managers and administrators can schedule inspections.";
const NO_CONDUCT_PERMISSION =
  "Only the assigned inspector, fleet managers and administrators can change this inspection.";
const GONE = "This inspection no longer exists or you can't change it.";

/**
 * Turns the transition and freeze triggers' errors (P0001) into plain language.
 * The trigger is the authority; these messages only explain its decision.
 */
function explainConductError(error: DbError): string {
  if (error.code === "42501") {
    return NO_CONDUCT_PERMISSION;
  }
  if (error.code === "P0001") {
    const message = error.message ?? "";
    if (message.includes("must have a result")) {
      return "Record a result for every check before completing the inspection.";
    }
    if (message.includes("can no longer be changed")) {
      return "This inspection is closed, so it can no longer be changed.";
    }
    if (message.includes("Invalid inspection status change")) {
      return "This inspection has already moved on. Refresh the page to see its current state.";
    }
  }
  if (error.code === "23514") {
    return "A failed check needs a finding and a severity.";
  }
  return "The change could not be saved. Refresh the page and try again.";
}

/** Creates the inspection and its checklist in one transaction (create_inspection RPC, security invoker). */
export async function scheduleInspection(values: ScheduleInspectionValues): Promise<ScheduleResult> {
  const user = await requireUser();
  if (!can(user.role, "inspections:create")) {
    return { ok: false, formError: NO_SCHEDULE_PERMISSION };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_inspection", {
    p_vessel_id: values.vesselId,
    p_title: values.title,
    p_scheduled_for: values.scheduledFor,
    // The RPC's SQL parameters are nullable; generated types can't express that for plpgsql.
    p_inspector_id: values.inspectorId as string,
    p_notes: values.notes as string,
    p_items: values.items,
  });

  if (!error) {
    return { ok: true, inspectionId: data };
  }
  if (error.code === "P0002") {
    return { ok: false, fieldErrors: { vesselId: ["This vessel is no longer in your fleet."] } };
  }
  if (error.code === "23514" && error.message.includes("Inspector")) {
    return {
      ok: false,
      fieldErrors: { inspectorId: ["This person can't be assigned as inspector. Choose someone else."] },
    };
  }
  if (error.code === "42501") {
    return { ok: false, formError: NO_SCHEDULE_PERMISSION };
  }
  return { ok: false, formError: "The inspection could not be scheduled. Check the details and try again." };
}

/** Start, complete or cancel. The transition trigger validates the move. */
export async function changeInspectionStatus(
  inspectionId: string,
  status: Exclude<InspectionStatus, "scheduled">,
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspections")
    .update({ status })
    .eq("id", inspectionId)
    .eq("organization_id", user.organization.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: explainConductError(error) };
  }
  // RLS turns a forbidden or foreign row into "no row updated".
  return data ? { ok: true } : { ok: false, error: GONE };
}

export async function recordItemResult(
  inspectionId: string,
  itemId: string,
  values: RecordResultValues,
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspection_items")
    .update({ result: values.result, finding: values.finding, severity: values.severity })
    .eq("id", itemId)
    .eq("inspection_id", inspectionId)
    .eq("organization_id", user.organization.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: explainConductError(error) };
  }
  return data ? { ok: true } : { ok: false, error: NO_CONDUCT_PERMISSION };
}
