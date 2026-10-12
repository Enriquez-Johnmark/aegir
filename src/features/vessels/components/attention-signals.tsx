import { CircleAlertIcon, ClockAlertIcon, OctagonAlertIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { needsAttention, type VesselAttention } from "@/features/vessels/domain";

/**
 * Risk signals for one vessel: colour plus icon plus words (DESIGN.md: The
 * Two-Channel Rule). Normal vessels render a quiet "On track".
 */
export function AttentionSignals({
  attention,
  hideWhenClear = false,
}: {
  attention: VesselAttention;
  hideWhenClear?: boolean;
}) {
  const overdue = attention.overdueWorkOrders + attention.overdueInspections;

  if (!needsAttention(attention) && attention.blockedWorkOrders === 0) {
    return hideWhenClear ? null : <span className="text-sm text-muted-foreground">On track</span>;
  }

  return (
    <span className="flex flex-wrap gap-1.5">
      {attention.criticalWorkOrders > 0 ? (
        <Badge variant="destructive">
          <OctagonAlertIcon data-icon="inline-start" />
          {attention.criticalWorkOrders} critical
        </Badge>
      ) : null}
      {overdue > 0 ? (
        <Badge variant="destructive">
          <ClockAlertIcon data-icon="inline-start" />
          {overdue} overdue
        </Badge>
      ) : null}
      {attention.blockedWorkOrders > 0 ? (
        <Badge variant="warning">
          <CircleAlertIcon data-icon="inline-start" />
          {attention.blockedWorkOrders} blocked
        </Badge>
      ) : null}
    </span>
  );
}
