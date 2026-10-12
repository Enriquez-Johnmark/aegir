import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { Skeleton } from "@/components/ui/skeleton";
import { VesselDetail } from "@/features/vessels/components/vessel-detail";
import { getVesselDetail } from "@/features/vessels/server/queries";

export async function generateMetadata({ params }: PageProps<"/vessels/[vesselId]">): Promise<Metadata> {
  const { vesselId } = await params;
  const vessel = z.uuid().safeParse(vesselId).success ? await getVesselDetail(vesselId) : null;
  return { title: vessel?.name ?? "Vessel not found" };
}

export default function VesselPage({ params, searchParams }: PageProps<"/vessels/[vesselId]">) {
  return (
    <Suspense fallback={<VesselDetailSkeleton />}>
      <VesselDetailForParams params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function VesselDetailForParams({
  params,
  searchParams,
}: Pick<PageProps<"/vessels/[vesselId]">, "params" | "searchParams">) {
  const [{ vesselId }, { saved }] = await Promise.all([params, searchParams]);
  // Route params are user input: anything that isn't a UUID can't be a vessel.
  if (!z.uuid().safeParse(vesselId).success) {
    notFound();
  }
  return <VesselDetail vesselId={vesselId} saved={typeof saved === "string" ? saved : null} />;
}

function VesselDetailSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </>
  );
}
