import { ClipboardCheckIcon, PlusIcon, SearchXIcon, WrenchIcon } from "lucide-react";
import Link from "next/link";

import { ButtonLink } from "@/components/shared/button-link";
import { EMPTY_PANEL } from "@/components/shared/panel";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  OverdueBadge,
  PriorityBadge,
  WorkOrderStatusBadge,
} from "@/features/work-orders/components/work-order-badges";
import { PRIORITY_LABELS } from "@/features/work-orders/domain";
import type { WorkOrderListParams } from "@/features/work-orders/schemas";
import { listWorkOrders, type WorkOrderListItem } from "@/features/work-orders/server/queries";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

const VIEW_NOUNS = {
  open: ["open work order", "open work orders"],
  mine: ["work order assigned to you", "work orders assigned to you"],
  blocked: ["blocked work order", "blocked work orders"],
  completed: ["completed work order", "completed work orders"],
  all: ["work order", "work orders"],
} as const;

function dueLabel(workOrder: WorkOrderListItem) {
  if (workOrder.completedAt) return `Completed ${formatDate(workOrder.completedAt)}`;
  if (!workOrder.dueDate) return "No due date";
  return workOrder.isOverdue ? `Was due ${formatDate(workOrder.dueDate)}` : `Due ${formatDate(workOrder.dueDate)}`;
}

function StatusSignals({ workOrder }: { workOrder: WorkOrderListItem }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      <WorkOrderStatusBadge status={workOrder.status} />
      {workOrder.isOverdue ? <OverdueBadge /> : null}
    </span>
  );
}

function FromInspection() {
  return (
    <ClipboardCheckIcon
      className="inline size-3.5 shrink-0 text-muted-foreground"
      role="img"
      aria-label="Raised from a failed inspection check"
    />
  );
}

export async function WorkOrdersList({
  params,
  vesselName,
}: {
  params: WorkOrderListParams;
  vesselName: string | null;
}) {
  const [user, workOrders] = await Promise.all([requireUser(), listWorkOrders(params)]);
  const [singular, plural] = VIEW_NOUNS[params.view];

  if (workOrders.length === 0) {
    const filters = [vesselName, params.priority ? `${PRIORITY_LABELS[params.priority]} priority` : null].filter(
      Boolean,
    );
    const filtered = params.view !== "open" || filters.length > 0;
    return (
      <Empty className={EMPTY_PANEL}>
        <EmptyHeader>
          <EmptyMedia variant="icon">{filtered ? <SearchXIcon /> : <WrenchIcon />}</EmptyMedia>
          <EmptyTitle>
            No {plural}
            {filters.length > 0 ? ` · ${filters.join(" · ")}` : null}
          </EmptyTitle>
          <EmptyDescription>
            {params.view === "mine"
              ? "Nothing is assigned to you right now."
              : params.view === "open" && !filtered
                ? "No maintenance or corrective work is outstanding. Failed inspection checks can raise work orders."
                : "Try another view or clear the filters."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row flex-wrap justify-center">
          {can(user.role, "work-orders:create") && !filtered ? (
            <ButtonLink href="/work-orders/new">
              <PlusIcon data-icon="inline-start" />
              Raise a work order
            </ButtonLink>
          ) : null}
          {filtered ? (
            <ButtonLink variant="outline" href="/work-orders">
              Show open work orders
            </ButtonLink>
          ) : null}
        </EmptyContent>
      </Empty>
    );
  }

  const overdue = workOrders.filter((wo) => wo.isOverdue).length;
  const blocked = workOrders.filter((wo) => wo.status === "blocked").length;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {workOrders.length} {workOrders.length === 1 ? singular : plural}
        {overdue > 0 ? ` · ${overdue} overdue` : null}
        {blocked > 0 && params.view !== "blocked" ? ` · ${blocked} blocked` : null}
      </p>

      {/* Desktop: table. The title link stretches over its row, so the whole row is clickable. */}
      <div className="hidden overflow-hidden rounded-xl ring-1 ring-foreground/10 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Work order</TableHead>
              <TableHead>Vessel</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workOrders.map((wo) => (
              <TableRow key={wo.id} className="relative">
                <TableCell className="max-w-80 pl-4 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Link
                      href={`/work-orders/${wo.id}`}
                      className="truncate outline-none after:absolute after:inset-0 hover:underline focus-visible:underline focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                    >
                      {wo.title}
                    </Link>
                    {wo.fromInspection ? <FromInspection /> : null}
                  </span>
                </TableCell>
                <TableCell>{wo.vessel.name}</TableCell>
                <TableCell className={wo.assigneeName ? undefined : "text-muted-foreground"}>
                  {wo.assigneeName ?? "Unassigned"}
                </TableCell>
                <TableCell className={wo.isOverdue ? "font-medium text-destructive tabular-nums" : "tabular-nums"}>
                  {dueLabel(wo)}
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={wo.priority} />
                </TableCell>
                <TableCell className="pr-4">
                  <StatusSignals workOrder={wo} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked rows. */}
      <ul className="flex flex-col divide-y rounded-xl ring-1 ring-foreground/10 md:hidden">
        {workOrders.map((wo) => (
          <li key={wo.id}>
            <Link
              href={`/work-orders/${wo.id}`}
              className="flex flex-col gap-1.5 p-4 outline-none focus-visible:bg-muted active:bg-muted"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="font-medium">
                  {wo.title} {wo.fromInspection ? <FromInspection /> : null}
                </span>
                <PriorityBadge priority={wo.priority} />
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {wo.vessel.name} · {wo.assigneeName ?? "Unassigned"} ·{" "}
                <span className={wo.isOverdue ? "font-medium text-destructive" : undefined}>{dueLabel(wo)}</span>
              </span>
              <StatusSignals workOrder={wo} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
