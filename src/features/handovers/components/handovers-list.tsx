import { ArrowRightLeftIcon, PlusIcon, SearchXIcon } from "lucide-react";
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
import { ForYouBadge, HandoverStatusBadge } from "@/features/handovers/components/handover-badges";
import type { HandoverListParams } from "@/features/handovers/schemas";
import { listHandovers, type HandoverListItem } from "@/features/handovers/server/queries";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

const VIEW_NOUNS = {
  pending: ["pending handover", "pending handovers"],
  "for-you": ["handover waiting for you", "handovers waiting for you"],
  sent: ["handover you sent", "handovers you sent"],
  acknowledged: ["acknowledged handover", "acknowledged handovers"],
  all: ["handover", "handovers"],
} as const;

/** What the handover is about: the work order if any, otherwise the vessel. */
function subject(handover: HandoverListItem) {
  if (handover.workOrder) {
    return handover.vessel ? `${handover.workOrder.title} · ${handover.vessel.name}` : handover.workOrder.title;
  }
  return handover.vessel?.name ?? "—";
}

/** "Tomas Okafor → you", read aloud as "Tomas Okafor to you". */
function People({ handover, me }: { handover: HandoverListItem; me: string }) {
  const from = handover.fromUserId === me ? "You" : (handover.fromName ?? "A former member");
  const to = handover.toUserId === me ? "you" : (handover.toName ?? "a former member");
  return (
    <>
      {from} <span aria-hidden>→</span>
      <span className="sr-only">to</span> {to}
    </>
  );
}

function when(handover: HandoverListItem) {
  // Date and hour: handovers happen at shift changes, so the time is the urgency signal.
  return handover.acknowledgedAt
    ? `Acknowledged ${formatDateTime(handover.acknowledgedAt)}`
    : `Handed over ${formatDateTime(handover.createdAt)}`;
}

function Signals({ handover, me }: { handover: HandoverListItem; me: string }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {handover.status === "pending" && handover.toUserId === me ? <ForYouBadge /> : null}
      <HandoverStatusBadge status={handover.status} />
    </span>
  );
}

export async function HandoversList({
  params,
  vesselName,
}: {
  params: HandoverListParams;
  vesselName: string | null;
}) {
  const [user, handovers] = await Promise.all([requireUser(), listHandovers(params)]);
  const [singular, plural] = VIEW_NOUNS[params.view];

  if (handovers.length === 0) {
    // A vessel filter counts even when its id is unknown (stale link), so the copy doesn't claim "all clear".
    const filtered = params.view !== "pending" || params.vessel !== undefined;
    return (
      <Empty className={EMPTY_PANEL}>
        <EmptyHeader>
          <EmptyMedia variant="icon">{filtered ? <SearchXIcon /> : <ArrowRightLeftIcon />}</EmptyMedia>
          <EmptyTitle>
            No {plural}
            {vesselName ? ` · ${vesselName}` : null}
          </EmptyTitle>
          <EmptyDescription>
            {params.view === "for-you"
              ? "Nothing is waiting for you to take over."
              : filtered
                ? "Try another view or clear the filters."
                : "Every handover has been acknowledged. Hand work over when you leave something unfinished."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row flex-wrap justify-center">
          {can(user.role, "handovers:create") && !filtered ? (
            <ButtonLink href="/handovers/new">
              <PlusIcon data-icon="inline-start" />
              New handover
            </ButtonLink>
          ) : null}
          {filtered ? (
            <ButtonLink variant="outline" href="/handovers">
              Show pending handovers
            </ButtonLink>
          ) : null}
        </EmptyContent>
      </Empty>
    );
  }

  const forMe = handovers.filter((h) => h.status === "pending" && h.toUserId === user.id).length;

  return (
    <div className="@container flex flex-col gap-2">
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {handovers.length} {handovers.length === 1 ? singular : plural}
        {forMe > 0 && params.view !== "for-you" ? ` · ${forMe} for you` : null}
      </p>

      {/* Wide (by the list's own width, so large text gets stacked rows): table. The summary link stretches over its row. */}
      <div className="hidden overflow-hidden rounded-xl ring-1 ring-foreground/10 @4xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Handover</TableHead>
              <TableHead>About</TableHead>
              <TableHead>From and to</TableHead>
              <TableHead>When</TableHead>
              <TableHead className="pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {handovers.map((handover) => (
              <TableRow key={handover.id} className="relative">
                <TableCell className="max-w-80 pl-4 font-medium whitespace-normal">
                  <Link
                    href={`/handovers/${handover.id}`}
                    className="outline-none after:absolute after:inset-0 hover:underline focus-visible:underline focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                  >
                    {handover.summary}
                  </Link>
                </TableCell>
                <TableCell className="max-w-72 whitespace-normal">{subject(handover)}</TableCell>
                <TableCell>
                  <People handover={handover} me={user.id} />
                </TableCell>
                <TableCell className="tabular-nums">{when(handover)}</TableCell>
                <TableCell className="pr-4">
                  <Signals handover={handover} me={user.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Narrow: stacked rows that wrap. */}
      <ul className="flex flex-col divide-y rounded-xl ring-1 ring-foreground/10 @4xl:hidden">
        {handovers.map((handover) => (
          <li key={handover.id}>
            <Link
              href={`/handovers/${handover.id}`}
              className="flex flex-col gap-1.5 p-4 outline-none focus-visible:bg-muted active:bg-muted"
            >
              <span className="font-medium">{handover.summary}</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {subject(handover)} · <People handover={handover} me={user.id} /> · {when(handover)}
              </span>
              <Signals handover={handover} me={user.id} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
