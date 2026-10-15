import { describe, expect, it } from "vitest";

import { tallyAttention } from "@/features/vessels/domain";

import {
  addDays,
  buildDashboard,
  compareFailedChecks,
  PANEL_LIMIT,
  type DashboardInput,
} from "./domain";

const TODAY = "2026-10-15";
const ME = "me";

type WorkOrderRow = DashboardInput["openWorkOrders"][number];
type InspectionRow = DashboardInput["openInspections"][number];
type FailedCheckRow = DashboardInput["failedChecks"][number];
type HandoverRow = DashboardInput["pendingHandovers"][number];

function workOrder(overrides: Partial<WorkOrderRow> & { id: string }): WorkOrderRow {
  return {
    title: overrides.id,
    priority: "medium",
    status: "open",
    dueDate: null,
    assigneeId: null,
    assigneeName: null,
    vesselId: "v1",
    vesselName: "Tern",
    fromInspection: false,
    ...overrides,
  };
}

function inspection(overrides: Partial<InspectionRow> & { id: string }): InspectionRow {
  return {
    title: overrides.id,
    status: "scheduled",
    scheduledFor: TODAY,
    vesselId: "v1",
    vesselName: "Tern",
    inspectorName: null,
    ...overrides,
  };
}

function failedCheck(overrides: Partial<FailedCheckRow> & { id: string }): FailedCheckRow {
  return {
    description: overrides.id,
    severity: "medium",
    recordedAt: `${TODAY}T08:00:00+00:00`,
    inspectionId: "i1",
    inspectionTitle: "Quarterly",
    vesselName: "Tern",
    workOrders: [],
    ...overrides,
  };
}

function handover(overrides: Partial<HandoverRow> & { id: string }): HandoverRow {
  return {
    summary: overrides.id,
    createdAt: `${TODAY}T08:00:00+00:00`,
    fromUserId: "someone",
    fromName: "Ana",
    toUserId: "someone-else",
    toName: "Ben",
    vesselName: null,
    ...overrides,
  };
}

function input(overrides: Partial<DashboardInput> = {}): DashboardInput {
  return {
    vessels: [],
    openWorkOrders: [],
    openInspections: [],
    failedChecks: [],
    pendingHandovers: [],
    ...overrides,
  };
}

const build = (data: Partial<DashboardInput>) => buildDashboard(input(data), { today: TODAY, userId: ME });

