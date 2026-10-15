import { describe, expect, it } from "vitest";

import {
  describeAuditEvent,
  groupByDay,
  isAuditedTable,
  referencedPeople,
  snapshotName,
} from "@/features/audit/domain";
import { auditLogParamsSchema } from "@/features/audit/schemas";

const NAMES: Record<string, string> = { u1: "Marcus Reyes", u2: "Tomas Okafor" };
const person = (id: string) => NAMES[id] ?? "Former member";

describe("describeAuditEvent", () => {
  it("names creation per record type, with the detail that matters", () => {
    expect(describeAuditEvent("work_orders", "insert", { title: "x" }, person)).toEqual({ kind: "created", detail: null });
    expect(describeAuditEvent("memberships", "insert", { role: "technician" }, person)).toEqual({
      kind: "created",
      detail: "as Technician",
    });
    expect(describeAuditEvent("handovers", "insert", { to_user_id: "u2" }, person)).toEqual({
      kind: "created",
      detail: "to Tomas Okafor",
    });
    expect(describeAuditEvent("vessels", "insert", null, person)).toEqual({ kind: "created", detail: null });
  });

  it("says what a new record started as, when that matters", () => {
    expect(describeAuditEvent("work_orders", "insert", { priority: "high" }, person)).toEqual({
      kind: "created",
      detail: "with High priority",
    });
    expect(
      describeAuditEvent("inspection_items", "insert", { result: "fail", severity: "high" }, person),
    ).toEqual({ kind: "created", detail: "as Fail (High severity)" });
    expect(describeAuditEvent("inspection_items", "insert", { result: "pass", severity: null }, person)).toEqual({
      kind: "created",
      detail: "as Pass",
    });
    expect(describeAuditEvent("inspection_items", "insert", { result: "pending" }, person)).toEqual({
      kind: "created",
      detail: null,
    });
    expect(describeAuditEvent("inspections", "insert", { scheduled_for: "2026-09-25" }, person)).toEqual({
      kind: "created",
      detail: "for 25 Sept 2026",
    });
    expect(describeAuditEvent("inspections", "insert", { scheduled_for: "soon" }, person)).toEqual({
      kind: "created",
      detail: null,
    });
  });

  it("leads with the most important change: a check's result, a work order's priority", () => {
    const check = describeAuditEvent(
      "inspection_items",
      "update",
      { finding: { old: null, new: "x" }, description: { old: "a", new: "b" }, result: { old: "pending", new: "fail" } },
      person,
    );
    expect(check?.kind === "updated" && check.changes[0]?.label).toBe("Result");
    const workOrder = describeAuditEvent(
      "work_orders",
      "update",
      { title: { old: "a", new: "b" }, priority: { old: "low", new: "critical" } },
      person,
    );
    expect(workOrder?.kind === "updated" && workOrder.changes.map((change) => change.label)).toEqual(["Priority", "Title"]);
  });

  it("shows a malformed stored date as stored instead of failing", () => {
    expect(describeAuditEvent("work_orders", "update", { due_date: { old: "2026-13-45", new: "2026-10-20" } }, person)).toEqual({
      kind: "updated",
      changes: [{ label: "Due date", values: { from: "2026-13-45", to: "20 Oct 2026" }, verb: "changed" }],
    });
  });

  it("labels status moves per record type and keeps the block reason as the note", () => {
    expect(
      describeAuditEvent(
        "work_orders",
        "status_change",
        { status: { old: "in_progress", new: "blocked" }, blocked_reason: { old: null, new: "Waiting for parts." } },
        person,
      ),
    ).toEqual({ kind: "status", from: "In progress", to: "Blocked", note: "Waiting for parts.", changes: [] });
    expect(
      describeAuditEvent("vessels", "status_change", { status: { old: "active", new: "laid_up" } }, person),
    ).toMatchObject({ kind: "status", from: "Active", to: "Laid up", note: null });
    expect(
      describeAuditEvent("handovers", "status_change", { status: { old: "pending", new: "acknowledged" }, acknowledged_at: { old: null, new: "2026-10-15T10:00:00Z" } }, person),
    ).toEqual({ kind: "status", from: "Pending", to: "Acknowledged", note: null, changes: [] });
  });

  it("does not repeat the cleared block reason when work is unblocked", () => {
    expect(
      describeAuditEvent(
        "work_orders",
        "status_change",
        { status: { old: "blocked", new: "open" }, blocked_reason: { old: "Waiting for parts.", new: null } },
        person,
      ),
    ).toEqual({ kind: "status", from: "Blocked", to: "Open", note: null, changes: [] });
  });

  it("keeps other fields changed in the same edit as a status move", () => {
    const entry = describeAuditEvent(
      "vessels",
      "status_change",
      { name: { old: "Fjord", new: "Fjord II" }, status: { old: "active", new: "in_maintenance" } },
      person,
    );
    expect(entry).toMatchObject({
      kind: "status",
      changes: [{ label: "Name", values: { from: "“Fjord”", to: "“Fjord II”" }, verb: "changed" }],
    });
  });

  it("shows old and new values for short fields, in display order", () => {
    const entry = describeAuditEvent(
      "work_orders",
      "update",
      {
        due_date: { old: null, new: "2026-10-20" },
        assignee_id: { old: "u1", new: "u9" },
        priority: { old: "low", new: "high" },
      },
      person,
    );
    expect(entry).toEqual({
      kind: "updated",
      changes: [
        { label: "Priority", values: { from: "Low", to: "High" }, verb: "changed" },
        { label: "Assignee", values: { from: "Marcus Reyes", to: "Former member" }, verb: "changed" },
        { label: "Due date", values: { from: "None", to: "20 Oct 2026" }, verb: "added" },
      ],
    });
  });

  it("names long text without quoting it, saying whether it was added, removed or changed", () => {
    const entry = describeAuditEvent(
      "inspection_items",
      "update",
      {
        result: { old: "pending", new: "fail" },
        severity: { old: null, new: "high" },
        finding: { old: null, new: "Port lifebuoy light missing." },
      },
      person,
    );
    expect(entry).toEqual({
      kind: "updated",
      changes: [
        { label: "Result", values: { from: "Not checked", to: "Fail" }, verb: "changed" },
        { label: "Severity", values: { from: "None", to: "High" }, verb: "added" },
        { label: "Finding", values: null, verb: "added" },
      ],
    });
    expect(
      describeAuditEvent("work_orders", "update", { description: { old: "a", new: null } }, person),
    ).toEqual({ kind: "updated", changes: [{ label: "Description", values: null, verb: "removed" }] });
  });

  it("shows an unassigned person field in words", () => {
    expect(
      describeAuditEvent("inspections", "update", { inspector_id: { old: "u1", new: null } }, person),
    ).toEqual({
      kind: "updated",
      changes: [{ label: "Inspector", values: { from: "Marcus Reyes", to: "Unassigned" }, verb: "removed" }],
    });
  });

  it("shows unknown columns by name instead of dropping them, and ignores bookkeeping", () => {
    expect(
      describeAuditEvent("inspection_items", "update", { position: { old: 1, new: 2 }, updated_at: { old: 1, new: 2 } }, person),
    ).toEqual({ kind: "updated", changes: [{ label: "Position", values: null, verb: "changed" }] });
    expect(describeAuditEvent("work_orders", "update", { completed_at: { old: null, new: "x" } }, person)).toBeNull();
  });

  it("falls back to the stored value for an unknown status or enum value", () => {
    expect(
      describeAuditEvent("work_orders", "status_change", { status: { old: "open", new: "archived" } }, person),
    ).toMatchObject({ from: "Open", to: "archived" });
    expect(
      describeAuditEvent("memberships", "update", { role: { old: "viewer", new: "captain" } }, person),
    ).toEqual({ kind: "updated", changes: [{ label: "Role", values: { from: "Viewer", to: "captain" }, verb: "changed" }] });
  });

  it("returns null for malformed updates", () => {
    expect(describeAuditEvent("work_orders", "update", null, person)).toBeNull();
    expect(describeAuditEvent("work_orders", "update", [], person)).toBeNull();
    expect(describeAuditEvent("work_orders", "update", { title: "not a diff" }, person)).toBeNull();
    expect(describeAuditEvent("work_orders", "update", {}, person)).toBeNull();
  });
});

