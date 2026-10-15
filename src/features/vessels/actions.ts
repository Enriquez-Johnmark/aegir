"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { vesselFormSchema, type VesselFormFields } from "@/features/vessels/schemas";
import { createVessel, updateVessel } from "@/features/vessels/server/mutations";

export type VesselFormState = {
  values?: Partial<VesselFormFields>;
  formError?: string;
  fieldErrors?: Partial<Record<keyof VesselFormFields, string[]>>;
};

const FIELDS = [
  "name",
  "imoNumber",
  "vesselType",
  "flagState",
  "status",
  "yearBuilt",
  "grossTonnage",
] as const satisfies readonly (keyof VesselFormFields)[];

function readForm(formData: FormData): Partial<VesselFormFields> {
  return Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? "")]));
}

async function saveVessel(vesselId: string | null, formData: FormData): Promise<VesselFormState> {
  const values = readForm(formData);
  const parsed = vesselFormSchema().safeParse(values);
  if (!parsed.success) {
    return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const result = vesselId
    ? await updateVessel(vesselId, parsed.data)
    : await createVessel(parsed.data);
  if (!result.ok) {
    return { values, formError: result.formError, fieldErrors: result.fieldErrors };
  }

  // Vessel status also feeds the dashboard and the other lists (D-033).
  revalidatePath("/", "layout");
  redirect(`/vessels/${result.vesselId}?saved=${vesselId ? "updated" : "created"}`);
}

export async function createVesselAction(
  _previous: VesselFormState,
  formData: FormData,
): Promise<VesselFormState> {
  return saveVessel(null, formData);
}

export async function updateVesselAction(
  vesselId: string,
  _previous: VesselFormState,
  formData: FormData,
): Promise<VesselFormState> {
  // vesselId is a bound argument sent by the client: validate it; RLS does the rest.
  if (!z.uuid().safeParse(vesselId).success) {
    return { formError: "This vessel no longer exists or you can't edit it." };
  }
  return saveVessel(vesselId, formData);
}
