"use client";

import { cn } from "cn";
import {
  CheckIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  CircleXIcon,
  FlagIcon,
  PencilIcon,
  WrenchIcon,
} from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useState } from "react";

import { ButtonLink } from "@/components/shared/button-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { recordResultAction, type RecordResultState } from "@/features/inspections/actions";
import { useChecklistEditing } from "@/features/inspections/components/checklist-editing";
import { CheckResultBadge, SeverityBadge } from "@/features/inspections/components/inspection-badges";
import {
  CHECK_RESULT_LABELS,
  SEVERITIES,
  SEVERITY_DESCRIPTIONS,
  SEVERITY_LABELS,
  type CheckResult,
} from "@/features/inspections/domain";
import type { ChecklistItem as ChecklistItemData } from "@/features/inspections/server/queries";
import { WORK_ORDER_STATUS_LABELS } from "@/features/work-orders/domain";

const RESULT_OPTIONS = [
  { value: "pass", icon: CircleCheckIcon, pressed: "aria-pressed:bg-success/10 aria-pressed:text-success" },
  { value: "fail", icon: CircleXIcon, pressed: "aria-pressed:bg-destructive/10 aria-pressed:text-destructive" },
  { value: "not_applicable", icon: CircleMinusIcon, pressed: "aria-pressed:bg-muted aria-pressed:text-foreground" },
] as const;

