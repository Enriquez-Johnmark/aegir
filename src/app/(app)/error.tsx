"use client";

import { TriangleAlertIcon } from "lucide-react";

import { EMPTY_PANEL } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/** Recoverable error boundary for every authenticated page. Details stay in the server logs. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Empty className={EMPTY_PANEL}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Something went wrong loading this page</EmptyTitle>
        <EmptyDescription>
          Your data is safe. Try again, and if it keeps happening, reload the page.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={reset}>Try again</Button>
      </EmptyContent>
    </Empty>
  );
}
