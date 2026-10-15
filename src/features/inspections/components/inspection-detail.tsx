import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { SavedNotice } from "@/components/shared/saved-notice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChecklistItem } from "@/features/inspections/components/checklist-item";
import { FindingSignals, InspectionStatusBadge } from "@/features/inspections/components/inspection-badges";
import { InspectionActions } from "@/features/inspections/components/inspection-actions";
import { canConduct, isClosed, type ChecklistSummary } from "@/features/inspections/domain";
import { getInspectionDetail } from "@/features/inspections/server/queries";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

const SAVED_MESSAGES = { scheduled: "Inspection scheduled" } as const;

export async function InspectionDetail({ inspectionId, saved }: { inspectionId: string; saved: string | null }) {
  const [user, inspection] = await Promise.all([requireUser(), getInspectionDetail(inspectionId)]);
  if (!inspection) {
    notFound();
  }

  const conductor = canConduct(user, { inspectorId: inspection.inspector?.id ?? null });
  const open = !isClosed(inspection.status);
  // Results can be recorded once the inspection is started, until it is closed.
  const editable = conductor && inspection.status === "in_progress";

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

      <SavedNotice message={saved === "scheduled" ? SAVED_MESSAGES[saved] : null} />

      {open && conductor && (inspection.status === "scheduled" || inspection.status === "in_progress") ? (
        <InspectionActions
          inspectionId={inspection.id}
          status={inspection.status}
          pendingChecks={inspection.checklist.pending}
        />
      ) : null}
      {open && !conductor ? (
        <p className="text-sm text-muted-foreground">
          {inspection.inspector
            ? `Only ${inspection.inspector.name}, fleet managers and administrators can record results.`
            : "No inspector is assigned yet. Fleet managers and administrators can record results."}
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl p-4 ring-1 ring-foreground/10 md:grid-cols-4">
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
        {inspection.status === "cancelled" ? (
          <Fact label="Outcome" value="Cancelled before completion" />
        ) : (
          <Fact label="Completed" value={inspection.completedAt ? formatDate(inspection.completedAt) : "Not yet"} />
        )}
        {inspection.notes ? (
          <div className="col-span-2 flex flex-col gap-0.5 md:col-span-4">
            <dt className="text-xs font-medium text-muted-foreground">Notes</dt>
            <dd className="max-w-prose whitespace-pre-line">{inspection.notes}</dd>
          </div>
        ) : null}
      </dl>

      <Card>
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <ChecklistSummaryText checklist={inspection.checklist} />
            <FindingSignals checklist={inspection.checklist} />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col divide-y">
            {inspection.items.map((item) => (
              <ChecklistItem key={item.id} inspectionId={inspection.id} item={item} editable={editable} />
            ))}
          </ol>
        </CardContent>
      </Card>

      {inspection.createdByName ? (
        <p className="text-xs text-muted-foreground">Scheduled by {inspection.createdByName}.</p>
      ) : null}
    </>
  );
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
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
