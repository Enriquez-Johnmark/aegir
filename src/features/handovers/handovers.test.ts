import { describe, expect, it } from "vitest";

import { canAcknowledge, compareHandovers } from "./domain";
import { createHandoverSchema, handoverListParamsSchema } from "./schemas";

const ME = "a1000000-0000-4000-8000-000000000002";
const OTHER = "a1000000-0000-4000-8000-000000000006";
const VESSEL = "a2000000-0000-4000-8000-000000000003";
const WORK_ORDER = "a4000000-0000-4000-8000-000000000002";

describe("canAcknowledge", () => {
  it("lets only the recipient acknowledge, and only while pending", () => {
    expect(canAcknowledge({ id: ME }, { status: "pending", toUserId: ME })).toBe(true);
    expect(canAcknowledge({ id: ME }, { status: "pending", toUserId: OTHER })).toBe(false);
    expect(canAcknowledge({ id: ME }, { status: "acknowledged", toUserId: ME })).toBe(false);
  });
});

describe("compareHandovers", () => {
  it("puts mine first, then other pending (oldest first), then acknowledged (newest first)", () => {
    const rows = [
      { id: "acked-old", status: "acknowledged" as const, toUserId: ME, createdAt: "2026-10-01", acknowledgedAt: "2026-10-02" },
      { id: "other-new", status: "pending" as const, toUserId: OTHER, createdAt: "2026-10-14", acknowledgedAt: null },
      { id: "mine", status: "pending" as const, toUserId: ME, createdAt: "2026-10-15", acknowledgedAt: null },
      { id: "acked-new", status: "acknowledged" as const, toUserId: OTHER, createdAt: "2026-10-03", acknowledgedAt: "2026-10-12" },
      { id: "other-old", status: "pending" as const, toUserId: OTHER, createdAt: "2026-10-10", acknowledgedAt: null },
    ];
    expect(rows.toSorted((a, b) => compareHandovers(ME, a, b)).map((r) => r.id)).toEqual([
      "mine",
      "other-old",
      "other-new",
      "acked-new",
      "acked-old",
    ]);
  });
});

describe("createHandoverSchema", () => {
  const valid = {
    vesselId: VESSEL,
    workOrderId: "",
    toUserId: OTHER,
    summary: "Night shift: fuel pump isolation",
    outstandingTasks: "Do not restart until the seal kit is fitted.",
  };

  it("accepts a vessel handover and trims the text", () => {
    const parsed = createHandoverSchema.parse({ ...valid, summary: "  Night shift  " });
    expect(parsed).toMatchObject({ vesselId: VESSEL, workOrderId: null, summary: "Night shift" });
  });

  it("accepts a work-order handover without a vessel (the database takes it from the work order)", () => {
    expect(createHandoverSchema.safeParse({ ...valid, vesselId: "", workOrderId: WORK_ORDER }).success).toBe(true);
  });

  it("needs a subject, a recipient, a summary and the outstanding tasks", () => {
    const result = createHandoverSchema.safeParse({
      vesselId: "",
      workOrderId: "",
      toUserId: "",
      summary: "x",
      outstandingTasks: "  ",
    });
    expect(result.success).toBe(false);
    const fields = result.success ? [] : result.error.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["toUserId", "summary", "outstandingTasks"]));
  });

  it("asks for a vessel when nothing is chosen", () => {
    const result = createHandoverSchema.safeParse({ ...valid, vesselId: "" });
    expect(result.success ? [] : result.error.issues.map((i) => [i.path[0], i.message])).toEqual([
      ["vesselId", "Choose the vessel this handover is about."],
    ]);
  });

  it("enforces the database's length limits", () => {
    expect(createHandoverSchema.safeParse({ ...valid, summary: "x".repeat(201) }).success).toBe(false);
    expect(createHandoverSchema.safeParse({ ...valid, outstandingTasks: "x".repeat(4001) }).success).toBe(false);
  });
});

describe("handoverListParamsSchema", () => {
  it("defaults to pending and drops untrusted values", () => {
    expect(handoverListParamsSchema.parse({})).toEqual({ view: "pending", vessel: undefined });
    expect(handoverListParamsSchema.parse({ view: "drop table", vessel: "nope" })).toEqual({
      view: "pending",
      vessel: undefined,
    });
    expect(handoverListParamsSchema.parse({ view: "for-you", vessel: VESSEL })).toEqual({ view: "for-you", vessel: VESSEL });
  });
});
