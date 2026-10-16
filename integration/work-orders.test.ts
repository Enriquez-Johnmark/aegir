import { beforeEach, describe, expect, it } from "vitest";

import {
  changeWorkOrderStatusAction,
  createWorkOrderAction,
  updateWorkOrderAction,
} from "@/features/work-orders/actions";
import { canTransition, type WorkOrderStatus } from "@/features/work-orders/domain";
import { Constants } from "@/types/database.types";

import { db, form, idIn, MERIDIAN, NORTHWIND, redirectOf, unique, userId } from "./support/helpers";
import { signInAs } from "./support/session";

const GONE = "This work order no longer exists or you can't change it.";
const MOVED_ON = "This work order has already moved on. Refresh the page to see its current state.";
const COMPLETED = "This work order is completed, so it can no longer be changed.";
const NO_CREATE = "Only safety inspectors, fleet managers and administrators can raise work orders.";
const NO_EDIT = "Only fleet managers and administrators can edit work order details.";

/** Seeded checks on inspection a3…01 (Northwind Aurora): one failed, one passed. */
const FAILED_CHECK = { id: "a6000000-0000-4000-8000-000000000102", inspectionId: "a3000000-0000-4000-8000-000000000001" };
const PASSED_CHECK = "a6000000-0000-4000-8000-000000000101";
const MERIDIAN_FAILED_CHECK = "b6000000-0000-4000-8000-000000000101";
const OTHER_VESSEL = "a2000000-0000-4000-8000-000000000002";

/** Moves that reach each status from a new (open) work order. */
const PATH_TO: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  open: [],
  in_progress: ["in_progress"],
  blocked: ["blocked"],
  completed: ["in_progress", "completed"],
};

