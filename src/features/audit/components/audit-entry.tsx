import Link from "next/link";

import { CREATED_LABELS, RECORD_TYPE_LABELS, type FieldChange } from "@/features/audit/domain";
import type { AuditItem } from "@/features/audit/server/queries";

/**
 * "Open → In progress", read aloud as "Open to In progress". The no-break
 * space keeps the arrow on the same line as the value it points to.
 */
function FromTo({ from, to }: { from: string; to: string }) {
  return (
    <>
      {from} <span aria-hidden>→</span>
      <span className="sr-only">to</span>
      {" "}
      <span className="font-medium">{to}</span>
    </>
  );
}

function Change({ change }: { change: FieldChange }) {
  if (!change.values) {
    // Long text is named, not quoted (D-042): the record shows the current version.
    return (
      <>
        {change.label} {change.verb}
      </>
    );
  }
  return (
    <>
      {change.label}: <FromTo from={change.values.from} to={change.values.to} />
    </>
  );
}

/** The most important change leads (FIELDS order: a check's result, a work order's priority); the rest follow as a list. */
function split(item: AuditItem): { headline: React.ReactNode; rest: FieldChange[] } {
  if (item.kind === "created") {
    return {
      headline: item.detail ? `${CREATED_LABELS[item.table]} ${item.detail}` : CREATED_LABELS[item.table],
      rest: [],
    };
  }
  if (item.kind === "status") {
    return {
      headline: (
        <>
          Status: <FromTo from={item.from} to={item.to} />
        </>
      ),
      rest: item.changes,
    };
  }
  const [lead, ...rest] = item.changes;
  return { headline: lead ? <Change change={lead} /> : null, rest };
}

/** " · Work order · Northwind Fjord": what kind of record, and where it belongs. The type never breaks mid-label. */
function RecordContext({ item }: { item: AuditItem }) {
  return (
    <span className="text-muted-foreground">
      {" · "}
      <span className="whitespace-nowrap">{RECORD_TYPE_LABELS[item.table]}</span>
      {item.record.context ? ` · ${item.record.context}` : null}
    </span>
  );
}

/**
 * One audit entry: the record (when it isn't the page itself), what happened,
 * any other changed fields, the block reason, and a meta line (who and when).
 * In the log the record link stretches over the whole entry (its `li` must be
 * `relative`), so the tap target is the row, not a line of text.
 */
export function AuditEntryBody({
  item,
  record,
  meta,
}: {
  item: AuditItem;
  /** "link" in the log; "text" for a check on its own inspection's page (named only); "none" on the record itself. */
  record: "link" | "text" | "none";
  meta: React.ReactNode;
}) {
  const { headline, rest } = split(item);

  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
      {record === "link" ? (
        <p className="min-w-0 wrap-break-word">
          {item.record.href ? (
            // The context is part of the link text, so same-named checks and inspections get distinct link names.
            <Link
              href={item.record.href}
              className="outline-none after:absolute after:inset-0 after:rounded-[inherit] hover:underline focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
            >
              <span className="font-medium text-primary">{item.record.name}</span>
              <RecordContext item={item} />
            </Link>
          ) : (
            <>
              <span className="font-medium">{item.record.name}</span>
              <RecordContext item={item} />
            </>
          )}
        </p>
      ) : record === "text" ? (
        <p className="min-w-0 font-medium wrap-break-word">{item.record.name}</p>
      ) : null}
      {headline ? <p className="wrap-break-word">{headline}</p> : null}
      {rest.length > 0 ? (
        <ul className="flex flex-col gap-0.5 text-muted-foreground">
          {rest.map((change) => (
            <li key={change.label} className="wrap-break-word">
              <Change change={change} />
            </li>
          ))}
        </ul>
      ) : null}
      {item.kind === "status" && item.note ? (
        <p className="max-w-prose wrap-break-word whitespace-pre-line text-muted-foreground">
          <span className="sr-only">Reason: </span>“{item.note}”
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground tabular-nums">{meta}</p>
    </div>
  );
}

/** Who made the change. Events with no actor were written by a trusted system context: the seed. */
export function actorLabel(item: AuditItem): string {
  return item.actorName ?? "System (seed data)";
}
