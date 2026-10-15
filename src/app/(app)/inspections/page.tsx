import { CalendarPlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/shared/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import { InspectionFilters } from "@/features/inspections/components/inspection-filters";
import { InspectionsList } from "@/features/inspections/components/inspections-list";
import { inspectionListParamsSchema } from "@/features/inspections/schemas";
import { listVesselNames } from "@/features/vessels/server/queries";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Inspections",
};

export default function InspectionsPage({ searchParams }: PageProps<"/inspections">) {
  return (
    <>
      <PageHeader
        title="Inspections"
        description="Open inspections oldest first, so anything overdue leads."
        actions={
          <Suspense fallback={null}>
            <ScheduleButton searchParams={searchParams} />
          </Suspense>
        }
      />
      <Suspense fallback={<FiltersSkeleton />}>
        <Filters />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <FilteredInspectionsList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function readParams(searchParams: PageProps<"/inspections">["searchParams"]) {
  const raw = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return inspectionListParamsSchema.parse({ view: first(raw.view), vessel: first(raw.vessel) });
}

async function ScheduleButton({ searchParams }: Pick<PageProps<"/inspections">, "searchParams">) {
  const [user, params] = await Promise.all([requireUser(), readParams(searchParams)]);
  if (!can(user.role, "inspections:create")) {
    return null;
  }
  return (
    <ButtonLink href={params.vessel ? `/inspections/new?vessel=${params.vessel}` : "/inspections/new"}>
      <CalendarPlusIcon data-icon="inline-start" />
      Schedule inspection
    </ButtonLink>
  );
}

async function Filters() {
  const vessels = await listVesselNames();
  return <InspectionFilters vessels={vessels} />;
}

async function FilteredInspectionsList({ searchParams }: Pick<PageProps<"/inspections">, "searchParams">) {
  const [params, vessels] = await Promise.all([readParams(searchParams), listVesselNames()]);
  const vesselName = params.vessel ? (vessels.find((v) => v.id === params.vessel)?.name ?? null) : null;
  return <InspectionsList params={params} vesselName={vesselName} />;
}

function FiltersSkeleton() {
  return <Skeleton className="h-8 md:max-w-md" />;
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
