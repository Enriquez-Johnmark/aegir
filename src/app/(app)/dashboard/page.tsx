import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { WelcomeCard } from "@/features/dashboard/components/welcome-card";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Your organization at a glance.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-36" />}>
        <WelcomeCard />
      </Suspense>
    </>
  );
}
