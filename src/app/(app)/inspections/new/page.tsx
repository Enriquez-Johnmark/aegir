import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { ForbiddenState } from "@/components/shared/forbidden-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ScheduleInspectionForm } from "@/features/inspections/components/schedule-inspection-form";
import { getScheduleFormOptions } from "@/features/inspections/server/queries";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { todayIsoDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Schedule inspection",
};

const BREADCRUMBS = [{ label: "Inspections", href: "/inspections" }, { label: "Schedule inspection" }];

export default function NewInspectionPage({ searchParams }: PageProps<"/inspections/new">) {
  return (
    <Suspense
      fallback={
        <>
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[32rem] max-w-3xl rounded-xl" />
        </>
      }
    >
      <NewInspection searchParams={searchParams} />
    </Suspense>
  );
}

async function NewInspection({ searchParams }: Pick<PageProps<"/inspections/new">, "searchParams">) {
  const [user, { vessel }] = await Promise.all([requireUser(), searchParams]);
  if (!can(user.role, "inspections:create")) {
    return (
      <>
        <PageHeader breadcrumbs={BREADCRUMBS} title="Schedule inspection" />
        <ForbiddenState
          title="You can't schedule inspections"
          description="Only safety inspectors, fleet managers and administrators can schedule inspections. You can still follow every inspection's progress."
          backHref="/inspections"
          backLabel="Back to inspections"
        />
      </>
    );
  }

  const options = await getScheduleFormOptions();
  // ?vessel= preselects a vessel (from the vessel page); ignore anything that isn't one of ours.
  const vesselId = typeof vessel === "string" && z.uuid().safeParse(vessel).success ? vessel : null;
  const defaultVessel = options.vessels.find((v) => v.id === vesselId) ?? null;

  return (
    <>
      <PageHeader
        breadcrumbs={BREADCRUMBS}
        title="Schedule inspection"
        description="Choose the vessel, date and inspector, then build the checklist."
      />
      <ScheduleInspectionForm
        options={options}
        defaultVesselId={defaultVessel?.id ?? null}
        // An inspector usually schedules their own work; managers assign deliberately.
        defaultInspectorId={user.role === "inspector" ? user.id : null}
        today={todayIsoDate()}
        cancelHref={defaultVessel ? `/vessels/${defaultVessel.id}` : "/inspections"}
      />
    </>
  );
}
