import { z } from "zod";

const optionalUuid = z.union([z.literal("").transform(() => null), z.uuid()]);

/**
 * A new handover. It is about a vessel, a work order or both (the database fills
 * the vessel from the work order and rejects a mismatch). Limits mirror the
 * table's check constraints; content can't be edited afterwards.
 */
export const createHandoverSchema = z
  .object({
    vesselId: optionalUuid,
    workOrderId: optionalUuid,
    toUserId: z.uuid("Choose who takes this over."),
    summary: z
      .string()
      .trim()
      .min(3, "Sum it up in at least 3 characters.")
      .max(200, "Keep the summary under 200 characters."),
    outstandingTasks: z
      .string()
      .trim()
      .min(1, "List what is still to be done, so nothing is dropped at the change of shift.")
      .max(4000, "Keep the outstanding tasks under 4,000 characters."),
  })
  .refine((value) => value.vesselId !== null || value.workOrderId !== null, {
    path: ["vesselId"],
    message: "Choose the vessel this handover is about.",
  });

export type CreateHandoverValues = z.output<typeof createHandoverSchema>;
/** Raw form state: every field as typed or selected ("" = empty). */
export type HandoverFormFields = Record<keyof CreateHandoverValues, string>;

export const HANDOVER_VIEWS = ["pending", "for-you", "sent", "acknowledged", "all"] as const;
export type HandoverView = (typeof HANDOVER_VIEWS)[number];

/** List filters come from the URL, so they are untrusted; bad values fall back to defaults. */
export const handoverListParamsSchema = z.object({
  view: z.enum(HANDOVER_VIEWS).optional().catch(undefined).transform((value) => value ?? "pending"),
  vessel: z.uuid().optional().catch(undefined),
});

export type HandoverListParams = z.output<typeof handoverListParamsSchema>;
