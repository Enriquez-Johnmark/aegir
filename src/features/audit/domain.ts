import { CHECK_RESULT_LABELS, INSPECTION_STATUS_LABELS, SEVERITY_LABELS } from "@/features/inspections/domain";
import { HANDOVER_STATUS_LABELS } from "@/features/handovers/domain";
import { VESSEL_STATUS_LABELS, VESSEL_TYPE_LABELS } from "@/features/vessels/domain";
import { PRIORITY_LABELS, WORK_ORDER_STATUS_LABELS } from "@/features/work-orders/domain";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { formatDate, formatNumber } from "@/lib/format";

/** Tables with an audit trigger (see private.record_audit_event()). */
export const AUDITED_TABLES = [
  "vessels",
  "inspections",
  "inspection_items",
  "work_orders",
  "handovers",
  "memberships",
] as const;
export type AuditedTable = (typeof AUDITED_TABLES)[number];

export function isAuditedTable(value: string): value is AuditedTable {
  return (AUDITED_TABLES as readonly string[]).includes(value);
}

/** URL slugs for the log's record-type filter, so table names stay out of URLs. */
export const RECORD_TYPE_SLUGS = {
  vessels: "vessels",
  inspections: "inspections",
  checks: "inspection_items",
  "work-orders": "work_orders",
  handovers: "handovers",
  members: "memberships",
} as const satisfies Record<string, AuditedTable>;
export type RecordTypeSlug = keyof typeof RECORD_TYPE_SLUGS;

/** The log's record-type filter, by slug. */
export const RECORD_TYPE_FILTER_LABELS: Record<RecordTypeSlug, string> = {
  vessels: "Vessels",
  inspections: "Inspections",
  checks: "Inspection checks",
  "work-orders": "Work orders",
  handovers: "Handovers",
  members: "Members",
};

export const RECORD_TYPE_LABELS: Record<AuditedTable, string> = {
  vessels: "Vessel",
  inspections: "Inspection",
  inspection_items: "Inspection check",
  work_orders: "Work order",
  handovers: "Handover",
  memberships: "Member",
};

/** What creating each kind of record is called in this product. */
export const CREATED_LABELS: Record<AuditedTable, string> = {
  vessels: "Added",
  inspections: "Scheduled",
  inspection_items: "Added to the checklist",
  work_orders: "Raised",
  handovers: "Handed over",
  memberships: "Joined",
};

type FieldSpec =
  /** Short text: old and new values are shown. */
  | { label: string; kind: "text" }
  /** Long text (descriptions, findings, notes): named, never quoted (D-042). */
  | { label: string; kind: "long" }
  | { label: string; kind: "enum"; labels: Record<string, string> }
  | { label: string; kind: "person"; empty: string }
  | { label: string; kind: "date" }
  | { label: string; kind: "number" };

/**
 * The fields a person would recognise, most important first: the first changed
 * field is an entry's headline (a check's result, a work order's priority).
 * `status` is handled separately (it is the headline of a status change).
 */
const FIELDS: Record<AuditedTable, Record<string, FieldSpec>> = {
  vessels: {
    name: { label: "Name", kind: "text" },
    imo_number: { label: "IMO number", kind: "text" },
    vessel_type: { label: "Type", kind: "enum", labels: VESSEL_TYPE_LABELS },
    flag_state: { label: "Flag", kind: "text" },
    year_built: { label: "Year built", kind: "number" },
    gross_tonnage: { label: "Gross tonnage", kind: "number" },
  },
  inspections: {
    inspector_id: { label: "Inspector", kind: "person", empty: "Unassigned" },
    scheduled_for: { label: "Scheduled for", kind: "date" },
    title: { label: "Title", kind: "text" },
    notes: { label: "Notes", kind: "long" },
  },
  inspection_items: {
    result: { label: "Result", kind: "enum", labels: CHECK_RESULT_LABELS },
    severity: { label: "Severity", kind: "enum", labels: SEVERITY_LABELS },
    finding: { label: "Finding", kind: "long" },
    description: { label: "Check", kind: "text" },
    category: { label: "Category", kind: "text" },
  },
  work_orders: {
    priority: { label: "Priority", kind: "enum", labels: PRIORITY_LABELS },
    assignee_id: { label: "Assignee", kind: "person", empty: "Unassigned" },
    due_date: { label: "Due date", kind: "date" },
    title: { label: "Title", kind: "text" },
    description: { label: "Description", kind: "long" },
    blocked_reason: { label: "Blocked reason", kind: "long" },
  },
  handovers: {
    to_user_id: { label: "Recipient", kind: "person", empty: "Nobody" },
    summary: { label: "Summary", kind: "text" },
    outstanding_tasks: { label: "Outstanding tasks", kind: "long" },
  },
  memberships: {
    role: { label: "Role", kind: "enum", labels: ROLE_LABELS },
  },
};

