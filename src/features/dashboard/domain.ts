import { isInspectionOverdue, type InspectionStatus, type Severity } from "@/features/inspections/domain";
import {
  compareByAttention,
  needsAttention,
  tallyAttention,
  type VesselAttention,
  type VesselStatus,
} from "@/features/vessels/domain";
import {
  compareByUrgency,
  isWorkOrderOverdue,
  type Priority,
  type WorkOrderStatus,
} from "@/features/work-orders/domain";

/** "Due soon" horizon for inspections, in days from today (inclusive). */
export const DUE_SOON_DAYS = 7;
/** Failed checks that already have work raised stay on the dashboard this long. */
export const RECENT_FAILURE_DAYS = 30;
/** Rows per queue panel; the panel links to the full list for the rest. */
export const PANEL_LIMIT = 5;
/** Handovers have no list screen yet, so the panel shows more before it truncates. */
export const HANDOVER_LIMIT = 8;

/** Adds whole days to a YYYY-MM-DD date (UTC calendar arithmetic). */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Input: plain rows, already scoped to one organization by the DAL (RLS).
// ---------------------------------------------------------------------------

export type DashboardInput = {
  vessels: { id: string; name: string; status: VesselStatus }[];
  /** Work orders that are not completed. */
  openWorkOrders: {
    id: string;
    title: string;
    priority: Priority;
    status: WorkOrderStatus;
    dueDate: string | null;
    assigneeId: string | null;
    assigneeName: string | null;
    vesselId: string;
    vesselName: string;
    fromInspection: boolean;
  }[];
  /** Inspections that are scheduled or in progress. */
  openInspections: {
    id: string;
    title: string;
    status: InspectionStatus;
    scheduledFor: string;
    vesselId: string;
    vesselName: string;
    inspectorName: string | null;
  }[];
  /** Every failed check in the organization, with the work raised for it. */
  failedChecks: {
    id: string;
    description: string;
    severity: Severity | null;
    /** When the result was recorded (the item's last update; closed checklists are frozen). */
    recordedAt: string;
    inspectionId: string;
    inspectionTitle: string;
    vesselName: string;
    workOrders: { id: string; status: WorkOrderStatus }[];
  }[];
  /** Handovers still waiting to be acknowledged. */
  pendingHandovers: {
    id: string;
    summary: string;
    createdAt: string;
    fromName: string | null;
    toUserId: string;
    toName: string | null;
    vesselName: string | null;
  }[];
};

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export type DashboardSummary = {
  fleet: { inService: number; active: number; inMaintenance: number; laidUp: number };
  inspections: { overdue: number; dueSoon: number; inProgress: number };
  workOrders: { open: number; overdue: number; blocked: number; critical: number; assignedToMe: number };
  failedChecks: { needsFollowUp: number; recent: number };
  handovers: { pending: number; forMe: number };
};

export type DashboardWorkOrder = DashboardInput["openWorkOrders"][number] & {
  isOverdue: boolean;
  isMine: boolean;
};

export type DashboardInspection = DashboardInput["openInspections"][number] & { isOverdue: boolean };

export type DashboardFailedCheck = Omit<DashboardInput["failedChecks"][number], "workOrders"> & {
  needsFollowUp: boolean;
  /** The most relevant work raised for it: unfinished work first. */
  workOrder: { id: string; status: WorkOrderStatus } | null;
};

export type DashboardVessel = VesselAttention & { id: string; name: string };

export type DashboardHandover = DashboardInput["pendingHandovers"][number] & { isForMe: boolean };

export type Dashboard = {
  today: string;
  summary: DashboardSummary;
  /** Open work in queue order (overdue, priority, due date): the head of /work-orders. */
  workQueue: DashboardWorkOrder[];
  /** Overdue inspections and those due within DUE_SOON_DAYS, oldest date first. */
  inspectionsDue: DashboardInspection[];
  inspectionsDueTotal: number;
  /**
   * Every failed check without a work order (never truncated: a finding must stay
   * visible until it is addressed), then recent failures with work raised.
   */
  failedChecks: DashboardFailedCheck[];
  vesselsNeedingAttention: DashboardVessel[];
  vesselsNeedingAttentionTotal: number;
  handovers: DashboardHandover[];
};

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** Needs follow-up first, then the most severe, then the most recently recorded. */
export function compareFailedChecks(
  a: { needsFollowUp: boolean; severity: Severity | null; recordedAt: string },
  b: { needsFollowUp: boolean; severity: Severity | null; recordedAt: string },
): number {
  return (
    Number(b.needsFollowUp) - Number(a.needsFollowUp) ||
    (a.severity ? SEVERITY_RANK[a.severity] : 4) - (b.severity ? SEVERITY_RANK[b.severity] : 4) ||
    b.recordedAt.localeCompare(a.recordedAt)
  );
}

