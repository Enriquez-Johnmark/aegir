import { z } from "zod";

import { PRIORITIES, WORK_ORDER_STATUSES } from "@/features/work-orders/domain";

/** The assignee select's "Unassigned" value (a select option can't be empty). */
export const UNASSIGNED = "unassigned";

const DAY_MS = 86_400_000;

function shiftIsoDate(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Fields a manager can edit; also the details of a new work order. `today` keeps tests deterministic. */
export function workOrderDetailsSchema(today: string) {
  const latest = shiftIsoDate(today, 730);
  return z.object({
    title: z
      .string()
      .trim()
      .min(3, "Give the work order a title of at least 3 characters.")
      .max(160, "Keep the title under 160 characters."),
    description: z
      .string()
      .trim()
      .max(4000, "Keep the description under 4,000 characters.")
      .transform((value) => (value === "" ? null : value)),
    priority: z.enum(PRIORITIES, "Choose a priority."),
    assigneeId: z.union([z.enum(["", UNASSIGNED]).transform(() => null), z.uuid("Choose an assignee.")]),
    // Optional. Past dates are allowed when recording overdue work; far-future dates are typos.
    dueDate: z
      .string()
      .transform((value) => (value === "" ? null : value))
      .pipe(
        z
          .iso.date("Enter a valid date.")
          .refine((value) => value <= latest, "Choose a due date within the next two years.")
          .nullable(),
      ),
  });
}

export function createWorkOrderSchema(today: string) {
  return workOrderDetailsSchema(today).extend({
    vesselId: z.uuid("Choose a vessel."),
    // Set when the work order follows up a failed inspection check (validated by the trigger).
    inspectionItemId: z.union([z.literal("").transform(() => null), z.uuid()]),
  });
}

export type WorkOrderDetailsValues = z.output<ReturnType<typeof workOrderDetailsSchema>>;
export type CreateWorkOrderValues = z.output<ReturnType<typeof createWorkOrderSchema>>;
/** Raw form state: every field as typed or selected ("" = empty). */
export type WorkOrderFormFields = Record<keyof CreateWorkOrderValues, string>;

/** A status change; blocking always says why (the database enforces the same). */
export const statusChangeSchema = z
  .object({
    status: z.enum(WORK_ORDER_STATUSES, "Choose a status."),
    blockedReason: z.string().trim().max(1000, "Keep the reason under 1,000 characters."),
  })
  .refine((value) => value.status !== "blocked" || value.blockedReason !== "", {
    path: ["blockedReason"],
    message: "Say what is blocking the work, so someone can unblock it.",
  })
  .transform((value) => ({
    status: value.status,
    blockedReason: value.status === "blocked" ? value.blockedReason : null,
  }));

export type StatusChangeValues = z.output<typeof statusChangeSchema>;

export const WORK_ORDER_VIEWS = ["open", "mine", "blocked", "completed", "all"] as const;
export type WorkOrderView = (typeof WORK_ORDER_VIEWS)[number];

/** List filters come from the URL, so they are untrusted; bad values fall back to defaults. */
export const workOrderListParamsSchema = z.object({
  view: z.enum(WORK_ORDER_VIEWS).optional().catch(undefined).transform((value) => value ?? "open"),
  vessel: z.uuid().optional().catch(undefined),
  priority: z.enum(PRIORITIES).optional().catch(undefined),
});

export type WorkOrderListParams = z.output<typeof workOrderListParamsSchema>;
