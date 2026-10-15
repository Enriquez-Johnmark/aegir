"use client";

import { cn } from "cn";
import { CheckIcon, CircleCheckIcon, CircleMinusIcon, CircleXIcon, FlagIcon, WrenchIcon } from "lucide-react";
import { startTransition, useActionState, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { recordResultAction, type RecordResultState } from "@/features/inspections/actions";
import { CheckResultBadge, SeverityBadge } from "@/features/inspections/components/inspection-badges";
import {
  CHECK_RESULT_LABELS,
  SEVERITIES,
  SEVERITY_DESCRIPTIONS,
  SEVERITY_LABELS,
  type CheckResult,
} from "@/features/inspections/domain";
import type { ChecklistItem as ChecklistItemData } from "@/features/inspections/server/queries";

const RESULT_OPTIONS = [
  { value: "pass", icon: CircleCheckIcon, pressed: "aria-pressed:bg-success/10 aria-pressed:text-success" },
  { value: "fail", icon: CircleXIcon, pressed: "aria-pressed:bg-destructive/10 aria-pressed:text-destructive" },
  { value: "not_applicable", icon: CircleMinusIcon, pressed: "aria-pressed:bg-muted aria-pressed:text-foreground" },
] as const;

const WORK_ORDER_STATUS_LABELS = {
  open: "open",
  in_progress: "in progress",
  blocked: "blocked",
  completed: "completed",
} as const;

export function ChecklistItem({
  inspectionId,
  item,
  editable,
}: {
  inspectionId: string;
  item: ChecklistItemData;
  editable: boolean;
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

  function choose(next: string | undefined) {
    if (!next || next === choice) {
      return;
    }
    setChoice(next as CheckResult);
    if (next !== "fail") {
      // Pass and N/A need nothing else: save straight away (one tap on deck).
      const formData = new FormData();
      formData.set("result", next);
      startTransition(() => formAction(formData));
    }
  }

  const failedUnsaved = choice === "fail" && item.result !== "fail";
  const showFindingForm = editable && choice === "fail";
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
                <ToggleGroupItem key={option.value} value={option.value} className={cn("px-3", option.pressed)}>
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
              autoFocus={failedUnsaved}
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
              {isPending ? "Saving…" : failedUnsaved ? "Record failure" : "Update finding"}
            </Button>
            {failedUnsaved ? (
              <Button type="button" variant="ghost" onClick={() => setChoice(item.result)} disabled={isPending}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}

      {!editable && item.result === "fail" && item.finding ? (
        <p className="ml-8 max-w-prose text-sm">{item.finding}</p>
      ) : null}
      {!editable && item.result === "not_applicable" && item.finding ? (
        <p className="ml-8 max-w-prose text-sm text-muted-foreground">{item.finding}</p>
      ) : null}

      {item.result === "fail" ? <FollowUp workOrders={item.workOrders} /> : null}
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
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>Severity</FieldLabel>
      <Select name="severity" items={SEVERITY_LABELS} defaultValue={defaultValue}>
        <SelectTrigger id={id} aria-invalid={invalid} className="w-full md:w-60">
          <SelectValue placeholder="Choose severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {SEVERITIES.toReversed().map((severity) => (
              <SelectItem key={severity} value={severity}>
                <span className="flex flex-col">
                  <span className="font-medium">{SEVERITY_LABELS[severity]}</span>
                  <span className="text-xs text-muted-foreground">{SEVERITY_DESCRIPTIONS[severity]}</span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldError errors={errors?.map((message) => ({ message }))} />
    </Field>
  );
}

/** The follow-up flag: a failed check stays flagged until a work order is raised for it. */
function FollowUp({ workOrders }: { workOrders: ChecklistItemData["workOrders"] }) {
  if (workOrders.length === 0) {
    return (
      <div className="ml-8 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="warning">
          <FlagIcon data-icon="inline-start" />
          Needs follow-up
        </Badge>
        <span className="text-muted-foreground">No work order raised yet.</span>
      </div>
    );
  }
  return (
    <ul className="ml-8 flex flex-col gap-1 text-sm">
      {workOrders.map((wo) => (
        <li key={wo.id} className="flex items-center gap-2">
          <WrenchIcon className="size-3.5 text-muted-foreground" aria-hidden />
          <span>
            Work order: {wo.title}{" "}
            <span className="text-muted-foreground">({WORK_ORDER_STATUS_LABELS[wo.status]})</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
