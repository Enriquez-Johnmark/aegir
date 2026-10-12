import { ShipIcon } from "lucide-react";

import { EMPTY_PANEL } from "@/components/shared/panel";
import { ButtonLink } from "@/components/shared/button-link";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function VesselNotFound() {
  return (
    <Empty className={EMPTY_PANEL}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShipIcon />
        </EmptyMedia>
        <EmptyTitle>Vessel not found</EmptyTitle>
        <EmptyDescription>
          It may have been removed from your fleet, or the link points to a vessel in another
          organization.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <ButtonLink variant="outline" href="/vessels">
          Back to vessels
        </ButtonLink>
      </EmptyContent>
    </Empty>
  );
}
