"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  recordResultSchema,
  scheduleInspectionSchema,
  type ScheduleInspectionFields,
} from "@/features/inspections/schemas";
import {
  changeInspectionStatus,
  recordItemResult,
  scheduleInspection,
} from "@/features/inspections/server/mutations";
import { todayIsoDate } from "@/lib/format";

type ScheduleField = Exclude<keyof ScheduleInspectionFields, "items"> | "items";

export type ScheduleFormState = {
  values?: ScheduleInspectionFields;
  formError?: string;
  fieldErrors?: Partial<Record<ScheduleField, string[]>>;
  /** Errors for individual checklist rows, keyed by their index. */
  itemErrors?: Record<number, { category?: string[]; description?: string[] }>;
};

function readScheduleForm(formData: FormData): ScheduleInspectionFields {
  const text = (name: string) => String(formData.get(name) ?? "");
  const categories = formData.getAll("itemCategory").map(String);
  const descriptions = formData.getAll("itemDescription").map(String);
  return {
    vesselId: text("vesselId"),
    title: text("title"),
    scheduledFor: text("scheduledFor"),
    inspectorId: text("inspectorId"),
    notes: text("notes"),
    items: categories.map((category, index) => ({ category, description: descriptions[index] ?? "" })),
  };
}

function toScheduleErrors(error: z.ZodError): Pick<ScheduleFormState, "fieldErrors" | "itemErrors"> {
  const fieldErrors: NonNullable<ScheduleFormState["fieldErrors"]> = {};
  const itemErrors: NonNullable<ScheduleFormState["itemErrors"]> = {};
  for (const issue of error.issues) {
    const [field, index, itemField] = issue.path;
    if (field === "items" && typeof index === "number" && (itemField === "category" || itemField === "description")) {
      const row = (itemErrors[index] ??= {});
      (row[itemField] ??= []).push(issue.message);
    } else if (typeof field === "string") {
      (fieldErrors[field as ScheduleField] ??= []).push(issue.message);
    }
  }
  return { fieldErrors, itemErrors };
}

export async function scheduleInspectionAction(
  _previous: ScheduleFormState,
  formData: FormData,
): Promise<ScheduleFormState> {
  const values = readScheduleForm(formData);
  const parsed = scheduleInspectionSchema(todayIsoDate()).safeParse(values);
  if (!parsed.success) {
    return { values, ...toScheduleErrors(parsed.error) };
  }

  const result = await scheduleInspection(parsed.data);
  if (!result.ok) {
    return { values, formError: result.formError, fieldErrors: result.fieldErrors };
  }

  // Inspections feed the vessel watch list and detail pages too.
  revalidatePath("/", "layout");
  redirect(`/inspections/${result.inspectionId}?saved=scheduled`);
}

export type StatusActionState = { error?: string };

const statusSchema = z.enum(["in_progress", "completed", "cancelled"]);

/** Used with useActionState; the previous state is not needed, so it is not declared. */
export async function changeInspectionStatusAction(
  inspectionId: string,
  status: string,
): Promise<StatusActionState> {
  // Bound arguments are sent by the client: validate them; RLS and triggers do the rest.
  const id = z.uuid().safeParse(inspectionId);
  const nextStatus = statusSchema.safeParse(status);
  if (!id.success || !nextStatus.success) {
    return { error: "This inspection no longer exists or you can't change it." };
  }

  const result = await changeInspectionStatus(id.data, nextStatus.data);
  if (!result.ok) {
    return { error: result.error };
  }
  revalidatePath("/", "layout");
  if (nextStatus.data === "completed") {
    // Completion is final: confirm it on the record, with any follow-up still owed.
    redirect(`/inspections/${id.data}?saved=completed`);
  }
  return {};
}

export type RecordResultState = {
  error?: string;
  fieldErrors?: { result?: string[]; finding?: string[]; severity?: string[] };
  /** What the user submitted, so a failed save keeps their typing. */
  values?: { result: string; finding: string; severity: string };
  /** Changes on every successful save, so the client can confirm it. */
  savedAt?: number;
};

export async function recordResultAction(
  inspectionId: string,
  itemId: string,
  _previous: RecordResultState,
  formData: FormData,
): Promise<RecordResultState> {
  const values = {
    result: String(formData.get("result") ?? ""),
    finding: String(formData.get("finding") ?? ""),
    severity: String(formData.get("severity") ?? ""),
  };
  if (!z.uuid().safeParse(inspectionId).success || !z.uuid().safeParse(itemId).success) {
    return { values, error: "This check no longer exists." };
  }

  const parsed = recordResultSchema.safeParse(values);
  if (!parsed.success) {
    return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const result = await recordItemResult(inspectionId, itemId, parsed.data);
  if (!result.ok) {
    return { values, error: result.error };
  }
  revalidatePath("/", "layout");
  return { savedAt: Date.now() };
}
