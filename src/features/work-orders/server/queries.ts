import "server-only";

import { cache } from "react";

import {
  ASSIGNEE_ROLES,
  compareByUrgency,
  describeAuditEvent,
  isWorkOrderOverdue,
  type HistoryEntry,
  type Priority,
  type WorkOrderStatus,
} from "@/features/work-orders/domain";
import {
  UNASSIGNED,
  type WorkOrderFormFields,
  type WorkOrderListParams,
} from "@/features/work-orders/schemas";
import { requireUser } from "@/lib/auth/session";
import { todayIsoDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type WorkOrderListItem = {
  id: string;
  title: string;
  priority: Priority;
  status: WorkOrderStatus;
  dueDate: string | null;
  completedAt: string | null;
  isOverdue: boolean;
  blockedReason: string | null;
  fromInspection: boolean;
  vessel: { id: string; name: string };
  assigneeName: string | null;
};

const LIST_LIMIT = 200;

/**
 * Work orders of the caller's organization. Open views read as a queue
 * (overdue, then priority, then due date); completed work reads as a log.
 */
export async function listWorkOrders(params: WorkOrderListParams): Promise<WorkOrderListItem[]> {
  const user = await requireUser();
  const supabase = await createClient();

  let query = supabase
    .from("work_orders")
    .select(
      `id, title, priority, status, due_date, completed_at, blocked_reason, inspection_item_id,
       vessel:vessels!work_orders_vessel_id_organization_id_fkey (id, name),
       assignee:profiles!work_orders_assignee_id_fkey (full_name)`,
    )
    .eq("organization_id", user.organization.id);

  if (params.vessel) query = query.eq("vessel_id", params.vessel);
  if (params.priority) query = query.eq("priority", params.priority);

  if (params.view === "open") {
    query = query.neq("status", "completed");
  } else if (params.view === "mine") {
    query = query.eq("assignee_id", user.id).neq("status", "completed");
  } else if (params.view === "blocked") {
    query = query.eq("status", "blocked");
  } else if (params.view === "completed") {
    query = query.eq("status", "completed").order("completed_at", { ascending: false });
  } else {
    query = query.order("updated_at", { ascending: false });
  }

  const { data, error } = await query.limit(LIST_LIMIT);
  if (error) {
    throw new Error("Could not load work orders.", { cause: error });
  }

  const today = todayIsoDate();
  const items = (data ?? []).flatMap((row) =>
    row.vessel
      ? [
          {
            id: row.id,
            title: row.title,
            priority: row.priority,
            status: row.status,
            dueDate: row.due_date,
            completedAt: row.completed_at,
            isOverdue: isWorkOrderOverdue({ status: row.status, dueDate: row.due_date }, today),
            blockedReason: row.blocked_reason,
            fromInspection: row.inspection_item_id !== null,
            vessel: { id: row.vessel.id, name: row.vessel.name },
            assigneeName: row.assignee?.full_name ?? null,
          },
        ]
      : [],
  );

  const isQueue = params.view === "open" || params.view === "mine" || params.view === "blocked";
  return isQueue ? items.toSorted(compareByUrgency) : items;
}

export type WorkOrderHistoryItem = HistoryEntry & { id: number; occurredAt: string; actorName: string | null };

export type WorkOrderDetail = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: WorkOrderStatus;
  dueDate: string | null;
  completedAt: string | null;
  blockedReason: string | null;
  isOverdue: boolean;
  createdAt: string;
  vessel: { id: string; name: string };
  assignee: { id: string; name: string } | null;
  createdByName: string | null;
  /** The failed check this work order follows up, if any. */
  finding: {
    description: string;
    finding: string | null;
    severity: Priority | null;
    inspection: { id: string; title: string } | null;
  } | null;
  history: WorkOrderHistoryItem[];
};

/**
 * Returns null when the work order does not exist or belongs to another organization.
 * Wrapped in React.cache so generateMetadata and the page share one fetch per request.
 */
