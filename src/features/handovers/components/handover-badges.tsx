import { CheckCheckIcon, InboxIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { HANDOVER_STATUS_LABELS, type HandoverStatus } from "@/features/handovers/domain";

/** DESIGN.md mapping: pending → neutral, acknowledged → success (with an icon). */
export function HandoverStatusBadge({ status }: { status: HandoverStatus }) {
  if (status === "acknowledged") {
    return (
      <Badge variant="success">
        <CheckCheckIcon data-icon="inline-start" />
        {HANDOVER_STATUS_LABELS.acknowledged}
      </Badge>
    );
  }
  return <Badge variant="outline">{HANDOVER_STATUS_LABELS.pending}</Badge>;
}

/** A pending handover waiting for the signed-in person (informational, like on the dashboard). */
export function ForYouBadge() {
  return (
    <Badge variant="info">
      <InboxIcon data-icon="inline-start" />
      For you
    </Badge>
  );
}