const STATUS_LABELS: Partial<Record<AuditedTable, Record<string, string>>> = {
  vessels: VESSEL_STATUS_LABELS,
  inspections: INSPECTION_STATUS_LABELS,
  work_orders: WORK_ORDER_STATUS_LABELS,
  handovers: HANDOVER_STATUS_LABELS,
};

/**
 * Bookkeeping columns that never make an entry: keys and timestamps, and
 * columns the database sets alongside a status (completed_at, acknowledged_at).
 * Any other column that isn't in FIELDS is still shown, by name, so the log
 * never silently drops a change.
 */
const BOOKKEEPING = new Set([
  "id",
  "organization_id",
  "created_at",
  "updated_at",
  "created_by",
  "completed_at",
  "acknowledged_at",
]);

/** One changed field. `values` is null for long text, which is named but not quoted. */
export type FieldChange = {
  label: string;
  values: { from: string; to: string } | null;
  /** For long text: whether it was added, removed or rewritten. */
  verb: "added" | "removed" | "changed";
};

export type AuditEntry =
  | { kind: "created"; detail: string | null }
  | { kind: "status"; from: string; to: string; note: string | null; changes: FieldChange[] }
  | { kind: "updated"; changes: FieldChange[] };

/** Looks up a person's name by user id. */
export type PersonName = (userId: string) => string;

type Diff = { old?: unknown; new?: unknown };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function formatValue(spec: FieldSpec, value: unknown, person: PersonName): string {
  if (spec.kind === "person") {
    return typeof value === "string" ? person(value) : spec.empty;
  }
  if (isEmpty(value)) {
    return "None";
  }
  switch (spec.kind) {
    case "enum":
      return spec.labels[String(value)] ?? String(value);
    case "date":
      // A malformed stored date is shown as stored, never thrown on.
      return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? formatDate(value) : String(value);
    case "number":
      return typeof value === "number" ? formatNumber(value) : String(value);
    default:
      return `“${String(value)}”`;
  }
}

