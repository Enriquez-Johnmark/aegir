import { ChevronLeftIcon, ChevronRightIcon, ScrollTextIcon, SearchXIcon } from "lucide-react";

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
import { actorLabel, AuditEntryBody } from "@/features/audit/components/audit-entry";
import { groupByDay, RECORD_TYPE_FILTER_LABELS } from "@/features/audit/domain";
import { SYSTEM_ACTOR, type AuditLogParams } from "@/features/audit/schemas";
import { listAuditEvents, listAuditPeople } from "@/features/audit/server/queries";

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

/** The log's URL for these filters and cursor. */
function logHref({ type, actor, before }: AuditLogParams): string {
  const search = new URLSearchParams();
  if (type) search.set("type", type);
  if (actor) search.set("actor", actor);
  if (before) search.set("before", String(before));
  const query = search.toString();
  return query ? `/audit?${query}` : "/audit";
}

/** "Inspection checks · by Marcus Reyes": the active filters in words, for the summary and the empty state. */
function describeFilters(params: AuditLogParams, people: { id: string; name: string }[]): string | null {
  const person =
    params.actor === SYSTEM_ACTOR
      ? "System (seed data)"
      : params.actor
        ? (people.find((p) => p.id === params.actor)?.name ?? "a former or unknown person")
        : null;
  const parts = [params.type ? RECORD_TYPE_FILTER_LABELS[params.type] : null, person ? `by ${person}` : null];
  return parts.filter(Boolean).join(" · ") || null;
}

export async function AuditLog({ params }: { params: AuditLogParams }) {
  const [{ items, nextCursor, cursorFound }, people] = await Promise.all([listAuditEvents(params), listAuditPeople()]);
  const filters = describeFilters(params, people);
  const paged = cursorFound;

  // Kept even when a page has nothing readable, so older events stay reachable.
  const pager =
    paged || nextCursor ? (
      <nav aria-label="Audit log pages" className="flex flex-wrap gap-2">
        {paged ? (
          <ButtonLink variant="outline" href={logHref({ ...params, before: undefined })}>
            <ChevronLeftIcon data-icon="inline-start" />
            Newest changes
          </ButtonLink>
        ) : null}
        {nextCursor ? (
          <ButtonLink variant="outline" href={logHref({ ...params, before: nextCursor })}>
            Older changes
            <ChevronRightIcon data-icon="inline-end" />
          </ButtonLink>
        ) : null}
      </nav>
    ) : null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Empty className={EMPTY_PANEL}>
          <EmptyHeader>
            <EmptyMedia variant="icon">{filters ? <SearchXIcon /> : <ScrollTextIcon />}</EmptyMedia>
            <EmptyTitle aria-live="polite">
              {filters ? `No changes · ${filters}` : paged ? "No readable changes on this page" : "Nothing recorded yet"}
            </EmptyTitle>
            <EmptyDescription>
              {filters
                ? "Try another record type or person."
                : paged
                  ? "Older changes may still follow."
                  : "Changes to vessels, inspections, work orders, handovers and members appear here as they happen."}
            </EmptyDescription>
          </EmptyHeader>
          {filters || paged ? (
            <EmptyContent>
              <ButtonLink variant="outline" href="/audit">
                Show all changes
              </ButtonLink>
            </EmptyContent>
          ) : null}
        </Empty>
        {pager}
      </div>
    );
  }

  const count = `${items.length} ${items.length === 1 ? "change" : "changes"}`;
  return (
    <div className="@container flex flex-col gap-4">
      {/* Names the page and the filters, so a filter change is announced in words. */}
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {paged ? `Showing ${count}, older than the previous page` : `Showing the newest ${count}`}
        {filters ? ` · ${filters}` : null}
      </p>

      {groupByDay(items).map(({ day, items: dayItems }) => (
        <section key={day} aria-labelledby={`day-${day}`} className="flex flex-col gap-2">
          <h2 id={`day-${day}`} className="text-sm font-medium text-muted-foreground">
            <time dateTime={day}>{dayFormatter.format(new Date(`${day}T00:00:00Z`))}</time>
          </h2>
          <ol className="flex flex-col divide-y rounded-xl ring-1 ring-foreground/10">
            {dayItems.map((item) => (
              <li
                key={item.id}
                className="relative grid grid-cols-1 gap-x-4 gap-y-1 p-4 first:rounded-t-xl last:rounded-b-xl @xl:grid-cols-[4.5rem_minmax(0,1fr)]"
              >
                <time dateTime={item.occurredAt} className="text-sm text-muted-foreground tabular-nums">
                  {timeFormatter.format(new Date(item.occurredAt))} UTC
                </time>
                <AuditEntryBody item={item} record="link" meta={`by ${actorLabel(item)}`} />
              </li>
            ))}
          </ol>
        </section>
      ))}

      {pager}
    </div>
  );
}