/** A new work order in `status`, created by the manager. Leaves the manager signed in. */
async function workOrderIn(status: WorkOrderStatus, assignee?: string): Promise<string> {
  signInAs("manager");
  const supabase = await db();
  const { data, error } = await supabase
    .from("work_orders")
    .insert({
      organization_id: NORTHWIND.organizationId,
      vessel_id: NORTHWIND.vesselId,
      title: unique("Integration"),
      priority: "low",
      assignee_id: assignee ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  for (const step of PATH_TO[status]) {
    const { error: stepError } = await supabase
      .from("work_orders")
      .update({ status: step, blocked_reason: step === "blocked" ? "Waiting for parts" : null })
      .eq("id", data.id);
    if (stepError) throw stepError;
  }
  return data.id;
}

function statusForm(status: string) {
  return form({ status, blockedReason: status === "blocked" ? "Waiting for parts" : "" });
}

function newWorkOrderForm(fields: Record<string, string> = {}) {
  return form({
    vesselId: NORTHWIND.vesselId,
    inspectionItemId: "",
    title: unique("Integration"),
    description: "",
    priority: "medium",
    assigneeId: "unassigned",
    dueDate: "",
    ...fields,
  });
}

describe("work order status changes: TypeScript ↔ database parity (D-006)", () => {
  // Every pair of the database enum, so a new status can't slip past the TS table.
  const statuses = Constants.public.Enums.work_order_status;
  const pairs = statuses.flatMap((from) => statuses.filter((to) => to !== from).map((to) => ({ from, to })));

  it.each(pairs)("$from → $to", async ({ from, to }) => {
    const id = await workOrderIn(from);
    const result = await changeWorkOrderStatusAction(id, {}, statusForm(to));

    if (canTransition(from, to)) {
      expect(result).toEqual({});
    } else {
      expect(result.error).toBe(from === "completed" ? COMPLETED : MOVED_ON);
    }
  });
});

describe("raising a work order", () => {
  beforeEach(() => signInAs("manager"));

  it("saves it in the user's organization, whatever the form says, and opens it", async () => {
    const url = await redirectOf(
      createWorkOrderAction({}, newWorkOrderForm({ organization_id: MERIDIAN.organizationId })),
    );
    const id = idIn(url, /^\/work-orders\/([0-9a-f-]{36})\?saved=created$/);

    const { data } = await (await db()).from("work_orders").select("organization_id, created_by").eq("id", id).single();
    expect(data).toEqual({ organization_id: NORTHWIND.organizationId, created_by: userId("manager") });
  });

  it("from a failed check returns to the inspection, which links the new work", async () => {
    const url = await redirectOf(createWorkOrderAction({}, newWorkOrderForm({ inspectionItemId: FAILED_CHECK.id })));
    expect(url).toMatch(new RegExp(`^/inspections/${FAILED_CHECK.inspectionId}\\?saved=raised&workOrder=[0-9a-f-]{36}$`));
  });

  it.each([
    ["a passed check", { inspectionItemId: PASSED_CHECK }, { formError: "Work orders can only be raised from a failed check." }],
    [
      "a failed check on another vessel",
      { inspectionItemId: FAILED_CHECK.id, vesselId: OTHER_VESSEL },
      { fieldErrors: { vesselId: ["A follow-up must be on the inspected vessel."] } },
    ],
    [
      "another organization's failed check",
      { inspectionItemId: MERIDIAN_FAILED_CHECK },
      { formError: "The failed check this work order follows up is no longer visible." },
    ],
    [
      "another organization's vessel",
      { vesselId: MERIDIAN.vesselId },
      { fieldErrors: { vesselId: ["This vessel is no longer in your fleet."] } },
    ],
    [
      "a viewer as assignee",
      { assigneeId: userId("viewer") },
      { fieldErrors: { assigneeId: ["This person can't be assigned work. Choose someone else."] } },
    ],
    [
      "another organization's person as assignee",
      { assigneeId: userId("meridianManager") },
      { fieldErrors: { assigneeId: ["This person can't be assigned work. Choose someone else."] } },
    ],
  ])("refuses %s, saying why", async (_case, fields, expected) => {
    const result = await createWorkOrderAction({}, newWorkOrderForm(fields));
    expect(result).toMatchObject(expected);
  });

  it.each(["technician", "viewer"] as const)("is refused for a %s", async (role) => {
    signInAs(role);
    const result = await createWorkOrderAction({}, newWorkOrderForm());
    expect(result.formError).toBe(NO_CREATE);
  });

  it("is open to an inspector", async () => {
    signInAs("inspector");
    expect(await redirectOf(createWorkOrderAction({}, newWorkOrderForm()))).toMatch(/\?saved=created$/);
  });
});

describe("editing work order details", () => {
  const details = (title = unique("Edited")) =>
    form({ title, description: "", priority: "high", assigneeId: "unassigned", dueDate: "" });

  it("is open to managers", async () => {
    const id = await workOrderIn("open");
    expect(await redirectOf(updateWorkOrderAction(id, {}, details()))).toBe(`/work-orders/${id}?saved=updated`);
  });

  it("is refused for the assignee without a manager role", async () => {
    const id = await workOrderIn("open", userId("technician"));
    signInAs("technician");
    expect((await updateWorkOrderAction(id, {}, details())).formError).toBe(NO_EDIT);
  });

  it("is refused once the work is completed", async () => {
    const id = await workOrderIn("completed");
    expect((await updateWorkOrderAction(id, {}, details())).formError).toBe(COMPLETED);
  });

  it("can't reach another organization's work order", async () => {
    signInAs("manager");
    expect((await updateWorkOrderAction(MERIDIAN.workOrderId, {}, details())).formError).toBe(GONE);
  });
});

describe("who can move a work order along", () => {
  it.each([
    ["the assigned technician", "technician", "technician"],
    ["the assigned inspector", "inspector", "inspector"],
    ["a manager, assigned or not", "manager", null],
  ] as const)("%s can", async (_case, actor, assignee) => {
    const id = await workOrderIn("open", assignee ? userId(assignee) : undefined);
    signInAs(actor);
    expect(await changeWorkOrderStatusAction(id, {}, statusForm("in_progress"))).toEqual({});
  });

  it.each([
    ["a technician it isn't assigned to", "technician2"],
    ["a viewer", "viewer"],
  ] as const)("%s can't, and is told it can't be changed", async (_case, actor) => {
    const id = await workOrderIn("open", userId("technician"));
    signInAs(actor);
    expect((await changeWorkOrderStatusAction(id, {}, statusForm("in_progress"))).error).toBe(GONE);
  });

  it("another organization's work order is out of reach", async () => {
    signInAs("manager");
    expect((await changeWorkOrderStatusAction(MERIDIAN.workOrderId, {}, statusForm("in_progress"))).error).toBe(GONE);
  });

  it("a malformed id is refused before the database", async () => {
    signInAs("manager");
    expect((await changeWorkOrderStatusAction("not-a-uuid", {}, statusForm("in_progress"))).error).toBe(GONE);
  });
});
