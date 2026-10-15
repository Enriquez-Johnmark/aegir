import "server-only";

import { cache } from "react";
import { z } from "zod";

import {
  describeAuditEvent,
  isAuditedTable,
  RECORD_TYPE_SLUGS,
  referencedPeople,
  snapshotName,
  type AuditedTable,
  type AuditEntry,
} from "@/features/audit/domain";
import { SYSTEM_ACTOR, type AuditLogParams } from "@/features/audit/schemas";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type EventRow = {
  id: number;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Json;
  occurred_at: string;
};

const EVENT_COLUMNS = "id, actor_id, entity_type, entity_id, action, changes, occurred_at";

export type AuditItem = AuditEntry & {
  id: number;
  occurredAt: string;
  /** Null for events with no actor: the seed, written by a trusted system context. */
  actorName: string | null;
  table: AuditedTable;
  /** The record the event is about. `href` is null when there is no page for it (members). */
  record: RecordRef;
};

/**
 * Turns event rows into readable items. audit_events.actor_id has no foreign
 * key (history outlives users), so actor names, people mentioned in changes and
 * record names are looked up: one query for people, one per table present.
 */
async function resolveEvents(
  supabase: Supabase,
  orgId: string,
  rows: EventRow[],
  { withRecords }: { withRecords: boolean },
): Promise<AuditItem[]> {
  const events = rows.flatMap((row) => (isAuditedTable(row.entity_type) ? [{ ...row, table: row.entity_type }] : []));

  const peopleIds = [
    ...new Set(events.flatMap((event) => [...(event.actor_id ? [event.actor_id] : []), ...referencedPeople(event.changes)])),
  ];
  const idsFor = (table: AuditedTable) => [
    ...new Set(events.filter((event) => event.table === table).map((event) => event.entity_id)),
  ];

  const [people, records] = await Promise.all([
    peopleIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", peopleIds)
      : Promise.resolve({ data: [], error: null }),
    withRecords ? loadRecords(supabase, orgId, idsFor) : Promise.resolve(new Map<string, RecordRef>()),
  ]);
  if (people.error) {
    throw new Error("Could not load the audit history.", { cause: people.error });
  }

  const names = new Map((people.data ?? []).map((profile) => [profile.id, profile.full_name]));
  const person = (userId: string) => names.get(userId) ?? "Former member";

  return events.flatMap((event) => {
    const entry = describeAuditEvent(event.table, event.action, event.changes, person);
    if (!entry) {
      return [];
    }
    const record = records.get(`${event.table}:${event.entity_id}`) ?? {
      name: snapshotName(event.table, event.changes) ?? RECORD_LABEL_FALLBACK[event.table],
      href: null,
      context: null,
    };
    return [
      {
        ...entry,
        id: event.id,
        occurredAt: event.occurred_at,
        actorName: event.actor_id ? person(event.actor_id) : null,
        table: event.table,
        record,
      },
    ];
  });
}

const RECORD_LABEL_FALLBACK: Record<AuditedTable, string> = {
  vessels: "A vessel",
  inspections: "An inspection",
  inspection_items: "A check",
  work_orders: "A work order",
  handovers: "A handover",
  memberships: "A member",
};

type RecordRef = {
  name: string;
  href: string | null;
  /** Where the record belongs, so same-named records can be told apart: "Annual LSA inspection · Northwind Petrel". */
  context: string | null;
};

