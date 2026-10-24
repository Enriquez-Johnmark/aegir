import type { StaticImageData } from "next/image";

// One source for the README and the landing page: docs/screenshots/, refreshed by
// scripts/capture-screenshots.mjs from the live demo (synthetic data). The two
// added for D-051 (phone-inspection, handovers-all) came from the local stack, on
// the same seed, so their dates differ from the others by a few days. Static
// imports give next/image their size and a blur placeholder; the optimised files
// are served from this site (/_next/image), so the CSP's img-src 'self' data:
// already covers them (D-039, D-046).
import auditLog from "../../../docs/screenshots/audit-log.png";
import dashboard from "../../../docs/screenshots/dashboard.png";
import handoversAll from "../../../docs/screenshots/handovers-all.png";
import phoneDashboard from "../../../docs/screenshots/phone-dashboard.png";
import phoneInspection from "../../../docs/screenshots/phone-inspection.png";
import vessels from "../../../docs/screenshots/vessels.png";
import workOrder from "../../../docs/screenshots/work-order.png";

export type Screenshot = { src: StaticImageData; alt: string };

export const SCREENSHOTS = {
  dashboard: {
    src: dashboard,
    alt: "Aegir dashboard for Northwind Shipping: five fleet figures, with 2 inspections and 2 work orders overdue and 1 blocked, above the work queue and inspections due.",
  },
  phoneDashboard: {
    src: phoneDashboard,
    alt: "The same dashboard on a phone: the figures stack into one column above the work queue.",
  },
  workOrder: {
    src: workOrder,
    alt: "A blocked work order showing its reason, the failed check it came from, and its history.",
  },
  phoneInspection: {
    src: phoneInspection,
    alt: "An inspection in progress on a phone: the check \"Fixed CO2 system release controls sealed\" marked Fail, with fields for the finding and four severity choices, each with its guidance.",
  },
  handoversAll: {
    src: handoversAll,
    alt: "All handovers: the night shift's Fjord fuel pump isolation, handed from Kenji Watanabe to the technician and acknowledged, and two pending handovers.",
  },
  vessels: {
    src: vessels,
    alt: "The vessel watch list: vessels with critical, blocked or overdue work first, each with its signals.",
  },
  auditLog: {
    src: auditLog,
    alt: "The audit log, grouped by day: each change names the record, what changed and who made it.",
  },
} as const satisfies Record<string, Screenshot>;
