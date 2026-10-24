import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/features/auth/components/login-form";
import {
  DEMO_ACCOUNTS,
  DEMO_ROLES,
  HOSTED_DEMO_PASSWORD,
  demoRoleFor,
  demoRoleLabel,
  demoSignInHref,
} from "@/features/auth/demo-accounts";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="flex flex-col gap-4">
      {/* A first-time visitor may arrive from the header, not a role link: give them a way back (D-051). */}
      <Link
        href="/"
        className="flex w-fit items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:min-h-11"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        Aegir home
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <h1>Sign in to Aegir</h1>
          </CardTitle>
          <CardDescription>Maritime safety and fleet operations.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* searchParams is request-time data, so it streams behind a boundary. */}
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginFormWithNext searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function LoginFormWithNext({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next, as } = await searchParams;
  // `?as=<role>` comes from the landing page's role links: it pre-fills a published demo
  // email only. The password is shown beside the field, as on the landing page, and is
  // never filled in or put in a URL (D-011, D-050). Without a role, the page offers the
  // four demo roles instead (D-051).
  const role = demoRoleFor(as);
  const account = role ? DEMO_ACCOUNTS[role] : undefined;
  return (
    <div className="flex flex-col gap-6">
      {role && account ? (
        <p className="text-sm text-muted-foreground">
          Signing in as <span className="font-medium text-foreground">{demoRoleLabel(role)}</span> · {account.name}
        </p>
      ) : null}
      <LoginForm
        next={safeNextPath(Array.isArray(next) ? next[0] : next)}
        defaultEmail={account?.email}
        demoPassword={account ? HOSTED_DEMO_PASSWORD : undefined}
      />
      {role ? null : <DemoRoleLinks />}
    </div>
  );
}

/** For a visitor without an account: the four published demo roles, each pre-filling its email. */
function DemoRoleLinks() {
  return (
    <nav aria-labelledby="demo-roles-title" className="flex flex-col gap-2 border-t pt-4">
      <h2 id="demo-roles-title" className="text-sm font-medium">
        Trying the demo? Sign in as
      </h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {DEMO_ROLES.map((demoRole) => (
          <li key={demoRole}>
            <Link
              href={demoSignInHref(demoRole)}
              className="inline-flex items-center font-medium text-primary underline-offset-4 hover:underline pointer-coarse:min-h-11"
            >
              {demoRoleLabel(demoRole)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-14" />
      <Skeleton className="h-14" />
      <Skeleton className="h-9" />
    </div>
  );
}
