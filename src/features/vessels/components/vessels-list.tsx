import { PlusIcon, SearchXIcon, ShipIcon } from "lucide-react";
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
import { AttentionSignals } from "@/features/vessels/components/attention-signals";
import { VesselStatusBadge } from "@/features/vessels/components/vessel-status-badge";
import { VESSEL_STATUS_LABELS, VESSEL_TYPE_LABELS } from "@/features/vessels/domain";
import type { VesselListParams } from "@/features/vessels/schemas";
import { listVessels } from "@/features/vessels/server/queries";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export async function VesselsList({ params }: { params: VesselListParams }) {
  const [user, vessels] = await Promise.all([requireUser(), listVessels(params)]);
  const activeFilters = [
    params.q ? `“${params.q}”` : null,
    params.status ? VESSEL_STATUS_LABELS[params.status] : null,
    params.type ? VESSEL_TYPE_LABELS[params.type] : null,
  ].filter(Boolean);

  if (vessels.length === 0) {
    return activeFilters.length > 0 ? (
      <Empty className={EMPTY_PANEL}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>No vessels match {activeFilters.join(" · ")}</EmptyTitle>
          <EmptyDescription>Check the spelling or IMO number, or clear the filters to see the whole fleet.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <ButtonLink variant="outline" href="/vessels">
            Clear filters
          </ButtonLink>
        </EmptyContent>
      </Empty>
    ) : (
      <Empty className={EMPTY_PANEL}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShipIcon />
          </EmptyMedia>
          <EmptyTitle>No vessels in your fleet yet</EmptyTitle>
          <EmptyDescription>
            Vessels anchor everything else in Aegir: inspections, work orders and handovers all
            belong to a vessel.
          </EmptyDescription>
        </EmptyHeader>
        {can(user.role, "vessels:write") ? (
          <EmptyContent>
            <ButtonLink href="/vessels/new">
              <PlusIcon data-icon="inline-start" />
              Add the first vessel
            </ButtonLink>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return (
    <div className="@container flex flex-col gap-2">
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {vessels.length} {vessels.length === 1 ? "vessel" : "vessels"}
        {params.sort === "attention" ? " · those needing attention first" : null}
      </p>

      {/* Wide (by the list's own width, so large text gets stacked rows): table. The name link stretches over its row, so the whole row is clickable. */}
      <div className="hidden overflow-hidden rounded-xl ring-1 ring-foreground/10 @4xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Vessel</TableHead>
              <TableHead>IMO</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Flag</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Open work</TableHead>
              <TableHead className="pr-4">Attention</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vessels.map((vessel) => (
              <TableRow key={vessel.id} className="relative">
                <TableCell className="pl-4 font-medium">
                  <Link
                    href={`/vessels/${vessel.id}`}
                    className="outline-none after:absolute after:inset-0 hover:underline focus-visible:underline focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                  >
                    {vessel.name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-muted-foreground tabular-nums">{vessel.imoNumber}</TableCell>
                <TableCell>{VESSEL_TYPE_LABELS[vessel.vesselType]}</TableCell>
                <TableCell>{vessel.flagState}</TableCell>
                <TableCell>
                  <VesselStatusBadge status={vessel.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {vessel.openWorkOrders > 0 ? vessel.openWorkOrders : <span className="text-muted-foreground">0</span>}
                </TableCell>
                <TableCell className="pr-4">
                  <AttentionSignals attention={vessel} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked rows (DESIGN.md: tables with more than ~4 columns stack on small screens). */}
      <ul className="flex flex-col divide-y rounded-xl ring-1 ring-foreground/10 @4xl:hidden">
        {vessels.map((vessel) => (
          <li key={vessel.id}>
            <Link
              href={`/vessels/${vessel.id}`}
              className="flex flex-col gap-1.5 p-4 outline-none focus-visible:bg-muted active:bg-muted"
            >
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{vessel.name}</span>
                <VesselStatusBadge status={vessel.status} />
              </span>
              <span className="text-sm text-muted-foreground">
                <span className="font-mono tabular-nums">IMO {vessel.imoNumber}</span> ·{" "}
                {VESSEL_TYPE_LABELS[vessel.vesselType]} · {vessel.flagState}
              </span>
              <span className="flex flex-wrap items-center gap-2 text-sm tabular-nums">
                <span>
                  {vessel.openWorkOrders === 0
                    ? "No open work"
                    : `${vessel.openWorkOrders} open work ${vessel.openWorkOrders === 1 ? "order" : "orders"}`}
                </span>
                <AttentionSignals attention={vessel} hideWhenClear />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
