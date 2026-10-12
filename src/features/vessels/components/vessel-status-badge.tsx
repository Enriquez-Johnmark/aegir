import { Badge } from "@/components/ui/badge";
import { VESSEL_STATUS_BADGE, VESSEL_STATUS_LABELS, type VesselStatus } from "@/features/vessels/domain";

export function VesselStatusBadge({ status }: { status: VesselStatus }) {
  return <Badge variant={VESSEL_STATUS_BADGE[status]}>{VESSEL_STATUS_LABELS[status]}</Badge>;
}