/** Current names and links for the records events point at, keyed `table:id`. Each read is RLS-scoped and pinned to the organization. */
async function loadRecords(
  supabase: Supabase,
  orgId: string,
  idsFor: (table: AuditedTable) => string[],
): Promise<Map<string, RecordRef>> {
  const query = <T,>(table: AuditedTable, run: (ids: string[]) => PromiseLike<{ data: T[] | null; error: unknown }>) => {
    const ids = idsFor(table);
    return ids.length ? run(ids) : Promise.resolve({ data: [] as T[], error: null });
  };

  const [vessels, inspections, items, workOrders, handovers, members] = await Promise.all([
    query("vessels", (ids) => supabase.from("vessels").select("id, name").eq("organization_id", orgId).in("id", ids)),
    query("inspections", (ids) =>
      supabase
        .from("inspections")
        .select("id, title, vessel:vessels!inspections_vessel_id_organization_id_fkey (name)")
        .eq("organization_id", orgId)
        .in("id", ids),
    ),
    query("inspection_items", (ids) =>
      supabase
        .from("inspection_items")
        .select(
          `id, description, inspection_id,
           inspection:inspections!inspection_items_inspection_id_organization_id_fkey (
             title, vessel:vessels!inspections_vessel_id_organization_id_fkey (name)
           )`,
        )
        .eq("organization_id", orgId)
        .in("id", ids),
    ),
    query("work_orders", (ids) =>
      supabase
        .from("work_orders")
        .select("id, title, vessel:vessels!work_orders_vessel_id_organization_id_fkey (name)")
        .eq("organization_id", orgId)
        .in("id", ids),
    ),
    query("handovers", (ids) =>
      supabase
        .from("handovers")
        .select("id, summary, vessel:vessels!handovers_vessel_id_organization_id_fkey (name)")
        .eq("organization_id", orgId)
        .in("id", ids),
    ),
    query("memberships", (ids) =>
      supabase.from("memberships").select("id, profile:profiles (full_name)").eq("organization_id", orgId).in("id", ids),
    ),
  ]);

  for (const result of [vessels, inspections, items, workOrders, handovers, members]) {
    if (result.error) {
      throw new Error("Could not load the audit history.", { cause: result.error });
    }
  }

  const refs = new Map<string, RecordRef>();
  for (const row of vessels.data ?? []) {
    refs.set(`vessels:${row.id}`, { name: row.name, href: `/vessels/${row.id}`, context: null });
  }
  for (const row of inspections.data ?? []) {
    refs.set(`inspections:${row.id}`, {
      name: row.title,
      href: `/inspections/${row.id}`,
      context: row.vessel?.name ?? null,
    });
  }
  // A check has no page of its own: it links to its inspection, and names it.
  for (const row of items.data ?? []) {
    const parent = row.inspection;
    refs.set(`inspection_items:${row.id}`, {
      name: row.description,
      href: `/inspections/${row.inspection_id}`,
      context: parent ? [parent.title, parent.vessel?.name].filter(Boolean).join(" · ") : null,
    });
  }
  for (const row of workOrders.data ?? []) {
    refs.set(`work_orders:${row.id}`, {
      name: row.title,
      href: `/work-orders/${row.id}`,
      context: row.vessel?.name ?? null,
    });
  }
  for (const row of handovers.data ?? []) {
    refs.set(`handovers:${row.id}`, {
      name: row.summary,
      href: `/handovers/${row.id}`,
      context: row.vessel?.name ?? null,
    });
  }
  for (const row of members.data ?? []) {
    refs.set(`memberships:${row.id}`, { name: row.profile?.full_name ?? "Former member", href: null, context: null });
  }
  return refs;
}

export const AUDIT_PAGE_SIZE = 50;

/**
 * One page of the organization's audit log, newest first. Paging is keyset on
 * (occurred_at, id), served by audit_events_org_occurred_idx: the cursor is the
 * last event id of the previous page, and its timestamp breaks ties between
 * events from one transaction (an inspection and its checks share now()).
 * An unknown or foreign cursor is ignored, which shows the newest page.
 */
