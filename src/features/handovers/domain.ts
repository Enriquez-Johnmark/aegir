import type { OrgRole } from "@/lib/auth/roles";
import type { Database } from "@/types/database.types";

export type HandoverStatus = Database["public"]["Enums"]["handover_status"];

export const HANDOVER_STATUS_LABELS: Record<HandoverStatus, string> = {
  pending: "Pending",
  acknowledged: "Acknowledged",
};

/** Who can receive a handover (mirrors handovers_before_write(): viewers can't take work over). */
export const RECIPIENT_ROLES = ["admin", "manager", "inspector", "technician"] as const satisfies readonly OrgRole[];

/**
 * Only the recipient acknowledges, and only once (mirrors the "acknowledge
 * recipient" RLS policy and the trigger). UI only: the database decides.
 */
export function canAcknowledge(
  user: { id: string },
  handover: { status: HandoverStatus; toUserId: string },
): boolean {
  return handover.status === "pending" && handover.toUserId === user.id;
}

/**
 * Inbox order: pending handovers addressed to me, then other pending ones
 * (longest-waiting first), then acknowledged ones (most recent first).
 */
export function compareHandovers(
  me: string,
  a: { status: HandoverStatus; toUserId: string; createdAt: string; acknowledgedAt: string | null },
  b: { status: HandoverStatus; toUserId: string; createdAt: string; acknowledgedAt: string | null },
): number {
  const rank = (h: typeof a) => (h.status === "pending" ? (h.toUserId === me ? 0 : 1) : 2);
  const byRank = rank(a) - rank(b);
  if (byRank !== 0) return byRank;
  if (a.status === "pending") return a.createdAt.localeCompare(b.createdAt);
  return (b.acknowledgedAt ?? b.createdAt).localeCompare(a.acknowledgedAt ?? a.createdAt);
}
