import type { OrgRole } from "@/lib/auth/roles";
import type { Database } from "@/types/database.types";

export type WorkOrderStatus = Database["public"]["Enums"]["work_order_status"];
/** Work-order priority shares the database's `severity` enum with inspection findings. */
export type Priority = Database["public"]["Enums"]["severity"];

export const WORK_ORDER_STATUSES = [
  "open",
  "in_progress",
  "blocked",
  "completed",
] as const satisfies readonly WorkOrderStatus[];

export const PRIORITIES = ["critical", "high", "medium", "low"] as const satisfies readonly Priority[];

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  blocked: "Blocked",
  completed: "Completed",
};

/** DESIGN.md badge mapping: open → neutral, in progress → info, blocked → warning, completed → success. */
export const WORK_ORDER_STATUS_BADGE: Record<WorkOrderStatus, "outline" | "info" | "warning" | "success"> = {
  open: "outline",
  in_progress: "info",
  blocked: "warning",
  completed: "success",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Roles that can be assigned work (mirrors work_orders_before_write()). */
export const ASSIGNEE_ROLES = ["admin", "manager", "inspector", "technician"] as const satisfies readonly OrgRole[];

/**
 * Allowed status moves (mirrors private.work_orders_before_write()):
 * open → in progress | blocked; in progress → open | blocked | completed;
 * blocked → open | in progress. Completed is terminal.
 */
export const NEXT_STATUSES: Record<WorkOrderStatus, readonly WorkOrderStatus[]> = {
  open: ["in_progress", "blocked"],
  in_progress: ["completed", "blocked", "open"],
  blocked: ["in_progress", "open"],
  completed: [],
};

export function canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  return NEXT_STATUSES[from].includes(to);
}

/** Administrators and fleet managers edit any detail and reassign. UI only: the trigger enforces it. */
export function canManage(role: OrgRole): boolean {
  return role === "admin" || role === "manager";
}

/**
 * Who may move a work order through its statuses: managers always; inspectors
 * and technicians only when it is assigned to them (RLS: "update managers or assignee").
 */
export function canUpdateStatus(
  user: { id: string; role: OrgRole },
  workOrder: { assigneeId: string | null },
): boolean {
  if (canManage(user.role)) {
    return true;
  }
  return (user.role === "inspector" || user.role === "technician") && workOrder.assigneeId === user.id;
}

export function isWorkOrderOverdue(
  workOrder: { status: WorkOrderStatus; dueDate: string | null },
  today: string,
): boolean {
  return workOrder.status !== "completed" && workOrder.dueDate !== null && workOrder.dueDate < today;
}

const PRIORITY_RANK: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

type Urgent = { priority: Priority; dueDate: string | null; isOverdue: boolean; title: string };

/**
 * Urgency tier (D-037, supersedes D-034's "overdue first"): a late low-priority
 * job must not outrank critical work that is merely not due yet.
 * 0 overdue critical/high · 1 critical · 2 other overdue · 3 the rest.
 */
export function urgencyTier(workOrder: Pick<Urgent, "priority" | "isOverdue">): number {
  const severe = workOrder.priority === "critical" || workOrder.priority === "high";
  if (workOrder.isOverdue && severe) return 0;
  if (workOrder.priority === "critical") return 1;
  if (workOrder.isOverdue) return 2;
  return 3;
}

/**
 * Queue order for open work: by urgency tier, then priority, then the earliest
 * due date (undated last), then title.
 */
export function compareByUrgency(a: Urgent, b: Urgent): number {
  return (
    urgencyTier(a) - urgencyTier(b) ||
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31") ||
    a.title.localeCompare(b.title)
  );
}

const FIELD_LABELS: Record<string, string> = {
  title: "title",
  description: "description",
  priority: "priority",
  assignee_id: "assignee",
  due_date: "due date",
  blocked_reason: "blocked reason",
};

export type HistoryEntry =
  | { kind: "created" }
  | { kind: "status"; from: WorkOrderStatus; to: WorkOrderStatus; reason: string | null }
  | { kind: "updated"; fields: string[] };

/**
 * Turns an audit event (see private.record_audit_event()) into a timeline entry.
 * Returns null for events with nothing a person would recognise as a change.
 */
export function describeAuditEvent(action: string, changes: unknown): HistoryEntry | null {
  if (action === "insert") {
    return { kind: "created" };
  }
  if (typeof changes !== "object" || changes === null) {
    return null;
  }
  const record = changes as Record<string, { old?: unknown; new?: unknown } | undefined>;
  const status = record.status;
  if (action === "status_change" && status && isStatus(status.old) && isStatus(status.new)) {
    const reason = record.blocked_reason?.new;
    return { kind: "status", from: status.old, to: status.new, reason: typeof reason === "string" ? reason : null };
  }
  const fields = Object.keys(record)
    .map((key) => FIELD_LABELS[key])
    .filter((label): label is string => Boolean(label));
  return fields.length > 0 ? { kind: "updated", fields } : null;
}

function isStatus(value: unknown): value is WorkOrderStatus {
  return typeof value === "string" && (WORK_ORDER_STATUSES as readonly string[]).includes(value);
}
