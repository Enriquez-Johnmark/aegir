import { CircleAlertIcon, ClockAlertIcon, FlagIcon, InboxIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DUE_SOON_DAYS, type DashboardSummary as Summary } from "@/features/dashboard/domain";

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * One row of headline figures, each a jump to the panel that lists what it
 * counts (D-038). It summarises; the queues below are the dashboard's structure
 * (DESIGN.md: no hero-metric tiles). Figures stay in ink; signals ride on badges
 * with an icon and words (The Signal Rule, The Two-Channel Rule).
 *
 * The grid follows its own width (container queries in rem), so larger text
 * gets fewer, wider columns instead of clipped signals (WCAG 1.4.4).
 */
export function DashboardSummary({ summary }: { summary: Summary }) {
  const { fleet, inspections, workOrders, failedChecks, handovers } = summary;
  const inspectionsDue = inspections.overdue + inspections.dueSoon;

  return (
    <div className="@container">
      <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-foreground/10 ring-1 ring-foreground/10 @xs:grid-cols-2 @5xl:grid-cols-5">
        <Figure
          href="#vessels-attention"
          label="Active vessels"
          value={fleet.active}
          spoken={`of ${fleet.inService} in service${
            fleet.inMaintenance > 0 ? `, ${fleet.inMaintenance} in maintenance` : ""
          }`}
        >
          <Quiet>
            of {fleet.inService} in service
            {fleet.inMaintenance > 0 ? ` · ${fleet.inMaintenance} in maintenance` : null}
          </Quiet>
        </Figure>

        <Figure
          href="#inspections-due"
          label="Inspections due"
          value={inspectionsDue}
          spoken={[
            inspections.overdue > 0 ? `${inspections.overdue} overdue` : null,
            inspections.dueSoon > 0
              ? `${inspections.dueSoon} in the next ${DUE_SOON_DAYS} days`
              : `none due in the next ${DUE_SOON_DAYS} days`,
          ]
            .filter(Boolean)
            .join(", ")}
        >
          {inspections.overdue > 0 ? (
            <Badge variant="destructive">
              <ClockAlertIcon data-icon="inline-start" />
              {inspections.overdue} overdue
            </Badge>
          ) : null}
          <Quiet>
            {inspections.dueSoon > 0
              ? `${inspections.dueSoon} in the next ${DUE_SOON_DAYS} days`
              : `None due in the next ${DUE_SOON_DAYS} days`}
          </Quiet>
        </Figure>

        <Figure
          href="#work-queue"
          label="Open work orders"
          value={workOrders.open}
          spoken={
            workOrders.overdue + workOrders.blocked === 0
              ? "none overdue or blocked"
              : [
                  workOrders.overdue > 0 ? `${workOrders.overdue} overdue` : null,
                  workOrders.blocked > 0 ? `${workOrders.blocked} blocked` : null,
                ]
                  .filter(Boolean)
                  .join(", ")
          }
        >
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

        <Figure
          href="#failed-checks"
          label="Needs follow-up"
          value={failedChecks.needsFollowUp}
          spoken={
            failedChecks.needsFollowUp > 0
              ? `${plural(failedChecks.needsFollowUp, "failed check", "failed checks")} without a work order`
              : "every failed check has work raised"
          }
        >
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
          spoken={
            handovers.forMe > 0
              ? `${handovers.forMe} for you`
              : handovers.pending > 0
                ? "none waiting for you"
                : "all acknowledged"
          }
          className="@xs:@max-5xl:col-span-2"
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
    </div>
  );
}

function Figure({
  href,
  label,
  value,
  spoken,
  className,
  children,
}: {
  /** The panel on this page that lists what the figure counts. */
  href: `#${string}`;
  label: string;
  value: number;
  /** The signals as one sentence, so the link reads "Label: value, …" rather than a run of numbers. */
  spoken: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li className={className}>
      <a
        href={href}
        aria-label={`${label}: ${value}, ${spoken}`}
        className="flex h-full flex-col gap-1 bg-card p-4 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        <span className="flex flex-wrap items-center gap-1.5">{children}</span>
      </a>
    </li>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-muted-foreground">{children}</span>;
}
