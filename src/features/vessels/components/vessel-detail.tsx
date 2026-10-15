import { CalendarPlusIcon, ClipboardCheckIcon, ClockAlertIcon, PencilIcon, WrenchIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/shared/button-link";
import { SavedNotice } from "@/components/shared/saved-notice";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InspectionStatusBadge } from "@/features/inspections/components/inspection-badges";
import { PriorityBadge, WorkOrderStatusBadge } from "@/features/work-orders/components/work-order-badges";
import { VesselStatusBadge } from "@/features/vessels/components/vessel-status-badge";
import { VESSEL_TYPE_LABELS } from "@/features/vessels/domain";
import { getVesselDetail, type VesselDetail as VesselDetailData } from "@/features/vessels/server/queries";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatNumber } from "@/lib/format";

const SAVED_MESSAGES = { created: "Vessel added", updated: "Changes saved" } as const;

export async function VesselDetail({ vesselId, saved }: { vesselId: string; saved: string | null }) {
  const [user, vessel] = await Promise.all([requireUser(), getVesselDetail(vesselId)]);
  if (!vessel) {
    notFound();
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Vessels", href: "/vessels" }, { label: vessel.name }]}
        title={vessel.name}
        badge={<VesselStatusBadge status={vessel.status} />}
        description={`${VESSEL_TYPE_LABELS[vessel.vesselType]} · ${vessel.flagState} flag`}
        actions={
          <>
            {can(user.role, "inspections:create") ? (
              <ButtonLink variant="outline" href={`/inspections/new?vessel=${vessel.id}`}>
                <CalendarPlusIcon data-icon="inline-start" />
                Schedule inspection
              </ButtonLink>
            ) : null}
            {can(user.role, "vessels:write") ? (
              <ButtonLink variant="outline" href={`/vessels/${vessel.id}/edit`}>
                <PencilIcon data-icon="inline-start" />
                Edit vessel
              </ButtonLink>
            ) : null}
          </>
        }
      />

      <SavedNotice message={saved === "created" || saved === "updated" ? SAVED_MESSAGES[saved] : null} />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl p-4 ring-1 ring-foreground/10 md:grid-cols-4">
        <Fact label="IMO number" value={<span className="font-mono">{vessel.imoNumber}</span>} />
        <Fact label="Year built" value={vessel.yearBuilt ?? "—"} />
        <Fact
          label="Gross tonnage"
          value={vessel.grossTonnage === null ? "—" : `${formatNumber(vessel.grossTonnage)} GT`}
        />
        <Fact label="Last updated" value={formatDate(vessel.updatedAt)} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkOrdersCard vesselId={vessel.id} workOrders={vessel.workOrders} />
        <InspectionsCard vesselId={vessel.id} inspections={vessel.inspections} />
      </div>
    </>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function WorkOrdersCard({ vesselId, workOrders }: { vesselId: string; workOrders: VesselDetailData["workOrders"] }) {
  const overdue = workOrders.filter((wo) => wo.isOverdue).length;
  const critical = workOrders.filter((wo) => wo.priority === "critical").length;
  const summary = [critical > 0 ? `${critical} critical` : null, overdue > 0 ? `${overdue} overdue` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Open work orders</h2>
        </CardTitle>
        <CardDescription className="tabular-nums">
          {workOrders.length === 0 ? "Nothing outstanding." : summary || "Nothing overdue or critical."}
        </CardDescription>
        <CardAction>
          <Link
            href={`/work-orders?vessel=${vesselId}&view=all`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            View all
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {workOrders.length === 0 ? (
          <QuietEmpty icon={<WrenchIcon />} title="No open work" description="Completed work stays in the vessel's history." />
        ) : (
          <ul className="flex flex-col divide-y">
            {workOrders.map((wo) => (
              <li key={wo.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/work-orders/${wo.id}`}
                    className="font-medium underline-offset-4 hover:underline focus-visible:underline"
                  >
                    {wo.title}
                  </Link>
                  <span className="flex gap-1.5">
                    <PriorityBadge priority={wo.priority} />
                    <WorkOrderStatusBadge status={wo.status} />
                  </span>
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {wo.assigneeName ?? "Unassigned"} ·{" "}
                  {wo.dueDate ? (
                    wo.isOverdue ? (
                      <span className="inline-flex items-center gap-1 font-medium text-destructive">
                        <ClockAlertIcon className="size-3.5" aria-hidden />
                        Overdue since {formatDate(wo.dueDate)}
                      </span>
                    ) : (
                      `Due ${formatDate(wo.dueDate)}`
                    )
                  ) : (
                    "No due date"
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function InspectionsCard({ vesselId, inspections }: { vesselId: string; inspections: VesselDetailData["inspections"] }) {
  const overdue = inspections.filter((inspection) => inspection.isOverdue).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Inspections</h2>
        </CardTitle>
        <CardDescription className="tabular-nums">
          {inspections.length === 0
            ? "None scheduled or recorded."
            : overdue > 0
              ? `${overdue} overdue`
              : "Nothing overdue."}
        </CardDescription>
        {inspections.length > 0 ? (
          <CardAction>
            <Link
              href={`/inspections?vessel=${vesselId}&view=all`}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {inspections.length === 0 ? (
          <QuietEmpty
            icon={<ClipboardCheckIcon />}
            title="No inspections yet"
            description="Scheduled and completed inspections for this vessel will appear here."
          />
        ) : (
          <ul className="flex flex-col divide-y">
            {inspections.map((inspection) => (
              <li key={inspection.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/inspections/${inspection.id}`}
                    className="font-medium underline-offset-4 hover:underline focus-visible:underline"
                  >
                    {inspection.title}
                  </Link>
                  <InspectionStatusBadge status={inspection.status} isOverdue={inspection.isOverdue} />
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {inspection.inspectorName ?? "No inspector assigned"} ·{" "}
                  {inspection.completedAt
                    ? `Completed ${formatDate(inspection.completedAt)}`
                    : `Scheduled ${formatDate(inspection.scheduledFor)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function QuietEmpty({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Empty className="flex-none p-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
