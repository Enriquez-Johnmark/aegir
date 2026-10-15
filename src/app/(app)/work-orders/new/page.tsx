import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { ForbiddenState } from "@/components/shared/forbidden-state";
import { Skeleton } from "@/components/ui/skeleton";
import { createWorkOrderAction } from "@/features/work-orders/actions";
import { WorkOrderForm, type FollowUpContext } from "@/features/work-orders/components/work-order-form";
import { UNASSIGNED, type WorkOrderFormFields } from "@/features/work-orders/schemas";
import { getFailedCheck, getWorkOrderFormOptions } from "@/features/work-orders/server/queries";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Raise work order",
};

const BREADCRUMBS = [{ label: "Work orders", href: "/work-orders" }, { label: "Raise work order" }];

export default function NewWorkOrderPage({ searchParams }: PageProps<"/work-orders/new">) {
  return (
    <Suspense
      fallback={
        <>
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[28rem] max-w-2xl rounded-xl" />
        </>
      }
    >
      <NewWorkOrder searchParams={searchParams} />
    </Suspense>
  );
}

const asUuid = (value: string | string[] | undefined) =>
  typeof value === "string" && z.uuid().safeParse(value).success ? value : null;

async function NewWorkOrder({ searchParams }: Pick<PageProps<"/work-orders/new">, "searchParams">) {
  const [user, raw] = await Promise.all([requireUser(), searchParams]);
  if (!can(user.role, "work-orders:create")) {
    return (
      <>
        <PageHeader breadcrumbs={BREADCRUMBS} title="Raise work order" />
        <ForbiddenState
          title="You can't raise work orders"
          description="Only safety inspectors, fleet managers and administrators can raise work orders. You can still update the status of work assigned to you."
          backHref="/work-orders"
          backLabel="Back to work orders"
        />
      </>
    );
  }

  // ?item= raises a follow-up for a failed check; ?vessel= preselects a vessel. Both are untrusted.
  const itemId = asUuid(raw.item);
  const [options, failedCheck] = await Promise.all([
    getWorkOrderFormOptions(),
    itemId ? getFailedCheck(itemId) : Promise.resolve(null),
  ]);
  const vesselId = asUuid(raw.vessel);
  const preselected = options.vessels.find((v) => v.id === vesselId)?.id ?? "";

  const followUp: FollowUpContext | undefined = failedCheck
    ? {
        itemId: failedCheck.id,
        vesselName: failedCheck.vessel.name,
        inspectionTitle: failedCheck.inspection.title,
        check: failedCheck.description,
        finding: failedCheck.finding,
        existingWorkOrders: failedCheck.existingWorkOrders,
      }
    : undefined;

  // A follow-up starts from the finding: its check as the title, its severity as the priority.
  const defaults: WorkOrderFormFields = failedCheck
    ? {
        vesselId: failedCheck.vessel.id,
        inspectionItemId: failedCheck.id,
        title: `Fix: ${failedCheck.description}`.slice(0, 160),
        description: failedCheck.finding ?? "",
        priority: failedCheck.severity ?? "medium",
        assigneeId: UNASSIGNED,
        dueDate: "",
      }
    : {
        vesselId: preselected,
        inspectionItemId: "",
        title: "",
        description: "",
        priority: "medium",
        assigneeId: UNASSIGNED,
        dueDate: "",
      };

  const cancelHref = failedCheck
    ? `/inspections/${failedCheck.inspection.id}`
    : preselected
      ? `/vessels/${preselected}`
      : "/work-orders";

  return (
    <>
      <PageHeader
        breadcrumbs={BREADCRUMBS}
        title="Raise work order"
        description={
          failedCheck
            ? "Plan the fix for a failed inspection check."
            : "Maintenance or corrective work on a vessel."
        }
      />
      <WorkOrderForm
        action={createWorkOrderAction}
        defaultValues={defaults}
        vessels={options.vessels}
        assignees={options.assignees}
        followUp={followUp}
        submitLabel="Raise work order"
        pendingLabel="Raising…"
        cancelHref={cancelHref}
      />
    </>
  );
}
