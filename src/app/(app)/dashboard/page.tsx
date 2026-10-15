import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { DashboardSkeleton, DashboardView } from "@/features/dashboard/components/dashboard-view";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="What needs attention across your fleet today." />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardView />
      </Suspense>
    </>
  );
}
