import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { ForbiddenState } from "@/components/shared/forbidden-state";
import { Skeleton } from "@/components/ui/skeleton";
import { updateVesselAction } from "@/features/vessels/actions";
import { VesselForm } from "@/features/vessels/components/vessel-form";
import { getVesselDetail, getVesselForEdit } from "@/features/vessels/server/queries";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export async function generateMetadata({ params }: PageProps<"/vessels/[vesselId]/edit">): Promise<Metadata> {
  const { vesselId } = await params;
  const vessel = z.uuid().safeParse(vesselId).success ? await getVesselDetail(vesselId) : null;
  return { title: vessel ? `Edit ${vessel.name}` : "Vessel not found" };
}

export default function EditVesselPage({ params }: PageProps<"/vessels/[vesselId]/edit">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditVessel params={params} />
    </Suspense>
  );
}

async function EditVessel({ params }: Pick<PageProps<"/vessels/[vesselId]/edit">, "params">) {
  const { vesselId } = await params;
  if (!z.uuid().safeParse(vesselId).success) {
    notFound();
  }

  const [user, vessel] = await Promise.all([requireUser(), getVesselForEdit(vesselId)]);
  if (!vessel) {
    notFound();
  }

  const breadcrumbs = [
    { label: "Vessels", href: "/vessels" },
    { label: vessel.vesselName, href: `/vessels/${vesselId}` },
    { label: "Edit" },
  ];

  if (!can(user.role, "vessels:write")) {
    return (
      <>
        <PageHeader breadcrumbs={breadcrumbs} title={vessel.vesselName} />
        <ForbiddenState
          title="You can't edit vessels"
          description="Only fleet managers and administrators can change vessel details."
          backHref={`/vessels/${vesselId}`}
          backLabel="Back to vessel"
        />
      </>
    );
  }

  return (
    <>
      <PageHeader breadcrumbs={breadcrumbs} title={`Edit ${vessel.vesselName}`} />
      <VesselForm
        action={updateVesselAction.bind(null, vesselId)}
        defaultValues={vessel.values}
        submitLabel="Save changes"
        pendingLabel="Saving…"
        cancelHref={`/vessels/${vesselId}`}
      />
    </>
  );
}

function FormSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-8 w-72" />
      </div>
      <Skeleton className="h-96 max-w-2xl rounded-xl" />
    </>
  );
}