export async function listAuditEvents(
  params: AuditLogParams,
): Promise<{ items: AuditItem[]; nextCursor: number | null; cursorFound: boolean }> {
  const user = await requireUser();
  const supabase = await createClient();
  const orgId = user.organization.id;

  const cursor = params.before
    ? await supabase
        .from("audit_events")
        .select("id, occurred_at")
        .eq("organization_id", orgId)
        .eq("id", params.before)
        .maybeSingle()
    : null;
  if (cursor?.error) {
    throw new Error("Could not load the audit log.", { cause: cursor.error });
  }

  let query = supabase.from("audit_events").select(EVENT_COLUMNS).eq("organization_id", orgId);
  if (params.type) query = query.eq("entity_type", RECORD_TYPE_SLUGS[params.type]);
  if (params.actor === SYSTEM_ACTOR) query = query.is("actor_id", null);
  else if (params.actor) query = query.eq("actor_id", params.actor);
  if (cursor?.data) {
    // Values come from the database, not the URL; quoted because timestamps contain "." and ":".
    // The plain upper bound lets the index seek straight to the page; the `or` then breaks ties.
    const at = `"${cursor.data.occurred_at}"`;
    query = query
      .lte("occurred_at", cursor.data.occurred_at)
      .or(`occurred_at.lt.${at},and(occurred_at.eq.${at},id.lt.${cursor.data.id})`);
  }

  const { data, error } = await query
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(AUDIT_PAGE_SIZE + 1);
  if (error) {
    throw new Error("Could not load the audit log.", { cause: error });
  }

  const rows = data ?? [];
  const page = rows.slice(0, AUDIT_PAGE_SIZE);
  return {
    items: await resolveEvents(supabase, orgId, page, { withRecords: true }),
    nextCursor: rows.length > AUDIT_PAGE_SIZE ? (page.at(-1)?.id ?? null) : null,
    cursorFound: Boolean(cursor?.data),
  };
}

export const RECORD_HISTORY_LIMIT = 100;

export type RecordHistory = { items: AuditItem[]; truncated: boolean };

/**
 * A record's own history, oldest first (the latest RECORD_HISTORY_LIMIT
 * events). An inspection's history includes its checks, which have no page of
 * their own. Cached per request so the page and its parts share one fetch.
 */
export const getRecordHistory = cache(
  async (table: "vessels" | "inspections" | "work_orders" | "handovers", id: string): Promise<RecordHistory> => {
    // Callers pass ids read from the database; checked anyway, since the id is spliced into a filter.
    if (!z.uuid().safeParse(id).success) {
      return { items: [], truncated: false };
    }
    const user = await requireUser();
    const supabase = await createClient();
    const orgId = user.organization.id;

    let query = supabase.from("audit_events").select(EVENT_COLUMNS).eq("organization_id", orgId);
    if (table === "inspections") {
      const items = await supabase
        .from("inspection_items")
        .select("id")
        .eq("organization_id", orgId)
        .eq("inspection_id", id);
      if (items.error) {
        throw new Error("Could not load the history.", { cause: items.error });
      }
      const itemIds = (items.data ?? []).map((item) => item.id);
      query = itemIds.length
        ? query.or(
            `and(entity_type.eq.inspections,entity_id.eq.${id}),and(entity_type.eq.inspection_items,entity_id.in.(${itemIds.join(",")}))`,
          )
        : query.eq("entity_type", "inspections").eq("entity_id", id);
    } else {
      query = query.eq("entity_type", table).eq("entity_id", id);
    }

    const { data, error } = await query
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(RECORD_HISTORY_LIMIT + 1);
    if (error) {
      throw new Error("Could not load the history.", { cause: error });
    }

    const rows = (data ?? []).slice(0, RECORD_HISTORY_LIMIT).toReversed();
    return {
      // Check names are needed on an inspection; other records are the page itself.
      items: await resolveEvents(supabase, orgId, rows, { withRecords: table === "inspections" }),
      truncated: (data ?? []).length > RECORD_HISTORY_LIMIT,
    };
  },
);

/**
 * Everyone in the organization, for the log's person filter (any role: viewers
 * can't change things, but the list stays complete). Cached per request: the
 * filters and the log's summary both use it.
 */
export const listAuditPeople = cache(async (): Promise<{ id: string; name: string }[]> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id, profile:profiles (full_name)")
    .eq("organization_id", user.organization.id);
  if (error) {
    throw new Error("Could not load the people filter.", { cause: error });
  }
  return (data ?? [])
    .flatMap((member) => (member.profile ? [{ id: member.user_id, name: member.profile.full_name }] : []))
    .toSorted((a, b) => a.name.localeCompare(b.name));
});
