import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { VesselFilters } from "@/features/vessels/components/vessel-filters";
import { VesselsList } from "@/features/vessels/components/vessels-list";
import { vesselListParamsSchema } from "@/features/vessels/schemas";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Vessels",
};

export default function VesselsPage({ searchParams }: PageProps<"/vessels">) {
  return (
    <>
      <PageHeader
        title="Vessels"
        description="Your fleet, with the vessels that need attention first."
        actions={
          <Suspense fallback={null}>
            <AddVesselButton />
          </Suspense>
        }
      />
      <Suspense fallback={<Skeleton className="h-8 md:max-w-xl" />}>
        <VesselFilters />
      </Suspense>
      <Suspense fallback={<VesselsListSkeleton />}>
        <FilteredVesselsList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function AddVesselButton() {
  const user = await requireUser();
  if (!can(user.role, "vessels:write")) {
    return null;
  }
  return (
    <ButtonLink href="/vessels/new">
      <PlusIcon data-icon="inline-start" />
      Add vessel
    </ButtonLink>
  );
}

async function FilteredVesselsList({ searchParams }: Pick<PageProps<"/vessels">, "searchParams">) {
  const raw = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const params = vesselListParamsSchema.parse({
    q: first(raw.q),
    status: first(raw.status),
    type: first(raw.type),
    sort: first(raw.sort),
  });
  return <VesselsList params={params} />;
}

function VesselsListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
