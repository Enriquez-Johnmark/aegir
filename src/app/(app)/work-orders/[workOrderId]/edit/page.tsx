import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { ForbiddenState } from "@/components/shared/forbidden-state";
import { Skeleton } from "@/components/ui/skeleton";
import { updateWorkOrderAction } from "@/features/work-orders/actions";
import { WorkOrderForm } from "@/features/work-orders/components/work-order-form";
import { canManage } from "@/features/work-orders/domain";
import {
  getWorkOrderDetail,
  getWorkOrderForEdit,
  getWorkOrderFormOptions,
} from "@/features/work-orders/server/queries";
import { requireUser } from "@/lib/auth/session";

export async function generateMetadata({ params }: PageProps<"/work-orders/[workOrderId]/edit">): Promise<Metadata> {
  const { workOrderId } = await params;
  const workOrder = z.uuid().safeParse(workOrderId).success ? await getWorkOrderDetail(workOrderId) : null;
  return { title: workOrder ? `Edit ${workOrder.title}` : "Work order not found" };
}

export default function EditWorkOrderPage({ params }: PageProps<"/work-orders/[workOrderId]/edit">) {
  return (
    <Suspense
      fallback={
        <>
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[28rem] max-w-2xl rounded-xl" />
        </>
      }
    >
      <EditWorkOrder params={params} />
    </Suspense>
  );
}

async function EditWorkOrder({ params }: Pick<PageProps<"/work-orders/[workOrderId]/edit">, "params">) {
  const { workOrderId } = await params;
  if (!z.uuid().safeParse(workOrderId).success) {
    notFound();
  }
  const [user, edit] = await Promise.all([requireUser(), getWorkOrderForEdit(workOrderId)]);
  if (!edit) {
    notFound();
  }

  const { workOrder, values } = edit;
  const breadcrumbs = [
    { label: "Work orders", href: "/work-orders" },
    { label: workOrder.title, href: `/work-orders/${workOrderId}` },
    { label: "Edit" },
  ];

  if (!canManage(user.role) || workOrder.status === "completed") {
    return (
      <>
        <PageHeader breadcrumbs={breadcrumbs} title={workOrder.title} />
        <ForbiddenState
          title={workOrder.status === "completed" ? "Completed work orders can't be edited" : "You can't edit work orders"}
          description={
            workOrder.status === "completed"
              ? "The record is closed. Raise a new work order if more work is needed."
              : "Only fleet managers and administrators can change work order details. Assignees can update the status."
          }
          backHref={`/work-orders/${workOrderId}`}
          backLabel="Back to work order"
        />
      </>
    );
  }

  const options = await getWorkOrderFormOptions();
  return (
    <>
      <PageHeader breadcrumbs={breadcrumbs} title={`Edit ${workOrder.title}`} description={workOrder.vessel.name} />
      <WorkOrderForm
        action={updateWorkOrderAction.bind(null, workOrderId)}
        defaultValues={{ ...values, vesselId: workOrder.vessel.id, inspectionItemId: "" }}
        assignees={options.assignees}
        submitLabel="Save changes"
        pendingLabel="Saving…"
        cancelHref={`/work-orders/${workOrderId}`}
      />
    </>
  );
}
