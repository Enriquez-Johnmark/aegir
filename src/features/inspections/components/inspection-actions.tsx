"use client";

import { AlertCircleIcon, CircleCheckBigIcon, PlayIcon } from "lucide-react";
import { useActionState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { changeInspectionStatusAction, type StatusActionState } from "@/features/inspections/actions";
import type { InspectionStatus } from "@/features/inspections/domain";

/**
 * Lifecycle buttons for someone allowed to conduct the inspection. The server
 * re-checks permission (RLS) and the transition (trigger); this only offers the
 * moves that make sense from the current status.
 */
export function InspectionActions({
  inspectionId,
  status,
  pendingChecks,
}: {
  inspectionId: string;
  status: Extract<InspectionStatus, "scheduled" | "in_progress">;
  pendingChecks: number;
}) {
  const [startState, start, isStarting] = useActionState<StatusActionState>(
    changeInspectionStatusAction.bind(null, inspectionId, "in_progress"),
    {},
  );
  const [completeState, complete, isCompleting] = useActionState<StatusActionState>(
    changeInspectionStatusAction.bind(null, inspectionId, "completed"),
    {},
  );
  const [cancelState, cancel, isCancelling] = useActionState<StatusActionState>(
    changeInspectionStatusAction.bind(null, inspectionId, "cancelled"),
    {},
  );
  const error = startState.error ?? completeState.error ?? cancelState.error;
  const busy = isStarting || isCompleting || isCancelling;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {status === "scheduled" ? (
          <form action={start}>
            <Button type="submit" disabled={busy}>
              {isStarting ? <Spinner data-icon="inline-start" /> : <PlayIcon data-icon="inline-start" />}
              {isStarting ? "Starting…" : "Start inspection"}
            </Button>
          </form>
        ) : (
          <form action={complete}>
            <Button type="submit" disabled={busy || pendingChecks > 0} aria-describedby={pendingChecks > 0 ? "complete-hint" : undefined}>
              {isCompleting ? <Spinner data-icon="inline-start" /> : <CircleCheckBigIcon data-icon="inline-start" />}
              {isCompleting ? "Completing…" : "Complete inspection"}
            </Button>
          </form>
        )}

        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="outline" disabled={busy} />}>Cancel inspection</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this inspection?</AlertDialogTitle>
              <AlertDialogDescription>
                It stays in the vessel&apos;s history as cancelled, and its checklist can no longer be changed.
                Schedule a new inspection if it still needs to happen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {cancelState.error ? (
              <p role="alert" className="text-sm text-destructive">
                {cancelState.error}
              </p>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isCancelling}>Keep inspection</AlertDialogCancel>
              <form action={cancel}>
                <Button type="submit" variant="destructive" disabled={isCancelling} className="w-full">
                  {isCancelling ? <Spinner data-icon="inline-start" /> : null}
                  {isCancelling ? "Cancelling…" : "Cancel inspection"}
                </Button>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {status === "in_progress" && pendingChecks > 0 ? (
        <p id="complete-hint" className="text-sm text-muted-foreground tabular-nums">
          Record {pendingChecks} more {pendingChecks === 1 ? "check" : "checks"} to complete the inspection.
        </p>
      ) : null}
      {status === "scheduled" ? (
        <p className="text-sm text-muted-foreground">Start the inspection to record results.</p>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Not saved</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
