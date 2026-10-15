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
        <h2 id="summary-title" className="sr-only">
          Fleet summary
        </h2>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="font-medium">{user.organization.name}</p>
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
        <FailedChecksPanel
          items={dashboard.failedChecks}
          total={dashboard.failedChecksTotal}
          canRaise={can(user.role, "work-orders:create")}
        />
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

/** Shaped like the dashboard: the figure cells, then the five queue panels. Announced to screen readers. */
export function DashboardSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        Loading the dashboard…
      </p>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-48" />
        <div className="@container">
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl @xs:grid-cols-2 @5xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-none last:@xs:@max-5xl:col-span-2" />
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-40 rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}
