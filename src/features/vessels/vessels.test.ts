import { describe, expect, it } from "vitest";

import { compareByAttention, isValidImo, needsAttention, type VesselAttention } from "./domain";
import { vesselFormSchema, vesselListParamsSchema } from "./schemas";

describe("isValidImo", () => {
  it.each(["9074729", "9384124", "9441025"])("accepts %s", (imo) => {
    expect(isValidImo(imo)).toBe(true);
  });

  it.each([
    ["wrong check digit", "9074728"],
    ["too short", "907472"],
    ["letters", "IMO9074"],
  ])("rejects %s", (_label, imo) => {
    expect(isValidImo(imo)).toBe(false);
  });
});

describe("vesselFormSchema", () => {
  const schema = vesselFormSchema(2026);
  const valid = {
    name: "  Northwind Kestrel ",
    imoNumber: "9441025",
    vesselType: "tug",
    flagState: "Malta",
    status: "active",
    yearBuilt: "2019",
    grossTonnage: "",
  };

  it("parses and normalises a valid vessel", () => {
    expect(schema.parse(valid)).toEqual({
      name: "Northwind Kestrel",
      imoNumber: "9441025",
      vesselType: "tug",
      flagState: "Malta",
      status: "active",
      yearBuilt: 2019,
      grossTonnage: null,
    });
  });

  it("gives an empty IMO a single, clear message", () => {
    const result = schema.safeParse({ ...valid, imoNumber: "" });
    const imoIssues = result.error?.issues.filter((issue) => issue.path[0] === "imoNumber");
    expect(imoIssues?.map((issue) => issue.message)).toEqual(["Enter the IMO number."]);
  });

  it("explains a bad IMO check digit", () => {
    const result = schema.safeParse({ ...valid, imoNumber: "9441026" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/check digit/);
  });

  it("rejects a build year in the future", () => {
    const result = schema.safeParse({ ...valid, yearBuilt: "2031" });
    expect(result.error?.issues[0]?.message).toBe("Year built must be at most 2,027.");
  });

  it("rejects non-numeric tonnage and unknown enums", () => {
    const result = schema.safeParse({ ...valid, grossTonnage: "12k", vesselType: "submarine" });
    const paths = result.error?.issues.map((issue) => issue.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["grossTonnage", "vesselType"]));
  });
});

describe("vesselListParamsSchema", () => {
  it("strips characters that could alter a PostgREST filter", () => {
    expect(vesselListParamsSchema.parse({ q: "aurora),name.eq.(x%" }).q).toBe("auroranameeqx");
  });

  it("ignores unknown filter values instead of failing", () => {
    expect(vesselListParamsSchema.parse({ status: "sunk", type: "ufo", sort: "?" })).toEqual({
      q: "",
      status: undefined,
      type: undefined,
      sort: "attention",
    });
  });
});

describe("attention ordering", () => {
  const clear: VesselAttention = {
    openWorkOrders: 0,
    criticalWorkOrders: 0,
    overdueWorkOrders: 0,
    blockedWorkOrders: 0,
    overdueInspections: 0,
  };
  const vessel = (name: string, attention: Partial<VesselAttention>) => ({ name, ...clear, ...attention });

  it("puts critical work first, then overdue, then blocked, then volume, then name", () => {
    const fleet = [
      vessel("Echo", {}),
      vessel("Delta", { openWorkOrders: 3 }),
      vessel("Charlie", { blockedWorkOrders: 1, openWorkOrders: 1 }),
      vessel("Bravo", { overdueInspections: 1 }),
      vessel("Alpha", { criticalWorkOrders: 1, openWorkOrders: 1 }),
      vessel("Aaron", {}),
    ];
    expect(fleet.toSorted(compareByAttention).map((v) => v.name)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
      "Delta",
      "Aaron",
      "Echo",
    ]);
  });

  it("flags only critical or overdue items as needing attention", () => {
    expect(needsAttention(clear)).toBe(false);
    expect(needsAttention({ ...clear, blockedWorkOrders: 2 })).toBe(false);
    expect(needsAttention({ ...clear, overdueWorkOrders: 1 })).toBe(true);
  });
});
