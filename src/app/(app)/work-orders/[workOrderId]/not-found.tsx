import { WrenchIcon } from "lucide-react";

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

export default function WorkOrderNotFound() {
  return (
    <Empty className={EMPTY_PANEL}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WrenchIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>Work order not found</h1>
        </EmptyTitle>
        <EmptyDescription>
          The link may be mistyped, or it points to a work order in another organization.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <ButtonLink variant="outline" href="/work-orders">
          Back to work orders
        </ButtonLink>
      </EmptyContent>
    </Empty>
  );
}
