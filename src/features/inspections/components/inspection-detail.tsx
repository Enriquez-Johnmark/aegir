import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { SavedNotice } from "@/components/shared/saved-notice";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChecklistEditingProvider, CompleteHint } from "@/features/inspections/components/checklist-editing";
import { ChecklistItem } from "@/features/inspections/components/checklist-item";
import { CompleteInspection } from "@/features/inspections/components/complete-inspection";
import { FindingSignals, InspectionStatusBadge } from "@/features/inspections/components/inspection-badges";
import { InspectionActions } from "@/features/inspections/components/inspection-actions";
import { canConduct, isClosed, type ChecklistSummary } from "@/features/inspections/domain";
import { getInspectionDetail } from "@/features/inspections/server/queries";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";


export async function InspectionDetail({
  inspectionId,
  saved,
  raisedWorkOrderId,
}: {
  inspectionId: string;
  saved: string | null;
  raisedWorkOrderId: string | null;
}) {
  const [user, inspection] = await Promise.all([requireUser(), getInspectionDetail(inspectionId)]);
  if (!inspection) {
    notFound();
  }

  const conductor = canConduct(user, { inspectorId: inspection.inspector?.id ?? null });
  const open = !isClosed(inspection.status);
  // Results can be recorded once the inspection is started, until it is closed.
  const editable = conductor && inspection.status === "in_progress";
  const canRaiseWorkOrder = can(user.role, "work-orders:create");
  const unaddressed = inspection.items.flatMap((item) =>
    item.result === "fail" && item.workOrders.length === 0
      ? [{ id: item.id, position: item.position, description: item.description }]
      : [],
  );

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inspections", href: "/inspections" }, { label: inspection.title }]}
        title={inspection.title}
        badge={<InspectionStatusBadge status={inspection.status} isOverdue={inspection.isOverdue} />}
        description={`${inspection.vessel.name} · ${
          inspection.completedAt
            ? `completed ${formatDate(inspection.completedAt)}`
            : `scheduled for ${formatDate(inspection.scheduledFor)}`
        }`}
      />

      {saved === "raised" ? (
        <SavedNotice
          message="Work order raised"
          description="The failed check below now links to it."
          link={raisedWorkOrderId ? { href: `/work-orders/${raisedWorkOrderId}`, label: "View work order" } : undefined}
        />
      ) : (
        <SavedNotice message={savedMessage(saved, unaddressed.length)} />
      )}

      <ChecklistEditingProvider>
        {open && conductor && (inspection.status === "scheduled" || inspection.status === "in_progress") ? (
          <InspectionActions
            inspectionId={inspection.id}
            status={inspection.status}
            checklist={inspection.checklist}
            unaddressed={unaddressed}
            canRaiseWorkOrder={canRaiseWorkOrder}
          />
        ) : null}
        {open && !conductor ? (
          <p className="text-sm text-muted-foreground">
            {inspection.inspector
              ? `Only ${inspection.inspector.name}, fleet managers and administrators can record results.`
              : "No inspector is assigned yet. Fleet managers and administrators can record results."}
          </p>
        ) : null}

        {/* By the record's own width (rem container queries), so enlarged text gets fewer columns, not overlaps. */}
        <div className="@container">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl p-4 ring-1 ring-foreground/10 @xs:grid-cols-2 @3xl:grid-cols-4">
            <Fact
              label="Vessel"
              value={
                <Link href={`/vessels/${inspection.vessel.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                  {inspection.vessel.name}
                </Link>
              }
            />
            <Fact label="Inspector" value={inspection.inspector?.name ?? "Unassigned"} />
            <Fact label="Scheduled for" value={formatDate(inspection.scheduledFor)} />
            {inspection.status === "cancelled" ? <Fact label="Outcome" value="Cancelled before completion" /> : null}
            {inspection.completedAt ? <Fact label="Completed" value={formatDate(inspection.completedAt)} /> : null}
            {inspection.notes ? (
              <div className="flex flex-col gap-0.5 @xs:col-span-2 @3xl:col-span-4">
                <dt className="text-xs font-medium text-muted-foreground">Notes</dt>
                <dd className="max-w-prose min-w-0 whitespace-pre-line wrap-break-word">{inspection.notes}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Checklist</h2>
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <ChecklistSummaryText checklist={inspection.checklist} />
              <FindingSignals checklist={inspection.checklist} />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col divide-y">
              {inspection.items.map((item) => (
                <ChecklistItem
                  key={item.id}
                  inspectionId={inspection.id}
                  item={item}
                  editable={editable}
                  canRaiseWorkOrder={canRaiseWorkOrder}
                />
              ))}
            </ol>
          </CardContent>
          {editable ? (
            // The end of the checklist is where the last result is recorded, so completion is offered here too.
            <CardFooter className="flex-wrap gap-x-3 gap-y-2">
              <CompleteInspection
                inspectionId={inspection.id}
                checklist={inspection.checklist}
                unaddressed={unaddressed}
                canRaiseWorkOrder={canRaiseWorkOrder}
                hintId="complete-hint-end"
              />
              <CompleteHint id="complete-hint-end" pending={inspection.checklist.pending} ready="Every check is recorded." />
            </CardFooter>
          ) : null}
        </Card>
      </ChecklistEditingProvider>

      {inspection.createdByName ? (
        <p className="text-xs text-muted-foreground">Scheduled by {inspection.createdByName}.</p>
      ) : null}
    </>
  );
}

function savedMessage(saved: string | null, unaddressed: number): string | null {
  if (saved === "scheduled") {
    return "Inspection scheduled";
  }
  if (saved === "completed") {
    return unaddressed === 0
      ? "Inspection completed"
      : `Inspection completed · ${unaddressed} failed ${unaddressed === 1 ? "check needs" : "checks need"} a work order`;
  }
  return null;
}

function ChecklistSummaryText({ checklist }: { checklist: ChecklistSummary }) {
  if (checklist.pending === checklist.total) {
    return <span className="tabular-nums">{checklist.total} checks, none recorded yet.</span>;
  }
  const parts = [
    `${checklist.checked} of ${checklist.total} checked`,
    checklist.passed > 0 ? `${checklist.passed} passed` : null,
    checklist.notApplicable > 0 ? `${checklist.notApplicable} N/A` : null,
  ].filter(Boolean);
  return <span className="tabular-nums">{parts.join(" · ")}</span>;
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 tabular-nums wrap-break-word">{value}</dd>
    </div>
  );
}