describe("addDays", () => {
  it("does UTC calendar arithmetic across month and year ends", () => {
    expect(addDays("2026-10-15", 7)).toBe("2026-10-22");
    expect(addDays("2026-10-28", 7)).toBe("2026-11-04");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("buildDashboard: empty organization", () => {
  it("returns zeros and empty queues", () => {
    const dashboard = build({});
    expect(dashboard.summary).toEqual({
      fleet: { inService: 0, active: 0, inMaintenance: 0, laidUp: 0 },
      inspections: { overdue: 0, dueSoon: 0, inProgress: 0 },
      workOrders: { open: 0, overdue: 0, blocked: 0, critical: 0, assignedToMe: 0 },
      failedChecks: { needsFollowUp: 0, recent: 0 },
      handovers: { pending: 0, forMe: 0 },
    });
    expect(dashboard.workQueue).toEqual([]);
    expect(dashboard.inspectionsDue).toEqual([]);
    expect(dashboard.failedChecks).toEqual([]);
    expect(dashboard.vesselsNeedingAttention).toEqual([]);
    expect(dashboard.handovers).toEqual([]);
  });
});

describe("buildDashboard: fleet", () => {
  it("counts vessels by status and leaves decommissioned ones out of the fleet", () => {
    const { fleet } = build({
      vessels: [
        { id: "a", name: "A", status: "active" },
        { id: "b", name: "B", status: "active" },
        { id: "c", name: "C", status: "in_maintenance" },
        { id: "d", name: "D", status: "laid_up" },
        { id: "e", name: "E", status: "decommissioned" },
      ],
    }).summary;
    expect(fleet).toEqual({ inService: 4, active: 2, inMaintenance: 1, laidUp: 1 });
  });
});

describe("buildDashboard: work orders", () => {
  const rows = [
    workOrder({ id: "late-low", priority: "low", dueDate: "2026-10-10" }),
    workOrder({ id: "critical", priority: "critical", dueDate: "2026-10-20", assigneeId: ME }),
    workOrder({ id: "blocked", status: "blocked", dueDate: TODAY }),
    workOrder({ id: "done", status: "completed", dueDate: "2026-10-01" }),
  ];

  it("counts open, overdue (due before today), blocked, critical and mine; ignores completed work", () => {
    expect(build({ openWorkOrders: rows }).summary.workOrders).toEqual({
      open: 3,
      overdue: 1,
      blocked: 1,
      critical: 1,
      assignedToMe: 1,
    });
  });

  it("orders the queue like /work-orders: critical before overdue low-priority work (D-037)", () => {
    const queue = build({ openWorkOrders: rows }).workQueue;
    expect(queue.map((wo) => wo.id)).toEqual(["critical", "late-low", "blocked"]);
    expect(queue[0]?.isMine).toBe(true);
    expect(queue[1]?.isOverdue).toBe(true);
  });

  it("shows at most PANEL_LIMIT rows but counts them all", () => {
    const many = Array.from({ length: PANEL_LIMIT + 3 }, (_, index) => workOrder({ id: `wo-${index}` }));
    const dashboard = build({ openWorkOrders: many });
    expect(dashboard.workQueue).toHaveLength(PANEL_LIMIT);
    expect(dashboard.summary.workOrders.open).toBe(PANEL_LIMIT + 3);
  });
});

describe("buildDashboard: inspections", () => {
  const rows = [
    inspection({ id: "later", scheduledFor: "2026-10-30" }),
    inspection({ id: "in-a-week", scheduledFor: "2026-10-22" }),
    inspection({ id: "today", scheduledFor: TODAY, status: "in_progress" }),
    inspection({ id: "late", scheduledFor: "2026-10-01" }),
    inspection({ id: "closed", scheduledFor: "2026-10-01", status: "completed" }),
  ];

  it("lists overdue and due within 7 days (inclusive), earliest first", () => {
    const dashboard = build({ openInspections: rows });
    expect(dashboard.inspectionsDue.map((i) => i.id)).toEqual(["late", "today", "in-a-week"]);
    expect(dashboard.inspectionsDueTotal).toBe(3);
    expect(dashboard.summary.inspections).toEqual({ overdue: 1, dueSoon: 2, inProgress: 1 });
  });

  it("treats today's inspection as due, not overdue", () => {
    const today = build({ openInspections: rows }).inspectionsDue.find((i) => i.id === "today");
    expect(today?.isOverdue).toBe(false);
  });
});

describe("buildDashboard: failed checks", () => {
  it("never truncates checks that still need follow-up", () => {
    const rows = Array.from({ length: PANEL_LIMIT + 2 }, (_, index) =>
      failedCheck({ id: `old-${index}`, recordedAt: "2025-01-01T00:00:00+00:00" }),
    );
    const dashboard = build({ failedChecks: rows });
    expect(dashboard.failedChecks).toHaveLength(PANEL_LIMIT + 2);
    expect(dashboard.summary.failedChecks).toEqual({ needsFollowUp: PANEL_LIMIT + 2, recent: 0 });
  });

  it("keeps addressed failures only while recent, and points at unfinished work first", () => {
    const dashboard = build({
      failedChecks: [
        failedCheck({ id: "old-addressed", recordedAt: "2026-09-01T00:00:00+00:00", workOrders: [{ id: "w0", status: "open" }] }),
        failedCheck({
          id: "recent-addressed",
          recordedAt: "2026-10-10T00:00:00+00:00",
          workOrders: [
            { id: "w1", status: "completed" },
            { id: "w2", status: "in_progress" },
          ],
        }),
        failedCheck({ id: "open-finding", recordedAt: "2026-01-01T00:00:00+00:00" }),
      ],
    });
    expect(dashboard.failedChecks.map((c) => c.id)).toEqual(["open-finding", "recent-addressed"]);
    expect(dashboard.failedChecks[1]?.workOrder).toEqual({ id: "w2", status: "in_progress" });
    expect(dashboard.summary.failedChecks).toEqual({ needsFollowUp: 1, recent: 1 });
  });

  it("reports how many failed checks it does not show", () => {
    const addressed = Array.from({ length: PANEL_LIMIT + 2 }, (_, index) =>
      failedCheck({ id: `addressed-${index}`, workOrders: [{ id: `w-${index}`, status: "open" }] }),
    );
    const dashboard = build({ failedChecks: [failedCheck({ id: "open-finding" }), ...addressed] });
    expect(dashboard.failedChecks).toHaveLength(PANEL_LIMIT);
    expect(dashboard.failedChecksTotal).toBe(PANEL_LIMIT + 3);
  });

  it("includes a failure recorded exactly 30 days ago", () => {
    const dashboard = build({
      failedChecks: [failedCheck({ id: "edge", recordedAt: "2026-09-15T23:00:00+00:00", workOrders: [{ id: "w", status: "open" }] })],
    });
    expect(dashboard.failedChecks).toHaveLength(1);
  });

  it("orders follow-ups first, then severity, then the most recent", () => {
    const rows = [
      { needsFollowUp: false, severity: "critical" as const, recordedAt: "2026-10-14" },
      { needsFollowUp: true, severity: "low" as const, recordedAt: "2026-10-01" },
      { needsFollowUp: true, severity: "high" as const, recordedAt: "2026-10-02" },
      { needsFollowUp: true, severity: "high" as const, recordedAt: "2026-10-09" },
    ];
    expect(rows.toSorted(compareFailedChecks)).toEqual([rows[3], rows[2], rows[1], rows[0]]);
  });
});

describe("buildDashboard: vessels needing attention", () => {
  it("lists only vessels with critical or overdue work or overdue inspections, worst first", () => {
    const dashboard = build({
      vessels: [
        { id: "calm", name: "Calm", status: "active" },
        { id: "blocked", name: "Blocked only", status: "active" },
        { id: "late", name: "Late", status: "active" },
        { id: "critical", name: "Critical", status: "active" },
      ],
      openWorkOrders: [
        workOrder({ id: "1", vesselId: "calm", dueDate: "2026-10-20" }),
        workOrder({ id: "2", vesselId: "blocked", status: "blocked" }),
        workOrder({ id: "3", vesselId: "critical", priority: "critical" }),
      ],
      openInspections: [inspection({ id: "i", vesselId: "late", scheduledFor: "2026-10-01" })],
    });
    expect(dashboard.vesselsNeedingAttention.map((v) => v.id)).toEqual(["critical", "late"]);
    expect(dashboard.vesselsNeedingAttentionTotal).toBe(2);
  });
});

describe("buildDashboard: handovers", () => {
  it("puts handovers addressed to me first, then the longest-waiting", () => {
    const dashboard = build({
      pendingHandovers: [
        handover({ id: "newer", createdAt: "2026-10-14T00:00:00+00:00" }),
        handover({ id: "older", createdAt: "2026-10-10T00:00:00+00:00" }),
        handover({ id: "mine", createdAt: "2026-10-15T00:00:00+00:00", toUserId: ME }),
      ],
    });
    expect(dashboard.handovers.map((h) => h.id)).toEqual(["mine", "older", "newer"]);
    expect(dashboard.summary.handovers).toEqual({ pending: 3, forMe: 1 });
  });

  it("caps the panel at PANEL_LIMIT (the full list is /handovers)", () => {
    const rows = Array.from({ length: PANEL_LIMIT + 1 }, (_, index) => handover({ id: `h-${index}` }));
    const dashboard = build({ pendingHandovers: rows });
    expect(dashboard.handovers).toHaveLength(PANEL_LIMIT);
    expect(dashboard.summary.handovers.pending).toBe(PANEL_LIMIT + 1);
  });
});

describe("tallyAttention", () => {
  it("counts unfinished work and overdue open inspections per vessel", () => {
    const attention = tallyAttention(
      [
        { vesselId: "v1", priority: "critical", status: "open", dueDate: "2026-10-01" },
        { vesselId: "v1", priority: "low", status: "blocked", dueDate: null },
        { vesselId: "v1", priority: "critical", status: "completed", dueDate: "2026-10-01" },
      ],
      [
        { vesselId: "v1", status: "scheduled", scheduledFor: "2026-10-14" },
        { vesselId: "v2", status: "cancelled", scheduledFor: "2026-10-01" },
        { vesselId: "v2", status: "in_progress", scheduledFor: TODAY },
      ],
      TODAY,
    );
    expect(attention.get("v1")).toEqual({
      openWorkOrders: 2,
      criticalWorkOrders: 1,
      overdueWorkOrders: 1,
      blockedWorkOrders: 1,
      overdueInspections: 1,
    });
    expect(attention.has("v2")).toBe(false);
  });
});
