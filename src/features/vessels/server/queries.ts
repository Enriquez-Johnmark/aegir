import "server-only";

import { cache } from "react";

import {
  compareByAttention,
  emptyAttention,
  tallyAttention,
  type VesselAttention,
  type VesselStatus,
  type VesselType,
} from "@/features/vessels/domain";
import type { VesselListParams } from "@/features/vessels/schemas";
import { requireUser } from "@/lib/auth/session";
import { todayIsoDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type Enums = Database["public"]["Enums"];

export type VesselListItem = VesselAttention & {
  id: string;
  name: string;
  imoNumber: string;
  vesselType: VesselType;
  flagState: string;
  status: VesselStatus;
};

/**
 * Vessels of the caller's organization with their attention counts. RLS
 * already limits rows to the caller's organizations; the explicit organization
 * filter keeps the query honest for users with several memberships (D-019).
 */
export async function listVessels(params: VesselListParams): Promise<VesselListItem[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const orgId = user.organization.id;
  const today = todayIsoDate();

  let query = supabase
    .from("vessels")
    .select("id, name, imo_number, vessel_type, flag_state, status")
    .eq("organization_id", orgId);

  if (params.q) {
    // q is sanitised by vesselListParamsSchema (letters, digits, spaces, ' and - only).
    query = query.or(`name.ilike.%${params.q}%,imo_number.ilike.%${params.q}%`);
  }
  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.type) {
    query = query.eq("vessel_type", params.type);
  }

  query =
    params.sort === "recent"
      ? query.order("updated_at", { ascending: false })
      : params.sort === "year"
        ? query.order("year_built", { ascending: false, nullsFirst: false })
        : query.order("name", { ascending: true });

  const [vessels, openWork, lateInspections] = await Promise.all([
    query,
    supabase
      .from("work_orders")
      .select("vessel_id, priority, status, due_date")
      .eq("organization_id", orgId)
      .neq("status", "completed"),
    supabase
      .from("inspections")
      .select("vessel_id, status, scheduled_for")
      .eq("organization_id", orgId)
      .in("status", ["scheduled", "in_progress"])
      .lt("scheduled_for", today),
  ]);

  for (const result of [vessels, openWork, lateInspections]) {
    if (result.error) {
      throw new Error("Could not load vessels.", { cause: result.error });
    }
  }

  const attention = tallyAttention(
    (openWork.data ?? []).map((wo) => ({
      vesselId: wo.vessel_id,
      priority: wo.priority,
      status: wo.status,
      dueDate: wo.due_date,
    })),
    (lateInspections.data ?? []).map((inspection) => ({
      vesselId: inspection.vessel_id,
      status: inspection.status,
      scheduledFor: inspection.scheduled_for,
    })),
    today,
  );
  const entry = (vesselId: string) => attention.get(vesselId) ?? emptyAttention();

  const items = (vessels.data ?? []).map((vessel) => ({
    id: vessel.id,
    name: vessel.name,
    imoNumber: vessel.imo_number,
    vesselType: vessel.vessel_type,
    flagState: vessel.flag_state,
    status: vessel.status,
    ...entry(vessel.id),
  }));

  return params.sort === "attention" ? items.toSorted(compareByAttention) : items;
}

export type VesselDetail = {
  id: string;
  name: string;
  imoNumber: string;
  vesselType: VesselType;
  flagState: string;
  status: VesselStatus;
  yearBuilt: number | null;
  grossTonnage: number | null;
  updatedAt: string;
  workOrders: {
    id: string;
    title: string;
    priority: Enums["severity"];
    status: Enums["work_order_status"];
    dueDate: string | null;
    isOverdue: boolean;
    assigneeName: string | null;
  }[];
  inspections: {
    id: string;
    title: string;
    status: Enums["inspection_status"];
    scheduledFor: string;
    completedAt: string | null;
    isOverdue: boolean;
    inspectorName: string | null;
  }[];
};

/**
 * Returns null when the vessel does not exist or belongs to another organization.
 * Wrapped in React.cache so generateMetadata and the page share one fetch per request.
 */
export const getVesselDetail = cache(async (vesselId: string): Promise<VesselDetail | null> => {
  const user = await requireUser();
  const supabase = await createClient();

  const [vessel, workOrders, inspections] = await Promise.all([
    supabase
      .from("vessels")
      .select("id, name, imo_number, vessel_type, flag_state, status, year_built, gross_tonnage, updated_at")
      .eq("id", vesselId)
      .eq("organization_id", user.organization.id)
      .maybeSingle(),
    supabase
      .from("work_orders")
      .select("id, title, priority, status, due_date, assignee:profiles!work_orders_assignee_id_fkey (full_name)")
      .eq("vessel_id", vesselId)
      .neq("status", "completed")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(20),
    supabase
      .from("inspections")
      .select("id, title, status, scheduled_for, completed_at, inspector:profiles!inspections_inspector_id_fkey (full_name)")
      .eq("vessel_id", vesselId)
      .order("scheduled_for", { ascending: false })
      .limit(10),
  ]);

  for (const result of [vessel, workOrders, inspections]) {
    if (result.error) {
      throw new Error("Could not load the vessel.", { cause: result.error });
    }
  }
  if (!vessel.data) {
    return null;
  }

  const today = todayIsoDate();
  const v = vessel.data;

  return {
    id: v.id,
    name: v.name,
    imoNumber: v.imo_number,
    vesselType: v.vessel_type,
    flagState: v.flag_state,
    status: v.status,
    yearBuilt: v.year_built,
    grossTonnage: v.gross_tonnage,
    updatedAt: v.updated_at,
    workOrders: (workOrders.data ?? []).map((wo) => ({
      id: wo.id,
      title: wo.title,
      priority: wo.priority,
      status: wo.status,
      dueDate: wo.due_date,
      isOverdue: wo.due_date !== null && wo.due_date < today,
      assigneeName: wo.assignee?.full_name ?? null,
    })),
    inspections: (inspections.data ?? []).map((inspection) => ({
      id: inspection.id,
      title: inspection.title,
      status: inspection.status,
      scheduledFor: inspection.scheduled_for,
      completedAt: inspection.completed_at,
      isOverdue:
        (inspection.status === "scheduled" || inspection.status === "in_progress") &&
        inspection.scheduled_for < today,
      inspectorName: inspection.inspector?.full_name ?? null,
    })),
  };
});

/** Form values for the edit page, or null when not visible to the caller. */
export async function getVesselForEdit(vesselId: string) {
  const vessel = await getVesselDetail(vesselId);
  if (!vessel) {
    return null;
  }
  return {
    vesselName: vessel.name,
    values: {
    name: vessel.name,
    imoNumber: vessel.imoNumber,
    vesselType: vessel.vesselType,
    flagState: vessel.flagState,
    status: vessel.status,
    yearBuilt: vessel.yearBuilt === null ? "" : String(vessel.yearBuilt),
    grossTonnage: vessel.grossTonnage === null ? "" : String(vessel.grossTonnage),
    },
  };
}

/** Every vessel in the organization (including decommissioned), for list filters. */
export async function listVesselNames(): Promise<{ id: string; name: string }[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vessels")
    .select("id, name")
    .eq("organization_id", user.organization.id)
    .order("name", { ascending: true });
  if (error) {
    throw new Error("Could not load vessels.", { cause: error });
  }
  return data ?? [];
}
