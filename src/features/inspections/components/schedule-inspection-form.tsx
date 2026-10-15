"use client";

import { AlertCircleIcon, ListPlusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { ButtonLink } from "@/components/shared/button-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
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
import { Textarea } from "@/components/ui/textarea";
import { scheduleInspectionAction, type ScheduleFormState } from "@/features/inspections/actions";
import { CHECKLIST_TEMPLATES, type ChecklistTemplateKey } from "@/features/inspections/domain";
import { MAX_CHECKLIST_ITEMS, UNASSIGNED } from "@/features/inspections/schemas";
import type { ScheduleFormOptions } from "@/features/inspections/server/queries";

type Row = { key: string; category: string; description: string };

const CATEGORY_SUGGESTIONS = [
  "Fire safety",
  "Life-saving appliances",
  "Navigation",
  "Pollution prevention",
  "Machinery",
  "Hull & structure",
  "Cargo",
];

const blankRow = (key: string): Row => ({ key, category: "", description: "" });
const isBlank = (row: Row) => row.category.trim() === "" && row.description.trim() === "";
const toFieldErrors = (messages: string[] | undefined) => messages?.map((message) => ({ message }));

export function ScheduleInspectionForm({
  options,
  defaultVesselId,
  defaultInspectorId,
  today,
  cancelHref,
}: {
  options: ScheduleFormOptions;
  defaultVesselId: string | null;
  defaultInspectorId: string | null;
  today: string;
  cancelHref: string;
}) {
  const [state, formAction, isPending] = useActionState<ScheduleFormState, FormData>(scheduleInspectionAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  // Title and checklist are controlled: templates fill them in.
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<Row[]>(() => [blankRow("initial")]);
  const [focusKey, setFocusKey] = useState<string | null>(null);

  // After a failed submit, move focus to the first problem (or the form-level alert).
  useEffect(() => {
    const form = formRef.current;
    if (!form || (!state.fieldErrors && !state.itemErrors && !state.formError)) {
      return;
    }
    form.querySelector<HTMLElement>('[aria-invalid="true"], [data-slot="alert"]')?.focus();
  }, [state]);

  // A newly added check gets focus so typing can continue straight away.
  useEffect(() => {
    if (focusKey) {
      document.getElementById(`check-${focusKey}-category`)?.focus();
    }
  }, [focusKey]);

  const values = state.values;
  const errors = state.fieldErrors ?? {};
  const vesselItems = Object.fromEntries(options.vessels.map((v) => [v.id, v.name]));
  const inspectorItems: Record<string, string> = {
    [UNASSIGNED]: "Assign later",
    ...Object.fromEntries(options.inspectors.map((p) => [p.id, p.name])),
  };

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    const key = crypto.randomUUID();
    setRows((current) => [...current, blankRow(key)]);
    setFocusKey(key);
  }

  function removeRow(key: string) {
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row.key !== key)));
  }

  // Templates add to the checklist (blank rows are replaced); they never discard typed checks.
  function addTemplate(templateKey: ChecklistTemplateKey) {
    const template = CHECKLIST_TEMPLATES[templateKey];
    setRows((current) =>
      [
        ...current.filter((row) => !isBlank(row)),
        ...template.items.map((item) => ({ key: crypto.randomUUID(), ...item })),
      ].slice(0, MAX_CHECKLIST_ITEMS),
    );
    if (title.trim() === "") {
      setTitle(template.label);
    }
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="max-w-3xl">
      <FieldGroup>
        {state.formError ? (
          <Alert variant="destructive" tabIndex={-1} className="outline-none">
            <AlertCircleIcon />
            <AlertTitle>Inspection not scheduled</AlertTitle>
            <AlertDescription>{state.formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          <Field data-invalid={errors.vesselId ? true : undefined}>
            <FieldLabel htmlFor="vesselId">Vessel</FieldLabel>
            <Select name="vesselId" items={vesselItems} defaultValue={values?.vesselId || defaultVesselId || null}>
              <SelectTrigger id="vesselId" aria-invalid={errors.vesselId ? true : undefined} className="w-full">
                <SelectValue placeholder="Choose a vessel" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {options.vessels.map((vessel) => (
                    <SelectItem key={vessel.id} value={vessel.id}>
                      {vessel.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError errors={toFieldErrors(errors.vesselId)} />
          </Field>

          <Field data-invalid={errors.scheduledFor ? true : undefined}>
            <FieldLabel htmlFor="scheduledFor">Date</FieldLabel>
            <Input
              id="scheduledFor"
              name="scheduledFor"
              type="date"
              defaultValue={values?.scheduledFor ?? today}
              aria-invalid={errors.scheduledFor ? true : undefined}
              className="tabular-nums"
            />
            <FieldError errors={toFieldErrors(errors.scheduledFor)} />
          </Field>
        </div>

        <Field data-invalid={errors.title ? true : undefined}>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            autoComplete="off"
            aria-invalid={errors.title ? true : undefined}
          />
          <FieldDescription>For example “Quarterly safety inspection”. Templates fill this in.</FieldDescription>
          <FieldError errors={toFieldErrors(errors.title)} />
        </Field>

        <Field data-invalid={errors.inspectorId ? true : undefined}>
          <FieldLabel htmlFor="inspectorId">Inspector</FieldLabel>
          <Select name="inspectorId" items={inspectorItems} defaultValue={values?.inspectorId || defaultInspectorId || UNASSIGNED}>
            <SelectTrigger id="inspectorId" aria-invalid={errors.inspectorId ? true : undefined} className="w-full md:w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Object.keys(inspectorItems).map((id) => (
                  <SelectItem key={id} value={id}>
                    {inspectorItems[id]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>The assigned inspector, fleet managers and administrators can record results.</FieldDescription>
          <FieldError errors={toFieldErrors(errors.inspectorId)} />
        </Field>

        <FieldSet>
          <FieldLegend>Checklist</FieldLegend>
          <FieldDescription>
            What will be checked, in order. Each check is recorded as pass, fail or N/A; a failure needs a finding
            and a severity.
          </FieldDescription>
          {errors.items ? (
            <p role="alert" data-slot="alert" tabIndex={-1} className="text-sm text-destructive outline-none">
              {errors.items[0]}
            </p>
          ) : null}

          <ol className="flex flex-col gap-3">
            {rows.map((row, index) => {
              const rowErrors = state.itemErrors?.[index];
              const number = index + 1;
              return (
                <li
                  key={row.key}
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-2 md:grid-cols-[1.5rem_13rem_minmax(0,1fr)_auto]"
                >
                  <span className="pt-1.5 text-right text-sm text-muted-foreground tabular-nums pointer-coarse:pt-3">
                    {number}
                  </span>
                  <Field data-invalid={rowErrors?.category ? true : undefined}>
                    <FieldLabel htmlFor={`check-${row.key}-category`} className="sr-only">
                      Check {number} category
                    </FieldLabel>
                    <Input
                      id={`check-${row.key}-category`}
                      name="itemCategory"
                      value={row.category}
                      onChange={(event) => updateRow(row.key, { category: event.target.value })}
                      placeholder="Category"
                      list="checklist-categories"
                      maxLength={80}
                      aria-invalid={rowErrors?.category ? true : undefined}
                    />
                    <FieldError errors={toFieldErrors(rowErrors?.category)} />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="md:order-last"
                    onClick={() => removeRow(row.key)}
                    disabled={rows.length === 1}
                    aria-label={`Remove check ${number}`}
                  >
                    <Trash2Icon />
                  </Button>
                  <Field data-invalid={rowErrors?.description ? true : undefined} className="col-start-2 col-end-4 md:col-auto">
                    <FieldLabel htmlFor={`check-${row.key}-description`} className="sr-only">
                      Check {number}: what to check
                    </FieldLabel>
                    <Input
                      id={`check-${row.key}-description`}
                      name="itemDescription"
                      value={row.description}
                      onChange={(event) => updateRow(row.key, { description: event.target.value })}
                      placeholder="What to check, e.g. “Fire doors close and latch”"
                      maxLength={500}
                      aria-invalid={rowErrors?.description ? true : undefined}
                    />
                    <FieldError errors={toFieldErrors(rowErrors?.description)} />
                  </Field>
                </li>
              );
            })}
          </ol>
          <datalist id="checklist-categories">
            {CATEGORY_SUGGESTIONS.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={addRow} disabled={rows.length >= MAX_CHECKLIST_ITEMS}>
              <PlusIcon data-icon="inline-start" />
              Add check
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
                <ListPlusIcon data-icon="inline-start" />
                Add from template
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-64">
                <DropdownMenuGroup>
                  {(Object.keys(CHECKLIST_TEMPLATES) as ChecklistTemplateKey[]).map((key) => (
                    <DropdownMenuItem key={key} onClick={() => addTemplate(key)}>
                      <span className="flex-1">{CHECKLIST_TEMPLATES[key].label}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {CHECKLIST_TEMPLATES[key].items.length} checks
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </FieldSet>

        <Field data-invalid={errors.notes ? true : undefined}>
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={4000}
            defaultValue={values?.notes ?? ""}
            aria-invalid={errors.notes ? true : undefined}
          />
          <FieldDescription>Optional. Port, access arrangements, anything the inspector should know.</FieldDescription>
          <FieldError errors={toFieldErrors(errors.notes)} />
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            {isPending ? "Scheduling…" : "Schedule inspection"}
          </Button>
          <ButtonLink variant="outline" href={cancelHref}>
            Cancel
          </ButtonLink>
        </div>
      </FieldGroup>
    </form>
  );
}
