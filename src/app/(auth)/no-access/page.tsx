import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/features/auth/actions";
import { getSessionState } from "@/lib/auth/session";
import { DEFAULT_AUTHENTICATED_PATH } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "No organization access",
};

export default function NoAccessPage() {
  return (
    <Suspense fallback={<Skeleton className="h-48" />}>
      <NoAccessCard />
    </Suspense>
  );
}

async function NoAccessCard() {
  const session = await getSessionState();
  if (session.status === "anonymous") {
    redirect("/login");
  }
  if (session.status === "member") {
    redirect(DEFAULT_AUTHENTICATED_PATH);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          <h1>No organization access</h1>
        </CardTitle>
        <CardDescription>
          {session.email || "Your account"} is not a member of any organization yet. Ask your
          organization administrator to add you.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
