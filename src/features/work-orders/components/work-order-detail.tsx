import { CirclePauseIcon, ClipboardCheckIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/shared/button-link";
import { SavedNotice } from "@/components/shared/saved-notice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge } from "@/features/inspections/components/inspection-badges";
import {
  OverdueBadge,
  PriorityBadge,
  WorkOrderStatusBadge,
} from "@/features/work-orders/components/work-order-badges";
import { WorkOrderStatusActions } from "@/features/work-orders/components/work-order-status-actions";
import {
  canManage,
  canUpdateStatus,
  WORK_ORDER_STATUS_LABELS,
} from "@/features/work-orders/domain";
import { getWorkOrderDetail, type WorkOrderDetail as Detail } from "@/features/work-orders/server/queries";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

const SAVED_MESSAGES = { created: "Work order raised", updated: "Changes saved" } as const;

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

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
          !completed && canManage(user.role) ? (
            <ButtonLink variant="outline" href={`/work-orders/${workOrder.id}/edit`}>
              <PencilIcon data-icon="inline-start" />
              Edit details
            </ButtonLink>
          ) : null
        }
      />

      <SavedNotice message={saved === "created" || saved === "updated" ? SAVED_MESSAGES[saved] : null} />

      {workOrder.status === "blocked" && workOrder.blockedReason ? (
        <Alert>
          <CirclePauseIcon className="text-warning" />
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

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl p-4 ring-1 ring-foreground/10 md:grid-cols-4">
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
          <div className="col-span-2 flex flex-col gap-0.5 md:col-span-4">
            <dt className="text-xs font-medium text-muted-foreground">Description</dt>
            <dd className="max-w-prose whitespace-pre-line">{workOrder.description}</dd>
          </div>
        ) : null}
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        {workOrder.finding ? <FindingCard finding={workOrder.finding} /> : null}
        <HistoryCard workOrder={workOrder} />
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

function FindingCard({ finding }: { finding: NonNullable<Detail["finding"]> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Raised from a failed check</CardTitle>
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

function HistoryCard({ workOrder }: { workOrder: Detail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>Every change is recorded by the database and can&apos;t be edited.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-3">
          {workOrder.history.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-0.5 text-sm">
              <span>
                {entry.kind === "created" ? (
                  "Raised"
                ) : entry.kind === "status" ? (
                  <>
                    {WORK_ORDER_STATUS_LABELS[entry.from]} → <span className="font-medium">{WORK_ORDER_STATUS_LABELS[entry.to]}</span>
                  </>
                ) : (
                  `Changed ${entry.fields.join(", ")}`
                )}
              </span>
              {entry.kind === "status" && entry.reason ? (
                <span className="max-w-prose text-muted-foreground">“{entry.reason}”</span>
              ) : null}
              <span className="text-xs text-muted-foreground tabular-nums">
                {entry.actorName ?? "System (seed data)"} · {dateTimeFormatter.format(new Date(entry.occurredAt))} UTC
              </span>
            </li>
          ))}
        </ol>
        {workOrder.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recorded changes yet.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
