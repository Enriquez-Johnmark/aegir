import { describe, expect, it } from "vitest";

import {
  canTransition,
  canUpdateStatus,
  compareByUrgency,
  isWorkOrderOverdue,
  type Priority,
} from "./domain";
import {
  createWorkOrderSchema,
  statusChangeSchema,
  workOrderDetailsSchema,
  workOrderListParamsSchema,
} from "./schemas";

const VESSEL_ID = "a2000000-0000-4000-8000-000000000001";
const TECH_ID = "a1000000-0000-4000-8000-000000000004";

describe("status transitions", () => {
  it("mirrors the database trigger", () => {
    expect(canTransition("open", "in_progress")).toBe(true);
    expect(canTransition("open", "blocked")).toBe(true);
    expect(canTransition("open", "completed")).toBe(false);
    expect(canTransition("in_progress", "completed")).toBe(true);
    expect(canTransition("blocked", "completed")).toBe(false);
    expect(canTransition("blocked", "in_progress")).toBe(true);
    expect(canTransition("completed", "open")).toBe(false);
  });
});

describe("canUpdateStatus", () => {
  it("lets managers move any work order and assignees only their own", () => {
    expect(canUpdateStatus({ id: "x", role: "manager" }, { assigneeId: null })).toBe(true);
    expect(canUpdateStatus({ id: TECH_ID, role: "technician" }, { assigneeId: TECH_ID })).toBe(true);
    expect(canUpdateStatus({ id: TECH_ID, role: "technician" }, { assigneeId: "someone" })).toBe(false);
    expect(canUpdateStatus({ id: TECH_ID, role: "viewer" }, { assigneeId: TECH_ID })).toBe(false);
  });
});

describe("isWorkOrderOverdue", () => {
  it("flags unfinished work past its due date only", () => {
    expect(isWorkOrderOverdue({ status: "open", dueDate: "2026-10-14" }, "2026-10-15")).toBe(true);
    expect(isWorkOrderOverdue({ status: "blocked", dueDate: "2026-10-15" }, "2026-10-15")).toBe(false);
    expect(isWorkOrderOverdue({ status: "completed", dueDate: "2026-01-01" }, "2026-10-15")).toBe(false);
    expect(isWorkOrderOverdue({ status: "open", dueDate: null }, "2026-10-15")).toBe(false);
  });
});

describe("compareByUrgency", () => {
  const wo = (title: string, priority: Priority, dueDate: string | null, isOverdue = false) => ({
    title,
    priority,
    dueDate,
    isOverdue,
  });

  it("tiers the queue: overdue critical/high, then critical, then other overdue, then the rest (D-037)", () => {
    const queue = [
      wo("Undated high", "high", null),
      wo("Low overdue", "low", "2026-10-01", true),
      wo("Critical later", "critical", "2026-11-01"),
      wo("High soon", "high", "2026-10-20"),
      wo("Critical sooner", "critical", "2026-10-18"),
      wo("High overdue", "high", "2026-10-10", true),
      wo("Medium overdue", "medium", "2026-10-05", true),
    ];
    expect(queue.toSorted(compareByUrgency).map((item) => item.title)).toEqual([
      "High overdue",
      "Critical sooner",
      "Critical later",
      "Medium overdue",
      "Low overdue",
      "High soon",
      "Undated high",
    ]);
  });

  it("ranks critical work above overdue low-priority work, even when it is not overdue", () => {
    const critical = wo("Critical blocked", "critical", "2026-10-18");
    const lateLow = wo("Railing", "low", "2026-10-05", true);
    expect([lateLow, critical].toSorted(compareByUrgency)[0]).toBe(critical);
  });
});

describe("work order schemas", () => {
  const valid = {
    vesselId: VESSEL_ID,
    inspectionItemId: "",
    title: "  Replace fire hose ",
    description: "",
    priority: "high",
    assigneeId: "unassigned",
    dueDate: "",
  };

  it("parses and normalises a new work order", () => {
    expect(createWorkOrderSchema("2026-10-15").parse(valid)).toEqual({
      vesselId: VESSEL_ID,
      inspectionItemId: null,
      title: "Replace fire hose",
      description: null,
      priority: "high",
      assigneeId: null,
      dueDate: null,
    });
  });

  it("rejects an impossible or far-future due date and an unknown priority", () => {
    const schema = workOrderDetailsSchema("2026-10-15");
    expect(schema.safeParse({ ...valid, dueDate: "2026-02-30" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, dueDate: "2030-01-01" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, priority: "urgent" }).success).toBe(false);
  });

  it("requires a reason to block and drops it otherwise", () => {
    expect(statusChangeSchema.safeParse({ status: "blocked", blockedReason: " " }).error?.issues[0]?.path).toEqual([
      "blockedReason",
    ]);
    expect(statusChangeSchema.parse({ status: "in_progress", blockedReason: "stale" })).toEqual({
      status: "in_progress",
      blockedReason: null,
    });
  });

  it("falls back to the open queue for bad list params", () => {
    expect(workOrderListParamsSchema.parse({ view: "x", vessel: "y", priority: "z" })).toEqual({
      view: "open",
      vessel: undefined,
      priority: undefined,
    });
  });
});
