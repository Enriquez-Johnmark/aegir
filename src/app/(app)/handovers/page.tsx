import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/shared/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { HandoverFilters } from "@/features/handovers/components/handover-filters";
import { HandoversList } from "@/features/handovers/components/handovers-list";
import { handoverListParamsSchema } from "@/features/handovers/schemas";
import { listVesselNames } from "@/features/vessels/server/queries";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Handovers",
};

export default function HandoversPage({ searchParams }: PageProps<"/handovers">) {
  return (
    <>
      <PageHeader
        title="Handovers"
        description="Unfinished work passed between shifts. Pending ones addressed to you come first."
        actions={
          <Suspense fallback={null}>
            <NewButton searchParams={searchParams} />
          </Suspense>
        }
      />
      <Suspense fallback={<Skeleton className="h-8 md:max-w-xl" />}>
        <Filters />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <FilteredHandoversList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function readParams(searchParams: PageProps<"/handovers">["searchParams"]) {
  const raw = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return handoverListParamsSchema.parse({ view: first(raw.view), vessel: first(raw.vessel) });
}

async function NewButton({ searchParams }: Pick<PageProps<"/handovers">, "searchParams">) {
  const [user, params] = await Promise.all([requireUser(), readParams(searchParams)]);
  if (!can(user.role, "handovers:create")) {
    return null;
  }
  return (
    <ButtonLink href={params.vessel ? `/handovers/new?vessel=${params.vessel}` : "/handovers/new"}>
      <PlusIcon data-icon="inline-start" />
      New handover
    </ButtonLink>
  );
}

async function Filters() {
  const vessels = await listVesselNames();
  return <HandoverFilters vessels={vessels} />;
}

async function FilteredHandoversList({ searchParams }: Pick<PageProps<"/handovers">, "searchParams">) {
  const [params, vessels] = await Promise.all([readParams(searchParams), listVesselNames()]);
  const vesselName = params.vessel ? (vessels.find((v) => v.id === params.vessel)?.name ?? null) : null;
  return <HandoversList params={params} vesselName={vesselName} />;
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