export function ChecklistItem({
  inspectionId,
  item,
  editable,
  canRaiseWorkOrder,
}: {
  inspectionId: string;
  item: ChecklistItemData;
  editable: boolean;
  canRaiseWorkOrder: boolean;
}) {
  const [state, formAction, isPending] = useActionState<RecordResultState, FormData>(
    recordResultAction.bind(null, inspectionId, item.id),
    {},
  );
  // The selected result. "fail" can be selected before it is saved (it needs a finding first).
  const [choice, setChoice] = useState<CheckResult>(item.result);
  // Re-sync when the saved result changes underneath us (after a save or a refresh).
  const [savedResult, setSavedResult] = useState(item.result);
  if (item.result !== savedResult) {
    setSavedResult(item.result);
    setChoice(item.result);
  }

  // A recorded failure is never replaced by one tap: an unlinked one asks first,
  // and one with a work order is locked (the database refuses it too, D-037).
  const linkedFailure = item.result === "fail" && item.workOrders.length > 0;
  const [replacing, setReplacing] = useState<"pass" | "not_applicable" | null>(null);

  function save(result: "pass" | "not_applicable") {
    setChoice(result);
    setReplacing(null);
    const formData = new FormData();
    formData.set("result", result);
    startTransition(() => formAction(formData));
  }

  function choose(next: string | undefined) {
    if (!next || next === choice) {
      return;
    }
    if (next === "fail") {
      setReplacing(null);
      setChoice("fail");
      return;
    }
    const result = next as "pass" | "not_applicable";
    if (item.result === "fail") {
      setReplacing(result);
      return;
    }
    // Pass and N/A need nothing else: save straight away (one tap on deck).
    save(result);
  }

  // A recorded failure reads as a record; its finding opens for editing only on request.
  const [editingFinding, setEditingFinding] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(state.savedAt);
  if (state.savedAt !== lastSavedAt) {
    setLastSavedAt(state.savedAt);
    setEditingFinding(false);
  }

  const failedUnsaved = choice === "fail" && item.result !== "fail";
  const showFindingForm = editable && choice === "fail" && (failedUnsaved || editingFinding);

  // Tell the Complete buttons while this check has unsaved work (they wait for it).
  const { setEditing } = useChecklistEditing();
  const midEdit = showFindingForm || replacing !== null;
  useEffect(() => {
    setEditing(item.id, midEdit);
    return () => setEditing(item.id, false);
  }, [item.id, midEdit, setEditing]);
  const descriptionId = `check-${item.id}-description`;

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="w-5 shrink-0 text-right text-sm text-muted-foreground tabular-nums">{item.position}</span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">{item.category}</span>
            <p id={descriptionId} className="max-w-prose">
              {item.description}
            </p>
          </div>
        </div>

        {editable ? (
          <div className="flex items-center gap-2 pl-8 md:pl-0">
            <ToggleGroup
              aria-label={`Result for check ${item.position}`}
              aria-describedby={descriptionId}
              variant="outline"
              spacing={0}
              value={choice === "pending" ? [] : [choice]}
              onValueChange={(values) => choose(values[0])}
              disabled={isPending}
            >
              {RESULT_OPTIONS.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  disabled={linkedFailure && option.value !== "fail"}
                  className={cn("px-3", option.pressed)}
                >
                  <option.icon data-icon="inline-start" />
                  {CHECK_RESULT_LABELS[option.value]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <SaveStatus isPending={isPending} savedAt={state.savedAt} />
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 pl-8 md:justify-end md:pl-0">
            <CheckResultBadge result={item.result} />
            {item.result === "fail" && item.severity ? <SeverityBadge severity={item.severity} /> : null}
          </div>
        )}
      </div>

      {editable && replacing ? (
        <div role="alertdialog" aria-labelledby={`replace-${item.id}`} className="ml-8 flex max-w-2xl flex-col gap-3 rounded-lg bg-muted/50 p-3">
          <p id={`replace-${item.id}`} className="text-sm">
            Replace this failure with <span className="font-medium">{CHECK_RESULT_LABELS[replacing]}</span>? The
            finding and its severity will be removed from the checklist.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="destructive" onClick={() => save(replacing)} disabled={isPending}>
              Replace with {CHECK_RESULT_LABELS[replacing]}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setReplacing(null)} autoFocus>
              Keep the failure
            </Button>
          </div>
        </div>
      ) : null}

      {state.error ? (
        <p role="alert" className="pl-8 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {showFindingForm ? (
        <form action={formAction} className="ml-8 flex max-w-2xl flex-col gap-4 rounded-lg bg-muted/50 p-3">
          <input type="hidden" name="result" value="fail" />
          <Field data-invalid={state.fieldErrors?.finding ? true : undefined}>
            <FieldLabel htmlFor={`finding-${item.id}`}>What did you find?</FieldLabel>
            <Textarea
              id={`finding-${item.id}`}
              name="finding"
              rows={3}
              maxLength={2000}
              defaultValue={state.values?.finding ?? item.finding ?? ""}
              aria-invalid={state.fieldErrors?.finding ? true : undefined}
              autoFocus={failedUnsaved || editingFinding}
            />
            <FieldDescription>Location, equipment and what is wrong, so the fix can be planned.</FieldDescription>
            <FieldError errors={state.fieldErrors?.finding?.map((message) => ({ message }))} />
          </Field>
          <SeverityField
            id={`severity-${item.id}`}
            defaultValue={state.values?.severity || item.severity || null}
            errors={state.fieldErrors?.severity}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              {isPending ? "Saving…" : failedUnsaved ? "Record failure" : "Save finding"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => (failedUnsaved ? setChoice(item.result) : setEditingFinding(false))}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {item.result === "fail" && !showFindingForm ? (
        <div className="ml-8 flex max-w-prose flex-col gap-1.5">
          {item.finding ? <p className="text-sm">{item.finding}</p> : null}
          {editable ? (
            <div className="flex flex-wrap items-center gap-2">
              {item.severity ? <SeverityBadge severity={item.severity} /> : null}
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingFinding(true)}>
                <PencilIcon data-icon="inline-start" />
                Edit finding
              </Button>
            </div>
          ) : null}
          {editable && linkedFailure ? (
            <p className="text-xs text-muted-foreground">
              Work has been raised for this failure, so its result stays Fail.
            </p>
          ) : null}
        </div>
      ) : null}
      {!editable && item.result === "not_applicable" && item.finding ? (
        <p className="ml-8 max-w-prose text-sm text-muted-foreground">{item.finding}</p>
      ) : null}

      {item.result === "fail" ? (
        <FollowUp itemId={item.id} workOrders={item.workOrders} canRaise={canRaiseWorkOrder} />
      ) : null}
    </li>
  );
}

function SaveStatus({ isPending, savedAt }: { isPending: boolean; savedAt?: number }) {
  return (
    <span className="flex min-w-14 items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
      {isPending ? (
        <>
          <Spinner className="size-3.5" />
          Saving
        </>
      ) : savedAt ? (
        <>
          <CheckIcon className="size-3.5 text-success" aria-hidden />
          Saved
        </>
      ) : null}
    </span>
  );
}

function SeverityField({
  id,
  defaultValue,
  errors,
}: {
  id: string;
  defaultValue: string | null;
  errors?: string[];
}) {
  const invalid = errors ? true : undefined;
  return (
    <FieldSet data-invalid={invalid}>
      <FieldLegend variant="label">Severity</FieldLegend>
      <RadioGroup name="severity" defaultValue={defaultValue ?? undefined} className="grid gap-2 sm:grid-cols-2">
        {SEVERITIES.toReversed().map((severity) => (
          <FieldLabel key={severity} htmlFor={`${id}-${severity}`}>
            <Field orientation="horizontal" data-invalid={invalid}>
              <RadioGroupItem value={severity} id={`${id}-${severity}`} aria-invalid={invalid} />
              <FieldContent>
                <FieldTitle>{SEVERITY_LABELS[severity]}</FieldTitle>
                <FieldDescription>{SEVERITY_DESCRIPTIONS[severity]}</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
      <FieldError errors={errors?.map((message) => ({ message }))} />
    </FieldSet>
  );
}

/** The follow-up flag: a failed check stays flagged until a work order is raised for it. */
function FollowUp({
  itemId,
  workOrders,
  canRaise,
}: {
  itemId: string;
  workOrders: ChecklistItemData["workOrders"];
  canRaise: boolean;
}) {
  if (workOrders.length === 0) {
    return (
      <div className="ml-8 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="warning">
          <FlagIcon data-icon="inline-start" />
          Needs follow-up
        </Badge>
        {canRaise ? (
          <ButtonLink variant="outline" size="sm" href={`/work-orders/new?item=${itemId}`}>
            <WrenchIcon data-icon="inline-start" />
            Raise work order
          </ButtonLink>
        ) : (
          <span className="text-muted-foreground">No work order raised yet.</span>
        )}
      </div>
    );
  }
  return (
    <ul className="ml-8 flex flex-col gap-1 text-sm">
      {workOrders.map((wo) => (
        <li key={wo.id} className="flex items-center gap-2">
          <WrenchIcon className="size-3.5 text-muted-foreground" aria-hidden />
          <span>
            Work order:{" "}
            <Link href={`/work-orders/${wo.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
              {wo.title}
            </Link>{" "}
            <span className="text-muted-foreground">({WORK_ORDER_STATUS_LABELS[wo.status]})</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
