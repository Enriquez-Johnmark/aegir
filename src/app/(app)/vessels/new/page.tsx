import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { ForbiddenState } from "@/components/shared/forbidden-state";
import { Skeleton } from "@/components/ui/skeleton";
import { createVesselAction } from "@/features/vessels/actions";
import { VesselForm } from "@/features/vessels/components/vessel-form";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Add vessel",
};

const BREADCRUMBS = [{ label: "Vessels", href: "/vessels" }, { label: "Add vessel" }];

export default function NewVesselPage() {
  return (
    <Suspense
      fallback={
        <>
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 max-w-2xl rounded-xl" />
        </>
      }
    >
      <NewVessel />
    </Suspense>
  );
}

async function NewVessel() {
  const user = await requireUser();
  if (!can(user.role, "vessels:write")) {
    return (
      <>
        <PageHeader breadcrumbs={BREADCRUMBS} title="Add vessel" />
        <ForbiddenState
          title="You can't add vessels"
          description="Only fleet managers and administrators can register vessels. You can still view the whole fleet."
          backHref="/vessels"
          backLabel="Back to vessels"
        />
      </>
    );
  }
  return (
    <>
      <PageHeader breadcrumbs={BREADCRUMBS} title="Add vessel" description="Register a vessel in your fleet." />
      <VesselForm
        action={createVesselAction}
        submitLabel="Add vessel"
        pendingLabel="Adding vessel…"
        cancelHref="/vessels"
      />
    </>
  );
}
