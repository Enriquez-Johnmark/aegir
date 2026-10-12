import { z } from "zod";

import { isValidImo, VESSEL_STATUSES, VESSEL_TYPES } from "@/features/vessels/domain";

const optionalInt = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .pipe(
      z
        .string()
        .regex(/^\d+$/, `${label} must be a whole number.`)
        .transform(Number)
        .pipe(
          z
            .number()
            .min(min, `${label} must be at least ${min}.`)
            .max(max, `${label} must be at most ${max.toLocaleString("en")}.`),
        )
        .nullable(),
    );

export function vesselFormSchema(currentYear = new Date().getFullYear()) {
  return z.object({
    name: z.string().trim().min(1, "Enter the vessel name.").max(120, "Keep the name under 120 characters."),
    // `abort` stops at the first failed check, so an empty field gets one clear message.
    imoNumber: z
      .string()
      .trim()
      .min(1, { message: "Enter the IMO number.", abort: true })
      .regex(/^\d{7}$/, { message: "An IMO number has exactly 7 digits.", abort: true })
      .refine(isValidImo, "This IMO number's check digit is wrong. Check for a typo."),
    vesselType: z.enum(VESSEL_TYPES, "Choose a vessel type."),
    flagState: z
      .string()
      .trim()
      .min(2, "Enter the flag state.")
      .max(60, "Keep the flag state under 60 characters."),
    status: z.enum(VESSEL_STATUSES, "Choose a status."),
    yearBuilt: optionalInt("Year built", 1900, currentYear + 1),
    grossTonnage: optionalInt("Gross tonnage", 1, 1_000_000),
  });
}

export type VesselFormValues = z.output<ReturnType<typeof vesselFormSchema>>;
/** Raw form state: every field as the string the user typed or selected ("" = empty). */
export type VesselFormFields = Record<keyof VesselFormValues, string>;

const SORTS = ["attention", "name", "recent", "year"] as const;
export type VesselSort = (typeof SORTS)[number];

/**
 * List filters come from the URL, so they are untrusted. The search term is
 * reduced to characters that are safe inside a PostgREST filter expression.
 */
export const vesselListParamsSchema = z.object({
  q: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .replace(/[^\p{L}\p{N}\s'-]/gu, "")
        .trim()
        .slice(0, 60),
    ),
  status: z.enum(VESSEL_STATUSES).optional().catch(undefined),
  type: z.enum(VESSEL_TYPES).optional().catch(undefined),
  sort: z.enum(SORTS).optional().catch(undefined).transform((value) => value ?? "attention"),
});

export type VesselListParams = z.output<typeof vesselListParamsSchema>;
