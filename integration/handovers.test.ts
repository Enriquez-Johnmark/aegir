import { describe, expect, it } from "vitest";

import { acknowledgeHandoverAction, createHandoverAction } from "@/features/handovers/actions";
import { canAcknowledge } from "@/features/handovers/domain";
import { Constants } from "@/types/database.types";

import { db, form, idIn, MERIDIAN, NORTHWIND, redirectOf, unique, userId } from "./support/helpers";
import { signInAs } from "./support/session";

const NOT_RECIPIENT = "Only the person this handover is addressed to can acknowledge it.";
const NO_CREATE = "Read-only viewers can't hand work over. Ask a colleague with crew access.";
/** Seeded: open work order on Northwind Aurora, assigned to the technician. */
const AURORA_WORK_ORDER = "a4000000-0000-4000-8000-000000000001";
const OTHER_VESSEL = "a2000000-0000-4000-8000-000000000002";
const CREATED = /^\/handovers\/([0-9a-f-]{36})\?saved=created$/;

function handoverForm(fields: Record<string, string> = {}) {
  return form({
    vesselId: NORTHWIND.vesselId,
    workOrderId: "",
    toUserId: userId("technician2"),
    summary: unique("Integration"),
    outstandingTasks: "Finish the job.",
    ...fields,
  });
}

/** A pending handover from the technician to the second technician. Leaves the sender signed in. */
async function pendingHandover(): Promise<string> {
  signInAs("technician");
  return idIn(await redirectOf(createHandoverAction({}, handoverForm())), CREATED);
}

describe("handover status changes: TypeScript ↔ database parity (D-006)", () => {
  const statuses = Constants.public.Enums.handover_status;
  const pairs = statuses.flatMap((from) => statuses.filter((to) => to !== from).map((to) => ({ from, to })));

  it.each(pairs)("the recipient: $from → $to", async ({ from, to }) => {
    const id = await pendingHandover();
    signInAs("technician2");
    const supabase = await db();
    if (from === "acknowledged") {
      const { error } = await supabase.from("handovers").update({ status: "acknowledged" }).eq("id", id);
      expect(error).toBeNull();
    }
    const { error } = await supabase.from("handovers").update({ status: to }).eq("id", id).select("id").single();

    const allowed = to === "acknowledged" && canAcknowledge({ id: userId("technician2") }, { status: from, toUserId: userId("technician2") });
    expect(error === null, error?.message).toBe(allowed);
  });
});

describe("handing work over", () => {
  it("records the sender from the session and opens the handover", async () => {
    signInAs("technician");
    const id = idIn(await redirectOf(createHandoverAction({}, handoverForm({ from_user_id: userId("manager") }))), CREATED);

    const { data } = await (await db()).from("handovers").select("from_user_id, organization_id").eq("id", id).single();
    expect(data).toEqual({ from_user_id: userId("technician"), organization_id: NORTHWIND.organizationId });
  });

  it("about a work order alone takes the work order's vessel", async () => {
    signInAs("technician");
    const id = idIn(await redirectOf(createHandoverAction({}, handoverForm({ vesselId: "", workOrderId: AURORA_WORK_ORDER }))), CREATED);
    const { data } = await (await db()).from("handovers").select("vessel_id").eq("id", id).single();
    expect(data?.vessel_id).toBe(NORTHWIND.vesselId);
  });

  it.each([
    [
      "a viewer as recipient",
      { toUserId: userId("viewer") },
      { fieldErrors: { toUserId: ["This person can't take work over. Choose a crew member."] } },
    ],
    [
      "another organization's person as recipient",
      { toUserId: userId("meridianManager") },
      { fieldErrors: { toUserId: ["This person can't take work over. Choose a crew member."] } },
    ],
    [
      "a work order on a different vessel",
      { vesselId: OTHER_VESSEL, workOrderId: AURORA_WORK_ORDER },
      { fieldErrors: { workOrderId: ["That work order is on a different vessel. Choose one on this vessel."] } },
    ],
    [
      "another organization's vessel",
      { vesselId: MERIDIAN.vesselId },
      { formError: "That vessel or work order is no longer available. Refresh and choose again." },
    ],
  ])("refuses %s, saying why", async (_case, fields, expected) => {
    signInAs("technician");
    expect(await createHandoverAction({}, handoverForm(fields))).toMatchObject(expected);
  });

  it("is refused for a viewer", async () => {
    signInAs("viewer");
    expect((await createHandoverAction({}, handoverForm())).formError).toBe(NO_CREATE);
  });
});

describe("acknowledging a handover", () => {
  it("the recipient acknowledges it once", async () => {
    const id = await pendingHandover();
    signInAs("technician2");
    expect(await redirectOf(acknowledgeHandoverAction(id))).toBe(`/handovers/${id}?saved=acknowledged`);
    expect((await acknowledgeHandoverAction(id)).error).toBe("This handover was already acknowledged.");
  });

  it.each(["technician", "manager"] as const)("the %s (not the recipient) can't", async (actor) => {
    const id = await pendingHandover();
    signInAs(actor);
    expect((await acknowledgeHandoverAction(id)).error).toBe(NOT_RECIPIENT);
  });

  it("another organization's handover is out of reach", async () => {
    signInAs("manager");
    expect((await acknowledgeHandoverAction(MERIDIAN.handoverId)).error).toBe(NOT_RECIPIENT);
  });
});
