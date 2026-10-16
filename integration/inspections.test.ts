import { describe, expect, it } from "vitest";

import {
  changeInspectionStatusAction,
  recordResultAction,
  scheduleInspectionAction,
} from "@/features/inspections/actions";
import { canTransition, type InspectionStatus } from "@/features/inspections/domain";
import { todayIsoDate } from "@/lib/format";
import { Constants } from "@/types/database.types";

import { db, form, idIn, MERIDIAN, NORTHWIND, redirectOf, unique, userId } from "./support/helpers";
import { signInAs } from "./support/session";
import type { UserKey } from "./support/users";

const GONE = "This inspection no longer exists or you can't change it.";
const NO_SCHEDULE = "Only safety inspectors, fleet managers and administrators can schedule inspections.";
const NO_CONDUCT = "Only the assigned inspector, fleet managers and administrators can change this inspection.";
const CLOSED = "This inspection is closed, so it can no longer be changed.";
const MOVED_ON = "This inspection has already moved on. Refresh the page to see its current state.";

/** Moves that reach each status from a new (scheduled) inspection. */
const PATH_TO: Record<InspectionStatus, InspectionStatus[]> = {
  scheduled: [],
  in_progress: ["in_progress"],
  completed: ["in_progress", "completed"],
  cancelled: ["cancelled"],
};

type Inspection = { id: string; itemIds: string[]; firstItemId: string };

/**
 * A new inspection on Northwind Aurora assigned to the seeded inspector, created
 * by the manager. With `recorded`, every check passes first, so completion is
 * only ever refused by the lifecycle. Leaves the manager signed in.
 */
async function inspectionIn(status: InspectionStatus, { recorded = true, checks = 2 } = {}): Promise<Inspection> {
  signInAs("manager");
  const supabase = await db();
  const { data: id, error } = await supabase.rpc("create_inspection", {
    p_vessel_id: NORTHWIND.vesselId,
    p_title: unique("Integration"),
    p_scheduled_for: todayIsoDate(),
    p_inspector_id: userId("inspector"),
    p_notes: "",
    p_items: Array.from({ length: checks }, (_, index) => ({ category: "Deck", description: `Check ${index + 1}` })),
  });
  if (error) throw error;
  const { data: items, error: itemsError } = await supabase
    .from("inspection_items")
    .select("id")
    .eq("inspection_id", id)
    .order("position");
  if (itemsError) throw itemsError;
  if (recorded) {
    const { error: passError } = await supabase.from("inspection_items").update({ result: "pass" }).eq("inspection_id", id);
    if (passError) throw passError;
  }
  for (const step of PATH_TO[status]) {
    const { error: stepError } = await supabase.from("inspections").update({ status: step }).eq("id", id);
    if (stepError) throw stepError;
  }
  const [first] = items;
  if (!first) throw new Error("The new inspection has no checklist");
  return { id, itemIds: items.map((item) => item.id), firstItemId: first.id };
}

function scheduleForm(fields: Record<string, string> = {}, checks = ["Fire detection panel tested"]) {
  const data = form({
    vesselId: NORTHWIND.vesselId,
    title: unique("Integration"),
    scheduledFor: todayIsoDate(),
    inspectorId: userId("inspector"),
    notes: "",
    ...fields,
  });
  for (const check of checks) {
    data.append("itemCategory", "Fire safety");
    data.append("itemDescription", check);
  }
  return data;
}

const pass = () => form({ result: "pass", finding: "", severity: "" });

describe("inspection status changes: TypeScript ↔ database parity (D-006)", () => {
  const statuses = Constants.public.Enums.inspection_status;
  const pairs = statuses.flatMap((from) => statuses.filter((to) => to !== from).map((to) => ({ from, to })));

  // Straight to the database: the action only offers start, complete and cancel.
  it.each(pairs)("$from → $to", async ({ from, to }) => {
    const { id } = await inspectionIn(from);
    const { error } = await (await db()).from("inspections").update({ status: to }).eq("id", id).select("id").single();

    expect(error === null, error?.message).toBe(canTransition(from, to));
  });
});

