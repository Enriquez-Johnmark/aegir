import { ArrowRightLeftIcon } from "lucide-react";

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

export default function HandoverNotFound() {
  return (
    <Empty className={EMPTY_PANEL}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ArrowRightLeftIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>Handover not found</h1>
        </EmptyTitle>
        <EmptyDescription>
          The link may be mistyped, or it points to a handover in another organization.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <ButtonLink variant="outline" href="/handovers">
          Back to handovers
        </ButtonLink>
      </EmptyContent>
    </Empty>
  );
}
