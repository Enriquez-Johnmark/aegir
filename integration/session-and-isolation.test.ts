import { describe, expect, it } from "vitest";

import { listAuditEvents, listAuditPeople, getRecordHistory } from "@/features/audit/server/queries";
import { signIn } from "@/features/auth/actions";
import { getDashboard } from "@/features/dashboard/server/queries";
import { getHandoverDetail, getHandoverFormOptions, listHandovers } from "@/features/handovers/server/queries";
import { getInspectionDetail, getScheduleFormOptions, listInspections } from "@/features/inspections/server/queries";
import { getVesselDetail, listVesselNames, listVessels } from "@/features/vessels/server/queries";
import { vesselListParamsSchema } from "@/features/vessels/schemas";
import { createVesselAction } from "@/features/vessels/actions";
import { getFailedCheck, getWorkOrderDetail, getWorkOrderFormOptions, listWorkOrders } from "@/features/work-orders/server/queries";

import { form, MERIDIAN, NORTHWIND, randomImo, redirectOf } from "./support/helpers";
import { signInAs, signOut } from "./support/session";
import { PASSWORD, USERS } from "./support/users";

describe("signing in (the real action and Auth)", () => {
  it("a wrong password gets the one message that doesn't reveal whether the account exists", async () => {
    signOut();
    const wrong = await signIn({}, form({ email: USERS.manager.email, password: "not-the-password" }));
    const unknown = await signIn({}, form({ email: "nobody@northwind.example", password: PASSWORD }));
    expect(wrong.formError).toBe("Invalid email or password.");
    expect(unknown.formError).toBe(wrong.formError);
  });

  it.each([
    ["no next page", undefined, "/dashboard"],
    ["a page in the app", "/vessels", "/vessels"],
    ["another site", "//evil.example/phish", "/dashboard"],
  ])("with %s, lands on the right page", async (_case, next, expected) => {
    signOut();
    expect(await redirectOf(signIn({}, form({ email: USERS.viewer.email, password: PASSWORD, next })))).toBe(expected);
  });
});

describe("without a session", () => {
  it("a Server Action sends the visitor to sign in and changes nothing", async () => {
    signOut();
    const vessel = form({
      name: "Unsigned",
      imoNumber: randomImo(),
      vesselType: "tug",
      flagState: "Malta",
      status: "active",
      yearBuilt: "",
      grossTonnage: "",
    });
    expect(await redirectOf(createVesselAction({}, vessel))).toBe("/login");
  });

  it("a read sends the visitor to sign in", async () => {
    signOut();
    expect(await redirectOf(listVessels(vesselListParamsSchema.parse({})))).toBe("/login");
  });
});

/** Seed ids are prefixed by organization: a… Northwind, b… Meridian. */
const NORTHWIND_TRACE = /Northwind|Integration|\ba[0-9]000000-0000-4000-8000-/;
const MERIDIAN_TRACE = /Meridian|Owen Price|Sofia Marin|\bb[0-9]000000-0000-4000-8000-/;

/** Every read the app makes, as the signed-in user. */
async function everyRead() {
  return {
    dashboard: await getDashboard(),
    vessels: await listVessels(vesselListParamsSchema.parse({})),
    vesselNames: await listVesselNames(),
    inspections: await listInspections({ view: "all" }),
    scheduleOptions: await getScheduleFormOptions(),
    workOrders: await listWorkOrders({ view: "all" }),
    workOrderOptions: await getWorkOrderFormOptions(),
    handovers: await listHandovers({ view: "all" }),
    handoverOptions: await getHandoverFormOptions(),
    audit: await listAuditEvents({}),
    auditPeople: await listAuditPeople(),
  };
}

describe("organization isolation in every read", () => {
  it("Northwind's manager sees Northwind and nothing of Meridian", async () => {
    signInAs("manager");
    const reads = await everyRead();
    expect(reads.vessels.length).toBeGreaterThanOrEqual(6);
    expect(reads.audit.items.length).toBeGreaterThan(0);
    // The patterns find the organization's own data, so their absence below means something.
    expect(JSON.stringify(reads)).toMatch(NORTHWIND_TRACE);
    expect(JSON.stringify(reads)).not.toMatch(MERIDIAN_TRACE);
  });

  it("Meridian's manager sees Meridian and nothing of Northwind, including records these tests created", async () => {
    signInAs("meridianManager");
    const reads = await everyRead();
    const names = reads.vessels.map((vessel) => vessel.name);
    expect(names).toEqual(expect.arrayContaining(["Meridian Crest", "Meridian Star"]));
    expect(names.every((name) => name.startsWith("Meridian"))).toBe(true);
    expect(reads.audit.items.length).toBeGreaterThan(0);
    expect(JSON.stringify(reads)).toMatch(MERIDIAN_TRACE);
    expect(JSON.stringify(reads)).not.toMatch(NORTHWIND_TRACE);
  });

  it("another organization's records read as not found, by id", async () => {
    signInAs("manager");
    expect(await getVesselDetail(MERIDIAN.vesselId)).toBeNull();
    expect(await getInspectionDetail(MERIDIAN.inspectionId)).toBeNull();
    expect(await getWorkOrderDetail(MERIDIAN.workOrderId)).toBeNull();
    expect(await getHandoverDetail(MERIDIAN.handoverId)).toBeNull();
    expect(await getFailedCheck("b6000000-0000-4000-8000-000000000101")).toBeNull();
    expect((await getRecordHistory("vessels", MERIDIAN.vesselId)).items).toEqual([]);
    // The same reads work for the organization's own records.
    expect(await getVesselDetail(NORTHWIND.vesselId)).not.toBeNull();
    expect((await getRecordHistory("vessels", NORTHWIND.vesselId)).items.length).toBeGreaterThan(0);
  });
});
