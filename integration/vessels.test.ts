import { describe, expect, it } from "vitest";

import { createVesselAction, updateVesselAction } from "@/features/vessels/actions";

import { db, form, idIn, MERIDIAN, NORTHWIND, randomImo, redirectOf, unique } from "./support/helpers";
import { signInAs } from "./support/session";

const NO_PERMISSION = "Only fleet managers and administrators can add or edit vessels.";
const GONE = "This vessel no longer exists or you can't edit it.";

function vesselForm(fields: Record<string, string> = {}) {
  return form({
    name: unique("Integration"),
    imoNumber: randomImo(),
    vesselType: "tug",
    flagState: "Malta",
    status: "active",
    yearBuilt: "2020",
    grossTonnage: "500",
    ...fields,
  });
}

describe("adding a vessel", () => {
  it("saves it in the user's organization, whatever the form says, and opens it", async () => {
    signInAs("manager");
    const url = await redirectOf(createVesselAction({}, vesselForm({ organization_id: MERIDIAN.organizationId })));
    const id = idIn(url, /^\/vessels\/([0-9a-f-]{36})\?saved=created$/);

    const { data } = await (await db()).from("vessels").select("organization_id").eq("id", id).single();
    expect(data?.organization_id).toBe(NORTHWIND.organizationId);
  });

  it("refuses an IMO number already in the fleet", async () => {
    signInAs("manager");
    expect(await createVesselAction({}, vesselForm({ imoNumber: "9384124" }))).toMatchObject({
      fieldErrors: { imoNumber: ["A vessel with this IMO number is already in your fleet."] },
    });
  });

  it("accepts an IMO number another organization uses, so nothing leaks about its fleet", async () => {
    const imoNumber = randomImo();
    signInAs("meridianManager");
    // Named for its organization: the isolation test reads "Integration…" as Northwind's.
    const meridianVessel = vesselForm({ imoNumber, name: unique("Meridian test vessel") });
    expect(await redirectOf(createVesselAction({}, meridianVessel))).toMatch(/\?saved=created$/);
    signInAs("manager");
    expect(await redirectOf(createVesselAction({}, vesselForm({ imoNumber })))).toMatch(/\?saved=created$/);
  });

  it.each(["inspector", "technician", "viewer"] as const)("is refused for a %s", async (role) => {
    signInAs(role);
    expect((await createVesselAction({}, vesselForm())).formError).toBe(NO_PERMISSION);
  });
});

describe("editing a vessel", () => {
  it("is open to an administrator", async () => {
    signInAs("admin");
    const fields = { name: "Northwind Aurora", imoNumber: "9384124", vesselType: "bulk_carrier", flagState: "Marshall Islands" };
    expect(await redirectOf(updateVesselAction(NORTHWIND.vesselId, {}, vesselForm({ ...fields, yearBuilt: "2012", grossTonnage: "43500" })))).toBe(
      `/vessels/${NORTHWIND.vesselId}?saved=updated`,
    );
  });

  it.each(["inspector", "viewer"] as const)("is refused for a %s", async (role) => {
    signInAs(role);
    expect((await updateVesselAction(NORTHWIND.vesselId, {}, vesselForm())).formError).toBe(NO_PERMISSION);
  });

  it("can't reach another organization's vessel", async () => {
    signInAs("manager");
    expect((await updateVesselAction(MERIDIAN.vesselId, {}, vesselForm())).formError).toBe(GONE);
  });
});
