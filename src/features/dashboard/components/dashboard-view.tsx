import { Skeleton } from "@/components/ui/skeleton";
import {
  FailedChecksPanel,
  HandoversPanel,
  InspectionsDuePanel,
  VesselsPanel,
  WorkQueuePanel,
} from "@/features/dashboard/components/dashboard-panels";
import { DashboardSummary } from "@/features/dashboard/components/dashboard-summary";
import { getDashboard } from "@/features/dashboard/server/queries";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

/** The live dashboard: headline figures, then the queues that need someone. */
export async function DashboardView() {
  const [user, dashboard] = await Promise.all([requireUser(), getDashboard()]);
  const { summary } = dashboard;

  return (
    <>
      <section aria-labelledby="summary-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="summary-title" className="font-medium">
            {user.organization.name}
          </h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            Live figures for {formatDate(dashboard.today)} (UTC)
          </p>
        </div>
        <DashboardSummary summary={summary} />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <WorkQueuePanel
          items={dashboard.workQueue}
          total={summary.workOrders.open}
          assignedToMe={summary.workOrders.assignedToMe}
        />
        <InspectionsDuePanel items={dashboard.inspectionsDue} total={dashboard.inspectionsDueTotal} />
        <FailedChecksPanel items={dashboard.failedChecks} canRaise={can(user.role, "work-orders:create")} />
        <VesselsPanel items={dashboard.vesselsNeedingAttention} total={dashboard.vesselsNeedingAttentionTotal} />
        <HandoversPanel
          items={dashboard.handovers}
          total={summary.handovers.pending}
          className="lg:col-span-2"
        />
      </div>
    </>
  );
}

/** Shaped like the dashboard: the figure row, then two columns of queue panels. */
export function DashboardSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-36 rounded-xl lg:h-28" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </>
  );
}
