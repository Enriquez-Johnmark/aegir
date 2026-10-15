import "server-only";

import type { CreateHandoverValues } from "@/features/handovers/schemas";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database.types";

type DbError = { code?: string; message?: string };

export type HandoverFieldErrors = { vesselId?: string[]; workOrderId?: string[]; toUserId?: string[] };

export type CreateResult =
  | { ok: true; handoverId: string }
  | { ok: false; formError?: string; fieldErrors?: HandoverFieldErrors };

export type AcknowledgeResult = { ok: true } | { ok: false; error: string };

const NO_CREATE_PERMISSION = "Read-only viewers can't hand work over. Ask a colleague with crew access.";

/** Explains the trigger's and constraints' decisions in plain language. */
function explainCreate(error: DbError): { formError?: string; fieldErrors?: HandoverFieldErrors } {
  const message = error.message ?? "";
  if (error.code === "23514" && message.includes("Recipient")) {
    return { fieldErrors: { toUserId: ["This person can't take work over. Choose a crew member."] } };
  }
  if (error.code === "P0001" && message.includes("must match the work order vessel")) {
    return { fieldErrors: { workOrderId: ["That work order is on a different vessel. Choose one on this vessel."] } };
  }
  // A vessel or work order from another organization fails the composite foreign key.
  if (error.code === "23503") {
    return { formError: "That vessel or work order is no longer available. Refresh and choose again." };
  }
  if (error.code === "42501") {
    return { formError: NO_CREATE_PERMISSION };
  }
  return { formError: "The handover could not be saved. Check the details and try again." };
}

/** The sender and organization come from the session; the database fills the vessel from a work order. */
export async function createHandover(values: CreateHandoverValues): Promise<CreateResult> {
  const user = await requireUser();
  if (!can(user.role, "handovers:create")) {
    return { ok: false, formError: NO_CREATE_PERMISSION };
  }

  // from_user_id is NOT NULL but deliberately absent: clients have no grant on it and
  // handovers_before_write() sets it to auth.uid() (D-017). The generated Insert type
  // can't express "set by trigger", hence the one cast.
  const row = {
    organization_id: user.organization.id,
    vessel_id: values.vesselId,
    work_order_id: values.workOrderId,
    to_user_id: values.toUserId,
    summary: values.summary,
    outstanding_tasks: values.outstandingTasks,
  } satisfies Omit<TablesInsert<"handovers">, "from_user_id">;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("handovers")
    .insert(row as TablesInsert<"handovers">)
    .select("id")
    .single();

  if (error) {
    return { ok: false, ...explainCreate(error) };
  }
  return { ok: true, handoverId: data.id };
}

/** Only the recipient can acknowledge (RLS); the trigger stamps the time and freezes the record. */
export async function acknowledgeHandover(handoverId: string): Promise<AcknowledgeResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("handovers")
    .update({ status: "acknowledged" })
    .eq("id", handoverId)
    .eq("organization_id", user.organization.id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "P0001") {
      return { ok: false, error: "This handover was already acknowledged." };
    }
    return { ok: false, error: "The acknowledgement could not be saved. Refresh the page and try again." };
  }
  // RLS turns "not the recipient" (or another organization's handover) into "no row updated".
  return data ? { ok: true } : { ok: false, error: "Only the person this handover is addressed to can acknowledge it." };
}
