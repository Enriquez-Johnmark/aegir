"use client";

import { AlertCircleIcon, PlayIcon } from "lucide-react";
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
import { CompleteHint } from "@/features/inspections/components/checklist-editing";
import {
  CompleteInspection,
  type UnaddressedFailure,
} from "@/features/inspections/components/complete-inspection";
import type { ChecklistSummary, InspectionStatus } from "@/features/inspections/domain";

/**
 * Lifecycle buttons for someone allowed to conduct the inspection. The server
 * re-checks permission (RLS) and the transition (trigger); this only offers the
 * moves that make sense from the current status.
 */
export function InspectionActions({
  inspectionId,
  status,
  checklist,
  unaddressed,
  canRaiseWorkOrder,
}: {
  inspectionId: string;
  status: Extract<InspectionStatus, "scheduled" | "in_progress">;
  checklist: ChecklistSummary;
  unaddressed: UnaddressedFailure[];
  canRaiseWorkOrder: boolean;
}) {
  const pendingChecks = checklist.pending;
  const [startState, start, isStarting] = useActionState<StatusActionState>(
    changeInspectionStatusAction.bind(null, inspectionId, "in_progress"),
    {},
  );
  const [cancelState, cancel, isCancelling] = useActionState<StatusActionState>(
    changeInspectionStatusAction.bind(null, inspectionId, "cancelled"),
    {},
  );
  const error = startState.error ?? cancelState.error;
  const busy = isStarting || isCancelling;

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
          <CompleteInspection
            inspectionId={inspectionId}
            checklist={checklist}
            unaddressed={unaddressed}
            canRaiseWorkOrder={canRaiseWorkOrder}
            hintId="complete-hint"
          />
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

      {status === "in_progress" ? <CompleteHint id="complete-hint" pending={pendingChecks} /> : null}
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
