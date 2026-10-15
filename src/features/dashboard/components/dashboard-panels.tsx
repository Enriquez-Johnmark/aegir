import { cn } from "cn";
import { FlagIcon, InboxIcon, WrenchIcon } from "lucide-react";
import Link from "next/link";

import { ButtonLink } from "@/components/shared/button-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DUE_SOON_DAYS,
  RECENT_FAILURE_DAYS,
  type DashboardFailedCheck,
  type DashboardHandover,
  type DashboardInspection,
  type DashboardVessel,
  type DashboardWorkOrder,
} from "@/features/dashboard/domain";
import { InspectionStatusBadge, SeverityBadge } from "@/features/inspections/components/inspection-badges";
import { AttentionSignals } from "@/features/vessels/components/attention-signals";
import {
  OverdueBadge,
  PriorityBadge,
  WorkOrderStatusBadge,
} from "@/features/work-orders/components/work-order-badges";
import { WORK_ORDER_STATUS_LABELS } from "@/features/work-orders/domain";
import { formatDate } from "@/lib/format";

// ---------------------------------------------------------------------------
// Panel shell and rows
// ---------------------------------------------------------------------------

function Panel({
  id,
  title,
  description,
  action,
  className,
  children,
}: {
  id: string;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      id={id}
      role="region"
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      className={cn("scroll-mt-4 pb-0 outline-none", className)}
    >
      <CardHeader>
        <CardTitle>
          <h2 id={`${id}-title`}>{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        {action ? <CardAction className="flex flex-wrap justify-end gap-1">{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="px-0">{children}</CardContent>
    </Card>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  return <ul className="flex flex-col divide-y border-t">{children}</ul>;
}

/** A queue row. With `href`, the title link stretches over the whole row (as in the lists). */
function Row({
  href,
  title,
  aside,
  meta,
  children,
}: {
  href?: string;
  title: string;
  aside?: React.ReactNode;
  meta: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="relative flex flex-col gap-1.5 px-4 py-3 has-[a[data-row-link]:hover]:bg-muted/50">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        {href ? (
          <Link
            data-row-link
            href={href}
            className="min-w-0 flex-[1_1_12rem] font-medium outline-none after:absolute after:inset-0 hover:underline focus-visible:underline focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
          >
            {title}
          </Link>
        ) : (
          <span className="min-w-0 flex-[1_1_12rem] font-medium">{title}</span>
        )}
        {aside ? <span className="max-w-full">{aside}</span> : null}
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">{meta}</p>
      {children ? <div className="flex flex-wrap items-center gap-1.5">{children}</div> : null}
    </li>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="border-t px-4 py-3 text-sm text-muted-foreground">{children}</p>;
}

function ViewAll({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <ButtonLink variant="ghost" size="sm" href={href} className="tabular-nums">
      {children}
    </ButtonLink>
  );
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

export function WorkQueuePanel({
  items,
  total,
  assignedToMe,
}: {
  items: DashboardWorkOrder[];
  total: number;
  assignedToMe: number;
}) {
  return (
    <Panel
      id="work-queue"
      title="Work queue"
      description="Most urgent first: overdue critical and high work, then critical, then anything else overdue."
      action={
        total > 0 ? (
          <>
            {assignedToMe > 0 ? (
              <ViewAll href="/work-orders?view=mine">{assignedToMe} assigned to you</ViewAll>
            ) : null}
            <ViewAll href="/work-orders">All {total} open</ViewAll>
          </>
        ) : null
      }
    >
      {items.length === 0 ? (
        <Quiet>No open work orders.</Quiet>
      ) : (
        <Rows>
          {items.map((wo) => (
            <Row
              key={wo.id}
              href={`/work-orders/${wo.id}`}
              title={wo.title}
              aside={<PriorityBadge priority={wo.priority} />}
              meta={
                <>
                  {wo.vesselName} · {wo.isMine ? "You" : (wo.assigneeName ?? "Unassigned")} ·{" "}
                  <span className={wo.isOverdue ? "font-medium text-destructive" : undefined}>
                    {wo.dueDate === null
                      ? "No due date"
                      : `${wo.isOverdue ? "Was due" : "Due"} ${formatDate(wo.dueDate)}`}
                  </span>
                </>
              }
            >
              <WorkOrderStatusBadge status={wo.status} />
              {wo.isOverdue ? <OverdueBadge /> : null}
            </Row>
          ))}
        </Rows>
      )}
    </Panel>
  );
}

export function InspectionsDuePanel({ items, total }: { items: DashboardInspection[]; total: number }) {
  return (
    <Panel
      id="inspections-due"
      title="Inspections due"
      description={`Overdue and due in the next ${DUE_SOON_DAYS} days, earliest first.`}
      action={<ViewAll href="/inspections">All open</ViewAll>}
    >
      {items.length === 0 ? (
        <Quiet>Nothing overdue or due in the next {DUE_SOON_DAYS} days.</Quiet>
      ) : (
        <>
          <Rows>
            {items.map((inspection) => (
              <Row
                key={inspection.id}
                href={`/inspections/${inspection.id}`}
                title={inspection.title}
                aside={<InspectionStatusBadge status={inspection.status} isOverdue={inspection.isOverdue} />}
                meta={
                  <>
                    {inspection.vesselName} · {inspection.inspectorName ?? "No inspector assigned"} ·{" "}
                    <span className={inspection.isOverdue ? "font-medium text-destructive" : undefined}>
                      {inspection.isOverdue ? "Was due" : "Due"} {formatDate(inspection.scheduledFor)}
                    </span>
                  </>
                }
              />
            ))}
          </Rows>
          <MoreNotShown shown={items.length} total={total} />
        </>
      )}
    </Panel>
  );
}

export function FailedChecksPanel({
  items,
  total,
  canRaise,
}: {
  items: DashboardFailedCheck[];
  total: number;
  canRaise: boolean;
}) {
  return (
    <Panel
      id="failed-checks"
      title="Failed checks"
      description={`Unaddressed checks stay until work is raised; the rest for ${RECENT_FAILURE_DAYS} days.`}
    >
      {items.length === 0 ? (
        <Quiet>No failed checks in the last {RECENT_FAILURE_DAYS} days.</Quiet>
      ) : (
        <Rows>
          {items.map((check) => (
            <Row
              key={check.id}
              href={`/inspections/${check.inspectionId}`}
              title={check.description}
              aside={check.severity ? <SeverityBadge severity={check.severity} /> : null}
              meta={
                <>
                  {check.vesselName} · {check.inspectionTitle} · Recorded {formatDate(check.recordedAt)}
                </>
              }
            >
              {check.needsFollowUp ? (
                <>
                  <Badge variant="warning">
                    <FlagIcon data-icon="inline-start" />
                    Needs follow-up
                  </Badge>
                  {canRaise ? (
                    // Lifted above the stretched row link so it stays clickable.
                    <ButtonLink
                      variant="outline"
                      size="sm"
                      href={`/work-orders/new?item=${check.id}`}
                      className="relative"
                    >
                      <WrenchIcon data-icon="inline-start" />
                      Raise work order
                    </ButtonLink>
                  ) : null}
                </>
              ) : check.workOrder ? (
                <>
                  {/* A real button-sized target (44px on touch), lifted above the row's inspection link. */}
                  <ButtonLink
                    variant="ghost"
                    size="sm"
                    href={`/work-orders/${check.workOrder.id}`}
                    aria-label={`View work order (${WORK_ORDER_STATUS_LABELS[check.workOrder.status]})`}
                    className="relative"
                  >
                    <WrenchIcon data-icon="inline-start" />
                    View work order
                  </ButtonLink>
                  <WorkOrderStatusBadge status={check.workOrder.status} />
                </>
              ) : null}
            </Row>
          ))}
        </Rows>
      )}
      {items.length > 0 ? <MoreNotShown shown={items.length} total={total} /> : null}
    </Panel>
  );
}

export function VesselsPanel({ items, total }: { items: DashboardVessel[]; total: number }) {
  return (
    <Panel
      id="vessels-attention"
      title="Vessels needing attention"
      description="Critical or overdue work, or an overdue inspection."
      action={<ViewAll href="/vessels">Watch list</ViewAll>}
    >
      {items.length === 0 ? (
        <Quiet>No vessel has critical or overdue work.</Quiet>
      ) : (
        <>
          <Rows>
            {items.map((vessel) => (
              <Row
                key={vessel.id}
                href={`/vessels/${vessel.id}`}
                title={vessel.name}
                meta={vesselMeta(vessel)}
              >
                <AttentionSignals attention={vessel} />
              </Row>
            ))}
          </Rows>
          <MoreNotShown shown={items.length} total={total} />
        </>
      )}
    </Panel>
  );
}

function vesselMeta(vessel: DashboardVessel): string {
  const parts = [
    vessel.openWorkOrders > 0
      ? `${vessel.openWorkOrders} open ${vessel.openWorkOrders === 1 ? "work order" : "work orders"}`
      : "No open work orders",
    vessel.overdueInspections > 0
      ? `${vessel.overdueInspections} overdue ${vessel.overdueInspections === 1 ? "inspection" : "inspections"}`
      : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

export function HandoversPanel({
  items,
  total,
  className,
}: {
  items: DashboardHandover[];
  total: number;
  className?: string;
}) {
  return (
    <Panel
      id="handovers"
      title="Pending handovers"
      description="Waiting to be acknowledged. Yours first, then the longest-waiting."
      className={className}
    >
      {items.length === 0 ? (
        <Quiet>Every handover has been acknowledged.</Quiet>
      ) : (
        <>
          <Rows>
            {items.map((handover) => (
              <Row
                key={handover.id}
                title={handover.summary}
                aside={
                  handover.isForMe ? (
                    <Badge variant="info">
                      <InboxIcon data-icon="inline-start" />
                      For you
                    </Badge>
                  ) : null
                }
                meta={
                  <>
                    From {handover.fromName ?? "a former member"} to{" "}
                    {handover.isForMe ? "you" : (handover.toName ?? "a former member")}
                    {handover.vesselName ? ` · ${handover.vesselName}` : null} · Handed over{" "}
                    {formatDate(handover.createdAt)}
                  </>
                }
              />
            ))}
          </Rows>
          <MoreNotShown shown={items.length} total={total} />
        </>
      )}
    </Panel>
  );
}

function MoreNotShown({ shown, total }: { shown: number; total: number }) {
  if (total <= shown) {
    return null;
  }
  return (
    <p className="border-t px-4 py-3 text-sm text-muted-foreground tabular-nums">
      {total - shown} more not shown
    </p>
  );
}
