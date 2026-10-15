"use client";

import { AlertCircleIcon, CheckCheckIcon } from "lucide-react";
import { useActionState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { acknowledgeHandoverAction, type AcknowledgeState } from "@/features/handovers/actions";

/**
 * The recipient's one action. No confirmation dialog: acknowledging loses
 * nothing (the content was already frozen); it records that the recipient has
 * read it, and when. It does not reassign any work order (D-041).
 */
export function AcknowledgeHandover({ handoverId }: { handoverId: string }) {
  const [state, acknowledge, isPending] = useActionState<AcknowledgeState>(
    acknowledgeHandoverAction.bind(null, handoverId),
    {},
  );

  return (
    <div className="flex flex-col gap-3">
      <form action={acknowledge} className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button type="submit" disabled={isPending} aria-describedby="acknowledge-hint">
          {isPending ? <Spinner data-icon="inline-start" /> : <CheckCheckIcon data-icon="inline-start" />}
          {isPending ? "Acknowledging…" : "Acknowledge handover"}
        </Button>
        <p id="acknowledge-hint" className="text-sm text-muted-foreground">
          Confirms you&apos;ve read it and know what&apos;s outstanding. The time is recorded.
        </p>
      </form>
      {state.error ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Not acknowledged</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
