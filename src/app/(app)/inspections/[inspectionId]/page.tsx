import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { Skeleton } from "@/components/ui/skeleton";
import { InspectionDetail } from "@/features/inspections/components/inspection-detail";
import { getInspectionDetail } from "@/features/inspections/server/queries";

export async function generateMetadata({ params }: PageProps<"/inspections/[inspectionId]">): Promise<Metadata> {
  const { inspectionId } = await params;
  const inspection = z.uuid().safeParse(inspectionId).success ? await getInspectionDetail(inspectionId) : null;
  return { title: inspection ? `${inspection.title} · ${inspection.vessel.name}` : "Inspection not found" };
}

export default function InspectionPage({ params, searchParams }: PageProps<"/inspections/[inspectionId]">) {
  return (
    <Suspense fallback={<InspectionDetailSkeleton />}>
      <InspectionDetailForParams params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function InspectionDetailForParams({
  params,
  searchParams,
}: Pick<PageProps<"/inspections/[inspectionId]">, "params" | "searchParams">) {
  const [{ inspectionId }, { saved }] = await Promise.all([params, searchParams]);
  // Route params are user input: anything that isn't a UUID can't be an inspection.
  if (!z.uuid().safeParse(inspectionId).success) {
    notFound();
  }
  return <InspectionDetail inspectionId={inspectionId} saved={typeof saved === "string" ? saved : null} />;
}

function InspectionDetailSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-5 w-56" />
      </div>
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </>
  );
}
