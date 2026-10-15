import "server-only";

import { cache } from "react";

import {
  INSPECTOR_ROLES,
  isInspectionOverdue,
  summarizeChecklist,
  type ChecklistSummary,
  type CheckResult,
  type InspectionStatus,
  type Severity,
} from "@/features/inspections/domain";
import type { InspectionListParams } from "@/features/inspections/schemas";
import { requireUser } from "@/lib/auth/session";
import { todayIsoDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type InspectionListItem = {
  id: string;
  title: string;
  status: InspectionStatus;
  scheduledFor: string;
  completedAt: string | null;
  isOverdue: boolean;
  vessel: { id: string; name: string };
  inspectorName: string | null;
  checklist: ChecklistSummary;
};

const LIST_LIMIT = 200;

/**
 * Inspections of the caller's organization with checklist progress and the
 * number of failed checks still waiting for a work order. RLS limits rows to the
 * caller's organizations; the explicit organization filter keeps multi-membership
 * users honest (D-019).
 */
export async function listInspections(params: InspectionListParams): Promise<InspectionListItem[]> {
  const user = await requireUser();
  const supabase = await createClient();

  let query = supabase
    .from("inspections")
    .select(
      `id, title, status, scheduled_for, completed_at,
       vessel:vessels!inspections_vessel_id_organization_id_fkey (id, name),
       inspector:profiles!inspections_inspector_id_fkey (full_name),
       items:inspection_items (result, work_orders (id))`,
    )
    .eq("organization_id", user.organization.id);

  if (params.vessel) {
    query = query.eq("vessel_id", params.vessel);
  }

  // Open work reads as a queue (oldest date first, so overdue rises to the top);
  // finished work reads as a log (most recent first).
  if (params.view === "open") {
    query = query.in("status", ["scheduled", "in_progress"]).order("scheduled_for", { ascending: true });
  } else if (params.view === "completed") {
    query = query.eq("status", "completed").order("completed_at", { ascending: false });
  } else if (params.view === "cancelled") {
    query = query.eq("status", "cancelled").order("updated_at", { ascending: false });
  } else {
    query = query.order("scheduled_for", { ascending: false });
  }

  const { data, error } = await query.limit(LIST_LIMIT);
  if (error) {
    throw new Error("Could not load inspections.", { cause: error });
  }

  const today = todayIsoDate();
  return (data ?? []).flatMap((row) =>
    row.vessel
      ? [
          {
            id: row.id,
            title: row.title,
            status: row.status,
            scheduledFor: row.scheduled_for,
            completedAt: row.completed_at,
            isOverdue: isInspectionOverdue({ status: row.status, scheduledFor: row.scheduled_for }, today),
            vessel: { id: row.vessel.id, name: row.vessel.name },
            inspectorName: row.inspector?.full_name ?? null,
            checklist: summarizeChecklist(
              row.items.map((item) => ({ result: item.result, hasWorkOrder: item.work_orders.length > 0 })),
            ),
          },
        ]
      : [],
  );
}

export type ChecklistItem = {
  id: string;
  position: number;
  category: string;
  description: string;
  result: CheckResult;
  finding: string | null;
  severity: Severity | null;
  workOrders: { id: string; title: string; status: Database["public"]["Enums"]["work_order_status"] }[];
};

export type InspectionDetail = {
  id: string;
  title: string;
  status: InspectionStatus;
  scheduledFor: string;
  completedAt: string | null;
  notes: string | null;
  isOverdue: boolean;
  vessel: { id: string; name: string };
  inspector: { id: string; name: string } | null;
  createdByName: string | null;
  items: ChecklistItem[];
  checklist: ChecklistSummary;
};

/**
 * Returns null when the inspection does not exist or belongs to another organization.
 * Wrapped in React.cache so generateMetadata and the page share one fetch per request.
 */
export const getInspectionDetail = cache(async (inspectionId: string): Promise<InspectionDetail | null> => {
  const user = await requireUser();
  const supabase = await createClient();

  const [inspection, items] = await Promise.all([
    supabase
      .from("inspections")
      .select(
        `id, title, status, scheduled_for, completed_at, notes, inspector_id,
         vessel:vessels!inspections_vessel_id_organization_id_fkey (id, name),
         inspector:profiles!inspections_inspector_id_fkey (id, full_name),
         creator:profiles!inspections_created_by_fkey (full_name)`,
      )
      .eq("id", inspectionId)
      .eq("organization_id", user.organization.id)
      .maybeSingle(),
    supabase
      .from("inspection_items")
      .select("id, position, category, description, result, finding, severity, work_orders (id, title, status)")
      .eq("inspection_id", inspectionId)
      .order("position", { ascending: true }),
  ]);

  for (const result of [inspection, items]) {
    if (result.error) {
      throw new Error("Could not load the inspection.", { cause: result.error });
    }
  }
  const row = inspection.data;
  if (!row?.vessel) {
    return null;
  }

  const checklistItems: ChecklistItem[] = (items.data ?? []).map((item) => ({
    id: item.id,
    position: item.position,
    category: item.category,
    description: item.description,
    result: item.result,
    finding: item.finding,
    severity: item.severity,
    workOrders: item.work_orders.map((wo) => ({ id: wo.id, title: wo.title, status: wo.status })),
  }));

  return {
    id: row.id,
    title: row.title,
    status: row.status,
    scheduledFor: row.scheduled_for,
    completedAt: row.completed_at,
    notes: row.notes,
    isOverdue: isInspectionOverdue({ status: row.status, scheduledFor: row.scheduled_for }, todayIsoDate()),
    vessel: { id: row.vessel.id, name: row.vessel.name },
    inspector: row.inspector ? { id: row.inspector.id, name: row.inspector.full_name } : null,
    createdByName: row.creator?.full_name ?? null,
    items: checklistItems,
    checklist: summarizeChecklist(
      checklistItems.map((item) => ({ result: item.result, hasWorkOrder: item.workOrders.length > 0 })),
    ),
  };
});

export type ScheduleFormOptions = {
  vessels: { id: string; name: string }[];
  inspectors: { id: string; name: string }[];
};

/** Vessels that can still be inspected, and colleagues who may be assigned as inspector. */
export async function getScheduleFormOptions(): Promise<ScheduleFormOptions> {
  const user = await requireUser();
  const supabase = await createClient();
  const orgId = user.organization.id;

  const [vessels, members] = await Promise.all([
    supabase
      .from("vessels")
      .select("id, name")
      .eq("organization_id", orgId)
      .neq("status", "decommissioned")
      .order("name", { ascending: true }),
    supabase
      .from("memberships")
      .select("user_id, profile:profiles (full_name)")
      .eq("organization_id", orgId)
      .in("role", INSPECTOR_ROLES),
  ]);

  for (const result of [vessels, members]) {
    if (result.error) {
      throw new Error("Could not load the scheduling options.", { cause: result.error });
    }
  }

  return {
    vessels: vessels.data ?? [],
    inspectors: (members.data ?? [])
      .flatMap((member) => (member.profile ? [{ id: member.user_id, name: member.profile.full_name }] : []))
      .toSorted((a, b) => a.name.localeCompare(b.name)),
  };
}