function humanize(column: string): string {
  const words = column.replace(/_id$/, "").replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function describeChange(table: AuditedTable, column: string, diff: Diff, person: PersonName): FieldChange {
  const spec: FieldSpec = FIELDS[table][column] ?? { label: humanize(column), kind: "long" };
  const verb = isEmpty(diff.old) ? "added" : isEmpty(diff.new) ? "removed" : "changed";
  if (spec.kind === "long") {
    return { label: spec.label, values: null, verb };
  }
  return {
    label: spec.label,
    values: { from: formatValue(spec, diff.old, person), to: formatValue(spec, diff.new, person) },
    verb,
  };
}

/** Changed columns in display order: known fields first (FIELDS order), then any others alphabetically. */
function changedColumns(table: AuditedTable, record: Record<string, unknown>, skip: Set<string>) {
  const known = Object.keys(FIELDS[table]).filter((column) => column in record);
  const others = Object.keys(record)
    .filter((column) => !(column in FIELDS[table]) && !BOOKKEEPING.has(column))
    .toSorted();
  return [...known, ...others].filter((column) => !skip.has(column) && isObject(record[column]));
}

/**
 * Turns an audit event (see private.record_audit_event()) into an entry a
 * person can read: inserts store a snapshot of the new row, updates store
 * `{column: {old, new}}` for changed columns only. Returns null when nothing
 * recognisable changed or the payload is malformed.
 */
export function describeAuditEvent(
  table: AuditedTable,
  action: string,
  changes: unknown,
  person: PersonName,
): AuditEntry | null {
  if (!isObject(changes)) {
    return action === "insert" ? { kind: "created", detail: null } : null;
  }

  if (action === "insert") {
    return { kind: "created", detail: createdDetail(table, changes, person) };
  }

  const status = changes.status;
  const statusLabels = STATUS_LABELS[table];
  if (statusLabels && isObject(status) && typeof status.old === "string" && typeof status.new === "string") {
    // A block reason is the note on the move into "blocked"; clearing it on the way out is implied.
    const reason = isObject(changes.blocked_reason) ? changes.blocked_reason.new : null;
    return {
      kind: "status",
      from: statusLabels[status.old] ?? status.old,
      to: statusLabels[status.new] ?? status.new,
      note: typeof reason === "string" && reason !== "" ? reason : null,
      changes: changedColumns(table, changes, new Set(["status", "blocked_reason"])).map((column) =>
        describeChange(table, column, changes[column] as Diff, person),
      ),
    };
  }

  const fieldChanges = changedColumns(table, changes, new Set(["status"])).map((column) =>
    describeChange(table, column, changes[column] as Diff, person),
  );
  return fieldChanges.length > 0 ? { kind: "updated", changes: fieldChanges } : null;
}

/** What a new record started as, when that matters: a check recorded as failed at once, a work order's priority. */
function createdDetail(table: AuditedTable, row: Record<string, unknown>, person: PersonName): string | null {
  const label = (labels: Record<string, string>, value: unknown) =>
    typeof value === "string" ? (labels[value] ?? value) : null;
  switch (table) {
    case "memberships": {
      const role = label(ROLE_LABELS, row.role);
      return role ? `as ${role}` : null;
    }
    case "handovers":
      return typeof row.to_user_id === "string" ? `to ${person(row.to_user_id)}` : null;
    case "work_orders": {
      const priority = label(PRIORITY_LABELS, row.priority);
      return priority ? `with ${priority} priority` : null;
    }
    case "inspections":
      return typeof row.scheduled_for === "string" && !Number.isNaN(Date.parse(row.scheduled_for))
        ? `for ${formatDate(row.scheduled_for)}`
        : null;
    case "inspection_items": {
      if (row.result === "pending" || typeof row.result !== "string") return null;
      const result = label(CHECK_RESULT_LABELS, row.result);
      const severity = label(SEVERITY_LABELS, row.severity);
      return severity ? `as ${result} (${severity} severity)` : `as ${result}`;
    }
    default:
      return null;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PERSON_COLUMNS = ["inspector_id", "assignee_id", "to_user_id", "from_user_id", "user_id"] as const;

/** User ids an event mentions (old and new values, or the inserted snapshot), so names can be looked up in one query. */
export function referencedPeople(changes: unknown): string[] {
  if (!isObject(changes)) {
    return [];
  }
  return PERSON_COLUMNS.flatMap((column) => {
    const value = changes[column];
    const candidates = isObject(value) ? [value.old, value.new] : [value];
    // Only well-formed ids reach the profiles lookup, so a malformed payload can't break the query.
    return candidates.filter((id): id is string => typeof id === "string" && UUID.test(id));
  });
}

/** The record's name as of its creation, from an insert snapshot: the fallback when the record can't be read any more. */
export function snapshotName(table: AuditedTable, changes: unknown): string | null {
  if (!isObject(changes)) {
    return null;
  }
  const column = { vessels: "name", inspections: "title", inspection_items: "description", work_orders: "title", handovers: "summary", memberships: null }[table];
  const value = column ? changes[column] : null;
  return typeof value === "string" ? value : null;
}

/** Groups entries (already newest first) by UTC calendar day, keeping order. */
export function groupByDay<T extends { occurredAt: string }>(items: T[]): { day: string; items: T[] }[] {
  const groups: { day: string; items: T[] }[] = [];
  for (const item of items) {
    const day = new Date(item.occurredAt).toISOString().slice(0, 10);
    const last = groups.at(-1);
    if (last?.day === day) {
      last.items.push(item);
    } else {
      groups.push({ day, items: [item] });
    }
  }
  return groups;
}
