import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/features/auth/components/login-form";
import { HOSTED_DEMO_PASSWORD, demoEmailFor } from "@/features/auth/demo-accounts";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
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
  );
}

async function LoginFormWithNext({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next, as } = await searchParams;
  // `?as=<role>` comes from the landing page's role picker: it pre-fills a published demo
  // email only. The password is shown beside the field, as on the landing page, and is
  // never filled in or put in a URL (D-011, D-050).
  const defaultEmail = demoEmailFor(as);
  return (
    <LoginForm
      next={safeNextPath(Array.isArray(next) ? next[0] : next)}
      defaultEmail={defaultEmail}
      demoPassword={defaultEmail ? HOSTED_DEMO_PASSWORD : undefined}
    />
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
