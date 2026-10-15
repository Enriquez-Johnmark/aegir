import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { Skeleton } from "@/components/ui/skeleton";
import { HandoverDetail } from "@/features/handovers/components/handover-detail";
import { getHandoverDetail } from "@/features/handovers/server/queries";

export async function generateMetadata({ params }: PageProps<"/handovers/[handoverId]">): Promise<Metadata> {
  const { handoverId } = await params;
  const handover = z.uuid().safeParse(handoverId).success ? await getHandoverDetail(handoverId) : null;
  return { title: handover ? `${handover.summary} · Handover` : "Handover not found" };
}

export default function HandoverPage({ params, searchParams }: PageProps<"/handovers/[handoverId]">) {
  return (
    <Suspense fallback={<HandoverDetailSkeleton />}>
      <HandoverDetailForParams params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function HandoverDetailForParams({
  params,
  searchParams,
}: Pick<PageProps<"/handovers/[handoverId]">, "params" | "searchParams">) {
  const [{ handoverId }, { saved }] = await Promise.all([params, searchParams]);
  // Route params are user input: anything that isn't a UUID can't be a handover.
  if (!z.uuid().safeParse(handoverId).success) {
    notFound();
  }
  return <HandoverDetail handoverId={handoverId} saved={typeof saved === "string" ? saved : null} />;
}

function HandoverDetailSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-5 w-56" />
      </div>
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-48 max-w-3xl rounded-xl" />
    </>
  );
}
