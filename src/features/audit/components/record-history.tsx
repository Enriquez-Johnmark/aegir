import { cn } from "cn";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { actorLabel, AuditEntryBody } from "@/features/audit/components/audit-entry";
import { getRecordHistory, RECORD_HISTORY_LIMIT } from "@/features/audit/server/queries";
import { formatDateTime } from "@/lib/format";

type RecordTable = Parameters<typeof getRecordHistory>[0];

/**
 * A record's history from the audit log, oldest first. On an inspection, its
 * checks' changes appear too, named by check. Render behind Suspense with
 * RecordHistorySkeleton so the record itself doesn't wait for it.
 */
export async function RecordHistory({ table, id, className }: { table: RecordTable; id: string; className?: string }) {
  const history = await getRecordHistory(table, id);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>
          <h2>History</h2>
        </CardTitle>
        <CardDescription>
          {history.truncated
            ? `The latest ${RECORD_HISTORY_LIMIT} changes, oldest first. Recorded by the database; can't be edited.`
            : "Every change, oldest first. Recorded by the database; can't be edited."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.items.length > 0 ? (
          <ol className="flex flex-col gap-3">
            {history.items.map((item) => (
              <li key={item.id}>
                <AuditEntryBody
                  item={item}
                  record={item.table === table ? "none" : "text"}
                  meta={
                    <>
                      by {actorLabel(item)} · <time dateTime={item.occurredAt}>{formatDateTime(item.occurredAt)}</time>
                    </>
                  }
                />
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No recorded changes yet.</p>
        )}
        {history.items.some((item) => item.actorName === null) ? (
          // The demo data is loaded by the database itself, so it has no person attached (D-042).
          <p className="mt-4 text-xs text-muted-foreground">
            Changes loaded with the demo data show as System (seed data), even where the record names a person.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function RecordHistorySkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-64 rounded-xl", className)} />;
}
