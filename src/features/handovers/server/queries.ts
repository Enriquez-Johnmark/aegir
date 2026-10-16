import "server-only";

import { cache } from "react";

import { compareHandovers, RECIPIENT_ROLES, type HandoverStatus } from "@/features/handovers/domain";
import type { HandoverListParams } from "@/features/handovers/schemas";
import type { OrgRole } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type HandoverListItem = {
  id: string;
  summary: string;
  status: HandoverStatus;
  createdAt: string;
  acknowledgedAt: string | null;
  fromUserId: string;
  toUserId: string;
  fromName: string | null;
  toName: string | null;
  vessel: { id: string; name: string } | null;
  workOrder: { id: string; title: string } | null;
};

const LIST_LIMIT = 200;

const LIST_COLUMNS = `id, summary, status, created_at, acknowledged_at, from_user_id, to_user_id,
  sender:profiles!handovers_from_user_id_fkey (full_name),
  recipient:profiles!handovers_to_user_id_fkey (full_name),
  vessel:vessels!handovers_vessel_id_organization_id_fkey (id, name),
  work_order:work_orders!handovers_work_order_id_organization_id_fkey (id, title)`;

/**
 * Handovers of the caller's organization, as an inbox: pending ones for the
 * caller first, then other pending ones (longest-waiting first), then
 * acknowledged ones (newest first). RLS limits rows to the caller's organizations; the
 * explicit organization filter keeps multi-membership users honest (D-019).
 */
export async function listHandovers(params: HandoverListParams): Promise<HandoverListItem[]> {
  const user = await requireUser();
  const supabase = await createClient();

  const base = () => {
    let query = supabase.from("handovers").select(LIST_COLUMNS).eq("organization_id", user.organization.id);
    if (params.vessel) query = query.eq("vessel_id", params.vessel);
    if (params.view === "pending") query = query.eq("status", "pending");
    if (params.view === "for-you") query = query.eq("to_user_id", user.id).eq("status", "pending");
    if (params.view === "sent") query = query.eq("from_user_id", user.id);
    if (params.view === "acknowledged") query = query.eq("status", "acknowledged");
    return query;
  };

  // Cut to LIST_LIMIT after sorting, never before: each part of the inbox order is
  // read in that order, so the longest-waiting pending handovers can't drop out.
  const results = await Promise.all([
    base().eq("status", "pending").eq("to_user_id", user.id).order("created_at", { ascending: true }).limit(LIST_LIMIT),
    base().eq("status", "pending").neq("to_user_id", user.id).order("created_at", { ascending: true }).limit(LIST_LIMIT),
    base()
      .eq("status", "acknowledged")
      .order("acknowledged_at", { ascending: false, nullsFirst: false })
      .limit(LIST_LIMIT),
  ]);
  for (const result of results) {
    if (result.error) {
      throw new Error("Could not load handovers.", { cause: result.error });
    }
  }

  return results
    .flatMap((result) => result.data ?? [])
    .map((row) => ({
      id: row.id,
      summary: row.summary,
      status: row.status,
      createdAt: row.created_at,
      acknowledgedAt: row.acknowledged_at,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      fromName: row.sender?.full_name ?? null,
      toName: row.recipient?.full_name ?? null,
      vessel: row.vessel ? { id: row.vessel.id, name: row.vessel.name } : null,
      workOrder: row.work_order ? { id: row.work_order.id, title: row.work_order.title } : null,
    }))
    .toSorted((a, b) => compareHandovers(user.id, a, b))
    .slice(0, LIST_LIMIT);
}

export type HandoverDetail = HandoverListItem & { outstandingTasks: string };

/**
 * Returns null when the handover does not exist or belongs to another organization.
 * Wrapped in React.cache so generateMetadata and the page share one fetch per request.
 */
export const getHandoverDetail = cache(async (handoverId: string): Promise<HandoverDetail | null> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("handovers")
    .select(`${LIST_COLUMNS}, outstanding_tasks`)
    .eq("id", handoverId)
    .eq("organization_id", user.organization.id)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the handover.", { cause: error });
  }
  if (!data) {
    return null;
  }
  return {
    id: data.id,
    summary: data.summary,
    status: data.status,
    createdAt: data.created_at,
    acknowledgedAt: data.acknowledged_at,
    fromUserId: data.from_user_id,
    toUserId: data.to_user_id,
    fromName: data.sender?.full_name ?? null,
    toName: data.recipient?.full_name ?? null,
    vessel: data.vessel ? { id: data.vessel.id, name: data.vessel.name } : null,
    workOrder: data.work_order ? { id: data.work_order.id, title: data.work_order.title } : null,
    outstandingTasks: data.outstanding_tasks,
  };
});

export type HandoverFormOptions = {
  vessels: { id: string; name: string }[];
  /** Unfinished work orders, labelled with their vessel. */
  workOrders: { id: string; title: string; vesselId: string; vesselName: string }[];
  /** Colleagues who can take work over (never the caller, never a viewer), with their role. */
  recipients: { id: string; name: string; role: OrgRole }[];
};

export async function getHandoverFormOptions(): Promise<HandoverFormOptions> {
  const user = await requireUser();
  const supabase = await createClient();
  const orgId = user.organization.id;

  const [vessels, workOrders, members] = await Promise.all([
    supabase
      .from("vessels")
      .select("id, name")
      .eq("organization_id", orgId)
      .neq("status", "decommissioned")
      .order("name", { ascending: true }),
    supabase
      .from("work_orders")
      .select("id, title, vessel_id, vessel:vessels!work_orders_vessel_id_organization_id_fkey (name)")
      .eq("organization_id", orgId)
      .neq("status", "completed")
      .order("title", { ascending: true }),
    supabase
      .from("memberships")
      .select("user_id, role, profile:profiles (full_name)")
      .eq("organization_id", orgId)
      .in("role", RECIPIENT_ROLES)
      .neq("user_id", user.id),
  ]);

  for (const result of [vessels, workOrders, members]) {
    if (result.error) {
      throw new Error("Could not load the handover options.", { cause: result.error });
    }
  }

  return {
    vessels: vessels.data ?? [],
    workOrders: (workOrders.data ?? []).flatMap((wo) =>
      wo.vessel ? [{ id: wo.id, title: wo.title, vesselId: wo.vessel_id, vesselName: wo.vessel.name }] : [],
    ),
    recipients: (members.data ?? [])
      .flatMap((member) =>
        member.profile ? [{ id: member.user_id, name: member.profile.full_name, role: member.role }] : [],
      )
      .toSorted((a, b) => a.name.localeCompare(b.name)),
  };
}
