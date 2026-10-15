import { z } from "zod";

import { RECORDABLE_RESULTS, SEVERITIES } from "@/features/inspections/domain";

const DAY_MS = 86_400_000;

function shiftIsoDate(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export const MAX_CHECKLIST_ITEMS = 100;
/** The inspector select's "Assign later" value (a select option can't be empty). */
export const UNASSIGNED = "unassigned";

const checklistItemSchema = z.object({
  category: z
    .string()
    .trim()
    .min(1, "Enter a category.")
    .max(80, "Keep the category under 80 characters."),
  description: z
    .string()
    .trim()
    .min(1, "Describe what to check.")
    .max(500, "Keep the check under 500 characters."),
});

/**
 * Scheduling an inspection. `today` is injected so tests are deterministic.
 * Past dates are allowed (recording an inspection after the fact), within a year.
 */
export function scheduleInspectionSchema(today: string) {
  const earliest = shiftIsoDate(today, -365);
  const latest = shiftIsoDate(today, 730);
  return z.object({
    vesselId: z.uuid("Choose a vessel."),
    title: z
      .string()
      .trim()
      .min(3, "Give the inspection a title of at least 3 characters.")
      .max(160, "Keep the title under 160 characters."),
    scheduledFor: z
      .string()
      .min(1, { message: "Choose a date.", abort: true })
      .pipe(z.iso.date("Enter a valid date."))
      .refine((value) => value >= earliest, "Choose a date within the last year.")
      .refine((value) => value <= latest, "Choose a date within the next two years."),
    // UNASSIGNED (or "") means "assign later"; an id must be a colleague (checked by the database trigger).
    inspectorId: z.union([z.enum(["", UNASSIGNED]).transform(() => null), z.uuid("Choose an inspector.")]),
    notes: z
      .string()
      .trim()
      .max(4000, "Keep the notes under 4,000 characters.")
      .transform((value) => (value === "" ? null : value)),
    items: z
      .array(checklistItemSchema)
      .min(1, "Add at least one check to the checklist.")
      .max(MAX_CHECKLIST_ITEMS, `A checklist can have at most ${MAX_CHECKLIST_ITEMS} checks.`),
  });
}

export type ScheduleInspectionValues = z.output<ReturnType<typeof scheduleInspectionSchema>>;
export type ScheduleInspectionFields = {
  vesselId: string;
  title: string;
  scheduledFor: string;
  inspectorId: string;
  notes: string;
  items: { category: string; description: string }[];
};

/**
 * One checklist result. A failed check must say what was found and how severe
 * it is (the database enforces the same with check constraints).
 */
export const recordResultSchema = z
  .object({
    result: z.enum(RECORDABLE_RESULTS, "Choose pass, fail or N/A."),
    finding: z.string().trim().max(2000, "Keep the finding under 2,000 characters."),
    severity: z.string(),
  })
  .transform((value, ctx) => {
    if (value.result !== "fail") {
      return { result: value.result, finding: null, severity: null };
    }
    const severity = z.enum(SEVERITIES).safeParse(value.severity);
    if (value.finding === "") {
      ctx.addIssue({ code: "custom", path: ["finding"], message: "Describe what you found." });
    }
    if (!severity.success) {
      ctx.addIssue({ code: "custom", path: ["severity"], message: "Choose how severe it is." });
    }
    return value.finding === "" || !severity.success
      ? z.NEVER
      : { result: value.result, finding: value.finding, severity: severity.data };
  });

export type RecordResultValues = z.output<typeof recordResultSchema>;

export const INSPECTION_VIEWS = ["open", "completed", "cancelled", "all"] as const;
export type InspectionView = (typeof INSPECTION_VIEWS)[number];

/** List filters come from the URL, so they are untrusted; bad values fall back to defaults. */
export const inspectionListParamsSchema = z.object({
  view: z.enum(INSPECTION_VIEWS).optional().catch(undefined).transform((value) => value ?? "open"),
  vessel: z.uuid().optional().catch(undefined),
});

export type InspectionListParams = z.output<typeof inspectionListParamsSchema>;
