import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { SavedNotice } from "@/components/shared/saved-notice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordHistory, RecordHistorySkeleton } from "@/features/audit/components/record-history";
import { AcknowledgeHandover } from "@/features/handovers/components/acknowledge-handover";
import { ForYouBadge, HandoverStatusBadge } from "@/features/handovers/components/handover-badges";
import { canAcknowledge } from "@/features/handovers/domain";
import { getHandoverDetail } from "@/features/handovers/server/queries";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

const SAVED_MESSAGES = {
  created: { message: "Handover sent", description: "It stays pending until the recipient acknowledges it." },
  acknowledged: {
    message: "Handover acknowledged",
    description: "The sender can see you've read it; the time is recorded. Any work order keeps its assignee.",
  },
} as const;

export async function HandoverDetail({ handoverId, saved }: { handoverId: string; saved: string | null }) {
  const [user, handover] = await Promise.all([requireUser(), getHandoverDetail(handoverId)]);
  if (!handover) {
    notFound();
  }

  const forMe = handover.toUserId === user.id;
  const fromMe = handover.fromUserId === user.id;
  const notice = saved === "created" || saved === "acknowledged" ? SAVED_MESSAGES[saved] : null;
  const recipient = forMe ? "you" : (handover.toName ?? "a former member");

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Handovers", href: "/handovers" }, { label: handover.summary }]}
        title={handover.summary}
        badge={
          <span className="inline-flex flex-wrap gap-1.5">
            {handover.status === "pending" && forMe ? <ForYouBadge /> : null}
            <HandoverStatusBadge status={handover.status} />
          </span>
        }
        description={`From ${fromMe ? "you" : (handover.fromName ?? "a former member")} to ${recipient} · ${formatDateTime(handover.createdAt)}`}
      />

      <SavedNotice message={notice?.message ?? null} description={notice?.description} />

      {/* The tasks first: acknowledging confirms them, so the button sits directly under what it confirms. */}
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>
            <h2>Outstanding tasks</h2>
          </CardTitle>
          <CardDescription>What was left unfinished. Handovers can&apos;t be edited after they are sent.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="max-w-prose whitespace-pre-line">{handover.outstandingTasks}</p>
        </CardContent>
      </Card>

      {canAcknowledge(user, handover) ? (
        <AcknowledgeHandover handoverId={handover.id} />
      ) : handover.status === "pending" ? (
        <p className="text-sm text-muted-foreground">
          Waiting for {handover.toName ?? "the recipient"} to acknowledge it. Only the person it is addressed to can.
        </p>
      ) : null}

      {/* By the record's own width (rem container queries), so enlarged text gets fewer columns, not overlaps. */}
      <div className="@container">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl p-4 ring-1 ring-foreground/10 @xs:grid-cols-2 @3xl:grid-cols-4">
          {handover.vessel ? (
            <Fact
              label="Vessel"
              value={
                <Link
                  href={`/vessels/${handover.vessel.id}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {handover.vessel.name}
                </Link>
              }
            />
          ) : null}
          {handover.workOrder ? (
            <Fact
              label="Work order"
              value={
                <Link
                  href={`/work-orders/${handover.workOrder.id}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {handover.workOrder.title}
                </Link>
              }
            />
          ) : null}
          <Fact label="Handed over" value={formatDateTime(handover.createdAt)} />
          <Fact
            label="Acknowledged"
            value={handover.acknowledgedAt ? formatDateTime(handover.acknowledgedAt) : "Not yet"}
          />
        </dl>
      </div>

      <Suspense fallback={<RecordHistorySkeleton className="max-w-3xl" />}>
        <RecordHistory table="handovers" id={handover.id} className="max-w-3xl" />
      </Suspense>
    </>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 tabular-nums wrap-break-word">{value}</dd>
    </div>
  );
}
