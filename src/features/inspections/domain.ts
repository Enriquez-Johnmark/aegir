import type { OrgRole } from "@/lib/auth/roles";
import type { Database } from "@/types/database.types";

export type InspectionStatus = Database["public"]["Enums"]["inspection_status"];
export type CheckResult = Database["public"]["Enums"]["check_result"];
export type Severity = Database["public"]["Enums"]["severity"];

export const SEVERITIES = ["low", "medium", "high", "critical"] as const satisfies readonly Severity[];
/** The results an inspector can record ("pending" is the starting state, not a choice). */
export const RECORDABLE_RESULTS = ["pass", "fail", "not_applicable"] as const satisfies readonly CheckResult[];
export type RecordableResult = (typeof RECORDABLE_RESULTS)[number];

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** DESIGN.md badge mapping: scheduled/in progress → info, completed → success, cancelled → neutral. */
export const INSPECTION_STATUS_BADGE: Record<InspectionStatus, "info" | "success" | "outline"> = {
  scheduled: "info",
  in_progress: "info",
  completed: "success",
  cancelled: "outline",
};

export const CHECK_RESULT_LABELS: Record<CheckResult, string> = {
  pending: "Not checked",
  pass: "Pass",
  fail: "Fail",
  not_applicable: "N/A",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const SEVERITY_DESCRIPTIONS: Record<Severity, string> = {
  low: "Cosmetic or administrative; fix at the next convenient opportunity.",
  medium: "Degrades a safety system; fix within the maintenance cycle.",
  high: "A safety system is impaired; fix before the next voyage.",
  critical: "Immediate risk to people, ship or environment; act now.",
};

/** Which roles can be assigned as the inspector (mirrors inspections_before_write()). */
export const INSPECTOR_ROLES = ["admin", "manager", "inspector"] as const satisfies readonly OrgRole[];

/**
 * Lifecycle (mirrors private.inspections_before_write()):
 * scheduled → in_progress | cancelled, in_progress → completed | cancelled.
 * Completed and cancelled are terminal and freeze the checklist.
 */
export function isClosed(status: InspectionStatus): boolean {
  return status === "completed" || status === "cancelled";
}

export function isInspectionOverdue(
  inspection: { status: InspectionStatus; scheduledFor: string },
  today: string,
): boolean {
  return !isClosed(inspection.status) && inspection.scheduledFor < today;
}

/**
 * Who may start, record results on, complete or cancel an inspection:
 * administrators and fleet managers always; an inspector only when assigned.
 * UI only: RLS enforces the same rule (inspections and inspection_items update policies).
 */
export function canConduct(
  user: { id: string; role: OrgRole },
  inspection: { inspectorId: string | null },
): boolean {
  if (user.role === "admin" || user.role === "manager") {
    return true;
  }
  return user.role === "inspector" && inspection.inspectorId === user.id;
}

export type ChecklistItemSummary = { result: CheckResult; hasWorkOrder: boolean };

export type ChecklistSummary = {
  total: number;
  checked: number;
  pending: number;
  passed: number;
  failed: number;
  notApplicable: number;
  /** Failed checks that have no work order raised yet. */
  needsFollowUp: number;
};

export function summarizeChecklist(items: readonly ChecklistItemSummary[]): ChecklistSummary {
  const summary: ChecklistSummary = {
    total: items.length,
    checked: 0,
    pending: 0,
    passed: 0,
    failed: 0,
    notApplicable: 0,
    needsFollowUp: 0,
  };
  for (const item of items) {
    if (item.result === "pending") {
      summary.pending += 1;
      continue;
    }
    summary.checked += 1;
    if (item.result === "pass") summary.passed += 1;
    if (item.result === "not_applicable") summary.notApplicable += 1;
    if (item.result === "fail") {
      summary.failed += 1;
      if (!item.hasWorkOrder) summary.needsFollowUp += 1;
    }
  }
  return summary;
}

/** The database rejects completion while any item is pending; the UI explains it first. */
export function canComplete(status: InspectionStatus, summary: ChecklistSummary): boolean {
  return status === "in_progress" && summary.total > 0 && summary.pending === 0;
}

export type ChecklistTemplateItem = { category: string; description: string };

/**
 * Starting points for a checklist. Synthetic and generic: they are editable
 * suggestions, not a statement of any flag state's or class society's rules.
 */
export const CHECKLIST_TEMPLATES = {
  quarterly: {
    label: "Quarterly safety inspection",
    items: [
      { category: "Fire safety", description: "Fire detection panel tested and alarms audible" },
      { category: "Fire safety", description: "Portable fire extinguishers in date and accessible" },
      { category: "Life-saving appliances", description: "Lifejackets stowed and lights working" },
      { category: "Life-saving appliances", description: "Liferafts within service interval" },
      { category: "Navigation", description: "Navigation lights operational" },
      { category: "Pollution prevention", description: "Garbage management plan posted" },
    ],
  },
  fire: {
    label: "Fire safety audit",
    items: [
      { category: "Fire safety", description: "Fire doors close and latch" },
      { category: "Fire safety", description: "Fire hoses and nozzles complete at each station" },
      { category: "Fire safety", description: "Fixed CO2 system release controls sealed" },
      { category: "Fire safety", description: "Firefighter outfits complete with breathing apparatus" },
      { category: "Fire safety", description: "Emergency fire pump starts and delivers pressure" },
    ],
  },
  lsa: {
    label: "Life-saving appliances inspection",
    items: [
      { category: "Life-saving appliances", description: "Liferafts within service interval" },
      { category: "Life-saving appliances", description: "Rescue boat engine starts" },
      { category: "Life-saving appliances", description: "EPIRB battery and hydrostatic release in date" },
      { category: "Life-saving appliances", description: "Lifebuoys with lights and lines in place" },
    ],
  },
} as const satisfies Record<string, { label: string; items: readonly ChecklistTemplateItem[] }>;

export type ChecklistTemplateKey = keyof typeof CHECKLIST_TEMPLATES;
