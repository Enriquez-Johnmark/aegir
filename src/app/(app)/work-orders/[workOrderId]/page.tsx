import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { Skeleton } from "@/components/ui/skeleton";
import { WorkOrderDetail } from "@/features/work-orders/components/work-order-detail";
import { getWorkOrderDetail } from "@/features/work-orders/server/queries";

export async function generateMetadata({ params }: PageProps<"/work-orders/[workOrderId]">): Promise<Metadata> {
  const { workOrderId } = await params;
  const workOrder = z.uuid().safeParse(workOrderId).success ? await getWorkOrderDetail(workOrderId) : null;
  return { title: workOrder ? `${workOrder.title} · ${workOrder.vessel.name}` : "Work order not found" };
}

export default function WorkOrderPage({ params, searchParams }: PageProps<"/work-orders/[workOrderId]">) {
  return (
    <Suspense fallback={<WorkOrderDetailSkeleton />}>
      <WorkOrderDetailForParams params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function WorkOrderDetailForParams({
  params,
  searchParams,
}: Pick<PageProps<"/work-orders/[workOrderId]">, "params" | "searchParams">) {
  const [{ workOrderId }, { saved }] = await Promise.all([params, searchParams]);
  // Route params are user input: anything that isn't a UUID can't be a work order.
  if (!z.uuid().safeParse(workOrderId).success) {
    notFound();
  }
  return <WorkOrderDetail workOrderId={workOrderId} saved={typeof saved === "string" ? saved : null} />;
}

function WorkOrderDetailSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-5 w-56" />
      </div>
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </>
  );
}
