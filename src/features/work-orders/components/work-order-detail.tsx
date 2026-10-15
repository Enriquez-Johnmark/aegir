import { ArrowRightLeftIcon, CirclePauseIcon, ClipboardCheckIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/shared/button-link";
import { SavedNotice } from "@/components/shared/saved-notice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordHistory, RecordHistorySkeleton } from "@/features/audit/components/record-history";
import { SeverityBadge } from "@/features/inspections/components/inspection-badges";
import {
  OverdueBadge,
  PriorityBadge,
  WorkOrderStatusBadge,
} from "@/features/work-orders/components/work-order-badges";
import { WorkOrderStatusActions } from "@/features/work-orders/components/work-order-status-actions";
import { canManage, canUpdateStatus } from "@/features/work-orders/domain";
import { getWorkOrderDetail, type WorkOrderDetail as Detail } from "@/features/work-orders/server/queries";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

const SAVED_MESSAGES = { created: "Work order raised", updated: "Changes saved" } as const;

export async function WorkOrderDetail({ workOrderId, saved }: { workOrderId: string; saved: string | null }) {
  const [user, workOrder] = await Promise.all([requireUser(), getWorkOrderDetail(workOrderId)]);
  if (!workOrder) {
    notFound();
  }

  const completed = workOrder.status === "completed";
  const mayMove = !completed && canUpdateStatus(user, { assigneeId: workOrder.assignee?.id ?? null });

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Work orders", href: "/work-orders" }, { label: workOrder.title }]}
        title={workOrder.title}
        badge={
          <span className="flex flex-wrap gap-1.5">
            <WorkOrderStatusBadge status={workOrder.status} />
            {workOrder.isOverdue ? <OverdueBadge /> : null}
          </span>
        }
        description={`${workOrder.vessel.name} · ${
          workOrder.completedAt
            ? `completed ${formatDate(workOrder.completedAt)}`
            : workOrder.dueDate
              ? `due ${formatDate(workOrder.dueDate)}`
              : "no due date"
        }`}
        actions={
          completed ? null : (
            <>
              {can(user.role, "handovers:create") ? (
                <ButtonLink variant="outline" href={`/handovers/new?workOrder=${workOrder.id}`}>
                  <ArrowRightLeftIcon data-icon="inline-start" />
                  Hand over
                </ButtonLink>
              ) : null}
              {canManage(user.role) ? (
                <ButtonLink variant="outline" href={`/work-orders/${workOrder.id}/edit`}>
                  <PencilIcon data-icon="inline-start" />
                  Edit details
                </ButtonLink>
              ) : null}
            </>
          )
        }
      />

      <SavedNotice message={saved === "created" || saved === "updated" ? SAVED_MESSAGES[saved] : null} />

      {workOrder.status === "blocked" && workOrder.blockedReason ? (
        <Alert className="*:[svg]:text-warning">
          <CirclePauseIcon />
          <AlertTitle>Blocked</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{workOrder.blockedReason}</AlertDescription>
        </Alert>
      ) : null}

      {mayMove && workOrder.status !== "completed" ? (
        <WorkOrderStatusActions workOrderId={workOrder.id} status={workOrder.status} />
      ) : null}
      {!completed && !mayMove ? (
        <p className="text-sm text-muted-foreground">
          {workOrder.assignee
            ? `Only ${workOrder.assignee.name}, fleet managers and administrators can change the status.`
            : "Unassigned. Fleet managers and administrators can change the status or assign it."}
        </p>
      ) : null}

      {/* By the record's own width (rem container queries), so enlarged text gets fewer columns, not overlaps. */}
      <div className="@container">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl p-4 ring-1 ring-foreground/10 @xs:grid-cols-2 @3xl:grid-cols-4">
          <Fact
            label="Vessel"
            value={
              <Link
                href={`/vessels/${workOrder.vessel.id}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {workOrder.vessel.name}
              </Link>
            }
          />
          <Fact label="Assignee" value={workOrder.assignee?.name ?? "Unassigned"} />
          <Fact label="Priority" value={<PriorityBadge priority={workOrder.priority} />} />
          <Fact
            label={completed ? "Completed" : "Due"}
            value={
              completed ? (
                formatDate(workOrder.completedAt)
              ) : workOrder.dueDate ? (
                <span className={workOrder.isOverdue ? "font-medium text-destructive" : undefined}>
                  {formatDate(workOrder.dueDate)}
                </span>
              ) : (
                "No due date"
              )
            }
          />
          {workOrder.description ? (
            <div className="flex flex-col gap-0.5 @xs:col-span-2 @3xl:col-span-4">
              <dt className="text-xs font-medium text-muted-foreground">Description</dt>
              <dd className="max-w-prose min-w-0 whitespace-pre-line wrap-break-word">{workOrder.description}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {workOrder.finding ? <FindingCard finding={workOrder.finding} /> : null}
        <Suspense fallback={<RecordHistorySkeleton />}>
          <RecordHistory table="work_orders" id={workOrder.id} />
        </Suspense>
      </div>
    </>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 tabular-nums wrap-break-word">{value}</dd>
    </div>
  );
}

function FindingCard({ finding }: { finding: NonNullable<Detail["finding"]> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Raised from a failed check</h2>
        </CardTitle>
        <CardDescription>
          {finding.inspection ? (
            <Link
              href={`/inspections/${finding.inspection.id}`}
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              <ClipboardCheckIcon className="size-3.5" aria-hidden />
              {finding.inspection.title}
            </Link>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="font-medium">{finding.description}</p>
        {finding.finding ? <p className="max-w-prose text-sm">{finding.finding}</p> : null}
        {finding.severity ? (
          <span>
            <SeverityBadge severity={finding.severity} />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
