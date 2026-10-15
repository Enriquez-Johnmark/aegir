"use client";

import { AlertCircleIcon, CircleCheckBigIcon, CirclePauseIcon, PlayIcon, Undo2Icon } from "lucide-react";
import { useActionState, useState } from "react";

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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { changeWorkOrderStatusAction, type StatusFormState } from "@/features/work-orders/actions";
import { NEXT_STATUSES, type WorkOrderStatus } from "@/features/work-orders/domain";

/**
 * Status buttons for a manager or the assignee. Only moves the trigger allows
 * from the current status are offered; the server re-checks everything.
 */
export function WorkOrderStatusActions({
  workOrderId,
  status,
}: {
  workOrderId: string;
  status: Exclude<WorkOrderStatus, "completed">;
}) {
  const [state, formAction, isPending] = useActionState<StatusFormState, FormData>(
    changeWorkOrderStatusAction.bind(null, workOrderId),
    {},
  );
  // The block form stays open after a failed save so the reason isn't lost.
  const [blocking, setBlocking] = useState(false);
  // Close the block form once the status has actually changed (adjusting state during render).
  const [shownStatus, setShownStatus] = useState(status);
  if (status !== shownStatus) {
    setShownStatus(status);
    setBlocking(false);
  }
  const next = NEXT_STATUSES[status];
  const reasonErrors = state.fieldErrors?.blockedReason;

  return (
    <div className="flex flex-col gap-3">
      {/* While the reason is being written, the other moves step aside: one primary per task. */}
      <div className={blocking ? "hidden" : "flex flex-wrap items-center gap-2"}>
        {next.includes("in_progress") ? (
          <form action={formAction}>
            <input type="hidden" name="status" value="in_progress" />
            <Button type="submit" disabled={isPending}>
              <PlayIcon data-icon="inline-start" />
              {status === "blocked" ? "Resume work" : "Start work"}
            </Button>
          </form>
        ) : null}

        {next.includes("completed") ? (
          <AlertDialog>
            <AlertDialogTrigger render={<Button disabled={isPending} />}>
              <CircleCheckBigIcon data-icon="inline-start" />
              Mark completed
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mark this work order completed?</AlertDialogTitle>
                <AlertDialogDescription>
                  Completed work orders are closed for good: they can no longer be edited or reopened. If the
                  problem comes back, raise a new work order.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {state.error ? (
                <p role="alert" className="text-sm text-destructive">
                  {state.error}
                </p>
              ) : null}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>Not yet</AlertDialogCancel>
                <form action={formAction}>
                  <input type="hidden" name="status" value="completed" />
                  <Button type="submit" disabled={isPending} className="w-full">
                    {isPending ? <Spinner data-icon="inline-start" /> : null}
                    {isPending ? "Completing…" : "Mark completed"}
                  </Button>
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}

        {next.includes("blocked") && !blocking ? (
          <Button variant="outline" onClick={() => setBlocking(true)} disabled={isPending}>
            <CirclePauseIcon data-icon="inline-start" />
            Mark blocked
          </Button>
        ) : null}

        {next.includes("open") ? (
          <form action={formAction}>
            <input type="hidden" name="status" value="open" />
            <Button type="submit" variant="ghost" disabled={isPending}>
              <Undo2Icon data-icon="inline-start" />
              Back to open
            </Button>
          </form>
        ) : null}

        {isPending && !blocking ? <Spinner aria-label="Saving" /> : null}
      </div>

      {blocking ? (
        <form action={formAction} className="flex max-w-2xl flex-col gap-3 rounded-lg bg-muted/50 p-3">
          <input type="hidden" name="status" value="blocked" />
          <Field data-invalid={reasonErrors ? true : undefined}>
            <FieldLabel htmlFor="blockedReason">What is blocking the work?</FieldLabel>
            <Textarea
              id="blockedReason"
              name="blockedReason"
              rows={2}
              maxLength={1000}
              defaultValue={state.values?.blockedReason ?? ""}
              aria-invalid={reasonErrors ? true : undefined}
              autoFocus
            />
            <FieldDescription>For example: waiting for parts, access to the space, or a permit.</FieldDescription>
            <FieldError errors={reasonErrors?.map((message) => ({ message }))} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              {isPending ? "Saving…" : "Mark blocked"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setBlocking(false)} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {state.error ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Status not changed</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