export const getWorkOrderDetail = cache(async (workOrderId: string): Promise<WorkOrderDetail | null> => {
  const user = await requireUser();
  const supabase = await createClient();

  const [workOrder, events] = await Promise.all([
    supabase
      .from("work_orders")
      .select(
        `id, title, description, priority, status, due_date, completed_at, blocked_reason, created_at,
         vessel:vessels!work_orders_vessel_id_organization_id_fkey (id, name),
         assignee:profiles!work_orders_assignee_id_fkey (id, full_name),
         creator:profiles!work_orders_created_by_fkey (full_name),
         item:inspection_items!work_orders_inspection_item_id_organization_id_fkey (
           description, finding, severity,
           inspection:inspections!inspection_items_inspection_id_organization_id_fkey (id, title)
         )`,
      )
      .eq("id", workOrderId)
      .eq("organization_id", user.organization.id)
      .maybeSingle(),
    supabase
      .from("audit_events")
      .select("id, actor_id, action, changes, occurred_at")
      .eq("organization_id", user.organization.id)
      .eq("entity_type", "work_orders")
      .eq("entity_id", workOrderId)
      .order("occurred_at", { ascending: true })
      .limit(100),
  ]);

  for (const result of [workOrder, events]) {
    if (result.error) {
      throw new Error("Could not load the work order.", { cause: result.error });
    }
  }
  const row = workOrder.data;
  if (!row?.vessel) {
    return null;
  }

  // audit_events.actor_id has no foreign key (history outlives users), so names are looked up.
  const actorIds = [...new Set((events.data ?? []).flatMap((event) => (event.actor_id ? [event.actor_id] : [])))];
  const actors = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [], error: null };
  if (actors.error) {
    throw new Error("Could not load the work order history.", { cause: actors.error });
  }
  const actorNames = new Map((actors.data ?? []).map((profile) => [profile.id, profile.full_name]));

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    blockedReason: row.blocked_reason,
    isOverdue: isWorkOrderOverdue({ status: row.status, dueDate: row.due_date }, todayIsoDate()),
    createdAt: row.created_at,
    vessel: { id: row.vessel.id, name: row.vessel.name },
    assignee: row.assignee ? { id: row.assignee.id, name: row.assignee.full_name } : null,
    createdByName: row.creator?.full_name ?? null,
    finding: row.item
      ? {
          description: row.item.description,
          finding: row.item.finding,
          severity: row.item.severity,
          inspection: row.item.inspection ? { id: row.item.inspection.id, title: row.item.inspection.title } : null,
        }
      : null,
    history: (events.data ?? []).flatMap((event) => {
      const entry = describeAuditEvent(event.action, event.changes);
      return entry
        ? [
            {
              ...entry,
              id: event.id,
              occurredAt: event.occurred_at,
              actorName: event.actor_id ? (actorNames.get(event.actor_id) ?? "Former member") : null,
            },
          ]
        : [];
    }),
  };
});

export type WorkOrderFormOptions = {
  vessels: { id: string; name: string }[];
  assignees: { id: string; name: string }[];
};

/** Vessels that can still get work, and colleagues who can be assigned. */
export async function getWorkOrderFormOptions(): Promise<WorkOrderFormOptions> {
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
      .in("role", ASSIGNEE_ROLES),
  ]);

  for (const result of [vessels, members]) {
    if (result.error) {
      throw new Error("Could not load the work order options.", { cause: result.error });
    }
  }

  return {
    vessels: vessels.data ?? [],
    assignees: (members.data ?? [])
      .flatMap((member) => (member.profile ? [{ id: member.user_id, name: member.profile.full_name }] : []))
      .toSorted((a, b) => a.name.localeCompare(b.name)),
  };
}

export type FailedCheck = {
  id: string;
  description: string;
  finding: string | null;
  severity: Priority | null;
  vessel: { id: string; name: string };
  inspection: { id: string; title: string };
  /** Work orders already raised for this check. */
  existingWorkOrders: number;
};

/** A failed checklist item to raise a work order from, or null if it isn't one (or isn't visible). */
export async function getFailedCheck(itemId: string): Promise<FailedCheck | null> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspection_items")
    .select(
      `id, description, finding, severity, result,
       inspection:inspections!inspection_items_inspection_id_organization_id_fkey (
         id, title, vessel:vessels!inspections_vessel_id_organization_id_fkey (id, name)
       ),
       work_orders (id)`,
    )
    .eq("id", itemId)
    .eq("organization_id", user.organization.id)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the failed check.", { cause: error });
  }
  if (!data || data.result !== "fail" || !data.inspection?.vessel) {
    return null;
  }
  return {
    id: data.id,
    description: data.description,
    finding: data.finding,
    severity: data.severity,
    vessel: { id: data.inspection.vessel.id, name: data.inspection.vessel.name },
    inspection: { id: data.inspection.id, title: data.inspection.title },
    existingWorkOrders: data.work_orders.length,
  };
}

/** Form values for the edit page, or null when not visible to the caller. */
export async function getWorkOrderForEdit(workOrderId: string) {
  const workOrder = await getWorkOrderDetail(workOrderId);
  if (!workOrder) {
    return null;
  }
  const values: Omit<WorkOrderFormFields, "vesselId" | "inspectionItemId"> = {
    title: workOrder.title,
    description: workOrder.description ?? "",
    priority: workOrder.priority,
    assigneeId: workOrder.assignee?.id ?? UNASSIGNED,
    dueDate: workOrder.dueDate ?? "",
  };
  return { workOrder, values };
}
