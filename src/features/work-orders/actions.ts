"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createWorkOrderSchema,
  statusChangeSchema,
  workOrderDetailsSchema,
  type WorkOrderFormFields,
} from "@/features/work-orders/schemas";
import {
  changeWorkOrderStatus,
  createWorkOrder,
  updateWorkOrderDetails,
} from "@/features/work-orders/server/mutations";
import { todayIsoDate } from "@/lib/format";

export type WorkOrderFormState = {
  values?: Partial<WorkOrderFormFields>;
  formError?: string;
  fieldErrors?: Partial<Record<keyof WorkOrderFormFields, string[]>>;
};

const FIELDS = [
  "vesselId",
  "inspectionItemId",
  "title",
  "description",
  "priority",
  "assigneeId",
  "dueDate",
] as const satisfies readonly (keyof WorkOrderFormFields)[];

function readForm(formData: FormData): Partial<WorkOrderFormFields> {
  return Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? "")]));
}

export async function createWorkOrderAction(
  _previous: WorkOrderFormState,
  formData: FormData,
): Promise<WorkOrderFormState> {
  const values = readForm(formData);
  const parsed = createWorkOrderSchema(todayIsoDate()).safeParse(values);
  if (!parsed.success) {
    return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const result = await createWorkOrder(parsed.data);
  if (!result.ok) {
    return { values, formError: result.formError, fieldErrors: result.fieldErrors };
  }
  // Work orders feed the vessel watch list, inspection follow-ups and the dashboard (D-033).
  revalidatePath("/", "layout");
  if (result.inspectionId) {
    // Raised from a failed check: back to the inspection, which links the new work (D-037).
    redirect(`/inspections/${result.inspectionId}?saved=raised&workOrder=${result.workOrderId}`);
  }
  redirect(`/work-orders/${result.workOrderId}?saved=created`);
}

export async function updateWorkOrderAction(
  workOrderId: string,
  _previous: WorkOrderFormState,
  formData: FormData,
): Promise<WorkOrderFormState> {
  const values = readForm(formData);
  // workOrderId is a bound argument sent by the client: validate it; RLS does the rest.
  if (!z.uuid().safeParse(workOrderId).success) {
    return { values, formError: "This work order no longer exists or you can't change it." };
  }
  const parsed = workOrderDetailsSchema(todayIsoDate()).safeParse(values);
  if (!parsed.success) {
    return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const result = await updateWorkOrderDetails(workOrderId, parsed.data);
  if (!result.ok) {
    return { values, formError: result.formError, fieldErrors: result.fieldErrors };
  }
  revalidatePath("/", "layout");
  redirect(`/work-orders/${result.workOrderId}?saved=updated`);
}

export type StatusFormState = {
  error?: string;
  fieldErrors?: { blockedReason?: string[] };
  values?: { blockedReason: string };
};

export async function changeWorkOrderStatusAction(
  workOrderId: string,
  _previous: StatusFormState,
  formData: FormData,
): Promise<StatusFormState> {
  const values = {
    status: String(formData.get("status") ?? ""),
    blockedReason: String(formData.get("blockedReason") ?? ""),
  };
  if (!z.uuid().safeParse(workOrderId).success) {
    return { error: "This work order no longer exists or you can't change it." };
  }
  const parsed = statusChangeSchema.safeParse(values);
  if (!parsed.success) {
    const { fieldErrors, formErrors } = z.flattenError(parsed.error);
    return {
      values: { blockedReason: values.blockedReason },
      error: formErrors[0] ?? fieldErrors.status?.[0],
      fieldErrors: { blockedReason: fieldErrors.blockedReason },
    };
  }

  const result = await changeWorkOrderStatus(workOrderId, parsed.data);
  if (!result.ok) {
    return { values: { blockedReason: values.blockedReason }, error: result.error };
  }
  revalidatePath("/", "layout");
  return {};
}
