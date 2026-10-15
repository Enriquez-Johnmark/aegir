import {
  CircleCheckIcon,
  CircleMinusIcon,
  CircleXIcon,
  ClockAlertIcon,
  FlagIcon,
  OctagonAlertIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  CHECK_RESULT_LABELS,
  INSPECTION_STATUS_BADGE,
  INSPECTION_STATUS_LABELS,
  SEVERITY_LABELS,
  type ChecklistSummary,
  type CheckResult,
  type InspectionStatus,
  type Severity,
} from "@/features/inspections/domain";

/** An overdue inspection reads as overdue first; its lifecycle status is secondary. */
export function InspectionStatusBadge({ status, isOverdue }: { status: InspectionStatus; isOverdue: boolean }) {
  if (isOverdue) {
    return (
      <Badge variant="destructive">
        <ClockAlertIcon data-icon="inline-start" />
        Overdue
      </Badge>
    );
  }
  return <Badge variant={INSPECTION_STATUS_BADGE[status]}>{INSPECTION_STATUS_LABELS[status]}</Badge>;
}

const RESULT = {
  pass: { variant: "success", icon: CircleCheckIcon },
  fail: { variant: "destructive", icon: CircleXIcon },
  not_applicable: { variant: "outline", icon: CircleMinusIcon },
  pending: { variant: "outline", icon: null },
} as const;

export function CheckResultBadge({ result }: { result: CheckResult }) {
  const { variant, icon: Icon } = RESULT[result];
  return (
    <Badge variant={variant}>
      {Icon ? <Icon data-icon="inline-start" /> : null}
      {CHECK_RESULT_LABELS[result]}
    </Badge>
  );
}

// Severity always carries an icon as well as colour and words (DESIGN.md: The Two-Channel Rule).
const SEVERITY = {
  critical: { variant: "destructive", icon: OctagonAlertIcon },
  high: { variant: "warning", icon: TriangleAlertIcon },
  medium: { variant: "secondary", icon: TriangleAlertIcon },
  low: { variant: "secondary", icon: FlagIcon },
} as const;

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { variant, icon: Icon } = SEVERITY[severity];
  return (
    <Badge variant={variant}>
      <Icon data-icon="inline-start" />
      {SEVERITY_LABELS[severity]} severity
    </Badge>
  );
}

/** Failed checks and the follow-ups they still need; quiet when there is nothing to act on. */
export function FindingSignals({ checklist }: { checklist: ChecklistSummary }) {
  if (checklist.failed === 0) {
    return checklist.pending === checklist.total ? null : (
      <span className="text-sm text-muted-foreground">No failed checks</span>
    );
  }
  return (
    <span className="flex flex-wrap gap-1.5">
      <Badge variant="destructive">
        <CircleXIcon data-icon="inline-start" />
        {checklist.failed} failed
      </Badge>
      {checklist.needsFollowUp > 0 ? (
        <Badge variant="warning">
          <FlagIcon data-icon="inline-start" />
          {checklist.needsFollowUp} {checklist.needsFollowUp === 1 ? "needs" : "need"} follow-up
        </Badge>
      ) : null}
    </span>
  );
}

export function ChecklistProgress({ checklist }: { checklist: ChecklistSummary }) {
  return (
    <span className="tabular-nums">
      {checklist.checked}/{checklist.total} checked
    </span>
  );
}
