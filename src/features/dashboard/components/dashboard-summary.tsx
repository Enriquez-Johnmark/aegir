import { CircleAlertIcon, ClockAlertIcon, FlagIcon, InboxIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DUE_SOON_DAYS, type DashboardSummary as Summary } from "@/features/dashboard/domain";

/**
 * One row of headline figures, each a link to the screen that explains it. It
 * summarises; the queues below are the dashboard's structure (DESIGN.md: no
 * hero-metric tiles). Figures stay in ink; signals ride on badges with an icon
 * and words (The Signal Rule, The Two-Channel Rule).
 */
export function DashboardSummary({ summary }: { summary: Summary }) {
  const { fleet, inspections, workOrders, failedChecks, handovers } = summary;

  return (
    <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-foreground/10 ring-1 ring-foreground/10 lg:grid-cols-5">
      <Figure href="/vessels" label="Active vessels" value={fleet.active}>
        <Quiet>
          of {fleet.inService} in service
          {fleet.inMaintenance > 0 ? ` · ${fleet.inMaintenance} in maintenance` : null}
        </Quiet>
      </Figure>

      <Figure href="/inspections" label="Inspections due" value={inspections.overdue + inspections.dueSoon}>
        {inspections.overdue > 0 ? (
          <Badge variant="destructive">
            <ClockAlertIcon data-icon="inline-start" />
            {inspections.overdue} overdue
          </Badge>
        ) : null}
        <Quiet>
          {inspections.dueSoon > 0 ? `${inspections.dueSoon} in the next ${DUE_SOON_DAYS} days` : `None due in the next ${DUE_SOON_DAYS} days`}
        </Quiet>
      </Figure>

      <Figure href="/work-orders" label="Open work orders" value={workOrders.open}>
        {workOrders.overdue > 0 ? (
          <Badge variant="destructive">
            <ClockAlertIcon data-icon="inline-start" />
            {workOrders.overdue} overdue
          </Badge>
        ) : null}
        {workOrders.blocked > 0 ? (
          <Badge variant="warning">
            <CircleAlertIcon data-icon="inline-start" />
            {workOrders.blocked} blocked
          </Badge>
        ) : null}
        {workOrders.overdue + workOrders.blocked === 0 ? <Quiet>None overdue or blocked</Quiet> : null}
      </Figure>

      <Figure href="#failed-checks" label="Needs follow-up" value={failedChecks.needsFollowUp}>
        {failedChecks.needsFollowUp > 0 ? (
          <Badge variant="warning">
            <FlagIcon data-icon="inline-start" />
            {failedChecks.needsFollowUp === 1 ? "Failed check" : "Failed checks"} without work
          </Badge>
        ) : (
          <Quiet>Every failed check has work raised</Quiet>
        )}
      </Figure>

      <Figure
        href="#handovers"
        label="Pending handovers"
        value={handovers.pending}
        className="col-span-2 lg:col-span-1"
      >
        {handovers.forMe > 0 ? (
          <Badge variant="info">
            <InboxIcon data-icon="inline-start" />
            {handovers.forMe} for you
          </Badge>
        ) : (
          <Quiet>{handovers.pending > 0 ? "None waiting for you" : "All acknowledged"}</Quiet>
        )}
      </Figure>
    </ul>
  );
}

function Figure({
  href,
  label,
  value,
  className,
  children,
}: {
  href: string;
  label: string;
  value: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li className={className}>
      <Link
        href={href}
        className="flex h-full flex-col gap-1 bg-card p-4 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        <span className="flex flex-wrap items-center gap-1.5">{children}</span>
      </Link>
    </li>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-muted-foreground">{children}</span>;
}
