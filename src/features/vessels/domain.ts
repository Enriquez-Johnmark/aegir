import type { Database } from "@/types/database.types";

export type VesselType = Database["public"]["Enums"]["vessel_type"];
export type VesselStatus = Database["public"]["Enums"]["vessel_status"];

export const VESSEL_TYPES = [
  "bulk_carrier",
  "tanker",
  "container",
  "general_cargo",
  "offshore_support",
  "passenger",
  "tug",
  "other",
] as const satisfies readonly VesselType[];

export const VESSEL_STATUSES = [
  "active",
  "in_maintenance",
  "laid_up",
  "decommissioned",
] as const satisfies readonly VesselStatus[];

export const VESSEL_TYPE_LABELS: Record<VesselType, string> = {
  bulk_carrier: "Bulk carrier",
  tanker: "Tanker",
  container: "Container ship",
  general_cargo: "General cargo",
  offshore_support: "Offshore support",
  passenger: "Passenger",
  tug: "Tug",
  other: "Other",
};

export const VESSEL_STATUS_LABELS: Record<VesselStatus, string> = {
  active: "Active",
  in_maintenance: "In maintenance",
  laid_up: "Laid up",
  decommissioned: "Decommissioned",
};

/**
 * Badge variant per status. Vessel status is context, not risk (DESIGN.md: The
 * Signal Rule): normal states stay neutral so the attention column carries colour.
 */
export const VESSEL_STATUS_BADGE: Record<VesselStatus, "secondary" | "info" | "outline"> = {
  active: "outline",
  in_maintenance: "info",
  laid_up: "secondary",
  decommissioned: "outline",
};

export type VesselAttention = {
  openWorkOrders: number;
  criticalWorkOrders: number;
  overdueWorkOrders: number;
  blockedWorkOrders: number;
  overdueInspections: number;
};

export function needsAttention(attention: VesselAttention): boolean {
  return (
    attention.criticalWorkOrders + attention.overdueWorkOrders + attention.overdueInspections > 0
  );
}

/**
 * "Needs attention" order: critical work first, then anything overdue, then
 * blocked, then the amount of open work, then name.
 */
export function compareByAttention(
  a: VesselAttention & { name: string },
  b: VesselAttention & { name: string },
): number {
  return (
    b.criticalWorkOrders - a.criticalWorkOrders ||
    b.overdueWorkOrders + b.overdueInspections - (a.overdueWorkOrders + a.overdueInspections) ||
    b.blockedWorkOrders - a.blockedWorkOrders ||
    b.openWorkOrders - a.openWorkOrders ||
    a.name.localeCompare(b.name)
  );
}

/**
 * IMO ship identification number: 7 digits, the last being a check digit:
 * (d1*7 + d2*6 + d3*5 + d4*4 + d5*3 + d6*2) mod 10.
 * Mirrors private.is_valid_imo() in the database (the authoritative check).
 */
export function isValidImo(value: string): boolean {
  if (!/^\d{7}$/.test(value)) {
    return false;
  }
  const digits = [...value].map(Number);
  const sum = digits.slice(0, 6).reduce((total, digit, index) => total + digit * (7 - index), 0);
  return sum % 10 === digits[6];
}
