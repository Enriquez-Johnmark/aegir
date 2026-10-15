import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/shared/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkOrderFilters } from "@/features/work-orders/components/work-order-filters";
import { WorkOrdersList } from "@/features/work-orders/components/work-orders-list";
import { workOrderListParamsSchema } from "@/features/work-orders/schemas";
import { listVesselNames } from "@/features/vessels/server/queries";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Work orders",
};

export default function WorkOrdersPage({ searchParams }: PageProps<"/work-orders">) {
  return (
    <>
      <PageHeader
        title="Work orders"
        description="Open work, overdue and most urgent first."
        actions={
          <Suspense fallback={null}>
            <RaiseButton searchParams={searchParams} />
          </Suspense>
        }
      />
      <Suspense fallback={<Skeleton className="h-8 md:max-w-xl" />}>
        <Filters />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <FilteredWorkOrdersList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function readParams(searchParams: PageProps<"/work-orders">["searchParams"]) {
  const raw = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return workOrderListParamsSchema.parse({
    view: first(raw.view),
    vessel: first(raw.vessel),
    priority: first(raw.priority),
  });
}

async function RaiseButton({ searchParams }: Pick<PageProps<"/work-orders">, "searchParams">) {
  const [user, params] = await Promise.all([requireUser(), readParams(searchParams)]);
  if (!can(user.role, "work-orders:create")) {
    return null;
  }
  return (
    <ButtonLink href={params.vessel ? `/work-orders/new?vessel=${params.vessel}` : "/work-orders/new"}>
      <PlusIcon data-icon="inline-start" />
      Raise work order
    </ButtonLink>
  );
}

async function Filters() {
  const vessels = await listVesselNames();
  return <WorkOrderFilters vessels={vessels} />;
}

async function FilteredWorkOrdersList({ searchParams }: Pick<PageProps<"/work-orders">, "searchParams">) {
  const [params, vessels] = await Promise.all([readParams(searchParams), listVesselNames()]);
  const vesselName = params.vessel ? (vessels.find((v) => v.id === params.vessel)?.name ?? null) : null;
  return <WorkOrdersList params={params} vesselName={vesselName} />;
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
