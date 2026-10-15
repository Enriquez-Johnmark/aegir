import { ArrowDownIcon, ClockAlertIcon, EqualIcon, OctagonAlertIcon, TriangleAlertIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  PRIORITY_LABELS,
  WORK_ORDER_STATUS_BADGE,
  WORK_ORDER_STATUS_LABELS,
  type Priority,
  type WorkOrderStatus,
} from "@/features/work-orders/domain";

// Priority always carries an icon as well as colour and words (DESIGN.md: The Two-Channel Rule).
const PRIORITY = {
  critical: { variant: "destructive", icon: OctagonAlertIcon },
  high: { variant: "warning", icon: TriangleAlertIcon },
  medium: { variant: "secondary", icon: EqualIcon },
  low: { variant: "secondary", icon: ArrowDownIcon },
} as const;

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { variant, icon: Icon } = PRIORITY[priority];
  return (
    <Badge variant={variant}>
      <Icon data-icon="inline-start" />
      {PRIORITY_LABELS[priority]}
      <span className="sr-only"> priority</span>
    </Badge>
  );
}

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  return <Badge variant={WORK_ORDER_STATUS_BADGE[status]}>{WORK_ORDER_STATUS_LABELS[status]}</Badge>;
}

export function OverdueBadge() {
  return (
    <Badge variant="destructive">
      <ClockAlertIcon data-icon="inline-start" />
      Overdue
    </Badge>
  );
}