export function buildDashboard(
  input: DashboardInput,
  { today, userId }: { today: string; userId: string },
): Dashboard {
  const dueSoonLimit = addDays(today, DUE_SOON_DAYS);
  const recentSince = addDays(today, -RECENT_FAILURE_DAYS);

  // Fleet: decommissioned vessels are history, not fleet.
  const fleet = { inService: 0, active: 0, inMaintenance: 0, laidUp: 0 };
  for (const vessel of input.vessels) {
    if (vessel.status === "decommissioned") continue;
    fleet.inService += 1;
    if (vessel.status === "active") fleet.active += 1;
    if (vessel.status === "in_maintenance") fleet.inMaintenance += 1;
    if (vessel.status === "laid_up") fleet.laidUp += 1;
  }

  // Work orders.
  const work = input.openWorkOrders
    .filter((wo) => wo.status !== "completed")
    .map((wo) => ({
      ...wo,
      isOverdue: isWorkOrderOverdue(wo, today),
      isMine: wo.assigneeId === userId,
    }));
  const workOrders = {
    open: work.length,
    overdue: work.filter((wo) => wo.isOverdue).length,
    blocked: work.filter((wo) => wo.status === "blocked").length,
    critical: work.filter((wo) => wo.priority === "critical").length,
    assignedToMe: work.filter((wo) => wo.isMine).length,
  };

  // Inspections.
  const openInspections = input.openInspections
    .filter((inspection) => inspection.status === "scheduled" || inspection.status === "in_progress")
    .map((inspection) => ({ ...inspection, isOverdue: isInspectionOverdue(inspection, today) }));
  const due = openInspections
    .filter((inspection) => inspection.scheduledFor <= dueSoonLimit)
    .toSorted((a, b) => a.scheduledFor.localeCompare(b.scheduledFor) || a.title.localeCompare(b.title));
  const inspections = {
    overdue: due.filter((inspection) => inspection.isOverdue).length,
    dueSoon: due.filter((inspection) => !inspection.isOverdue).length,
    inProgress: openInspections.filter((inspection) => inspection.status === "in_progress").length,
  };

  // Failed checks.
  const failed = input.failedChecks.map(({ workOrders: raised, ...check }) => ({
    ...check,
    needsFollowUp: raised.length === 0,
    workOrder: raised.find((wo) => wo.status !== "completed") ?? raised[0] ?? null,
  }));
  const failedChecks = failed
    .filter((check) => check.needsFollowUp || check.recordedAt.slice(0, 10) >= recentSince)
    .toSorted(compareFailedChecks);
  const followUps = failedChecks.filter((check) => check.needsFollowUp).length;

  // Vessels: the head of the watch list, only those that need attention.
  const attention = tallyAttention(work, openInspections, today);
  const watch = input.vessels
    .flatMap((vessel) => {
      const counts = attention.get(vessel.id);
      return counts && needsAttention(counts) ? [{ id: vessel.id, name: vessel.name, ...counts }] : [];
    })
    .toSorted(compareByAttention);

  // Handovers: the ones addressed to me first, then the longest-waiting.
  const handovers = input.pendingHandovers
    .map((handover) => ({ ...handover, isForMe: handover.toUserId === userId }))
    .toSorted((a, b) => Number(b.isForMe) - Number(a.isForMe) || a.createdAt.localeCompare(b.createdAt));

  return {
    today,
    summary: {
      fleet,
      inspections,
      workOrders,
      failedChecks: { needsFollowUp: followUps, recent: failedChecks.length - followUps },
      handovers: { pending: handovers.length, forMe: handovers.filter((h) => h.isForMe).length },
    },
    workQueue: work.toSorted(compareByUrgency).slice(0, PANEL_LIMIT),
    inspectionsDue: due.slice(0, PANEL_LIMIT),
    inspectionsDueTotal: due.length,
    failedChecks: failedChecks.slice(0, Math.max(PANEL_LIMIT, followUps)),
    vesselsNeedingAttention: watch.slice(0, PANEL_LIMIT),
    vesselsNeedingAttentionTotal: watch.length,
    handovers: handovers.slice(0, HANDOVER_LIMIT),
  };
}
