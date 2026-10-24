import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { CopyButton } from "@/components/shared/copy-button";
import {
  DEMO_ROLES,
  HOSTED_DEMO_PASSWORD,
  demoRoleLabel,
  demoSignInHref,
  type DemoRole,
} from "@/features/auth/demo-accounts";

const SHORT = {
  manager: "Assign work, see what's overdue",
  inspector: "Record checks and failures",
  technician: "Start, block and finish jobs",
  viewer: "Read everything, change nothing",
} as const satisfies Record<DemoRole, string>;

/**
 * The hero's primary action: one whole-row link per published demo role, joined by
 * 1px gaps like the dashboard's figures row. Each opens sign-in with the email
 * filled in (`?as=`); sign-in itself stays on /login, where the edge rate limit
 * applies (D-044). The shared-accounts note sits here, where most visitors sign in.
 */
export function RolePicker() {
  return (
    <section
      aria-labelledby="role-picker-title"
      className="overflow-hidden rounded-xl ring-1 ring-primary/50"
    >
      <h2 id="role-picker-title" className="border-b px-4 py-3 text-sm font-medium">
        Try the live demo as
      </h2>
      <ul className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
        {DEMO_ROLES.map((role) => (
          <li key={role} className="bg-background">
            <Link
              href={demoSignInHref(role)}
              className="group flex h-full flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
            >
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">
                  <span className="sr-only">Sign in as </span>
                  {demoRoleLabel(role)}
                </span>
                <span className="text-sm text-muted-foreground">{SHORT[role]}</span>
              </span>
              <span aria-hidden className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
                Sign in
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1 border-t px-4 py-3 text-sm text-muted-foreground">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>
            Password for every role:{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem] text-foreground">
              {HOSTED_DEMO_PASSWORD}
            </code>
          </span>
          <CopyButton value={HOSTED_DEMO_PASSWORD} what="the demo password" />
        </p>
        <p className="text-pretty">The accounts are shared, so you may see other visitors&apos; changes.</p>
      </div>
    </section>
  );
}
