"use client";

import { AlertCircleIcon } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { ButtonLink } from "@/components/shared/button-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
import type { VesselFormState } from "@/features/vessels/actions";
import {
  VESSEL_STATUS_LABELS,
  VESSEL_STATUSES,
  VESSEL_TYPE_LABELS,
  VESSEL_TYPES,
} from "@/features/vessels/domain";
import type { VesselFormFields } from "@/features/vessels/schemas";

type Action = (state: VesselFormState, formData: FormData) => Promise<VesselFormState>;

const EMPTY: VesselFormFields = {
  name: "",
  imoNumber: "",
  vesselType: "",
  flagState: "",
  status: "active",
  yearBuilt: "",
  grossTonnage: "",
};

export function VesselForm({
  action,
  defaultValues = EMPTY,
  submitLabel,
  pendingLabel,
  cancelHref,
}: {
  action: Action;
  defaultValues?: VesselFormFields;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  // After a failed submit, move focus to the first problem so keyboard and
  // screen-reader users land on it (a form-level error focuses the alert).
  useEffect(() => {
    const form = formRef.current;
    if (!form || (!state.fieldErrors && !state.formError)) {
      return;
    }
    const target = form.querySelector<HTMLElement>('[aria-invalid="true"], [data-slot="alert"]');
    target?.focus();
  }, [state]);
  // After a failed submit, show what the user typed rather than the originals.
  const values = { ...defaultValues, ...state.values };
  const errors = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={formAction} noValidate className="max-w-2xl">
      <FieldGroup>
        {state.formError ? (
          <Alert variant="destructive" tabIndex={-1} className="outline-none">
            <AlertCircleIcon />
            <AlertTitle>Vessel not saved</AlertTitle>
            <AlertDescription>{state.formError}</AlertDescription>
          </Alert>
        ) : null}

        <TextField name="name" label="Vessel name" values={values} errors={errors} autoComplete="off" />

        <div className="grid gap-6 md:grid-cols-2">
          <TextField
            name="imoNumber"
            label="IMO number"
            description="7 digits, including the check digit."
            values={values}
            errors={errors}
            inputMode="numeric"
            maxLength={7}
            className="font-mono tabular-nums"
          />
          <TextField name="flagState" label="Flag state" values={values} errors={errors} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SelectField
            name="vesselType"
            label="Vessel type"
            items={VESSEL_TYPE_LABELS}
            options={VESSEL_TYPES}
            placeholder="Choose a type"
            values={values}
            errors={errors}
          />
          <SelectField
            name="status"
            label="Status"
            items={VESSEL_STATUS_LABELS}
            options={VESSEL_STATUSES}
            placeholder="Choose a status"
            values={values}
            errors={errors}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <TextField
            name="yearBuilt"
            label="Year built"
            description="Optional."
            values={values}
            errors={errors}
            inputMode="numeric"
            maxLength={4}
            className="tabular-nums"
          />
          <TextField
            name="grossTonnage"
            label="Gross tonnage"
            description="Optional, in GT."
            values={values}
            errors={errors}
            inputMode="numeric"
            className="tabular-nums"
          />
        </div>

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

type FieldName = keyof VesselFormFields;
type FieldErrors = NonNullable<VesselFormState["fieldErrors"]>;

function toFieldErrors(messages: string[] | undefined) {
  return messages?.map((message) => ({ message }));
}

function TextField({
  name,
  label,
  description,
  values,
  errors,
  ...inputProps
}: {
  name: FieldName;
  label: string;
  description?: string;
  values: VesselFormFields;
  errors: FieldErrors;
} & Omit<React.ComponentProps<typeof Input>, "name" | "defaultValue">) {
  const invalid = errors[name] ? true : undefined;
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} defaultValue={values[name]} aria-invalid={invalid} {...inputProps} />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={toFieldErrors(errors[name])} />
    </Field>
  );
}

function SelectField({
  name,
  label,
  items,
  options,
  placeholder,
  values,
  errors,
}: {
  name: FieldName;
  label: string;
  items: Record<string, string>;
  options: readonly string[];
  placeholder: string;
  values: VesselFormFields;
  errors: FieldErrors;
}) {
  const invalid = errors[name] ? true : undefined;
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Select name={name} items={items} defaultValue={values[name] || null}>
        <SelectTrigger id={name} aria-invalid={invalid} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {items[option]}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldError errors={toFieldErrors(errors[name])} />
    </Field>
  );
}
