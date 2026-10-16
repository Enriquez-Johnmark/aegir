import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/features/auth/components/login-form";
import { demoEmailFor } from "@/features/auth/demo-accounts";
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
  // `?as=<role>` comes from the landing page's role picker: it pre-fills a published demo email only.
  return <LoginForm next={safeNextPath(Array.isArray(next) ? next[0] : next)} defaultEmail={demoEmailFor(as)} />;
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
