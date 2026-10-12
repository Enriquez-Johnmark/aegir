import { LockIcon } from "lucide-react";

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

/** Shown when a signed-in member opens a page their role can't use. */
export function ForbiddenState({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <Empty className={EMPTY_PANEL}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LockIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <ButtonLink variant="outline" href={backHref}>
          {backLabel}
        </ButtonLink>
      </EmptyContent>
    </Empty>
  );
}
