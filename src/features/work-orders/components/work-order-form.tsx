"use client";

import { AlertCircleIcon, ClipboardCheckIcon } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { ButtonLink } from "@/components/shared/button-link";
import { SeverityBadge } from "@/features/inspections/components/inspection-badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import type { WorkOrderFormState } from "@/features/work-orders/actions";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/features/work-orders/domain";
import { UNASSIGNED, type WorkOrderFormFields } from "@/features/work-orders/schemas";

type Action = (state: WorkOrderFormState, formData: FormData) => Promise<WorkOrderFormState>;

/** The failed check a new work order follows up (fixes the vessel; shown for context). */
export type FollowUpContext = {
  itemId: string;
  vesselName: string;
  inspectionTitle: string;
  check: string;
  finding: string | null;
  severity: Priority | null;
  existingWorkOrders: number;
};

const toFieldErrors = (messages: string[] | undefined) => messages?.map((message) => ({ message }));

export function WorkOrderForm({
  action,
  defaultValues,
  vessels,
  assignees,
  followUp,
  submitLabel,
  pendingLabel,
  cancelHref,
}: {
  action: Action;
  defaultValues: WorkOrderFormFields;
  /** Omit to hide the vessel field (editing never moves a work order to another vessel). */
  vessels?: { id: string; name: string }[];
  assignees: { id: string; name: string }[];
  followUp?: FollowUpContext;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  // After a failed submit, move focus to the first problem (or the form-level alert).
  useEffect(() => {
    if (!state.fieldErrors && !state.formError) {
      return;
    }
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-slot="alert"]')?.focus();
  }, [state]);

  const values = { ...defaultValues, ...state.values };
  const errors = state.fieldErrors ?? {};
  const assigneeItems: Record<string, string> = {
    [UNASSIGNED]: "Unassigned",
    ...Object.fromEntries(assignees.map((person) => [person.id, person.name])),
  };

  return (
    <form ref={formRef} action={formAction} noValidate className="max-w-2xl">
      <FieldGroup>
        {state.formError ? (
          <Alert variant="destructive" tabIndex={-1} className="outline-none">
            <AlertCircleIcon />
            <AlertTitle>Work order not saved</AlertTitle>
            <AlertDescription>{state.formError}</AlertDescription>
          </Alert>
        ) : null}

        {followUp ? (
          <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3 text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <ClipboardCheckIcon className="size-4 text-muted-foreground" aria-hidden />
              Following up a failed check on {followUp.vesselName}
            </span>
            <span className="text-muted-foreground">{followUp.inspectionTitle}</span>
            <span>{followUp.check}</span>
            {followUp.finding ? <span className="text-muted-foreground">“{followUp.finding}”</span> : null}
            {followUp.severity ? (
              <span>
                <SeverityBadge severity={followUp.severity} />
              </span>
            ) : null}
            {followUp.existingWorkOrders > 0 ? (
              <span className="font-medium text-warning">
                {followUp.existingWorkOrders === 1
                  ? "A work order has already been raised for this check."
                  : `${followUp.existingWorkOrders} work orders have already been raised for this check.`}
              </span>
            ) : null}
            <input type="hidden" name="inspectionItemId" value={followUp.itemId} />
            <input type="hidden" name="vesselId" value={values.vesselId} />
          </div>
        ) : null}

        {vessels && !followUp ? (
          <Field data-invalid={errors.vesselId ? true : undefined}>
            <FieldLabel htmlFor="vesselId">Vessel</FieldLabel>
            <Select
              name="vesselId"
              items={Object.fromEntries(vessels.map((v) => [v.id, v.name]))}
              defaultValue={values.vesselId || null}
            >
              <SelectTrigger id="vesselId" aria-invalid={errors.vesselId ? true : undefined} className="w-full">
                <SelectValue placeholder="Choose a vessel" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {vessels.map((vessel) => (
                    <SelectItem key={vessel.id} value={vessel.id}>
                      {vessel.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError errors={toFieldErrors(errors.vesselId)} />
          </Field>
        ) : null}
        {followUp && errors.vesselId ? <FieldError errors={toFieldErrors(errors.vesselId)} /> : null}

        <Field data-invalid={errors.title ? true : undefined}>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            name="title"
            defaultValue={values.title}
            maxLength={160}
            autoComplete="off"
            aria-invalid={errors.title ? true : undefined}
          />
          <FieldDescription>The job to be done, e.g. “Replace engine-room CO2 extinguisher”.</FieldDescription>
          <FieldError errors={toFieldErrors(errors.title)} />
        </Field>

        <Field data-invalid={errors.description ? true : undefined}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            rows={4}
            maxLength={4000}
            defaultValue={values.description}
            aria-invalid={errors.description ? true : undefined}
          />
          <FieldDescription>Optional. Location, parts, safety precautions.</FieldDescription>
          <FieldError errors={toFieldErrors(errors.description)} />
        </Field>

        <div className="grid gap-6 md:grid-cols-2">
          <Field data-invalid={errors.priority ? true : undefined}>
            <FieldLabel htmlFor="priority">Priority</FieldLabel>
            <Select name="priority" items={PRIORITY_LABELS} defaultValue={values.priority || null}>
              <SelectTrigger id="priority" aria-invalid={errors.priority ? true : undefined} className="w-full">
                <SelectValue placeholder="Choose a priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {PRIORITY_LABELS[priority]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError errors={toFieldErrors(errors.priority)} />
          </Field>

          <Field data-invalid={errors.dueDate ? true : undefined}>
            <FieldLabel htmlFor="dueDate">Due date</FieldLabel>
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={values.dueDate}
              aria-invalid={errors.dueDate ? true : undefined}
              className="tabular-nums"
            />
            <FieldDescription>Optional.</FieldDescription>
            <FieldError errors={toFieldErrors(errors.dueDate)} />
          </Field>
        </div>

        <Field data-invalid={errors.assigneeId ? true : undefined}>
          <FieldLabel htmlFor="assigneeId">Assignee</FieldLabel>
          <Select name="assigneeId" items={assigneeItems} defaultValue={values.assigneeId || UNASSIGNED}>
            <SelectTrigger id="assigneeId" aria-invalid={errors.assigneeId ? true : undefined} className="w-full md:w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Object.keys(assigneeItems).map((id) => (
                  <SelectItem key={id} value={id}>
                    {assigneeItems[id]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>The assignee, fleet managers and administrators can update the status.</FieldDescription>
          <FieldError errors={toFieldErrors(errors.assigneeId)} />
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            {isPending ? pendingLabel : submitLabel}
          </Button>
          <ButtonLink variant="outline" href={cancelHref}>
            Cancel
          </ButtonLink>
        </div>
      </FieldGroup>
    </form>
  );
}
