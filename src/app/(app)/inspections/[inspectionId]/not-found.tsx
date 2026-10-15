import { ClipboardCheckIcon } from "lucide-react";

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

export default function InspectionNotFound() {
  return (
    <Empty className={EMPTY_PANEL}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ClipboardCheckIcon />
        </EmptyMedia>
        <EmptyTitle>Inspection not found</EmptyTitle>
        <EmptyDescription>
          The link may be mistyped, or it points to an inspection in another organization.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <ButtonLink variant="outline" href="/inspections">
          Back to inspections
        </ButtonLink>
      </EmptyContent>
    </Empty>
  );
}
