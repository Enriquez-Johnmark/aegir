"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createHandoverSchema, type HandoverFormFields } from "@/features/handovers/schemas";
import { acknowledgeHandover, createHandover } from "@/features/handovers/server/mutations";

export type HandoverFormState = {
  values?: Partial<HandoverFormFields>;
  formError?: string;
  fieldErrors?: Partial<Record<keyof HandoverFormFields, string[]>>;
};

const FIELDS = ["vesselId", "workOrderId", "toUserId", "summary", "outstandingTasks"] as const satisfies readonly (keyof HandoverFormFields)[];

function readForm(formData: FormData): Partial<HandoverFormFields> {
  return Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? "")]));
}

export async function createHandoverAction(
  _previous: HandoverFormState,
  formData: FormData,
): Promise<HandoverFormState> {
  const values = readForm(formData);
  const parsed = createHandoverSchema.safeParse(values);
  if (!parsed.success) {
    return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const result = await createHandover(parsed.data);
  if (!result.ok) {
    return { values, formError: result.formError, fieldErrors: result.fieldErrors };
  }
  // Handovers feed the dashboard as well as their own list (D-033).
  revalidatePath("/", "layout");
  redirect(`/handovers/${result.handoverId}?saved=created`);
}

export type AcknowledgeState = { error?: string };

/** Used with useActionState; the previous state is not needed, so it is not declared. */
export async function acknowledgeHandoverAction(handoverId: string): Promise<AcknowledgeState> {
  // Bound arguments are sent by the client: validate them; RLS and the trigger do the rest.
  if (!z.uuid().safeParse(handoverId).success) {
    return { error: "This handover no longer exists." };
  }
  const result = await acknowledgeHandover(handoverId);
  if (!result.ok) {
    return { error: result.error };
  }
  revalidatePath("/", "layout");
  redirect(`/handovers/${handoverId}?saved=acknowledged`);
}