describe("audit helpers", () => {
  it("knows which tables are audited", () => {
    expect(isAuditedTable("inspection_items")).toBe(true);
    expect(isAuditedTable("profiles")).toBe(false);
  });

  it("collects every well-formed user id an event mentions, from diffs and snapshots", () => {
    const [a, b] = ["a1000000-0000-4000-8000-000000000002", "a1000000-0000-4000-8000-000000000004"];
    expect(referencedPeople({ assignee_id: { old: a, new: b }, title: { old: "x", new: "y" } })).toEqual([a, b]);
    expect(referencedPeople({ to_user_id: b, from_user_id: a, summary: "x" })).toEqual([b, a]);
    // A malformed id never reaches the profiles query (it would fail the whole page).
    expect(referencedPeople({ assignee_id: { old: "not-a-uuid", new: null } })).toEqual([]);
    expect(referencedPeople(null)).toEqual([]);
  });

  it("reads a record's name from its insert snapshot", () => {
    expect(snapshotName("vessels", { name: "Petrel" })).toBe("Petrel");
    expect(snapshotName("inspection_items", { description: "Lifebuoys" })).toBe("Lifebuoys");
    expect(snapshotName("memberships", { role: "viewer" })).toBeNull();
    expect(snapshotName("work_orders", { status: { old: "open", new: "blocked" } })).toBeNull();
  });

  it("groups newest-first entries by UTC day without reordering", () => {
    const items = [
      { id: 3, occurredAt: "2026-10-15T00:10:00+00:00" },
      { id: 2, occurredAt: "2026-10-14T23:50:00+00:00" },
      { id: 1, occurredAt: "2026-10-14T08:00:00+00:00" },
    ];
    expect(groupByDay(items)).toEqual([
      { day: "2026-10-15", items: [items[0]] },
      { day: "2026-10-14", items: [items[1], items[2]] },
    ]);
  });
});

describe("auditLogParamsSchema", () => {
  it("accepts known filters and a cursor", () => {
    expect(
      auditLogParamsSchema.parse({ type: "work-orders", actor: "system", before: "120" }),
    ).toEqual({ type: "work-orders", actor: "system", before: 120 });
    expect(auditLogParamsSchema.parse({ actor: "a1000000-0000-4000-8000-000000000002" })).toMatchObject({
      actor: "a1000000-0000-4000-8000-000000000002",
    });
  });

  it("drops anything else from the URL instead of failing", () => {
    expect(
      auditLogParamsSchema.parse({ type: "work_orders", actor: "admin", before: "-1" }),
    ).toEqual({ type: undefined, actor: undefined, before: undefined });
    expect(auditLogParamsSchema.parse({ before: "1e400" }).before).toBeUndefined();
    expect(auditLogParamsSchema.parse({ before: "2.5" }).before).toBeUndefined();
    expect(auditLogParamsSchema.parse({ before: "" }).before).toBeUndefined();
    expect(auditLogParamsSchema.parse({})).toEqual({ type: undefined, actor: undefined, before: undefined });
  });
});