describe("scheduling an inspection", () => {
  it("creates it with its checklist and opens it", async () => {
    signInAs("inspector");
    const url = await redirectOf(scheduleInspectionAction({}, scheduleForm({}, ["Alarms audible", "Extinguishers in date"])));
    const id = idIn(url, /^\/inspections\/([0-9a-f-]{36})\?saved=scheduled$/);

    const { data } = await (await db()).from("inspection_items").select("description").eq("inspection_id", id).order("position");
    expect(data).toEqual([{ description: "Alarms audible" }, { description: "Extinguishers in date" }]);
  });

  it.each([
    [
      "a technician as inspector",
      { inspectorId: userId("technician") },
      { fieldErrors: { inspectorId: ["This person can't be assigned as inspector. Choose someone else."] } },
    ],
    [
      "another organization's vessel",
      { vesselId: MERIDIAN.vesselId },
      { fieldErrors: { vesselId: ["This vessel is no longer in your fleet."] } },
    ],
  ])("refuses %s, saying why", async (_case, fields, expected) => {
    signInAs("manager");
    expect(await scheduleInspectionAction({}, scheduleForm(fields))).toMatchObject(expected);
  });

  it.each(["technician", "viewer"] as const)("is refused for a %s", async (role) => {
    signInAs(role);
    expect((await scheduleInspectionAction({}, scheduleForm())).formError).toBe(NO_SCHEDULE);
  });
});

describe("conducting an inspection", () => {
  it("the assigned inspector starts, records and completes it", async () => {
    const { id, itemIds } = await inspectionIn("scheduled", { recorded: false });
    signInAs("inspector");

    expect(await changeInspectionStatusAction(id, "in_progress")).toEqual({});
    for (const itemId of itemIds) {
      expect(await recordResultAction(id, itemId, {}, pass())).toHaveProperty("savedAt");
    }
    expect(await redirectOf(changeInspectionStatusAction(id, "completed"))).toBe(`/inspections/${id}?saved=completed`);
  });

  it("can't be completed while a check has no result", async () => {
    const { id } = await inspectionIn("in_progress", { recorded: false });
    expect((await changeInspectionStatusAction(id, "completed")).error).toBe(
      "Record a result for every check before completing the inspection.",
    );
  });

  it("can't skip a step", async () => {
    const { id } = await inspectionIn("scheduled");
    expect((await changeInspectionStatusAction(id, "completed")).error).toBe(MOVED_ON);
  });

  it.each(["completed", "cancelled"] as const)("is frozen once %s", async (status) => {
    const { id, firstItemId } = await inspectionIn(status);
    expect((await recordResultAction(id, firstItemId, {}, pass())).error).toBe(CLOSED);
    expect((await changeInspectionStatusAction(id, "cancelled")).error).toBe(CLOSED);
  });

  it("keeps a failed check failed once work is raised for it", async () => {
    const { id, firstItemId } = await inspectionIn("in_progress", { recorded: false });
    const failed = form({ result: "fail", finding: "Hatch seal perished.", severity: "medium" });
    expect(await recordResultAction(id, firstItemId, {}, failed)).toHaveProperty("savedAt");
    const { error } = await (await db())
      .from("work_orders")
      .insert({
        organization_id: NORTHWIND.organizationId,
        vessel_id: NORTHWIND.vesselId,
        inspection_item_id: firstItemId,
        title: unique("Follow-up"),
      });
    expect(error).toBeNull();

    expect((await recordResultAction(id, firstItemId, {}, pass())).error).toBe(
      "Work has been raised for this failed check, so it stays failed. You can still edit the finding.",
    );
  });

  it.each<[string, UserKey, string]>([
    ["a technician", "technician", NO_CONDUCT],
    ["a viewer", "viewer", NO_CONDUCT],
  ])("%s can't record a result", async (_case, actor, message) => {
    const { id, firstItemId } = await inspectionIn("in_progress", { recorded: false });
    signInAs(actor);
    expect((await recordResultAction(id, firstItemId, {}, pass())).error).toBe(message);
  });

  it.each<[string, UserKey]>([
    ["a technician", "technician"],
    ["a viewer", "viewer"],
  ])("%s can't start it", async (_case, actor) => {
    const { id } = await inspectionIn("scheduled");
    signInAs(actor);
    expect((await changeInspectionStatusAction(id, "in_progress")).error).toBe(GONE);
  });

  it("another organization's inspection is out of reach", async () => {
    signInAs("manager");
    expect((await changeInspectionStatusAction(MERIDIAN.inspectionId, "cancelled")).error).toBe(GONE);
  });
});
