import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { ForbiddenState } from "@/components/shared/forbidden-state";
import { Skeleton } from "@/components/ui/skeleton";
import { HandoverForm } from "@/features/handovers/components/handover-form";
import type { HandoverFormFields } from "@/features/handovers/schemas";
import { getHandoverFormOptions } from "@/features/handovers/server/queries";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "New handover",
};

const BREADCRUMBS = [{ label: "Handovers", href: "/handovers" }, { label: "New handover" }];

export default function NewHandoverPage({ searchParams }: PageProps<"/handovers/new">) {
  return (
    <Suspense
      fallback={
        <>
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[28rem] max-w-2xl rounded-xl" />
        </>
      }
    >
      <NewHandover searchParams={searchParams} />
    </Suspense>
  );
}

const asUuid = (value: string | string[] | undefined) =>
  typeof value === "string" && z.uuid().safeParse(value).success ? value : null;

async function NewHandover({ searchParams }: Pick<PageProps<"/handovers/new">, "searchParams">) {
  const [user, raw] = await Promise.all([requireUser(), searchParams]);
  if (!can(user.role, "handovers:create")) {
    return (
      <>
        <PageHeader breadcrumbs={BREADCRUMBS} title="New handover" />
        <ForbiddenState
          title="You can't hand work over"
          description="Read-only viewers can follow handovers but not send them. Ask a crew member, inspector or fleet manager."
          backHref="/handovers"
          backLabel="Back to handovers"
        />
      </>
    );
  }

  const options = await getHandoverFormOptions();
  // ?workOrder= fixes the subject; ?vessel= preselects one. Both are untrusted: they must be
  // something the caller can actually see (the options come from RLS-scoped reads).
  const fixed = options.workOrders.find((wo) => wo.id === asUuid(raw.workOrder));
  const preselected = options.vessels.find((v) => v.id === asUuid(raw.vessel))?.id ?? "";

  const defaults: HandoverFormFields = {
    vesselId: fixed ? "" : preselected,
    workOrderId: fixed?.id ?? "",
    toUserId: "",
    summary: "",
    outstandingTasks: "",
  };
  const cancelHref = fixed ? `/work-orders/${fixed.id}` : preselected ? `/vessels/${preselected}` : "/handovers";

  return (
    <>
      <PageHeader
        breadcrumbs={BREADCRUMBS}
        title="New handover"
        description="Pass unfinished work to a colleague, so nothing is dropped at the change of shift."
      />
      <HandoverForm
        defaultValues={defaults}
        vessels={options.vessels}
        workOrders={options.workOrders}
        recipients={options.recipients}
        fixedWorkOrder={fixed ? { id: fixed.id, title: fixed.title, vesselName: fixed.vesselName } : undefined}
        cancelHref={cancelHref}
      />
    </>
  );
}
