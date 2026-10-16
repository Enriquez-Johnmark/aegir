import { CalendarPlusIcon, ClipboardCheckIcon, SearchXIcon } from "lucide-react";
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
  ChecklistProgress,
  FindingSignals,
  InspectionStatusBadge,
} from "@/features/inspections/components/inspection-badges";
import type { InspectionListParams } from "@/features/inspections/schemas";
import { listInspections, type InspectionListItem } from "@/features/inspections/server/queries";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

const VIEW_NOUNS = {
  open: "open inspections",
  completed: "completed inspections",
  cancelled: "cancelled inspections",
  all: "inspections",
} as const;

function dateLabel(inspection: InspectionListItem) {
  if (inspection.completedAt) {
    return `Completed ${formatDate(inspection.completedAt)}`;
  }
  return inspection.isOverdue
    ? `Due ${formatDate(inspection.scheduledFor)}`
    : `Scheduled ${formatDate(inspection.scheduledFor)}`;
}

export async function InspectionsList({
  params,
  vesselName,
}: {
  params: InspectionListParams;
  vesselName: string | null;
}) {
  const [user, inspections] = await Promise.all([requireUser(), listInspections(params)]);
  const noun = VIEW_NOUNS[params.view];
  const scheduleHref = params.vessel ? `/inspections/new?vessel=${params.vessel}` : "/inspections/new";

  if (inspections.length === 0) {
    const filtered = params.view !== "open" || vesselName !== null;
    return (
      <Empty className={EMPTY_PANEL}>
        <EmptyHeader>
          <EmptyMedia variant="icon">{filtered ? <SearchXIcon /> : <ClipboardCheckIcon />}</EmptyMedia>
          <EmptyTitle>
            {vesselName ? `No ${noun} for ${vesselName}` : `No ${noun}`}
          </EmptyTitle>
          <EmptyDescription>
            {params.view === "open"
              ? "Nothing is waiting to be inspected. Scheduled inspections appear here, oldest first."
              : "Try another view or vessel."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row flex-wrap justify-center">
          {can(user.role, "inspections:create") && params.view === "open" ? (
            <ButtonLink href={scheduleHref}>
              <CalendarPlusIcon data-icon="inline-start" />
              Schedule an inspection
            </ButtonLink>
          ) : null}
          {filtered ? (
            <ButtonLink variant="outline" href="/inspections">
              Show open inspections
            </ButtonLink>
          ) : null}
        </EmptyContent>
      </Empty>
    );
  }

  const overdue = inspections.filter((inspection) => inspection.isOverdue).length;

  return (
    <div className="@container flex flex-col gap-2">
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {inspections.length} {inspections.length === 1 ? noun.replace(/s$/, "") : noun}
        {overdue > 0 ? ` · ${overdue} overdue` : null}
      </p>

      {/* Wide (by the list's own width, so large text gets stacked rows): table. The title link stretches over its row, so the whole row is clickable. */}
      <div className="hidden overflow-hidden rounded-xl ring-1 ring-foreground/10 @4xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Inspection</TableHead>
              <TableHead>Vessel</TableHead>
              <TableHead>Inspector</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Progress</TableHead>
              <TableHead className="pr-4">Findings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inspections.map((inspection) => (
              <TableRow key={inspection.id} className="relative">
                <TableCell className="max-w-72 pl-4 font-medium">
                  <Link
                    href={`/inspections/${inspection.id}`}
                    className="block outline-none after:absolute after:inset-0 hover:underline focus-visible:underline focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                  >
                    {inspection.title}
                  </Link>
                </TableCell>
                <TableCell>{inspection.vessel.name}</TableCell>
                <TableCell className={inspection.inspectorName ? undefined : "text-muted-foreground"}>
                  {inspection.inspectorName ?? "Unassigned"}
                </TableCell>
                <TableCell className="tabular-nums">{dateLabel(inspection)}</TableCell>
                <TableCell>
                  <InspectionStatusBadge status={inspection.status} isOverdue={inspection.isOverdue} />
                </TableCell>
                <TableCell className="text-right">
                  <ChecklistProgress checklist={inspection.checklist} />
                </TableCell>
                <TableCell className="pr-4">
                  <FindingSignals checklist={inspection.checklist} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Narrow: stacked rows that wrap. */}
      <ul className="flex flex-col divide-y rounded-xl ring-1 ring-foreground/10 @4xl:hidden">
        {inspections.map((inspection) => (
          <li key={inspection.id}>
            <Link
              href={`/inspections/${inspection.id}`}
              className="flex flex-col gap-1.5 p-4 outline-none focus-visible:bg-muted active:bg-muted"
            >
              <span className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-medium">{inspection.title}</span>
                <InspectionStatusBadge status={inspection.status} isOverdue={inspection.isOverdue} />
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {inspection.vessel.name} · {dateLabel(inspection)} · {inspection.inspectorName ?? "Unassigned"}
              </span>
              <span className="flex flex-wrap items-center gap-2 text-sm">
                <ChecklistProgress checklist={inspection.checklist} />
                {inspection.checklist.failed > 0 ? <FindingSignals checklist={inspection.checklist} /> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
