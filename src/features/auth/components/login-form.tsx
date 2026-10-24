"use client";

import { AlertCircleIcon } from "lucide-react";
import { useActionState } from "react";

import { signIn, type SignInState } from "@/features/auth/actions";
import { CopyButton } from "@/components/shared/copy-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const initialState: SignInState = {};

function toFieldErrors(messages: string[] | undefined) {
  return messages?.map((message) => ({ message }));
}

export function LoginForm({
  next,
  defaultEmail,
  demoPassword,
}: {
  next: string;
  defaultEmail?: string;
  /** Shown as a hint, never filled in: set only when a published demo account was picked (D-050). */
  demoPassword?: string;
}) {
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const emailErrors = state.fieldErrors?.email;
  const passwordErrors = state.fieldErrors?.password;

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="next" value={next} />
      <FieldGroup>
        {state.formError ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Sign-in failed</AlertTitle>
            <AlertDescription>{state.formError}</AlertDescription>
          </Alert>
        ) : null}

        <Field data-invalid={emailErrors ? true : undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email ?? defaultEmail}
            aria-invalid={emailErrors ? true : undefined}
          />
          <FieldError errors={toFieldErrors(emailErrors)} />
        </Field>

        <Field data-invalid={passwordErrors ? true : undefined}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={passwordErrors ? true : undefined}
            aria-describedby={demoPassword ? "demo-password" : undefined}
          />
          {demoPassword ? (
            <FieldDescription id="demo-password" className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                Live demo password: <code className="font-mono text-foreground">{demoPassword}</code>
              </span>
              <CopyButton value={demoPassword} what="the demo password" />
            </FieldDescription>
          ) : null}
          <FieldError errors={toFieldErrors(passwordErrors)} />
        </Field>

        <Button type="submit" disabled={isPending}>
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  );
}
