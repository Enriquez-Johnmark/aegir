"use client";

import { cn } from "cn";
import { AlertCircleIcon, WrenchIcon } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { ButtonLink } from "@/components/shared/button-link";
import { WRAPPING_SELECT_TRIGGER } from "@/components/shared/wrapping-select";
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
import { createHandoverAction } from "@/features/handovers/actions";
import type { HandoverFormFields } from "@/features/handovers/schemas";
import { ROLE_LABELS, type OrgRole } from "@/lib/auth/roles";

/** "No work order" in the optional select (a select option can't be empty). */
const VESSEL_ONLY = "vessel-only";

/** A handover started from a work order: the subject is fixed and shown for context. */
export type FixedWorkOrder = { id: string; title: string; vesselName: string };

const toFieldErrors = (messages: string[] | undefined) => messages?.map((message) => ({ message }));

export function HandoverForm({
  defaultValues,
  vessels,
  workOrders,
  recipients,
  fixedWorkOrder,
  cancelHref,
}: {
  defaultValues: HandoverFormFields;
  vessels: { id: string; name: string }[];
  workOrders: { id: string; title: string; vesselId: string }[];
  recipients: { id: string; name: string; role: OrgRole }[];
  fixedWorkOrder?: FixedWorkOrder;
  cancelHref: string;
}) {
  const [state, formAction, isPending] = useActionState(createHandoverAction, {});
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

  // The work-order choices follow the chosen vessel, so a mismatched pair can't be picked.
  const [vesselId, setVesselId] = useState(values.vesselId);
  const [workOrderId, setWorkOrderId] = useState(values.workOrderId || VESSEL_ONLY);
  const vesselWorkOrders = workOrders.filter((wo) => wo.vesselId === vesselId);
  const workOrderItems: Record<string, string> = {
    [VESSEL_ONLY]: "None: about the vessel in general",
    ...Object.fromEntries(vesselWorkOrders.map((wo) => [wo.id, wo.title])),
  };
  // Name and role, so the sender can tell who the next watch is.
  const recipientItems = Object.fromEntries(
    recipients.map((person) => [person.id, `${person.name} · ${ROLE_LABELS[person.role]}`]),
  );

  return (
    <form ref={formRef} action={formAction} noValidate className="max-w-2xl">
      <FieldGroup>
        {state.formError ? (
          <Alert variant="destructive" tabIndex={-1} className="outline-none">
            <AlertCircleIcon />
            <AlertTitle>Handover not sent</AlertTitle>
            <AlertDescription>{state.formError}</AlertDescription>
          </Alert>
        ) : null}

        {fixedWorkOrder ? (
          <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3 text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <WrenchIcon className="size-4 text-muted-foreground" aria-hidden />
              Handing over a work order on {fixedWorkOrder.vesselName}
            </span>
            <span>{fixedWorkOrder.title}</span>
            <input type="hidden" name="workOrderId" value={fixedWorkOrder.id} />
            <input type="hidden" name="vesselId" value="" />
            <FieldError errors={toFieldErrors(errors.workOrderId)} />
          </div>
        ) : (
          <>
            <Field data-invalid={errors.vesselId ? true : undefined}>
              <FieldLabel htmlFor="vesselId">Vessel</FieldLabel>
              <Select
                name="vesselId"
                items={Object.fromEntries(vessels.map((v) => [v.id, v.name]))}
                value={vesselId || null}
                onValueChange={(next) => {
                  setVesselId(typeof next === "string" ? next : "");
                  setWorkOrderId(VESSEL_ONLY);
                }}
              >
                <SelectTrigger id="vesselId" aria-invalid={errors.vesselId ? true : undefined} className={cn(WRAPPING_SELECT_TRIGGER, "w-full")}>
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

            <Field data-invalid={errors.workOrderId ? true : undefined}>
              <FieldLabel htmlFor="workOrderId">Work order</FieldLabel>
              {/* The hidden input carries "" for "none"; the select itself can't hold an empty value. */}
              <input type="hidden" name="workOrderId" value={workOrderId === VESSEL_ONLY ? "" : workOrderId} />
              <Select
                items={workOrderItems}
                value={workOrderId}
                onValueChange={(next) => setWorkOrderId(typeof next === "string" ? next : VESSEL_ONLY)}
                disabled={!vesselId}
              >
                <SelectTrigger id="workOrderId" aria-invalid={errors.workOrderId ? true : undefined} className={cn(WRAPPING_SELECT_TRIGGER, "w-full")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.keys(workOrderItems).map((id) => (
                      <SelectItem key={id} value={id}>
                        {workOrderItems[id]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                {vesselId
                  ? vesselWorkOrders.length > 0
                    ? "Optional. Pick one if the handover is about a specific job."
                    : "This vessel has no open work orders, so the handover is about the vessel."
                  : "Choose a vessel first."}
              </FieldDescription>
              <FieldError errors={toFieldErrors(errors.workOrderId)} />
            </Field>
          </>
        )}

        <Field data-invalid={errors.toUserId ? true : undefined}>
          <FieldLabel htmlFor="toUserId">Hand over to</FieldLabel>
          <Select name="toUserId" items={recipientItems} defaultValue={values.toUserId || null}>
            <SelectTrigger id="toUserId" aria-invalid={errors.toUserId ? true : undefined} className={cn(WRAPPING_SELECT_TRIGGER, "w-full")}>
              <SelectValue placeholder="Choose a colleague" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {recipients.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {recipientItems[person.id]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>Only they can acknowledge it. Read-only viewers can&apos;t take work over.</FieldDescription>
          <FieldError errors={toFieldErrors(errors.toUserId)} />
        </Field>

        <Field data-invalid={errors.summary ? true : undefined}>
          <FieldLabel htmlFor="summary">Summary</FieldLabel>
          <Input
            id="summary"
            name="summary"
            defaultValue={values.summary}
            maxLength={200}
            autoComplete="off"
            aria-invalid={errors.summary ? true : undefined}
          />
          <FieldDescription>One line, e.g. “Night shift: fuel pump isolated, seal kit not fitted yet”.</FieldDescription>
          <FieldError errors={toFieldErrors(errors.summary)} />
        </Field>

        <Field data-invalid={errors.outstandingTasks ? true : undefined}>
          <FieldLabel htmlFor="outstandingTasks">Outstanding tasks</FieldLabel>
          <Textarea
            id="outstandingTasks"
            name="outstandingTasks"
            rows={6}
            maxLength={4000}
            defaultValue={values.outstandingTasks}
            aria-invalid={errors.outstandingTasks ? true : undefined}
          />
          <FieldDescription>
            What is still to be done, what to watch, where things are. It can&apos;t be edited after it is sent.
          </FieldDescription>
          <FieldError errors={toFieldErrors(errors.outstandingTasks)} />
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            {isPending ? "Handing over…" : "Hand over"}
          </Button>
          <ButtonLink variant="outline" href={cancelHref}>
            Cancel
          </ButtonLink>
        </div>
      </FieldGroup>
    </form>
  );
}
