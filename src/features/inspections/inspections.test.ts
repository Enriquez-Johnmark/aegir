import { describe, expect, it } from "vitest";

import {
  canComplete,
  canConduct,
  isInspectionOverdue,
  summarizeChecklist,
} from "./domain";
import {
  inspectionListParamsSchema,
  recordResultSchema,
  scheduleInspectionSchema,
} from "./schemas";

const VESSEL_ID = "a2000000-0000-4000-8000-000000000001";
const INSPECTOR_ID = "a1000000-0000-4000-8000-000000000003";

describe("canConduct", () => {
  const assigned = { inspectorId: INSPECTOR_ID };

  it("lets managers and administrators conduct any inspection", () => {
    expect(canConduct({ id: "someone", role: "manager" }, assigned)).toBe(true);
    expect(canConduct({ id: "someone", role: "admin" }, { inspectorId: null })).toBe(true);
  });

  it("lets an inspector conduct only inspections assigned to them", () => {
    expect(canConduct({ id: INSPECTOR_ID, role: "inspector" }, assigned)).toBe(true);
    expect(canConduct({ id: "other", role: "inspector" }, assigned)).toBe(false);
    expect(canConduct({ id: INSPECTOR_ID, role: "inspector" }, { inspectorId: null })).toBe(false);
  });

  it("never lets technicians or viewers conduct, even if once assigned", () => {
    expect(canConduct({ id: INSPECTOR_ID, role: "technician" }, assigned)).toBe(false);
    expect(canConduct({ id: INSPECTOR_ID, role: "viewer" }, assigned)).toBe(false);
  });
});

describe("isInspectionOverdue", () => {
  it("flags open inspections scheduled before today", () => {
    expect(isInspectionOverdue({ status: "scheduled", scheduledFor: "2026-10-01" }, "2026-10-15")).toBe(true);
    expect(isInspectionOverdue({ status: "in_progress", scheduledFor: "2026-10-14" }, "2026-10-15")).toBe(true);
  });

  it("does not flag today, the future, or closed inspections", () => {
    expect(isInspectionOverdue({ status: "scheduled", scheduledFor: "2026-10-15" }, "2026-10-15")).toBe(false);
    expect(isInspectionOverdue({ status: "completed", scheduledFor: "2026-01-01" }, "2026-10-15")).toBe(false);
    expect(isInspectionOverdue({ status: "cancelled", scheduledFor: "2026-01-01" }, "2026-10-15")).toBe(false);
  });
});

describe("summarizeChecklist", () => {
  it("counts results and failed checks still needing a work order", () => {
    const summary = summarizeChecklist([
      { result: "pass", hasWorkOrder: false },
      { result: "fail", hasWorkOrder: true },
      { result: "fail", hasWorkOrder: false },
      { result: "not_applicable", hasWorkOrder: false },
      { result: "pending", hasWorkOrder: false },
    ]);
    expect(summary).toEqual({
      total: 5,
      checked: 4,
      pending: 1,
      passed: 1,
      failed: 2,
      notApplicable: 1,
      needsFollowUp: 1,
    });
  });

  it("allows completion only when in progress with every check recorded", () => {
    const done = summarizeChecklist([{ result: "pass", hasWorkOrder: false }]);
    const open = summarizeChecklist([{ result: "pending", hasWorkOrder: false }]);
    expect(canComplete("in_progress", done)).toBe(true);
    expect(canComplete("in_progress", open)).toBe(false);
    expect(canComplete("scheduled", done)).toBe(false);
    expect(canComplete("in_progress", summarizeChecklist([]))).toBe(false);
  });
});

describe("scheduleInspectionSchema", () => {
  const schema = scheduleInspectionSchema("2026-10-15");
  const valid = {
    vesselId: VESSEL_ID,
    title: "  Quarterly safety inspection ",
    scheduledFor: "2026-10-20",
    inspectorId: "",
    notes: " ",
    items: [{ category: " Fire safety ", description: "Fire doors close and latch" }],
  };

  it("parses and normalises a valid schedule", () => {
    expect(schema.parse(valid)).toEqual({
      vesselId: VESSEL_ID,
      title: "Quarterly safety inspection",
      scheduledFor: "2026-10-20",
      inspectorId: null,
      notes: null,
      items: [{ category: "Fire safety", description: "Fire doors close and latch" }],
    });
  });

  it("requires at least one check and reports item errors by position", () => {
    expect(schema.safeParse({ ...valid, items: [] }).error?.issues[0]?.message).toBe(
      "Add at least one check to the checklist.",
    );
    const blank = schema.safeParse({ ...valid, items: [...valid.items, { category: "Navigation", description: " " }] });
    expect(blank.error?.issues[0]?.path).toEqual(["items", 1, "description"]);
  });

  it("gives an empty date one message and rejects dates far outside the window", () => {
    const empty = schema.safeParse({ ...valid, scheduledFor: "" });
    expect(empty.error?.issues.map((issue) => issue.message)).toEqual(["Choose a date."]);
    expect(schema.safeParse({ ...valid, scheduledFor: "2024-01-01" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, scheduledFor: "2026-02-30" }).success).toBe(false);
  });

  it("treats the unassigned option as no inspector", () => {
    expect(schema.parse({ ...valid, inspectorId: "unassigned" }).inspectorId).toBeNull();
  });

  it("rejects a malformed inspector id", () => {
    expect(schema.safeParse({ ...valid, inspectorId: "ingrid" }).success).toBe(false);
  });
});

describe("recordResultSchema", () => {
  it("drops finding and severity for a pass or N/A", () => {
    expect(recordResultSchema.parse({ result: "pass", finding: "leftover", severity: "high" })).toEqual({
      result: "pass",
      finding: null,
      severity: null,
    });
  });

  it("requires a finding and a severity for a failed check", () => {
    const result = recordResultSchema.safeParse({ result: "fail", finding: " ", severity: "" });
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(["finding", "severity"]);
    expect(
      recordResultSchema.parse({ result: "fail", finding: " Seal weeping ", severity: "critical" }),
    ).toEqual({ result: "fail", finding: "Seal weeping", severity: "critical" });
  });

  it("rejects pending and unknown results", () => {
    expect(recordResultSchema.safeParse({ result: "pending", finding: "", severity: "" }).success).toBe(false);
  });
});

describe("inspectionListParamsSchema", () => {
  it("defaults to open inspections and ignores bad values", () => {
    expect(inspectionListParamsSchema.parse({ view: "everything", vessel: "1 or 1=1" })).toEqual({
      view: "open",
      vessel: undefined,
    });
  });
});
