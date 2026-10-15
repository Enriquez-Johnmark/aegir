import "server-only";

import { buildDashboard, type Dashboard } from "@/features/dashboard/domain";
import { requireUser } from "@/lib/auth/session";
import { todayIsoDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/**
 * Live figures and queues for the caller's organization. Five independent reads
 * run in parallel, each as the user (RLS) and pinned to the session's
 * organization (D-019); buildDashboard() turns the rows into counts and lists.
 * Aggregation happens in memory, which is fine at fleet scale (D-035).
 */
export async function getDashboard(): Promise<Dashboard> {
  const user = await requireUser();
  const supabase = await createClient();
  const orgId = user.organization.id;

  const [vessels, workOrders, inspections, failedChecks, handovers] = await Promise.all([
    supabase.from("vessels").select("id, name, status").eq("organization_id", orgId),
    supabase
      .from("work_orders")
      .select(
        `id, title, priority, status, due_date, assignee_id, vessel_id, inspection_item_id,
         vessel:vessels!work_orders_vessel_id_organization_id_fkey (name),
         assignee:profiles!work_orders_assignee_id_fkey (full_name)`,
      )
      .eq("organization_id", orgId)
      .neq("status", "completed"),
    supabase
      .from("inspections")
      .select(
        `id, title, status, scheduled_for, vessel_id,
         vessel:vessels!inspections_vessel_id_organization_id_fkey (name),
         inspector:profiles!inspections_inspector_id_fkey (full_name)`,
      )
      .eq("organization_id", orgId)
      .in("status", ["scheduled", "in_progress"]),
    supabase
      .from("inspection_items")
      .select(
        `id, description, severity, updated_at,
         inspection:inspections!inspection_items_inspection_id_organization_id_fkey (
           id, title, vessel:vessels!inspections_vessel_id_organization_id_fkey (name)
         ),
         work_orders (id, status)`,
      )
      .eq("organization_id", orgId)
      .eq("result", "fail"),
    supabase
      .from("handovers")
      .select(
        `id, summary, created_at, from_user_id, to_user_id,
         sender:profiles!handovers_from_user_id_fkey (full_name),
         recipient:profiles!handovers_to_user_id_fkey (full_name),
         vessel:vessels!handovers_vessel_id_organization_id_fkey (name)`,
      )
      .eq("organization_id", orgId)
      .eq("status", "pending"),
  ]);

  for (const result of [vessels, workOrders, inspections, failedChecks, handovers]) {
    if (result.error) {
      throw new Error("Could not load the dashboard.", { cause: result.error });
    }
  }

  return buildDashboard(
    {
      vessels: vessels.data ?? [],
      openWorkOrders: (workOrders.data ?? []).flatMap((wo) =>
        wo.vessel
          ? [
              {
                id: wo.id,
                title: wo.title,
                priority: wo.priority,
                status: wo.status,
                dueDate: wo.due_date,
                assigneeId: wo.assignee_id,
                assigneeName: wo.assignee?.full_name ?? null,
                vesselId: wo.vessel_id,
                vesselName: wo.vessel.name,
                fromInspection: wo.inspection_item_id !== null,
              },
            ]
          : [],
      ),
      openInspections: (inspections.data ?? []).flatMap((inspection) =>
        inspection.vessel
          ? [
              {
                id: inspection.id,
                title: inspection.title,
                status: inspection.status,
                scheduledFor: inspection.scheduled_for,
                vesselId: inspection.vessel_id,
                vesselName: inspection.vessel.name,
                inspectorName: inspection.inspector?.full_name ?? null,
              },
            ]
          : [],
      ),
      failedChecks: (failedChecks.data ?? []).flatMap((item) =>
        item.inspection?.vessel
          ? [
              {
                id: item.id,
                description: item.description,
                severity: item.severity,
                recordedAt: item.updated_at,
                inspectionId: item.inspection.id,
                inspectionTitle: item.inspection.title,
                vesselName: item.inspection.vessel.name,
                workOrders: item.work_orders.map((wo) => ({ id: wo.id, status: wo.status })),
              },
            ]
          : [],
      ),
      pendingHandovers: (handovers.data ?? []).map((handover) => ({
        id: handover.id,
        summary: handover.summary,
        createdAt: handover.created_at,
        fromUserId: handover.from_user_id,
        fromName: handover.sender?.full_name ?? null,
        toUserId: handover.to_user_id,
        toName: handover.recipient?.full_name ?? null,
        vesselName: handover.vessel?.name ?? null,
      })),
    },
    { today: todayIsoDate(), userId: user.id },
  );
}
