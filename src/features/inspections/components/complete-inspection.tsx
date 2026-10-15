"use client";

import { CircleCheckBigIcon, FlagIcon, WrenchIcon } from "lucide-react";
import { useActionState } from "react";

import { ButtonLink } from "@/components/shared/button-link";
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
import { useChecklistEditing } from "@/features/inspections/components/checklist-editing";
import type { ChecklistSummary } from "@/features/inspections/domain";

export type UnaddressedFailure = { id: string; position: number; description: string };

/**
 * "Complete inspection" with a confirmation, because completion is final: the
 * checklist freezes. The dialog says what is being signed off and lists failed
 * checks that still have no work order (completing is allowed; they stay
 * flagged on the dashboard until work is raised, D-035).
 */
export function CompleteInspection({
  inspectionId,
  checklist,
  unaddressed,
  canRaiseWorkOrder,
  hintId,
}: {
  inspectionId: string;
  checklist: ChecklistSummary;
  unaddressed: UnaddressedFailure[];
  canRaiseWorkOrder: boolean;
  /** Id of the element explaining why the button is disabled. */
  hintId?: string;
}) {
  const [state, complete, isCompleting] = useActionState<StatusActionState>(
    changeInspectionStatusAction.bind(null, inspectionId, "completed"),
    {},
  );
  const { openEdits } = useChecklistEditing();
  const blocked = checklist.pending > 0 || openEdits > 0;
  const summary = [
    `${checklist.passed} passed`,
    `${checklist.failed} failed`,
    checklist.notApplicable > 0 ? `${checklist.notApplicable} N/A` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button disabled={blocked} aria-describedby={blocked ? hintId : undefined} />}
      >
        <CircleCheckBigIcon data-icon="inline-start" />
        Complete inspection
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Complete this inspection?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground tabular-nums">{summary}.</span> Once completed, the
            results and findings are frozen and can&apos;t be changed.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {unaddressed.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-left text-sm">
            <p className="flex items-center gap-1.5 font-medium">
              <FlagIcon className="size-4 text-warning" aria-hidden />
              {unaddressed.length === 1
                ? "1 failed check has no work order yet"
                : `${unaddressed.length} failed checks have no work order yet`}
            </p>
            <ul className="flex flex-col gap-2">
              {unaddressed.map((failure) => (
                <li key={failure.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="text-muted-foreground tabular-nums">{failure.position}.</span>{" "}
                    {failure.description}
                  </span>
                  {canRaiseWorkOrder ? (
                    <ButtonLink variant="outline" size="sm" href={`/work-orders/new?item=${failure.id}`}>
                      <WrenchIcon data-icon="inline-start" />
                      Raise work order
                    </ButtonLink>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground">
              You can still complete now: they stay flagged on the dashboard until work is raised.
            </p>
          </div>
        ) : null}

        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCompleting}>Keep recording</AlertDialogCancel>
          <form action={complete}>
            <Button type="submit" disabled={isCompleting} className="w-full">
              {isCompleting ? <Spinner data-icon="inline-start" /> : null}
              {isCompleting ? "Completing…" : "Complete inspection"}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
